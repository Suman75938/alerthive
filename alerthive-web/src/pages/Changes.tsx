import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, ChevronRight, Search, Filter, AlertTriangle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { mockChanges } from '../data/mockData';
import { Change, ChangeStatus, ChangeType, ChangeRisk } from '../types';
import { Tooltip } from '../components/Tooltip';

const STATUS_CONFIG: Record<ChangeStatus, { label: string; color: string; bg: string }> = {
  draft:            { label: 'Draft',            color: 'text-gray-400',   bg: 'bg-gray-400/10' },
  pending_approval: { label: 'Pending Approval', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  approved:         { label: 'Approved',         color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  in_progress:      { label: 'In Progress',      color: 'text-orange-400', bg: 'bg-orange-400/10' },
  completed:        { label: 'Completed',        color: 'text-green-400',  bg: 'bg-green-400/10' },
  cancelled:        { label: 'Cancelled',        color: 'text-gray-500',   bg: 'bg-gray-500/10' },
  rejected:         { label: 'Rejected',         color: 'text-red-400',    bg: 'bg-red-400/10' },
};

const TYPE_CONFIG: Record<ChangeType, { label: string; color: string; icon: string }> = {
  standard:  { label: 'Standard',  color: 'text-green-400',  icon: '\uD83D\uDFE2' },
  normal:    { label: 'Normal',    color: 'text-yellow-400', icon: '\uD83D\uDFE1' },
  emergency: { label: 'Emergency', color: 'text-red-400',    icon: '\uD83D\uDD34' },
};

const RISK_CONFIG: Record<ChangeRisk, { label: string; color: string; bar: string; bg: string }> = {
  low:      { label: 'Low',      color: 'text-green-400',  bar: 'bg-green-400',  bg: 'bg-green-400/10' },
  medium:   { label: 'Medium',   color: 'text-yellow-400', bar: 'bg-yellow-400', bg: 'bg-yellow-400/10' },
  high:     { label: 'High',     color: 'text-orange-400', bar: 'bg-orange-400', bg: 'bg-orange-400/10' },
  critical: { label: 'Critical', color: 'text-red-400',    bar: 'bg-red-400',    bg: 'bg-red-400/10' },
};

export default function Changes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChangeStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ChangeType | 'all'>('all');

  const filtered: Change[] = mockChanges.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.affectedServices.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchType = typeFilter === 'all' || c.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const totals = {
    pending: mockChanges.filter((c) => c.status === 'pending_approval').length,
    emergency: mockChanges.filter((c) => c.type === 'emergency').length,
    inProgress: mockChanges.filter((c) => c.status === 'in_progress').length,
    completed: mockChanges.filter((c) => c.status === 'completed').length,
  };

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <GitBranch size={24} className="text-primary" /> Change Management
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage, approve, and track service changes with risk assessment and CAB workflow.
          </p>
        </div>
        <Tooltip text="Submit a new change request for review" side="bottom">
        <button
          onClick={() => navigate('/changes/new')}
          className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Change
        </button>
        </Tooltip>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Pending Approval', value: totals.pending, icon: Clock, color: 'text-yellow-400' },
          { label: 'Emergency', value: totals.emergency, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'In Progress', value: totals.inProgress, icon: ShieldAlert, color: 'text-orange-400' },
          { label: 'Completed', value: totals.completed, icon: CheckCircle2, color: 'text-green-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface rounded-xl p-4 border border-border flex items-center gap-3">
            <kpi.icon size={20} className={kpi.color} />
            <div>
              <p className="text-xl font-bold text-text-primary">{kpi.value}</p>
              <p className="text-xs text-text-muted">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search changesâ€¦"
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-text-muted" />
          {(['all', 'standard', 'normal', 'emergency'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                typeFilter === t ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {t === 'all' ? `All Types` : TYPE_CONFIG[t].icon + ' ' + TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Change List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <GitBranch size={40} className="mx-auto mb-3 opacity-30" />
            <p>No changes match your filters.</p>
          </div>
        )}
        {filtered.map((change) => {
          const status = STATUS_CONFIG[change.status];
          const type = TYPE_CONFIG[change.type];
          const risk = RISK_CONFIG[change.risk];
          const approvedCount = change.approvals.filter((a) => a.status === 'approved').length;
          return (
            <div
              key={change.id}
              onClick={() => navigate(`/changes/${change.id}`)}
              className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-start gap-2">
                <span className="text-xl shrink-0 mt-0.5">{type.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-text-muted">{change.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${risk.bg} ${risk.color}`}>
                      Risk: {risk.label}
                    </span>
                  </div>
                  <h3 className="text-text-primary font-medium mt-1 group-hover:text-primary transition-colors truncate">{change.title}</h3>
                  <p className="text-sm text-text-muted mt-0.5 line-clamp-1">{change.description}</p>

                  {/* Risk bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-border rounded-full h-1.5 max-w-[120px]">
                      <div
                        className={`h-1.5 rounded-full ${risk.bar}`}
                        style={{ width: `${change.riskScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">Risk score: {change.riskScore}/100</span>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-text-muted flex-wrap">
                    <span>By: {change.raisedBy}</span>
                    <span>Scheduled: {new Date(change.scheduledStart).toLocaleDateString()}</span>
                    <span>Approvals: {approvedCount}/{change.approvals.length}</span>
                    <div className="flex gap-1 flex-wrap ml-auto">
                      {change.affectedServices.slice(0, 3).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-surface-light rounded">{s}</span>
                      ))}
                      {change.affectedServices.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-surface-light rounded">+{change.affectedServices.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors shrink-0 mt-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


