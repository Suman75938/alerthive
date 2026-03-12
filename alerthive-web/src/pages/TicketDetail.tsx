import { useState, FormEvent, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { TicketStatus, AlertPriority, IssueCategory, Ticket } from '../types';
import { ArrowLeft, Clock, User, MessageSquare, AlertTriangle, CheckCircle, Pause, Send, Link2, Pencil, Save, X } from 'lucide-react';
import { slaTimeLeft } from '../data/slaData';

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed', on_hold: 'On Hold',
};
const STATUS_COLORS: Record<TicketStatus, string> = {
  open:        'text-info border-info/30 bg-info/10',
  in_progress: 'text-medium border-medium/30 bg-medium/10',
  resolved:    'text-low border-low/30 bg-low/10',
  closed:      'text-text-muted border-text-muted/20 bg-text-muted/10',
  on_hold:     'text-text-secondary border-text-secondary/20 bg-text-secondary/10',
};
const PRIORITY_COLORS: Record<AlertPriority, string> = {
  critical: 'text-critical border-critical/30 bg-critical/10',
  high:     'text-high border-high/30 bg-high/10',
  medium:   'text-medium border-medium/30 bg-medium/10',
  low:      'text-low border-low/30 bg-low/10',
  info:     'text-info border-info/30 bg-info/10',
};
const CATEGORY_LABELS: Record<IssueCategory, string> = {
  system_issue:      'System Issue',
  application_issue: 'Application Issue',
  others:            'Others',
};
const CATEGORY_COLORS: Record<IssueCategory, string> = {
  system_issue:      'text-medium border-medium/30 bg-medium/10',
  application_issue: 'text-info border-info/30 bg-info/10',
  others:            'text-text-muted border-text-muted/20 bg-text-muted/10',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tickets, updateStatus, assignTicket, addComment, updateTicket } = useTickets();
  const { user, isDeveloper, isAdmin } = useAuth();
  const [comment, setComment] = useState('');

  const ticket = tickets.find((t) => t.id === id);

  // Root Cause & Resolution edit state
  const [editingRCR, setEditingRCR] = useState(false);
  const [rootCauseInput, setRootCauseInput] = useState('');
  const [resolutionInput, setResolutionInput] = useState('');

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-text-muted">
        <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
        <p>Ticket not found.</p>
        <button onClick={() => navigate('/tickets')} className="mt-3 text-accent text-sm hover:underline">
          Back to tickets
        </button>
      </div>
    );
  }

  const sla = slaTimeLeft(ticket.slaDueAt);
  const canManage = isAdmin || isDeveloper;

  function startEditRCR() {
    setRootCauseInput(ticket!.rootCause ?? '');
    setResolutionInput(ticket!.resolution ?? '');
    setEditingRCR(true);
  }
  function saveRCR() {
    updateTicket(ticket!.id, { rootCause: rootCauseInput.trim() || undefined, resolution: resolutionInput.trim() || undefined });
    setEditingRCR(false);
  }
  function cancelEditRCR() {
    setEditingRCR(false);
  }

  const stopWords = new Set(['the','a','an','is','are','was','on','in','for','of','and','or','to','with','at','by','from']);
  const titleWords = useMemo(() => new Set(
    ticket.title.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))
  ), [ticket.title]);

  const similarTickets = useMemo((): (Ticket & { score: number })[] => {
    return tickets
      .filter(t => t.id !== ticket.id && (t.status === 'resolved' || t.status === 'closed'))
      .map(t => {
        const tagOverlap = t.tags.filter(tag => ticket.tags.includes(tag)).length;
        const tWords = t.title.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
        const titleOverlap = tWords.filter(w => titleWords.has(w)).length;
        return { ...t, score: tagOverlap * 2 + titleOverlap };
      })
      .filter(t => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [tickets, ticket.id, ticket.tags, titleWords]);

  function handleStatusChange(s: TicketStatus) { updateStatus(ticket!.id, s); }
  function handleSelfAssign() { if (user) assignTicket(ticket!.id, user.id, user.name); }
  function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!user || !comment.trim()) return;
    addComment(ticket!.id, { text: comment.trim(), authorId: user.id, authorName: user.name });
    setComment('');
  }

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      {/* Back */}
      <button onClick={() => navigate('/tickets')} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to tickets
      </button>

      {/* Header card */}
      <div className="bg-surface rounded-xl border border-border-light p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono text-text-muted">{ticket.id}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_COLORS[ticket.priority]}`}>
                {ticket.priority}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[ticket.status]}`}>
                {STATUS_LABELS[ticket.status]}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[ticket.issueCategory]}`}>
                {CATEGORY_LABELS[ticket.issueCategory]}
              </span>
              {ticket.slaBreached && (
                <span className="text-xs text-critical bg-critical/10 border border-critical/30 px-2 py-0.5 rounded-full font-semibold">
                  SLA Breached
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-text-primary">{ticket.title}</h1>
          </div>

          {/* SLA Timer */}
          {!['resolved', 'closed'].includes(ticket.status) && (
            <div className={`text-right shrink-0 px-3 py-2 rounded-lg border ${
              sla.breached ? 'border-critical/40 bg-critical/10' :
              sla.urgent   ? 'border-medium/40 bg-medium/10' :
                             'border-border-light bg-surface-light'
            }`}>
              <div className="text-xs text-text-muted mb-0.5">SLA</div>
              <div className={`text-sm font-bold ${sla.breached ? 'text-critical' : sla.urgent ? 'text-medium' : 'text-text-primary'}`}>
                {sla.label}
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{ticket.description}</p>

        {/* Tags */}
        {ticket.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-4">
            {ticket.tags.map((tag) => (
              <span key={tag} className="text-xs bg-surface-light border border-border-light text-text-secondary px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-text-muted" />
            <div>
              <div className="text-xs text-text-muted">Raised by</div>
              <div className="text-text-primary">{ticket.raisedByName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-text-muted" />
            <div>
              <div className="text-xs text-text-muted">Assigned to</div>
              <div className="text-text-primary">{ticket.assignedToName ?? '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-muted" />
            <div>
              <div className="text-xs text-text-muted">Created</div>
              <div className="text-text-primary">{timeAgo(ticket.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions (developer / admin only) */}
      {canManage && (
        <div className="bg-surface rounded-xl border border-border-light p-3">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {!ticket.assignedTo && (
              <button
                onClick={handleSelfAssign}
                className="px-3 py-1.5 text-sm bg-surface-light border border-border-light text-text-primary rounded-lg hover:border-accent transition-colors"
              >
                Assign to me
              </button>
            )}
            {(['open', 'in_progress', 'on_hold', 'resolved', 'closed'] as TicketStatus[])
              .filter((s) => s !== ticket.status)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${STATUS_COLORS[s]}`}
                >
                  Mark {STATUS_LABELS[s]}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Root Cause & Resolution */}
      {canManage && (
        <div className="bg-surface rounded-xl border border-border-light p-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Root Cause &amp; Resolution</h2>
            {!editingRCR ? (
              <button
                onClick={startEditRCR}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={saveRCR} className="flex items-center gap-1 text-xs text-low hover:text-text-primary transition-colors">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button onClick={cancelEditRCR} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            )}
          </div>

          {editingRCR ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Root Cause</label>
                <textarea
                  rows={3}
                  value={rootCauseInput}
                  onChange={(e) => setRootCauseInput(e.target.value)}
                  placeholder="What was the underlying cause?"
                  className="w-full bg-surface-light border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Resolution</label>
                <textarea
                  rows={3}
                  value={resolutionInput}
                  onChange={(e) => setResolutionInput(e.target.value)}
                  placeholder="How was the issue resolved?"
                  className="w-full bg-surface-light border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
                />
              </div>
            </div>
          ) : (ticket.rootCause || ticket.resolution) ? (
            <div className="space-y-4">
              {ticket.rootCause && (
                <div>
                  <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Root Cause</div>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{ticket.rootCause}</p>
                </div>
              )}
              {ticket.resolution && (
                <div>
                  <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Resolution</div>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{ticket.resolution}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted italic">No root cause or resolution recorded yet.</p>
          )}
        </div>
      )}

      {/* Similar Resolved Tickets */}
      {similarTickets.length > 0 && (
        <div className="bg-surface rounded-xl border border-border-light overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
            <Link2 className="w-4 h-4 text-text-secondary" />
            <h2 className="text-sm font-semibold text-text-primary">Similar Resolved Tickets</h2>
            <span className="ml-auto text-xs text-text-muted bg-surface-light px-2 py-0.5 rounded-full">{similarTickets.length} found</span>
          </div>
          <div className="divide-y divide-border-light/50">
            {similarTickets.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="w-full px-5 py-3 flex items-start gap-3 hover:bg-surface-light/50 transition-colors text-left"
              >
                <CheckCircle className="w-4 h-4 text-low shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-text-muted font-mono">{t.id}</span>
                    <span className={`text-xs font-semibold capitalize px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                    {t.tags.filter(tag => ticket.tags.includes(tag)).map(tag => (
                      <span key={tag} className="text-xs bg-info/10 text-info border border-info/20 px-1.5 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-text-muted shrink-0">{t.resolvedAt ? timeAgo(t.resolvedAt) : '—'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-surface rounded-xl border border-border-light overflow-hidden">
        <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">
            Comments {ticket.comments.length > 0 && <span className="text-text-muted">({ticket.comments.length})</span>}
          </h2>
        </div>

        {ticket.comments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-muted">No comments yet.</p>
        ) : (
          <div className="divide-y divide-border-light/50">
            {ticket.comments.map((c) => (
              <div key={c.id} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-text-primary">{c.authorName}</span>
                  <span className="text-xs text-text-muted">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{c.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add comment */}
        <form onSubmit={submitComment} className="px-5 py-4 border-t border-border-light flex gap-3">
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-surface-light border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
          />
          <button
            type="submit"
            disabled={!comment.trim()}
            className="self-end px-3 py-2 bg-accent hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}


