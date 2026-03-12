import { useState } from 'react';
import { Wrench, Clock, CheckCircle, AlertTriangle, XCircle, BellOff, Server, Plus } from 'lucide-react';
import { mockMaintenanceWindows } from '../data/mockData';
import { MaintenanceWindow, MaintenanceWindowStatus } from '../types';
import { Tooltip } from '../components/Tooltip';

const statusConfig: Record<MaintenanceWindowStatus, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Active', color: '#FFA502', icon: Wrench },
  scheduled: { label: 'Scheduled', color: '#1E90FF', icon: Clock },
  completed: { label: 'Completed', color: '#2ED573', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: '#B0A8C8', icon: XCircle },
};

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${fmt(s)} → ${fmt(e)}`;
}

function durationLabel(start: string, end: string): string {
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (diff < 60) return `${diff}m`;
  return `${(diff / 60).toFixed(1)}h`;
}

function WindowCard({ mw }: { mw: MaintenanceWindow }) {
  const cfg = statusConfig[mw.status];
  const Icon = cfg.icon;

  return (
    <div
      className="bg-surface border rounded-xl p-3"
      style={{ borderColor: mw.status === 'active' ? '#FFA50230' : '#2A2A3E' }}
    >
      {/* Status + title */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
            >
              <Icon size={11} />
              {cfg.label}
            </span>
            {mw.suppressAlerts && (
              <span className="flex items-center gap-1 text-xs font-medium text-critical bg-critical/10 px-2.5 py-0.5 rounded-full">
                <BellOff size={11} /> Alerts suppressed
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text-primary">{mw.title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{mw.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-text-muted">Duration</p>
          <p className="text-sm font-bold text-text-primary">{durationLabel(mw.startTime, mw.endTime)}</p>
        </div>
      </div>

      {/* Time range */}
      <div className="bg-surface-light border border-border rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
        <Clock size={13} className="text-text-muted shrink-0" />
        <span className="text-xs text-text-secondary">{formatRange(mw.startTime, mw.endTime)}</span>
      </div>

      {/* Affected services */}
      <div className="mb-3">
        <p className="text-xs text-text-muted font-medium mb-1.5 flex items-center gap-1">
          <Server size={11} /> Affected Services
        </p>
        <div className="flex flex-wrap gap-1.5">
          {mw.affectedServices.map((s) => (
            <span key={s} className="text-xs bg-surface-light border border-border text-text-secondary px-2 py-0.5 rounded">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-muted">
        <span>Created by <span className="text-text-secondary">{mw.createdBy}</span></span>
        <span>Teams: <span className="text-text-secondary">{mw.affectedTeams.join(', ')}</span></span>
      </div>
    </div>
  );
}

export default function MaintenanceWindows() {
  const [filter, setFilter] = useState<MaintenanceWindowStatus | 'all'>('all');

  const counts = {
    active: mockMaintenanceWindows.filter((m) => m.status === 'active').length,
    scheduled: mockMaintenanceWindows.filter((m) => m.status === 'scheduled').length,
    completed: mockMaintenanceWindows.filter((m) => m.status === 'completed').length,
    cancelled: mockMaintenanceWindows.filter((m) => m.status === 'cancelled').length,
  };

  const filtered = filter === 'all' ? mockMaintenanceWindows : mockMaintenanceWindows.filter((m) => m.status === filter);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Maintenance Windows</h1>
          <p className="text-sm text-text-muted mt-1">
            Schedule planned downtime windows to suppress alerts and prevent false-positive incidents.
          </p>
        </div>
        <Tooltip text="Schedule a new maintenance window" side="bottom">
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} />
          Schedule Window
        </button>
        </Tooltip>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 mb-3">
        {(Object.entries(statusConfig) as [MaintenanceWindowStatus, typeof statusConfig[MaintenanceWindowStatus]][]).map(([status, cfg]) => (
          <div key={status} className="bg-surface border border-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold" style={{ color: cfg.color }}>{counts[status]}</p>
            <p className="text-xs text-text-muted mt-0.5">{cfg.label}</p>
          </div>
        ))}
      </div>

      {/* Active warning */}
      {counts.active > 0 && (
        <div className="bg-medium/10 border border-medium/30 rounded-xl p-3 mb-3 flex items-center gap-3">
          <Wrench size={16} className="text-medium shrink-0" />
          <p className="text-sm text-medium font-medium">
            {counts.active} maintenance window{counts.active > 1 ? 's are' : ' is'} currently active — alerts for affected services are suppressed.
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all', 'active', 'scheduled', 'completed', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors capitalize ${
              filter === s
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-text-muted hover:text-text-primary'
            }`}
          >
            {s === 'all' ? `All (${mockMaintenanceWindows.length})` : `${s} (${counts[s as MaintenanceWindowStatus]})`}
          </button>
        ))}
      </div>

      {/* Windows */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Wrench size={36} className="mx-auto mb-3 opacity-30" />
          <p>No maintenance windows found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
          {filtered.map((mw) => (
            <WindowCard key={mw.id} mw={mw} />
          ))}
        </div>
      )}
    </div>
  );
}


