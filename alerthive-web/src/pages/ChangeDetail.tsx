import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitBranch, CheckCircle2, XCircle, Clock, ServerCrash, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Change, ChangeStatus, ChangeType, ChangeRisk, ChangeApproval } from '../types';
import { apiGet } from '../lib/api';

const STATUS_CONFIG: Record<ChangeStatus, { label: string; color: string; bg: string }> = {
  draft:            { label: 'Draft',            color: 'text-text-muted',  bg: 'bg-surface-light' },
  pending_approval: { label: 'Pending Approval', color: 'text-medium',      bg: 'bg-medium/10' },
  approved:         { label: 'Approved',         color: 'text-info',        bg: 'bg-info/10' },
  in_progress:      { label: 'In Progress',      color: 'text-high',        bg: 'bg-high/10' },
  completed:        { label: 'Completed',        color: 'text-low',         bg: 'bg-low/10' },
  cancelled:        { label: 'Cancelled',        color: 'text-text-muted',  bg: 'bg-surface-light' },
  rejected:         { label: 'Rejected',         color: 'text-critical',    bg: 'bg-critical/10' },
};

const TYPE_ICON: Record<ChangeType, string> = { standard: '\uD83D\uDFE2', normal: '\uD83D\uDFE1', emergency: '\uD83D\uDD34' };

const RISK_CONFIG: Record<ChangeRisk, { label: string; color: string; bar: string }> = {
  low:      { label: 'Low',      color: 'text-low',      bar: 'bg-low'      },
  medium:   { label: 'Medium',   color: 'text-medium',   bar: 'bg-medium'   },
  high:     { label: 'High',     color: 'text-high',     bar: 'bg-high'     },
  critical: { label: 'Critical', color: 'text-critical', bar: 'bg-critical' },
};

const TABS = ['overview', 'approvals', 'implementation', 'risk'] as const;
type Tab = typeof TABS[number];

function ApprovalBadge({ approval }: { approval: ChangeApproval }) {
  if (approval.status === 'approved') return (
    <span className="flex items-center gap-1 text-low text-xs">
      <CheckCircle2 size={13} /> Approved
    </span>
  );
  if (approval.status === 'rejected') return (
    <span className="flex items-center gap-1 text-critical text-xs">
      <XCircle size={13} /> Rejected
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-medium text-xs">
      <Clock size={13} /> Pending
    </span>
  );
}

export default function ChangeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [change, setChange] = useState<Change | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGet<Change>(`/changes/${id}`)
      .then((r) => setChange(r.data ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-center text-text-muted">Loading…</div>;
  if (!change) {
    return (
      <div className="p-6 text-center text-text-muted">
        <GitBranch size={40} className="mx-auto mb-3 opacity-30" />
        <p>Change record not found.</p>
        <button onClick={() => navigate('/changes')} className="mt-3 text-primary text-sm hover:underline">
          Ã¢â€ Â Back to Changes
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[change.status];
  const risk = RISK_CONFIG[change.risk];
  const approvals = (change.approvals ?? []) as ChangeApproval[];
  const approvedCount = approvals.filter((a) => a.status === 'approved').length;
  const totalApprovals = approvals.length;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <button
        onClick={() => navigate('/changes')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={15} /> Back to Changes
      </button>

      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-3">
        <div className="flex items-start gap-2">
          <span className="text-2xl">{TYPE_ICON[change.type]}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono text-text-muted">{change.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>{status.label}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${risk.color}`}>Risk: {risk.label} ({change.riskScore}/100)</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary">{change.title}</h1>
            <div className="flex gap-4 text-xs text-text-muted mt-2 flex-wrap">
              <span>Raised by: <span className="text-text-primary">{change.raisedBy}</span></span>
              {change.assignee && <span>Assignee: <span className="text-text-primary">{change.assignee}</span></span>}
              <span>Scheduled: {new Date(change.scheduledStart).toLocaleDateString()} Ã¢â€ â€™ {new Date(change.scheduledEnd).toLocaleDateString()}</span>
              <span>Approvals: {approvedCount}/{totalApprovals}</span>
            </div>
            {/* Affected Services */}
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {(change.affectedServices ?? []).map((s) => (
                <span key={s} className="px-2 py-0.5 bg-surface-light text-text-muted text-xs rounded flex items-center gap-1">
                  <ServerCrash size={10} /> {s}
                </span>
              ))}
            </div>
          </div>
        </div>
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
            {t === 'approvals' && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${approvedCount === totalApprovals && totalApprovals > 0 ? 'bg-low/20 text-low' : 'bg-medium/20 text-medium'}`}>
                {approvedCount}/{totalApprovals}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-3">
              <h3 className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">Description</h3>
              <p className="text-text-primary text-sm leading-relaxed">{change.description}</p>
            </div>
            {((change.linkedIncidentIds ?? []).length > 0 || (change.linkedProblemIds ?? []).length > 0) && (
              <div className="bg-surface border border-border rounded-xl p-3">
                <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">Linked Records</h3>
                <div className="flex flex-wrap gap-2">
                  {(change.linkedIncidentIds ?? []).map((id) => (
                    <span key={id} className="px-2 py-1 bg-high/10 text-high text-xs rounded cursor-pointer hover:bg-high/20"
                      onClick={() => navigate(`/incidents/${id}`)}>INC: {id}</span>
                  ))}
                  {(change.linkedProblemIds ?? []).map((id) => (
                    <span key={id} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded cursor-pointer hover:bg-primary/20"
                      onClick={() => navigate(`/problems/${id}`)}>PRB: {id}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'approvals' && (
          <div className="space-y-3">
            {approvals.length === 0 && (
              <div className="text-center py-10 text-text-muted">
                <Shield size={30} className="mx-auto mb-2 opacity-30" />
                <p>No approval workflow configured.</p>
              </div>
            )}
            {approvals.map((approval) => (
              <div key={approval.id} className="bg-surface border border-border rounded-xl p-4 flex items-start gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {approval.approver.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-text-primary text-sm font-medium">{approval.approver}</p>
                    <ApprovalBadge approval={approval} />
                  </div>
                  {approval.comment && (
                    <p className="text-text-muted text-xs mt-1.5 italic">"{approval.comment}"</p>
                  )}
                  {approval.timestamp && (
                    <p className="text-text-muted text-xs mt-1">{new Date(approval.timestamp).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'implementation' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-3">
              <h3 className="text-xs font-semibold text-info mb-2 uppercase tracking-wide">Implementation Plan</h3>
              <pre className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-sans">{change.implementationPlan}</pre>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <h3 className="text-xs font-semibold text-high mb-2 uppercase tracking-wide">Backout / Rollback Plan</h3>
              <pre className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-sans">{change.backoutPlan}</pre>
            </div>
          </div>
        )}

        {tab === 'risk' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Risk Score</h3>
                <span className={`text-3xl font-bold ${risk.color}`}>{change.riskScore}</span>
              </div>
              <div className="bg-border rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all ${risk.bar}`}
                  style={{ width: `${change.riskScore}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>0 Ã¢â‚¬â€ Low</span>
                <span>50 Ã¢â‚¬â€ Medium</span>
                <span>75 Ã¢â‚¬â€ High</span>
                <span>100 Ã¢â‚¬â€ Critical</span>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">Change Type</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{TYPE_ICON[change.type]}</span>
                <div>
                  <p className="text-text-primary font-medium capitalize">{change.type} Change</p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {change.type === 'standard' && 'Pre-approved, low risk, follows a standard template.'}
                    {change.type === 'normal' && 'Requires CAB approval, moderate risk assessment needed.'}
                    {change.type === 'emergency' && 'Bypasses normal approval process due to urgency. Post-implementation review required.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


