import { useNavigate } from 'react-router-dom';
import { Bell, Users, Clock } from 'lucide-react';
import { Incident, AlertPriority, IncidentStatus } from '../types';

const priorityConfig: Record<AlertPriority, { color: string; bg: string; label: string }> = {
  critical: { color: '#FF4757', bg: 'rgba(255,71,87,0.12)', label: 'Critical' },
  high: { color: '#FF6200', bg: 'rgba(255,98,0,0.12)', label: 'High' },
  medium: { color: '#FFA502', bg: 'rgba(255,165,2,0.12)', label: 'Medium' },
  low: { color: '#2ED573', bg: 'rgba(46,213,115,0.12)', label: 'Low' },
  info: { color: '#1E90FF', bg: 'rgba(30,144,255,0.12)', label: 'Info' },
};

const statusConfig: Record<IncidentStatus, { color: string; label: string }> = {
  triggered: { color: '#FF4757', label: 'Triggered' },
  investigating: { color: '#FF6200', label: 'Investigating' },
  identified: { color: '#FFA502', label: 'Identified' },
  monitoring: { color: '#1E90FF', label: 'Monitoring' },
  resolved: { color: '#2ED573', label: 'Resolved' },
};

function durationMins(createdAt: string) {
  return Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
}

interface IncidentCardProps {
  incident: Incident;
  onPress?: (incident: Incident) => void;
}

export function IncidentCard({ incident, onPress }: IncidentCardProps) {
  const navigate = useNavigate();
  const priority = priorityConfig[incident.priority];
  const status = statusConfig[incident.status];

  const handleClick = () => {
    if (onPress) onPress(incident);
    else navigate(`/incidents/${incident.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-surface border border-border rounded-xl p-4 cursor-pointer hover:border-border-light hover:bg-surface-light transition-colors h-full"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {incident.isMajor && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-critical/20 text-critical border border-critical/30 animate-pulse">
              {`\uD83D\uDD34`} MAJOR
            </span>
          )}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: priority.color, backgroundColor: priority.bg }}
          >
            {priority.label}
          </span>
          <span className="text-xs font-medium flex items-center gap-1" style={{ color: status.color }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {incident.dynatraceId && (
            <span className="text-xs text-info bg-info/10 px-1.5 py-0.5 rounded font-mono border border-info/20">
              {incident.dynatraceId}
            </span>
          )}
          <span className="text-xs text-text-muted font-mono">{incident.id.toUpperCase()}</span>
        </div>
      </div>

      <p className="text-sm font-semibold text-text-primary mb-1">{incident.title}</p>
      <p className="text-xs text-text-secondary line-clamp-2 mb-3">{incident.description}</p>

      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <Bell size={12} />
          {incident.alertCount} alerts
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {incident.responders.length} responders
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {durationMins(incident.createdAt)}m
        </span>
        <span className="ml-auto font-medium text-text-secondary">{incident.assignee}</span>
      </div>
    </div>
  );
}
