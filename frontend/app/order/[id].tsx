import React, { useEffect, useState, useRef } from 'react';
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
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useOrderStore } from '../../src/store/orderStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = params.id as string;
  
  const { selectedOrder, loading, fetchOrderById, cancelOrder } = useOrderStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (orderId) {
      fetchOrderById(orderId);
    }
  }, [orderId]);

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
  }, [selectedOrder]);

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      if (orderId && selectedOrder?.payment_status === 'pending') {
        console.log('🔄 Auto-refreshing pending order...');
        fetchOrderById(orderId);
      }
    }, 5000);

    return () => clearInterval(refreshTimer);
  }, [orderId, selectedOrder?.payment_status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'processing':
      case 'state_processing':
      case 'processed':
        return '#8B5CF6';
      case 'shipped':
        return '#6366F1';
      case 'out_for_delivery':
        return '#3B82F6';
      case 'delivered':
        return '#10B981';
      case 'cancelled':
      case 'refunded':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'pending':
        return ['#FEF3C7', '#FDE68A'];
      case 'processing':
      case 'state_processing':
        return ['#E0E7FF', '#C7D2FE'];
      case 'processed':
        return ['#EDE9FE', '#DDD6FE'];
      case 'shipped':
        return ['#E0E7FF', '#C7D2FE'];
      case 'out_for_delivery':
        return ['#DBEAFE', '#BFDBFE'];
      case 'delivered':
        return ['#D1FAE5', '#A7F3D0'];
      case 'cancelled':
        return ['#FEE2E2', '#FECACA'];
      default:
        return ['#F3F4F6', '#E5E7EB'];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'processing':
      case 'state_processing':
        return 'refresh-outline';
      case 'processed':
        return 'checkmark-outline';
      case 'shipped':
        return 'rocket-outline';
      case 'out_for_delivery':
        return 'car-outline';
      case 'delivered':
        return 'checkmark-circle-outline';
      case 'cancelled':
      case 'refunded':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCancelModal(false);
      setCancellationReason('');
      Alert.alert(
        'Order Cancelled',
        'Your order has been cancelled successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to cancel order');
    }
  };

  if (loading || !selectedOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const order = selectedOrder;
    const activeStatus = order.seller_status || order.status;
  const canCancel = order.status === 'pending' || order.status === 'processing';

  const trackingSteps = [
    { status: 'pending', label: 'Order Placed', icon: 'bag-handle-outline', description: 'Your order has been placed' },
    { status: 'processing', label: 'Processing', icon: 'refresh-outline', description: 'Seller is preparing your order' },
    { status: 'processed', label: 'Processed', icon: 'checkmark-outline', description: 'Order has been processed' },
    { status: 'shipped', label: 'Shipped', icon: 'rocket-outline', description: 'Order has been shipped' },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: 'car-outline', description: 'Order is out for delivery' },
    { status: 'delivered', label: 'Delivered', icon: 'checkmark-circle-outline', description: 'Order delivered successfully' },
  ];

  // Use seller_status for tracking (more granular than order status)
  const activeStatus = order.seller_status || order.status;

  const getCurrentStepIndex = () => {
    const index = trackingSteps.findIndex(step => step.status === activeStatus);
    return index >= 0 ? index : 0;
  };

  const currentStepIndex = getCurrentStepIndex();

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
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Order Status Card - uses seller_status for detailed tracking */}
        <LinearGradient
          colors={getStatusGradient(activeStatus)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusCard}
        >
          <View style={styles.statusHeader}>
            <LinearGradient
              colors={[getStatusColor(activeStatus), getStatusColor(activeStatus) + 'CC']}
              style={styles.statusIconContainer}
            >
              <Ionicons name={getStatusIcon(activeStatus) as any} size={32} color=\"#FFFFFF\" />
            </LinearGradient>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {activeStatus.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </Text>
              <Text style={styles.orderNumber}>Order #{order.order_number?.slice(0, 12)}</Text>
              {order.seller_status_updated_at && (
                <Text style={styles.orderNumber}>
                  Updated: {formatDate(order.seller_status_updated_at)}
                </Text>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Premium Tracking Timeline */}
               {activeStatus !== 'cancelled' && activeStatus !== 'refunded' && (
          <View style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.timelineIconBg}
              >
                <Ionicons name="map-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.timelineTitle}>Order Tracking</Text>
            </View>
            <View style={styles.timeline}>
              {trackingSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isActive = index === currentStepIndex;

                return (
                  <View key={step.status} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <LinearGradient
                        colors={isCompleted ? ['#8B5CF6', '#7C3AED'] : ['#E5E7EB', '#D1D5DB']}
                        style={styles.timelineIcon}
                      >
                        <Ionicons
                          name={step.icon as any}
                          size={18}
                          color={isCompleted ? '#FFFFFF' : '#9CA3AF'}
                        />
                      </LinearGradient>
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
                      <Text style={styles.timelineDescription}>{step.description}</Text>
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
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.cardIcon}
            >
              <Ionicons name="cube-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
                    <Text style={styles.cardTitle}>Items ({order.order_items?.length || order.items?.length || 0})</Text>
          </View>
          {(order.order_items || order.items)?.map((item: any, index: number) => (
            <View key={index} style={styles.orderItem}>
              <Image
                source={{ uri: item.product?.images?.[0] || 'https://via.placeholder.com/80' }}
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
              <LinearGradient
                colors={['#1E1B4B', '#312E81']}
                style={styles.itemTotalContainer}
              >
                <Text style={styles.itemTotal}>₹{item.total.toFixed(2)}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* Shipping Address */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.cardIcon}
            >
              <Ionicons name="location-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Shipping Address</Text>
          </View>
          <View style={styles.addressContainer}>
            <View style={styles.addressRow}>
              <Ionicons name="person-outline" size={18} color="#8B5CF6" />
              <Text style={styles.addressText}>{order.shipping_name}</Text>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="call-outline" size={18} color="#8B5CF6" />
              <Text style={styles.addressText}>{order.shipping_phone}</Text>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={18} color="#8B5CF6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressText}>{order.shipping_address}</Text>
                <Text style={styles.addressText}>
                  {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Delivery OTP Card */}
        {order.delivery_otp && !order.otp_verified && order.seller_status === 'delivered' && (
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.otpCard}
          >
            <View style={styles.otpHeader}>
              <Ionicons name="key-outline" size={28} color="#92400E" />
              <Text style={styles.otpTitle}>Delivery Verification OTP</Text>
            </View>
            <Text style={styles.otpDescription}>
              Share this OTP with the delivery person to confirm receipt
            </Text>
            <View style={styles.otpContainer}>
              <Text style={styles.otpText}>{order.delivery_otp}</Text>
            </View>
            <View style={styles.otpNote}>
              <Ionicons name="information-circle-outline" size={18} color="#92400E" />
              <Text style={styles.otpNoteText}>
                Keep this OTP private. Only share with the delivery person upon receiving your order.
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* OTP Verified Badge */}
        {order.otp_verified && (
          <LinearGradient
            colors={['#D1FAE5', '#A7F3D0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.verifiedCard}
          >
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.verifiedTitle}>Delivery Verified</Text>
                <Text style={styles.verifiedText}>
                  Your order has been successfully delivered and verified.
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Payment Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.cardIcon}
            >
              <Ionicons name="card-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Payment Summary</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{order.subtotal.toFixed(2)}</Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -₹{order.discount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charges</Text>
            <Text style={[styles.summaryValue, order.delivery_charges === 0 && styles.freeValue]}>
              {order.delivery_charges === 0 ? 'FREE' : `₹${order.delivery_charges.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <LinearGradient
              colors={['#1E1B4B', '#312E81']}
              style={styles.totalContainer}
            >
              <Text style={styles.totalValue}>₹{order.total_amount.toFixed(2)}</Text>
            </LinearGradient>
          </View>
          <View style={styles.paymentStatusRow}>
            <Text style={styles.summaryLabel}>Payment Status</Text>
            <LinearGradient
              colors={
                order.payment_status === 'paid'
                  ? ['#D1FAE5', '#A7F3D0']
                  : ['#FEF3C7', '#FDE68A']
              }
              style={styles.paymentBadge}
            >
              <Text
                style={[
                  styles.paymentBadgeText,
                  {
                    color: order.payment_status === 'paid' ? '#10B981' : '#F59E0B',
                  },
                ]}
              >
                {order.payment_status.toUpperCase()}
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {canCancel && !showCancelModal && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCancelModal(true)}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cancelGradient}
              >
                <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          {order.status === 'delivered' && (
            <TouchableOpacity
              style={styles.reportButton}
               onPress={() => router.push(`/complaints/create?orderId=${orderId}&sellerId=${(order.order_items || order.items)?.[0]?.seller_id}`)}
            >
            
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.reportGradient}
              >
                <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
                <Text style={styles.reportButtonText}>Report Issue</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          {order.status === 'delivered' && order.payment_status === 'paid' && (
            <TouchableOpacity
              style={styles.refundButton}
              onPress={() => router.push(`/order/${orderId}/refund`)}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.refundGradient}
              >
                <Ionicons name="return-down-back-outline" size={20} color="#FFFFFF" />
                <Text style={styles.refundButtonText}>Request Refund</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Cancel Modal */}
        {showCancelModal && (
          <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.modalHeader}
              >
                <Ionicons name="alert-circle-outline" size={28} color="#FFFFFF" />
                <Text style={styles.modalTitle}>Cancel Order</Text>
              </LinearGradient>
              <Text style={styles.modalSubtitle}>Please provide a reason for cancellation:</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Enter reason..."
                placeholderTextColor="#9CA3AF"
                value={cancellationReason}
                onChangeText={setCancellationReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowCancelModal(false);
                    setCancellationReason('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleCancelOrder}
                >
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.modalConfirmGradient}
                  >
                    <Text style={styles.modalConfirmText}>Cancel Order</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        )}

        <View style={{ height: spacing.xl }} />
      </Animated.ScrollView>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
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
  statusCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: spacing.xs,
  },
  orderNumber: {
    fontSize: 13,
    color: '#6B7280',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
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
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  timelineIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  timeline: {
    marginTop: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineLeft: {
    alignItems: 'center',
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  timelineLineActive: {
    backgroundColor: '#8B5CF6',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  timelineLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  timelineLabelActive: {
    color: '#1F2937',
  },
  timelineDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: spacing.xs,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  itemTotalContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addressContainer: {
    gap: spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  discountValue: {
    color: '#10B981',
  },
  freeValue: {
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  paymentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtons: {
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cancelButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cancelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reportButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  reportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  reportButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refundButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  refundGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  refundButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  otpCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  otpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  otpDescription: {
    fontSize: 13,
    color: '#78350F',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  otpContainer: {
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
    borderStyle: 'dashed',
    marginBottom: spacing.md,
  },
  otpText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 8,
  },
  otpNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  otpNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  verifiedCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  verifiedText: {
    fontSize: 13,
    color: '#065F46',
    marginTop: 2,
    lineHeight: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalCard: {
    width: width - spacing.xl * 2,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  textArea: {
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});