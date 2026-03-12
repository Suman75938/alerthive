import { LucideIcon } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
  tooltip?: string;
}

export function StatCard({ title, value, icon: Icon, color, subtitle, tooltip }: StatCardProps) {
  const card = (
    <div className="rounded-lg p-2.5 bg-surface border border-border flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold text-text-primary leading-none">{value}</p>
        <p className="text-xs text-text-secondary mt-0.5 truncate">{title}</p>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
  if (tooltip) {
    return <Tooltip text={tooltip} side="bottom" wrapperClass="block">{card}</Tooltip>;
  }
  return card;
}
