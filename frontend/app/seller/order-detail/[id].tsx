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
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useOrderStore } from '../../../src/store/orderStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';

const { width } = Dimensions.get('window');

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
        return '#f59e0b';
      case 'processing':
      case 'processed':
        return '#6366f1';
      case 'shipped':
      case 'out_for_delivery':
        return '#8b5cf6';
      case 'delivered':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'processing':
        return 'refresh-outline';
      case 'shipped':
        return 'rocket-outline';
      case 'delivered':
        return 'checkmark-circle-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
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
    { value: 'pending', label: 'Pending', icon: 'time-outline', color: '#f59e0b' },
    { value: 'processing', label: 'Processing', icon: 'refresh-outline', color: '#6366f1' },
    { value: 'processed', label: 'Processed', icon: 'checkmark-outline', color: '#8b5cf6' },
    { value: 'shipped', label: 'Shipped', icon: 'rocket-outline', color: '#a78bfa' },
    { value: 'out_for_delivery', label: 'Out for Delivery', icon: 'car-outline', color: '#c084fc' },
    { value: 'delivered', label: 'Delivered', icon: 'checkmark-circle-outline', color: '#10b981' },
  ];

  if (loading || !selectedOrder) {
    return (
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading order details...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const order = selectedOrder;
  const canUpdateStatus = order.payment_status === 'paid' && !order.otp_verified;
  const statusColor = getStatusColor(order.seller_status || order.status);

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
            <View style={{ width: 40 }} />
          </View>
        </BlurView>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Status Banner */}
          <LinearGradient
            colors={[statusColor, statusColor + 'cc']}
            style={styles.statusBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name={getStatusIcon(order.seller_status || order.status)} size={24} color="#FFFFFF" />
            <Text style={styles.statusBannerText}>
              {(order.seller_status || order.status).toUpperCase().replace('_', ' ')}
            </Text>
          </LinearGradient>

          {/* Order Info Card */}
          <LinearGradient
            colors={['#1e1e1e', '#161616']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="receipt-outline" size={20} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>Order Information</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Order Number</Text>
              <Text style={styles.value}>#{order.order_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Order Date</Text>
              <Text style={styles.value}>{formatDate(order.created_at)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Payment Status</Text>
              <View style={[
                styles.paymentBadge,
                { backgroundColor: order.payment_status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }
              ]}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: order.payment_status === 'paid' ? '#10b981' : '#f59e0b' }
                ]} />
                <Text style={[
                  styles.paymentBadgeText,
                  { color: order.payment_status === 'paid' ? '#10b981' : '#f59e0b' }
                ]}>
                  {order.payment_status.toUpperCase()}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Customer Info Card */}
          <LinearGradient
            colors={['#1e1e1e', '#161616']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="person-outline" size={20} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>Customer Information</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.value}>{order.shipping_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.value}>{order.shipping_phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Delivery Address</Text>
              <Text style={styles.value}>{order.shipping_address}, {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}</Text>
            </View>
          </LinearGradient>

          {/* Order Items */}
          <LinearGradient
            colors={['#1e1e1e', '#161616']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="cube-outline" size={20} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>Order Items ({order.items?.length || order.order_items?.length || 0})</Text>
            </View>
            
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
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
                  </View>
                </View>
                <Text style={styles.itemTotal}>₹{item.total.toFixed(2)}</Text>
              </View>
            ))}
          </LinearGradient>

          {/* Payment Summary */}
          <LinearGradient
            colors={['#1e1e1e', '#161616']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="wallet-outline" size={20} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>Payment Summary</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{order.subtotal.toFixed(2)}</Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>-₹{order.discount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Charges</Text>
              <Text style={styles.summaryValue}>
                {order.delivery_charges === 0 ? 'FREE' : `₹${order.delivery_charges.toFixed(2)}`}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{order.total_amount.toFixed(2)}</Text>
            </View>
          </LinearGradient>

          {/* OTP Verified Badge */}
          {order.otp_verified && (
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
              style={styles.verifiedCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-done-circle" size={32} color="#10b981" />
                <View style={styles.verifiedContent}>
                  <Text style={[styles.cardTitle, { color: '#10b981' }]}>Delivery Verified</Text>
                  <Text style={styles.verifiedText}>
                    OTP verified successfully. Order has been completed.
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Action Buttons */}
          {canUpdateStatus && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.updateStatusButton}
                onPress={() => setShowStatusModal(true)}
                activeOpacity={0.8}
                data-testid="update-status-button"
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.updateStatusButtonText}>Update Order Status</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {order.seller_status === 'delivered' && !order.otp_verified && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.verifyOTPButton}
                onPress={() => setShowOTPModal(true)}
                activeOpacity={0.8}
                data-testid="verify-otp-button"
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="key-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.verifyOTPButtonText}>Verify Delivery OTP</Text>
                </LinearGradient>
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
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.modalContent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="swap-horizontal" size={32} color="#a78bfa" />
                  </View>
                  <Text style={styles.modalTitle}>Update Order Status</Text>
                  <Text style={styles.modalDescription}>Select the current status of this order</Text>
                </View>

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
                      <View style={[styles.statusOptionIcon, { backgroundColor: option.color + '15' }]}>
                        <Ionicons name={option.icon as any} size={22} color={option.color} />
                      </View>
                      <Text style={[
                        styles.statusOptionText,
                        selectedStatus === option.value && styles.statusOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                      {selectedStatus === option.value && (
                        <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes (optional)"
                  placeholderTextColor="#6b7280"
                  value={statusNotes}
                  onChangeText={setStatusNotes}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowStatusModal(false);
                      setStatusNotes('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleUpdateStatus}
                  >
                    <LinearGradient
                      colors={['#6366f1', '#8b5cf6']}
                      style={styles.confirmGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.confirmButtonText}>Update Status</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
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
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowOTPModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.modalContent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="key" size={32} color="#a78bfa" />
                  </View>
                  <Text style={styles.modalTitle}>Enter Delivery OTP</Text>
                  <Text style={styles.modalDescription}>
                    Ask the customer for the 6-digit OTP shown on their order page to verify delivery.
                  </Text>
                </View>

                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#6b7280"
                  value={otpInput}
                  onChangeText={(text) => setOtpInput(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  data-testid="otp-input-field"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowOTPModal(false);
                      setOtpInput('');
                    }}
                    disabled={verifying}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.confirmButton, otpInput.length !== 6 && styles.disabledButton]}
                    onPress={handleVerifyOTP}
                    disabled={verifying || otpInput.length !== 6}
                    data-testid="verify-delivery-otp-button"
                  >
                    <LinearGradient
                      colors={otpInput.length === 6 ? ['#10b981', '#059669'] : ['#374151', '#374151']}
                      style={styles.confirmGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {verifying ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.confirmButtonText}>Verify & Complete</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: spacing.md,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    width: '35%',
  },
  value: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a78bfa',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.md,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#a78bfa',
  },
  verifiedCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  verifiedContent: {
    flex: 1,
  },
  verifiedText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
    lineHeight: 18,
  },
  actionButtons: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  updateStatusButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  verifyOTPButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  updateStatusButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  verifyOTPButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    width: width,
    maxHeight: '85%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  modalDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusOptionsScroll: {
    maxHeight: 300,
    marginBottom: spacing.lg,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusOptionActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  statusOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#a78bfa',
    fontWeight: '600',
  },
  notesInput: {
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  confirmGradient: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});