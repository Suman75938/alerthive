import { useState } from 'react';
import { Radio, AlertTriangle, CheckCircle, PauseCircle, Clock, Tag, Bell, Plus, X } from 'lucide-react';
import { mockHeartbeats as initialHeartbeats } from '../data/mockData';
import { Heartbeat, HeartbeatStatus } from '../types';
import { Tooltip } from '../components/Tooltip';

const statusConfig: Record<HeartbeatStatus, { label: string; color: string; icon: React.ElementType; dot: string }> = {
  active: { label: 'Active', color: '#2ED573', icon: CheckCircle, dot: 'bg-low animate-pulse' },
  expired: { label: 'Expired', color: '#FF4757', icon: AlertTriangle, dot: 'bg-critical' },
  paused: { label: 'Paused', color: '#B0A8C8', icon: PauseCircle, dot: 'bg-text-muted' },
};

function timeAgo(isoDate?: string): string {
  if (!isoDate) return 'â€”';
  const diff = Date.now() - new Date(isoDate).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function timeUntil(isoDate?: string): string {
  if (!isoDate) return 'â€”';
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h`;
}

function HeartbeatCard({ hb }: { hb: Heartbeat }) {
  const cfg = statusConfig[hb.status];
  const Icon = cfg.icon;

  return (
    <div
      className="bg-surface border rounded-xl p-3 flex flex-col gap-3"
      style={{ borderColor: hb.status === 'expired' ? '#FF475730' : '#2A2A3E' }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
            <h3 className="text-sm font-semibold text-text-primary truncate">{hb.name}</h3>
          </div>
          <p className="text-xs text-text-muted">{hb.description}</p>
        </div>
        <span
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
          style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
        >
          <Icon size={11} />
          {cfg.label}
        </span>
      </div>

      {/* Interval + next ping */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-surface-light rounded-lg p-2">
          <p className="text-xs text-text-muted">Interval</p>
          <p className="text-sm font-bold text-text-primary mt-0.5">
            {hb.interval} {hb.unit}
          </p>
        </div>
        <div className="bg-surface-light rounded-lg p-2">
          <p className="text-xs text-text-muted">Last Ping</p>
          <p className="text-sm font-bold text-text-primary mt-0.5">{timeAgo(hb.lastPingAt)}</p>
        </div>
        <div className="bg-surface-light rounded-lg p-2">
          <p className="text-xs text-text-muted">Expires In</p>
          <p
            className="text-sm font-bold mt-0.5"
            style={{ color: hb.status === 'expired' ? '#FF4757' : hb.status === 'paused' ? '#B0A8C8' : '#2ED573' }}
          >
            {hb.status === 'paused' ? 'â€”' : timeUntil(hb.expiresAt)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Clock size={11} /> {hb.team}
          </span>
          {hb.alertOnExpiry && (
            <span
              className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                color: hb.alertPriority === 'critical' ? '#FF4757' : hb.alertPriority === 'high' ? '#FF6200' : '#FFA502',
                backgroundColor: hb.alertPriority === 'critical' ? '#FF475718' : hb.alertPriority === 'high' ? '#FF620018' : '#FFA50218',
              }}
            >
              <Bell size={10} /> Alert on expiry ({hb.alertPriority})
            </span>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          {hb.tags.map((t) => (
            <span key={t} className="text-xs bg-surface-light border border-border text-text-muted px-1.5 py-0.5 rounded">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewMonitorModal({ onClose, onSave }: { onClose: () => void; onSave: (hb: Heartbeat) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [interval, setInterval] = useState(5);
  const [unit, setUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [team, setTeam] = useState('SRE Team');
  const [alertOnExpiry, setAlertOnExpiry] = useState(true);
  const [alertPriority, setAlertPriority] = useState<'critical' | 'high' | 'medium'>('high');
  const [tags, setTags] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + interval * (unit === 'minutes' ? 60000 : unit === 'hours' ? 3600000 : 86400000) * 2).toISOString();
    onSave({
      id: `hb-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      interval,
      unit,
      team,
      status: 'active',
      alertOnExpiry,
      alertPriority,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      lastPingAt: now,
      expiresAt,
      createdAt: now,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border-light rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-base font-bold text-text-primary">New Heartbeat Monitor</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-2">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Monitor Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nightly Batch Job" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Interval</label>
              <input type="number" min={1} value={interval} onChange={e => setInterval(Number(e.target.value))} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value as 'minutes' | 'hours' | 'days')} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary">
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Team</label>
            <input value={team} onChange={e => setTeam(e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="alertOnExpiry" checked={alertOnExpiry} onChange={e => setAlertOnExpiry(e.target.checked)} className="w-4 h-4 accent-primary" />
            <label htmlFor="alertOnExpiry" className="text-sm text-text-primary">Alert on expiry</label>
            {alertOnExpiry && (
              <select value={alertPriority} onChange={e => setAlertPriority(e.target.value as 'critical' | 'high' | 'medium')} className="ml-auto bg-surface border border-border rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. batch, prod, payments" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-text-muted hover:text-text-primary transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors">Create Monitor</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Heartbeats() {
  const [monitors, setMonitors] = useState<Heartbeat[]>(initialHeartbeats);
  const [filter, setFilter] = useState<HeartbeatStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);

  const filtered = filter === 'all' ? monitors : monitors.filter((h) => h.status === filter);

  const counts: Record<HeartbeatStatus, number> = {
    active: monitors.filter((h) => h.status === 'active').length,
    expired: monitors.filter((h) => h.status === 'expired').length,
    paused: monitors.filter((h) => h.status === 'paused').length,
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {showModal && (
        <NewMonitorModal onClose={() => setShowModal(false)} onSave={(hb) => setMonitors((prev) => [hb, ...prev])} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Heartbeat Monitoring</h1>
          <p className="text-sm text-text-muted mt-1">
            Detect silent failures â€” services that stop reporting without raising an explicit alert.
          </p>
        </div>
        <Tooltip text="Create a new heartbeat monitor" side="bottom">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} />
          New Monitor
        </button>
        </Tooltip>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        {[
          { label: 'Active', value: counts.active, color: '#2ED573' },
          { label: 'Expired', value: counts.expired, color: '#FF4757' },
          { label: 'Paused', value: counts.paused, color: '#B0A8C8' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* How it works banner */}
      <div className="bg-surface-light border border-border rounded-xl p-4 mb-3 flex items-start gap-3">
        <Radio size={16} className="text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-text-primary font-medium">How Heartbeats Work</p>
          <p className="text-xs text-text-muted mt-1">
            Your service calls the heartbeat endpoint on a fixed schedule. If AlertHive doesn't receive a ping
            within the configured interval, it fires an alert at the configured priority â€” detecting silent failures
            such as crashed cron jobs, hung batch processes, or disconnected agents.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'active', 'expired', 'paused'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors capitalize ${
              filter === s
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-text-muted hover:text-text-primary'
            }`}
          >
            {s === 'all' ? `All (${monitors.length})` : `${s} (${counts[s]})`}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Radio size={36} className="mx-auto mb-3 opacity-30" />
          <p>No heartbeat monitors match this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {filtered.map((hb) => (
            <HeartbeatCard key={hb.id} hb={hb} />
          ))}
        </div>
      )}
    </div>
  );
}


