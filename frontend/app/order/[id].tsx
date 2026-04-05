import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrderStore } from '../../src/store/orderStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = params.id as string;
  
  const { selectedOrder, loading, fetchOrderById, cancelOrder } = useOrderStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    if (orderId) {
      fetchOrderById(orderId);
    }
  }, [orderId]);
   // ✅ FIX: Auto-refresh order when screen comes into focus
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      if (orderId && selectedOrder?.payment_status === 'pending') {
        console.log('🔄 Auto-refreshing pending order...');
        fetchOrderById(orderId);
      }
    }, 5000); // Refresh every 5 seconds if payment is pending

    return () => clearInterval(refreshTimer);
  }, [orderId, selectedOrder?.payment_status]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'processing':
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time';
      case 'processing':
        return 'refresh-circle';
      case 'shipped':
        return 'car';
      case 'delivered':
        return 'checkmark-circle';
      case 'cancelled':
      case 'refunded':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    const result = await cancelOrder(orderId, cancellationReason);
    
    if (result.success) {
      setShowCancelModal(false);
      setCancellationReason('');
      Alert.alert(
        'Order Cancelled',
        'Your order has been cancelled successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to cancel order');
    }
  };

  if (loading || !selectedOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const order = selectedOrder;
  const canCancel = order.status === 'pending' || order.status === 'processing';

  // Order tracking steps
  const trackingSteps = [
    { status: 'pending', label: 'Order Placed', icon: 'cart' },
    { status: 'processing', label: 'Processing', icon: 'refresh-circle' },
    { status: 'shipped', label: 'Shipped', icon: 'car' },
    { status: 'delivered', label: 'Delivered', icon: 'checkmark-circle' },
  ];

  const getCurrentStepIndex = () => {
    const index = trackingSteps.findIndex(step => step.status === order.status);
    return index >= 0 ? index : 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Status Card */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor(order.status) }]}>
              <Ionicons name={getStatusIcon(order.status) as any} size={32} color={colors.surface} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>{order.status.toUpperCase()}</Text>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
            </View>
          </View>
        </View>

        {/* Tracking Timeline */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <View style={[styles.card, shadows.sm]}>
            <Text style={styles.cardTitle}>Order Tracking</Text>
            <View style={styles.timeline}>
              {trackingSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isActive = index === currentStepIndex;

                return (
                  <View key={step.status} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineIcon,
                          isCompleted && styles.timelineIconActive,
                        ]}
                      >
                        <Ionicons
                          name={step.icon as any}
                          size={20}
                          color={isCompleted ? colors.surface : colors.textSecondary}
                        />
                      </View>
                      {index < trackingSteps.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            isCompleted && styles.timelineLineActive,
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text
                        style={[
                          styles.timelineLabel,
                          isActive && styles.timelineLabelActive,
                        ]}
                      >
                        {step.label}
                      </Text>
                      {isActive && order.updated_at && (
                        <Text style={styles.timelineDate}>
                          {formatDate(order.updated_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Items ({order.items?.length || 0})</Text>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <Image
                source={{ uri: item.product?.images?.[0] || 'https://via.placeholder.com/80' }}
                style={styles.itemImage}
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product?.name || 'Product'}
                </Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
              </View>
              <Text style={styles.itemTotal}>₹{item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Shipping Address */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Shipping Address</Text>
          <View style={styles.addressRow}>
            <Ionicons name="person" size={20} color={colors.primary} />
            <Text style={styles.addressText}>{order.shipping_name}</Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="call" size={20} color={colors.primary} />
            <Text style={styles.addressText}>{order.shipping_phone}</Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressText}>{order.shipping_address}</Text>
              <Text style={styles.addressText}>
                {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}
              </Text>
            </View>
          </View>
        </View>


                {/* Delivery OTP Card - Show to customer when order is delivered */}
        {order.delivery_otp && !order.otp_verified && order.seller_status === 'delivered' && (
          <View style={[styles.card, shadows.sm, styles.otpCard]}>
            <View style={styles.otpHeader}>
              <Ionicons name="key" size={28} color={colors.primary} />
              <Text style={styles.cardTitle}>Delivery Verification OTP</Text>
            </View>
            <Text style={styles.otpDescription}>
              Share this OTP with the delivery person to confirm you have received your order
            </Text>
            <View style={styles.otpContainer}>
              <Text style={styles.otpText}>{order.delivery_otp}</Text>
            </View>
            <View style={styles.otpNote}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.otpNoteText}>
                Keep this OTP private. Only share with the delivery person upon receiving your order.
              </Text>
            </View>
          </View>
        )}

        {/* OTP Verified Badge */}
        {order.otp_verified && (
          <View style={[styles.card, shadows.sm, { backgroundColor: colors.success + '10' }]}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.cardTitle, { color: colors.success }]}>Delivery Verified</Text>
                <Text style={styles.verifiedText}>
                  Your order has been successfully delivered and verified.
                </Text>
              </View>
            </View>
          </View>
        )}


        {/* Payment Summary */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{order.subtotal.toFixed(2)}</Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                -₹{order.discount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {order.delivery_charges === 0 ? 'FREE' : `₹${order.delivery_charges.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{order.total_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.paymentStatusRow}>
            <Text style={styles.summaryLabel}>Payment Status</Text>
            <View
              style={[
                styles.paymentBadge,
                {
                  backgroundColor:
                    order.payment_status === 'paid' ? colors.success + '20' : colors.warning + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.paymentBadgeText,
                  {
                    color: order.payment_status === 'paid' ? colors.success : colors.warning,
                  },
                ]}
              >
                {order.payment_status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancel Modal */}
        {showCancelModal && (
          <View style={[styles.card, shadows.md, { backgroundColor: colors.surface }]}>
            <Text style={styles.cardTitle}>Cancel Order</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for cancellation:</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter reason..."
              placeholderTextColor={colors.textSecondary}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancellationReason('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmCancelButton]}
                onPress={handleCancelOrder}
              >
                <Text style={styles.confirmCancelButtonText}>Cancel Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {canCancel && !showCancelModal && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setShowCancelModal(true)}
              data-testid="cancel-order-button"
            >
              <Ionicons name="close-circle" size={20} color={colors.surface} />
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
          
          {/* Report Seller Button */}
          {order.status === 'delivered' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.reportButton]}
              onPress={() => router.push(`/complaints/create?orderId=${orderId}&sellerId=${order.items?.[0]?.seller_id}`)}
              data-testid="report-seller-button"
            >
              <Ionicons name="flag-outline" size={20} color={colors.surface} />
              <Text style={styles.reportButtonText}>Report Issue</Text>
            </TouchableOpacity>
          )}
          
          {/* Request Refund Button */}
          {order.status === 'delivered' && order.payment_status === 'paid' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.refundButton]}
              onPress={() => router.push(`/order/${orderId}/refund`)}
              data-testid="request-refund-button"
            >
              <Ionicons name="return-down-back-outline" size={20} color={colors.surface} />
              <Text style={styles.refundButtonText}>Request Refund</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  orderNumber: {
    ...typography.body,
    color: colors.textSecondary,
  },
  timeline: {
    marginTop: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineLeft: {
    alignItems: 'center',
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconActive: {
    backgroundColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  timelineLineActive: {
    backgroundColor: colors.primary,
  },
  timelineContent: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  timelineLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timelineLabelActive: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  timelineDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  itemQuantity: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  itemTotal: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  addressText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalLabel: {
    ...typography.h4,
    color: colors.text,
  },
  totalValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  paymentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  paymentBadgeText: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  textArea: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelModalButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  confirmCancelButton: {
    backgroundColor: colors.error,
  },
  confirmCancelButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  actionButtons: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
    reportButton: {
    backgroundColor: colors.warning,
    marginTop: spacing.sm,
  },
  reportButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  refundButton: {
    backgroundColor: colors.info,
    marginTop: spacing.sm,
  },
  refundButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  otpCard: {
    backgroundColor: colors.primary + '08',
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  otpDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  otpContainer: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '20',
    borderStyle: 'dashed',
    marginBottom: spacing.md,
  },
  otpText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 8,
  },
  otpNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  otpNoteText: {
    ...typography.bodySmall,
    color: colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
