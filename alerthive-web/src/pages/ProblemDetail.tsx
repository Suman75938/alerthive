import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bug, AlertTriangle, BookOpen, Link2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useState } from 'react';
import { mockProblems, mockIncidents } from '../data/mockData';
import { ProblemStatus, AlertPriority } from '../types';

const STATUS_CONFIG: Record<ProblemStatus, { label: string; color: string; bg: string }> = {
  detected:     { label: 'Detected',     color: 'text-yellow-400',  bg: 'bg-yellow-400/10' },
  investigating:{ label: 'Investigating',color: 'text-orange-400',  bg: 'bg-orange-400/10' },
  known_error:  { label: 'Known Error',  color: 'text-red-400',     bg: 'bg-red-400/10' },
  resolved:     { label: 'Resolved',     color: 'text-green-400',   bg: 'bg-green-400/10' },
  closed:       { label: 'Closed',       color: 'text-gray-400',    bg: 'bg-gray-400/10' },
};

const PRIORITY_DOT: Record<AlertPriority, string> = {
  critical: 'bg-red-400', high: 'bg-orange-400', medium: 'bg-yellow-400',
  low: 'bg-blue-400', info: 'bg-gray-400',
};

const TABS = ['overview', '5 whys', 'known error', 'linked incidents'] as const;
type Tab = typeof TABS[number];

export default function ProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  const problem = mockProblems.find((p) => p.id === id);
  if (!problem) {
    return (
      <div className="p-6 text-center text-text-muted">
        <Bug size={40} className="mx-auto mb-3 opacity-30" />
        <p>Problem not found.</p>
        <button onClick={() => navigate('/problems')} className="mt-3 text-primary text-sm hover:underline">
          â† Back to Problems
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[problem.status];
  const linkedIncidents = mockIncidents.filter((i) => problem.linkedIncidentIds.includes(i.id));

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => navigate('/problems')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={15} /> Back to Problems
      </button>

      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-3">
        <div className="flex items-start gap-2">
          <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[problem.priority]}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono text-text-muted">{problem.id}</span>
              {problem.knownError && (
                <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded font-medium">Known Error</span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                {status.label}
              </span>
              <span className="px-2 py-0.5 bg-surface-light text-text-secondary text-xs rounded capitalize">
                {problem.priority}
              </span>
            </div>
            <h1 className="text-xl font-bold text-text-primary">{problem.title}</h1>
            <div className="flex gap-4 text-xs text-text-muted mt-2">
              {problem.assignee && <span>Assignee: <span className="text-text-primary">{problem.assignee}</span></span>}
              <span>Created: {new Date(problem.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(problem.updatedAt).toLocaleDateString()}</span>
              {problem.resolvedAt && <span>Resolved: {new Date(problem.resolvedAt).toLocaleDateString()}</span>}
            </div>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {problem.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 bg-surface-light text-text-muted text-xs rounded">{t}</span>
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
              tab === t
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-3">
              <h3 className="text-sm font-semibold text-text-secondary mb-2 uppercase tracking-wide">Description</h3>
              <p className="text-text-primary text-sm leading-relaxed">{problem.description}</p>
            </div>
            {problem.rootCause && (
              <div className="bg-surface border border-border rounded-xl p-3">
                <h3 className="text-sm font-semibold text-orange-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle size={15} /> Root Cause
                </h3>
                <p className="text-text-primary text-sm leading-relaxed">{problem.rootCause}</p>
              </div>
            )}
            {problem.workaround && (
              <div className="bg-surface border border-border rounded-xl p-3">
                <h3 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                  <BookOpen size={15} /> Workaround
                </h3>
                <p className="text-text-primary text-sm leading-relaxed">{problem.workaround}</p>
              </div>
            )}
          </div>
        )}

        {tab === '5 whys' && (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">
              The 5 Whys technique iteratively asks "why?" to drill down to the root cause.
            </p>
            {problem.fiveWhys.length === 0 && (
              <div className="text-center py-10 text-text-muted">
                <Clock size={30} className="mx-auto mb-2 opacity-30" />
                <p>5 Whys analysis not yet started.</p>
              </div>
            )}
            {problem.fiveWhys.map((entry, i) => (
              <div key={entry.why} className="bg-surface border border-border rounded-xl p-4 flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {entry.why}
                </div>
                <div className="flex-1">
                  <p className="text-text-secondary text-sm font-medium mb-1">{entry.question}</p>
                  <p className="text-text-primary text-sm">{entry.answer}</p>
                </div>
                {i < problem.fiveWhys.length - 1 && (
                  <div className="absolute left-10 mt-10 w-px h-3 bg-border" />
                )}
              </div>
            ))}
            {problem.fiveWhys.length < 5 && (
              <p className="text-xs text-text-muted pl-2">
                {5 - problem.fiveWhys.length} more why{5 - problem.fiveWhys.length !== 1 ? 's' : ''} to goâ€¦
              </p>
            )}
          </div>
        )}

        {tab === 'known error' && (
          <div className="space-y-4">
            {!problem.knownError ? (
              <div className="text-center py-10 text-text-muted">
                <BookOpen size={30} className="mx-auto mb-2 opacity-30" />
                <p>This problem has not been flagged as a Known Error yet.</p>
                <button className="mt-3 text-primary text-sm hover:underline">
                  + Flag as Known Error
                </button>
              </div>
            ) : (
              <>
                <div className="bg-red-900/10 border border-red-900/40 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={16} className="text-red-400" />
                    <h3 className="text-red-400 font-semibold text-sm uppercase tracking-wide">Known Error Database (KEDB) Entry</h3>
                  </div>
                  <p className="text-text-primary text-sm leading-relaxed">
                    {problem.knownErrorDescription ?? 'No description provided.'}
                  </p>
                </div>
                {problem.workaround && (
                  <div className="bg-surface border border-border rounded-xl p-3">
                    <h3 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wide">Approved Workaround</h3>
                    <p className="text-text-primary text-sm leading-relaxed">{problem.workaround}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'linked incidents' && (
          <div className="space-y-3">
            {linkedIncidents.length === 0 && (
              <div className="text-center py-10 text-text-muted">
                <Link2 size={30} className="mx-auto mb-2 opacity-30" />
                <p>No incidents linked yet.</p>
              </div>
            )}
            {linkedIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.id}`)}
                className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 cursor-pointer transition-colors flex items-center gap-3"
              >
                {inc.status === 'resolved' || inc.status === 'monitoring' ? (
                  <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                ) : (
                  <Circle size={16} className="text-orange-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-muted">{inc.id}</span>
                    <span className="text-xs text-text-secondary capitalize">{inc.status}</span>
                  </div>
                  <p className="text-text-primary text-sm font-medium truncate">{inc.title}</p>
                </div>
                <span className={`text-xs font-medium capitalize ${PRIORITY_DOT[inc.priority].replace('bg-', 'text-')}`}>
                  {inc.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


