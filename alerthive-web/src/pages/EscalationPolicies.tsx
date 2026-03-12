import { useState } from 'react';
import { Zap, ChevronDown, ChevronUp, Phone, Mail, Bell, MessageSquare, Users, Clock, RotateCcw, X, Plus } from 'lucide-react';
import { mockEscalationPolicies as initialPolicies } from '../data/mockData';
import { EscalationPolicy, NotifyViaChannel, AlertPriority } from '../types';
import { Tooltip } from '../components/Tooltip';

const channelIcon: Record<NotifyViaChannel, { icon: React.ElementType; label: string; color: string }> = {
  email: { icon: Mail, label: 'Email', color: '#1E90FF' },
  sms: { icon: MessageSquare, label: 'SMS', color: '#2ED573' },
  push: { icon: Bell, label: 'Push', color: '#FFA502' },
  phone: { icon: Phone, label: 'Phone Call', color: '#FF4757' },
  slack: { icon: MessageSquare, label: 'Slack', color: '#4A154B' },
  teams: { icon: Users, label: 'Teams', color: '#464EB8' },
};

const priorityColors: Record<AlertPriority, string> = {
  critical: '#FF4757',
  high: '#FF6200',
  medium: '#FFA502',
  low: '#2ED573',
  info: '#1E90FF',
};

function StepCard({ step, isLast }: { step: EscalationPolicy['steps'][0]; isLast: boolean }) {
  return (
    <div className="flex gap-2">
      {/* Spine */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">{step.order}</span>
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-2 mb-0 min-h-[2rem]" />}
      </div>
      {/* Content */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-4 flex-1">
        <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-text-muted" />
              <span className="text-xs text-text-muted">
                {step.delayMinutes === 0 ? 'Immediately' : `After ${step.delayMinutes} min${step.delayMinutes !== 1 ? 's' : ''}`}
              </span>
            </div>
            {step.description && (
              <p className="text-sm text-text-secondary mt-1">{step.description}</p>
            )}
          </div>
        </div>
        {/* Responders */}
        <div className="flex items-center gap-2 flex-wrap mt-2 mb-3">
          <span className="text-xs text-text-muted font-medium">Notify:</span>
          {step.responders.map((r) => (
            <span key={r} className="text-xs bg-surface-light border border-border px-2 py-0.5 rounded-full text-text-primary">
              {r}
            </span>
          ))}
        </div>
        {/* Channels */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-muted font-medium">Via:</span>
          {step.notifyVia.map((ch) => {
            const cfg = channelIcon[ch];
            const Icon = cfg.icon;
            return (
              <span
                key={ch}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
              >
                <Icon size={11} />
                {cfg.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PolicyCard({ policy }: { policy: EscalationPolicy }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between p-3 text-left hover:bg-surface-light transition-colors"
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Zap size={15} className="text-primary shrink-0" />
            <h3 className="text-base font-semibold text-text-primary">{policy.name}</h3>
            {policy.linkedPriorities.map((p) => (
              <span
                key={p}
                className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                style={{ color: priorityColors[p], backgroundColor: `${priorityColors[p]}20` }}
              >
                {p}
              </span>
            ))}
          </div>
          <p className="text-sm text-text-secondary">{policy.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Users size={11} /> {policy.teamName}
            </span>
            <span className="flex items-center gap-1">
              <Zap size={11} /> {policy.steps.length} steps
            </span>
            <span className="flex items-center gap-1">
              <RotateCcw size={11} /> Repeats {policy.repeatCount}Ã— (every {policy.repeatDelayMinutes}m)
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-text-muted shrink-0 mt-1" />
        ) : (
          <ChevronDown size={18} className="text-text-muted shrink-0 mt-1" />
        )}
      </button>

      {/* Expanded Steps */}
      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-border">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 mt-3">Escalation Chain</p>
          <div>
            {policy.steps.map((step, idx) => (
              <StepCard key={step.order} step={step} isLast={idx === policy.steps.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewPolicyModal({ onClose, onSave }: { onClose: () => void; onSave: (p: EscalationPolicy) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamName, setTeamName] = useState('SRE Team');
  const [priorities, setPriorities] = useState<AlertPriority[]>(['critical']);
  const [repeatCount, setRepeatCount] = useState(3);
  const [repeatDelayMinutes, setRepeatDelayMinutes] = useState(30);

  // Single step for simplicity â€” first responder + channels
  const [step1Responders, setStep1Responders] = useState('On-Call Engineer');
  const [step1Channels, setStep1Channels] = useState<NotifyViaChannel[]>(['push', 'email']);

  const allPriorities: AlertPriority[] = ['critical', 'high', 'medium', 'low', 'info'];
  const allChannels: { key: NotifyViaChannel; label: string }[] = [
    { key: 'push', label: 'Push' }, { key: 'email', label: 'Email' },
    { key: 'sms', label: 'SMS' }, { key: 'phone', label: 'Phone' },
    { key: 'slack', label: 'Slack' }, { key: 'teams', label: 'Teams' },
  ];

  function togglePriority(p: AlertPriority) {
    setPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }
  function toggleChannel(c: NotifyViaChannel) {
    setStep1Channels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || step1Channels.length === 0) return;
    const now = new Date().toISOString();
    onSave({
      id: `ep-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      teamId: `team-${Date.now()}`,
      teamName,
      linkedPriorities: priorities,
      repeatCount,
      repeatDelayMinutes,
      createdAt: now,
      steps: [
        { order: 1, delayMinutes: 0, responders: step1Responders.split(',').map(r => r.trim()).filter(Boolean), notifyVia: step1Channels, description: 'Initial notification' },
        { order: 2, delayMinutes: repeatDelayMinutes, responders: ['Team Lead'], notifyVia: ['phone', 'sms'], description: 'Escalate if unresolved' },
      ],
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-surface border border-border-light rounded-2xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-base font-bold text-text-primary">New Escalation Policy</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-2">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Policy Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Critical P1 Response" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Team</label>
            <input value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-2">Applies to priorities</label>
            <div className="flex gap-2 flex-wrap">
              {allPriorities.map(p => (
                <button key={p} type="button" onClick={() => togglePriority(p)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${priorities.includes(p) ? 'border-primary bg-primary/20 text-text-primary' : 'border-border text-text-muted hover:text-text-primary'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Step 1 â€” Responders (comma-separated)</label>
            <input value={step1Responders} onChange={e => setStep1Responders(e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-2">Step 1 â€” Notify via *</label>
            <div className="flex gap-2 flex-wrap">
              {allChannels.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => toggleChannel(key)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${step1Channels.includes(key) ? 'border-primary bg-primary/20 text-text-primary' : 'border-border text-text-muted hover:text-text-primary'}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Repeat count</label>
              <input type="number" min={1} max={10} value={repeatCount} onChange={e => setRepeatCount(Number(e.target.value))} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Repeat every (min)</label>
              <input type="number" min={5} value={repeatDelayMinutes} onChange={e => setRepeatDelayMinutes(Number(e.target.value))} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-text-muted hover:text-text-primary transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors">Create Policy</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EscalationPolicies() {
  const [policies, setPolicies] = useState<EscalationPolicy[]>(initialPolicies);
  const [showModal, setShowModal] = useState(false);
  return (
    <div className="p-4 max-w-7xl mx-auto">
      {showModal && (
        <NewPolicyModal onClose={() => setShowModal(false)} onSave={(p) => setPolicies((prev) => [p, ...prev])} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Escalation Policies</h1>
          <p className="text-sm text-text-muted mt-1">
            Define multi-step auto-escalation chains with per-step responders and notification channels.
          </p>
        </div>
        <Tooltip text="Create a new escalation policy" side="bottom">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Zap size={15} />
          New Policy
        </button>
        </Tooltip>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        {[
          { label: 'Total Policies', value: policies.length, color: '#FF6200' },
          { label: 'Avg Steps', value: Math.round(policies.reduce((a, p) => a + p.steps.length, 0) / Math.max(policies.length, 1)), color: '#FFA502' },
          { label: 'Teams Covered', value: [...new Set(policies.map((p) => p.teamName))].length, color: '#2ED573' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Policy List */}
      <div className="space-y-3">
        {policies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} />
        ))}
      </div>
    </div>
  );
}


