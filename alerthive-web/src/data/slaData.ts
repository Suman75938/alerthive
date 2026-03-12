import { SLAPolicy, AlertPriority } from '../types';

export const defaultSLAPolicies: SLAPolicy[] = [
  {
    id: 'sla-critical',
    severity: 'critical',
    responseTimeMinutes: 15,
    resolutionTimeMinutes: 60,
    escalateAfterMinutes: 30,
    description: 'P1 – Service down, immediate business impact',
    enabled: true,
  },
  {
    id: 'sla-high',
    severity: 'high',
    responseTimeMinutes: 60,
    resolutionTimeMinutes: 240,
    escalateAfterMinutes: 120,
    description: 'P2 – Significant degradation, workaround exists',
    enabled: true,
  },
  {
    id: 'sla-medium',
    severity: 'medium',
    responseTimeMinutes: 240,
    resolutionTimeMinutes: 1440,
    escalateAfterMinutes: 480,
    description: 'P3 – Partial impact, standard priority',
    enabled: true,
  },
  {
    id: 'sla-low',
    severity: 'low',
    responseTimeMinutes: 480,
    resolutionTimeMinutes: 4320,
    escalateAfterMinutes: 1440,
    description: 'P4 – Minor issue, low business impact',
    enabled: true,
  },
  {
    id: 'sla-info',
    severity: 'info',
    responseTimeMinutes: 1440,
    resolutionTimeMinutes: 10080,
    escalateAfterMinutes: 2880,
    description: 'P5 – Informational, no immediate action needed',
    enabled: true,
  },
];

/** Returns SLA resolution deadline given a creation timestamp and priority */
export function getSLADueDate(createdAt: string, priority: AlertPriority, policies: SLAPolicy[]): string {
  const policy = policies.find((p) => p.severity === priority);
  const minutes = policy ? policy.resolutionTimeMinutes : 1440;
  const due = new Date(createdAt);
  due.setMinutes(due.getMinutes() + minutes);
  return due.toISOString();
}

export function isSLABreached(slaDueAt: string, resolvedAt?: string): boolean {
  const due = new Date(slaDueAt).getTime();
  const check = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  return check > due;
}

export function slaTimeLeft(slaDueAt: string): { label: string; urgent: boolean; breached: boolean } {
  const diff = new Date(slaDueAt).getTime() - Date.now();
  if (diff <= 0) return { label: 'Breached', urgent: true, breached: true };
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { label: `${mins}m left`, urgent: mins < 15, breached: false };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { label: `${hrs}h ${mins % 60}m left`, urgent: hrs < 2, breached: false };
  return { label: `${Math.floor(hrs / 24)}d left`, urgent: false, breached: false };
}
