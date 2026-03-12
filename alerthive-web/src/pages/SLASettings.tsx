import { useState } from 'react';
import { useTickets } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { Shield, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
import { AlertPriority, SLAPolicy } from '../types';
import { Tooltip } from '../components/Tooltip';

const PRIORITY_COLORS: Record<AlertPriority, string> = {
  critical: 'text-critical bg-critical/10 border-critical/30',
  high:     'text-accent bg-accent/10 border-accent/30',
  medium:   'text-medium bg-medium/10 border-medium/30',
  low:      'text-low bg-low/10 border-low/30',
  info:     'text-info bg-info/10 border-info/30',
};

function formatMins(m: number) {
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${m / 60}h`;
  return `${m / 1440}d`;
}

function SLARow({ policy, isAdmin, onUpdate }: {
  policy: SLAPolicy;
  isAdmin: boolean;
  onUpdate: (id: string, updates: Partial<SLAPolicy>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [response, setResponse] = useState(policy.responseTimeMinutes);
  const [resolution, setResolution] = useState(policy.resolutionTimeMinutes);
  const [escalate, setEscalate] = useState(policy.escalateAfterMinutes);

  function save() {
    onUpdate(policy.id, {
      responseTimeMinutes: response,
      resolutionTimeMinutes: resolution,
      escalateAfterMinutes: escalate,
    });
    setEditing(false);
  }

  return (
    <div className="bg-surface-light rounded-xl border border-border-light p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wide ${PRIORITY_COLORS[policy.severity]}`}>
            {policy.severity}
          </span>
          <p className="text-sm text-text-secondary">{policy.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip text={policy.enabled ? 'Disable this SLA policy' : 'Enable this SLA policy'} side="top">
          <button
            onClick={() => onUpdate(policy.id, { enabled: !policy.enabled })}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${policy.enabled ? 'bg-accent' : 'bg-[#3D2060]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${policy.enabled ? 'translate-x-4' : ''}`} />
          </button>
          </Tooltip>
          {isAdmin && (
            <button
              onClick={() => setEditing(!editing)}
              className="text-xs text-accent hover:underline ml-2"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Response (min)', value: response, set: setResponse },
            { label: 'Resolution (min)', value: resolution, set: setResolution },
            { label: 'Escalate after (min)', value: escalate, set: setEscalate },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-xs text-text-muted mb-1">{f.label}</label>
              <input
                type="number"
                min={1}
                value={f.value}
                onChange={(e) => f.set(+e.target.value)}
                className="w-full bg-surface border border-border-light rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </div>
          ))}
          <div className="col-span-3 flex justify-end">
            <button onClick={save} className="px-4 py-1.5 bg-accent hover:bg-accent-dark text-white text-sm rounded-lg">
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: Clock, label: 'Response', value: formatMins(policy.responseTimeMinutes) },
            { icon: Shield, label: 'Resolution', value: formatMins(policy.resolutionTimeMinutes) },
            { icon: AlertTriangle, label: 'Escalate after', value: formatMins(policy.escalateAfterMinutes) },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2">
              <m.icon className="w-4 h-4 text-text-muted" />
              <div>
                <div className="text-xs text-text-muted">{m.label}</div>
                <div className="text-sm font-semibold text-text-primary">{m.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SLASettings() {
  const { slaPolicies, updateSLAPolicy } = useTickets();
  const { isAdmin } = useAuth();

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">SLA Policies</h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure response, resolution, and escalation times for each severity level.
          {!isAdmin && ' (Read-only — contact an admin to make changes)'}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        {slaPolicies.map((p) => (
          <SLARow key={p.id} policy={p} isAdmin={isAdmin} onUpdate={updateSLAPolicy} />
        ))}
      </div>

      <div className="bg-surface rounded-xl border border-border-light p-4 text-sm text-text-muted">
        <p><strong className="text-text-secondary">Note:</strong> SLA timers start when a ticket is created. Tickets are marked as &ldquo;SLA Breached&rdquo; if not resolved within the resolution time. All times are in minutes and stored in-memory for this demo.</p>
      </div>
    </div>
  );
}


