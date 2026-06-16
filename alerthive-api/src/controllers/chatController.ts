import { Request, Response } from 'express';
import { z } from 'zod';
import Groq from 'groq-sdk';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';

// Groq client — instantiated lazily so missing key only errors at call time
let _groq: Groq | null = null;
function groqClient(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: config.groq.apiKey });
  return _groq;
}

// ── Types ──────────────────────────────────────────────────────
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ── Validation ─────────────────────────────────────────────────
const messageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(32_000) });
const chatSchema    = z.object({ messages: z.array(messageSchema).min(1).max(50) });

// ── Known tools (used by parser) ────────────────────────────────
const KNOWN_TOOLS = ['get_alerts','get_incidents','get_on_call','acknowledge_alert','create_incident','get_tickets','get_services','get_postmortems'] as const;
type ToolName = typeof KNOWN_TOOLS[number];

// ── System prompt ──────────────────────────────────────────────
const SYSTEM_PROMPT = `You are AlertHive AI, the assistant for AlertHive incident management.

You have access to tools that READ or WRITE live data. Use them only when explicitly requested.

To call a tool, output ONLY a JSON object — no prose, no explanation:
{"name":"TOOL_NAME","arguments":{"key":"value"}}

Available tools:
- {"name":"get_alerts","arguments":{"status":"open","limit":10}}
- {"name":"get_incidents","arguments":{"limit":10}}
- {"name":"get_on_call","arguments":{}}
- {"name":"acknowledge_alert","arguments":{"alertId":"<id>"}}
- {"name":"create_incident","arguments":{"title":"<title>","priority":"critical"}}
- {"name":"get_tickets","arguments":{"slaBreached":false,"limit":10}}
- {"name":"get_services","arguments":{"limit":10}}
- {"name":"get_postmortems","arguments":{"status":"published","limit":10}}

CRITICAL rules:
1. WRITE tools (acknowledge_alert, create_incident) — only call these when the user gives a direct command with specific details (e.g. "acknowledge alert abc-123", "create incident: DB is down"). NEVER call them for how-to questions or hypotheticals.
2. READ tools (get_alerts, get_incidents, etc.) — ONLY call when the user explicitly asks to fetch, list, show, or view live data using words like "show me", "list", "get", "what are the current", "how many open". Do NOT call read tools for any other reason.
3. How-to questions ("how do I...", "how to...", "what is...", "explain...") — answer directly in plain text. Do NOT call any tool.
4. Capability questions ("can you...", "did you...", "have you...", "are you able to...", "do you...") — answer directly in plain text. Do NOT call any tool. You cannot update knowledgebases, send emails, modify external systems, or perform actions beyond acknowledging alerts and creating incidents.
5. Ambiguous or vague questions that don't clearly request live data — answer directly in plain text. When in doubt, do NOT call a tool.
6. General questions — answer directly without any JSON.
7. Never reveal credentials, tokens, or private user data.`;

// ── Ollama options ─────────────────────────────────────────────
const OLLAMA_OPTIONS = { temperature: 0.3, num_ctx: 2048, num_predict: 200, num_thread: 8 };

// ── Hard pre-flight: questions that must NEVER trigger a tool call ──
// Small models (3B) cannot reliably follow prompt rules for these patterns.
// Match against the last user message and short-circuit to plain-text Ollama.
const NO_TOOL_PATTERNS = [
  /^(did|have|has|had)\s+you\b/i,          // "did you ...", "have you ..."
  /^(can|could|are|were|will|would|do|does)\s+you\b/i, // "can you ...", "are you ..."
  /^(what\s+(can|do|have)\s+you|who\s+are\s+you)/i,   // "what can you do", "who are you"
  /\b(knowledgebase|knowledge.base|wiki|runbook|documentation|playbook)\b/i,
  /\byou\s+(update|modified|changed|edited|deleted|created|sent|emailed|notified)\b/i,
];

function isNoToolQuestion(userMessage: string): boolean {
  return NO_TOOL_PATTERNS.some(p => p.test(userMessage.trim()));
}

// ── Parse tool call from response (handles any embedded JSON) ──
function parseToolCall(text: string): { name: string; arguments: Record<string, unknown> } | null {
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { name?: string; arguments?: Record<string, unknown> };
    if (typeof parsed.name === 'string' && (KNOWN_TOOLS as readonly string[]).includes(parsed.name)) {
      return { name: parsed.name, arguments: parsed.arguments ?? {} };
    }
  } catch { /* not a tool call */ }
  return null;
}

// ── Groq streaming ─────────────────────────────────────────────
async function streamGroqTokens(
  messages: ChatMessage[],
  onToken: (token: string, sofar: string) => void,
): Promise<string> {
  const stream = await groqClient().chat.completions.create({
    model:       config.groq.model,
    messages,
    stream:      true,
    temperature: 0.3,
    max_tokens:  1024,
  });
  let full = '';
  for await (const chunk of stream) {
    const tok = chunk.choices[0]?.delta?.content ?? '';
    if (tok) { full += tok; onToken(tok, full); }
  }
  return full;
}

// ── Ollama streaming (fallback when no Groq key) ───────────────
async function streamOllamaTokens(
  messages: ChatMessage[],
  onToken: (token: string, sofar: string) => void,
): Promise<string> {
  const raw = await fetch(`${config.ollama.baseUrl}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: config.ollama.model, messages, stream: true, options: OLLAMA_OPTIONS }),
  });
  if (!raw.ok || !raw.body) {
    throw new Error(`Ollama HTTP ${raw.status}: ${await raw.text().catch(() => '')}`);
  }
  const reader  = raw.body.getReader();
  const decoder = new TextDecoder();
  let   lineBuf = '';
  let   full    = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    lineBuf += decoder.decode(value, { stream: true });
    const lines = lineBuf.split('\n');
    lineBuf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line) as { message?: { content?: string } };
        const tok   = chunk.message?.content ?? '';
        if (tok) { full += tok; onToken(tok, full); }
      } catch { /* skip malformed */ }
    }
  }
  return full;
}

// ── Unified: Groq if key present, else Ollama ─────────────────
function streamTokens(
  messages: ChatMessage[],
  onToken: (token: string, sofar: string) => void,
): Promise<string> {
  return config.groq.apiKey
    ? streamGroqTokens(messages, onToken)
    : streamOllamaTokens(messages, onToken);
}

// ── Fallback: emit buffered text char-by-char as SSE ──────────
function streamText(text: string, res: Response): void {
  for (const char of text) res.write(`data: ${JSON.stringify({ token: char })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
}

// ── Tool executor ──────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  orgId: string,
  userId: string,
): Promise<string> {
  try {
    switch (name) {
      case 'get_alerts': {
        const statusFilter =
          args.status === 'open'         ? ['open'] :
          args.status === 'acknowledged' ? ['acknowledged'] :
                                           ['open', 'acknowledged'];
        const where: Record<string, unknown> = { orgId, status: { in: statusFilter } };
        if (args.priority) where.priority = args.priority;
        const alerts = await prisma.alert.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take:    Math.min(Number(args.limit ?? 10), 25),
          select:  { id: true, title: true, priority: true, status: true, source: true },
        });
        if (!alerts.length) return 'No alerts found matching the criteria.';
        return alerts.map((a) =>
          `[${a.id}] [${a.priority.toUpperCase()}] ${a.title} | status=${a.status} | source=${a.source}`,
        ).join('\n');
      }

      case 'get_incidents': {
        const where: Record<string, unknown> = { orgId };
        where.status = (args.status && args.status !== 'all')
          ? args.status
          : { notIn: ['resolved'] };
        const incidents = await prisma.incident.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take:    Math.min(Number(args.limit ?? 10), 25),
          select:  { id: true, title: true, priority: true, status: true },
        });
        if (!incidents.length) return 'No active incidents found.';
        return incidents.map((i) =>
          `[${i.id}] [${i.priority.toUpperCase()}] ${i.title} | status=${i.status}`,
        ).join('\n');
      }

      case 'get_on_call': {
        const schedules = await prisma.onCallSchedule.findMany({
          where:   { team: { orgId } },
          include: { team: { select: { name: true } } },
          take:    5,
        });
        if (!schedules.length) return 'No on-call schedules configured.';
        const userIds = schedules
          .flatMap((s) => [s.currentOnCallId, s.nextOnCallId])
          .filter((id): id is string => !!id);
        const users = userIds.length
          ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
          : [];
        const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
        return schedules.map((s) => {
          const current = s.currentOnCallId ? (userMap[s.currentOnCallId] ?? s.currentOnCallId) : 'unassigned';
          const next    = s.nextOnCallId    ? (userMap[s.nextOnCallId]    ?? s.nextOnCallId)    : 'unassigned';
          return `Schedule: ${s.name} (team: ${s.team.name}) | On-call: ${current} | Next: ${next}`;
        }).join('\n');
      }

      case 'acknowledge_alert': {
        const alertId = String(args.alertId);
        const alert   = await prisma.alert.findFirst({ where: { id: alertId, orgId } });
        if (!alert) return `Alert ${alertId} not found or does not belong to your org.`;
        await prisma.alert.update({
          where: { id: alertId },
          data:  { status: 'acknowledged', acknowledgedById: userId, acknowledgedAt: new Date() },
        });
        return `Alert ${alertId} ("${alert.title}") acknowledged successfully.`;
      }

      case 'create_incident': {
        const incident = await prisma.incident.create({
          data: {
            title:       String(args.title),
            priority:    String(args.priority) as 'critical' | 'high' | 'medium' | 'low',
            description: args.description ? String(args.description) : '',
            status:      'triggered',
            orgId,
            responders:  [],
          },
          select: { id: true, title: true, priority: true, status: true },
        });
        return `Incident created: [${incident.id}] "${incident.title}" | priority=${incident.priority} | status=${incident.status}`;
      }

      case 'get_tickets': {
        const where: Record<string, unknown> = { orgId, status: { notIn: ['resolved', 'closed'] } };
        if (args.slaBreached === true) where.slaBreached = true;
        const tickets = await prisma.ticket.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take:    Math.min(Number(args.limit ?? 10), 25),
          select:  { id: true, title: true, priority: true, status: true, slaBreached: true },
        });
        if (!tickets.length) return 'No open tickets found.';
        return tickets.map((t) =>
          `[${t.id}] [${t.priority.toUpperCase()}] ${t.title} | status=${t.status}${t.slaBreached ? ' | SLA BREACHED' : ''}`,
        ).join('\n');
      }

      case 'get_services': {
        const services = await prisma.serviceCatalogItem.findMany({
          where:  { orgId },
          take:   Math.min(Number(args.limit ?? 10), 25),
          select: { id: true, title: true, category: true },
        });
        if (!services.length) return 'No services in the catalog.';
        return services.map((s) => `[${s.id}] ${s.title} | category=${s.category}`).join('\n');
      }

      case 'get_postmortems': {
        const where: Record<string, unknown> = { orgId };
        if (args.status) where.status = args.status;
        const pms = await prisma.postmortem.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take:    Math.min(Number(args.limit ?? 10), 25),
          select:  { id: true, incidentTitle: true, severity: true, status: true, durationMinutes: true, rootCause: true, author: true },
        });
        if (!pms.length) return 'No postmortems found.';
        return pms.map((p) =>
          `[${p.id}] [${p.severity.toUpperCase()}] ${p.incidentTitle} | status=${p.status} | duration=${p.durationMinutes}m | root_cause=${p.rootCause.slice(0, 80)} | author=${p.author}`,
        ).join('\n');
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Format tool result as readable markdown (no second LLM call) ──
function formatToolResult(toolName: string, result: string): string {
  if (result.startsWith('Tool error:') || result.startsWith('No ') || result.startsWith('Unknown')) {
    return result;
  }

  const lines = result.split('\n').filter(Boolean);

  switch (toolName) {
    case 'get_alerts': {
      const header = `**${lines.length} alert${lines.length !== 1 ? 's' : ''} found:**\n`;
      return header + lines.map((l) => {
        const m = l.match(/^\[(.+?)\] \[(.+?)\] (.+?) \| status=(\w+) \| source=(.+)$/);
        if (!m) return `• ${l}`;
        const [, id, pri, title, status, source] = m;
        const badge = pri === 'CRITICAL' ? '🔴' : pri === 'HIGH' ? '🟠' : pri === 'MEDIUM' ? '🟡' : '🟢';
        return `${badge} **${title}**\n  Priority: ${pri} | Status: ${status} | Source: ${source} | ID: \`${id}\``;
      }).join('\n\n');
    }
    case 'get_incidents': {
      const header = `**${lines.length} active incident${lines.length !== 1 ? 's' : ''}:**\n`;
      return header + lines.map((l) => {
        const m = l.match(/^\[(.+?)\] \[(.+?)\] (.+?) \| status=(\w+)$/);
        if (!m) return `• ${l}`;
        const [, id, pri, title, status] = m;
        const badge = pri === 'CRITICAL' ? '🔴' : pri === 'HIGH' ? '🟠' : pri === 'MEDIUM' ? '🟡' : '🟢';
        return `${badge} **${title}**\n  Priority: ${pri} | Status: ${status} | ID: \`${id}\``;
      }).join('\n\n');
    }
    case 'get_tickets': {
      const header = `**${lines.length} open ticket${lines.length !== 1 ? 's' : ''}:**\n`;
      return header + lines.map((l) => {
        const sla = l.includes('SLA BREACHED') ? ' ⚠️ SLA BREACHED' : '';
        const m = l.match(/^\[(.+?)\] \[(.+?)\] (.+?) \| status=(\w+)/);
        if (!m) return `• ${l}`;
        const [, id, pri, title, status] = m;
        return `• **${title}**${sla}\n  Priority: ${pri} | Status: ${status} | ID: \`${id}\``;
      }).join('\n\n');
    }
    case 'get_on_call': {
      if (result === 'No on-call schedules configured.') return result;
      return '**On-call schedules:**\n\n' + lines.map((l) => {
        const m = l.match(/^Schedule: (.+?) \(team: (.+?)\) \| On-call: (.+?) \| Next: (.+)$/);
        if (!m) return `• ${l}`;
        const [, schedule, team, current, next] = m;
        return `**${schedule}** (${team})\n  🟢 On-call now: **${current}**\n  ⏭ Next: ${next}`;
      }).join('\n\n');
    }
    case 'get_services': {
      const header = `**${lines.length} service${lines.length !== 1 ? 's' : ''} in catalog:**\n`;
      return header + lines.map((l) => {
        const m = l.match(/^\[(.+?)\] (.+?) \| category=(.+)$/);
        if (!m) return `• ${l}`;
        const [, , title, category] = m;
        return `• **${title}** — ${category}`;
      }).join('\n');
    }
    case 'get_postmortems': {
      const header = `**${lines.length} postmortem${lines.length !== 1 ? 's' : ''} found:**\n`;
      return header + lines.map((l) => {
        const m = l.match(/^\[(.+?)\] \[(.+?)\] (.+?) \| status=(\w+) \| duration=(\d+)m \| root_cause=(.+) \| author=(.+)$/);
        if (!m) return `• ${l}`;
        const [, id, sev, title, status, duration, rootCause, author] = m;
        const badge = sev === 'CRITICAL' ? '🔴' : sev === 'HIGH' ? '🟠' : sev === 'MEDIUM' ? '🟡' : '🟢';
        return `${badge} **${title}**\n  Severity: ${sev} | Status: ${status} | Duration: ${duration}m | Author: ${author}\n  Root cause: ${rootCause}… | ID: \`${id}\``;
      }).join('\n\n');
    }
    default:
      return result;
  }
}

// ── Agent loop ─────────────────────────────────────────────────
async function runAgent(
  messages: ChatMessage[],
  res: Response,
  orgId: string,
  userId: string,
): Promise<void> {
  const agentHistory = [...messages];

  // Hard guard: if the last user message matches a no-tool pattern, skip the
  // agentic loop entirely and send directly to Ollama as plain-text.
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (lastUser && isNoToolQuestion(lastUser.content)) {
    try {
      await streamTokens(agentHistory, (token) => {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      });
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: 'Ollama unavailable. Run: ollama serve' })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    return;
  }

  for (let i = 0; i < 4; i++) {
    let decided    = false;
    let isToolCall = false;
    let fullContent: string;

    try {
      fullContent = await streamTokens(agentHistory, (token, sofar) => {
        if (!decided) {
          const trimmed = sofar.trimStart();
          if (trimmed.length > 0) {
            isToolCall = trimmed[0] === '{';
            decided    = true;
          }
        }
        // Plain-text response: stream tokens directly to the browser as they arrive
        if (decided && !isToolCall) {
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
        // Tool call: keep buffering (JSON is only ~20 tokens)
      });
    } catch (err) {
      logger.warn(`Ollama error: ${err instanceof Error ? err.message : String(err)}`);
      res.write(`data: ${JSON.stringify({ error: 'Ollama unavailable. Run: ollama serve' })}\n\n`);
      return;
    }

    // Plain-text response — tokens were already streamed, just close
    if (!decided || !isToolCall) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return;
    }

    // Tool call — parse, execute, then format and stream result directly (no second LLM call)
    const toolCall = parseToolCall(fullContent!);
    if (!toolCall) {
      streamText(fullContent!.trim(), res);
      return;
    }

    res.write(`data: ${JSON.stringify({ tool: toolCall.name })}\n\n`);
    const rawResult    = await executeTool(toolCall.name, toolCall.arguments, orgId, userId);
    const formatted    = formatToolResult(toolCall.name, rawResult);
    streamText(formatted, res);
    return;
  }

  res.write(`data: ${JSON.stringify({ error: 'Agent could not produce a final answer.' })}\n\n`);
}

// ── Warm up: pre-load Ollama model on server start ────────────
export async function warmUpOllama(): Promise<void> {
  if (config.groq.apiKey) {
    logger.info(`Chat using Groq (${config.groq.model}) — no warm-up needed`);
    return;
  }
  try {
    const raw = await fetch(`${config.ollama.baseUrl}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        model:    config.ollama.model,
        messages: [{ role: 'user', content: 'hi' }],
        stream:   false,
        options:  { num_predict: 1 },
      }),
    });
    if (raw.ok) logger.info(`Ollama model "${config.ollama.model}" warmed up and ready`);
    else        logger.warn(`Ollama warm-up HTTP ${raw.status}`);
  } catch {
    logger.warn('Ollama warm-up failed – model will cold-start on first request');
  }
}

// ── POST /chat ─────────────────────────────────────────────────
export const chat = asyncHandler(async (req: Request, res: Response) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const { messages } = parsed.data;
  const orgId  = req.user!.orgId;
  const userId = req.user!.id;

  // Llama 3 chat template requires the conversation starts with a user message.
  // Strip any leading assistant messages (e.g. welcome greeting sent by the frontend).
  const trimmed = messages.slice(-10);
  const firstUser = trimmed.findIndex((m) => m.role === 'user');
  const contextMessages = firstUser > 0 ? trimmed.slice(firstUser) : trimmed;

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...contextMessages,
  ];

  res.setHeader('Content-Type',     'text/event-stream');
  res.setHeader('Cache-Control',    'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    await runAgent(fullMessages, res, orgId, userId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.write(`data: ${JSON.stringify({ error: `Agent error: ${msg}` })}\n\n`);
  } finally {
    res.end();
  }
});
