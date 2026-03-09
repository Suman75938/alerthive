import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, FontSize } from '../theme/spacing';
import { StatCard } from '../components/StatCard';
import { IncidentCard } from '../components/IncidentCard';
import { AlertCard } from '../components/AlertCard';
import { mockAlerts, mockIncidents } from '../data/mockData';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const openAlerts = mockAlerts.filter((a) => a.status === 'open');
  const criticalAlerts = mockAlerts.filter((a) => a.priority === 'critical' && a.status !== 'closed');
  const activeIncidents = mockIncidents.filter((i) => i.status !== 'resolved');
  const acknowledgedAlerts = mockAlerts.filter((a) => a.status === 'acknowledged');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.headerTitle}>AlertHive</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications" size={24} color={Colors.textPrimary} />
            {openAlerts.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{openAlerts.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard
            title="Open Alerts"
            value={openAlerts.length}
            icon="notifications"
            color={Colors.critical}
          />
          <View style={{ width: Spacing.md }} />
          <StatCard
            title="Critical"
            value={criticalAlerts.length}
            icon="flame"
            color={Colors.high}
          />
          <View style={{ width: Spacing.md }} />
          <StatCard
            title="Incidents"
            value={activeIncidents.length}
            icon="alert-circle"
            color={Colors.medium}
          />
        </View>

        {/* Active Incidents Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Incidents</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {activeIncidents.slice(0, 2).map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            onPress={() => navigation.navigate('IncidentDetail', { incidentId: incident.id })}
          />
        ))}

        {/* Recent Alerts Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Critical Alerts</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {criticalAlerts.slice(0, 3).map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onPress={() => navigation.navigate('AlertDetail', { alertId: alert.id })}
          />
        ))}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.criticalBg }]}>
              <Ionicons name="add-circle" size={24} color={Colors.critical} />
            </View>
            <Text style={styles.actionText}>Create{'\n'}Incident</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.highBg }]}>
              <Ionicons name="megaphone" size={24} color={Colors.high} />
            </View>
            <Text style={styles.actionText}>Send{'\n'}Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.infoBg }]}>
              <Ionicons name="people" size={24} color={Colors.info} />
            </View>
            <Text style={styles.actionText}>On-Call{'\n'}Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.lowBg }]}>
              <Ionicons name="analytics" size={24} color={Colors.low} />
            </View>
            <Text style={styles.actionText}>View{'\n'}Reports</Text>
          </TouchableOpacity>
        </View>

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
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  notificationBtn: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.critical,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
