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
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, FontSize } from '../theme/spacing';
import { mockSchedules, mockTeamMembers } from '../data/mockData';

function formatScheduleDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRotationProgress(start: string, end: string): number {
  const now = new Date().getTime();
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const total = endTime - startTime;
  const elapsed = now - startTime;
  return Math.min(Math.max(elapsed / total, 0), 1);
}

export function OnCallScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>On-Call</Text>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Current On-Call Banner */}
        <View style={styles.currentBanner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerLabel}>Currently On-Call</Text>
            <Text style={styles.bannerName}>{mockSchedules[0].currentOnCall.name}</Text>
            <Text style={styles.bannerRole}>{mockSchedules[0].currentOnCall.role}</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Ionicons name="call" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Schedules */}
        <Text style={styles.sectionTitle}>Active Schedules</Text>

        {mockSchedules.map((schedule) => {
          const progress = getRotationProgress(schedule.rotationStart, schedule.rotationEnd);
          return (
            <View key={schedule.id} style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View>
                  <Text style={styles.scheduleName}>{schedule.name}</Text>
                  <Text style={styles.scheduleTeam}>{schedule.team}</Text>
                </View>
                <View style={styles.rotationBadge}>
                  <Text style={styles.rotationText}>{schedule.rotationType}</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressDate}>
                    {formatScheduleDate(schedule.rotationStart)}
                  </Text>
                  <Text style={styles.progressDate}>
                    {formatScheduleDate(schedule.rotationEnd)}
                  </Text>
                </View>
              </View>

              {/* Current & Next */}
              <View style={styles.rotationRow}>
                <View style={styles.rotationItem}>
                  <View style={[styles.rotationDot, { backgroundColor: Colors.close }]} />
                  <View>
                    <Text style={styles.rotationLabel}>Current</Text>
                    <Text style={styles.rotationName}>{schedule.currentOnCall.name}</Text>
                  </View>
                </View>
                <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
                <View style={styles.rotationItem}>
                  <View style={[styles.rotationDot, { backgroundColor: Colors.textMuted }]} />
                  <View>
                    <Text style={styles.rotationLabel}>Next</Text>
                    <Text style={styles.rotationName}>{schedule.nextOnCall.name}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* Team Members */}
        <Text style={styles.sectionTitle}>Team Members</Text>

        {mockTeamMembers.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberInitial}>{member.name.charAt(0)}</Text>
              {member.isOnCall && <View style={styles.onCallIndicator} />}
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.memberNameRow}>
                <Text style={styles.memberName}>{member.name}</Text>
                {member.isOnCall && (
                  <View style={styles.onCallBadge}>
                    <Text style={styles.onCallBadgeText}>ON-CALL</Text>
                  </View>
                )}
              </View>
              <Text style={styles.memberRole}>{member.role}</Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
            </View>
            <View style={styles.memberActions}>
              <TouchableOpacity style={styles.memberActionBtn}>
                <Ionicons name="call-outline" size={18} color={Colors.close} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.memberActionBtn}>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.info} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.xl,
  },
  bannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  bannerLabel: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bannerRole: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.close,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  scheduleCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  scheduleName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scheduleTeam: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rotationBadge: {
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  rotationText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  rotationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rotationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rotationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rotationLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  rotationName: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  memberInitial: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  onCallIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.close,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  memberInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  onCallBadge: {
    backgroundColor: Colors.lowBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  onCallBadgeText: {
    fontSize: 9,
    color: Colors.close,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  memberRole: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  memberEmail: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  memberActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  memberActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
