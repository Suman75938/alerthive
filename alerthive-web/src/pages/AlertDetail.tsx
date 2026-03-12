import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Box, Tag, User, Clock, MoreHorizontal, Cpu, Building2, ExternalLink, Zap, Repeat2 } from 'lucide-react';
import { mockAlerts, mockCMDBAssets } from '../data/mockData';
import { Alert, AlertPriority, AlertStatus } from '../types';

const priorityConfig: Record<AlertPriority, { color: string; bg: string; label: string }> = {
  critical: { color: '#FF4757', bg: 'rgba(255,71,87,0.12)', label: 'Critical' },
  high: { color: '#FF6200', bg: 'rgba(255,98,0,0.12)', label: 'High' },
  medium: { color: '#FFA502', bg: 'rgba(255,165,2,0.12)', label: 'Medium' },
  low: { color: '#2ED573', bg: 'rgba(46,213,115,0.12)', label: 'Low' },
  info: { color: '#1E90FF', bg: 'rgba(30,144,255,0.12)', label: 'Info' },
};

const statusConfig: Record<AlertStatus, { color: string; label: string }> = {
  open: { color: '#FF4757', label: 'Open' },
  acknowledged: { color: '#FFA502', label: 'Acknowledged' },
  closed: { color: '#2ED573', label: 'Closed' },
  snoozed: { color: '#1E90FF', label: 'Snoozed' },
};

function getRemediationSteps(alert: Alert): { label: string; steps: string[] } | null {
  const t = alert.tags.map((x) => x.toLowerCase());
  const title = alert.title.toLowerCase();

  if (t.includes('database') || t.includes('db') || title.includes('connection pool') || title.includes('pg_') || title.includes('sql')) {
    return {
      label: 'Database / Connection Pool',
      steps: [
        'Run SELECT * FROM pg_stat_activity WHERE state = \'active\'; to inspect running queries.',
        'Check PgBouncer stats: SHOW POOLS; SHOW STATS;',
        'If pool is saturated, issue PAUSE <db>; wait 5 s; RESUME <db>;',
        'Restart the affected application pod/service to force connection recycling.',
        'Review slow-query logs and add missing indexes if needed.',
      ],
    };
  }
  if (t.includes('cpu') || t.includes('memory') || t.includes('oom') || title.includes('high cpu') || title.includes('memory')) {
    return {
      label: 'Resource Exhaustion (CPU / Memory)',
      steps: [
        'SSH to host and run: top -b -n1 | head -20 to identify top consumers.',
        'Check for runaway jobs: ps aux --sort=-%cpu | head -10',
        'If a single process is spiking, capture a thread dump: kill -3 <pid>',
        'Consider horizontal scaling or increasing pod resource limits.',
        'Review recent deployments — roll back if the spike correlates with a release.',
      ],
    };
  }
  if (t.includes('payments') || t.includes('payment') || t.includes('billing') || title.includes('payment')) {
    return {
      label: 'Payment / Billing Service',
      steps: [
        'Verify payment gateway health endpoint: GET /health or check gateway dashboard.',
        'Inspect recent transaction failures in payment service logs.',
        'Check for expired API keys or certificates on the payment provider integration.',
        'Review recent deployments to billing or checkout services — roll back if needed.',
        'Enable circuit breaker if error rate exceeds 5% to protect upstream systems.',
      ],
    };
  }
  if (alert.source.toLowerCase().includes('dynatrace')) {
    return {
      label: 'Dynatrace — AI-Assisted Triage',
      steps: [
        'Open the Dynatrace problem card and review Davis AI root-cause analysis.',
        'Inspect distributed traces for the affected service in Dynatrace APM.',
        'Check the deployment timeline — correlate problem start with any recent deployments.',
        'Review baselines: if metric deviation is > 3σ, trigger a full service restart.',
        'After resolving, add a problem description note and close the DT problem.',
      ],
    };
  }
  if (alert.priority === 'critical' || alert.priority === 'high') {
    return {
      label: 'High-Severity Incident',
      steps: [
        'Acknowledge the alert immediately to stop escalation.',
        'Open an incident bridge / war room and notify all on-call responders.',
        'Check service health dashboards and recent deployments.',
        'Communicate a status update via the incident channel every 15 minutes.',
        'After mitigation, write a brief post-incident summary and schedule an RCA.',
      ],
    };
  }
  return null;
}

function AutoRemediationPanel({ alert }: { alert: Alert }) {
  const [expanded, setExpanded] = useState(false);
  const data = getRemediationSteps(alert);
  if (!data) return null;
  return (
    <div className="bg-[#111827] border border-info/30 rounded-xl p-4 mb-4">
      <button
        className="w-full flex items-center justify-between group"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-info/20">
            <Zap size={13} className="text-info" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-info">
            Suggested Remediation — {data.label}
          </p>
        </div>
        <span className="text-info text-xs">{expanded ? '▲ collapse' : '▼ expand'}</span>
      </button>
      {expanded && (
        <ol className="mt-3 space-y-2 pl-1">
          {data.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-[#CBD5E1]">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-info/20 text-info text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="font-mono text-xs leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}


function formatDate(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AlertDetail() {
  const { alertId } = useParams<{ alertId: string }>();
  const navigate = useNavigate();

  const alert = mockAlerts.find((a) => a.id === alertId);
  const [currentStatus, setCurrentStatus] = useState<AlertStatus>(alert?.status ?? 'open');
  const [toast, setToast] = useState<string | null>(null);

  if (!alert) {
    return (
      <div className="p-6 text-center text-text-muted">
        <p className="text-lg font-medium">Alert not found</p>
        <button onClick={() => navigate('/alerts')} className="mt-4 text-primary hover:underline">
          Back to Alerts
        </button>
      </div>
    );
  }

  const priority = priorityConfig[alert.priority];
  const status = statusConfig[currentStatus];

  // CMDB assets whose tags overlap with alert tags
  const relatedAssets = mockCMDBAssets.filter((asset) =>
    asset.tags.some((t) => alert.tags.includes(t))
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'acknowledge':
        setCurrentStatus('acknowledged');
        showToast('Alert acknowledged');
        break;
      case 'close':
        setCurrentStatus('closed');
        showToast('Alert closed');
        break;
      case 'snooze':
        setCurrentStatus('snoozed');
        showToast('Alert snoozed for 1 hour');
        break;
      case 'escalate':
        showToast('Alert escalated to next responder');
        break;
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 bg-surface-light border border-border-light text-text-primary text-sm px-4 py-2.5 rounded-lg shadow-lg z-50 animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate('/alerts')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Alerts</span>
        </button>
        <button className="p-2 rounded-lg bg-surface border border-border hover:border-border-light transition-colors">
          <MoreHorizontal size={18} className="text-text-secondary" />
        </button>
      </div>

      {/* Priority + Status */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{ color: priority.color, backgroundColor: priority.bg }}
        >
          {priority.label}
        </span>
        <span
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border"
          style={{ color: status.color, borderColor: `${status.color}40` }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
          {status.label}
        </span>
        {(alert.metadata?.duplicateCount ?? 0) > 1 && (
          <span className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full bg-accent/20 text-accent">
            <Repeat2 size={13} />
            Hit Count: {alert.metadata!.duplicateCount}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-text-primary mb-4 leading-snug">{alert.title}</h1>

      {/* Description */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Description</p>
        <p className="text-sm text-text-secondary leading-relaxed">{alert.message}</p>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Source', value: alert.source, icon: Box },
          { label: 'Created', value: formatDate(alert.createdAt), icon: Clock },
          { label: 'Last Updated', value: formatDate(alert.updatedAt), icon: Clock },
          ...(alert.assignee ? [{ label: 'Assignee', value: alert.assignee, icon: User }] : []),
          ...(alert.acknowledgedBy
            ? [{ label: 'Acknowledged By', value: `${alert.acknowledgedBy} at ${formatDate(alert.acknowledgedAt ?? '')}`, icon: User }]
            : []),
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-3">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</p>
            <div className="flex items-center gap-1.5">
              <Icon size={14} className="text-primary shrink-0" />
              <p className="text-sm text-text-primary font-medium">{value}</p>
            </div>
          </div>
        ))}
        {(alert.metadata?.duplicateCount ?? 0) > 1 && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-3">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Hit Count</p>
            <div className="flex items-center gap-1.5">
              <Repeat2 size={14} className="text-accent shrink-0" />
              <p className="text-sm text-accent font-semibold">{alert.metadata!.duplicateCount} hits</p>
            </div>
            {alert.metadata?.lastDuplicateAt && (
              <p className="text-xs text-text-muted mt-1">Last: {formatDate(alert.metadata.lastDuplicateAt)}</p>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      {alert.tags.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {alert.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 bg-surface-highlight text-text-secondary text-xs px-2.5 py-1 rounded-lg"
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dynatrace Metadata */}
      {alert.source.toLowerCase().includes('dynatrace') && (
        <div className="bg-surface border border-info/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: '#1496FF20' }}>
              <ExternalLink size={12} style={{ color: '#1496FF' }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1496FF' }}>Dynatrace Event</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-text-muted">Source</span>
              <p className="text-text-primary font-medium mt-0.5">{alert.source}</p>
            </div>
            <div>
              <span className="text-text-muted">Priority</span>
              <p className="font-medium mt-0.5" style={{ color: priority.color }}>{priority.label}</p>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-3">Bi-directional sync enabled — status changes are reflected in Dynatrace automatically.</p>
        </div>
      )}

      {/* Auto-Remediation Panel */}
      <AutoRemediationPanel alert={alert} />

      {/* CMDB Related Assets */}
      {relatedAssets.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={14} className="text-primary" />
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Affected Assets</p>
            <span className="ml-auto text-xs text-text-muted">{relatedAssets.length} matched</span>
          </div>
          <div className="space-y-2">
            {relatedAssets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between p-3 bg-[#0D0D1A] rounded-lg border border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <Cpu size={14} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{asset.name}</p>
                    <p className="text-xs text-text-muted capitalize">{asset.type.replace('_', ' ')} · {asset.environment}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  asset.criticality === 'critical' ? 'bg-red-500/20 text-red-400' :
                  asset.criticality === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>{asset.criticality}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => handleAction('acknowledge')}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-surface-light transition-colors border border-transparent hover:border-border"
            style={{ color: '#FFA502' }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,165,2,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <span className="text-xs font-medium">Acknowledge</span>
          </button>

          <button
            onClick={() => handleAction('close')}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-surface-light transition-colors border border-transparent hover:border-border"
            style={{ color: '#2ED573' }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(46,213,115,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <span className="text-xs font-medium">Close</span>
          </button>

          <button
            onClick={() => handleAction('snooze')}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-surface-light transition-colors border border-transparent hover:border-border"
            style={{ color: '#1E90FF' }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(30,144,255,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className="text-xs font-medium">Snooze</span>
          </button>

          <button
            onClick={() => handleAction('escalate')}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-surface-light transition-colors border border-transparent hover:border-border"
            style={{ color: '#FF4757' }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,71,87,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <polyline points="17 11 12 6 7 11" /><line x1="12" y1="18" x2="12" y2="6" />
              </svg>
            </div>
            <span className="text-xs font-medium">Escalate</span>
          </button>
        </div>
      </div>
    </div>
  );
}


