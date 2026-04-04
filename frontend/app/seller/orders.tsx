import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
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
      case 'confirmed':
        return colors.info;
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              Orders from customers will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.orderList}>
            {orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, shadows.sm]}
                onPress={() => router.push(`/order/${order.id}` as any)}
              >
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(order.status) }
                    ]}>
                      {order.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                                <View style={styles.orderBody}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderItems}>
                      {order.items?.length || 0} item(s)
                    </Text>
                    {/* Payment Status Badge */}
                    <View style={[
                      styles.paymentBadge,
                      { 
                        backgroundColor: order.payment_status === 'paid' 
                          ? colors.success + '20' 
                          : colors.warning + '20' 
                      }
                    ]}>
                      <Ionicons 
                        name={order.payment_status === 'paid' ? 'checkmark-circle' : 'time'} 
                        size={14} 
                        color={order.payment_status === 'paid' ? colors.success : colors.warning} 
                      />
                      <Text style={[
                        styles.paymentStatusText,
                        { 
                          color: order.payment_status === 'paid' 
                            ? colors.success 
                            : colors.warning 
                        }
                      ]}>
                        {order.payment_status === 'paid' ? 'PAID' : order.payment_status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.orderTotal}>₹{order.total_amount}</Text>
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.customerName}>
                    Customer: {order.customer_name || 'N/A'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
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
  orderId: {
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
  orderItems: {
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