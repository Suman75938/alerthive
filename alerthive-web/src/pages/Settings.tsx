import { Bell, Shield, Moon, Globe, User, ChevronRight, Mail, Smartphone, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SettingRowProps {
  label: string;
  description?: string;
  value?: string;
  toggle?: boolean;
  toggleOn?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}

function SettingRow({ label, description, value, toggle, toggleOn, onToggle, onClick }: SettingRowProps) {
  return (
    <button
      onClick={toggle ? onToggle : onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-light transition-colors text-left"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <div className="ml-4 shrink-0">
        {toggle ? (
          <div
            className={`w-10 h-5 rounded-full relative transition-colors ${toggleOn ? 'bg-primary' : 'bg-surface-highlight'}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${toggleOn ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </div>
        ) : value ? (
          <span className="text-sm text-text-secondary">{value}</span>
        ) : (
          <ChevronRight size={16} className="text-text-muted" />
        )}
      </div>
    </button>
  );
}

interface SettingSection {
  title: string;
  icon: React.ReactNode;
  rows: SettingRowProps[];
}

export function Settings() {
  const { user } = useAuth();

  const roleLabel = user
    ? ({ admin: 'Platform Admin', developer: 'Developer', end_user: 'End User' } as Record<string, string>)[user.role] ?? user.role
    : '';

  const initials = user
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const sections: SettingSection[] = [
    {
      title: 'Profile',
      icon: <User size={16} className="text-primary" />,
      rows: [
        { label: 'Name',  value: user?.name  ?? 'â€”' },
        { label: 'Email', value: user?.email ?? 'â€”' },
        { label: 'Role',  value: roleLabel },
        { label: 'Phone', value: user?.phone ?? 'â€”' },
      ],
    },
    {
      title: 'Notifications',
      icon: <Bell size={16} className="text-medium" />,
      rows: [
        { label: 'Push Notifications', description: 'Receive alerts on this device', toggle: true, toggleOn: true },
        { label: 'Email Notifications', description: 'Get summaries and escalations by email', toggle: true, toggleOn: true },
        { label: 'SMS Alerts', description: 'Critical alerts via SMS', toggle: true, toggleOn: false },
        { label: 'Notification Sound', description: 'Play sound for incoming alerts', toggle: true, toggleOn: true },
      ],
    },
    {
      title: 'Alert Preferences',
      icon: <Shield size={16} className="text-critical" />,
      rows: [
        { label: 'Critical Alert Threshold', value: 'Immediate' },
        { label: 'High Priority Threshold', value: '5 min delay' },
        { label: 'Escalation Policy', value: 'Default' },
        { label: 'Auto-Acknowledge', description: 'Automatically acknowledge low-priority alerts', toggle: true, toggleOn: false },
      ],
    },
    {
      title: 'Appearance',
      icon: <Moon size={16} className="text-info" />,
      rows: [
        { label: 'Theme', value: 'Dark' },
        { label: 'Compact Mode', description: 'Show more items per screen', toggle: true, toggleOn: false },
        { label: 'Timezone', value: 'UTC-5 (EST)' },
      ],
    },
    {
      title: 'Integrations',
      icon: <Globe size={16} className="text-low" />,
      rows: [
        { label: 'Dynatrace', value: 'Connected' },
        { label: 'Datadog', value: 'Connected' },
        { label: 'Slack', value: 'Not connected' },
        { label: 'GitHub Actions', value: 'Connected' },
        { label: 'Kubernetes', value: 'Connected' },
      ],
    },
  ];

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-3">Settings</h1>

      {/* Profile Card */}
      <div className="bg-surface border border-border rounded-xl p-3 mb-3 flex items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-base font-bold text-text-primary">{user?.name ?? 'â€”'}</p>
          <p className="text-sm text-text-muted">{roleLabel} Â· AlertHive</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
            <span className="flex items-center gap-1"><Mail size={11} /> {user?.email ?? 'â€”'}</span>
            {user?.phone && <span className="flex items-center gap-1"><Smartphone size={11} /> {user.phone}</span>}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {sections.map((section) => (
          <div key={section.title} className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              {section.icon}
              <span className="text-sm font-semibold text-text-primary">{section.title}</span>
            </div>
            <div className="divide-y divide-border">
              {section.rows.map((row) => (
                <SettingRow key={row.label} {...row} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* App Info */}
      <div className="mt-6 p-4 bg-surface border border-border rounded-xl text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Monitor size={14} className="text-text-muted" />
          <span className="text-xs text-text-muted">AlertHive Web v1.0.0</span>
        </div>
        <p className="text-xs text-text-muted">Â© 2026 AlertHive Â· Incident Management Platform</p>
      </div>
    </div>
  );
}


