import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, CheckSquare, Square, Clock, User, Tag, AlertTriangle, Plus } from 'lucide-react';
import { mockPlaybooks } from '../data/mockData';
import { Playbook, AlertPriority } from '../types';
import { Tooltip } from '../components/Tooltip';

const priorityColors: Record<AlertPriority, string> = {
  critical: '#FF4757',
  high: '#FF6200',
  medium: '#FFA502',
  low: '#2ED573',
  info: '#1E90FF',
};

function PlaybookCard({ playbook }: { playbook: Playbook }) {
  const [expanded, setExpanded] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const totalItems = playbook.steps.reduce((sum, s) => sum + s.checklistItems.length, 0);
  const completedItems = checkedItems.size;

  function toggleItem(key: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between p-3 text-left hover:bg-surface-light transition-colors"
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <BookOpen size={15} className="text-primary shrink-0" />
            <h3 className="text-base font-semibold text-text-primary">{playbook.title}</h3>
            <span className="text-xs text-text-muted bg-surface-light border border-border px-2 py-0.5 rounded-full">
              v{playbook.version}
            </span>
          </div>
          <p className="text-sm text-text-secondary mb-2">{playbook.description}</p>
          {/* Priorities */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {playbook.linkedPriorities.map((p) => (
              <span
                key={p}
                className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                style={{ color: priorityColors[p], backgroundColor: `${priorityColors[p]}18` }}
              >
                {p}
              </span>
            ))}
          </div>
          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
            <span className="flex items-center gap-1"><Clock size={11} /> {playbook.steps.length} steps</span>
            <span className="flex items-center gap-1"><CheckSquare size={11} /> {totalItems} checklist items</span>
            <span className="flex items-center gap-1"><User size={11} /> {playbook.author}</span>
            <span className="flex items-center gap-1">Updated {new Date(playbook.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-text-muted shrink-0 mt-1" />
        ) : (
          <ChevronDown size={18} className="text-text-muted shrink-0 mt-1" />
        )}
      </button>

      {/* Expanded steps */}
      {expanded && (
        <div className="border-t border-border">
          {/* Trigger conditions */}
          <div className="px-5 py-4 bg-primary/5 border-b border-border">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
              <AlertTriangle size={11} /> Trigger Conditions
            </p>
            <div className="flex flex-wrap gap-2">
              {playbook.triggerConditions.map((cond) => (
                <span key={cond} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
                  {cond}
                </span>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          {completedItems > 0 && (
            <div className="px-5 py-3 border-b border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted">Progress</span>
                <span className="text-xs font-medium text-text-primary">{completedItems} / {totalItems}</span>
              </div>
              <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(completedItems / totalItems) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="px-5 py-4 space-y-5">
            {playbook.steps.map((step) => (
              <div key={step.order} className="flex gap-2">
                {/* Step number */}
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{step.order}</span>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-text-primary">{step.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-text-muted shrink-0">
                      <User size={11} />{step.responsible}
                      <Clock size={11} />~{step.estimatedMinutes}m
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary mb-2">{step.description}</p>
                  {/* Checklist */}
                  <div className="space-y-1.5">
                    {step.checklistItems.map((item, i) => {
                      const key = `${step.order}-${i}`;
                      const done = checkedItems.has(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleItem(key)}
                          className="flex items-start gap-2 w-full text-left group"
                        >
                          {done
                            ? <CheckSquare size={14} className="text-primary shrink-0 mt-0.5" />
                            : <Square size={14} className="text-text-muted shrink-0 mt-0.5 group-hover:text-text-secondary" />}
                          <span className={`text-xs ${done ? 'line-through text-text-muted' : 'text-text-secondary'}`}>
                            {item}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {playbook.tags.map((t) => (
                <span key={t} className="text-xs bg-surface-light border border-border text-text-muted px-1.5 py-0.5 rounded">
                  <Tag size={10} className="inline mr-0.5" />{t}
                </span>
              ))}
            </div>
            <Tooltip text="Use this playbook as a template for a new incident" side="top">
              <button className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors font-medium">
                Use as Incident Template
              </button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Playbooks() {
  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Playbooks</h1>
          <p className="text-sm text-text-muted mt-1">
            Pre-defined incident response procedures with step-by-step checklists. Open a playbook during an incident to guide your team.
          </p>
        </div>
        <Tooltip text="Create a new incident response playbook" side="bottom">
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} />
          New Playbook
        </button>
        </Tooltip>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        {[
          { label: 'Playbooks', value: mockPlaybooks.length, color: '#FF6200' },
          { label: 'Total Steps', value: mockPlaybooks.reduce((s, p) => s + p.steps.length, 0), color: '#FFA502' },
          { label: 'Checklist Items', value: mockPlaybooks.reduce((s, p) => s + p.steps.reduce((ss, step) => ss + step.checklistItems.length, 0), 0), color: '#2ED573' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Playbooks */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        {mockPlaybooks.map((pb) => (
          <PlaybookCard key={pb.id} playbook={pb} />
        ))}
      </div>
    </div>
  );
}


