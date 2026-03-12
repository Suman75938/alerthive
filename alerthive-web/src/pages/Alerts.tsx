import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowUpDown, CheckCircle, Bell, Flame, AlertTriangle, Clock } from 'lucide-react';
import { AlertCard } from '../components/AlertCard';
import { mockAlerts } from '../data/mockData';
import { AlertStatus } from '../types';
import { Tooltip } from '../components/Tooltip';

const statusFilters: { key: AlertStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'snoozed', label: 'Snoozed' },
  { key: 'closed', label: 'Closed' },
];

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function Alerts() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<AlertStatus | 'all'>('all');

  const filtered = mockAlerts
    .filter((a) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q));
      const matchesFilter = activeFilter === 'all' || a.status === activeFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const openCount = mockAlerts.filter((a) => a.status === 'open').length;
  const criticalCount = mockAlerts.filter((a) => a.priority === 'critical' && a.status !== 'closed').length;
  const ackCount = mockAlerts.filter((a) => a.status === 'acknowledged').length;
  const snoozedCount = mockAlerts.filter((a) => a.status === 'snoozed').length;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-text-primary">Alerts</h1>
        <div className="flex gap-2">
          <Tooltip text="Filter alerts by criteria" side="bottom">
            <button className="p-2 rounded-lg bg-surface border border-border hover:border-border-light transition-colors">
              <SlidersHorizontal size={18} className="text-text-secondary" />
            </button>
          </Tooltip>
          <Tooltip text="Sort alerts by priority or time" side="bottom">
            <button className="p-2 rounded-lg bg-surface border border-border hover:border-border-light transition-colors">
              <ArrowUpDown size={18} className="text-text-secondary" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
        {[
          { label: 'Open', value: openCount, color: '#FF4757', icon: Bell },
          { label: 'Critical', value: criticalCount, color: '#FF6200', icon: Flame },
          { label: 'Acknowledged', value: ackCount, color: '#1E90FF', icon: CheckCircle },
          { label: 'Snoozed', value: snoozedCount, color: '#FFA502', icon: Clock },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2.5 mb-4 focus-within:border-border-light transition-colors">
        <Search size={16} className="text-text-muted shrink-0" />
        <input
          type="text"
          placeholder="Search alerts by title, source, or tag..."
          className="flex-1 bg-transparent text-text-primary text-sm placeholder-text-muted outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-text-primary text-sm">
            âœ•
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statusFilters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeFilter === key
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-text-secondary hover:border-border-light hover:text-text-primary',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-text-muted mb-4">
        {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* List â€” 2-column grid on large screens */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <CheckCircle size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No alerts found</p>
          <p className="text-sm mt-1">
            {searchQuery ? 'Try a different search term' : 'All clear! No matching alerts.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onPress={() => navigate(`/alerts/${alert.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}


