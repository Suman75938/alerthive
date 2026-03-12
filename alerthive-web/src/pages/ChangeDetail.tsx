import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitBranch, CheckCircle2, XCircle, Clock, ServerCrash, Shield } from 'lucide-react';
import { useState } from 'react';
import { mockChanges } from '../data/mockData';
import { ChangeStatus, ChangeType, ChangeRisk, ChangeApproval } from '../types';

const STATUS_CONFIG: Record<ChangeStatus, { label: string; color: string; bg: string }> = {
  draft:            { label: 'Draft',            color: 'text-gray-400',   bg: 'bg-gray-400/10' },
  pending_approval: { label: 'Pending Approval', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  approved:         { label: 'Approved',         color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  in_progress:      { label: 'In Progress',      color: 'text-orange-400', bg: 'bg-orange-400/10' },
  completed:        { label: 'Completed',        color: 'text-green-400',  bg: 'bg-green-400/10' },
  cancelled:        { label: 'Cancelled',        color: 'text-gray-500',   bg: 'bg-gray-500/10' },
  rejected:         { label: 'Rejected',         color: 'text-red-400',    bg: 'bg-red-400/10' },
};

const TYPE_ICON: Record<ChangeType, string> = { standard: '\uD83D\uDFE2', normal: '\uD83D\uDFE1', emergency: '\uD83D\uDD34' };

const RISK_CONFIG: Record<ChangeRisk, { label: string; color: string; bar: string }> = {
  low:      { label: 'Low',      color: 'text-green-400',  bar: 'bg-green-400'  },
  medium:   { label: 'Medium',   color: 'text-yellow-400', bar: 'bg-yellow-400' },
  high:     { label: 'High',     color: 'text-orange-400', bar: 'bg-orange-400' },
  critical: { label: 'Critical', color: 'text-red-400',    bar: 'bg-red-400'    },
};

const TABS = ['overview', 'approvals', 'implementation', 'risk'] as const;
type Tab = typeof TABS[number];

function ApprovalBadge({ approval }: { approval: ChangeApproval }) {
  if (approval.status === 'approved') return (
    <span className="flex items-center gap-1 text-green-400 text-xs">
      <CheckCircle2 size={13} /> Approved
    </span>
  );
  if (approval.status === 'rejected') return (
    <span className="flex items-center gap-1 text-red-400 text-xs">
      <XCircle size={13} /> Rejected
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-yellow-400 text-xs">
      <Clock size={13} /> Pending
    </span>
  );
}

export default function ChangeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  const change = mockChanges.find((c) => c.id === id);
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
  const approvedCount = change.approvals.filter((a) => a.status === 'approved').length;
  const totalApprovals = change.approvals.length;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
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
              {change.affectedServices.map((s) => (
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
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${approvedCount === totalApprovals && totalApprovals > 0 ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
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
            {(change.linkedIncidentIds.length > 0 || change.linkedProblemIds.length > 0) && (
              <div className="bg-surface border border-border rounded-xl p-3">
                <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">Linked Records</h3>
                <div className="flex flex-wrap gap-2">
                  {change.linkedIncidentIds.map((id) => (
                    <span key={id} className="px-2 py-1 bg-orange-400/10 text-orange-400 text-xs rounded cursor-pointer hover:bg-orange-400/20"
                      onClick={() => navigate(`/incidents/${id}`)}>INC: {id}</span>
                  ))}
                  {change.linkedProblemIds.map((id) => (
                    <span key={id} className="px-2 py-1 bg-purple-400/10 text-purple-400 text-xs rounded cursor-pointer hover:bg-purple-400/20"
                      onClick={() => navigate(`/problems/${id}`)}>PRB: {id}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'approvals' && (
          <div className="space-y-3">
            {change.approvals.length === 0 && (
              <div className="text-center py-10 text-text-muted">
                <Shield size={30} className="mx-auto mb-2 opacity-30" />
                <p>No approval workflow configured.</p>
              </div>
            )}
            {change.approvals.map((approval) => (
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
              <h3 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">Implementation Plan</h3>
              <pre className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-sans">{change.implementationPlan}</pre>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3">
              <h3 className="text-xs font-semibold text-orange-400 mb-2 uppercase tracking-wide">Backout / Rollback Plan</h3>
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


