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
import { LinearGradient } from 'expo-linear-gradient';
import { useSellerStore } from '../../src/store/sellerStore';
import { useOrderStore } from '../../src/store/orderStore';

// Premium Professional Color Palette (matching dashboard)
const colors = {
  background: '#0B0C10',
  surface: '#13151A',
  surfaceElevated: '#1A1D24',
  surfaceHigher: '#22262F',
  
  textPrimary: '#FFFFFF',
  textSecondary: '#8E95A9',
  textTertiary: '#5A6178',
  
  accentPrimary: '#2463EB',
  accentPrimaryLight: '#4B82F5',
  accentPrimaryGlow: '#2463EB20',
  
  accentSuccess: '#00D26A',
  accentSuccessGlow: '#00D26A10',
  
  accentWarning: '#FFB443',
  accentWarningGlow: '#FFB44310',
  
  accentError: '#FF5C8A',
  accentErrorGlow: '#FF5C8A10',
  
  accentPurple: '#7C5CFF',
  border: '#1E222A',
};

const gradients = {
  primary: ['#2463EB', '#1A4FCC'],
  success: ['#00D26A', '#00A855'],
  warning: ['#FFB443', '#E69900'],
  error: ['#FF5C8A', '#E63E6C'],
  card: ['#13151A', '#0F1116'],
};

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
        return colors.accentWarning;
      case 'processing':
        return colors.accentPrimary;
      case 'shipped':
        return colors.accentPrimary;
      case 'delivered':
        return colors.accentSuccess;
      case 'cancelled':
        return colors.accentError;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'pending':
        return gradients.warning;
      case 'processing':
        return gradients.primary;
      case 'shipped':
        return gradients.primary;
      case 'delivered':
        return gradients.success;
      case 'cancelled':
        return gradients.error;
      default:
        return gradients.primary;
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
    const firstProductImage = order.items?.[0]?.product?.images?.[0] || order.items?.[0]?.product_image;
    const productCount = order.items?.length || 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/seller/order-detail/${order.id}` as any)}
        data-testid={`order-card-${order.id}`}
      >
        <LinearGradient
          colors={gradients.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orderCard}
        >
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderNumber}>{order.order_number || `#${order.id.slice(0, 8)}`}</Text>
              <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
            </View>
            <LinearGradient
              colors={getStatusGradient(order.status)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBadge}
            >
              <Text style={styles.statusText}>
                {order.status?.toUpperCase() || 'PENDING'}
              </Text>
            </LinearGradient>
          </View>

          {/* Product Preview with Image */}
          {productCount > 0 && (
            <View style={styles.productPreview}>
              {firstProductImage ? (
                <Image
                  source={{ uri: firstProductImage }}
                  style={styles.productImage}
                  defaultSource={require('../../assets/images/placeholder.jpg')}
                />
              ) : (
                <LinearGradient
                  colors={[colors.surfaceElevated, colors.surface]}
                  style={styles.productImagePlaceholder}
                >
                  <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
                </LinearGradient>
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
                <Ionicons name="cube-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.infoText}>{productCount} item{productCount !== 1 ? 's' : ''}</Text>
              </View>
              {/* Payment Status Badge */}
              <View
                style={[
                  styles.paymentBadge,
                  {
                    backgroundColor: order.payment_status === 'paid' ? colors.accentSuccessGlow : colors.accentWarningGlow,
                  },
                ]}
              >
                <Ionicons
                  name={order.payment_status === 'paid' ? 'checkmark-circle' : 'time-outline'}
                  size={12}
                  color={order.payment_status === 'paid' ? colors.accentSuccess : colors.accentWarning}
                />
                <Text
                  style={[
                    styles.paymentStatusText,
                    {
                      color: order.payment_status === 'paid' ? colors.accentSuccess : colors.accentWarning,
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
            <View style={styles.customerInfo}>
              <Ionicons name="person-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.customerName}>{order.customer_name || order.shipping_name || 'Customer'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.gradientBackground}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <LinearGradient
              colors={[colors.surfaceElevated, colors.surface]}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.title}>Orders</Text>
          <View style={{ width: 40 }} />
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={[colors.surface, colors.surfaceElevated]}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="receipt-outline" size={60} color={colors.textTertiary} />
            </LinearGradient>
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
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                tintColor={colors.accentPrimary}
                colors={[colors.accentPrimary]} 
              />
            }
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  orderList: {
    padding: 16,
    paddingTop: 8,
  },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  orderDate: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderBottomColor: colors.border,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
  },
  productImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  moreItems: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderInfo: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accentPrimary,
    letterSpacing: -0.5,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});