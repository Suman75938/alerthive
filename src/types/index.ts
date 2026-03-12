export type AlertPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertStatus = 'open' | 'acknowledged' | 'closed' | 'snoozed';

export type IncidentStatus = 'triggered' | 'investigating' | 'identified' | 'monitoring' | 'resolved';

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
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: AlertPriority;
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

export type RootStackParamList = {
  Main: undefined;
  AlertDetail: { alertId: string };
  IncidentDetail: { incidentId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  OnCall: undefined;
  Settings: undefined;
};
