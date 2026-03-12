import { useState } from 'react';
import { Route, ToggleLeft, ToggleRight, Tag, Server, AlertTriangle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { mockRoutingRules } from '../data/mockData';
import { AlertRoutingRule, AlertPriority, RoutingConditionField } from '../types';
import { Tooltip } from '../components/Tooltip';

const priorityColors: Record<AlertPriority, { color: string; bg: string }> = {
  critical: { color: '#FF4757', bg: 'rgba(255,71,87,0.15)' },
  high: { color: '#FF6200', bg: 'rgba(255,98,0,0.15)' },
  medium: { color: '#FFA502', bg: 'rgba(255,165,2,0.15)' },
  low: { color: '#2ED573', bg: 'rgba(46,213,115,0.15)' },
  info: { color: '#1E90FF', bg: 'rgba(30,144,255,0.15)' },
};

const fieldIcon: Record<RoutingConditionField, React.ElementType> = {
  priority: AlertTriangle,
  source: Server,
  tag: Tag,
  message: Filter,
  team: Filter,
};

const fieldColors: Record<RoutingConditionField, string> = {
  priority: '#FF6200',
  source: '#1E90FF',
  tag: '#FFA502',
  message: '#2ED573',
  team: '#B0A8C8',
};

function RuleCard({ rule, index }: { rule: AlertRoutingRule; index: number }) {
  const [enabled, setEnabled] = useState(rule.enabled);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-surface border rounded-xl overflow-hidden transition-colors ${enabled ? 'border-border' : 'border-border/40 opacity-60'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">#{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">{rule.name}</span>
            <span className="text-xs text-text-muted bg-surface-light border border-border px-2 py-0.5 rounded-full">
              Match {rule.conditionLogic === 'all' ? 'ALL' : 'ANY'}
            </span>
            {rule.priorityOverride && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                style={{ color: priorityColors[rule.priorityOverride].color, backgroundColor: priorityColors[rule.priorityOverride].bg }}
              >
                ↑ {rule.priorityOverride}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5 truncate">{rule.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip text={enabled ? 'Disable this routing rule' : 'Enable this routing rule'} side="top">
          <button
            onClick={() => setEnabled((v) => !v)}
            className="transition-colors"
          >
            {enabled
              ? <ToggleRight size={22} className="text-primary" />
              : <ToggleLeft size={22} className="text-text-muted" />}
          </button>
          </Tooltip>
          <Tooltip text={expanded ? 'Collapse rule details' : 'Expand rule details'} side="top">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded hover:bg-surface-light transition-colors"
          >
            {expanded
              ? <ChevronUp size={16} className="text-text-muted" />
              : <ChevronDown size={16} className="text-text-muted" />}
          </button>
          </Tooltip>
        </div>
      </div>

      {/* Conditions preview (always visible) */}
      <div className="px-4 pb-3 flex flex-wrap gap-2">
        {rule.conditions.map((cond, i) => {
          const Icon = fieldIcon[cond.field];
          const color = fieldColors[cond.field];
          return (
            <span
              key={i}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: `${color}18`, color }}
            >
              <Icon size={11} />
              {cond.field} {cond.operator.replace('_', ' ')} "{cond.value}"
            </span>
          );
        })}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Route To Team</p>
              <p className="text-text-primary font-semibold">{rule.targetTeam}</p>
            </div>
            {rule.escalationPolicyId && (
              <div>
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Escalation Policy</p>
                <p className="text-text-primary font-semibold">{rule.escalationPolicyId}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Created</p>
              <p className="text-text-secondary">{new Date(rule.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">Priority Override</p>
              <p className="text-text-secondary capitalize">{rule.priorityOverride ?? 'None'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertRouting() {
  const [rules] = useState(mockRoutingRules);

  const enabled = rules.filter((r) => r.enabled).length;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Alert Routing Rules</h1>
          <p className="text-sm text-text-muted mt-1">
            Define how incoming alerts are routed to teams based on priority, source, tags, or message content.
          </p>
        </div>
        <Tooltip text="Create a new alert routing rule" side="bottom">
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Route size={15} />
          Add Rule
        </button>
        </Tooltip>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        {[
          { label: 'Total Rules', value: rules.length, color: '#FF6200' },
          { label: 'Active Rules', value: enabled, color: '#2ED573' },
          { label: 'Disabled', value: rules.length - enabled, color: '#B0A8C8' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-3 flex items-start gap-3">
        <Route size={16} className="text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-text-secondary">
          Rules are evaluated in order (lowest order number first). The first matching rule wins.
          Use <strong className="text-text-primary">Match ALL</strong> for strict routing or <strong className="text-text-primary">Match ANY</strong> for broad catch-all rules.
        </p>
      </div>

      {/* Rules */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        {[...rules].sort((a, b) => a.order - b.order).map((rule, idx) => (
          <RuleCard key={rule.id} rule={rule} index={idx} />
        ))}
      </div>
    </div>
  );
}


