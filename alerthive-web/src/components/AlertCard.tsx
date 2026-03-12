import { useNavigate } from 'react-router-dom';
import { Clock, Tag, Repeat2 } from 'lucide-react';
import { Alert, AlertPriority, AlertStatus } from '../types';

const priorityConfig: Record<AlertPriority, { color: string; bg: string; label: string }> = {
  critical: { color: '#FF4757', bg: 'rgba(255,71,87,0.12)', label: 'Critical' },
  high: { color: '#FF6200', bg: 'rgba(255,98,0,0.12)', label: 'High' },
  medium: { color: '#FFA502', bg: 'rgba(255,165,2,0.12)', label: 'Medium' },
  low: { color: '#2ED573', bg: 'rgba(46,213,115,0.12)', label: 'Low' },
  info: { color: '#1E90FF', bg: 'rgba(30,144,255,0.12)', label: 'Info' },
};

const statusConfig: Record<AlertStatus, { color: string; label: string }> = {
  open: { color: '#FF4757', label: 'Open' },
  acknowledged: { color: '#FFA502', label: 'Acknowledged' },
  closed: { color: '#2ED573', label: 'Closed' },
  snoozed: { color: '#1E90FF', label: 'Snoozed' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface AlertCardProps {
  alert: Alert;
  onPress?: (alert: Alert) => void;
}

export function AlertCard({ alert, onPress }: AlertCardProps) {
  const navigate = useNavigate();
  const priority = priorityConfig[alert.priority];
  const status = statusConfig[alert.status];

  const handleClick = () => {
    if (onPress) onPress(alert);
    else navigate(`/alerts/${alert.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-surface border border-border rounded-xl p-4 cursor-pointer hover:border-border-light hover:bg-surface-light transition-colors h-full"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
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
          {(alert.metadata?.duplicateCount ?? 0) > 1 && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent">
              <Repeat2 size={10} />
              {alert.metadata!.duplicateCount} hits
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-text-muted text-xs shrink-0">
          <Clock size={11} />
          <span>{timeAgo(alert.createdAt)}</span>
        </div>
      </div>

      <p className="text-sm font-semibold text-text-primary leading-snug mb-1 line-clamp-2">
        {alert.title}
      </p>

      <p className="text-xs text-text-secondary line-clamp-2 mb-3">{alert.message}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted font-medium">{alert.source}</span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {alert.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 text-xs text-text-muted bg-surface-highlight px-2 py-0.5 rounded"
            >
              <Tag size={9} />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
