import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Flame, AlertTriangle, CheckCircle,
  PlusCircle, Megaphone, Shield, BarChart2,
  Bug, GitBranch, FileText, BookOpen,
  TrendingUp, Calendar, Maximize2, X,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { IncidentCard } from '../components/IncidentCard';
import { AlertCard } from '../components/AlertCard';
import { Tooltip } from '../components/Tooltip';
import { mockAlerts, mockIncidents, mockProblems, mockChanges, mockPostmortems, mockSchedules } from '../data/mockData';

interface ChartTip {
  title: string;
  rows: { label: string; value: string; color?: string }[];
  x: number;
  y: number;
}

function ExpandModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
        style={{ animation: 'modalIn 180ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-light transition-colors text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

function buildAxisTicks(min: number, max: number, count = 4, useLog: boolean): number[] {
  const ticks: number[] = [];
  if (useLog) {
    let v = 1;
    while (v <= max * 1.2) { if (v >= Math.max(min * 0.8, 0)) ticks.push(v); v = v === 0 ? 1 : v * 2; }
    if (ticks.length === 0 || ticks[ticks.length - 1] < max) ticks.push(max);
  } else {
    const step = Math.max(1, Math.ceil((max - min) / count));
    for (let t = Math.floor(min / step) * step; t <= max + step * 0.1; t += step) ticks.push(Math.round(t));
  }
  return [...new Set(ticks)].sort((a, b) => a - b);
}

interface TrendPoint { fullLabel: string; label: string; count: number }
interface LineChartProps {
  data: TrendPoint[];
  color?: string;
  expanded?: boolean;
  onTip: (tip: ChartTip | null) => void;
  onHovIdx: (i: number | null) => void;
  hovIdx: number | null;
}

function LineChart({ data, color = '#6366f1', expanded = false, onTip, onHovIdx, hovIdx }: LineChartProps) {
  const lastTipRef = useRef<ChartTip | null>(null);
  const cW = expanded ? 760 : 560;
  const cH = expanded ? 260 : 200;
  const padTop = 12, padLeft = expanded ? 44 : 36, padRight = 10, padBottom = expanded ? 30 : 26;
  const W = cW - padLeft - padRight;
  const H = cH - padTop - padBottom;
  const n = data.length;
  const counts = data.map((d) => d.count);
  const maxV = Math.max(...counts, 1);
  const minV = Math.min(...counts, 0);
  const useLog = n <= 5 && maxV > 2;
  const axisTicks = buildAxisTicks(minV, maxV, expanded ? 5 : 4, useLog);

  const toX = (i: number) => padLeft + (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const toY = (v: number): number => {
    if (useLog && expanded) {
      const safe = Math.max(v, 1);
      const logMin = Math.log2(Math.max(minV, 1));
      const logMax = Math.log2(Math.max(maxV, 1));
      const logRange = logMax - logMin || 1;
      return padTop + (1 - (Math.log2(safe) - logMin) / logRange) * H;
    }
    const range = maxV - minV || 1;
    return padTop + (1 - (v - minV) / range) * H;
  };

  const linePoints = data.map((d, i) => `${toX(i)},${toY(d.count)}`).join(' ');
  const areaPoints = `${toX(0)},${cH - padBottom} ${linePoints} ${toX(n - 1)},${cH - padBottom}`;
  const labelY = cH - 7;

  return (
    <svg viewBox={`0 0 ${cW} ${cH}`} className="w-full" preserveAspectRatio="none" style={{ height: expanded ? 260 : 200, display: 'block' }}
      onMouseLeave={() => { onTip(null); onHovIdx(null); }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {axisTicks.map((t, ti) => (
        <g key={ti}>
          <line x1={padLeft} x2={cW - padRight} y1={toY(t)} y2={toY(t)}
            style={{ stroke: 'var(--color-border)', strokeOpacity: 0.5 }} strokeWidth={1} />
          <text x={padLeft - 5} y={toY(t)}
            style={{ fill: 'var(--color-text-muted)' }}
            fontSize={expanded ? 10 : 9} textAnchor="end" dominantBaseline="middle">{t}</text>
        </g>
      ))}
      <line x1={padLeft} x2={cW - padRight} y1={cH - padBottom} y2={cH - padBottom}
        style={{ stroke: 'var(--color-border-light)', strokeOpacity: 0.9 }} strokeWidth={1} />
      <line x1={padLeft} x2={padLeft} y1={padTop} y2={cH - padBottom}
        style={{ stroke: 'var(--color-border-light)', strokeOpacity: 0.9 }} strokeWidth={1} />
      {expanded && (
        <text transform={`rotate(-90,12,${cH / 2})`} x={12} y={cH / 2}
          style={{ fill: 'var(--color-text-muted)' }} fontSize={10} textAnchor="middle">Incidents</text>
      )}
      <polygon points={areaPoints} fill="url(#lineGrad)" />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth={expanded ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
      {hovIdx !== null && (
        <line x1={toX(hovIdx)} x2={toX(hovIdx)} y1={padTop} y2={cH - padBottom} stroke={color} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
      )}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.count)} r={hovIdx === i ? (expanded ? 7 : 5) : (n <= 7 ? 3 : 2)} fill={color} />
          {d.count > 0 && (
            <text x={toX(i)} y={toY(d.count) > padTop + 22 ? toY(d.count) - 16 : toY(d.count) + 14}
              fill={color} fontSize={expanded ? 9 : 7} textAnchor="middle" fontWeight="600">{d.count}</text>
          )}
        </g>
      ))}
      {data.map((d, i) => d.label ? (
        <text key={`xl${i}`} x={toX(i)} y={labelY}
          style={{ fill: 'var(--color-text-muted)' }}
          fontSize={expanded ? 9 : 8} textAnchor="middle">{d.label}</text>
      ) : null)}
      {data.map((d, i) => (
        <rect key={`h${i}`}
          x={Math.max(padLeft, toX(i) - (W / Math.max(n, 1)) / 2)}
          y={0} width={W / Math.max(n, 1)} height={cH - padBottom}
          fill="transparent" style={{ cursor: 'crosshair' }}
          onMouseEnter={(e) => { onHovIdx(i); const t = { title: d.fullLabel, rows: [{ label: 'Incidents Created', value: String(d.count), color }], x: e.clientX, y: e.clientY }; lastTipRef.current = t; onTip(t); }}
          onMouseMove={(e) => { if (lastTipRef.current) { const t = { ...lastTipRef.current, x: e.clientX, y: e.clientY }; lastTipRef.current = t; onTip(t); } }}
          onMouseLeave={() => { onHovIdx(null); onTip(null); }}
        />
      ))}
    </svg>
  );
}

interface BarChartProps {
  data: TrendPoint[];
  color?: string;
  expanded?: boolean;
  onTip: (tip: ChartTip | null) => void;
}

function BarChart({ data, color = '#10b981', expanded = false, onTip }: BarChartProps) {
  const lastTipRef = useRef<ChartTip | null>(null);
  const cW = expanded ? 760 : 560;
  const cH = expanded ? 260 : 200;
  const padTop = 12, padLeft = expanded ? 44 : 36, padRight = 10, padBottom = expanded ? 30 : 26;
  const W = cW - padLeft - padRight;
  const H = cH - padTop - padBottom;
  const n = data.length;
  const counts = data.map((d) => d.count);
  const maxV = Math.max(...counts, 1);
  const minV = Math.min(...counts, 0);
  const useLog = n <= 5 && maxV > 2;
  const axisTicks = buildAxisTicks(minV, maxV, expanded ? 5 : 4, useLog);

  const toBarH = (v: number): number => {
    if (useLog && expanded) {
      const safe = Math.max(v, 1);
      const logMin = Math.log2(Math.max(Math.max(minV, 0), 1));
      const logMax = Math.log2(Math.max(maxV, 1));
      const logRange = logMax - logMin || 1;
      return H * ((Math.log2(safe) - logMin) / logRange);
    }
    return H * (v / Math.max(maxV, 1));
  };
  const toGridY = (v: number): number => {
    if (useLog && expanded) {
      const safe = Math.max(v, 1);
      const logMin = Math.log2(Math.max(Math.max(minV, 0), 1));
      const logMax = Math.log2(Math.max(maxV, 1));
      const logRange = logMax - logMin || 1;
      return padTop + (1 - (Math.log2(safe) - logMin) / logRange) * H;
    }
    return padTop + (1 - v / Math.max(maxV, 1)) * H;
  };

  const barSlotW = W / Math.max(n, 1);
  const barW = Math.max(3, barSlotW * 0.65);
  const labelY = cH - 7;

  return (
    <svg viewBox={`0 0 ${cW} ${cH}`} className="w-full" preserveAspectRatio="none" style={{ height: expanded ? 260 : 200, display: 'block' }}
      onMouseLeave={() => onTip(null)}>
      {axisTicks.map((t, ti) => (
        <g key={ti}>
          <line x1={padLeft} x2={cW - padRight} y1={toGridY(t)} y2={toGridY(t)}
            style={{ stroke: 'var(--color-border)', strokeOpacity: 0.5 }} strokeWidth={1} />
          <text x={padLeft - 5} y={toGridY(t)}
            style={{ fill: 'var(--color-text-muted)' }}
            fontSize={expanded ? 10 : 9} textAnchor="end" dominantBaseline="middle">{t}</text>
        </g>
      ))}
      <line x1={padLeft} x2={cW - padRight} y1={cH - padBottom} y2={cH - padBottom}
        style={{ stroke: 'var(--color-border-light)', strokeOpacity: 0.9 }} strokeWidth={1} />
      <line x1={padLeft} x2={padLeft} y1={padTop} y2={cH - padBottom}
        style={{ stroke: 'var(--color-border-light)', strokeOpacity: 0.9 }} strokeWidth={1} />
      {expanded && (
        <text transform={`rotate(-90,12,${cH / 2})`} x={12} y={cH / 2}
          style={{ fill: 'var(--color-text-muted)' }} fontSize={10} textAnchor="middle">Resolved</text>
      )}
      {data.map((d, i) => {
        const bH = Math.max(toBarH(d.count), d.count > 0 ? 4 : 0);
        const x = padLeft + i * barSlotW + (barSlotW - barW) / 2;
        const y = cH - padBottom - bH;
        return (
          <g key={i} style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => { const t = { title: d.fullLabel, rows: [{ label: 'Incidents Resolved', value: String(d.count), color }], x: e.clientX, y: e.clientY }; lastTipRef.current = t; onTip(t); }}
            onMouseMove={(e) => { if (lastTipRef.current) { const t = { ...lastTipRef.current, x: e.clientX, y: e.clientY }; lastTipRef.current = t; onTip(t); } }}
            onMouseLeave={() => onTip(null)}
          >
            <rect x={x} y={y} width={barW} height={bH} fill={color} rx={3} opacity={0.88} />
            <rect x={x} y={0} width={barW} height={cH - padBottom} fill="transparent" />
            {d.count > 0 && (
              <text x={x + barW / 2} y={Math.max(y - 3, padTop + 8)}
                fill={color} fontSize={expanded ? 9 : 7} textAnchor="middle" fontWeight="600">{d.count}</text>
            )}
          </g>
        );
      })}
      {data.map((d, i) => d.label ? (
        <text key={`xl${i}`} x={padLeft + i * barSlotW + barSlotW / 2} y={labelY}
          style={{ fill: 'var(--color-text-muted)' }}
          fontSize={expanded ? 9 : 8} textAnchor="middle">{d.label}</text>
      ) : null)}
    </svg>
  );
}

const PIE_COLORS: Record<string, string> = {
  critical: '#e11d48',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#10b981',
  info:     '#1E90FF',
};

interface PieSlice {
  priority: string;
  count: number;
  color: string;
  path: string;
  pct: number;
  labelX: number;
  labelY: number;
}

interface PieChartProps {
  slices: PieSlice[];
  showLegend: boolean;
  expanded?: boolean;
  onTip: (tip: ChartTip | null) => void;
}

function PieChart({ slices, showLegend, expanded = false, onTip }: PieChartProps) {
  const lastTipRef = useRef<ChartTip | null>(null);
  const size = expanded ? 240 : 200;
  const svg = (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size, flexShrink: 0 }}
      onMouseLeave={() => onTip(null)}>
      {slices.map((s) => (
        <path key={s.priority} d={s.path} fill={s.color}
          stroke="rgba(0,0,0,0.2)" strokeWidth="0.6"
          style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
          onMouseEnter={(e) => { const t = { title: s.priority.charAt(0).toUpperCase() + s.priority.slice(1), rows: [{ label: 'Count', value: String(s.count), color: s.color }, { label: 'Share', value: `${s.pct}%` }], x: e.clientX, y: e.clientY }; lastTipRef.current = t; onTip(t); }}
          onMouseMove={(e) => { if (lastTipRef.current) { const t = { ...lastTipRef.current, x: e.clientX, y: e.clientY }; lastTipRef.current = t; onTip(t); } }}
          onMouseLeave={() => onTip(null)}
        />
      ))}
      {slices.map((s) => s.pct >= 8 ? (
        <text key={`l${s.priority}`} x={s.labelX} y={s.labelY}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={expanded ? 6 : 7} fontWeight="bold"
          fill="rgba(255,255,255,0.92)" style={{ pointerEvents: 'none' }}>
          {s.pct}%
        </text>
      ) : null)}
    </svg>
  );
  if (!showLegend) {
    return <div className="w-full flex items-center justify-center py-2">{svg}</div>;
  }
  return (
    <div className="w-full flex items-center justify-center gap-4 py-2">
      {svg}
      <div className="flex flex-col gap-1.5 shrink-0">
        {slices.map((s) => (
          <div key={s.priority} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] capitalize text-text-secondary w-12">{s.priority}</span>
            <span className="text-[12px] font-bold text-text-primary">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();

  const openAlerts = mockAlerts.filter((a) => a.status === 'open');
  const criticalAlerts = mockAlerts.filter((a) => a.priority === 'critical' && a.status !== 'closed');
  const activeIncidents = mockIncidents.filter((i) => i.status !== 'resolved');
  const infraSources = new Set(['Nagios', 'Kubernetes', 'Prometheus', 'Zabbix', 'CloudWatch', 'Grafana']);
  const infraAlerts = mockAlerts.filter((a) => infraSources.has(a.source) || a.tags?.some((t) => t.toLowerCase().includes('infrastructure')));
  const appAlerts = mockAlerts.filter((a) => !infraSources.has(a.source) && !a.tags?.some((t) => t.toLowerCase().includes('infrastructure')));
  const acknowledgedAlerts = mockAlerts.filter((a) => a.status === 'acknowledged');
  const openProblems = mockProblems.filter((p) => p.status !== 'resolved' && p.status !== 'closed');
  const knownErrors = mockProblems.filter((p) => p.knownError && p.status !== 'resolved' && p.status !== 'closed');
  const pendingChanges = mockChanges.filter((c) => c.status === 'pending_approval');
  const emergencyChanges = mockChanges.filter((c) => c.type === 'emergency' && c.status === 'in_progress');

  const serviceData: Record<string, [string, number][]> = {
    '7d': [['Shipment Tracking', 14], ['Pick Up Service', 11], ['Claims Processing', 8], ['Delivery Mgmt', 5], ['Returns Portal', 3]],
    '30d': [['Shipment Tracking', 42], ['Claims Processing', 38], ['Pick Up Service', 29], ['Delivery Mgmt', 19], ['Returns Portal', 14]],
    '90d': [['Shipment Tracking', 118], ['Claims Processing', 97], ['Pick Up Service', 81], ['Delivery Mgmt', 64], ['Returns Portal', 47]],
  };

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const top5Services = serviceData[timeRange];
  const maxServiceCount = top5Services[0]?.[1] || 1;

  const trendDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const ticketTrend = Array.from({ length: trendDays }, (_, i) => {
    const d = new Date(2026, 2, 11);
    d.setDate(d.getDate() - (trendDays - 1 - i));
    const seed = (i * 7 + 3) % 17;
    const base = timeRange === '7d' ? 6 : timeRange === '30d' ? 8 : 10;
    const count = Math.max(1, base + (seed % 8) - 2 + (i > trendDays * 0.6 ? 3 : 0));
    const showLabel = timeRange === '90d' ? i % 14 === 0 : timeRange === '30d' ? i % 6 === 0 : true;
    const fullLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { label: showLabel ? fullLabel : '', fullLabel, count };
  });
  const totalTickets = ticketTrend.reduce((s, d) => s + d.count, 0);
  const avgTickets = Math.round(totalTickets / ticketTrend.length);
  const peakTickets = Math.max(...ticketTrend.map((d) => d.count));

  const solvedDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 14 : 30;
  const solvedTrend = Array.from({ length: solvedDays }, (_, i) => {
    const d = new Date(2026, 2, 11);
    d.setDate(d.getDate() - (solvedDays - 1 - i));
    const seed = (i * 11 + 5) % 13;
    const base = timeRange === '7d' ? 4 : timeRange === '30d' ? 6 : 8;
    const count = Math.max(0, base + (seed % 6) - 1);
    const showLabel = solvedDays <= 7 ? true : solvedDays <= 14 ? i % 3 === 0 : i % 7 === 0;
    const fullLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { label: showLabel ? fullLabel : '', fullLabel, count };
  });
  const maxSolved = Math.max(...solvedTrend.map((d) => d.count), 1);
  const totalSolved = solvedTrend.reduce((s, d) => s + d.count, 0);
  const avgSolved = Math.round(totalSolved / solvedTrend.length);

  const nonClosedAlerts = mockAlerts.filter((a) => a.status !== 'closed');
  const totalNonClosed = nonClosedAlerts.length || 1;
  const pieRawData = (['critical', 'high', 'medium', 'low', 'info'] as const)
    .map((p) => ({ priority: p, count: nonClosedAlerts.filter((a) => a.priority === p).length, color: PIE_COLORS[p] }))
    .filter((d) => d.count > 0);
  const pieCx = 50, pieCy = 50, pieR = 44;
  let cumA = -Math.PI / 2;
  const pieSlices: PieSlice[] = pieRawData.map((d) => {
    const angle = (d.count / totalNonClosed) * 2 * Math.PI;
    const s = cumA; const e = cumA + angle; cumA = e;
    const tx = (a: number) => pieCx + pieR * Math.cos(a);
    const ty = (a: number) => pieCy + pieR * Math.sin(a);
    const la = angle > Math.PI ? 1 : 0;
    const path = `M ${pieCx} ${pieCy} L ${tx(s).toFixed(1)} ${ty(s).toFixed(1)} A ${pieR} ${pieR} 0 ${la} 1 ${tx(e).toFixed(1)} ${ty(e).toFixed(1)} Z`;
    const midA = s + angle / 2;
    const labelR = pieR * 0.62;
    return {
      ...d,
      path,
      pct: Math.round((d.count / totalNonClosed) * 100),
      labelX: parseFloat((pieCx + labelR * Math.cos(midA)).toFixed(1)),
      labelY: parseFloat((pieCy + labelR * Math.sin(midA)).toFixed(1)),
    };
  });

  const [chartTip, setChartTip] = useState<ChartTip | null>(null);
  const [hovLinePt, setHovLinePt] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const setChartTipCb = useCallback((t: ChartTip | null) => setChartTip(t), []);
  const setHovLinePtCb = useCallback((i: number | null) => setHovLinePt(i), []);

  useEffect(() => {
    if (!showNotif) return;
    function onOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [showNotif]);

  const notifications = mockAlerts
    .filter((a) => a.status === 'open' || a.status === 'acknowledged')
    .sort((a, b) => {
      const ord: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (ord[a.priority] ?? 5) - (ord[b.priority] ?? 5);
    }).slice(0, 6);

  const ExpandBtn = ({ id }: { id: string }) => (
    <button onClick={() => setExpandedWidget(id)}
      className="p-0.5 rounded hover:bg-surface-light text-text-muted hover:text-text-primary transition-colors" title="Expand">
      <Maximize2 size={11} />
    </button>
  );

  const pColors: Record<string, string> = { critical: '#FF4757', high: '#FF6200', medium: '#FFA502', low: '#2ED573', info: '#1E90FF' };
  const barColors = ['#e11d48', '#f97316', '#f59e0b', '#10b981', '#1E90FF'];

  return (
    <div className="p-4 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-text-secondary leading-none">Good morning</p>
          <h1 className="text-lg font-bold text-primary tracking-tight mt-0.5">AlertHive Dashboard</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { icon: PlusCircle, label: 'New Incident', tip: 'Declare a new incident', color: '#FF4757', bg: 'rgba(255,71,87,0.12)', action: () => navigate('/incidents') },
            { icon: Megaphone, label: 'Send Alert', tip: 'Manually broadcast an alert', color: '#FF6200', bg: 'rgba(255,98,0,0.12)', action: () => navigate('/alerts') },
            { icon: Shield, label: 'On-Call', tip: 'View on-call schedules', color: '#1E90FF', bg: 'rgba(30,144,255,0.12)', action: () => navigate('/oncall') },
            { icon: BarChart2, label: 'Reports', tip: 'Analytics and SLA trends', color: '#2ED573', bg: 'rgba(46,213,115,0.12)', action: () => navigate('/analytics') },
          ].map(({ icon: Icon, label, tip, color, bg, action }) => (
            <Tooltip key={label} text={tip} side="bottom">
              <button onClick={action} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-light transition-colors">
                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}><Icon size={11} style={{ color }} /></div>
                <span className="text-xs font-medium text-text-secondary hidden md:block">{label}</span>
              </button>
            </Tooltip>
          ))}
          <Tooltip text="Filter dashboard by time range" side="bottom">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border">
              <Calendar size={11} className="text-text-muted shrink-0" />
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${timeRange === r ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}>
                  {r}
                </button>
              ))}
            </div>
          </Tooltip>
          <div ref={notifRef} className="relative">
            <Tooltip text="View recent notifications" side="bottom">
              <button onClick={() => setShowNotif((v) => !v)}
                className={`relative p-1.5 ml-1 rounded-lg bg-surface border transition-colors ${showNotif ? 'border-primary/60' : 'border-border hover:border-border-light'}`}>
                <Bell size={16} className={showNotif ? 'text-primary' : 'text-text-primary'} />
                {openAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-critical text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{openAlerts.length}</span>
                )}
              </button>
            </Tooltip>
            {showNotif && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                  <span className="text-xs font-semibold text-text-primary">Notifications</span>
                  <span className="text-[10px] bg-critical/10 text-critical px-1.5 py-0.5 rounded-full font-medium">{openAlerts.length} open</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <CheckCircle size={24} className="mx-auto mb-1.5 text-low opacity-60" />
                      <p className="text-xs text-text-muted">All clear</p>
                    </div>
                  ) : notifications.map((alert) => {
                    const diff = Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / 60000);
                    const ago = diff < 60 ? `${diff}m ago` : diff < 1440 ? `${Math.floor(diff / 60)}h ago` : `${Math.floor(diff / 1440)}d ago`;
                    return (
                      <button key={alert.id} onClick={() => { setShowNotif(false); navigate('/alerts'); }}
                        className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface-light transition-colors text-left">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: pColors[alert.priority] }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-text-primary truncate">{alert.title}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">{alert.source}  {ago}</p>
                        </div>
                        <span className="text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                          style={{ backgroundColor: `${pColors[alert.priority]}18`, color: pColors[alert.priority] }}>
                          {alert.priority}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="px-3 py-2 border-t border-border bg-surface-light/30">
                  <button onClick={() => { setShowNotif(false); navigate('/alerts'); }}
                    className="w-full text-center text-xs text-primary hover:text-primary-light font-medium transition-colors py-0.5">
                    View all alerts 
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-3">
        <StatCard title="Open Alerts" value={openAlerts.length} icon={Bell} color="#FF4757" tooltip="Total unresolved alerts" />
        <StatCard title="Critical" value={criticalAlerts.length} icon={Flame} color="#FF6200" tooltip="Active critical alerts" />
        <StatCard title="Incidents" value={activeIncidents.length} icon={AlertTriangle} color="#FFA502" tooltip="Open incidents" />
        <StatCard title="Acknowledged" value={acknowledgedAlerts.length} icon={CheckCircle} color="#2ED573" tooltip="Acknowledged alerts" />
        <Tooltip text="Track root-cause problems" side="bottom" wrapperClass="block">
          <button onClick={() => navigate('/problems')} className="w-full bg-surface border border-border rounded-lg p-2.5 flex items-center gap-2 hover:border-primary/40 transition-colors">
            <div className="w-7 h-7 rounded-md bg-purple-400/10 flex items-center justify-center shrink-0"><Bug size={13} className="text-purple-400" /></div>
            <div className="min-w-0"><p className="text-base font-bold text-text-primary leading-none">{openProblems.length}</p><p className="text-xs text-text-muted mt-0.5 truncate">Problems{knownErrors.length > 0 ? ` ${knownErrors.length}` : ''}</p></div>
          </button>
        </Tooltip>
        <Tooltip text="Pending change requests" side="bottom" wrapperClass="block">
          <button onClick={() => navigate('/changes')} className="w-full bg-surface border border-border rounded-lg p-2.5 flex items-center gap-2 hover:border-primary/40 transition-colors">
            <div className="w-7 h-7 rounded-md bg-yellow-400/10 flex items-center justify-center shrink-0"><GitBranch size={13} className="text-yellow-400" /></div>
            <div className="min-w-0"><p className="text-base font-bold text-text-primary leading-none">{pendingChanges.length}</p><p className="text-xs text-text-muted mt-0.5 truncate">Changes{emergencyChanges.length > 0 ? ' ' : ''}</p></div>
          </button>
        </Tooltip>
        <Tooltip text="Post-incident reviews" side="bottom" wrapperClass="block">
          <button onClick={() => navigate('/postmortems')} className="w-full bg-surface border border-border rounded-lg p-2.5 flex items-center gap-2 hover:border-primary/40 transition-colors">
            <div className="w-7 h-7 rounded-md bg-blue-400/10 flex items-center justify-center shrink-0"><FileText size={13} className="text-blue-400" /></div>
            <div className="min-w-0"><p className="text-base font-bold text-text-primary leading-none">{mockPostmortems.length}</p><p className="text-xs text-text-muted mt-0.5 truncate">Postmortems</p></div>
          </button>
        </Tooltip>
        <Tooltip text="Known Error Database" side="bottom" wrapperClass="block">
          <button onClick={() => navigate('/knowledge')} className="w-full bg-surface border border-border rounded-lg p-2.5 flex items-center gap-2 hover:border-primary/40 transition-colors">
            <div className="w-7 h-7 rounded-md bg-green-400/10 flex items-center justify-center shrink-0"><BookOpen size={13} className="text-green-400" /></div>
            <div className="min-w-0"><p className="text-base font-bold text-text-primary leading-none">KEDB</p><p className="text-xs text-text-muted mt-0.5 truncate">Knowledge</p></div>
          </button>
        </Tooltip>
      </div>

      {/* Section Divider: Alert Analysis */}
      <div className="flex items-center justify-center my-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
        <span className="text-[10px] font-bold tracking-widest uppercase text-primary/70">Alert Analysis</span>
      </div>

      {/* Row 3: Alert Priority + Top 5 Services + Alert by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <section className="bg-surface border border-border rounded-xl flex flex-col">
          <div className="relative flex items-center justify-center px-3 py-2 border-b border-border bg-primary/5 rounded-t-xl">
            <Tooltip text="Alert count by priority" side="right">
              <h2 className="text-xs font-semibold text-text-primary flex items-center gap-1.5 cursor-default"><TrendingUp size={12} className="text-medium" /> Alert Priority</h2>
            </Tooltip>
            <div className="absolute right-3 flex items-center gap-1.5">
              <button
                onClick={() => setShowLegend((v) => !v)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${showLegend ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-text-muted hover:text-text-secondary'}`}>
                {showLegend ? 'Legend ' : 'Legend'}
              </button>
              <ExpandBtn id="pie" />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-3">
            <PieChart slices={pieSlices} showLegend={showLegend} onTip={setChartTipCb} />
          </div>
        </section>

        <section className="bg-surface border border-border rounded-xl flex flex-col">
          <div className="flex items-center justify-center px-3 py-2 border-b border-border bg-primary/5 rounded-t-xl">
            <Tooltip text="Business services generating the most alerts" side="right">
              <h2 className="text-xs font-semibold text-text-primary flex items-center gap-1.5 cursor-default"><Flame size={12} className="text-critical" /> Top 5 Services</h2>
            </Tooltip>
          </div>
          <div className="p-3 space-y-2 flex-1">
            {top5Services.map(([source, count], i) => {
              const pct = Math.round((count / maxServiceCount) * 100);
              return (
                <div key={source} className="flex items-center gap-2 rounded px-1 -mx-1 cursor-pointer hover:bg-surface-light transition-colors"
                  onMouseEnter={(e) => setChartTip({ title: source, rows: [{ label: 'Alerts', value: String(count), color: barColors[i] }, { label: 'Percentage', value: `${pct}%` }], x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => setChartTip((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                  onMouseLeave={() => setChartTip(null)}>
                  <span className="w-4 h-4 rounded-full bg-surface-light flex items-center justify-center text-[10px] text-text-muted font-bold shrink-0">{i + 1}</span>
                  <span className="flex-1 text-xs text-text-secondary truncate">{source}</span>
                  <div className="flex-1 bg-surface-light rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColors[i] }} />
                  </div>
                  <span className="w-5 text-xs text-right text-text-primary font-bold shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-surface border border-border rounded-xl flex flex-col">
          <div className="flex items-center justify-center px-3 py-2 border-b border-border bg-primary/5 rounded-t-xl">
            <h2 className="text-xs font-semibold text-text-primary flex items-center gap-1.5"><BarChart2 size={12} className="text-primary" /> Alert by Category</h2>
          </div>
          <div className="p-3 flex-1 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-light rounded-lg p-2.5 text-center cursor-default"
                onMouseEnter={(e) => setChartTip({ title: 'Infrastructure Alerts', rows: [{ label: 'Count', value: String(infraAlerts.length), color: '#6366f1' }, { label: 'Share', value: `${Math.round((infraAlerts.length / Math.max(mockAlerts.length, 1)) * 100)}%` }, { label: 'Open', value: String(infraAlerts.filter(a => a.status === 'open').length) }, { label: 'Critical', value: String(infraAlerts.filter(a => a.priority === 'critical').length) }], x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => setChartTip((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => setChartTip(null)}>
                <p className="text-[10px] text-text-muted mb-1">Infrastructure</p>
                <p className="text-2xl font-bold text-primary leading-none">{infraAlerts.length}</p>
                <div className="mt-2 bg-border/50 rounded-full h-1">
                  <div className="h-1 rounded-full bg-primary/60 transition-all" style={{ width: `${Math.round((infraAlerts.length / Math.max(mockAlerts.length, 1)) * 100)}%` }} />
                </div>
              </div>
              <div className="bg-surface-light rounded-lg p-2.5 text-center cursor-default"
                onMouseEnter={(e) => setChartTip({ title: 'Application Alerts', rows: [{ label: 'Count', value: String(appAlerts.length), color: '#f97316' }, { label: 'Share', value: `${Math.round((appAlerts.length / Math.max(mockAlerts.length, 1)) * 100)}%` }, { label: 'Open', value: String(appAlerts.filter(a => a.status === 'open').length) }, { label: 'Critical', value: String(appAlerts.filter(a => a.priority === 'critical').length) }], x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => setChartTip((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => setChartTip(null)}>
                <p className="text-[10px] text-text-muted mb-1">Application</p>
                <p className="text-2xl font-bold text-high leading-none">{appAlerts.length}</p>
                <div className="mt-2 bg-border/50 rounded-full h-1">
                  <div className="h-1 rounded-full bg-high/60 transition-all" style={{ width: `${Math.round((appAlerts.length / Math.max(mockAlerts.length, 1)) * 100)}%` }} />
                </div>
              </div>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr>
                  <th className="text-left pb-1 font-medium text-text-muted">Priority</th>
                  <th className="text-center pb-1 font-medium text-primary">Infra</th>
                  <th className="text-center pb-1 font-medium text-high">App</th>
                </tr>
              </thead>
              <tbody>
                {(['critical', 'high', 'medium', 'low', 'info'] as const).map((p) => (
                  <tr key={p} className="border-t border-border/50">
                    <td className="py-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[p] }} />
                        <span className="capitalize text-text-secondary">{p}</span>
                      </span>
                    </td>
                    <td className="text-center py-0.5 font-semibold text-text-primary">{infraAlerts.filter((a) => a.priority === p).length}</td>
                    <td className="text-center py-0.5 font-semibold text-text-primary">{appAlerts.filter((a) => a.priority === p).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Section Divider: Trend Analysis */}
      <div className="flex items-center justify-center my-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
        <span className="text-[10px] font-bold tracking-widest uppercase text-primary/70">Trend Analysis</span>
      </div>

      {/* Row 4: Trends side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Incident Creation Trend */}
        <section className="bg-surface border border-border rounded-xl flex flex-col">
          <div className="relative flex items-center justify-center px-3 py-2 border-b border-border bg-primary/5 rounded-t-xl">
            <p className="text-xs font-semibold text-text-primary">Incident Creation Trend</p>
            <div className="absolute right-3 flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="text-right"><p className="text-[10px] text-text-muted leading-none">Total</p><p className="text-xs font-bold text-text-primary">{totalTickets}</p></div>
                <div className="text-right"><p className="text-[10px] text-text-muted leading-none">Avg</p><p className="text-xs font-bold text-text-primary">{avgTickets}</p></div>
                <div className="text-right"><p className="text-[10px] text-text-muted leading-none">Peak</p><p className="text-xs font-bold text-high">{peakTickets}</p></div>
              </div>
              <ExpandBtn id="line" />
            </div>
          </div>
          <div className="flex-1 p-3 pb-2">
            <LineChart data={ticketTrend} color="#6366f1" onTip={setChartTipCb} onHovIdx={setHovLinePtCb} hovIdx={hovLinePt} />
          </div>
        </section>

        {/* Incident Resolution Trend */}
        <section className="bg-surface border border-border rounded-xl flex flex-col">
          <div className="relative flex items-center justify-center px-3 py-2 border-b border-border bg-primary/5 rounded-t-xl">
            <p className="text-xs font-semibold text-text-primary">Incident Resolution Trend</p>
            <div className="absolute right-3 flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="text-right"><p className="text-[10px] text-text-muted leading-none">Total</p><p className="text-xs font-bold text-text-primary">{totalSolved}</p></div>
                <div className="text-right"><p className="text-[10px] text-text-muted leading-none">Avg</p><p className="text-xs font-bold text-text-primary">{avgSolved}</p></div>
                <div className="text-right"><p className="text-[10px] text-text-muted leading-none">Best</p><p className="text-xs font-bold text-low">{maxSolved}</p></div>
              </div>
              <ExpandBtn id="bar" />
            </div>
          </div>
          <div className="flex-1 p-3 pb-2">
            <BarChart data={solvedTrend} color="#10b981" onTip={setChartTipCb} />
          </div>
        </section>
      </div>

      {/* Section Divider: Live Feed */}
      <div className="flex items-center justify-center my-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
        <span className="text-[10px] font-bold tracking-widest uppercase text-primary/70">Live Feed</span>
      </div>

      {/* Row 5: Active Incidents + Recent Critical Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section className="bg-surface border border-border rounded-xl flex flex-col" style={{ minHeight: '300px', maxHeight: '380px' }}>
          <div className="relative flex items-center justify-center px-3 py-2 border-b border-border shrink-0 bg-primary/5 rounded-t-xl">
            <h2 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-high" /> Active Incidents
              <span className="text-[10px] font-normal text-text-muted ml-1">({activeIncidents.length})</span>
            </h2>
            <button onClick={() => navigate('/incidents')} className="absolute right-3 text-xs text-primary hover:text-primary-light">See all</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
            {activeIncidents.length === 0
              ? <div className="flex items-center justify-center h-full text-text-muted py-8"><CheckCircle size={20} className="mr-2 opacity-40" /><p className="text-xs">No active incidents</p></div>
              : activeIncidents.slice(0, 5).map((inc) => (
                <div key={inc.id} className="shrink-0 w-full"><IncidentCard incident={inc} /></div>
              ))}
          </div>
        </section>
        <section className="bg-surface border border-border rounded-xl flex flex-col" style={{ minHeight: '300px', maxHeight: '380px' }}>
          <div className="relative flex items-center justify-center px-3 py-2 border-b border-border shrink-0 bg-primary/5 rounded-t-xl">
            <h2 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Flame size={12} className="text-critical" /> Recent Critical Alerts
              <span className="text-[10px] font-normal text-text-muted ml-1">({criticalAlerts.length})</span>
            </h2>
            <button onClick={() => navigate('/alerts')} className="absolute right-3 text-xs text-primary hover:text-primary-light">See all</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
            {criticalAlerts.length === 0
              ? <div className="flex items-center justify-center h-full text-text-muted py-8"><CheckCircle size={20} className="mr-2 opacity-40" /><p className="text-xs">No critical alerts</p></div>
              : criticalAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="shrink-0 w-full"><AlertCard alert={alert} /></div>
              ))}
          </div>
        </section>
      </div>

      {/* Floating tooltip */}
      {chartTip && (
        <div className="fixed z-[9999] pointer-events-none rounded-lg shadow-2xl"
          style={{ left: chartTip.x + 14, top: chartTip.y - 10, background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-3 py-2 min-w-[160px]">
            <p className="text-[11px] font-semibold text-white/90 mb-1.5 pb-1 border-b border-white/10">{chartTip.title}</p>
            {chartTip.rows.map((r, ri) => (
              <div key={ri} className="flex items-center gap-2 mt-1">
                {r.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />}
                <span className="text-[10px] text-white/60 flex-1">{r.label}</span>
                <span className="text-[10px] font-bold text-white ml-2">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expand Modals */}
      {expandedWidget === 'pie' && (
        <ExpandModal title="Alert Priority Breakdown" onClose={() => setExpandedWidget(null)}>
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <button onClick={() => setShowLegend((v) => !v)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${showLegend ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-text-muted hover:text-text-secondary'}`}>
                {showLegend ? 'Legend On' : 'Legend Off'}
              </button>
              <p className="text-xs text-text-muted">{totalNonClosed} total non-closed alerts</p>
            </div>
            <div className="flex justify-center">
              <PieChart slices={pieSlices} showLegend={false} expanded onTip={setChartTipCb} />
            </div>
            {showLegend && (
              <div className="grid grid-cols-2 gap-3">
                {pieSlices.map((s) => (
                  <div key={s.priority} className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} /><span className="text-sm capitalize text-text-primary font-medium">{s.priority}</span></div>
                    <div className="flex items-center gap-3"><span className="text-sm font-bold text-text-primary">{s.count}</span><span className="text-xs text-text-muted">{s.pct}%</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ExpandModal>
      )}

      {expandedWidget === 'line' && (
        <ExpandModal title="Incident Creation Trend" onClose={() => setExpandedWidget(null)}>
          <div>
            <div className="flex items-center justify-end gap-6 mb-4">
              {[{ label: 'Total', val: totalTickets, cls: 'text-text-primary' }, { label: 'Avg/day', val: avgTickets, cls: 'text-text-primary' }, { label: 'Peak', val: peakTickets, cls: 'text-high' }].map(({ label, val, cls }) => (
                <div key={label} className="text-right"><p className="text-xs text-text-muted">{label}</p><p className={`text-lg font-bold ${cls}`}>{val}</p></div>
              ))}
            </div>
            <LineChart data={ticketTrend} color="#6366f1" expanded onTip={setChartTipCb} onHovIdx={setHovLinePtCb} hovIdx={hovLinePt} />
          </div>
        </ExpandModal>
      )}

      {expandedWidget === 'bar' && (
        <ExpandModal title="Incident Resolution Trend" onClose={() => setExpandedWidget(null)}>
          <div>
            <div className="flex items-center justify-end gap-6 mb-4">
              {[{ label: 'Total', val: totalSolved, cls: 'text-text-primary' }, { label: 'Avg/day', val: avgSolved, cls: 'text-text-primary' }, { label: 'Best', val: maxSolved, cls: 'text-low' }].map(({ label, val, cls }) => (
                <div key={label} className="text-right"><p className="text-xs text-text-muted">{label}</p><p className={`text-lg font-bold ${cls}`}>{val}</p></div>
              ))}
            </div>
            <BarChart data={solvedTrend} color="#10b981" expanded onTip={setChartTipCb} />
          </div>
        </ExpandModal>
      )}
    </div>
  );
}
