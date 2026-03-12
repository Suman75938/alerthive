import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { Ticket, TicketStatus, AlertPriority } from '../types';
import { Plus, Search, Filter, AlertTriangle, Clock, CheckCircle, Pause, XCircle } from 'lucide-react';
import { slaTimeLeft } from '../data/slaData';
import { Tooltip } from '../components/Tooltip';

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
  critical: 'text-critical', high: 'text-high', medium: 'text-medium',
  low: 'text-low', info: 'text-info',
};
const STATUS_ICONS: Record<TicketStatus, React.ElementType> = {
  open: AlertTriangle, in_progress: Clock, resolved: CheckCircle, closed: CheckCircle, on_hold: Pause,
};

function TicketRow({ ticket }: { ticket: Ticket }) {
  const sla = slaTimeLeft(ticket.slaDueAt);
  const Icon = STATUS_ICONS[ticket.status];
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="flex items-center gap-4 px-5 py-4 hover:bg-surface-light/60 transition-colors border-b border-border-light/50 last:border-0"
    >
      <span className={`text-xs font-bold w-6 ${PRIORITY_COLORS[ticket.priority]}`}>
        {ticket.priority[0].toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-mono">{ticket.id}</span>
          {ticket.slaBreached && (
            <span className="text-xs text-critical bg-critical/10 border border-critical/30 px-1.5 py-0.5 rounded-full">SLA Breached</span>
          )}
        </div>
        <p className="text-sm font-medium text-text-primary truncate mt-0.5">{ticket.title}</p>
        <p className="text-xs text-text-muted mt-0.5">
          By {ticket.raisedByName}
          {ticket.assignedToName && ` · Assigned to ${ticket.assignedToName}`}
        </p>
      </div>
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 ${STATUS_COLORS[ticket.status]}`}>
          <Icon className="w-3 h-3" />{STATUS_LABELS[ticket.status]}
        </span>
        {!['resolved', 'closed'].includes(ticket.status) && (
          <span className={`text-xs ${sla.breached ? 'text-critical' : sla.urgent ? 'text-medium' : 'text-text-muted'}`}>
            {sla.label}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Tickets() {
  const { tickets } = useTickets();
  const { user, isEndUser } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');

  const visible = tickets
    .filter((t) => (isEndUser ? t.raisedBy === user?.id : true))
    .filter((t) => statusFilter === 'all' || t.status === statusFilter)
    .filter((t) =>
      search === '' ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{isEndUser ? 'My Tickets' : 'Tickets'}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {isEndUser ? 'Track your submitted requests' : 'Manage and resolve support tickets'}
          </p>
        </div>
        {isEndUser && (
          <Tooltip text="Submit a new support ticket" side="bottom">
            <button
              onClick={() => navigate('/tickets/new')}
              className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Raise Ticket
            </button>
          </Tooltip>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border-light rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
            className="bg-surface border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">All Status</option>
            {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-surface rounded-xl border border-border-light overflow-hidden">
        {visible.length === 0 ? (
          <div className="py-16 text-center text-text-muted">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tickets found.</p>
            {isEndUser && (
              <button
                onClick={() => navigate('/tickets/new')}
                className="mt-3 text-accent text-sm hover:underline"
              >
                Raise your first ticket
              </button>
            )}
          </div>
        ) : (
          visible.map((t) => <TicketRow key={t.id} ticket={t} />)
        )}
      </div>

      <p className="text-xs text-text-muted">{visible.length} ticket{visible.length !== 1 ? 's' : ''}</p>
    </div>
  );
}


