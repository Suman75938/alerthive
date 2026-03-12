import { Phone, Mail, RefreshCw, Shield } from 'lucide-react';
import { mockSchedules, mockTeamMembers } from '../data/mockData';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function OnCall() {
  const onCallMembers = mockTeamMembers.filter((m) => m.isOnCall);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-text-primary">On-Call</h1>
        <div className="flex items-center gap-2 text-xs text-low bg-low/10 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-low animate-pulse" />
          {onCallMembers.length} on-call now
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
        {[
          { label: 'On-Call Now', value: onCallMembers.length, color: '#2ED573' },
          { label: 'Total Members', value: mockTeamMembers.length, color: '#1E90FF' },
          { label: 'Schedules', value: mockSchedules.length, color: '#FFA502' },
          { label: 'Teams', value: [...new Set(mockSchedules.map((s) => s.team))].length, color: '#FF6200' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Current On-Call Banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-primary" />
          <span className="text-sm font-semibold text-primary">Currently On-Call</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {onCallMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                {member.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{member.name}</p>
                <p className="text-xs text-text-muted">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedules */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Rotation Schedules</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
          {mockSchedules.map((schedule) => (
            <div key={schedule.id} className="bg-surface border border-border rounded-xl p-3">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-text-primary">{schedule.name}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{schedule.team}</p>
                </div>
                <span className="text-xs font-medium text-text-secondary bg-surface-light px-2.5 py-1 rounded-full capitalize flex items-center gap-1">
                  <RefreshCw size={10} />
                  {schedule.rotationType}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Current */}
                <div className="bg-surface-light rounded-xl p-3">
                  <p className="text-xs text-text-muted mb-2">Current On-Call</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {schedule.currentOnCall.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{schedule.currentOnCall.name}</p>
                      <p className="text-xs text-text-muted truncate">{schedule.currentOnCall.role}</p>
                    </div>
                    <span className="ml-auto w-2 h-2 rounded-full bg-low shrink-0" />
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    Until {formatDate(schedule.rotationEnd)}
                  </p>
                </div>

                {/* Next */}
                <div className="bg-surface-light rounded-xl p-3">
                  <p className="text-xs text-text-muted mb-2">Next On-Call</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-highlight flex items-center justify-center text-text-secondary text-xs font-bold shrink-0">
                      {schedule.nextOnCall.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{schedule.nextOnCall.name}</p>
                      <p className="text-xs text-text-muted truncate">{schedule.nextOnCall.role}</p>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    Starts {formatDate(schedule.rotationEnd)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Full Team */}
      <section>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Team Directory</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {mockTeamMembers.map((member) => (
            <div key={member.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  backgroundColor: member.isOnCall ? 'rgba(255,98,0,0.2)' : '#1E1440',
                  color: member.isOnCall ? '#FF6200' : '#B0A8C8',
                }}
              >
                {member.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary truncate">{member.name}</p>
                  {member.isOnCall && (
                    <span className="text-xs bg-low/15 text-low px-1.5 py-0.5 rounded shrink-0">
                      On-Call
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted truncate">{member.role}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a href={`tel:${member.phone}`} className="p-1.5 rounded-lg bg-surface-light hover:bg-surface-highlight transition-colors">
                  <Phone size={13} className="text-primary" />
                </a>
                <a href={`mailto:${member.email}`} className="p-1.5 rounded-lg bg-surface-light hover:bg-surface-highlight transition-colors">
                  <Mail size={13} className="text-primary" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


