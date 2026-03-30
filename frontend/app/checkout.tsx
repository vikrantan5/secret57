import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { useCartStore } from '../src/store/cartStore';
import { useOrderStore } from '../src/store/orderStore';
import { usePaymentStore } from '../src/store/paymentStore';
import { useAddressStore } from '../src/store/addressStore';
import { colors, spacing, typography, borderRadius, shadows } from '../src/constants/theme';
import { RazorpayPayment } from '../src/components/RazorpayPayment';
import { generateOrderId } from '../src/services/razorpay';

// Note: Using Razorpay test credentials
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_RVeELbQdxuBBiv';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, total, clearCart } = useCartStore();
  const { createOrder, updatePaymentStatus } = useOrderStore();
  const { createPayment, updatePaymentStatus: updatePaymentStatusInStore } = usePaymentStore();
  const { addresses, getDefaultAddress, fetchUserAddresses } = useAddressStore();
  
  const [loading, setLoading] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [razorpayOrderId, setRazorpayOrderId] = useState<string>('');
  const [shippingInfo, setShippingInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

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
  const deliveryCharges = 0; // FREE delivery
  const discount = 0;
  const finalTotal = total + deliveryCharges - discount;

   const handlePayment = async () => {
    // Validate shipping info
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address || 
        !shippingInfo.city || !shippingInfo.state || !shippingInfo.pincode) {
      Alert.alert('Error', 'Please fill all shipping details');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please login to continue');
      router.push('/auth/login');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create order in database
      const orderData = {
        customer_id: user.id,
        subtotal: total,
        discount: discount,
        delivery_charges: deliveryCharges,
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
        throw new Error(result.error || 'Failed to create order');
      }

      const orderId = result.order.id;
      setCurrentOrderId(orderId);

      // Step 2: Generate Razorpay order ID
      const razorpayId = generateOrderId('ord');
      setRazorpayOrderId(razorpayId);

      // Step 3: Open Razorpay payment gateway
      setLoading(false);
      setShowRazorpay(true);

    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Error', error.message || 'Failed to process checkout');
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    console.log('Payment successful:', response);
    setShowRazorpay(false);
    setLoading(true);

    try {
      // Create payment record
      const paymentResult = await createPayment({
        order_id: currentOrderId,
        amount: finalTotal,
        payment_method: 'razorpay',
      });

      if (paymentResult.success && paymentResult.payment) {
        // Update payment status with Razorpay details
        await updatePaymentStatusInStore(
          paymentResult.payment.id,
          'success',
          response
        );

        // Update order payment status
        const paymentData = {
          method: 'razorpay',
          razorpay_order_id: response.razorpay_order_id || razorpayOrderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        };
        await updatePaymentStatus(currentOrderId, paymentData);

        // Clear cart
        clearCart();
        
        setLoading(false);
        
        Alert.alert(
          'Order Placed Successfully!',
          'Your order has been placed and payment confirmed',
          [
            {
              text: 'View Orders',
              onPress: () => router.replace('/(tabs)/orders'),
            },
            {
              text: 'Continue Shopping',
              onPress: () => router.replace('/(tabs)/home'),
            },
          ]
        );
      } else {
        throw new Error('Failed to record payment');
      }
    } catch (error: any) {
      console.error('Payment record error:', error);
      setLoading(false);
      Alert.alert('Error', 'Payment successful but failed to update order. Please contact support.');
    }
  };

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    setShowRazorpay(false);
    setLoading(false);
    Alert.alert(
      'Payment Failed', 
      error.error || error.description || 'Payment was not successful. Please try again.'
    );
  };

  const handlePaymentClose = () => {
    setShowRazorpay(false);
    setLoading(false);
  };
  const simulatePayment = async (orderId: string) => {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate successful payment
    const paymentData = {
      method: 'razorpay',
      razorpay_order_id: `order_${Date.now()}`,
      razorpay_payment_id: `pay_${Date.now()}`,
      razorpay_signature: 'simulated_signature',
    };

    const paymentResult = await updatePaymentStatus(orderId, paymentData);

    if (paymentResult.success) {
      // Clear cart
      clearCart();
      
      setLoading(false);
      
      Alert.alert(
        'Order Placed Successfully!',
        'Your order has been placed and payment confirmed',
        [
          {
            text: 'View Order',
            onPress: () => router.replace('/orders'),
          },
          {
            text: 'Continue Shopping',
            onPress: () => router.replace('/(tabs)/home'),
          },
        ]
      );
    } else {
      setLoading(false);
      Alert.alert('Error', 'Payment verification failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Shipping Information */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Shipping Information</Text>
            <TouchableOpacity 
              onPress={() => router.push('/profile/addresses')}
              style={styles.manageAddressButton}
            >
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={styles.manageAddressText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textSecondary}
            value={shippingInfo.name}
            onChangeText={(text) => setShippingInfo({ ...shippingInfo, name: text })}
          />

          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            placeholderTextColor={colors.textSecondary}
            value={shippingInfo.phone}
            onChangeText={(text) => setShippingInfo({ ...shippingInfo, phone: text })}
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="House no., Street, Landmark"
            placeholderTextColor={colors.textSecondary}
            value={shippingInfo.address}
            onChangeText={(text) => setShippingInfo({ ...shippingInfo, address: text })}
            multiline
            numberOfLines={3}
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={colors.textSecondary}
                value={shippingInfo.city}
                onChangeText={(text) => setShippingInfo({ ...shippingInfo, city: text })}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>State *</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={colors.textSecondary}
                value={shippingInfo.state}
                onChangeText={(text) => setShippingInfo({ ...shippingInfo, state: text })}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Pincode *</Text>
          <TextInput
            style={styles.input}
            placeholder="Pincode"
            placeholderTextColor={colors.textSecondary}
            value={shippingInfo.pincode}
            onChangeText={(text) => setShippingInfo({ ...shippingInfo, pincode: text })}
            keyboardType="number-pad"
          />
        </View>

        {/* Order Summary */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items ({items.length})</Text>
            <Text style={styles.summaryValue}>₹{total.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charges</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>FREE</Text>
          </View>
          
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                -₹{discount.toFixed(2)}
              </Text>
            </View>
          )}
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{finalTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.paymentInfoRow}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={styles.paymentInfoText}>
              Secure payment powered by Razorpay
            </Text>
          </View>
          <View style={styles.paymentInfoRow}>
            <Ionicons name="card" size={20} color={colors.primary} />
            <Text style={styles.paymentInfoText}>
              Multiple payment options available
            </Text>
          </View>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.bottomLabel}>Total</Text>
          <Text style={styles.bottomTotal}>₹{finalTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.disabledButton]}
          onPress={handlePayment}
          disabled={loading}
          data-testid="place-order-button"
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
              <Text style={styles.placeOrderText}>Place Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
        {/* Razorpay Payment Modal */}
      {showRazorpay && (
        <RazorpayPayment
          visible={showRazorpay}
          orderId={razorpayOrderId}
          amount={finalTotal}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onClose={handlePaymentClose}
          customerDetails={{
            name: shippingInfo.name,
            email: user?.email || '',
            contact: shippingInfo.phone,
          }}
          description="Product Order Payment"
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
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
  },
  manageAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.sm,
  },
  manageAddressText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',

  },
  inputLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
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
  paymentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  paymentInfoText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  totalContainer: {
    flex: 1,
  },
  bottomLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bottomTotal: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  disabledButton: {
    opacity: 0.6,
  },
  placeOrderText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
