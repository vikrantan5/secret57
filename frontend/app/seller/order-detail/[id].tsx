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
  Modal,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrderStore } from '../../../src/store/orderStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';

export default function SellerOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = params.id as string;
  
  const { selectedOrder, loading, fetchOrderById, updateSellerStatus, verifyDeliveryOTP } = useOrderStore();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    if (orderId) {
      fetchOrderById(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    if (selectedOrder) {
      setSelectedStatus(selectedOrder.seller_status || 'pending');
    }
  }, [selectedOrder]);

  const handleUpdateStatus = async () => {
    if (!selectedStatus) {
      Alert.alert('Error', 'Please select a status');
      return;
    }

    const result = await updateSellerStatus(orderId, selectedStatus, statusNotes);

    if (result.success) {
      setShowStatusModal(false);
      setStatusNotes('');
      
      // If status is delivered, show OTP modal
      if (selectedStatus === 'delivered') {
        Alert.alert(
          'Order Marked as Delivered',
          'A 6-digit OTP has been sent to the customer. Please ask the customer for the OTP to complete the delivery.',
          [{ text: 'OK', onPress: () => setShowOTPModal(true) }]
        );
      } else {
        Alert.alert('Success', 'Order status updated successfully');
      }
      
      fetchOrderById(orderId);
    } else {
      Alert.alert('Error', result.error || 'Failed to update status');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpInput || otpInput.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setVerifying(true);
    const result = await verifyDeliveryOTP(orderId, otpInput);
    setVerifying(false);

    if (result.success) {
      setShowOTPModal(false);
      setOtpInput('');
      Alert.alert(
        'Success',
        'Delivery verified successfully! Order is now complete.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', result.error || 'Invalid OTP');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'processing':
      case 'processed':
        return colors.primary;
      case 'shipped':
      case 'out_for_delivery':
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
      return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: 'time-outline' },
    { value: 'processing', label: 'Processing', icon: 'refresh-outline' },
    { value: 'processed', label: 'Processed', icon: 'checkmark-outline' },
    { value: 'shipped', label: 'Shipped', icon: 'rocket-outline' },
    { value: 'out_for_delivery', label: 'Out for Delivery', icon: 'car-outline' },
    { value: 'delivered', label: 'Delivered', icon: 'checkmark-circle-outline' },
  ];

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
  const canUpdateStatus = order.payment_status === 'paid' && !order.otp_verified;

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
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(order.seller_status || order.status) }]}>
          <Text style={styles.statusBannerText}>
            {(order.seller_status || order.status).toUpperCase().replace('_', ' ')}
          </Text>
        </View>

        {/* Order Info Card */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Order Number:</Text>
            <Text style={styles.value}>{order.order_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Order Date:</Text>
            <Text style={styles.value}>{formatDate(order.created_at)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Payment Status:</Text>
            <View style={[
              styles.paymentBadge,
              { backgroundColor: order.payment_status === 'paid' ? colors.success + '20' : colors.warning + '20' }
            ]}>
              <Text style={[
                styles.paymentBadgeText,
                { color: order.payment_status === 'paid' ? colors.success : colors.warning }
              ]}>
                {order.payment_status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Info Card */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{order.shipping_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{order.shipping_phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{order.shipping_address}, {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}</Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Order Items ({order.items?.length || order.order_items?.length || 0})</Text>
          {(order.items || order.order_items)?.map((item: any, index: number) => (
            <View key={index} style={styles.orderItem}>
              <Image
                source={{ uri: item.product?.images?.[0] || item.product_image || 'https://via.placeholder.com/80' }}
                style={styles.itemImage}
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product_name || item.product?.name || 'Product'}
                </Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
              </View>
              <Text style={styles.itemTotal}>₹{item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>



        

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
            <Text style={styles.summaryValue}>
              {order.delivery_charges === 0 ? 'FREE' : `₹${order.delivery_charges.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{order.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* OTP Verified Badge */}
        {order.otp_verified && (
          <View style={[styles.card, shadows.sm, { backgroundColor: colors.success + '10' }]}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-done-circle" size={32} color={colors.success} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.cardTitle, { color: colors.success }]}>Delivery Verified</Text>
                <Text style={styles.verifiedText}>
                  OTP verified successfully. Order has been completed.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Update Status Button */}
        {canUpdateStatus && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.updateStatusButton]}
              onPress={() => setShowStatusModal(true)}
              data-testid="update-status-button"
            >
              <Ionicons name="create-outline" size={20} color={colors.surface} />
              <Text style={styles.updateStatusButtonText}>Update Order Status</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Verify OTP Button (if delivered but not verified) */}
        {order.seller_status === 'delivered' && !order.otp_verified && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.verifyOTPButton]}
              onPress={() => setShowOTPModal(true)}
              data-testid="verify-otp-button"
            >
              <Ionicons name="key-outline" size={20} color={colors.surface} />
              <Text style={styles.verifyOTPButtonText}>Verify Delivery OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

       {/* Update Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <TouchableOpacity 
            style={[styles.modalContent, shadows.lg]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="swap-horizontal" size={32} color={colors.primary} />
              <Text style={styles.modalTitle}>Update Order Status</Text>
            </View>
            
            <Text style={styles.modalDescription}>Select the current status of this order</Text>

            <ScrollView 
              style={styles.statusOptionsScroll}
              showsVerticalScrollIndicator={false}
            >
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    selectedStatus === option.value && styles.statusOptionActive
                  ]}
                  onPress={() => setSelectedStatus(option.value)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={selectedStatus === option.value ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[
                    styles.statusOptionText,
                    selectedStatus === option.value && styles.statusOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.notesInput}
              placeholder="Add notes (optional)"
              placeholderTextColor={colors.textSecondary}
              value={statusNotes}
              onChangeText={setStatusNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowStatusModal(false);
                  setStatusNotes('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleUpdateStatus}
              >
                <Text style={styles.confirmButtonText}>Update Status</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOTPModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOTPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Ionicons name="key" size={32} color={colors.primary} />
              <Text style={styles.modalTitle}>Enter Delivery OTP</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              Ask the customer for the 6-digit OTP shown on their order page to verify delivery.
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor={colors.textSecondary}
              value={otpInput}
              onChangeText={(text) => setOtpInput(text.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              data-testid="otp-input-field"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowOTPModal(false);
                  setOtpInput('');
                }}
                disabled={verifying}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleVerifyOTP}
                disabled={verifying || otpInput.length !== 6}
                data-testid="verify-delivery-otp-button"
              >
                {verifying ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.confirmButtonText}>Verify & Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  statusBanner: {
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusBannerText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    letterSpacing: 1,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  paymentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  paymentBadgeText: {
    ...typography.caption,
    fontWeight: '600',
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
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  itemQuantity: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
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
    marginBottom: spacing.sm,
  },
  updateStatusButton: {
    backgroundColor: colors.primary,
  },
  updateStatusButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  verifyOTPButton: {
    backgroundColor: colors.success,
  },
  verifyOTPButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxHeight: '85%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  modalDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  statusOptionsScroll: {
    maxHeight: 300,
    marginBottom: spacing.lg,
  },
  statusOptions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statusOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  statusOptionText: {
    ...typography.body,
    color: colors.text,
  },
  statusOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  notesInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  otpInput: {
    ...typography.h2,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary + '30',
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
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
