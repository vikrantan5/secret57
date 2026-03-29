import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promotionalEmails, setPromotionalEmails] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // In production, call API to change password
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Password changed successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowChangePassword(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // In production, call API to delete account
            Alert.alert('Account Deleted', 'Your account has been deleted.');
            logout();
            router.replace('/auth/role-selection' as any);
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/role-selection' as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Receive push notifications</Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={(value) => {
                  setPushNotifications(value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={pushNotifications ? colors.primary : colors.surface}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDesc}>Receive email updates</Text>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={(value) => {
                  setEmailNotifications(value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={emailNotifications ? colors.primary : colors.surface}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Order Updates</Text>
                <Text style={styles.settingDesc}>Get notified about order status</Text>
              </View>
              <Switch
                value={orderUpdates}
                onValueChange={(value) => {
                  setOrderUpdates(value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={orderUpdates ? colors.primary : colors.surface}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Promotional Emails</Text>
                <Text style={styles.settingDesc}>Receive offers and promotions</Text>
              </View>
              <Switch
                value={promotionalEmails}
                onValueChange={(value) => {
                  setPromotionalEmails(value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={promotionalEmails ? colors.primary : colors.surface}
              />
            </View>
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => setShowChangePassword(!showChangePassword)}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.actionLabel}>Change Password</Text>
              <Ionicons
                name={showChangePassword ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textLight}
              />
            </TouchableOpacity>

            {showChangePassword && (
              <View style={styles.passwordForm}>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current Password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry
                />
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New Password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry
                />
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm New Password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.changePasswordButton}
                  onPress={handleChangePassword}
                >
                  <Text style={styles.changePasswordText}>Update Password</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons name="document-text-outline" size={20} color={colors.info} />
              </View>
              <Text style={styles.actionLabel}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
              </View>
              <Text style={styles.actionLabel}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>

            <View style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons name="information-circle-outline" size={20} color={colors.secondary} />
              </View>
              <Text style={styles.actionLabel}>App Version</Text>
              <Text style={styles.versionText}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.error }]}>Danger Zone</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.actionItem, styles.dangerItem]}
              onPress={handleDeleteAccount}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.error }]}>Delete Account</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  settingDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionLabel: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  versionText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  passwordForm: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  passwordInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changePasswordButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  changePasswordText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: colors.error + '15',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '700',
  },
});