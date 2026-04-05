import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSellerStore } from '../../src/store/sellerStore';
import { useOrderStore } from '../../src/store/orderStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SellerOrdersScreen() {
  const router = useRouter();
  const { seller } = useSellerStore();
  const { orders, fetchSellerOrders, loading } = useOrderStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (seller?.id) {
      loadOrders();
    }
  }, [seller?.id]);

  const loadOrders = async () => {
    if (seller?.id) {
      await fetchSellerOrders(seller.id);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

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

  const renderOrderCard = ({ item: order }: { item: any }) => {
    // Get first product image
    const firstProductImage = order.items?.[0]?.product?.images?.[0] || order.items?.[0]?.product_image;
    const productCount = order.items?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.orderCard, shadows.sm]}
        onPress={() => router.push(`/seller/order-detail/${order.id}` as any)}
        data-testid={`order-card-${order.id}`}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderNumber}>{order.order_number || `#${order.id.slice(0, 8)}`}</Text>
            <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {order.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>

        {/* Product Preview with Image */}
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
                {order.items?.[0]?.product_name || order.items?.[0]?.product?.name || 'Product'}
              </Text>
              {productCount > 1 && (
                <Text style={styles.moreItems}>+{productCount - 1} more item{productCount - 1 > 1 ? 's' : ''}</Text>
              )}
            </View>
          </View>
        )}

        {/* Order Details */}
        <View style={styles.orderBody}>
          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="cube-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{productCount} item{productCount !== 1 ? 's' : ''}</Text>
            </View>
            {/* Payment Status Badge */}
            <View
              style={[
                styles.paymentBadge,
                {
                  backgroundColor: order.payment_status === 'paid' ? colors.success + '20' : colors.warning + '20',
                },
              ]}
            >
              <Ionicons
                name={order.payment_status === 'paid' ? 'checkmark-circle' : 'time'}
                size={14}
                color={order.payment_status === 'paid' ? colors.success : colors.warning}
              />
              <Text
                style={[
                  styles.paymentStatusText,
                  {
                    color: order.payment_status === 'paid' ? colors.success : colors.warning,
                  },
                ]}
              >
                {order.payment_status === 'paid' ? 'PAID' : order.payment_status?.toUpperCase() || 'PENDING'}
              </Text>
            </View>
          </View>
          <Text style={styles.orderTotal}>₹{Number(order.total_amount || 0).toFixed(2)}</Text>
        </View>

        {/* Order Footer */}
        <View style={styles.orderFooter}>
          <Text style={styles.customerName}>Customer: {order.customer_name || order.shipping_name || 'N/A'}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={80} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>Orders from customers will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.orderList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
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
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  orderList: {
    padding: spacing.lg,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  orderDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
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
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  orderInfo: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  paymentStatusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  orderTotal: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  customerName: {
    ...typography.body,
    color: colors.text,
  },
});
