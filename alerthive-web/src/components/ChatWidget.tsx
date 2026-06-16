import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, AlertTriangle, Wrench } from 'lucide-react';
import { tokenStore } from '../lib/api';

// ── Types ──────────────────────────────────────────────────────
interface Message {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
  error?:  boolean;
}

const TOOL_LABELS: Record<string, string> = {
  get_alerts:        'Fetching alerts…',
  get_incidents:     'Fetching incidents…',
  get_on_call:       'Checking on-call…',
  acknowledge_alert: 'Acknowledging alert…',
  create_incident:   'Creating incident…',
  get_tickets:       'Fetching tickets…',
  get_services:      'Fetching services…',
};

function toolLabel(names: string): string {
  return names.split(', ').map((n) => TOOL_LABELS[n] ?? `Running ${n}…`).join(' · ');
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

// ── Helpers ────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2); }

const WELCOME: Message = {
  id:      'welcome',
  role:    'assistant',
  content: "Hi! I'm AlertHive AI.\n\nAsk me about alerts, incidents, on-call, tickets, or services — I'll fetch live data and act on it.\n\nHow can I help?",
};

// ── Component ──────────────────────────────────────────────────
export default function ChatWidget() {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading]   = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);
  const abortRef                = useRef<AbortController | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: uid(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Placeholder for streaming assistant response
    const assistantId = uid();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    // Build history: exclude the welcome greeting (it's UI-only, not a real exchange)
    // and ensure it starts with a user message (Llama 3 template requirement)
    const allMessages = [...messages, userMsg].filter((m) => m.id !== 'welcome');
    const firstUserIdx = allMessages.findIndex((m) => m.role === 'user');
    const history = (firstUserIdx >= 0 ? allMessages.slice(firstUserIdx) : allMessages)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
      .slice(-12);

    abortRef.current = new AbortController();

    try {
      const token = tokenStore.getAccess();
      const res = await fetch(`${BASE_URL}/chat`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token ?? ''}`,
        },
        body:   JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server responded ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const chunk = JSON.parse(line.slice(6)) as { token?: string; done?: boolean; error?: string; tool?: string };
            if (chunk.error) throw new Error(chunk.error);
            if (chunk.tool) {
              setActiveTool(chunk.tool);
            }
            if (chunk.token) {
              setActiveTool(null);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + chunk.token } : m,
                ),
              );
            }
          } catch (parseErr) {
            // skip malformed chunk
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Sorry, I couldn't get a response. ${errMsg}`, error: true }
            : m,
        ),
      );
    } finally {
      setLoading(false);
      setActiveTool(null);
      abortRef.current = null;
    }
  }, [input, loading, messages]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  return (
    <>
      {/* ── Floating button ────────────────────────────────── */}
      <button
        onClick={() => {
          if (open) {
            abortRef.current?.abort();
            setMessages([{ ...WELCOME, id: uid() }]);
            setInput('');
            setActiveTool(null);
            setLoading(false);
          }
          setOpen((v) => !v);
        }}
        aria-label="Toggle AI assistant"
        className={`
          fixed bottom-6 right-6 z-50 flex items-center justify-center
          w-14 h-14 rounded-full shadow-lg transition-all duration-200
          bg-indigo-600 hover:bg-indigo-500 text-white
          ${open ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
        `}
      >
        <Bot size={26} />
      </button>

      {/* ── Chat panel ─────────────────────────────────────── */}
      <div
        className={`
          fixed bottom-6 right-6 z-50 flex flex-col
          w-[380px] max-w-[calc(100vw-2rem)]
          h-[540px] max-h-[calc(100vh-6rem)]
          rounded-2xl shadow-2xl border
          bg-white dark:bg-gray-900
          border-gray-200 dark:border-gray-700
          transition-all duration-200 origin-bottom-right
          ${open ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-white" />
            <span className="font-semibold text-white text-sm">AlertHive AI</span>
            <span className="text-xs text-indigo-200 ml-1">• Local · llama3.2</span>
          </div>
          <button
            onClick={() => {
              abortRef.current?.abort();
              setMessages([{ ...WELCOME, id: uid() }]);
              setInput('');
              setActiveTool(null);
              setLoading(false);
              setOpen(false);
            }}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`
                flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white mt-0.5
                ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-500 dark:bg-gray-600'}
              `}>
                {msg.role === 'user'
                  ? <User size={14} />
                  : msg.error
                    ? <AlertTriangle size={14} className="text-red-300" />
                    : <Bot size={14} />
                }
              </div>

              {/* Bubble */}
              <div className={`
                max-w-[78%] px-3 py-2 rounded-2xl leading-relaxed whitespace-pre-wrap break-words
                ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : msg.error
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-tl-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                }
              `}>
                {msg.content === '' && msg.role === 'assistant'
                  ? (
                    activeTool
                      ? <span className="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400 text-xs">
                          <Wrench size={12} className="animate-pulse" />
                          {toolLabel(activeTool)}
                        </span>
                      : <Loader2 size={14} className="animate-spin text-gray-400" />
                  )
                  : msg.content
                }
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const t = e.target;
                t.style.height = 'auto';
                t.style.height = `${t.scrollHeight}px`;
              }}
              onKeyDown={onKeyDown}
              placeholder="Ask about AlertHive, incidents, alerts, or anything…"
              rows={3}
              className="
                flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                resize-none outline-none max-h-28 overflow-y-auto
              "
              style={{ lineHeight: '1.5' }}
            />
            {loading
              ? (
                <button
                  onClick={stop}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-400 text-white transition-colors"
                  aria-label="Stop"
                >
                  <X size={14} />
                </button>
              )
              : (
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send"
                >
                  <Send size={14} />
                </button>
              )
            }
          </div>
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 mt-1.5">
            Agentic · Runs locally · No data leaves your machine
          </p>
        </div>
      </div>
    </>
  );
}
