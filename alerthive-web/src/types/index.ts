export type AlertPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertStatus = 'open' | 'acknowledged' | 'closed' | 'snoozed';

export type IncidentStatus = 'triggered' | 'investigating' | 'identified' | 'monitoring' | 'resolved';

// ─── Auth & Roles ────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'developer' | 'end_user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  team?: string;
  phone?: string;
  createdAt: string;
}

// ─── SLA ─────────────────────────────────────────────────────────────────────
export interface SLAPolicy {
  id: string;
  severity: AlertPriority;
  /** Minutes until first response required */
  responseTimeMinutes: number;
  /** Minutes until ticket must be resolved */
  resolutionTimeMinutes: number;
  escalateAfterMinutes: number;
  description: string;
  enabled: boolean;
}

// ─── Ticket ──────────────────────────────────────────────────────────────────
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'on_hold';

export type IssueCategory = 'system_issue' | 'application_issue' | 'others';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: AlertPriority;
  status: TicketStatus;
  issueCategory: IssueCategory;
  rootCause?: string;
  resolution?: string;
  raisedBy: string; // user id
  raisedByName: string;
  assignedTo?: string; // user id
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaBreached: boolean;
  slaDueAt: string; // ISO date when SLA expires
  tags: string[];
  comments: TicketComment[];
}

export interface AlertMetadata {
  fingerprint?: string;
  duplicateCount?: number;
  lastDuplicateAt?: string;
  [key: string]: unknown;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  source: string;
  priority: AlertPriority;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  assignee?: string;
  tags: string[];
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  metadata?: AlertMetadata;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: AlertPriority;
  isMajor?: boolean;
  dynatraceId?: string;
  createdAt: string;
  updatedAt: string;
  assignee: string;
  responders: string[];
  alertCount: number;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  type: 'created' | 'acknowledged' | 'escalated' | 'comment' | 'status_change' | 'assigned' | 'resolved';
  message: string;
  user: string;
  timestamp: string;
}

export interface OnCallSchedule {
  id: string;
  name: string;
  team: string;
  currentOnCall: TeamMember;
  nextOnCall: TeamMember;
  rotationStart: string;
  rotationEnd: string;
  rotationType: 'daily' | 'weekly' | 'biweekly';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  isOnCall: boolean;
  phone?: string;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  scheduleId: string;
}

export interface TicketComment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

// ─── Problem Management ───────────────────────────────────────────────────────
export type ProblemStatus = 'detected' | 'investigating' | 'known_error' | 'resolved' | 'closed';

export interface FiveWhyEntry {
  why: number; // 1–5
  question: string;
  answer: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  status: ProblemStatus;
  priority: AlertPriority;
  linkedIncidentIds: string[];
  rootCause?: string;
  workaround?: string;
  knownError: boolean;
  knownErrorDescription?: string;
  fiveWhys: FiveWhyEntry[];
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  tags: string[];
}

// ─── Change Management ────────────────────────────────────────────────────────
export type ChangeStatus = 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
export type ChangeType = 'standard' | 'normal' | 'emergency';
export type ChangeRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ChangeApproval {
  id: string;
  approver: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  timestamp?: string;
}

export interface Change {
  id: string;
  title: string;
  description: string;
  status: ChangeStatus;
  type: ChangeType;
  risk: ChangeRisk;
  riskScore: number; // 0–100
  raisedBy: string;
  assignee?: string;
  approvals: ChangeApproval[];
  scheduledStart: string;
  scheduledEnd: string;
  implementationPlan: string;
  backoutPlan: string;
  affectedServices: string[];
  linkedIncidentIds: string[];
  linkedProblemIds: string[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────
export type KBArticleStatus = 'draft' | 'published' | 'archived';
export type KBCategory = 'how-to' | 'troubleshooting' | 'known-error' | 'runbook' | 'policy' | 'faq';

export interface KBArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: KBCategory;
  status: KBArticleStatus;
  author: string;
  tags: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  linkedIncidentIds: string[];
  linkedProblemIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Postmortem ───────────────────────────────────────────────────────────────
export interface PostmortemActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: 'open' | 'in_progress' | 'completed';
}

export interface Postmortem {
  id: string;
  incidentId: string;
  incidentTitle: string;
  summary: string;
  detectedAt: string;
  resolvedAt: string;
  durationMinutes: number;
  severity: AlertPriority;
  impactSummary: string;
  contributingFactors: string[];
  rootCause: string;
  fiveWhys: FiveWhyEntry[];
  whatWentWell: string[];
  whatWentWrong: string[];
  actionItems: PostmortemActionItem[];
  author: string;
  attendees: string[];
  createdAt: string;
  status: 'draft' | 'review' | 'published';
}

// ─── Service Catalog ──────────────────────────────────────────────────────────
export type ServiceCatalogCategory = 'access' | 'hardware' | 'software' | 'network' | 'security' | 'data' | 'other';

export interface ServiceCatalogItem {
  id: string;
  title: string;
  description: string;
  category: ServiceCatalogCategory;
  icon: string;
  slaHours: number;
  approvalRequired: boolean;
  popularity: number;
  tags: string[];
}

// ─── Heartbeat Monitoring ─────────────────────────────────────────────────────
export type HeartbeatStatus = 'active' | 'expired' | 'paused';
export type HeartbeatIntervalUnit = 'seconds' | 'minutes' | 'hours' | 'days';

export interface Heartbeat {
  id: string;
  name: string;
  description: string;
  interval: number;
  unit: HeartbeatIntervalUnit;
  status: HeartbeatStatus;
  lastPingAt?: string;
  expiresAt?: string;
  team: string;
  tags: string[];
  alertOnExpiry: boolean;
  alertPriority: AlertPriority;
  createdAt?: string;
}

// ─── Alert Routing Rules ──────────────────────────────────────────────────────
export type RoutingConditionField = 'priority' | 'source' | 'tag' | 'message' | 'team';
export type RoutingConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'matches';

export interface RoutingCondition {
  field: RoutingConditionField;
  operator: RoutingConditionOperator;
  value: string;
}

export interface AlertRoutingRule {
  id: string;
  name: string;
  description: string;
  conditions: RoutingCondition[];
  conditionLogic: 'all' | 'any';
  targetTeam: string;
  priorityOverride?: AlertPriority;
  escalationPolicyId?: string;
  enabled: boolean;
  order: number;
  createdAt: string;
}

// ─── Escalation Policies ─────────────────────────────────────────────────────
export type NotifyViaChannel = 'email' | 'sms' | 'push' | 'phone' | 'slack' | 'teams';

export interface EscalationStep {
  order: number;
  delayMinutes: number;
  responders: string[];
  notifyVia: NotifyViaChannel[];
  description?: string;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  steps: EscalationStep[];
  repeatCount: number;
  repeatDelayMinutes: number;
  teamId: string;
  teamName: string;
  linkedPriorities: AlertPriority[];
  createdAt: string;
}

// ─── Maintenance Windows ──────────────────────────────────────────────────────
export type MaintenanceWindowStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  affectedServices: string[];
  affectedTeams: string[];
  status: MaintenanceWindowStatus;
  suppressAlerts: boolean;
  createdBy: string;
  createdAt: string;
}

// ─── Notification Channels ────────────────────────────────────────────────────
export type NotificationChannelType = 'sms' | 'email' | 'phone' | 'push' | 'slack' | 'teams' | 'webhook';

export interface NotificationChannel {
  id: string;
  name: string;
  type: NotificationChannelType;
  config: Record<string, string>;
  enabled: boolean;
  userId?: string;
  teamId?: string;
  isGlobal: boolean;
  createdAt: string;
}

// ─── Playbooks / Incident Templates ──────────────────────────────────────────
export interface PlaybookStep {
  order: number;
  title: string;
  description: string;
  responsible: string;
  estimatedMinutes: number;
  checklistItems: string[];
}

export interface Playbook {
  id: string;
  title: string;
  description: string;
  triggerConditions: string[];
  linkedPriorities: AlertPriority[];
  steps: PlaybookStep[];
  tags: string[];
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

// ─── CMDB / Asset Context ─────────────────────────────────────────────────────
export type CMDBAssetType = 'service' | 'database' | 'server' | 'load_balancer' | 'queue' | 'storage' | 'network';
export type CMDBEnvironment = 'production' | 'staging' | 'development' | 'dr';
export type CMDBCriticality = 'critical' | 'high' | 'medium' | 'low';

export interface CMDBAsset {
  id: string;
  name: string;
  type: CMDBAssetType;
  service: string;
  environment: CMDBEnvironment;
  owner: string;
  team: string;
  dependencies: string[];
  criticality: CMDBCriticality;
  version?: string;
  hostnames: string[];
  tags: string[];
}

// ─── Dynatrace / External Integrations ────────────────────────────────────────
export type DynatraceProblemType = 'availability' | 'error' | 'performance' | 'resource' | 'custom';

export interface DynatracePriorityMapping {
  dynatraceType: DynatraceProblemType;
  alertPriority: AlertPriority;
  description: string;
}

export interface DynatraceIntegration {
  id: string;
  name: string;
  environmentUrl: string;
  apiToken: string; // masked in UI
  webhookUrl: string;
  enabled: boolean;
  biDirectionalSync: boolean;
  priorityMappings: DynatracePriorityMapping[];
  lastSyncAt?: string;
  problemFilters: string[];
}

export interface Integration {
  id: string;
  name: string;
  type: 'dynatrace' | 'datadog' | 'prometheus' | 'grafana' | 'slack' | 'teams';
  status: 'connected' | 'disconnected' | 'error';
  description: string;
  iconColor: string;
  configuredAt?: string;
  lastEventAt?: string;
  eventCount: number;
}

// ─── Stakeholder Updates ──────────────────────────────────────────────────────
export interface StakeholderUpdate {
  id: string;
  incidentId: string;
  message: string;
  author: string;
  sentAt: string;
  channels: NotifyViaChannel[];
  recipients: string[];
}

// ─── Similar Incidents (AI suggestion) ───────────────────────────────────────
export interface SimilarIncident {
  id: string;
  title: string;
  resolvedAt: string;
  resolutionSummary: string;
  similarityScore: number; // 0-100
  linkedKBArticleId?: string;
}
