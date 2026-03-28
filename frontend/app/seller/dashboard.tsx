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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { supabase } from '../../src/services/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function SellerDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { seller, fetchSellerProfile } = useSellerStore();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalBookings: 0,
    activeProducts: 0,
    activeServices: 0,
    pendingOrders: 0,
    completedOrders: 0,
    pendingBookings: 0,
    completedBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [categoryType, setCategoryType] = useState<'ecommerce' | 'booking' | 'hybrid'>('hybrid');

  useEffect(() => {
    loadSellerData();
  }, []);

  const loadSellerData = async () => {
    if (!user?.id) return;
    
    await fetchSellerProfile(user.id);
    fetchSellerStats();
  };

  useEffect(() => {
    if (seller) {
      setCategoryType(seller.category?.type || 'hybrid');
    }
  }, [seller]);

  const fetchSellerStats = async () => {
    try {
      setLoading(true);

      // Get seller ID and category
      const { data: sellerData } = await supabase
        .from('sellers')
        .select(`
          id,
          category:categories(type)
        `)
        .eq('user_id', user?.id)
        .single();

      if (!sellerData) {
        setLoading(false);
        return;
      }

      setSellerId(sellerData.id);
      const type = (sellerData.category as any)?.type || 'hybrid';
      setCategoryType(type);

      // Fetch stats based on category type
      if (type === 'ecommerce' || type === 'hybrid') {
        // Get order statistics
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('*, order:orders(*)')
          .eq('seller_id', sellerData.id);

        const paidOrders = orderItems?.filter(
          (item: any) => item.order?.payment_status === 'paid'
        ) || [];

        const totalRevenue = paidOrders.reduce(
          (sum: number, item: any) => sum + parseFloat(item.total || 0),
          0
        );

        const uniqueOrders = new Set(paidOrders.map((item: any) => item.order_id));
        
        const pendingOrders = orderItems?.filter(
          (item: any) => item.order?.status === 'pending' || item.order?.status === 'processing'
        ).length || 0;

        const completedOrders = orderItems?.filter(
          (item: any) => item.order?.status === 'delivered'
        ).length || 0;

        // Get active products count
        const { count: productsCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerData.id)
          .eq('is_active', true);

        setStats(prev => ({
          ...prev,
          totalRevenue,
          totalOrders: uniqueOrders.size,
          activeProducts: productsCount || 0,
          pendingOrders,
          completedOrders,
        }));
      }

      if (type === 'booking' || type === 'hybrid') {
        // Get bookings count
        const { count: bookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerData.id);

        // Get active services count
        const { count: servicesCount } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerData.id)
          .eq('is_active', true);

        // Get pending bookings
        const { count: pendingBookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerData.id)
          .eq('status', 'pending');

        // Get completed bookings
        const { count: completedBookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerData.id)
          .eq('status', 'completed');

        // Get booking revenue
        const { data: completedBookings } = await supabase
          .from('bookings')
          .select('total_amount')
          .eq('seller_id', sellerData.id)
          .eq('status', 'completed');

        const bookingRevenue = completedBookings?.reduce(
          (sum, booking) => sum + parseFloat(booking.total_amount || 0),
          0
        ) || 0;

        setStats(prev => ({
          ...prev,
          totalRevenue: prev.totalRevenue + bookingRevenue,
          totalBookings: bookingsCount || 0,
          activeServices: servicesCount || 0,
          pendingBookings: pendingBookingsCount || 0,
          completedBookings: completedBookingsCount || 0,
        }));
      }

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

  const getCategoryBadgeColor = (type: string) => {
    switch (type) {
      case 'booking': return '#F59E0B';
      case 'ecommerce': return '#10B981';
      case 'hybrid': return '#8B5CF6';
      default: return colors.primary;
    }
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'booking': return '📅 Booking Services';
      case 'ecommerce': return '🛍️ E-commerce';
      case 'hybrid': return '🔄 Hybrid';
      default: return type;
    }
  };

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
        <View>
          <Text style={styles.headerTitle}>Seller Dashboard</Text>
          {seller?.category && (
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryBadgeColor(categoryType) + '20' }]}>
              <Text style={[styles.categoryBadgeText, { color: getCategoryBadgeColor(categoryType) }]}>
                {getCategoryLabel(categoryType)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            onPress={() => router.push('/notifications/index' as any)}
            style={styles.headerIcon}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
              ]);
            }}
            style={styles.headerIcon}
          >
            <Ionicons name="log-out-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
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
            {(categoryType === 'ecommerce' || categoryType === 'hybrid') && (
              <>
                <View style={styles.revenueStatItem}>
                  <Text style={styles.revenueStatValue}>{stats.totalOrders}</Text>
                  <Text style={styles.revenueStatLabel}>Orders</Text>
                </View>
                {categoryType === 'hybrid' && <View style={styles.dividerVertical} />}
              </>
            )}
            {(categoryType === 'booking' || categoryType === 'hybrid') && (
              <View style={styles.revenueStatItem}>
                <Text style={styles.revenueStatValue}>{stats.totalBookings}</Text>
                <Text style={styles.revenueStatLabel}>Bookings</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {(categoryType === 'ecommerce' || categoryType === 'hybrid') && (
            <>
              <StatCard
                icon="bag-handle"
                label="Active Products"
                value={stats.activeProducts}
                color={colors.primary}
              />
              <StatCard
                icon="time"
                label="Pending Orders"
                value={stats.pendingOrders}
                color="#F59E0B"
              />
              <StatCard
                icon="checkmark-circle"
                label="Completed Orders"
                value={stats.completedOrders}
                color="#10B981"
              />
            </>
          )}
          {(categoryType === 'booking' || categoryType === 'hybrid') && (
            <>
              <StatCard
                icon="calendar"
                label="Active Services"
                value={stats.activeServices}
                color="#8B5CF6"
              />
              <StatCard
                icon="time"
                label="Pending Bookings"
                value={stats.pendingBookings}
                color="#F59E0B"
              />
              <StatCard
                icon="checkmark-circle"
                label="Completed Bookings"
                value={stats.completedBookings}
                color="#10B981"
              />
            </>
          )}
        </View>

        {/* Quick Actions - Dynamic Based on Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {/* E-commerce Actions */}
          {(categoryType === 'ecommerce' || categoryType === 'hybrid') && (
            <>
              <TouchableOpacity
                style={[styles.actionCard, shadows.sm]}
                onPress={() => router.push('/seller/add-product' as any)}
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
                onPress={() => router.push('/seller/products' as any)}
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
                onPress={() => router.push('/seller/orders' as any)}
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
            </>
          )}

          {/* Booking Actions */}
          {(categoryType === 'booking' || categoryType === 'hybrid') && (
            <>
              <TouchableOpacity
                style={[styles.actionCard, shadows.sm]}
                onPress={() => router.push('/seller/add-service' as any)}
                data-testid="add-service-button"
              >
                <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                  <Ionicons name="add-circle" size={28} color="#8B5CF6" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Add Service Package</Text>
                  <Text style={styles.actionSubtitle}>Create a new service offering</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, shadows.sm]}
                onPress={() => router.push('/seller/bookings' as any)}
                data-testid="view-bookings-button"
              >
                <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                  <Ionicons name="calendar" size={28} color="#F59E0B" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Manage Bookings</Text>
                  <Text style={styles.actionSubtitle}>View and manage service bookings</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          {/* Common Actions */}
          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => router.push('/seller/revenue' as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="analytics" size={28} color={colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Revenue Analytics</Text>
              <Text style={styles.actionSubtitle}>View detailed earnings report</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => router.push('/seller/payout-settings' as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.info + '15' }]}>
              <Ionicons name="wallet" size={28} color={colors.info} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Payout Settings</Text>
              <Text style={styles.actionSubtitle}>Manage bank account details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={[styles.infoCard, shadows.sm]}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={styles.infoText}>
              You're operating as a <Text style={styles.infoBold}>{seller?.category?.name || 'seller'}</Text>.
              {categoryType === 'booking' && ' You can create service packages and manage bookings.'}
              {categoryType === 'ecommerce' && ' You can sell products and manage orders.'}
              {categoryType === 'hybrid' && ' You can both sell products and offer booking services.'}
            </Text>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerIcon: {
    padding: spacing.xs,
  },
  categoryBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  revenueCard: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  revenueHeader: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    opacity: 0.3,
  },
  revenueLabel: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
  },
  revenueValue: {
    ...typography.h1,
    fontSize: 36,
    color: colors.white,
    fontWeight: '700',
    marginVertical: spacing.sm,
  },
  revenueStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.white + '30',
  },
  revenueStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueStatValue: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '600',
  },
  revenueStatLabel: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
    marginTop: spacing.xs / 2,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: colors.white + '30',
    marginHorizontal: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    backgroundColor: colors.surface,
    width: (width - spacing.lg * 2 - spacing.md * 2) / 3,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statIcon: {
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
    fontWeight: '600',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs / 2,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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
  infoSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
