import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, ChevronRight, Search, Filter, AlertTriangle, BookOpen, CheckCircle2, Clock } from 'lucide-react';
import { mockProblems } from '../data/mockData';
import { Problem, ProblemStatus, AlertPriority } from '../types';
import { Tooltip } from '../components/Tooltip';

const STATUS_CONFIG: Record<ProblemStatus, { label: string; color: string; bg: string }> = {
  detected:     { label: 'Detected',     color: 'text-yellow-400',  bg: 'bg-yellow-400/10' },
  investigating:{ label: 'Investigating',color: 'text-orange-400',  bg: 'bg-orange-400/10' },
  known_error:  { label: 'Known Error',  color: 'text-red-400',     bg: 'bg-red-400/10' },
  resolved:     { label: 'Resolved',     color: 'text-green-400',   bg: 'bg-green-400/10' },
  closed:       { label: 'Closed',       color: 'text-gray-400',    bg: 'bg-gray-400/10' },
};

const PRIORITY_CONFIG: Record<AlertPriority, { color: string; dot: string }> = {
  critical: { color: 'text-red-400',    dot: 'bg-red-400' },
  high:     { color: 'text-orange-400', dot: 'bg-orange-400' },
  medium:   { color: 'text-yellow-400', dot: 'bg-yellow-400' },
  low:      { color: 'text-blue-400',   dot: 'bg-blue-400' },
  info:     { color: 'text-gray-400',   dot: 'bg-gray-400' },
};

export default function Problems() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProblemStatus | 'all'>('all');

  const filtered: Problem[] = mockProblems.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: mockProblems.length,
    detected: mockProblems.filter((p) => p.status === 'detected').length,
    investigating: mockProblems.filter((p) => p.status === 'investigating').length,
    known_error: mockProblems.filter((p) => p.status === 'known_error').length,
    resolved: mockProblems.filter((p) => p.status === 'resolved').length,
    closed: mockProblems.filter((p) => p.status === 'closed').length,
  };

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Bug size={24} className="text-primary" /> Problem Management
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Identify and eliminate the root causes of recurring incidents. ITIL-aligned.
          </p>
        </div>
        <Tooltip text="Register a new problem for root cause analysis" side="bottom">
          <button
            onClick={() => navigate('/problems/new')}
            className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Problem
          </button>
        </Tooltip>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Open', value: counts.detected + counts.investigating, icon: AlertTriangle, color: 'text-orange-400' },
          { label: 'Known Errors', value: counts.known_error, icon: BookOpen, color: 'text-red-400' },
          { label: 'Resolved', value: counts.resolved, icon: CheckCircle2, color: 'text-green-400' },
          { label: 'Avg Days Open', value: '4.2', icon: Clock, color: 'text-blue-400' },
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
            placeholder="Search problemsâ€¦"
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-text-muted" />
          {(['all', 'detected', 'investigating', 'known_error', 'resolved', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                statusFilter === s ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {s === 'all' ? `All (${counts.all})` : s === 'known_error' ? `Known Error (${counts[s]})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s as ProblemStatus]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Problem List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <Bug size={40} className="mx-auto mb-3 opacity-30" />
            <p>No problems match your filters.</p>
          </div>
        )}
        {filtered.map((problem) => {
          const status = STATUS_CONFIG[problem.status];
          const priority = PRIORITY_CONFIG[problem.priority];
          return (
            <div
              key={problem.id}
              onClick={() => navigate(`/problems/${problem.id}`)}
              className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-start gap-2">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${priority.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-text-muted">{problem.id}</span>
                    {problem.knownError && (
                      <span className="px-1.5 py-0.5 bg-red-900/30 text-red-400 text-xs rounded font-medium">Known Error</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="text-text-primary font-medium mt-1 group-hover:text-primary transition-colors">{problem.title}</h3>
                  <p className="text-sm text-text-muted mt-1 line-clamp-2">{problem.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                    <span className={`${priority.color} flex items-center gap-1`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{problem.priority.toUpperCase()}</span>
                    <span>{problem.linkedIncidentIds.length} linked incident{problem.linkedIncidentIds.length !== 1 ? 's' : ''}</span>
                    {problem.assignee && <span>Assignee: {problem.assignee}</span>}
                    <span>{problem.fiveWhys.length}/5 Whys completed</span>
                    <div className="flex gap-1 flex-wrap ml-auto">
                      {problem.tags.slice(0, 3).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-surface-light rounded text-text-muted">{t}</span>
                      ))}
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


