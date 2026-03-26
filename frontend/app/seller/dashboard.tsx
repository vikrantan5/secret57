import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/services/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function SellerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalBookings: 0,
    activeProducts: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);

  useEffect(() => {
    fetchSellerStats();
  }, []);

  const fetchSellerStats = async () => {
    try {
      setLoading(true);

      // Get seller ID
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!seller) {
        setLoading(false);
        return;
      }

      setSellerId(seller.id);

      // Get order statistics
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, order:orders(*)')
        .eq('seller_id', seller.id);

      const paidOrders = orderItems?.filter(
        (item: any) => item.order?.payment_status === 'paid'
      ) || [];

      const totalRevenue = paidOrders.reduce(
        (sum: number, item: any) => sum + parseFloat(item.total || 0),
        0
      );

      // Get unique order count
      const uniqueOrders = new Set(paidOrders.map((item: any) => item.order_id));
      
      // Get pending orders
      const pendingOrders = orderItems?.filter(
        (item: any) => item.order?.status === 'pending' || item.order?.status === 'processing'
      ).length || 0;

      // Get completed orders
      const completedOrders = orderItems?.filter(
        (item: any) => item.order?.status === 'delivered'
      ).length || 0;

      // Get bookings count
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', seller.id);

      // Get active products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', seller.id)
        .eq('is_active', true);

      setStats({
        totalRevenue,
        totalOrders: uniqueOrders.size,
        totalBookings: bookingsCount || 0,
        activeProducts: productsCount || 0,
        pendingOrders,
        completedOrders,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching seller stats:', error);
      setLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, color }: any) => (
    <View style={[styles.statCard, shadows.sm]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Dashboard</Text>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Revenue Card */}
        <View style={[styles.revenueCard, shadows.md]}>
          <View style={styles.revenueHeader}>
            <Ionicons name="trending-up" size={28} color={colors.surface} />
          </View>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueValue}>₹{stats.totalRevenue.toFixed(2)}</Text>
          <View style={styles.revenueStats}>
            <View style={styles.revenueStatItem}>
              <Text style={styles.revenueStatValue}>{stats.totalOrders}</Text>
              <Text style={styles.revenueStatLabel}>Orders</Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.revenueStatItem}>
              <Text style={styles.revenueStatValue}>{stats.totalBookings}</Text>
              <Text style={styles.revenueStatLabel}>Bookings</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="bag-handle"
            label="Active Products"
            value={stats.activeProducts}
            color={colors.primary}
          />
          <StatCard
            icon="time"
            label="Pending"
            value={stats.pendingOrders}
            color="#F59E0B"
          />
          <StatCard
            icon="checkmark-circle"
            label="Completed"
            value={stats.completedOrders}
            color="#10B981"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => router.push('/seller/products/add')}
            data-testid="add-product-button"
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Add New Product</Text>
              <Text style={styles.actionSubtitle}>List a new product for sale</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => router.push('/seller/orders')}
            data-testid="view-orders-button"
          >
            <View style={[styles.actionIcon, { backgroundColor: '#10B981' + '15' }]}>
              <Ionicons name="receipt" size={28} color="#10B981" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Orders</Text>
              <Text style={styles.actionSubtitle}>Manage your orders</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => router.push('/seller/products')}
            data-testid="manage-products-button"
          >
            <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
              <Ionicons name="cube" size={28} color="#8B5CF6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Products</Text>
              <Text style={styles.actionSubtitle}>Edit or update your products</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => router.push('/seller/bookings')}
            data-testid="view-bookings-button"
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' + '15' }]}>
              <Ionicons name="calendar" size={28} color="#F59E0B" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Bookings</Text>
              <Text style={styles.actionSubtitle}>Manage service bookings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
             <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => router.push('/seller/payout-settings')}
            data-testid="payout-settings-button"
          >
            <View style={[styles.actionIcon, { backgroundColor: '#10B981' + '15' }]}>
              <Ionicons name="wallet" size={28} color="#10B981" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Payout Settings</Text>
              <Text style={styles.actionSubtitle}>Manage bank accounts & payouts</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  revenueCard: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  revenueHeader: {
    marginBottom: spacing.md,
  },
  revenueLabel: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
  },
  revenueValue: {
    ...typography.h1,
    color: colors.surface,
    fontWeight: '700',
    marginTop: spacing.xs,
    fontSize: 36,
  },
  revenueStats: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surface + '30',
  },
  revenueStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  dividerVertical: {
    width: 1,
    backgroundColor: colors.surface + '30',
  },
  revenueStatValue: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: '700',
  },
  revenueStatLabel: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '700',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
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
  },
  actionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
});
