import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plug, CheckCircle, XCircle, AlertTriangle, RefreshCw, ArrowRight, Clock, FlaskConical, ChevronDown, ChevronUp, Copy, Check, Zap, Loader2, Workflow } from 'lucide-react';
import { mockIntegrations, mockDynatraceIntegration } from '../data/mockData';
import { Integration, DynatraceIntegration } from '../types';
import { api } from '../lib/api';
import { Tooltip } from '../components/Tooltip';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api/v1';

const statusConfig = {
  connected: { label: 'Connected', color: '#2ED573', icon: CheckCircle },
  disconnected: { label: 'Disconnected', color: '#B0A8C8', icon: XCircle },
  error: { label: 'Error', color: '#FF4757', icon: AlertTriangle },
};

const priorityColors: Record<string, string> = {
  critical: '#FF4757',
  high: '#FF6200',
  medium: '#FFA502',
  low: '#2ED573',
  info: '#1E90FF',
};

function timeAgo(isoDate?: string): string {
  if (!isoDate) return 'Never';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const cfg = statusConfig[integration.status];
  const Icon = cfg.icon;

  return (
    <div
      className="bg-surface border rounded-xl p-3 flex flex-col gap-3"
      style={{ borderColor: integration.status === 'error' ? '#FF475730' : '#2A2A3E' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Color dot / icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-primary font-bold text-sm shrink-0"
          style={{ backgroundColor: `${integration.iconColor}30`, color: integration.iconColor }}
        >
          {integration.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-text-primary">{integration.name}</p>
              <span className="text-[10px] font-bold text-info bg-info/15 border border-info/25 px-1.5 py-0.5 rounded">DEMO</span>
              <span
              className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
            >
              <Icon size={10} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5 leading-snug">{integration.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-light rounded-lg p-2">
          <p className="text-xs text-text-muted">Events Received</p>
          <p className="text-sm font-bold text-text-primary">{integration.eventCount.toLocaleString()}</p>
        </div>
        <div className="bg-surface-light rounded-lg p-2">
          <p className="text-xs text-text-muted">Last Event</p>
          <p className="text-sm font-bold text-text-primary">{timeAgo(integration.lastEventAt)}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-xs text-text-muted">
          {integration.configuredAt ? `Configured ${new Date(integration.configuredAt).toLocaleDateString()}` : 'Not configured'}
        </span>
        <button className="text-xs text-primary hover:underline flex items-center gap-1">
          Configure <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

function WebhookSetupGuide({ webhookUrl }: { webhookUrl: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // webhookUrl comes from the parent (computed from API_BASE)

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const steps = [
    {
      num: '1',
      title: 'Open Dynatrace Settings',
      body: 'Go to Settings ? Integrations ? Problem notifications ? Add notification ? Custom integration (Webhook).',
    },
    {
      num: '2',
      title: 'Set the Webhook URL',
      body: (
        <div className="flex items-center gap-2 mt-1">
          <code className="text-xs font-mono text-info bg-info/10 px-2 py-1 rounded flex-1 break-all">
            {webhookUrl}
          </code>
          <button
            onClick={() => copyToClipboard(webhookUrl, 'url')}
            className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
            title="Copy URL"
          >
            {copied === 'url' ? <Check size={14} className="text-low" /> : <Copy size={14} />}
          </button>
        </div>
      ),
    },
    {
      num: '3',
      title: 'Add the security header',
      body: (
        <div className="space-y-1 mt-1">
          <p className="text-xs text-text-muted">Under <em>Custom headers</em> add:</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-medium bg-medium/10 px-2 py-1 rounded flex-1">
              X-AlertHive-Secret: {'<your-secret>'}
            </code>
            <button
              onClick={() => copyToClipboard('X-AlertHive-Secret', 'header')}
              className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
              title="Copy header name"
            >
              {copied === 'header' ? <Check size={14} className="text-low" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-xs text-text-muted">Set <code className="text-text-primary">ALERTHIVE_WEBHOOK_SECRET</code> to the same value in your API <code className="text-text-primary">.env</code>.</p>
        </div>
      ),
    },
    {
      num: '4',
      title: 'Use the Classic payload template',
      body: (
        <div className="mt-1 space-y-2">
          <p className="text-xs text-text-muted mb-1">Under <em>Custom payload</em>, paste the following JSON (Dynatrace ? Settings ? Integrations ? Problem notifications). AlertHive reads all these standard fields:</p>
          <div className="relative">
            <pre className="text-[10px] font-mono text-text-secondary bg-surface border border-border rounded p-2 overflow-x-auto leading-relaxed">{`{
  "ImpactedEntities": {ImpactedEntities},
  "ImpactedEntity": "{ImpactedEntity}",
  "PID": "{PID}",
  "ProblemID": "{ProblemID}",
  "ProblemImpact": "{ProblemImpact}",
  "ProblemDetailsJSON": {ProblemDetailsJSON},
  "ProblemSeverity": "{ProblemSeverity}",
  "ProblemTitle": "{ProblemTitle}",
  "Problem URL": "{ProblemURL}",
  "State": "{State}",
  "Tags": "{Tags}"
}`}</pre>
            <button
              onClick={() => copyToClipboard(`{
  "ImpactedEntities": {ImpactedEntities},
  "ImpactedEntity": "{ImpactedEntity}",
  "PID": "{PID}",
  "ProblemID": "{ProblemID}",
  "ProblemImpact": "{ProblemImpact}",
  "ProblemDetailsJSON": {ProblemDetailsJSON},
  "ProblemSeverity": "{ProblemSeverity}",
  "ProblemTitle": "{ProblemTitle}",
  "Problem URL": "{ProblemURL}",
  "State": "{State}",
  "Tags": "{Tags}"
}`, 'payload')}
              className="absolute top-2 right-2 text-text-muted hover:text-text-primary transition-colors"
              title="Copy payload"
            >
              {copied === 'payload' ? <Check size={12} className="text-low" /> : <Copy size={12} />}
            </button>
          </div>
          <p className="text-xs text-text-muted">
            <strong className="text-text-primary">Note:</strong> <code className="text-text-primary">ImpactedEntities</code> and <code className="text-text-primary">ProblemDetailsJSON</code> must NOT have quotes — they are JSON values, not strings.
          </p>
          <p className="text-xs text-text-muted">
            <strong className="text-text-primary">State values:</strong> <code className="text-text-primary">OPEN</code> creates an alert · <code className="text-text-primary">RESOLVED</code> auto-closes it.
          </p>
          <p className="text-xs text-text-muted">
            <strong className="text-text-primary">ProblemImpact</strong> values: INFRASTRUCTURE, SERVICE, APPLICATION, ENVIRONMENT — used to escalate priority.
          </p>
        </div>
      ),
    },
    {
      num: '5',
      title: 'Test and save',
      body: 'Click Send test notification. A new alert tagged [DT] should appear in AlertHive within seconds. Save the notification profile.',
    },
  ];

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
      >
        <span className="text-xs font-semibold text-info uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-info" />
          Webhook Integration Setup Guide
        </span>
        {open ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-2">
          <p className="text-xs text-text-muted">
            Follow these steps to configure Dynatrace to push problem events into AlertHive via the inbound webhook.
          </p>
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.num} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-info/20 text-info text-xs font-bold flex items-center justify-center shrink-0">
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary">{step.title}</p>
                  {typeof step.body === 'string' ? (
                    <p className="text-xs text-text-muted mt-0.5">{step.body}</p>
                  ) : (
                    step.body
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UiPathPanel() {
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const queryClient = useQueryClient();

  const ORG_SLUG = 'fedex-ito';
  const webhookUrl = `${API_BASE}/webhooks/uipath/${ORG_SLUG}`;

  // -- Live stats --------------------------------------------------------------
  interface UiStats { totalAlerts: number; openAlerts: number; lastEventAt: string | null }
  const { data: statsAxios, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['uipath-webhook-stats', ORG_SLUG],
    queryFn: () => api.get<{ success: boolean; data: UiStats }>(`/webhooks/uipath/${ORG_SLUG}/stats`),
    refetchInterval: 30_000,
  });
  const stats: UiStats | undefined = statsAxios?.data?.data;

  // -- Liveness probe ----------------------------------------------------------
  const { data: probeAxios } = useQuery({
    queryKey: ['uipath-webhook-probe', ORG_SLUG],
    queryFn: () => api.get(`/webhooks/uipath/${ORG_SLUG}`),
    refetchInterval: 60_000,
  });
  const isLive = !!probeAxios?.data?.success;

  // -- Send test alert ---------------------------------------------------------
  const { mutate: sendTest, isPending: testPending } = useMutation({
    mutationFn: () => api.post(`/webhooks/dynatrace/${ORG_SLUG}/send-test`, {
      Type: 'job.faulted',
      Job: {
        Id: 0,
        State: 'Faulted',
        Info: 'AlertHive connectivity test',
        Release: { ProcessKey: 'TestProcess' },
      },
    }),
    onSuccess: (res) => {
      const alertId: string = res.data?.data?.id ?? '';
      setTestMsg({ ok: true, text: `Test alert fired${alertId ? ` — ID: ${alertId.slice(0, 8)}…` : ''}` });
      queryClient.invalidateQueries({ queryKey: ['uipath-webhook-stats', ORG_SLUG] });
      setTimeout(() => setTestMsg(null), 5000);
    },
    onError: () => {
      setTestMsg({ ok: false, text: 'Test failed — check API logs' });
      setTimeout(() => setTestMsg(null), 5000);
    },
  });

  const [guideOpen, setGuideOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const alertingEvents = [
    { event: 'job.faulted',                   priority: 'critical', desc: 'Job failed to execute' },
    { event: 'queueItem.transactionFailed',    priority: 'high',     desc: 'Queue item failed with exception' },
    { event: 'schedule.failed',               priority: 'high',     desc: 'Trigger could not start a job' },
    { event: 'job.stopped',                   priority: 'medium',   desc: 'Job manually stopped by user' },
    { event: 'queueItem.transactionAbandoned', priority: 'medium',   desc: 'Item unprocessed for 24 hours' },
    { event: 'robot.deleted',                 priority: 'medium',   desc: 'Robot removed from Orchestrator' },
    { event: 'process.deleted',               priority: 'low',      desc: 'Process definition deleted' },
  ];

  return (
    <div className="bg-surface border border-[#FF6200]/30 rounded-xl overflow-hidden mb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#FF6200]/5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF6200]/20 flex items-center justify-center">
            <Workflow size={18} className="text-[#FF6200]" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">UiPath Orchestrator</p>
            <p className="text-xs text-text-muted">Job &amp; Queue failure alerts via Orchestrator Webhooks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
            style={isLive
              ? { color: '#2ED573', backgroundColor: '#2ED57318' }
              : { color: '#B0A8C8', backgroundColor: '#B0A8C818' }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-low animate-pulse' : 'bg-text-muted'}`} />
            {isLive ? 'Live' : 'Checking…'}
          </span>
          <button
            onClick={() => refetchStats()}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary border border-border px-2.5 py-1 rounded-lg transition-colors"
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* Live stats row */}
      <div className="px-5 py-3 border-b border-border flex flex-wrap gap-3">
        <div>
          <p className="text-xs text-text-muted">Total Events</p>
          <p className="text-lg font-bold text-text-primary">
            {statsLoading ? <Loader2 size={14} className="inline animate-spin" /> : (stats?.totalAlerts ?? 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Open Alerts</p>
          <p className="text-lg font-bold" style={{ color: stats?.openAlerts ? '#FF4757' : '#2ED573' }}>
            {statsLoading ? <Loader2 size={14} className="inline animate-spin" /> : (stats?.openAlerts ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Last Event</p>
          <p className="text-sm font-semibold text-text-primary flex items-center gap-1">
            <Clock size={12} className="text-text-muted" />
            {statsLoading ? '...' : timeAgo(stats?.lastEventAt ?? undefined)}
          </p>
        </div>
        <div className="ml-auto self-center">
          <button
            onClick={() => sendTest()}
            disabled={testPending}
            className="flex items-center gap-1.5 text-xs font-semibold border border-[#FF6200]/40 text-[#FF6200] hover:bg-[#FF6200]/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {testPending
              ? <><Loader2 size={12} className="animate-spin" /> Sending&hellip;</>
              : <><Zap size={12} /> Send Test</>}
          </button>
        </div>
      </div>

      {/* Test feedback */}
      {testMsg && (
        <div
          className="px-5 py-2 text-xs font-medium border-b border-border"
          style={{ color: testMsg.ok ? '#2ED573' : '#FF4757', backgroundColor: testMsg.ok ? '#2ED57310' : '#FF475710' }}
        >
          {testMsg.text}
        </div>
      )}

      {/* Connection info */}
      <div className="px-5 py-4 border-b border-border grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-text-muted font-medium mb-1">Inbound Webhook URL</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-text-secondary font-mono break-all flex-1">{webhookUrl}</p>
            <button
              onClick={() => copyToClipboard(webhookUrl, 'uiurl')}
              className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
              title="Copy URL"
            >
              {copied === 'uiurl' ? <Check size={13} className="text-low" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted font-medium mb-1">Secret Header</p>
          <p className="text-xs text-text-secondary font-mono">X-AlertHive-Secret: &lt;your-secret&gt;</p>
        </div>
      </div>

      {/* Alerting event table */}
      <div className="px-5 py-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Event Type ? Alert Priority</p>
        <div className="space-y-2">
          {alertingEvents.map(({ event, priority, desc }) => (
            <div key={event} className="flex items-center gap-3 bg-surface-light border border-border rounded-lg px-3 py-2.5">
              <span className="text-xs font-semibold text-[#FF6200] bg-[#FF6200]/10 px-2 py-0.5 rounded font-mono w-44 text-center shrink-0">
                {event}
              </span>
              <ArrowRight size={14} className="text-text-muted shrink-0" />
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full capitalize w-20 text-center shrink-0"
                style={{ color: priorityColors[priority], backgroundColor: `${priorityColors[priority]}18` }}
              >
                {priority}
              </span>
              <span className="text-xs text-text-muted flex-1">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-3">Informational events (job.created, job.started, robot.status, etc.) are acknowledged but do not create alerts.</p>
      </div>

      {/* Setup Guide */}
      <div className="border-t border-border">
        <button
          onClick={() => setGuideOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
        >
          <span className="text-xs font-semibold text-[#FF6200] uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6200]" />
            UiPath Orchestrator Webhook Setup Guide
          </span>
          {guideOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </button>
        {guideOpen && (
          <div className="px-5 pb-5 space-y-2">
            <p className="text-xs text-text-muted">Configure UiPath Orchestrator to push job failure and queue transaction events into AlertHive.</p>
            <div className="space-y-3">
              {[
                {
                  num: '1', title: 'Open Orchestrator Webhooks',
                  body: 'In UiPath Orchestrator, go to Tenant ? Webhooks ? Add. Or in a modern folder: Automations ? Webhooks ? Add.',
                },
                {
                  num: '2', title: 'Set the Webhook URL',
                  body: (
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs font-mono text-[#FF6200] bg-[#FF6200]/10 px-2 py-1 rounded flex-1 break-all">{webhookUrl}</code>
                      <button onClick={() => copyToClipboard(webhookUrl, 'uisetup')} className="shrink-0 text-text-muted hover:text-text-primary transition-colors">
                        {copied === 'uisetup' ? <Check size={14} className="text-low" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ),
                },
                {
                  num: '3', title: 'Add the security header',
                  body: (
                    <div className="space-y-1 mt-1">
                      <p className="text-xs text-text-muted">Under <em>Headers</em> add:</p>
                      <code className="block text-xs font-mono text-medium bg-medium/10 px-2 py-1 rounded">X-AlertHive-Secret: &lt;your-secret&gt;</code>
                    </div>
                  ),
                },
                {
                  num: '4', title: 'Select event subscriptions',
                  body: (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-text-muted mb-1">Subscribe to these events for alert coverage:</p>
                      <div className="flex flex-wrap gap-1">
                        {['job.faulted', 'job.stopped', 'queueItem.transactionFailed', 'queueItem.transactionAbandoned', 'schedule.failed'].map((e) => (
                          <code key={e} className="text-xs font-mono text-text-primary bg-surface border border-border px-1.5 py-0.5 rounded">{e}</code>
                        ))}
                      </div>
                      <p className="text-xs text-text-muted">You may optionally subscribe to all events — AlertHive will silently discard non-alertable ones.</p>
                    </div>
                  ),
                },
                {
                  num: '5', title: 'Enable and test',
                  body: 'Set the webhook to Active and use the Test webhook option in Orchestrator. A [UiPath] alert should appear in AlertHive within seconds. Also use the Send Test button above.',
                },
              ].map((step) => (
                <div key={step.num} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF6200]/20 text-[#FF6200] text-xs font-bold flex items-center justify-center shrink-0">
                    {step.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary">{step.title}</p>
                    {typeof step.body === 'string' ? (
                      <p className="text-xs text-text-muted mt-0.5">{step.body}</p>
                    ) : step.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DynatracePanel({ dt }: { dt: DynatraceIntegration }) {
  const [showToken, setShowToken] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const queryClient = useQueryClient();

  const ORG_SLUG = 'fedex-ito';
  const webhookUrl = `${API_BASE}/webhooks/dynatrace/${ORG_SLUG}`;

  // -- Live stats from DB ------------------------------------------------------
  interface DtStats { totalAlerts: number; openAlerts: number; lastEventAt: string | null }
  const { data: statsAxios, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dt-webhook-stats', ORG_SLUG],
    queryFn: () => api.get<{ success: boolean; data: DtStats }>(`/webhooks/dynatrace/${ORG_SLUG}/stats`),
    refetchInterval: 30_000,
  });
  const stats: DtStats | undefined = statsAxios?.data?.data;

  // -- Liveness probe ----------------------------------------------------------
  const { data: probeAxios } = useQuery({
    queryKey: ['dt-webhook-probe', ORG_SLUG],
    queryFn: () => api.get(`/webhooks/dynatrace/${ORG_SLUG}`),
    refetchInterval: 60_000,
  });
  const isLive = !!probeAxios?.data?.success;

  // -- Send test alert ---------------------------------------------------------
  const { mutate: sendTest, isPending: testPending } = useMutation({
    mutationFn: () => api.post(`/webhooks/dynatrace/${ORG_SLUG}/send-test`, {}),
    onSuccess: (res) => {
      const alertId: string = res.data?.data?.id ?? '';
      setTestMsg({ ok: true, text: `Test alert fired${alertId ? ` — ID: ${alertId.slice(0, 8)}…` : ''}` });
      queryClient.invalidateQueries({ queryKey: ['dt-webhook-stats', ORG_SLUG] });
      setTimeout(() => setTestMsg(null), 5000);
    },
    onError: () => {
      setTestMsg({ ok: false, text: 'Test failed — check API logs' });
      setTimeout(() => setTestMsg(null), 5000);
    },
  });

  return (
    <div className="bg-surface border border-primary/30 rounded-xl overflow-hidden mb-8">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-primary/5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-info/20 flex items-center justify-center">
            <span className="text-base font-black text-info">D</span>
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Dynatrace — Priority Mapping</p>
            <p className="text-xs text-text-muted">Bi-directional sync | Problem ? Alert priority rules</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
            style={isLive
              ? { color: '#2ED573', backgroundColor: '#2ED57318' }
              : { color: '#B0A8C8', backgroundColor: '#B0A8C818' }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-low animate-pulse' : 'bg-text-muted'}`} />
            {isLive ? 'Live' : 'Checking…'}
          </span>
          <button
            onClick={() => refetchStats()}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary border border-border px-2.5 py-1 rounded-lg transition-colors"
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* Live stats row */}
      <div className="px-5 py-3 border-b border-border flex flex-wrap gap-3">
        <div>
          <p className="text-xs text-text-muted">Total Events</p>
          <p className="text-lg font-bold text-text-primary">
            {statsLoading ? <Loader2 size={14} className="inline animate-spin" /> : (stats?.totalAlerts ?? 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Open Alerts</p>
          <p className="text-lg font-bold" style={{ color: stats?.openAlerts ? '#FF4757' : '#2ED573' }}>
            {statsLoading ? <Loader2 size={14} className="inline animate-spin" /> : (stats?.openAlerts ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Last Event</p>
          <p className="text-sm font-semibold text-text-primary flex items-center gap-1">
            <Clock size={12} className="text-text-muted" />
            {statsLoading ? '...' : timeAgo(stats?.lastEventAt ?? undefined)}
          </p>
        </div>
        <div className="ml-auto self-center">
          <button
            onClick={() => sendTest()}
            disabled={testPending}
            className="flex items-center gap-1.5 text-xs font-semibold border border-info/40 text-info hover:bg-info/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {testPending
              ? <><Loader2 size={12} className="animate-spin" /> Sending&hellip;</>
              : <><Zap size={12} /> Send Test</>}
          </button>
        </div>
      </div>

      {/* Test alert feedback */}
      {testMsg && (
        <div
          className="px-5 py-2 text-xs font-medium border-b border-border"
          style={{ color: testMsg.ok ? '#2ED573' : '#FF4757', backgroundColor: testMsg.ok ? '#2ED57310' : '#FF475710' }}
        >
          {testMsg.text}
        </div>
      )}

      {/* Connection info */}
      <div className="px-5 py-4 border-b border-border grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-text-muted font-medium mb-1">Environment URL</p>
          <p className="text-sm text-text-primary font-mono truncate">{dt.environmentUrl}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted font-medium mb-1">API Token</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-text-primary font-mono">{showToken ? dt.apiToken : '••••••••••••••••••••'}</p>
            <button onClick={() => setShowToken((v) => !v)} className="text-xs text-primary hover:underline">
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted font-medium mb-1">Inbound Webhook URL</p>
          <p className="text-xs text-text-secondary font-mono break-all">{webhookUrl}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted font-medium mb-1">Secret Header</p>
          <p className="text-xs text-text-secondary font-mono">X-AlertHive-Secret: &lt;your-secret&gt;</p>
        </div>
      </div>

      {/* Priority Mapping Table */}
      <div className="px-5 py-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Problem Type ? Alert Priority</p>
        <div className="space-y-2">
          {dt.priorityMappings.map((mapping) => (
            <div
              key={mapping.dynatraceType}
              className="flex items-center gap-3 bg-surface-light border border-border rounded-lg px-3 py-2.5"
            >
              <span className="text-xs font-semibold text-info bg-info/10 px-2 py-0.5 rounded capitalize w-28 text-center shrink-0">
                {mapping.dynatraceType}
              </span>
              <ArrowRight size={14} className="text-text-muted shrink-0" />
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full capitalize w-20 text-center shrink-0"
                style={{ color: priorityColors[mapping.alertPriority], backgroundColor: `${priorityColors[mapping.alertPriority]}18` }}
              >
                {mapping.alertPriority}
              </span>
              <span className="text-xs text-text-muted flex-1">{mapping.description}</span>
            </div>
          ))}
        </div>
        {/* Problem filters */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Active Problem Filters</p>
          <div className="flex flex-wrap gap-2">
            {dt.problemFilters.map((f) => (
              <span key={f} className="text-xs bg-surface border border-border text-text-secondary px-2.5 py-1 rounded-full font-mono">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Webhook Setup Guide */}
      <WebhookSetupGuide webhookUrl={webhookUrl} />
    </div>
  );
}

export default function Integrations() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Integrations</h1>
          <p className="text-sm text-text-muted mt-1">
            Connect AlertHive with your observability stack, ticketing tools, and communication platforms.
          </p>
        </div>
        <Tooltip text="Browse and connect new integrations" side="bottom">
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plug size={15} />
          Add Integration
        </button>
        </Tooltip>
      </div>

      {/* Demo Mode Banner */}
      <div className="flex items-start gap-3 bg-[#0E1624] border border-info/30 rounded-xl px-4 py-3 mb-3 text-sm">
        <FlaskConical size={16} className="text-info mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-info">Partial Live Mode</span>
          <span className="text-[#94A3B8] ml-2">
            The Dynatrace and UiPath panels show real data from the database. Other integration cards show simulated data — in production each card connects to a live API endpoint.
          </span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Connected', value: mockIntegrations.filter((i) => i.status === 'connected').length, color: '#2ED573' },
          { label: 'With Errors', value: mockIntegrations.filter((i) => i.status === 'error').length, color: '#FF4757' },
          { label: 'Total Events', value: mockIntegrations.reduce((s, i) => s + i.eventCount, 0).toLocaleString(), color: '#FF6200' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Dynatrace detailed panel */}
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-info animate-pulse" /> Dynatrace Configuration
      </h2>
      <DynatracePanel dt={mockDynatraceIntegration} />

      {/* UiPath Orchestrator panel */}
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#FF6200] animate-pulse" /> UiPath Orchestrator Configuration
      </h2>
      <UiPathPanel />

      {/* All Integrations */}
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">All Integrations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {mockIntegrations.map((int) => (
          <IntegrationCard key={int.id} integration={int} />
        ))}
      </div>
    </div>
  );
}


