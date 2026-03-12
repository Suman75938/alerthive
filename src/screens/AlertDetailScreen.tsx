import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, FontSize } from '../theme/spacing';
import { mockAlerts } from '../data/mockData';
import { RootStackParamList, AlertPriority, AlertStatus } from '../types';

type AlertDetailRouteProp = RouteProp<RootStackParamList, 'AlertDetail'>;

const priorityConfig: Record<AlertPriority, { color: string; bg: string; label: string }> = {
  critical: { color: Colors.critical, bg: Colors.criticalBg, label: 'Critical' },
  high: { color: Colors.high, bg: Colors.highBg, label: 'High' },
  medium: { color: Colors.medium, bg: Colors.mediumBg, label: 'Medium' },
  low: { color: Colors.low, bg: Colors.lowBg, label: 'Low' },
  info: { color: Colors.info, bg: Colors.infoBg, label: 'Info' },
};

const statusConfig: Record<AlertStatus, { color: string; label: string }> = {
  open: { color: Colors.critical, label: 'Open' },
  acknowledged: { color: Colors.acknowledge, label: 'Acknowledged' },
  closed: { color: Colors.close, label: 'Closed' },
  snoozed: { color: Colors.snooze, label: 'Snoozed' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AlertDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<AlertDetailRouteProp>();
  const { alertId } = route.params;

  const alert = mockAlerts.find((a) => a.id === alertId);

  const [currentStatus, setCurrentStatus] = useState<AlertStatus>(alert?.status ?? 'open');

  if (!alert) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Alert not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const priority = priorityConfig[alert.priority];
  const status = statusConfig[currentStatus];

  const handleAction = (action: string) => {
    switch (action) {
      case 'acknowledge':
        setCurrentStatus('acknowledged');
        RNAlert.alert('Alert Acknowledged', 'You have acknowledged this alert.');
        break;
      case 'close':
        setCurrentStatus('closed');
        RNAlert.alert('Alert Closed', 'This alert has been closed.');
        break;
      case 'snooze':
        RNAlert.alert(
          'Snooze Alert',
          'How long would you like to snooze this alert?',
          [
            { text: '15 min', onPress: () => setCurrentStatus('snoozed') },
            { text: '1 hour', onPress: () => setCurrentStatus('snoozed') },
            { text: '4 hours', onPress: () => setCurrentStatus('snoozed') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        break;
      case 'escalate':
        RNAlert.alert('Escalated', 'This alert has been escalated to the next responder.');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Details</Text>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Priority & Status */}
        <View style={styles.badgeRow}>
          <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
            <Text style={[styles.priorityText, { color: priority.color }]}>
              {priority.label}
            </Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: status.color }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{alert.title}</Text>

        {/* Message */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.message}>{alert.message}</Text>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Source</Text>
            <View style={styles.detailValueRow}>
              <Ionicons name="cube-outline" size={16} color={Colors.primary} />
              <Text style={styles.detailValue}>{alert.source}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{formatDate(alert.createdAt)}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Last Updated</Text>
            <Text style={styles.detailValue}>{formatDate(alert.updatedAt)}</Text>
          </View>

          {alert.assignee && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Assignee</Text>
              <View style={styles.detailValueRow}>
                <Ionicons name="person-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.detailValue}>{alert.assignee}</Text>
              </View>
            </View>
          )}

          {alert.acknowledgedBy && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Acknowledged By</Text>
              <Text style={styles.detailValue}>
                {alert.acknowledgedBy} at {formatDate(alert.acknowledgedAt ?? '')}
              </Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {alert.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.tagsContainer}>
              {alert.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.highBg }]}
              onPress={() => handleAction('acknowledge')}
            >
              <Ionicons name="checkmark-circle" size={24} color={Colors.acknowledge} />
              <Text style={[styles.actionText, { color: Colors.acknowledge }]}>Acknowledge</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.lowBg }]}
              onPress={() => handleAction('close')}
            >
              <Ionicons name="close-circle" size={24} color={Colors.close} />
              <Text style={[styles.actionText, { color: Colors.close }]}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.infoBg }]}
              onPress={() => handleAction('snooze')}
            >
              <Ionicons name="time" size={24} color={Colors.snooze} />
              <Text style={[styles.actionText, { color: Colors.snooze }]}>Snooze</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.criticalBg }]}
              onPress={() => handleAction('escalate')}
            >
              <Ionicons name="arrow-up-circle" size={24} color={Colors.escalate} />
              <Text style={[styles.actionText, { color: Colors.escalate }]}>Escalate</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  priorityText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 28,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  detailsGrid: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  detailItem: {
    gap: 4,
  },
  detailLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  actionText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.textMuted,
  },
});
