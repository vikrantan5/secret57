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
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { supabase } from '../../src/services/supabase';

const { width } = Dimensions.get('window');

// Premium Professional Color Palette
const colors = {
  // Dark theme base
  background: '#0B0C10',
  surface: '#13151A',
  surfaceElevated: '#1A1D24',
  surfaceHigher: '#22262F',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#8E95A9',
  textTertiary: '#5A6178',
  
  // Premium accent colors
  accentPrimary: '#2463EB',
  accentPrimaryLight: '#4B82F5',
  accentPrimaryGlow: '#2463EB20',
  
  accentSuccess: '#00D26A',
  accentSuccessGlow: '#00D26A10',
  
  accentWarning: '#FFB443',
  accentWarningGlow: '#FFB44310',
  
  accentPurple: '#7C5CFF',
  accentPurpleGlow: '#7C5CFF10',
  
  accentPink: '#FF5C8A',
  accentCyan: '#00D4FF',
  
  // Borders
  borderSubtle: '#1E222A',
  borderMedium: '#2A2E38',
};

// Premium Gradients
const gradients = {
  primary: ['#2463EB', '#1A4FCC'],
  revenue: ['#0F1825', '#1A2438'],
  success: ['#00D26A', '#00A855'],
  warning: ['#FFB443', '#E69900'],
  purple: ['#7C5CFF', '#5B3EE6'],
  card: ['#13151A', '#0F1116'],
  elevated: ['#1A1D24', '#13151A'],
  button: ['#2463EB', '#1A4FCC'],
  info: ['#00D4FF', '#00A8CC'],
};

export default function SellerDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { seller, fetchSellerProfile } = useSellerStore();
  const { currentSubscription, fetchSellerSubscriptions } = useSubscriptionStore();
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
    
    if (seller?.id) {
      await fetchSellerSubscriptions(seller.id);
    }
    
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

      if (type === 'ecommerce' || type === 'hybrid') {
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
        const { count: bookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerData.id);

        const { count: servicesCount } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerData.id)
          .eq('is_active', true);

        const { count: pendingBookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerData.id)
          .eq('status', 'pending');

        const { count: completedBookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerData.id)
          .eq('status', 'completed');

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

  const formatRevenue = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const StatCard = ({ icon, label, value, gradient, subtitle, valuePrefix }: any) => (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statCard}
    >
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={22} color="#FFF" />
      </View>
      <View>
        <Text style={styles.statValue}>
          {valuePrefix}{value}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </LinearGradient>
  );

  const QuickActionCard = ({ icon, title, subtitle, onPress, gradient }: any) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quickActionCard}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickActionIcon}
        >
          <Ionicons name={icon} size={22} color="#FFF" />
        </LinearGradient>
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.textTertiary} />
      </LinearGradient>
    </TouchableOpacity>
  );

  const getCategoryGradient = (type: string) => {
    switch (type) {
      case 'booking': return gradients.warning;
      case 'ecommerce': return gradients.success;
      case 'hybrid': return gradients.purple;
      default: return gradients.primary;
    }
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'booking': return 'Booking Services';
      case 'ecommerce': return 'E-commerce';
      case 'hybrid': return 'Hybrid Store';
      default: return type;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0C10" />
        <LinearGradient
          colors={['#0B0C10', '#13151A']}
          style={styles.loadingContainer}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.accentPrimary} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0C10" />
      
      <LinearGradient
        colors={['#0B0C10', '#13151A']}
        style={styles.gradientBackground}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.userName}>{seller?.shop_name || 'Seller'}</Text>
              <LinearGradient
                colors={getCategoryGradient(categoryType)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.categoryChip}
              >
                <Text style={styles.categoryChipText}>
                  {getCategoryLabel(categoryType)}
                </Text>
              </LinearGradient>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
               onPress={() => router.push('/notifications' as any)}
                style={styles.iconButton}
              >
                <LinearGradient
                  colors={[colors.surfaceElevated, colors.surface]}
                  style={styles.iconGradient}
                >
                  <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                  <View style={styles.notificationBadge} />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  Alert.alert('Logout', 'Are you sure you want to logout?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: logout },
                  ]);
                }}
                style={styles.iconButton}
              >
                <LinearGradient
                  colors={[colors.surfaceElevated, colors.surface]}
                  style={styles.iconGradient}
                >
                  <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Subscription Warning */}
          {!currentSubscription && (
            <LinearGradient
              colors={['#1A1814', '#13120F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.warningContainer}
            >
              <View style={styles.warningContent}>
                <Ionicons name="alert-circle" size={20} color={colors.accentWarning} />
                <Text style={styles.warningText}>No active subscription</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/seller/subscription' as any)}
                style={styles.warningButton}
              >
                <LinearGradient
                  colors={gradients.warning}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.warningButtonGradient}
                >
                  <Text style={styles.warningButtonText}>Subscribe</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          )}

          {/* Revenue Card - Premium Design */}
          <LinearGradient
            colors={gradients.revenue}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.revenueCard}
          >
            <View style={styles.revenueHeader}>
              <Text style={styles.revenueLabel}>Total Revenue</Text>
              <View style={styles.revenueBadge}>
                <Text style={styles.revenueBadgeText}>This month</Text>
              </View>
            </View>
            <Text style={styles.revenueAmount}>{formatRevenue(stats.totalRevenue)}</Text>
            <View style={styles.revenueStats}>
              {(categoryType === 'ecommerce' || categoryType === 'hybrid') && (
                <View style={styles.revenueStat}>
                  <Text style={styles.revenueStatValue}>{stats.totalOrders}</Text>
                  <Text style={styles.revenueStatLabel}>Orders</Text>
                </View>
              )}
              {(categoryType === 'booking' || categoryType === 'hybrid') && (
                <View style={styles.revenueStat}>
                  <Text style={styles.revenueStatValue}>{stats.totalBookings}</Text>
                  <Text style={styles.revenueStatLabel}>Bookings</Text>
                </View>
              )}
              <View style={styles.revenueStat}>
                <Text style={styles.revenueStatValue}>+23%</Text>
                <Text style={styles.revenueStatLabel}>Growth</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.statsGrid}>
              {(categoryType === 'ecommerce' || categoryType === 'hybrid') && (
                <>
                  <StatCard
                    icon="cube-outline"
                    label="Active Products"
                    value={stats.activeProducts}
                    gradient={[colors.accentPrimaryGlow, colors.accentPrimary + '05']}
                    subtitle="Available"
                  />
                  <StatCard
                    icon="time-outline"
                    label="Pending"
                    value={stats.pendingOrders}
                    gradient={[colors.accentWarningGlow, colors.accentWarning + '05']}
                  />
                  <StatCard
                    icon="checkmark-circle-outline"
                    label="Completed"
                    value={stats.completedOrders}
                    gradient={[colors.accentSuccessGlow, colors.accentSuccess + '05']}
                  />
                </>
              )}
              {(categoryType === 'booking' || categoryType === 'hybrid') && (
                <>
                  <StatCard
                    icon="calendar-outline"
                    label="Active Services"
                    value={stats.activeServices}
                    gradient={[colors.accentPurpleGlow, colors.accentPurple + '05']}
                    subtitle="Available"
                  />
                  <StatCard
                    icon="time-outline"
                    label="Pending"
                    value={stats.pendingBookings}
                    gradient={[colors.accentWarningGlow, colors.accentWarning + '05']}
                  />
                  <StatCard
                    icon="checkmark-circle-outline"
                    label="Completed"
                    value={stats.completedBookings}
                    gradient={[colors.accentSuccessGlow, colors.accentSuccess + '05']}
                  />
                </>
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            {(categoryType === 'ecommerce' || categoryType === 'hybrid') && (
              <>
                <QuickActionCard
                  icon="add-circle-outline"
                  title="Add Product"
                  subtitle="List a new product for sale"
                  onPress={() => router.push('/seller/add-product' as any)}
                  gradient={gradients.primary}
                />
                <QuickActionCard
                  icon="cube-outline"
                  title="Manage Products"
                  subtitle="Edit or update your products"
                  onPress={() => router.push('/seller/products' as any)}
                  gradient={gradients.purple}
                />
                <QuickActionCard
                  icon="receipt-outline"
                  title="View Orders"
                  subtitle="Manage your orders"
                  onPress={() => router.push('/seller/orders' as any)}
                  gradient={gradients.success}
                />
              </>
            )}

            {(categoryType === 'booking' || categoryType === 'hybrid') && (
              <>
                <QuickActionCard
                  icon="add-circle-outline"
                  title="Add Service"
                  subtitle="Create a new service offering"
                  onPress={() => router.push('/seller/add-service' as any)}
                  gradient={gradients.purple}
                />
                  <QuickActionCard
                    icon="calendar-outline"
                    title="All Bookings"
                    subtitle="View and manage service bookings"
                    onPress={() => router.push('/seller/bookings' as any)}
                    gradient={gradients.warning}
                  />
                     <QuickActionCard
                    icon="cube-outline"
                    title="Manage Services"
                    subtitle="Edit or update your services"
                    onPress={() => router.push('/seller/services' as any)}
                    gradient={gradients.purple}
                  />
              </>
            )}

            {/* Common Actions */}
            <QuickActionCard
              icon="analytics-outline"
              title="Revenue Analytics"
              subtitle="View detailed earnings report"
              onPress={() => router.push('/seller/revenue' as any)}
              gradient={[colors.accentPink, colors.accentPink]}
            />
            <QuickActionCard
              icon="wallet-outline"
              title="Payout Settings"
              subtitle="Manage bank account details"
              onPress={() => router.push('/seller/payout-settings' as any)}
              gradient={[colors.accentCyan, colors.accentCyan]}
            />
            <QuickActionCard
              icon="card-outline"
              title="Subscription"
              subtitle={currentSubscription ? 'Manage your subscription' : 'Subscribe to start selling'}
              onPress={() => router.push('/seller/subscription' as any)}
              gradient={gradients.primary}
            />
          </View>

          {/* Info Card */}
          <LinearGradient
            colors={[colors.accentPrimaryGlow, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoCard}
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.accentPrimary} />
            <Text style={styles.infoText}>
              Operating as a <Text style={styles.infoBold}>{seller?.category?.name || 'seller'}</Text>.
              {categoryType === 'booking' && ' Create service packages and manage bookings.'}
              {categoryType === 'ecommerce' && ' Sell products and manage orders.'}
              {categoryType === 'hybrid' && ' Sell products and offer booking services.'}
            </Text>
          </LinearGradient>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C10',
  },
  gradientBackground: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#8E95A9',
    marginTop: 12,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 13,
    color: '#8E95A9',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  iconGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF5C8A',
    borderWidth: 1,
    borderColor: '#13151A',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#FFB443',
    fontWeight: '500',
  },
  warningButton: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  warningButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  warningButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  revenueCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E222A',
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  revenueLabel: {
    fontSize: 13,
    color: '#8E95A9',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  revenueBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  revenueBadgeText: {
    fontSize: 11,
    color: '#8E95A9',
    fontWeight: '500',
  },
  revenueAmount: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -1,
  },
  revenueStats: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E222A',
  },
  revenueStat: {
    flex: 1,
    alignItems: 'center',
  },
  revenueStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  revenueStatLabel: {
    fontSize: 11,
    color: '#8E95A9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  statsGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#1E222A',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E95A9',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#5A6178',
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E222A',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#8E95A9',
  },
  infoCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#1E222A',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#8E95A9',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '600',
    color: '#4B82F5',
  },
});