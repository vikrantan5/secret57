import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { useOrderStore, Order } from '../../src/store/orderStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

type FilterType = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderCardProps {
  item: Order;
  index: number;
  onPress: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ item, index, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const firstProductImage = item.order_items?.[0]?.product_image || item.order_items?.[0]?.product?.images?.[0];
  const firstProductName = item.order_items?.[0]?.product_name || item.order_items?.[0]?.product?.name || 'Product';
  const productCount = item.order_items?.length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'processing': return '#8B5CF6';
      case 'shipped': return '#3B82F6';
      case 'delivered': return '#10B981';
      case 'cancelled':
      case 'refunded': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'pending': return ['#FEF3C7', '#FDE68A'];
      case 'processing': return ['#E0E7FF', '#C7D2FE'];
      case 'shipped': return ['#DBEAFE', '#BFDBFE'];
      case 'delivered': return ['#D1FAE5', '#A7F3D0'];
      case 'cancelled': return ['#FEE2E2', '#FECACA'];
      default: return ['#F3F4F6', '#E5E7EB'];
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const filters = [
    { key: 'pending', icon: 'time-outline' },
    { key: 'processing', icon: 'refresh-outline' },
    { key: 'shipped', icon: 'car-outline' },
    { key: 'delivered', icon: 'checkmark-circle-outline' },
    { key: 'cancelled', icon: 'close-circle-outline' },
  ];

  const getFilterIcon = (status: string) => {
    const filter = filters.find(f => f.key === status);
    return filter?.icon || 'help-circle-outline';
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const statusColor = getStatusColor(item.status);

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.orderCard}
        onPress={onPress}
        activeOpacity={0.95}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F9FAFB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Order Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.orderNumber}>#{item.order_number?.slice(0, 12)}</Text>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
              </View>
            </View>
            <LinearGradient
              colors={getStatusGradient(item.status)}
              style={styles.statusBadge}
            >
              <Ionicons name={getFilterIcon(item.status)} size={14} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </LinearGradient>
          </View>

          {/* Product Preview */}
          {productCount > 0 && (
            <View style={styles.productPreview}>
              {firstProductImage ? (
                <View style={styles.productImageContainer}>
                  <Image
                    source={{ uri: firstProductImage }}
                    style={styles.productImage}
                    defaultSource={require('../../assets/images/placeholder.jpg')}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.2)']}
                    style={styles.productImageOverlay}
                  />
                </View>
              ) : (
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.productImagePlaceholder}
                >
                  <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
                </LinearGradient>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {firstProductName}
                </Text>
                {productCount > 1 && (
                  <View style={styles.moreItemsBadge}>
                    <Text style={styles.moreItems}>+{productCount - 1} more item{productCount - 1 > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Order Info */}
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.infoIconBg}
              >
                <Ionicons name="cube-outline" size={14} color="#6B7280" />
              </LinearGradient>
              <Text style={styles.infoText}>
                {productCount} item{productCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <LinearGradient
                colors={[statusColor + '20', statusColor + '10']}
                style={styles.paymentIconBg}
              >
                <Ionicons 
                  name={item.payment_status === 'paid' ? 'checkmark-circle' : 'time-outline'} 
                  size={14} 
                  color={item.payment_status === 'paid' ? '#10B981' : '#F59E0B'} 
                />
              </LinearGradient>
              <Text style={[styles.infoText, { color: item.payment_status === 'paid' ? '#10B981' : '#F59E0B' }]}>
                {item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <LinearGradient
              colors={['#1E1B4B', '#312E81']}
              style={styles.totalContainer}
            >
              <Text style={styles.totalValue}>₹{(item.total_amount || 0).toFixed(2)}</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function OrdersScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { orders, loading, fetchOrders } = useOrderStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ✅ Fix: Always load orders on mount. Remove the !loading race guard that
  // could skip fetching when zustand's loading was already true from another screen.
  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    try {
      console.log('🔄 Loading orders for user:', user.id);
      await fetchOrders(user.id);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setInitialLoadDone(true);
    }
  }, [user?.id, fetchOrders]);

  // Load orders when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      setInitialLoadDone(false);
      loadOrders();
    } else if (!isAuthenticated) {
      // Redirect to login if not authenticated
      router.replace('/login');
    }
  }, [user?.id, isAuthenticated]);

  // Refresh on screen focus (return from order detail / back from checkout)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        console.log('🔄 Screen focused, refreshing orders...');
        fetchOrders(user.id);
      }
      return () => {};
    }, [user?.id, fetchOrders])
  );

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

  // Auto-refresh for pending orders
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;
    
    const hasPendingOrders = orders.some(order => order.payment_status === 'pending');
    
    if (hasPendingOrders && user?.id && initialLoadDone) {
      refreshTimer = setInterval(() => {
        console.log('🔄 Auto-refreshing orders (pending orders detected)...');
        fetchOrders(user.id);
      }, 10000);
    }

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [orders, user?.id, initialLoadDone, fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user?.id) {
      await fetchOrders(user.id);
      setInitialLoadDone(true);
    }
    setRefreshing(false);
  };

  const filters = [
    { key: 'all' as FilterType, label: 'All', icon: 'apps-outline', color: '#8B5CF6' },
    { key: 'pending' as FilterType, label: 'Pending', icon: 'time-outline', color: '#F59E0B' },
    { key: 'processing' as FilterType, label: 'Processing', icon: 'refresh-outline', color: '#8B5CF6' },
    { key: 'shipped' as FilterType, label: 'Shipped', icon: 'car-outline', color: '#3B82F6' },
    { key: 'delivered' as FilterType, label: 'Delivered', icon: 'checkmark-circle-outline', color: '#10B981' },
    { key: 'cancelled' as FilterType, label: 'Cancelled', icon: 'close-circle-outline', color: '#EF4444' },
  ];

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'all') return true;
    return order.status === activeFilter;
  });

  // Show loading while initial load is in progress
  if (!initialLoadDone) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

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
          <View style={styles.headerContent}>
            <Text style={styles.title}>My Orders</Text>
            <View style={styles.orderCountBadge}>
              <Text style={styles.subtitle}>
                {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Premium Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item: filter }) => {
            const isActive = activeFilter === filter.key;
            return (
              <TouchableOpacity
                style={styles.filterWrapper}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveFilter(filter.key);
                }}
                activeOpacity={0.8}
              >
                {isActive ? (
                  <LinearGradient
                    colors={[filter.color, filter.color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.filterButtonActive}
                  >
                    <Ionicons name={filter.icon as any} size={14} color="#FFFFFF" />
                    <Text style={styles.filterTextActive}>{filter.label}</Text>
                  </LinearGradient>
                ) : (
                  <BlurView intensity={5} tint="light" style={styles.filterButton}>
                    <Ionicons name={filter.icon as any} size={14} color="#6B7280" />
                    <Text style={styles.filterText}>{filter.label}</Text>
                  </BlurView>
                )}
              </TouchableOpacity>
            );
          }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 && initialLoadDone ? (
        <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={['#F3F4F6', '#E5E7EB']}
            style={styles.emptyIconContainer}
          >
            <Ionicons name="bag-handle-outline" size={48} color="#9CA3AF" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'all'
              ? 'Place an order to see it here'
              : `No ${activeFilter} orders`}
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)/categories')}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.browseGradient}
            >
              <Ionicons name="storefront-outline" size={20} color="#FFFFFF" />
              <Text style={styles.browseButtonText}>Browse Products</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <OrderCard
              item={item}
              index={index}
              onPress={() => router.push(`/order/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
          style={{ opacity: fadeAnim }}
        />
      )}
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
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  orderCountBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.md,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterWrapper: {
    marginRight: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  orderCard: {
    marginBottom: spacing.md,
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
  cardGradient: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: spacing.xs,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 65,
    height: 65,
    borderRadius: borderRadius.md,
  },
  productImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  productImagePlaceholder: {
    width: 65,
    height: 65,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  moreItemsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  moreItems: {
    fontSize: 11,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: spacing.sm,
  },
  cardBody: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  totalContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  browseButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  browseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});