import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

  const quickAccessItems = [
    {
      id: 'pending',
      title: 'Pending Approvals',
      icon: 'time' as const,
      count: stats.pendingSellers,
      gradient: ['#FBBF24', '#F59E0B'],
      route: '/admin/pending-sellers',
    },
    {
      id: 'users',
      title: 'All Users',
      icon: 'people' as const,
      count: stats.totalUsers,
      gradient: ['#60A5FA', '#3B82F6'],
      route: '/admin/users',
    },
    {
      id: 'sellers',
      title: 'All Sellers',
      icon: 'business' as const,
      count: stats.totalSellers,
      gradient: ['#8B5CF6', '#7C3AED'],
      route: '/admin/sellers',
    },
    {
      id: 'categories',
      title: 'Manage Categories',
      icon: 'apps' as const,
      count: null,
      gradient: [colors.primary, colors.primaryDark],
      route: '/admin/categories',
    },
  ];

    const financialMenuItems = [
   
    {
      id: 'subscriptions',
      title: 'Seller Subscriptions',
      subtitle: 'View subscription payments from sellers',
      icon: 'card' as const,
      color: colors.success,
      route: '/admin/seller-subscriptions',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.adminTitle}>Admin</Text>
              <Text style={styles.subtitle}>Manage your platform with ease</Text>
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
              <Ionicons name="log-out-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Revenue Card */}
        <View style={styles.contentContainer}>
          <LinearGradient
            colors={[colors.primaryVeryLight, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.revenueCard, shadows.lg]}
          >
            <View style={styles.revenueIconBox}>
              <Ionicons name="trending-up" size={32} color={colors.primaryDark} />
            </View>
            <Text style={styles.revenueLabel}>Handle payments and transactions</Text>
            <Text style={styles.revenueTitle}>Payment Dashboard</Text>
            <Text style={styles.revenueValue}>₹{stats.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.revenueNote}>View all transactions and analytics</Text>
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={() => router.push('/admin/payments-dashboard' as any)}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.primaryDark} />
            </TouchableOpacity>
          </LinearGradient>

          {/* Quick Access Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Quick Access</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Manage platform resources</Text>
            
            <View style={styles.quickAccessGrid}>
              {quickAccessItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.quickAccessCard, shadows.md]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={item.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.quickAccessGradient}
                  >
                    <View style={styles.quickAccessIconBox}>
                      <Ionicons name={item.icon} size={28} color={colors.white} />
                    </View>
                    {item.count !== null && (
                      <View style={styles.quickAccessBadge}>
                        <Text style={styles.quickAccessCount}>{item.count}</Text>
                      </View>
                    )}
                  </LinearGradient>
                  <View style={styles.quickAccessInfo}>
                    <Text style={styles.quickAccessTitle}>{item.title}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Financial Management */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="wallet" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Financial Management</Text>
            </View>
            
            <View style={styles.financialList}>
              {financialMenuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.financialCard, shadows.sm]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                  data-testid={`${item.id}-link`}
                >
                  <View style={[styles.financialIcon, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <View style={styles.financialContent}>
                    <Text style={styles.financialTitle}>{item.title}</Text>
                    <Text style={styles.financialSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Platform Overview */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Platform Overview</Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, shadows.sm]}>
                <View style={[styles.statIconBox, { backgroundColor: '#60A5FA15' }]}>
                  <Ionicons name="cube" size={24} color="#60A5FA" />
                </View>
                <Text style={styles.statValue}>{stats.totalProducts}</Text>
                <Text style={styles.statLabel}>All Products</Text>
              </View>

              <View style={[styles.statCard, shadows.sm]}>
                <View style={[styles.statIconBox, { backgroundColor: '#34D39915' }]}>
                  <Ionicons name="receipt" size={24} color="#34D399" />
                </View>
                <Text style={styles.statValue}>{stats.totalOrders}</Text>
                <Text style={styles.statLabel}>All Orders</Text>
              </View>

              <View style={[styles.statCard, shadows.sm]}>
                <View style={[styles.statIconBox, { backgroundColor: '#FBBF2415' }]}>
                  <Ionicons name="calendar" size={24} color="#FBBF24" />
                </View>
                <Text style={styles.statValue}>{stats.totalBookings}</Text>
                <Text style={styles.statLabel}>All Bookings</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.refreshCard, shadows.sm]}
              onPress={loadStats}
              activeOpacity={0.7}
            >
              <View style={[styles.refreshIcon, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="refresh" size={24} color={colors.success} />
              </View>
              <View style={styles.refreshContent}>
                <Text style={styles.refreshTitle}>Refresh Statistics</Text>
                <Text style={styles.refreshSubtitle}>Update dashboard data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>
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
  headerGradient: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    ...typography.body,
    color: colors.primaryVeryLight,
    opacity: 0.9,
  },
  adminTitle: {
    ...typography.h1,
    color: colors.white,
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body,
    color: colors.primaryVeryLight,
    marginTop: spacing.xs,
  },
  logoutButton: {
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
  },
  contentContainer: {
    marginTop: -spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  revenueCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  revenueIconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  revenueLabel: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    opacity: 0.8,
  },
  revenueTitle: {
    ...typography.h4,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  revenueValue: {
    ...typography.h1,
    color: colors.primaryDark,
    fontWeight: '700',
    marginVertical: spacing.sm,
  },
  revenueNote: {
    ...typography.caption,
    color: colors.primaryDark,
    opacity: 0.7,
  },
  viewButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginLeft: spacing.xl + spacing.xs,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickAccessCard: {
    width: '45.5%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  quickAccessGradient: {
    padding: spacing.lg,
    position: 'relative',
  },
  quickAccessIconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    minWidth: 28,
    alignItems: 'center',
  },
  quickAccessCount: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  quickAccessInfo: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  quickAccessTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  financialList: {
    gap: spacing.md,
  },
  financialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  financialIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  financialContent: {
    flex: 1,
  },
  financialTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  financialSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  refreshCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  refreshIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  refreshContent: {
    flex: 1,
  },
  refreshTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  refreshSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
