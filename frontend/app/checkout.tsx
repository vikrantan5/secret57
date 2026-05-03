import React, { useState, useEffect, useRef } from 'react'; // Added useRef here
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../src/store/authStore';
import { useCartStore } from '../src/store/cartStore';
import { useOrderStore } from '../src/store/orderStore';
import { usePaymentStore } from '../src/store/paymentStore';
import { useAddressStore } from '../src/store/addressStore';
import { colors, spacing, typography, borderRadius, shadows } from '../src/constants/theme';
import CashfreePayment from '../src/components/CashfreePayment';
import CashfreeService from '../src/services/cashfreeService';
import CashfreePayoutService from '../src/services/cashfreePayoutService';
import { supabase } from '../src/services/supabase';
import { calculateOrderSummary } from '../src/utils/pricing';

const { width, height } = Dimensions.get('window');

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, total, clearCart } = useCartStore();
  const { createOrder, updatePaymentStatus } = useOrderStore();
  const { createPayment, updatePaymentStatus: updatePaymentStatusInStore } = usePaymentStore();
  const { addresses, getDefaultAddress, fetchUserAddresses } = useAddressStore();
  
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCashfree, setShowCashfree] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [cashfreePaymentSessionId, setCashfreePaymentSessionId] = useState<string>('');
  const [cashfreeOrderId, setCashfreeOrderId] = useState<string>('');
  const [shippingInfo, setShippingInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

  // Load user addresses and auto-fill with default address
  useEffect(() => {
    if (user?.id) {
      fetchUserAddresses(user.id).then(() => {
        const defaultAddr = getDefaultAddress();
        if (defaultAddr) {
          setShippingInfo({
            name: defaultAddr.full_name,
            phone: defaultAddr.phone,
            address: defaultAddr.address_line1 + (defaultAddr.address_line2 ? `, ${defaultAddr.address_line2}` : ''),
            city: defaultAddr.city,
            state: defaultAddr.state,
            pincode: defaultAddr.pincode,
          });
        }
      });
    }
  }, [user]);

  // ✅ Centralized pricing — single source of truth across cart/checkout/payment/order
  const summary = calculateOrderSummary(items);
  const taxAmount = summary.gst;
  const deliveryCharges = summary.deliveryCharge;
  const discount = summary.discount;
  const finalTotal = summary.totalAmount;

  const handlePayment = async () => {
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address || 
        !shippingInfo.city || !shippingInfo.state || !shippingInfo.pincode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please fill all shipping details');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please login to continue');
      router.push('/auth/login');
      return;
    }

    if (loading || processingPayment) {
      // Prevent double-tap; do not pop alert mid-flow
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setProcessingPayment(true);
    console.log('[Checkout] Entering payment flow', { finalTotal, subtotal: total, gst: taxAmount, delivery: deliveryCharges });

    try {
      // ✅ FIX: Do NOT create the order yet. Create Cashfree session FIRST.
      // Order will only be created after Cashfree confirms payment success.
      console.log('[Checkout] Creating Cashfree payment session...');
      const cashfreeOrderResult = await CashfreeService.createOrder({
        amount: finalTotal,
        currency: 'INR',
        order_note: `Cart checkout for ${user.email || user.id}`,
        customer_id: user.id,
        customer_name: shippingInfo.name,
        customer_email: user.email || '',
        customer_phone: shippingInfo.phone,
        return_url: 'https://hybrid-bazaar.preview.emergentagent.com/payment-success',
      });

      if (!cashfreeOrderResult.success || !cashfreeOrderResult.data) {
        throw new Error(cashfreeOrderResult.error || 'Failed to create Cashfree order');
      }

      const cfOrderId = cashfreeOrderResult.data.order_id;
      const cfPaymentSessionId = cashfreeOrderResult.data.payment_session_id;

      if (!cfPaymentSessionId) {
        throw new Error('Payment session ID not received from Cashfree');
      }

      console.log('[Checkout] Cashfree session created', { cfOrderId });
      setCashfreeOrderId(cfOrderId);
      setCashfreePaymentSessionId(cfPaymentSessionId);

      // Open the gateway. Order is created only on payment success.
      setLoading(false);
      setShowCashfree(true);
    } catch (error: any) {
      console.error('[Checkout] Payment session error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to start payment');
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string, cashfreeOrderId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCashfree(false);
    setLoading(true);
    console.log('[Checkout] Payment success callback', { paymentId, cashfreeOrderId });

    try {
      // ✅ STEP 1: Verify payment server-side (do not trust client)
      const verificationResult = await CashfreeService.verifyPayment(cashfreeOrderId);
      if (!verificationResult.success || !verificationResult.data) {
        throw new Error(verificationResult.error || 'Payment verification failed');
      }

      const paymentStatus = verificationResult.data.payment_status || verificationResult.data.order_status;
      const paymentStatusUpper = paymentStatus?.toUpperCase();
      const isSuccess =
        paymentStatusUpper === 'SUCCESS' ||
        paymentStatusUpper === 'PAID' ||
        paymentStatusUpper === 'ACTIVE';

      if (!isSuccess) {
        throw new Error(`Payment not confirmed. Status: ${paymentStatus}`);
      }

      // ✅ STEP 2: Now create the order (only after payment success)
      console.log('[Checkout] Creating order after verified payment...');
      const orderData = {
        customer_id: user!.id,
        subtotal: total,
        discount: discount,
        delivery_charges: deliveryCharges,
        gst_amount: taxAmount,
        total_amount: finalTotal,
        shipping_name: shippingInfo.name,
        shipping_phone: shippingInfo.phone,
        shipping_address: shippingInfo.address,
        shipping_city: shippingInfo.city,
        shipping_state: shippingInfo.state,
        shipping_pincode: shippingInfo.pincode,
      };

      const result = await createOrder(orderData, items);
      if (!result.success || !result.order) {
        throw new Error(result.error || 'Failed to create order after payment');
      }
      const orderId = result.order.id;
      setCurrentOrderId(orderId);
      console.log('[Checkout] Order created', { orderId });

      // Link Cashfree order id to Supabase order
      await supabase
        .from('orders')
        .update({
          cashfree_order_id: cashfreeOrderId,
          payment_method: 'cashfree',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // ✅ STEP 3: Record payment & mark paid
      const paymentResult = await createPayment({
        order_id: orderId,
        amount: finalTotal,
        payment_method: 'cashfree',
      });

      if (paymentResult.success && paymentResult.payment) {
        await updatePaymentStatusInStore(paymentResult.payment.id, 'success', {
          cashfree_order_id: cashfreeOrderId,
          cashfree_payment_id: paymentId || verificationResult.data.cf_payment_id,
          payment_status: paymentStatus,
        });

        await updatePaymentStatus(orderId, {
          method: 'cashfree',
          cashfree_order_id: cashfreeOrderId,
          cashfree_payment_id: paymentId || verificationResult.data.cf_payment_id,
        });

        const { updateOrderStatus: updateStatus } = require('../src/store/orderStore').useOrderStore.getState();
        await updateStatus(orderId, 'processing');

        // Notifications (best-effort, non-blocking)
        try {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('id, seller_id, product_name, quantity, price')
            .eq('order_id', orderId);

          if (orderItems && orderItems.length > 0) {
            const { data: adminUsers } = await supabase
              .from('users')
              .select('id')
              .eq('role', 'admin');

            if (adminUsers) {
              for (const admin of adminUsers) {
                await supabase.from('notifications').insert({
                  user_id: admin.id,
                  title: '🛒 New Product Order',
                  message: `New order #${orderId.substring(0, 8)} placed. Total: ₹${finalTotal}. Customer: ${shippingInfo.name}`,
                  type: 'new_order',
                  reference_id: orderId,
                  reference_type: 'order',
                  created_at: new Date().toISOString(),
                });
              }
            }

            const sellerIds = [...new Set(orderItems.map(i => i.seller_id).filter(Boolean))];
            for (const sellerId of sellerIds) {
              const { data: sellers } = await supabase
                .from('sellers')
                .select('id, user_id, company_name')
                .eq('id', sellerId)
                .limit(1);
              if (sellers && sellers.length > 0 && sellers[0].user_id) {
                await supabase.from('notifications').insert({
                  user_id: sellers[0].user_id,
                  title: '🎉 New Order Received!',
                  message: `You have a new order #${orderId.substring(0, 8)}. Payment received: ₹${finalTotal}`,
                  type: 'new_order',
                  reference_id: orderId,
                  reference_type: 'order',
                  created_at: new Date().toISOString(),
                });
              }
            }
          }
        } catch (notifyErr) {
          console.warn('[Checkout] notify failed (non-blocking):', notifyErr);
        }

        clearCart();

        const { fetchOrders } = require('../src/store/orderStore').useOrderStore.getState();
        if (user?.id) await fetchOrders(user.id);

        setLoading(false);
        setProcessingPayment(false);

        Alert.alert(
          '🎉 Order Placed Successfully!',
          'Your order has been placed and payment confirmed',
          [
            { text: 'View Orders', onPress: () => router.replace('/orders') },
            { text: 'Continue Shopping', onPress: () => router.replace('/(tabs)/home') },
          ]
        );
      } else {
        throw new Error(paymentResult.error || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('[Checkout] Post-payment error:', error);
      setLoading(false);
      setProcessingPayment(false);
      Alert.alert(
        'Payment Verification Error',
        error.message || 'Payment was successful but we could not create your order. Please contact support.'
      );
    }
  };

  const handlePaymentFailure = (error: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setShowCashfree(false);
    setLoading(false);
    setProcessingPayment(false);
    
    Alert.alert(
      'Payment Failed', 
      error || 'Payment was cancelled or failed. Please try again.',
      [
        {
          text: 'Try Again',
          onPress: () => {
            setShowCashfree(false);
            setProcessingPayment(false);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handlePaymentCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCashfree(false);
    setLoading(false);
    setProcessingPayment(false);
    
    Alert.alert(
      'Payment Cancelled',
  'Payment was cancelled. No order has been created.',
      [
        {
          text: 'Try Again',
          onPress: () => handlePayment(),
        },
        {
          text: 'Go Back',
          style: 'cancel',
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Gradient Header */}
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
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={styles.menuButton}>
            <Ionicons name="cart-outline" size={22} color="#FFFFFF" />
            {items.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{items.length}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Shipping Information Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.sectionIcon}
            >
              <Ionicons name="location-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Shipping Information</Text>
            <TouchableOpacity 
              onPress={() => router.push('/profile/addresses')}
              style={styles.manageButton}
            >
              <Ionicons name="create-outline" size={14} color="#8B5CF6" />
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#9CA3AF"
                value={shippingInfo.name}
                onChangeText={(text) => setShippingInfo({ ...shippingInfo, name: text })}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#9CA3AF"
                value={shippingInfo.phone}
                onChangeText={(text) => setShippingInfo({ ...shippingInfo, phone: text })}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="home-outline" size={18} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Address (House no., Street, Landmark)"
                placeholderTextColor="#9CA3AF"
                value={shippingInfo.address}
                onChangeText={(text) => setShippingInfo({ ...shippingInfo, address: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.halfInputWrapper}>
                <Ionicons name="business-outline" size={18} color="#8B5CF6" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor="#9CA3AF"
                  value={shippingInfo.city}
                  onChangeText={(text) => setShippingInfo({ ...shippingInfo, city: text })}
                />
              </View>
              <View style={styles.halfInputWrapper}>
                <Ionicons name="map-outline" size={18} color="#8B5CF6" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  placeholderTextColor="#9CA3AF"
                  value={shippingInfo.state}
                  onChangeText={(text) => setShippingInfo({ ...shippingInfo, state: text })}
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Pincode"
                placeholderTextColor="#9CA3AF"
                value={shippingInfo.pincode}
                onChangeText={(text) => setShippingInfo({ ...shippingInfo, pincode: text })}
                keyboardType="number-pad"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Order Summary Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.sectionIcon}
            >
              <Ionicons name="receipt-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {items.slice(0, 3).map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.orderItemImage}>
                  <Text style={styles.orderItemInitial}>
                    {item.name?.charAt(0) || 'P'}
                  </Text>
                </View>
                <View style={styles.orderItemDetails}>
                  <Text style={styles.orderItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.orderItemMeta}>
                    Qty: {item.quantity} × ₹{item.price}
                  </Text>
                </View>
                <Text style={styles.orderItemPrice}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            
            {items.length > 3 && (
              <Text style={styles.moreItems}>
                +{items.length - 3} more item{items.length - 3 > 1 ? 's' : ''}
              </Text>
            )}
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
              <Text style={styles.summaryValue}>₹{total.toFixed(2)}</Text>
            </View>

                <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST (18%)</Text>
              <Text style={styles.summaryValue}>₹{taxAmount.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Charges</Text>
              {deliveryCharges === 0 ? (
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.freeBadge}
                >
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.summaryValue}>₹{deliveryCharges.toFixed(2)}</Text>
              )}
            </View>
            
            <View style={styles.dashedDivider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{finalTotal.toFixed(2)}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Payment Info Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.sectionIcon}
            >
              <Ionicons name="card-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Payment</Text>
          </View>
          
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.paymentMethod}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.paymentMethodIcon}
              >
                <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodTitle}>Secure Payment</Text>
                <Text style={styles.paymentMethodDesc}>Powered by Cashfree</Text>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            
            <View style={styles.paymentOptions}>
              <View style={styles.paymentOption}>
                <Ionicons name="card" size={20} color="#6B7280" />
                <Text style={styles.paymentOptionText}>Credit/Debit Card</Text>
              </View>
              <View style={styles.paymentOption}>
                <Ionicons name="logo-google" size={20} color="#6B7280" />
                <Text style={styles.paymentOptionText}>Google Pay</Text>
              </View>
              <View style={styles.paymentOption}>
                <Ionicons name="phone-portrait" size={20} color="#6B7280" />
                <Text style={styles.paymentOptionText}>PhonePe</Text>
              </View>
              <View style={styles.paymentOption}>
                <Ionicons name="logo-bitcoin" size={20} color="#6B7280" />
                <Text style={styles.paymentOptionText}>Net Banking</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: spacing.xxl }} />
      </Animated.ScrollView>

      {/* Premium Bottom Bar */}
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        style={styles.bottomBar}
      >
        <View style={styles.totalContainer}>
          <Text style={styles.bottomLabel}>Total Amount</Text>
          <Text style={styles.bottomTotal}>₹{finalTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, (loading || processingPayment) && styles.disabledButton]}
          onPress={handlePayment}
          disabled={loading || processingPayment}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={loading || processingPayment ? ['#9CA3AF', '#6B7280'] : ['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.placeOrderGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.placeOrderText}>Place Order</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Cashfree Payment Modal */}
      {showCashfree && cashfreePaymentSessionId && (
        <CashfreePayment
          visible={showCashfree}
          paymentSessionId={cashfreePaymentSessionId}
          orderId={cashfreeOrderId}
           returnUrl="https://hybrid-bazaar.preview.emergentagent.com/payment-success"
          mode="sandbox"
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onCancel={handlePaymentCancel}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#8B5CF615',
    borderRadius: 8,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  card: {
    padding: spacing.lg,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  halfInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  orderItemImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  orderItemInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderItemMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  moreItems: {
    fontSize: 12,
    color: '#8B5CF6',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: spacing.md,
  },
  dashedDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: spacing.md,
    borderStyle: 'dashed',
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
  freeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  paymentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentOptionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  totalContainer: {
    flex: 1,
  },
  bottomLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  bottomTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  placeOrderButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  placeOrderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  disabledButton: {
    opacity: 0.7,
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});