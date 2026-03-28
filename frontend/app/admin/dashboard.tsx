import React, { useEffect, useState } from 'react';
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
import { supabase } from '../../src/services/supabase';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    pendingSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
        totalBookings: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      Alert.alert('Access Denied', 'You do not have admin privileges', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
      return;
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      // Get total users
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get total sellers
      const { count: sellersCount } = await supabase
        .from('sellers')
        .select('*', { count: 'exact', head: true });

      // Get pending sellers
      const { count: pendingCount } = await supabase
        .from('sellers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get total products
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Get total orders
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Get total bookings
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Get total revenue from orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('payment_status', 'paid');

          // Get total revenue from bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('amount')
        .eq('payment_status', 'paid');

      const ordersRevenue = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const bookingsRevenue = bookingsData?.reduce((sum, booking) => sum + booking.amount, 0) || 0;
      const totalRevenue = ordersRevenue + bookingsRevenue;


      setStats({
        totalUsers: usersCount || 0,
        totalSellers: sellersCount || 0,
        pendingSellers: pendingCount || 0,
        totalProducts: productsCount || 0,
        totalOrders: ordersCount || 0,
         totalBookings: bookingsCount || 0,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const adminMenuItems = [
    {
      id: '1',
      title: 'Pending Approvals',
      icon: 'time' as const,
      count: stats.pendingSellers,
      color: colors.warning,
      route: '/admin/pending-sellers',
    },
    {
      id: '2',
      title: 'All Users',
      icon: 'people' as const,
      count: stats.totalUsers,
      color: colors.primary,
      route: '/admin/users',
    },
    {
      id: '3',
      title: 'All Sellers',
      icon: 'business' as const,
      count: stats.totalSellers,
      color: colors.secondary,
      route: '/admin/sellers',
    },
    {
      id: '4',
      title: 'All Products',
      icon: 'cube' as const,
      count: stats.totalProducts,
      color: colors.success,
      route: '/admin/products',
    },
    {
      id: '5',
      title: 'All Orders',
      icon: 'receipt' as const,
      count: stats.totalOrders,
      color: colors.info,
      route: '/admin/orders',
    },
      {
      id: '6',
      title: 'All Bookings',
      icon: 'calendar' as const,
      count: stats.totalBookings,
      color: '#F59E0B',
      route: '/admin/bookings',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Platform Management</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Revenue Card */}
        <View style={[styles.revenueCard, shadows.md]}>
          <Text style={styles.revenueLabel}>Total Platform Revenue</Text>
          <Text style={styles.revenueValue}>₹{stats.totalRevenue.toLocaleString()}</Text>
          <Text style={styles.revenueNote}>From all completed transactions</Text>
        </View>

        {/* Admin Menu */}
        <View style={styles.menuGrid}>
          {adminMenuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuCard, shadows.sm]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
              </View>
              <Text style={styles.menuCount}>{item.count}</Text>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.menuArrow} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => router.push('/admin/categories' as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="apps" size={24} color={colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Categories</Text>
              <Text style={styles.actionSubtitle}>Add, edit, or remove categories</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={loadStats}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="refresh" size={24} color={colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Refresh Statistics</Text>
              <Text style={styles.actionSubtitle}>Update dashboard data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  logoutButton: {
    padding: spacing.sm,
  },
  revenueCard: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  revenueLabel: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
  },
  revenueValue: {
    ...typography.h1,
    color: colors.white,
    fontWeight: '700',
    marginVertical: spacing.sm,
  },
  revenueNote: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  menuCard: {
    backgroundColor: colors.surface,
    width: '47%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  menuCount: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  menuTitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  menuArrow: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  actionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});