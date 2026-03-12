import { useState } from 'react';
import { Bell, Mail, MessageSquare, Phone, ToggleLeft, ToggleRight, Plus, Slack, Globe } from 'lucide-react';
import { mockNotificationChannels } from '../data/mockData';
import { NotificationChannel, NotificationChannelType } from '../types';
import { Tooltip } from '../components/Tooltip';

const channelConfig: Record<
  NotificationChannelType,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  slack: { label: 'Slack', icon: MessageSquare, color: '#E8D5FF', bgColor: '#4A154B' },
  teams: { label: 'Microsoft Teams', icon: Globe, color: '#C7D3FF', bgColor: '#464EB8' },
  email: { label: 'Email', icon: Mail, color: '#C3E8FF', bgColor: '#1E90FF' },
  sms: { label: 'SMS', icon: MessageSquare, color: '#C6FFD9', bgColor: '#2ED573' },
  push: { label: 'Push Notification', icon: Bell, color: '#FFE5C3', bgColor: '#FFA502' },
  phone: { label: 'Phone Call', icon: Phone, color: '#FFCDD3', bgColor: '#FF4757' },
  webhook: { label: 'Webhook', icon: Globe, color: '#D3D3D3', bgColor: '#666680' },

};

function maskSecret(value: string): string {
  if (!value || value === '***masked***') return 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢';
  if (value.startsWith('https://')) {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}/â€¢â€¢â€¢`;
  }
  return `${value.substring(0, 4)}${'â€¢'.repeat(Math.min(value.length - 4, 12))}`;
}

function ConfigRow({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-xs text-text-secondary font-mono">
        {secret ? maskSecret(value) : value}
      </span>
    </div>
  );
}

function ChannelCard({ channel }: { channel: NotificationChannel }) {
  const [enabled, setEnabled] = useState(channel.enabled);
  const cfg = channelConfig[channel.type];
  const Icon = cfg.icon;

  const configEntries = Object.entries(channel.config);

  return (
    <div className={`bg-surface border rounded-xl overflow-hidden transition-all ${enabled ? 'border-border' : 'border-border/40 opacity-60'}`}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${cfg.bgColor}25` }}
        >
          <Icon size={20} style={{ color: cfg.color.includes('FF') || cfg.color.startsWith('#') ? cfg.bgColor : cfg.bgColor }} className="opacity-90" />
        </div>
        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary leading-tight">{channel.name}</p>
          <p className="text-xs text-text-muted mt-0.5">{cfg.label}</p>
          {(channel.isGlobal
            ? <span className="text-xs text-primary mt-1 inline-block">Global channel</span>
            : channel.teamId
            ? <span className="text-xs text-text-muted mt-1 inline-block">Team: {channel.teamId}</span>
            : null)}
        </div>
        {/* Toggle */}
        <Tooltip text={enabled ? 'Disable this channel' : 'Enable this channel'} side="left">
        <button
          onClick={() => setEnabled((v) => !v)}
          className="transition-colors shrink-0"
        >
          {enabled
            ? <ToggleRight size={24} className="text-primary" />
            : <ToggleLeft size={24} className="text-text-muted" />}
        </button>
        </Tooltip>
      </div>

      {/* Config rows */}
      {configEntries.length > 0 && (
        <div className="px-4 pb-3 border-t border-border pt-3">
          {configEntries.map(([key, value]) => (
            <ConfigRow
              key={key}
              label={key.replace(/([A-Z])/g, ' $1').trim()}
              value={value}
              secret={key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('url')}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between">
        <span className="text-xs text-text-muted">Added {new Date(channel.createdAt).toLocaleDateString()}</span>
        <Tooltip text="Configure this notification channel" side="top">
          <button className="text-xs text-primary hover:underline">Configure</button>
        </Tooltip>
      </div>
    </div>
  );
}

export default function NotificationChannels() {
  const [filterType, setFilterType] = useState<NotificationChannelType | 'all'>('all');

  const types = [...new Set(mockNotificationChannels.map((c) => c.type))];
  const filtered = filterType === 'all' ? mockNotificationChannels : mockNotificationChannels.filter((c) => c.type === filterType);

  const enabled = mockNotificationChannels.filter((c) => c.enabled).length;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notification Channels</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure how AlertHive delivers alerts â€” SMS, email, phone calls, push, Slack, Teams, webhooks.
          </p>
        </div>
        <Tooltip text="Add a new notification channel" side="bottom">
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} />
          Add Channel
        </button>
        </Tooltip>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        {[
          { label: 'Total Channels', value: mockNotificationChannels.length, color: '#FF6200' },
          { label: 'Active', value: enabled, color: '#2ED573' },
          { label: 'Disabled', value: mockNotificationChannels.length - enabled, color: '#B0A8C8' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter by type */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${filterType === 'all' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text-primary'}`}
        >
          All ({mockNotificationChannels.length})
        </button>
        {types.map((t) => {
          const cfg = channelConfig[t];
          const count = mockNotificationChannels.filter((c) => c.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${filterType === t ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text-primary'}`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Channel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map((ch) => (
          <ChannelCard key={ch.id} channel={ch} />
        ))}
      </div>
    </div>
  );
}


