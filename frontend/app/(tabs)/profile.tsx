import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/role-selection');
          },
        },
      ]
    );
  };

  const menuItems = [
    { id: '1', title: 'Edit Profile', icon: 'person-circle' as const, route: '/profile/edit' },
    { id: '2', title: 'My Orders', icon: 'bag-handle' as const, route: '/orders' },
    { id: '3', title: 'Addresses', icon: 'location' as const, route: '/profile/addresses' },
    { id: '4', title: 'Payment Methods', icon: 'card' as const, route: '/profile/payment-methods' },
    { id: '5', title: 'Notifications', icon: 'notifications' as const, route: '/profile/notifications' },
    { id: '6', title: 'Help & Support', icon: 'help-circle' as const, route: '/profile/help' },
    { id: '7', title: 'Settings', icon: 'settings' as const, route: '/profile/settings' },
  ];

  const getRoleColor = () => {
    switch (user?.role) {
      case 'customer':
        return colors.customer;
      case 'seller':
        return colors.seller;
      case 'admin':
        return colors.admin;
      default:
        return colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.header, shadows.md]}>
          <View style={[styles.avatar, { backgroundColor: getRoleColor() + '20' }]}>
            <Text style={[styles.avatarText, { color: getRoleColor() }]}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor() }]}>
            <Text style={styles.roleText}>
              {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, shadows.sm]}
              onPress={() => {
                if (item.route) {
                  router.push(item.route as any);
                } else {
                  Alert.alert('Coming Soon', `${item.title} feature will be available soon`);
                }
              }}
              data-testid={`menu-item-${item.id}`}
            >
              <View style={styles.menuLeft}>
                <Ionicons name={item.icon} size={24} color={colors.primary} />
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, shadows.sm]}
          onPress={handleLogout}
          data-testid="logout-button"
        >
          <Ionicons name="log-out" size={24} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>Version 1.0.0 - ServiceHub</Text>
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
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h1,
    fontWeight: '700',
  },
  name: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  roleText: {
    ...typography.bodySmall,
    color: colors.surface,
    fontWeight: '600',
  },
  menuContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  version: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});