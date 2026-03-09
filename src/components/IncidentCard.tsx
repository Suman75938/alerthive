import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Incident, IncidentStatus, AlertPriority } from '../types';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, FontSize } from '../theme/spacing';

interface IncidentCardProps {
  incident: Incident;
  onPress: (incident: Incident) => void;
}

const statusConfig: Record<IncidentStatus, { color: string; icon: string; label: string }> = {
  triggered: { color: Colors.critical, icon: 'flash', label: 'Triggered' },
  investigating: { color: Colors.high, icon: 'search', label: 'Investigating' },
  identified: { color: Colors.medium, icon: 'eye', label: 'Identified' },
  monitoring: { color: Colors.snooze, icon: 'pulse', label: 'Monitoring' },
  resolved: { color: Colors.close, icon: 'checkmark-circle', label: 'Resolved' },
};

const priorityColors: Record<AlertPriority, string> = {
  critical: Colors.critical,
  high: Colors.high,
  medium: Colors.medium,
  low: Colors.low,
  info: Colors.info,
};

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function IncidentCard({ incident, onPress }: IncidentCardProps) {
  const status = statusConfig[incident.status];
  const priorityColor = priorityColors[incident.priority];

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: priorityColor }]}
      onPress={() => onPress(incident)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
          <Ionicons name={status.icon as keyof typeof Ionicons.glyphMap} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        <Text style={styles.incidentId}>{incident.id.toUpperCase()}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {incident.title}
      </Text>

      <Text style={styles.description} numberOfLines={2}>
        {incident.description}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="notifications-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.statText}>{incident.alertCount} alerts</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.statText}>{incident.responders.length} responders</Text>
        </View>
        <Text style={styles.time}>{getTimeAgo(incident.createdAt)}</Text>
      </View>

      <View style={styles.respondersRow}>
        <Ionicons name="person-circle-outline" size={14} color={Colors.textSecondary} />
        <Text style={styles.assigneeText}>
          {incident.assignee}
          {incident.responders.length > 1 && ` +${incident.responders.length - 1}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderLeftWidth: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  incidentId: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  respondersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  assigneeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
