import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, FontSize } from '../theme/spacing';
import { mockIncidents } from '../data/mockData';
import { RootStackParamList, IncidentStatus, TimelineEvent } from '../types';

type IncidentDetailRouteProp = RouteProp<RootStackParamList, 'IncidentDetail'>;

const statusConfig: Record<IncidentStatus, { color: string; icon: string; label: string }> = {
  triggered: { color: Colors.critical, icon: 'flash', label: 'Triggered' },
  investigating: { color: Colors.high, icon: 'search', label: 'Investigating' },
  identified: { color: Colors.medium, icon: 'eye', label: 'Identified' },
  monitoring: { color: Colors.snooze, icon: 'pulse', label: 'Monitoring' },
  resolved: { color: Colors.close, icon: 'checkmark-circle', label: 'Resolved' },
};

const timelineIcons: Record<TimelineEvent['type'], { icon: string; color: string }> = {
  created: { icon: 'add-circle', color: Colors.info },
  acknowledged: { icon: 'checkmark-circle', color: Colors.acknowledge },
  escalated: { icon: 'arrow-up-circle', color: Colors.escalate },
  comment: { icon: 'chatbubble', color: Colors.textSecondary },
  status_change: { icon: 'swap-horizontal-circle', color: Colors.medium },
  assigned: { icon: 'person-circle', color: Colors.info },
  resolved: { icon: 'checkmark-done-circle', color: Colors.close },
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IncidentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<IncidentDetailRouteProp>();
  const { incidentId } = route.params;

  const incident = mockIncidents.find((i) => i.id === incidentId);

  if (!incident) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Incident not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = statusConfig[incident.status];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident</Text>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusBanner, { backgroundColor: `${status.color}20` }]}>
          <Ionicons name={status.icon as keyof typeof Ionicons.glyphMap} size={20} color={status.color} />
          <Text style={[styles.statusBannerText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        {/* Title & ID */}
        <Text style={styles.incidentId}>{incident.id.toUpperCase()}</Text>
        <Text style={styles.title}>{incident.title}</Text>
        <Text style={styles.description}>{incident.description}</Text>

        {/* Info Cards */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoValue}>{incident.alertCount}</Text>
            <Text style={styles.infoLabel}>Alerts</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="people-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoValue}>{incident.responders.length}</Text>
            <Text style={styles.infoLabel}>Responders</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoValue}>
              {Math.round(
                (new Date().getTime() - new Date(incident.createdAt).getTime()) / 60000
              )}m
            </Text>
            <Text style={styles.infoLabel}>Duration</Text>
          </View>
        </View>

        {/* Responders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Responders</Text>
          {incident.responders.map((responder, index) => (
            <View key={responder} style={styles.responderItem}>
              <View style={styles.responderAvatar}>
                <Text style={styles.responderInitial}>{responder.charAt(0)}</Text>
              </View>
              <View style={styles.responderInfo}>
                <Text style={styles.responderName}>{responder}</Text>
                <Text style={styles.responderRole}>
                  {index === 0 ? 'Incident Commander' : 'Responder'}
                </Text>
              </View>
              <TouchableOpacity style={styles.contactBtn}>
                <Ionicons name="call-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {[...incident.timeline].reverse().map((event, index) => {
            const iconConfig = timelineIcons[event.type];
            return (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineIcon, { backgroundColor: `${iconConfig.color}20` }]}>
                    <Ionicons
                      name={iconConfig.icon as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={iconConfig.color}
                    />
                  </View>
                  {index < incident.timeline.length - 1 && (
                    <View style={styles.timelineConnector} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineMessage}>{event.message}</Text>
                  <View style={styles.timelineMeta}>
                    <Text style={styles.timelineUser}>{event.user}</Text>
                    <Text style={styles.timelineTime}>{formatTime(event.timestamp)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.primaryAction}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.white} />
            <Text style={styles.primaryActionText}>Add Update</Text>
          </TouchableOpacity>
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  statusBannerText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  incidentId: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 28,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  infoValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  responderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  responderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responderInitial: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  responderInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  responderName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  responderRole: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  contactBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineLine: {
    alignItems: 'center',
    width: 36,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  timelineMessage: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  timelineMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timelineUser: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  timelineTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
  },
  primaryActionText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.white,
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
