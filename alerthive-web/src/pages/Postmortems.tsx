import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, AlertTriangle } from 'lucide-react';
import { mockPostmortems } from '../data/mockData';
import { AlertPriority } from '../types';
import { Tooltip } from '../components/Tooltip';

const SEVERITY_CONFIG: Record<AlertPriority, { color: string; bg: string }> = {
  critical: { color: 'text-red-400',    bg: 'bg-red-400/10' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-400/10' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  low:      { color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  info:     { color: 'text-gray-400',   bg: 'bg-gray-400/10' },
};

export default function Postmortems() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = mockPostmortems.filter(
    (p) =>
      p.incidentTitle.toLowerCase().includes(search.toLowerCase()) ||
      p.summary.toLowerCase().includes(search.toLowerCase())
  );

  const openActions = mockPostmortems.reduce(
    (sum, p) => sum + p.actionItems.filter((a) => a.status === 'open').length, 0
  );

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileText size={24} className="text-primary" /> Postmortems
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Blameless post-incident reviews to prevent recurrence and drive continuous improvement.
          </p>
        </div>
        <Tooltip text="Start a new blameless post-incident review" side="bottom">
          <button className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + New Postmortem
          </button>
        </Tooltip>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { label: 'Total', value: mockPostmortems.length },
          { label: 'Published', value: mockPostmortems.filter((p) => p.status === 'published').length },
          { label: 'Open Actions', value: openActions, highlight: openActions > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface rounded-xl p-4 border border-border">
            <p className={`text-xl font-bold ${kpi.highlight ? 'text-orange-400' : 'text-text-primary'}`}>{kpi.value}</p>
            <p className="text-xs text-text-muted">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search postmortems…"
        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
      />

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>No postmortems found.</p>
          </div>
        )}
        {filtered.map((pm) => {
          const sev = SEVERITY_CONFIG[pm.severity];
          const openAct = pm.actionItems.filter((a) => a.status === 'open').length;
          return (
            <div
              key={pm.id}
              onClick={() => navigate(`/postmortems/${pm.id}`)}
              className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 cursor-pointer transition-colors group flex items-start gap-2"
            >
              <FileText size={20} className="text-text-muted mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-text-muted">{pm.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pm.status === 'published' ? 'bg-green-400/10 text-green-400' : pm.status === 'review' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-gray-400/10 text-gray-400'}`}>
                    {pm.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${sev.bg} ${sev.color}`}>
                    {pm.severity.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-text-primary font-medium mt-1 group-hover:text-primary transition-colors truncate">
                  {pm.incidentTitle}
                </h3>
                <p className="text-sm text-text-muted mt-0.5 line-clamp-1">{pm.summary}</p>
                <div className="flex gap-4 mt-2 text-xs text-text-muted">
                  <span>Duration: {pm.durationMinutes}m</span>
                  <span>Author: {pm.author}</span>
                  {openAct > 0 && (
                    <span className="text-orange-400 flex items-center gap-1">
                      <AlertTriangle size={11} /> {openAct} open action{openAct !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors shrink-0 mt-1" />
            </div>
          );
        })}
      </div>
    </div>
  );
}


