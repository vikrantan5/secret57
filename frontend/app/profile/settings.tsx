import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Animated,
  Platform,
  Dimensions, // Moved Dimensions import here
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
// Fallback theme if file doesn't exist
const colors = {
  primary: '#8B5CF6',
  secondary: '#7C3AED',
  background: '#F9FAFB',
  text: '#1F2937',
  border: '#E5E7EB',
};

const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

const typography = {
  h1: { fontSize: 32, fontWeight: '700' },
  h2: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
};

const borderRadius = {
  md: 8,
  lg: 16,
  xl: 24,
};

const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
};

const { width, height } = Dimensions.get('window');

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const passwordFormAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(passwordFormAnim, {
      toValue: showChangePassword ? 1 : 0,
      useNativeDriver: false, // Keep false for height animation
      friction: 8,
      tension: 40,
    }).start();
  }, [showChangePassword]);

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

  const passwordFormHeight = passwordFormAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4C1D95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Notification Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.sectionIcon}
            >
              <Ionicons name="notifications-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
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
                trackColor={{ false: '#E5E7EB', true: '#8B5CF680' }}
                thumbColor={pushNotifications ? '#8B5CF6' : '#FFFFFF'}
                ios_backgroundColor="#E5E7EB"
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
                trackColor={{ false: '#E5E7EB', true: '#8B5CF680' }}
                thumbColor={emailNotifications ? '#8B5CF6' : '#FFFFFF'}
                ios_backgroundColor="#E5E7EB"
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
                trackColor={{ false: '#E5E7EB', true: '#8B5CF680' }}
                thumbColor={orderUpdates ? '#8B5CF6' : '#FFFFFF'}
                ios_backgroundColor="#E5E7EB"
              />
            </View>

            <View style={[styles.settingItem, styles.lastSettingItem]}>
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
                trackColor={{ false: '#E5E7EB', true: '#8B5CF680' }}
                thumbColor={promotionalEmails ? '#8B5CF6' : '#FFFFFF'}
                ios_backgroundColor="#E5E7EB"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.sectionIcon}
            >
              <Ionicons name="lock-closed-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Security</Text>
          </View>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowChangePassword(!showChangePassword);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.actionIcon}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#8B5CF6" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Change Password</Text>
              <Ionicons
                name={showChangePassword ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            <Animated.View style={{ height: passwordFormHeight, overflow: 'hidden' }}>
              <View style={styles.passwordForm}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.passwordInputGradient}
                >
                  <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Current Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                  />
                </LinearGradient>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.passwordInputGradient}
                >
                  <Ionicons name="create-outline" size={18} color="#6B7280" />
                  <TextInput
                    style={styles.passwordInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                  />
                </LinearGradient>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.passwordInputGradient}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#6B7280" />
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                  />
                </LinearGradient>
                <TouchableOpacity
                  style={styles.changePasswordButton}
                  onPress={handleChangePassword}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.changePasswordGradient}
                  >
                    <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.changePasswordText}>Update Password</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.sectionIcon}
            >
              <Ionicons name="information-circle-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.actionIcon}
              >
                <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Terms of Service</Text>
              <View style={styles.chevronCircle}>
                <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.actionIcon}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Privacy Policy</Text>
              <View style={styles.chevronCircle}>
                <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <View style={[styles.actionItem, styles.lastActionItem]}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.actionIcon}
              >
                <Ionicons name="information-circle-outline" size={20} color="#F59E0B" />
              </LinearGradient>
              <Text style={styles.actionLabel}>App Version</Text>
              <LinearGradient
                colors={['#1E1B4B', '#312E81']}
                style={styles.versionBadge}
              >
                <Text style={styles.versionText}>1.0.0</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.sectionIcon}
            >
              <Ionicons name="warning-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Danger Zone</Text>
          </View>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <TouchableOpacity
              style={[styles.actionItem, styles.dangerItem]}
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FEE2E2', '#FECACA']}
                style={styles.dangerIcon}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </LinearGradient>
              <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Delete Account</Text>
              <Ionicons name="chevron-forward" size={20} color="#EF4444" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Premium Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.9}>
            <LinearGradient
              colors={['#FEE2E2', '#FECACA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastSettingItem: {
    borderBottomWidth: 0,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastActionItem: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  chevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  passwordForm: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    gap: spacing.md,
  },
  passwordInputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: spacing.sm,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: '#1F2937',
  },
  changePasswordButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  changePasswordGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  changePasswordText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  logoutSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  logoutButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
});