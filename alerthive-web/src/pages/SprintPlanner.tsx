import { useState, useMemo } from 'react';
import { useTickets } from '../context/TicketContext';
import { SprintConfig, SprintMember, BurndownPoint } from '../types';
import { mockSprints } from '../data/mockSprints';
import {
  Calendar, Users, TrendingDown, BarChart2,
  ChevronLeft, ChevronRight, Check, Edit2, Save, X,
  Zap, AlertTriangle, Clock, Target, Coffee, Activity,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────
function sprintDays(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  let days = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function daysElapsed(start: string) {
  const s = new Date(start);
  const now = new Date();
  let days = 0;
  const cur = new Date(s);
  while (cur < now) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: SprintConfig['status']) {
  const cfg = {
    planning:  { label: 'Planning',  cls: 'bg-info/10 text-info border-info/30' },
    active:    { label: 'Active',    cls: 'bg-low/10 text-low border-low/30' },
    completed: { label: 'Completed', cls: 'bg-surface-light text-text-muted border-border' },
  }[status];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>;
}

// ─── Burndown SVG Chart ──────────────────────────────────────────────────────
function BurndownChart({ data, target }: { data: BurndownPoint[]; target: number }) {
  const W = 600, H = 240, PAD = { top: 16, right: 16, bottom: 36, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = data.length;

  const xScale = (i: number) => PAD.left + (i / (n - 1)) * innerW;
  const yScale = (v: number) => PAD.top + (1 - v / target) * innerH;

  // ideal line path
  const idealPath = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.ideal).toFixed(1)}`).join(' ');

  // actual line — only up to non-null points
  const actualPoints = data.filter((p) => p.actual !== null);
  const actualPath = actualPoints.map((p, i) => {
    const realI = data.findIndex((d) => d.day === p.day);
    return `${i === 0 ? 'M' : 'L'}${xScale(realI).toFixed(1)},${yScale(p.actual!).toFixed(1)}`;
  }).join(' ');

  // area fill for actual (above ideal = behind schedule)
  const actualFill = actualPoints.length > 1
    ? `${actualPath} L${xScale(data.findIndex((d) => d.day === actualPoints[actualPoints.length - 1].day)).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${xScale(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`
    : '';

  // y-axis ticks
  const yTicks = [0, Math.round(target * 0.25), Math.round(target * 0.5), Math.round(target * 0.75), target];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
      {/* Grid lines */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)} stroke="currentColor" strokeWidth={0.5} className="text-border" />
          <text x={PAD.left - 6} y={yScale(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} className="fill-text-muted">{v}</text>
        </g>
      ))}
      {/* X axis labels */}
      {data.map((p, i) => (
        i % Math.max(1, Math.floor(n / 6)) === 0 && (
          <text key={p.day} x={xScale(i)} y={H - 6} textAnchor="middle" fontSize={9} className="fill-text-muted">{p.day}</text>
        )
      ))}
      {/* Actual fill */}
      {actualFill && <path d={actualFill} fill="#EF4444" fillOpacity={0.06} />}
      {/* Ideal line (dashed) */}
      <path d={idealPath} fill="none" stroke="#5B8DEF" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.6} />
      {/* Actual line */}
      {actualPath && <path d={actualPath} fill="none" stroke="#2ED573" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
      {/* Actual dots */}
      {actualPoints.map((p) => {
        const ri = data.findIndex((d) => d.day === p.day);
        const behind = p.actual! > p.ideal;
        return (
          <circle key={p.day} cx={xScale(ri)} cy={yScale(p.actual!)} r={3}
            fill={behind ? '#EF4444' : '#2ED573'} stroke="white" strokeWidth={1} />
        );
      })}
      {/* Legend */}
      <g transform={`translate(${PAD.left}, ${H - 8})`}>
        <line x1={0} y1={0} x2={16} y2={0} stroke="#5B8DEF" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.6} />
        <text x={20} fontSize={9} dominantBaseline="middle" className="fill-text-muted">Ideal</text>
        <line x1={55} y1={0} x2={71} y2={0} stroke="#2ED573" strokeWidth={2} />
        <circle cx={63} cy={0} r={3} fill="#2ED573" />
        <text x={75} fontSize={9} dominantBaseline="middle" className="fill-text-muted">Actual</text>
      </g>
    </svg>
  );
}

// ─── Capacity Bar ─────────────────────────────────────────────────────────────
function CapacityBar({ used, total, color = 'bg-primary' }: { used: number; total: number; color?: string }) {
  const pct = Math.min(100, total > 0 ? (used / total) * 100 : 0);
  const danger = pct > 90;
  const warn = pct > 70;
  const barColor = danger ? 'bg-critical' : warn ? 'bg-medium' : color;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 bg-surface-light rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-semibold shrink-0 ${danger ? 'text-critical' : warn ? 'text-medium' : 'text-text-muted'}`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Burnout risk chip ────────────────────────────────────────────────────────
function BurnoutChip({ score }: { score: number }) {
  if (score >= 85) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-critical/10 text-critical border border-critical/30">🔥 High Risk</span>;
  if (score >= 60) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-medium/10 text-medium border border-medium/30">⚠ Moderate</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-low/10 text-low border border-low/30">✓ Healthy</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = 'config' | 'capacity' | 'burndown' | 'analytics';

export default function SprintPlanner() {
  const { tickets } = useTickets();
  const [sprints, setSprints] = useState<SprintConfig[]>(mockSprints);
  const [selectedId, setSelectedId] = useState(mockSprints[1].id); // default: active sprint
  const [tab, setTab] = useState<Tab>('config');

  const sprint = sprints.find((s) => s.id === selectedId)!;
  const sprintIdx = sprints.findIndex((s) => s.id === selectedId);

  // ── Edit state for sprint config ──
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SprintConfig>(sprint);

  function selectSprint(id: string) {
    const s = sprints.find((x) => x.id === id)!;
    setSelectedId(id);
    setDraft(s);
    setEditing(false);
  }

  function saveDraft() {
    setSprints((prev) => prev.map((s) => (s.id === draft.id ? draft : s)));
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(sprint);
    setEditing(false);
  }

  // ── Derived metrics ──
  const sprintTickets = useMemo(
    () => tickets.filter((t) => t.iteration === sprint.name),
    [tickets, sprint.name]
  );

  const totalDays = sprintDays(sprint.startDate, sprint.endDate);
  const elapsed   = sprint.status === 'active' ? daysElapsed(sprint.startDate) : (sprint.status === 'completed' ? totalDays : 0);
  const progress  = totalDays > 0 ? Math.min(100, (elapsed / totalDays) * 100) : 0;

  const totalCapacityHours = sprint.members.reduce(
    (s, m) => s + (m.hoursPerDay * (totalDays - m.daysOff)), 0
  );
  const totalCapacitySP = sprint.members.reduce(
    (s, m) => s + (m.spCapacityPerDay * (totalDays - m.daysOff)), 0
  );

  // Burnout: ratio of assigned SP to capacity SP per member
  const memberBurnout = sprint.members.map((m) => {
    const assignedSP = sprintTickets
      .filter((t) => t.assignedToName === m.name)
      .reduce((s, t) => s + (t.storyPoints ?? 0), 0);
    const capSP = m.spCapacityPerDay * (totalDays - m.daysOff);
    const score = capSP > 0 ? Math.round((assignedSP / capSP) * 100) : 0;
    return { ...m, assignedSP, capSP: Math.round(capSP), score };
  });

  // Post-sprint analytics
  const completedSP = sprint.completedSP ??
    sprintTickets.filter((t) => t.status === 'resolved' || t.status === 'closed')
      .reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const committedSP = sprint.committedSP ?? sprint.velocityTarget;
  const commitAccuracy = committedSP > 0 ? Math.round((completedSP / committedSP) * 100) : 0;

  const lastChart = sprint.burndown[sprint.burndown.length - 1];
  const remainingActual = (sprint.status === 'completed' && lastChart.actual != null)
    ? lastChart.actual
    : sprint.burndown.filter((p) => p.actual !== null).slice(-1)[0]?.actual ?? committedSP;
  const carryOver = Math.max(0, remainingActual);

  // Average daily burn
  const actualPts = sprint.burndown.filter((p) => p.actual !== null);
  const dailyBurn = actualPts.length > 1
    ? ((actualPts[0].actual! - actualPts[actualPts.length - 1].actual!) / (actualPts.length - 1)).toFixed(1)
    : '—';

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: 'config',    icon: Calendar,     label: 'Sprint Config' },
    { id: 'capacity',  icon: Users,        label: 'Team Capacity' },
    { id: 'burndown',  icon: TrendingDown, label: 'Burndown' },
    { id: 'analytics', icon: BarChart2,    label: 'Post-Sprint Analytics' },
  ];

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sprint Planner</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Configure sprints, track team capacity, burndown &amp; post-sprint productivity
          </p>
        </div>
        {/* Sprint selector */}
        <div className="flex items-center gap-2">
          <button
            disabled={sprintIdx === 0}
            onClick={() => selectSprint(sprints[sprintIdx - 1].id)}
            className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <select
            value={selectedId}
            onChange={(e) => selectSprint(e.target.value)}
            className="text-sm bg-surface border border-border text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer font-medium"
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            disabled={sprintIdx === sprints.length - 1}
            onClick={() => selectSprint(sprints[sprintIdx + 1].id)}
            className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
          {statusBadge(sprint.status)}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Sprint Days',    value: totalDays,                   unit: 'days',    color: 'text-info',     bg: 'bg-info/10',     icon: Calendar },
          { label: 'Team Capacity',  value: Math.round(totalCapacityHours), unit: 'hrs',  color: 'text-primary',  bg: 'bg-primary/10',  icon: Users },
          { label: 'Committed SP',   value: committedSP,                 unit: 'pts',     color: 'text-medium',   bg: 'bg-medium/10',   icon: Target },
          { label: 'Progress',       value: progress.toFixed(0),         unit: '%',       color: progress >= 80 ? 'text-low' : 'text-medium', bg: 'bg-low/10', icon: Activity },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} border border-border rounded-xl px-4 py-3 flex items-center gap-3`}>
            <k.icon size={20} className={`shrink-0 ${k.color}`} />
            <div>
              <p className="text-xs text-text-muted">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}<span className="text-xs font-normal ml-0.5 text-text-muted">{k.unit}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab strip ── */}
      <div className="flex gap-1 bg-surface-light border border-border rounded-xl p-1 w-fit">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
              ${tab === id ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Sprint Config
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: editable fields */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Sprint Details</h2>
              {!editing ? (
                <button
                  onClick={() => { setDraft(sprint); setEditing(true); }}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors"
                >
                  <Edit2 size={12} /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveDraft} className="flex items-center gap-1 text-xs text-low hover:text-low/80 transition-colors font-medium">
                    <Save size={12} /> Save
                  </button>
                  <button onClick={cancelEdit} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors">
                    <X size={12} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {[
              { label: 'Sprint Name', field: 'name' as const, type: 'text' },
              { label: 'Team',        field: 'team' as const, type: 'text' },
              { label: 'Start Date',  field: 'startDate' as const, type: 'date' },
              { label: 'End Date',    field: 'endDate' as const, type: 'date' },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="block text-xs text-text-muted mb-1">{label}</label>
                {editing ? (
                  <input
                    type={type}
                    value={draft[field] as string}
                    onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                    className="w-full text-sm bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                ) : (
                  <p className="text-sm font-medium text-text-primary">
                    {type === 'date' ? fmtDate(sprint[field] as string) : sprint[field]}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label className="block text-xs text-text-muted mb-1">Velocity Target (Story Points)</label>
              {editing ? (
                <input
                  type="number"
                  min={1}
                  value={draft.velocityTarget}
                  onChange={(e) => setDraft((d) => ({ ...d, velocityTarget: +e.target.value }))}
                  className="w-full text-sm bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              ) : (
                <p className="text-sm font-medium text-text-primary">{sprint.velocityTarget} pts</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Status</label>
              {editing ? (
                <select
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as SprintConfig['status'] }))}
                  className="w-full text-sm bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                >
                  {(['planning', 'active', 'completed'] as const).map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <div>{statusBadge(sprint.status)}</div>
              )}
            </div>
          </div>

          {/* Right: sprint progress */}
          <div className="space-y-4">
            {/* Timeline card */}
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-text-primary">Timeline</h2>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(sprint.startDate)}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="flex items-center gap-1">{fmtDate(sprint.endDate)} <Calendar size={11} /></span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Sprint Progress</span>
                  <span>{elapsed} / {totalDays} working days</span>
                </div>
                <div className="h-2.5 bg-surface-light rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progress >= 80 ? 'bg-low' : 'bg-primary'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className={`text-xs font-semibold ${progress >= 80 ? 'text-low' : 'text-primary'}`}>{progress.toFixed(0)}% elapsed</p>
              </div>
            </div>

            {/* Capacity summary */}
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-text-primary">Capacity Summary</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Working Days',  value: totalDays,                     sub: 'excl. weekends' },
                  { label: 'Team Size',     value: sprint.members.length,          sub: 'members' },
                  { label: 'Total Hours',   value: Math.round(totalCapacityHours), sub: 'net of leave' },
                  { label: 'SP Capacity',   value: Math.round(totalCapacitySP),    sub: 'story points' },
                ].map((m) => (
                  <div key={m.label} className="bg-surface-light rounded-lg px-3 py-2">
                    <p className="text-xs text-text-muted">{m.label}</p>
                    <p className="text-lg font-bold text-text-primary">{m.value}</p>
                    <p className="text-[10px] text-text-muted">{m.sub}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Committed vs Capacity</span>
                  <span>{committedSP} / {Math.round(totalCapacitySP)} SP</span>
                </div>
                <CapacityBar used={committedSP} total={Math.round(totalCapacitySP)} />
              </div>
            </div>

            {/* Tickets in this sprint */}
            <div className="bg-surface border border-border rounded-xl p-5 space-y-2">
              <h2 className="text-sm font-semibold text-text-primary">Tickets in {sprint.name}</h2>
              <div className="flex flex-wrap gap-2">
                {(['open','in_progress','on_hold','resolved','closed'] as const).map((st) => {
                  const cnt = sprintTickets.filter((t) => t.status === st).length;
                  return cnt > 0 ? (
                    <div key={st} className="text-xs bg-surface-light border border-border rounded-lg px-2.5 py-1.5">
                      <span className="capitalize text-text-muted">{st.replace('_', ' ')}</span>
                      <span className="ml-2 font-bold text-text-primary">{cnt}</span>
                    </div>
                  ) : null;
                })}
                {sprintTickets.length === 0 && <p className="text-xs text-text-muted italic">No tickets assigned to this sprint</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Team Capacity
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'capacity' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Member Working Hours &amp; Availability</h2>
              <span className="text-xs text-text-muted">{totalDays} working days in sprint</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    {['Member','Team','Hrs/Day','Days Off','Avail. Days','Total Hours','SP Capacity','Utilisation'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sprint.members.map((m, i) => {
                    const availDays  = totalDays - m.daysOff;
                    const totalHrs   = m.hoursPerDay * availDays;
                    const capSP      = Math.round(m.spCapacityPerDay * availDays);
                    const assignedSP = sprintTickets.filter((t) => t.assignedToName === m.name).reduce((s, t) => s + (t.storyPoints ?? 0), 0);
                    return (
                      <tr key={m.userId} className={`border-b border-border/60 hover:bg-surface-light/40 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-light/20'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center bg-primary/10 text-primary`}>
                              {m.name.split(' ').map((n) => n[0]).join('')}
                            </span>
                            <span className="font-medium text-text-primary">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{m.team}</td>
                        <td className="px-4 py-3">
                          <EditableNumber
                            value={m.hoursPerDay}
                            min={1} max={12}
                            onChange={(v) => setSprints((prev) => prev.map((s) =>
                              s.id !== sprint.id ? s : {
                                ...s, members: s.members.map((mb) =>
                                  mb.userId !== m.userId ? mb : { ...mb, hoursPerDay: v }
                                ),
                              }
                            ))}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <EditableNumber
                            value={m.daysOff}
                            min={0} max={totalDays}
                            onChange={(v) => setSprints((prev) => prev.map((s) =>
                              s.id !== sprint.id ? s : {
                                ...s, members: s.members.map((mb) =>
                                  mb.userId !== m.userId ? mb : { ...mb, daysOff: v }
                                ),
                              }
                            ))}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-text-primary">{availDays}d</td>
                        <td className="px-4 py-3 font-medium text-text-primary">{totalHrs}h</td>
                        <td className="px-4 py-3 font-medium text-text-primary">{capSP} pts</td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <CapacityBar used={assignedSP} total={capSP} />
                          <div className="text-[9px] text-text-muted mt-0.5">{assignedSP} / {capSP} SP assigned</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="bg-surface-light border-t border-border font-semibold">
                    <td className="px-4 py-2.5 text-text-primary" colSpan={4}>Total</td>
                    <td className="px-4 py-2.5 text-text-primary">
                      {Math.round(sprint.members.reduce((s, m) => s + (totalDays - m.daysOff), 0))}d
                    </td>
                    <td className="px-4 py-2.5 text-text-primary">{Math.round(totalCapacityHours)}h</td>
                    <td className="px-4 py-2.5 text-text-primary">{Math.round(totalCapacitySP)} pts</td>
                    <td className="px-4 py-2.5">
                      <CapacityBar used={committedSP} total={Math.round(totalCapacitySP)} color="bg-primary" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Leave / availability heat hint */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sprint.members.map((m) => {
              const availDays = totalDays - m.daysOff;
              const leaveRatio = m.daysOff / totalDays;
              return (
                <div key={m.userId} className="bg-surface border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {m.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">{m.name}</p>
                      <p className="text-[10px] text-text-muted">{m.team}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Coffee size={11} className="text-text-muted" />
                    <span className="text-text-muted">Days off:</span>
                    <span className={`font-bold ${leaveRatio > 0.3 ? 'text-medium' : 'text-text-primary'}`}>{m.daysOff}</span>
                    {leaveRatio > 0.3 && <span className="text-[9px] text-medium">(high)</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Clock size={11} className="text-text-muted" />
                    <span className="text-text-muted">Available:</span>
                    <span className="font-bold text-text-primary">{availDays}d · {m.hoursPerDay * availDays}h</span>
                  </div>
                  <CapacityBar used={availDays} total={totalDays} color="bg-info" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Burndown
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'burndown' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-text-primary">Burndown Chart — {sprint.name}</h2>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>Committed: <strong className="text-text-primary">{committedSP} SP</strong></span>
                <span>Avg daily burn: <strong className="text-text-primary">{dailyBurn} SP/day</strong></span>
              </div>
            </div>
            <BurndownChart data={sprint.burndown} target={committedSP} />
          </div>

          {/* Daily breakdown table */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary">Daily Progress</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    {['Day', 'Ideal Remaining', 'Actual Remaining', 'Δ vs Ideal', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sprint.burndown.map((p, i) => {
                    const delta = p.actual !== null ? p.actual - p.ideal : null;
                    return (
                      <tr key={p.day} className={`border-b border-border/60 hover:bg-surface-light/40 ${i % 2 === 0 ? '' : 'bg-surface-light/20'}`}>
                        <td className="px-4 py-2.5 font-medium text-text-primary">{p.day}</td>
                        <td className="px-4 py-2.5 text-info font-medium">{p.ideal} SP</td>
                        <td className="px-4 py-2.5">
                          {p.actual !== null
                            ? <span className="font-medium text-text-primary">{p.actual} SP</span>
                            : <span className="text-text-muted italic">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {delta !== null ? (
                            <span className={`font-semibold ${delta > 0 ? 'text-critical' : delta < 0 ? 'text-low' : 'text-text-muted'}`}>
                              {delta > 0 ? `+${delta}` : delta} SP
                            </span>
                          ) : <span className="text-text-muted">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {p.actual === null
                            ? <span className="text-text-muted text-[10px]">Pending</span>
                            : delta! > 3
                            ? <span className="text-[10px] text-critical font-medium">Behind ↑</span>
                            : delta! < -3
                            ? <span className="text-[10px] text-low font-medium">Ahead ↓</span>
                            : <span className="text-[10px] text-text-muted">On track</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Post-Sprint Analytics
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          {sprint.status === 'planning' && (
            <div className="flex items-center gap-2 p-3 bg-info/10 border border-info/30 rounded-xl text-xs text-info">
              <AlertTriangle size={13} />
              Sprint is still in planning — analytics will be available once the sprint is active or completed.
            </div>
          )}

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Committed SP', value: committedSP,       unit: 'pts', color: 'text-medium',   bg: 'bg-medium/10', icon: Target },
              { label: 'Completed SP', value: completedSP,        unit: 'pts', color: 'text-low',      bg: 'bg-low/10',   icon: Check },
              { label: 'Commit Accuracy', value: `${commitAccuracy}`, unit: '%', color: commitAccuracy >= 85 ? 'text-low' : commitAccuracy >= 60 ? 'text-medium' : 'text-critical', bg: commitAccuracy >= 85 ? 'bg-low/10' : 'bg-medium/10', icon: Zap },
              { label: 'Carry Over',   value: carryOver,          unit: 'SP',  color: carryOver > 0 ? 'text-critical' : 'text-low', bg: carryOver > 0 ? 'bg-critical/10' : 'bg-low/10', icon: AlertTriangle },
            ].map((k) => (
              <div key={k.label} className={`${k.bg} border border-border rounded-xl px-4 py-3 flex items-center gap-3`}>
                <k.icon size={20} className={`shrink-0 ${k.color}`} />
                <div>
                  <p className="text-xs text-text-muted">{k.label}</p>
                  <p className={`text-xl font-bold ${k.color}`}>{k.value}<span className="text-xs font-normal ml-0.5 text-text-muted">{k.unit}</span></p>
                </div>
              </div>
            ))}
          </div>

          {/* Burnout Risk per member */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Team Burnout Risk Analysis</h2>
              <span className="text-xs text-text-muted">Based on assigned SP vs capacity</span>
            </div>
            <div className="divide-y divide-border/60">
              {memberBurnout.map((m) => (
                <div key={m.userId} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-light/30 transition-colors flex-wrap">
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {m.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">{m.name}</p>
                      <p className="text-[10px] text-text-muted">{m.team}</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[160px] space-y-1">
                    <div className="flex justify-between text-[10px] text-text-muted">
                      <span>Workload</span>
                      <span>{m.assignedSP} / {m.capSP} SP</span>
                    </div>
                    <CapacityBar used={m.assignedSP} total={m.capSP} />
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <p className={`text-lg font-bold ${m.score >= 85 ? 'text-critical' : m.score >= 60 ? 'text-medium' : 'text-low'}`}>{m.score}%</p>
                      <p className="text-[9px] text-text-muted">workload ratio</p>
                    </div>
                    <BurnoutChip score={m.score} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison to previous sprint */}
          {sprintIdx > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-text-primary">vs Previous Sprint ({sprints[sprintIdx - 1].name})</h2>
              {(() => {
                const prev = sprints[sprintIdx - 1];
                const prevCompleted = prev.completedSP ?? 0;
                const prevCommitted = prev.committedSP ?? prev.velocityTarget;
                const velocityDelta = completedSP - prevCompleted;
                const accuracyDelta = prevCommitted > 0
                  ? commitAccuracy - Math.round((prevCompleted / prevCommitted) * 100)
                  : 0;
                const trend = velocityDelta >= 0 ? 'text-low' : 'text-critical';
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Velocity change',    value: velocityDelta >= 0 ? `+${velocityDelta}` : `${velocityDelta}`, sub: 'SP vs prev', color: trend },
                      { label: 'Accuracy change',    value: `${accuracyDelta >= 0 ? '+' : ''}${accuracyDelta}%`, sub: 'commit accuracy', color: accuracyDelta >= 0 ? 'text-low' : 'text-critical' },
                      { label: 'Carry-over trend',   value: carryOver > 4 ? '↑ More' : '↓ Less / Same', sub: `${carryOver} SP remaining`, color: carryOver > 4 ? 'text-critical' : 'text-low' },
                    ].map((c) => (
                      <div key={c.label} className="bg-surface-light rounded-lg px-3 py-3">
                        <p className="text-xs text-text-muted">{c.label}</p>
                        <p className={`text-base font-bold ${c.color}`}>{c.value}</p>
                        <p className="text-[10px] text-text-muted">{c.sub}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Ticket category breakdown */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Ticket Breakdown — {sprint.name}</h2>
            {(['bug','feature','task','incident','improvement'] as const).map((type) => {
              const cnt = sprintTickets.filter((t) => t.type === type).length;
              const sp  = sprintTickets.filter((t) => t.type === type).reduce((s, t) => s + (t.storyPoints ?? 0), 0);
              if (cnt === 0) return null;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-20 capitalize">{type}</span>
                  <div className="flex-1 h-2 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        type === 'bug' ? 'bg-critical' : type === 'incident' ? 'bg-high' :
                        type === 'feature' ? 'bg-info' : type === 'task' ? 'bg-medium' : 'bg-low'
                      }`}
                      style={{ width: `${sprintTickets.length > 0 ? (cnt / sprintTickets.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-text-primary w-10 text-right">{cnt}</span>
                  <span className="text-xs text-text-muted w-14 text-right">{sp} pts</span>
                </div>
              );
            })}
            {sprintTickets.length === 0 && <p className="text-xs text-text-muted italic">No tickets in this sprint</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline editable number cell ──────────────────────────────────────────────
function EditableNumber({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  if (!editing) {
    return (
      <button
        onClick={() => { setLocal(value); setEditing(true); }}
        className="flex items-center gap-1 text-text-primary font-medium hover:text-primary transition-colors"
      >
        {value} <Edit2 size={10} className="text-text-muted" />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={min}
        max={max}
        value={local}
        autoFocus
        onChange={(e) => setLocal(+e.target.value)}
        className="w-12 text-xs bg-bg border border-primary/50 rounded px-1.5 py-1 text-text-primary focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onChange(Math.min(max, Math.max(min, local))); setEditing(false); }
          if (e.key === 'Escape') setEditing(false);
        }}
      />
      <button onClick={() => { onChange(Math.min(max, Math.max(min, local))); setEditing(false); }} className="text-low hover:text-low/80">
        <Check size={11} />
      </button>
    </div>
  );
}
