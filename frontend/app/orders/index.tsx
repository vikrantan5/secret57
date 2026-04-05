import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useOrderStore, Order } from '../../src/store/orderStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

type FilterType = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { orders, loading, fetchOrders } = useOrderStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchOrders(user.id);
    }
  }, [user]);

   // ✅ FIX: Auto-refresh orders every 10 seconds if there are pending orders
  useEffect(() => {
    const hasPendingOrders = orders.some(order => order.payment_status === 'pending');
    
    if (hasPendingOrders && user?.id) {
      const refreshTimer = setInterval(() => {
        console.log('🔄 Auto-refreshing orders (pending orders detected)...');
        fetchOrders(user.id);
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(refreshTimer);
    }
  }, [orders, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await fetchOrders(user.id);
    }
    setRefreshing(false);
  };

  const filters = [
    { key: 'all' as FilterType, label: 'All' },
    { key: 'pending' as FilterType, label: 'Pending' },
    { key: 'processing' as FilterType, label: 'Processing' },
    { key: 'shipped' as FilterType, label: 'Shipped' },
    { key: 'delivered' as FilterType, label: 'Delivered' },
    { key: 'cancelled' as FilterType, label: 'Cancelled' },
  ];

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'all') return true;
    return order.status === activeFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'processing':
        return colors.primary;
      case 'shipped':
        return colors.primary;
      case 'delivered':
        return colors.success;
      case 'cancelled':
      case 'refunded':
        return colors.error;
      default:
        return colors.textSecondary;
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

  const renderOrderCard = ({ item }: { item: Order }) => {
    // ✅ FIX: Get product image and details from order_items
    const firstProductImage = item.order_items?.[0]?.product_image || item.order_items?.[0]?.product?.images?.[0];
    const firstProductName = item.order_items?.[0]?.product_name || item.order_items?.[0]?.product?.name || 'Product';
    const productCount = item.order_items?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.orderCard, shadows.sm]}
        onPress={() => router.push(`/order/${item.id}`)}
        data-testid={`order-card-${item.id}`}
      >
        {/* Order Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderNumber}>{item.order_number}</Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* ✅ FIX: Product Preview with Image */}
        {productCount > 0 && (
          <View style={styles.productPreview}>
            {firstProductImage && (
              <Image
                source={{ uri: firstProductImage }}
                style={styles.productImage}
                defaultSource={require('../../assets/images/placeholder.jpg')}
              />
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {firstProductName}
              </Text>
              {productCount > 1 && (
                <Text style={styles.moreItems}>+{productCount - 1} more item{productCount - 1 > 1 ? 's' : ''}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="cube" size={18} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              {productCount} item{productCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons 
              name={item.payment_status === 'paid' ? 'checkmark-circle' : 'time'} 
              size={18} 
              color={item.payment_status === 'paid' ? colors.success : colors.warning} 
            />
            <Text style={styles.infoText}>
              {item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₹{(item.total_amount || 0).toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Orders</Text>
          <Text style={styles.subtitle}>
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item: filter }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === filter.key && styles.activeFilterButton,
              ]}
              onPress={() => setActiveFilter(filter.key)}
              data-testid={`filter-${filter.key}`}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.key && styles.activeFilterText,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bag-handle-outline" size={80} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'all'
              ? 'Place an order to see it here'
              : `No ${activeFilter} orders`}
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)/categories')}
            data-testid="browse-products-button"
          >
            <Text style={styles.browseButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}
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
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeFilterText: {
    color: colors.surface,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  orderDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs / 2,
  },
  moreItems: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  cardBody: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  totalLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  totalValue: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  browseButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
