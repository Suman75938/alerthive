import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alert, AlertPriority, AlertStatus } from '../types';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, FontSize } from '../theme/spacing';

interface AlertCardProps {
  alert: Alert;
  onPress: (alert: Alert) => void;
}

const priorityConfig: Record<AlertPriority, { color: string; bg: string; icon: string; label: string }> = {
  critical: { color: Colors.critical, bg: Colors.criticalBg, icon: 'flame', label: 'CRITICAL' },
  high: { color: Colors.high, bg: Colors.highBg, icon: 'warning', label: 'HIGH' },
  medium: { color: Colors.medium, bg: Colors.mediumBg, icon: 'alert-circle', label: 'MEDIUM' },
  low: { color: Colors.low, bg: Colors.lowBg, icon: 'information-circle', label: 'LOW' },
  info: { color: Colors.info, bg: Colors.infoBg, icon: 'chatbox-ellipses', label: 'INFO' },
};

const statusConfig: Record<AlertStatus, { color: string; label: string }> = {
  open: { color: Colors.critical, label: 'Open' },
  acknowledged: { color: Colors.acknowledge, label: 'Acknowledged' },
  closed: { color: Colors.close, label: 'Closed' },
  snoozed: { color: Colors.snooze, label: 'Snoozed' },
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

export function AlertCard({ alert, onPress }: AlertCardProps) {
  const priority = priorityConfig[alert.priority];
  const status = statusConfig[alert.status];

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: priority.color }]}
      onPress={() => onPress(alert)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
          <Ionicons name={priority.icon as keyof typeof Ionicons.glyphMap} size={12} color={priority.color} />
          <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: status.color }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {alert.title}
      </Text>

      <Text style={styles.message} numberOfLines={2}>
        {alert.message}
      </Text>

      <View style={styles.footer}>
        <View style={styles.sourceContainer}>
          <Ionicons name="cube-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.source}>{alert.source}</Text>
        </View>
        <Text style={styles.time}>{getTimeAgo(alert.createdAt)}</Text>
      </View>

      {alert.assignee && (
        <View style={styles.assigneeContainer}>
          <Ionicons name="person-circle-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.assigneeText}>{alert.assignee}</Text>
        </View>
      )}

      {alert.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {alert.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {alert.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{alert.tags.length - 3}</Text>
          )}
        </View>
      )}
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
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  priorityText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  source: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  assigneeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  moreTagsText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    alignSelf: 'center',
  },
});
