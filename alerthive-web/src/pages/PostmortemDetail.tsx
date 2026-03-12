import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2, Clock, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState } from 'react';
import { mockPostmortems } from '../data/mockData';
import { AlertPriority } from '../types';

const PRIORITY_COLOR: Record<AlertPriority, string> = {
  critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400',
  low: 'text-blue-400', info: 'text-gray-400',
};

const ACTION_STATUS_CONFIG = {
  open:        { label: 'Open',        color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: AlertTriangle },
  completed:   { label: 'Completed',   color: 'text-green-400',  bg: 'bg-green-400/10',  icon: CheckCircle2 },
} as const;

const TABS = ['summary', '5 whys', 'action items'] as const;
type Tab = typeof TABS[number];

// NOTE: duplicate import removed â€” using allPostmortems alias
export default function PostmortemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('summary');

  const pm = mockPostmortems.find((p) => p.id === id);
  if (!pm) {
    return (
      <div className="p-6 text-center text-text-muted">
        <FileText size={40} className="mx-auto mb-3 opacity-30" />
        <p>Postmortem not found.</p>
        <button onClick={() => navigate('/postmortems')} className="mt-3 text-primary text-sm hover:underline">
          â† Back to Postmortems
        </button>
      </div>
    );
  }

  const openActions = pm.actionItems.filter((a) => a.status === 'open').length;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <button
        onClick={() => navigate('/postmortems')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={15} /> Back to Postmortems
      </button>

      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-mono text-text-muted">{pm.id}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pm.status === 'published' ? 'bg-green-400/10 text-green-400' : pm.status === 'review' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-gray-400/10 text-gray-400'}`}>
            {pm.status.charAt(0).toUpperCase() + pm.status.slice(1)}
          </span>
          <span className={`text-xs font-medium ${PRIORITY_COLOR[pm.severity]}`}>
            Severity: {pm.severity.toUpperCase()}
          </span>
        </div>
        <h1 className="text-xl font-bold text-text-primary">{pm.incidentTitle}</h1>
        <p className="text-text-muted text-sm mt-1">{pm.summary}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Duration', value: `${pm.durationMinutes}m` },
            { label: 'Detected', value: new Date(pm.detectedAt).toLocaleString() },
            { label: 'Resolved', value: new Date(pm.resolvedAt).toLocaleString() },
            { label: 'Open Actions', value: openActions, highlight: openActions > 0 },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-text-muted">{item.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${item.highlight ? 'text-orange-400' : 'text-text-primary'}`}>{item.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-3">
          <span className="font-medium">{pm.impactSummary}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2.5 text-sm font-medium capitalize transition-colors',
              tab === t ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {t}
            {t === 'action items' && openActions > 0 && (
              <span className="ml-1.5 bg-orange-400/20 text-orange-400 text-xs px-1.5 py-0.5 rounded-full">{openActions}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {tab === 'summary' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-surface border border-green-900/40 rounded-xl p-3">
                <h3 className="text-green-400 text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
                  <ThumbsUp size={13} /> What Went Well
                </h3>
                <ul className="space-y-1.5">
                  {pm.whatWentWell.map((item, i) => (
                    <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">âœ“</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-surface border border-red-900/40 rounded-xl p-3">
                <h3 className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
                  <ThumbsDown size={13} /> What Went Wrong
                </h3>
                <ul className="space-y-1.5">
                  {pm.whatWentWrong.map((item, i) => (
                    <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">âœ—</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <h3 className="text-xs font-semibold text-orange-400 mb-2 uppercase tracking-wide">Root Cause</h3>
              <p className="text-text-primary text-sm leading-relaxed">{pm.rootCause}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <h3 className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Contributing Factors</h3>
              <ul className="space-y-1">
                {pm.contributingFactors.map((f, i) => (
                  <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-text-muted mt-0.5">â€¢</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-muted mb-1">Authors & Attendees</p>
              <p className="text-sm text-text-primary">{pm.author} Â· {pm.attendees.join(', ')}</p>
            </div>
          </div>
        )}

        {tab === '5 whys' && (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">Root cause analysis drill-down for this incident.</p>
            {pm.fiveWhys.map((entry) => (
              <div key={entry.why} className="bg-surface border border-border rounded-xl p-4 flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {entry.why}
                </div>
                <div>
                  <p className="text-text-secondary text-sm font-medium mb-1">{entry.question}</p>
                  <p className="text-text-primary text-sm">{entry.answer}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'action items' && (
          <div className="space-y-3">
            {pm.actionItems.length === 0 && (
              <div className="text-center py-10 text-text-muted">
                <CheckCircle2 size={30} className="mx-auto mb-2 opacity-30" />
                <p>No action items defined yet.</p>
              </div>
            )}
            {pm.actionItems.map((item) => {
              const cfg = ACTION_STATUS_CONFIG[item.status];
              const Icon = cfg.icon;
              return (
                <div key={item.id} className="bg-surface border border-border rounded-xl p-4 flex items-start gap-2">
                  <Icon size={16} className={`${cfg.color} mt-0.5 shrink-0`} />
                  <div className="flex-1">
                    <p className="text-text-primary text-sm">{item.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                      <span>Owner: <span className="text-text-primary">{item.owner}</span></span>
                      <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


