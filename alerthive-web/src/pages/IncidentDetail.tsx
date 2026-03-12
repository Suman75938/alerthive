import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Users, Clock, Phone, MoreHorizontal, MessageSquarePlus, Building2, Cpu, Brain, Send } from 'lucide-react';
import { mockIncidents, mockStakeholderUpdates, mockSimilarIncidents, mockCMDBAssets } from '../data/mockData';
import { IncidentStatus, TimelineEvent, AlertPriority } from '../types';

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

const timelineTypeColors: Record<TimelineEvent['type'], string> = {
  created: '#1E90FF',
  acknowledged: '#FFA502',
  escalated: '#FF4757',
  comment: '#B0A8C8',
  status_change: '#FFA502',
  assigned: '#1E90FF',
  resolved: '#2ED573',
};

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function durationMins(createdAt: string) {
  return Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
}

export function IncidentDetail() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'stakeholders' | 'cmdb' | 'ai'>('overview');

  const incident = mockIncidents.find((i) => i.id === incidentId);
  const stakeholderUpdates = mockStakeholderUpdates.filter((u) => u.incidentId === (incident?.id === 'inc-001' ? 'INC-001' : 'NONE'));
  const similarIncidents = activeTab === 'ai' ? mockSimilarIncidents : [];
  const cmdbAssets = mockCMDBAssets.filter((a) => a.criticality === 'critical').slice(0, 3);

  if (!incident) {
    return (
      <div className="p-6 text-center text-text-muted">
        <p className="text-lg font-medium">Incident not found</p>
        <button onClick={() => navigate('/incidents')} className="mt-4 text-primary hover:underline">
          Back to Incidents
        </button>
      </div>
    );
  }

  const priority = priorityConfig[incident.priority];
  const status = statusConfig[incident.status];

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate('/incidents')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Incidents</span>
        </button>
        <button className="p-2 rounded-lg bg-surface border border-border hover:border-border-light transition-colors">
          <MoreHorizontal size={18} className="text-text-secondary" />
        </button>
      </div>

      {/* Status Banner */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm font-semibold"
        style={{ backgroundColor: `${status.color}15`, color: status.color }}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
        {status.label}
      </div>

      {/* ID + Title */}
      <p className="text-xs text-text-muted font-mono mb-1">{incident.id.toUpperCase()}</p>
      <h1 className="text-xl font-bold text-text-primary mb-2 leading-snug">{incident.title}</h1>
      <p className="text-sm text-text-secondary mb-4">{incident.description}</p>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          { icon: Bell, value: incident.alertCount, label: 'Alerts' },
          { icon: Users, value: incident.responders.length, label: 'Responders' },
          { icon: Clock, value: `${durationMins(incident.createdAt)}m`, label: 'Duration' },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-3 text-center">
            <Icon size={18} className="text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* Priority */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {incident.isMajor && (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-critical/20 text-critical border border-critical/30">
            {`\uD83D\uDD34`} MAJOR INCIDENT
          </span>
        )}
        <span
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{ color: priority.color, backgroundColor: priority.bg }}
        >
          {priority.label} Priority
        </span>
        {incident.dynatraceId && (
          <span className="text-xs text-info bg-info/10 border border-info/20 px-2.5 py-1 rounded font-mono">
            Dynatrace: {incident.dynatraceId}
          </span>
        )}
        <span className="text-xs text-text-muted">Created {formatDate(incident.createdAt)}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {([
          { key: 'overview', label: 'Overview', icon: Bell },
          { key: 'stakeholders', label: 'Stakeholders', icon: Building2 },
          { key: 'cmdb', label: 'CMDB Assets', icon: Cpu },
          { key: 'ai', label: 'AI Suggestions', icon: Brain },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ TAB: Overview Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {activeTab === 'overview' && (
        <>
      <section className="bg-surface border border-border rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Responders</p>
        <div className="space-y-3">
          {incident.responders.map((name, idx) => (
            <div key={name} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                {name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{name}</p>
                <p className="text-xs text-text-muted">{idx === 0 ? 'Incident Commander' : 'Responder'}</p>
              </div>
              <button className="p-1.5 rounded-lg bg-surface-light hover:bg-surface-highlight transition-colors">
                <Phone size={14} className="text-primary" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-surface border border-border rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Timeline</p>
        <div className="space-y-4">
          {[...incident.timeline].reverse().map((event, idx) => {
            const color = timelineTypeColors[event.type];
            return (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  </div>
                  {idx < incident.timeline.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="pb-4 min-w-0">
                  <p className="text-sm text-text-primary leading-snug">{event.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-muted">{event.user}</span>
                    <span className="text-text-muted text-xs">Ã‚Â·</span>
                    <span className="text-xs text-text-muted">{formatTime(event.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Update */}
      <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold transition-colors">
        <MessageSquarePlus size={18} />
        Add Update
      </button>
        </>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ TAB: Stakeholders Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {activeTab === 'stakeholders' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Stakeholder Updates</p>
            <span className="text-xs text-text-muted">{stakeholderUpdates.length} sent</span>
          </div>

          {stakeholderUpdates.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-muted">
              <Send size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No stakeholder updates yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stakeholderUpdates.map((upd) => (
                <div key={upd.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm text-text-primary leading-snug">{upd.message}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-green-500/20 text-green-400">sent</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {upd.channels.map((ch) => (
                      <span key={ch} className="text-xs px-2 py-0.5 bg-surface-light border border-border rounded-full text-text-muted">{ch}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-text-muted">By {upd.author}</span>
                    <span className="text-text-muted text-xs">Ã‚Â·</span>
                    <span className="text-xs text-text-muted">{formatTime(upd.sentAt)}</span>
                    <span className="text-text-muted text-xs">Ã‚Â·</span>
                    <span className="text-xs text-text-muted">{upd.recipients.length} recipients</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Send Update Form */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Send Stakeholder Update</p>
            <textarea
              className="w-full bg-[#0D0D1A] border border-border rounded-lg p-3 text-sm text-text-primary resize-none focus:outline-none focus:border-primary"
              rows={3}
              placeholder="Describe the current incident status for stakeholders..."
            />
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors">
              <Send size={15} />
              Send Update
            </button>
          </div>
        </section>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ TAB: CMDB Assets Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {activeTab === 'cmdb' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Affected Assets</p>
            <span className="text-xs text-text-muted">{cmdbAssets.length} assets</span>
          </div>

          {cmdbAssets.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-muted">
              <Cpu size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No CMDB assets linked</p>
            </div>
          ) : (
            cmdbAssets.map((asset) => (
              <div key={asset.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu size={16} className="text-primary shrink-0" />
                    <span className="text-sm font-semibold text-text-primary">{asset.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    asset.criticality === 'critical' ? 'bg-red-500/20 text-red-400' :
                    asset.criticality === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    asset.criticality === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>{asset.criticality}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted">Type</span>
                    <p className="text-text-primary capitalize">{asset.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Environment</span>
                    <p className="text-text-primary capitalize">{asset.environment}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Owner</span>
                    <p className="text-text-primary">{asset.owner}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Team</span>
                    <p className="text-text-primary">{asset.team}</p>
                  </div>
                </div>
                {asset.dependencies && asset.dependencies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-text-muted">Dependencies</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {asset.dependencies.map((dep) => (
                        <span key={dep} className="text-xs px-2 py-0.5 bg-[#0D0D1A] border border-border rounded-full text-text-muted">{dep}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ TAB: AI Suggestions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {activeTab === 'ai' && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={14} className="text-primary" />
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">AI-Powered Similar Incidents</p>
          </div>

          {similarIncidents.map((sim) => (
            <div key={sim.id} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs text-text-muted font-mono">{sim.id}</p>
                  <p className="text-sm text-text-primary font-medium mt-0.5">{sim.title}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  sim.similarityScore >= 80 ? 'bg-green-500/20 text-green-400' :
                  sim.similarityScore >= 60 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>{sim.similarityScore}%</span>
              </div>
              {/* Similarity bar */}
              <div className="w-full h-1.5 bg-border rounded-full mb-3">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${sim.similarityScore}%`,
                    backgroundColor: sim.similarityScore >= 80 ? '#22c55e' : sim.similarityScore >= 60 ? '#f59e0b' : '#6b7280'
                  }}
                />
              </div>
              <p className="text-xs text-text-muted leading-relaxed mb-2">{sim.resolutionSummary}</p>
              {sim.linkedKBArticleId && (
                <span className="text-xs text-primary underline cursor-pointer">
                  View KB: {sim.linkedKBArticleId}
                </span>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}


