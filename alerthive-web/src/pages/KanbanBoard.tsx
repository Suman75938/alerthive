import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { Ticket, TicketStatus, AlertPriority, TicketType } from '../types';
import { slaTimeLeft } from '../data/slaData';
import {
  Plus, List, Search, Clock, GripVertical, X,
  Bug, Zap, CheckSquare, Flame, TrendingUp, Filter, LayoutGrid,
  ChevronUp, ChevronDown, CalendarDays,
} from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import SprintPlannerContent from './SprintPlanner';

// --- Column config
const COLUMNS: {
  status: TicketStatus;
  label: string;
  accent: string;
  headerBg: string;
  dropBg: string;
}[] = [
  { status: 'open',        label: 'Open',        accent: '#5B8DEF', headerBg: 'bg-info/10',         dropBg: 'bg-info/5 border-info/40' },
  { status: 'in_progress', label: 'In Progress',  accent: '#FFA502', headerBg: 'bg-medium/10',       dropBg: 'bg-medium/5 border-medium/40' },
  { status: 'on_hold',     label: 'On Hold',      accent: '#A0A0B8', headerBg: 'bg-surface-light',   dropBg: 'bg-surface-light border-text-muted/30' },
  { status: 'resolved',    label: 'Resolved',     accent: '#2ED573', headerBg: 'bg-low/10',          dropBg: 'bg-low/5 border-low/40' },
  { status: 'closed',      label: 'Closed',       accent: '#555570', headerBg: 'bg-surface-light',   dropBg: 'bg-surface-light border-text-muted/30' },
];

const TEAMS = ['All Teams', 'Platform', 'Security', 'Infrastructure', 'Frontend', 'Backend'];
const ITERATIONS = ['All Sprints', 'Sprint 12', 'Sprint 13', 'Sprint 14', 'Backlog'];
const PRIORITIES: (AlertPriority | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'info'];
const TYPES: (TicketType | 'all')[] = ['all', 'bug', 'feature', 'task', 'incident', 'improvement'];

const PRIORITY_STRIP: Record<AlertPriority, string> = {
  critical: 'bg-critical', high: 'bg-high', medium: 'bg-medium', low: 'bg-low', info: 'bg-info',
};
const PRIORITY_TEXT: Record<AlertPriority, string> = {
  critical: 'text-critical', high: 'text-high', medium: 'text-medium', low: 'text-low', info: 'text-info',
};
const PRIORITY_LABEL: Record<AlertPriority, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info',
};
const TYPE_ICON: Record<TicketType, React.ElementType> = {
  bug: Bug, feature: Zap, task: CheckSquare, incident: Flame, improvement: TrendingUp,
};
const TYPE_COLOR: Record<TicketType, string> = {
  bug: 'text-critical', feature: 'text-info', task: 'text-medium', incident: 'text-high', improvement: 'text-low',
};

const AVATAR_COLORS = [
  'bg-primary/20 text-primary', 'bg-high/20 text-high', 'bg-info/20 text-info',
  'bg-low/20 text-low', 'bg-medium/20 text-medium',
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// --- Kanban Card
function KanbanCard({ ticket, onDragStart, onDragEnd, isDragging }: {
  ticket: Ticket;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const sla = slaTimeLeft(ticket.slaDueAt);
  const done = ticket.status === 'resolved' || ticket.status === 'closed';
  const TypeIcon = ticket.type ? TYPE_ICON[ticket.type] : null;

  return (
    <Link
      to={`/tickets/${ticket.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, ticket.id)}
      onDragEnd={onDragEnd}
      onClick={(e) => { if (isDragging) e.preventDefault(); }}
      className={`block bg-bg border border-border rounded-lg overflow-hidden transition-all cursor-grab active:cursor-grabbing select-none
        hover:border-primary/40 hover:shadow-md ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className={`h-[3px] ${PRIORITY_STRIP[ticket.priority]}`} />
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-mono text-text-muted truncate">{ticket.id}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {TypeIcon && ticket.type && (
              <TypeIcon size={11} className={TYPE_COLOR[ticket.type]} />
            )}
            <span className={`text-[10px] font-semibold ${PRIORITY_TEXT[ticket.priority]}`}>
              {PRIORITY_LABEL[ticket.priority]}
            </span>
          </div>
        </div>
        <p className="text-xs font-medium text-text-primary leading-snug line-clamp-2">{ticket.title}</p>
        {(ticket.team || ticket.storyPoints !== undefined) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {ticket.team && (
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                {ticket.team}
              </span>
            )}
            {ticket.storyPoints !== undefined && (
              <span className="text-[9px] bg-surface-light text-text-secondary px-1.5 py-0.5 rounded-full font-bold border border-border">
                {ticket.storyPoints} pts
              </span>
            )}
          </div>
        )}
        {ticket.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ticket.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[9px] bg-surface-light text-text-muted px-1.5 py-0.5 rounded-full">{tag}</span>
            ))}
            {ticket.tags.length > 2 && <span className="text-[9px] text-text-muted/60">+{ticket.tags.length - 2}</span>}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="flex items-center gap-1 text-[10px] text-text-muted min-w-0">
            {ticket.assignedToName ? (
              <>
                <span className={`w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center shrink-0 ${avatarColor(ticket.assignedToName)}`}>
                  {ticket.assignedToName[0].toUpperCase()}
                </span>
                <span className="truncate">{ticket.assignedToName.split(' ')[0]}</span>
              </>
            ) : (
              <span className="italic text-text-muted/50">Unassigned</span>
            )}
          </span>
          {!done ? (
            <span className={`text-[10px] font-medium shrink-0 flex items-center gap-0.5
              ${sla.breached ? 'text-critical' : sla.urgent ? 'text-medium' : 'text-text-muted'}`}>
              <Clock className="w-2.5 h-2.5" />{sla.label}
            </span>
          ) : ticket.slaBreached ? (
            <span className="text-[10px] text-critical shrink-0">SLA </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

// --- Kanban Column
function KanbanColumn({
  col, tickets, isDragTarget, draggingId,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}: {
  col: (typeof COLUMNS)[number];
  tickets: Ticket[];
  isDragTarget: boolean;
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, status: TicketStatus) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, status: TicketStatus) => void;
}) {
  const colSP = tickets.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  return (
    <div
      className={`flex flex-col rounded-xl border flex-1 min-w-[180px] transition-colors duration-150
        ${isDragTarget ? col.dropBg + ' border-2' : 'border-border bg-surface'}`}
      onDragOver={(e) => onDragOver(e, col.status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, col.status)}
    >
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b border-border ${col.headerBg}`}>
        <div className="flex items-center gap-2">
          <GripVertical size={12} className="text-text-muted/40" />
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.accent }} />
          <span className="text-xs font-semibold text-text-primary">{col.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {colSP > 0 && <span className="text-[10px] text-text-muted font-medium">{colSP}sp</span>}
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: col.accent + '22', color: col.accent }}
          >
            {tickets.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 310px)', minHeight: 80 }}>
        {tickets.length === 0 ? (
          <div className={`flex items-center justify-center h-20 rounded-lg border-2 border-dashed text-xs transition-colors
            ${isDragTarget ? 'border-primary/50 text-primary/60' : 'border-border/50 text-text-muted/50'}`}>
            {isDragTarget ? ' Drop here' : 'No tickets'}
          </div>
        ) : (
          tickets.map((t) => (
            <KanbanCard key={t.id} ticket={t} onDragStart={onDragStart} onDragEnd={onDragEnd} isDragging={draggingId === t.id} />
          ))
        )}
      </div>
    </div>
  );
}

// --- Filter Pill helper
function FilterPill<T extends string>({
  value, options, labels, onChange, minWidth = 'min-w-[110px]',
}: {
  value: T;
  options: T[];
  labels?: Partial<Record<string, string>>;
  onChange: (v: T) => void;
  minWidth?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`${minWidth} text-xs bg-surface border border-border text-text-secondary rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer`}
    >
      {options.map((o) => (
        <option key={o} value={o}>{labels?.[o] ?? o}</option>
      ))}
    </select>
  );
}

type SortField = 'id' | 'title' | 'priority' | 'status' | 'team' | 'storyPoints' | 'assignedToName';
const PRIORITY_ORDER: Record<AlertPriority, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const STATUS_ORDER: Record<TicketStatus, number> = { open: 0, in_progress: 1, on_hold: 2, resolved: 3, closed: 4 };

// --- KanbanBoard Page
export default function KanbanBoard() {
  const { tickets, updateStatus } = useTickets();
  const { user, isEndUser } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode]                   = useState<'kanban' | 'list' | 'sprint'>('kanban');
  const [search, setSearch]                       = useState('');
  const [teamFilter, setTeamFilter]               = useState('All Teams');
  const [iterFilter, setIterFilter]               = useState('All Sprints');
  const [priorityFilter, setPriorityFilter]       = useState<AlertPriority | 'all'>('all');
  const [typeFilter, setTypeFilter]               = useState<TicketType | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter]       = useState('All');
  const [showFilters, setShowFilters]             = useState(false);
  const [dragOver, setDragOver]                   = useState<TicketStatus | null>(null);
  const [draggingId, setDraggingId]               = useState<string | null>(null);
  const [sortField, setSortField]                 = useState<SortField>('id');
  const [sortDir, setSortDir]                     = useState<'asc' | 'desc'>('asc');
  const dragId = useRef<string | null>(null);

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  }

  const assignees = ['All', ...Array.from(
    new Set(tickets.map((t) => t.assignedToName).filter(Boolean) as string[])
  ).sort()];

  const visible = tickets
    .filter((t) => (isEndUser ? t.raisedBy === user?.id : true))
    .filter((t) => teamFilter     === 'All Teams'   || t.team      === teamFilter)
    .filter((t) => iterFilter     === 'All Sprints' || t.iteration === iterFilter)
    .filter((t) => priorityFilter === 'all'         || t.priority  === priorityFilter)
    .filter((t) => typeFilter     === 'all'         || t.type      === typeFilter)
    .filter((t) => assigneeFilter === 'All'         || t.assignedToName === assigneeFilter)
    .filter((t) =>
      search === '' ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      (t.assignedToName ?? '').toLowerCase().includes(search.toLowerCase())
    );

  const hasActiveFilter =
    teamFilter !== 'All Teams' || iterFilter !== 'All Sprints' ||
    priorityFilter !== 'all'   || typeFilter  !== 'all'        ||
    assigneeFilter !== 'All'   || search !== '';

  function clearFilters() {
    setSearch(''); setTeamFilter('All Teams'); setIterFilter('All Sprints');
    setPriorityFilter('all'); setTypeFilter('all'); setAssigneeFilter('All');
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    dragId.current = id; setDraggingId(id); e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragEnd() { setDraggingId(null); setDragOver(null); dragId.current = null; }
  function handleDragOver(e: React.DragEvent, status: TicketStatus) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(status);
  }
  function handleDragLeave() { setDragOver(null); }
  function handleDrop(e: React.DragEvent, status: TicketStatus) {
    e.preventDefault();
    if (dragId.current) {
      const t = tickets.find((t) => t.id === dragId.current);
      if (t && t.status !== status) {
        updateStatus(dragId.current, status, status === 'resolved' ? new Date().toISOString() : undefined);
      }
    }
    setDraggingId(null); setDragOver(null); dragId.current = null;
  }

  const totalOpen        = tickets.filter((t) => t.status === 'open').length;
  const totalInProgress  = tickets.filter((t) => t.status === 'in_progress').length;
  const totalSLABreached = tickets.filter((t) => t.slaBreached && !['resolved', 'closed'].includes(t.status)).length;
  const sprintVelocity   = tickets
    .filter((t) => (t.status === 'resolved' || t.status === 'closed') && t.storyPoints)
    .reduce((s, t) => s + (t.storyPoints ?? 0), 0);

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {viewMode === 'sprint' ? 'Sprint Planner' : 'Kanban Board'}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {viewMode === 'sprint'
              ? 'Configure sprints, track team capacity, burndown & post-sprint analytics'
              : 'Drag tickets across columns \u00b7 Filter by team, sprint, assignee & type'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isEndUser && (
            <button
              onClick={() => navigate('/tickets/new')}
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Raise Ticket
            </button>
          )}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <Tooltip text="Kanban view" side="bottom">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip text="List view" side="bottom">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-border ${
                  viewMode === 'list'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                <List className="w-4 h-4" /> List View
              </button>
            </Tooltip>
            <Tooltip text="Sprint Planner" side="bottom">
              <button
                onClick={() => setViewMode('sprint')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-border ${
                  viewMode === 'sprint'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                <CalendarDays className="w-4 h-4" /> Sprint
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      {viewMode !== 'sprint' && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open',         value: totalOpen,        color: 'text-info',     bg: 'bg-info/10' },
          { label: 'In Progress',  value: totalInProgress,  color: 'text-medium',   bg: 'bg-medium/10' },
          { label: 'SLA Breached', value: totalSLABreached, color: 'text-critical', bg: 'bg-critical/10' },
          { label: 'Velocity (SP)',value: sprintVelocity,   color: 'text-low',      bg: 'bg-low/10' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-border rounded-xl px-4 py-3`}>
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      )}

      {/* Filters bar */}
      {viewMode !== 'sprint' && (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets"
            className="pl-7 pr-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary/40 w-44"
          />
        </div>
        <FilterPill value={teamFilter} options={TEAMS as any} onChange={setTeamFilter} minWidth="min-w-[120px]" />
        <FilterPill value={iterFilter} options={ITERATIONS as any} onChange={setIterFilter} minWidth="min-w-[120px]" />
        <Tooltip text={showFilters ? 'Hide filters' : 'More filters'} side="bottom">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-colors
              ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface border-border text-text-secondary hover:text-text-primary'}`}
          >
            <Filter size={13} /> Filters
            {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
          </button>
        </Tooltip>
        {hasActiveFilter && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
            <X size={12} /> Clear
          </button>
        )}
      </div>
      )}

      {/* Advanced filters */}
      {viewMode !== 'sprint' && showFilters && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-surface border border-border rounded-xl">
          <span className="text-xs text-text-muted font-medium mr-1">Advanced:</span>
          <FilterPill
            value={priorityFilter}
            options={PRIORITIES}
            labels={{ all: 'All Priorities', critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' }}
            onChange={setPriorityFilter}
            minWidth="min-w-[130px]"
          />
          <FilterPill
            value={typeFilter}
            options={TYPES}
            labels={{ all: 'All Types', bug: 'Bug', feature: 'Feature', task: 'Task', incident: 'Incident', improvement: 'Improvement' }}
            onChange={setTypeFilter}
            minWidth="min-w-[130px]"
          />
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="min-w-[150px] text-xs bg-surface border border-border text-text-secondary rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
          >
            {assignees.map((a) => (
              <option key={a} value={a}>{a === 'All' ? 'All Assignees' : a}</option>
            ))}
          </select>
        </div>
      )}

      {/* Board — Sprint Planner */}
      {viewMode === 'sprint' && (
        <div className="-mx-4 -mb-4">
          <SprintPlannerContent />
        </div>
      )}

      {/* Board — Kanban */}
      {viewMode === 'kanban' && (
        <div className="flex-1 pb-4">
          <div className="flex gap-3 w-full h-full">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                col={col}
                tickets={visible.filter((t) => t.status === col.status)}
                isDragTarget={dragOver === col.status}
                draggingId={draggingId}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      )}

      {/* Board — List */}
      {viewMode === 'list' && (() => {
        const sorted = [...visible].sort((a, b) => {
          let cmp = 0;
          if (sortField === 'priority') cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          else if (sortField === 'status') cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          else if (sortField === 'storyPoints') cmp = (a.storyPoints ?? 0) - (b.storyPoints ?? 0);
          else cmp = String(a[sortField] ?? '').localeCompare(String(b[sortField] ?? ''));
          return sortDir === 'asc' ? cmp : -cmp;
        });

        function SortIcon({ field }: { field: SortField }) {
          if (sortField !== field) return <ChevronUp size={11} className="text-text-muted/40" />;
          return sortDir === 'asc'
            ? <ChevronUp size={11} className="text-primary" />
            : <ChevronDown size={11} className="text-primary" />;
        }

        function Th({ field, children, cls = '' }: { field: SortField; children: React.ReactNode; cls?: string }) {
          return (
            <th
              onClick={() => handleSort(field)}
              className={`px-3 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide cursor-pointer select-none hover:text-text-primary whitespace-nowrap ${cls}`}
            >
              <span className="inline-flex items-center gap-1">{children}<SortIcon field={field} /></span>
            </th>
          );
        }

        return (
          <div className="flex-1 overflow-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface sticky top-0 z-10 border-b border-border">
                <tr>
                  <Th field="id" cls="pl-4">ID</Th>
                  <Th field="title">Title</Th>
                  <Th field="priority">Priority</Th>
                  <Th field="status">Status</Th>
                  <Th field="team">Team</Th>
                  <Th field="storyPoints">SP</Th>
                  <Th field="assignedToName">Assignee</Th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-text-muted italic">No tickets match your filters</td></tr>
                ) : sorted.map((t) => {
                  const sla = slaTimeLeft(t.slaDueAt);
                  const done = t.status === 'resolved' || t.status === 'closed';
                  const col = COLUMNS.find((c) => c.status === t.status);
                  const TypeIcon = t.type ? TYPE_ICON[t.type] : null;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      className="hover:bg-surface-light cursor-pointer transition-colors"
                    >
                      <td className="pl-4 pr-3 py-2.5 font-mono text-text-muted whitespace-nowrap">{t.id}</td>
                      <td className="px-3 py-2.5 max-w-[260px]">
                        <div className="flex items-center gap-1.5">
                          {TypeIcon && t.type && <TypeIcon size={11} className={TYPE_COLOR[t.type]} />}
                          <span className="text-text-primary font-medium truncate">{t.title}</span>
                        </div>
                        {t.tags.length > 0 && (
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {t.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[9px] bg-surface-light text-text-muted px-1.5 py-0.5 rounded-full">{tag}</span>
                            ))}
                            {t.tags.length > 3 && <span className="text-[9px] text-text-muted/60">+{t.tags.length - 3}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`font-semibold ${PRIORITY_TEXT[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: (col?.accent ?? '#888') + '22', color: col?.accent ?? '#888' }}
                        >
                          {col?.label ?? t.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{t.team ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center text-text-secondary">{t.storyPoints ?? '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {t.assignedToName ? (
                          <span className="flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${avatarColor(t.assignedToName)}`}>
                              {t.assignedToName[0].toUpperCase()}
                            </span>
                            <span className="text-text-secondary">{t.assignedToName.split(' ')[0]}</span>
                          </span>
                        ) : <span className="italic text-text-muted/50">Unassigned</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {!done ? (
                          <span className={`flex items-center gap-0.5 font-medium ${
                            sla.breached ? 'text-critical' : sla.urgent ? 'text-medium' : 'text-text-muted'
                          }`}>
                            <Clock size={10} />{sla.label}
                          </span>
                        ) : t.slaBreached ? (
                          <span className="text-critical">Breached</span>
                        ) : (
                          <span className="text-low">Met</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}
