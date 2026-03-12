import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Search, Plus, Flame, Activity } from 'lucide-react';
import { IncidentCard } from '../components/IncidentCard';
import { mockIncidents } from '../data/mockData';
import { IncidentStatus } from '../types';
import { Tooltip } from '../components/Tooltip';

const statusColors: Record<IncidentStatus, string> = {
  triggered: '#FF4757',
  investigating: '#FF6200',
  identified: '#FFA502',
  monitoring: '#1E90FF',
  resolved: '#2ED573',
};

const statusFilters: (IncidentStatus | 'all')[] = ['all', 'triggered', 'investigating', 'identified', 'monitoring', 'resolved'];

export function Incidents() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');

  const filtered = mockIncidents.filter((i) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || i.title.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const active = filtered.filter((i) => i.status !== 'resolved');
  const resolved = filtered.filter((i) => i.status === 'resolved');

  const stats = [
    { label: 'Active', value: mockIncidents.filter((i) => i.status !== 'resolved').length, color: '#FF4757', icon: Flame },
    { label: 'Triggered', value: mockIncidents.filter((i) => i.status === 'triggered').length, color: '#FF6200', icon: AlertTriangle },
    { label: 'Investigating', value: mockIncidents.filter((i) => i.status === 'investigating').length, color: '#FFA502', icon: Activity },
    { label: 'Resolved', value: mockIncidents.filter((i) => i.status === 'resolved').length, color: '#2ED573', icon: CheckCircle },
  ];

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-text-primary">Incidents</h1>
        <Tooltip text="Declare a new incident and start response" side="bottom">
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            New Incident
          </button>
        </Tooltip>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
        {stats.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2.5 mb-4 focus-within:border-border-light transition-colors">
        <Search size={16} className="text-text-muted shrink-0" />
        <input
          type="text"
          placeholder="Search incidents..."
          className="flex-1 bg-transparent text-text-primary text-sm placeholder-text-muted outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-text-muted hover:text-text-primary text-sm leading-none">&#x2715;</button>
        )}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors flex items-center gap-1.5',
              statusFilter === s
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-text-secondary hover:border-border-light',
            ].join(' ')}
          >
            {s !== 'all' && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors[s as IncidentStatus] }} />
            )}
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Active Incidents */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-critical" />
          Active Incidents ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="text-center py-10 text-text-muted bg-surface border border-border rounded-xl">
            <CheckCircle size={40} className="mx-auto mb-2 opacity-30" />
            <p>No active incidents</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {active.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onPress={() => navigate(`/incidents/${incident.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Resolved Incidents */}
      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle size={14} className="text-low" />
            Resolved ({resolved.length})
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {resolved.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onPress={() => navigate(`/incidents/${incident.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


