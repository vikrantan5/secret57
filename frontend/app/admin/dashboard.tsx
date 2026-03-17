import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdminStore } from '../../src/store/adminStore';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { stats, loading, fetchPlatformStats } = useAdminStore();

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      router.replace('/(tabs)/home');
      return;
    }
    
    fetchPlatformStats();
  }, [user]);

  if (loading || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const menuItems = [
    {
      id: 'pending-sellers',
      title: 'Pending Sellers',
      icon: 'people',
      count: stats.pending_sellers,
      color: colors.warning,
      route: '/admin/pending-sellers',
    },
    {
      id: 'users',
      title: 'Manage Users',
      icon: 'person',
      count: stats.total_users,
      color: colors.primary,
      route: '/admin/users',
    },
    {
      id: 'orders',
      title: 'All Orders',
      icon: 'receipt',
      count: stats.total_orders,
      color: colors.success,
      route: '/admin/orders',
    },
    {
      id: 'products',
      title: 'Products',
      icon: 'cube',
      count: stats.total_products,
      color: colors.secondary,
      route: '/admin/products',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, shadows.md, { backgroundColor: colors.primary }]}>
            <Ionicons name="cash" size={32} color={colors.surface} />
            <Text style={styles.statValue}>₹{stats.total_revenue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>

          <View style={[styles.statCard, shadows.md, { backgroundColor: colors.success }]}>
            <Ionicons name="cart" size={32} color={colors.surface} />
            <Text style={styles.statValue}>{stats.total_orders}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>

          <View style={[styles.statCard, shadows.md, { backgroundColor: colors.secondary }]}>
            <Ionicons name="calendar" size={32} color={colors.surface} />
            <Text style={styles.statValue}>{stats.total_bookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>

          <View style={[styles.statCard, shadows.md, { backgroundColor: colors.warning }]}>
            <Ionicons name="storefront" size={32} color={colors.surface} />
            <Text style={styles.statValue}>{stats.total_sellers}</Text>
            <Text style={styles.statLabel}>Total Sellers</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, shadows.sm]}
              onPress={() => router.push(item.route as any)}
              data-testid={`admin-menu-${item.id}`}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuCount}>{item.count} items</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, shadows.sm]}
            onPress={() => fetchPlatformStats()}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Refresh Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, shadows.sm]}
            onPress={() => router.push('/admin/analytics')}
          >
            <Ionicons name="bar-chart" size={20} color={colors.primary} />
            <Text style={styles.actionText}>View Analytics</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    width: '48%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.surface,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  menuContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  menuCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
