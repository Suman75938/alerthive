import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Spacing, BorderRadius, FontSize } from '../theme/spacing';

interface SettingItemProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  hasChevron?: boolean;
  onPress?: () => void;
}

function SettingItem({
  icon,
  iconColor,
  title,
  subtitle,
  hasToggle,
  toggleValue,
  onToggle,
  hasChevron,
  onPress,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={hasToggle ? 1 : 0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {hasToggle && (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.surfaceHighlight, true: Colors.primaryLight }}
          thumbColor={toggleValue ? Colors.primary : Colors.textMuted}
        />
      )}
      {hasChevron && (
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [quietHours, setQuietHours] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>S</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Sarah Chen</Text>
            <Text style={styles.profileEmail}>sarah.chen@example.com</Text>
            <View style={styles.profileBadge}>
              <View style={styles.onCallDot} />
              <Text style={styles.profileStatus}>On-Call</Text>
            </View>
          </View>
          <TouchableOpacity>
            <Ionicons name="pencil-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="notifications"
            iconColor={Colors.primary}
            title="Push Notifications"
            subtitle="Receive push alerts on your device"
            hasToggle
            toggleValue={pushEnabled}
            onToggle={setPushEnabled}
          />
          <SettingItem
            icon="volume-high"
            iconColor={Colors.info}
            title="Sound"
            subtitle="Play notification sounds"
            hasToggle
            toggleValue={soundEnabled}
            onToggle={setSoundEnabled}
          />
          <SettingItem
            icon="phone-portrait"
            iconColor={Colors.medium}
            title="Vibration"
            subtitle="Vibrate on new alerts"
            hasToggle
            toggleValue={vibrationEnabled}
            onToggle={setVibrationEnabled}
          />
          <SettingItem
            icon="flame"
            iconColor={Colors.critical}
            title="Critical Alerts"
            subtitle="Override Do Not Disturb for critical"
            hasToggle
            toggleValue={criticalAlerts}
            onToggle={setCriticalAlerts}
          />
          <SettingItem
            icon="moon"
            iconColor={Colors.snooze}
            title="Quiet Hours"
            subtitle="Silence non-critical alerts at night"
            hasToggle
            toggleValue={quietHours}
            onToggle={setQuietHours}
          />
        </View>

        {/* Alert Preferences */}
        <Text style={styles.sectionTitle}>Alert Preferences</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="filter"
            iconColor={Colors.primary}
            title="Alert Routing Rules"
            subtitle="Configure how alerts are routed"
            hasChevron
          />
          <SettingItem
            icon="layers"
            iconColor={Colors.medium}
            title="Escalation Policies"
            subtitle="Set up escalation chains"
            hasChevron
          />
          <SettingItem
            icon="time"
            iconColor={Colors.info}
            title="Snooze Defaults"
            subtitle="Default snooze durations"
            hasChevron
          />
          <SettingItem
            icon="link"
            iconColor={Colors.close}
            title="Integrations"
            subtitle="Manage connected services"
            hasChevron
          />
        </View>

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="contrast"
            iconColor={Colors.textPrimary}
            title="Dark Mode"
            subtitle="Use dark theme"
            hasToggle
            toggleValue={darkMode}
            onToggle={setDarkMode}
          />
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="information-circle"
            iconColor={Colors.info}
            title="Version"
            subtitle="1.0.0 (Build 1)"
            hasChevron={false}
          />
          <SettingItem
            icon="document-text"
            iconColor={Colors.textSecondary}
            title="Terms of Service"
            hasChevron
          />
          <SettingItem
            icon="shield-checkmark"
            iconColor={Colors.close}
            title="Privacy Policy"
            hasChevron
          />
          <SettingItem
            icon="help-circle"
            iconColor={Colors.medium}
            title="Help & Support"
            hasChevron
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={20} color={Colors.critical} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footerText}>AlertHive v1.0.0</Text>
        <Text style={styles.footerSubtext}>Built with care for incident responders</Text>

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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: Colors.white,
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  onCallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.close,
  },
  profileStatus: {
    fontSize: FontSize.xs,
    color: Colors.close,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  settingsGroup: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  settingTitle: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.criticalBg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.critical,
  },
  footerText: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  footerSubtext: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
