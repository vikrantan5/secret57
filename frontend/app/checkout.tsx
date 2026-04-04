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
import CashfreePayment from '../src/components/CashfreePayment';
import CashfreeService from '../src/services/cashfreeService';
import CashfreePayoutService from '../src/services/cashfreePayoutService';
import { supabase } from '../src/services/supabase';

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
  const [cashfreePaymentUrl, setCashfreePaymentUrl] = useState<string>('');
  const [cashfreeOrderId, setCashfreeOrderId] = useState<string>('');
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

    // Prevent duplicate order creation
    if (loading || processingPayment) {
      Alert.alert('Please Wait', 'Your order is being processed. Please do not press back or refresh.');
      return;
    }

    setLoading(true);
    setProcessingPayment(true);

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

      console.log('Order created, ID:', orderId);

      // Step 2: Create Cashfree order via Service
      console.log('Creating Cashfree order for amount:', finalTotal);
      const cashfreeOrderResult = await CashfreeService.createOrder({
        amount: finalTotal,
        currency: 'INR',
        order_note: `Order #${orderId}`,
        customer_id: user.id,
        customer_name: shippingInfo.name,
        customer_email: user.email || '',
        customer_phone: shippingInfo.phone,
        return_url: 'https://hybrid-bazaar.preview.emergentagent.com/payment-success',
      });

      console.log('Cashfree order result:', cashfreeOrderResult);

      if (!cashfreeOrderResult.success || !cashfreeOrderResult.data) {
        throw new Error(cashfreeOrderResult.error || 'Failed to create Cashfree order');
      }

      const cfOrderId = cashfreeOrderResult.data.order_id;
      const cfPaymentUrl = cashfreeOrderResult.data.payment_url;
      
      if (!cfPaymentUrl) {
        throw new Error('Payment URL not received from Cashfree');
      }
      
      setCashfreeOrderId(cfOrderId);
      setCashfreePaymentUrl(cfPaymentUrl);
      
      console.log('Cashfree order created successfully:', cfOrderId);
      console.log('Payment URL:', cfPaymentUrl);

      // Step 3: Open Cashfree payment gateway
      setLoading(false);
      setShowCashfree(true);

    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Error', error.message || 'Failed to process checkout');
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string, orderId: string) => {
    console.log('Payment successful:', { paymentId, orderId });
    setShowCashfree(false);
    setLoading(true);

    try {
      // Step 1: Verify payment via Cashfree
      console.log('Verifying payment...');
      const verificationResult = await CashfreeService.verifyPayment(orderId);

      console.log('Verification result:', verificationResult);

      if (!verificationResult.success || !verificationResult.data) {
        throw new Error(verificationResult.error || 'Payment verification failed');
      }

      const paymentStatus = verificationResult.data.payment_status || verificationResult.data.order_status;
      
      if (paymentStatus !== 'SUCCESS' && paymentStatus !== 'PAID') {
        throw new Error(`Payment status: ${paymentStatus}`);
      }

      console.log('Payment verified successfully!');

      // Step 2: Create payment record
      console.log('Creating payment record for order:', currentOrderId);
      const paymentResult = await createPayment({
        order_id: currentOrderId,
        amount: finalTotal,
        payment_method: 'cashfree',
      });

      if (paymentResult.success && paymentResult.payment) {
        console.log('Payment record created:', paymentResult.payment.id);
        
        // Step 3: Update payment status with Cashfree details
        await updatePaymentStatusInStore(
          paymentResult.payment.id,
          'success',
          {
            cashfree_order_id: orderId,
            cashfree_payment_id: paymentId,
            payment_status: paymentStatus,
          }
        );
        console.log('Payment status updated to success');

        // Step 4: Update order payment status
        const paymentData = {
          method: 'cashfree',
          cashfree_order_id: orderId,
          cashfree_payment_id: paymentId,
        };
        await updatePaymentStatus(currentOrderId, paymentData);
        console.log('Order payment status updated');

        // Step 4.5: Update order status to processing
        const { updateOrderStatus: updateStatus } = require('../src/store/orderStore').useOrderStore.getState();
        await updateStatus(currentOrderId, 'processing');
        console.log('Order status updated to processing');
        


           // Step 4.6: Trigger auto-payout to sellers (CRITICAL FIX)
        console.log('🚀 Initiating auto-payout to sellers...');
        try {
          // Get order items with seller bank account info
          const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              *,
              seller:sellers!inner(
                id,
                company_name
              )
            `)
            .eq('order_id', currentOrderId);

          if (itemsError) {
            console.error('Failed to fetch order items:', itemsError);
            throw itemsError;
          }

          if (orderItems && orderItems.length > 0) {
            // Group items by seller and calculate amounts
            const sellerPayouts = new Map();
            
            for (const item of orderItems) {
              const sellerId = item.seller_id;
              const amount = parseFloat(item.total);
              
              if (sellerPayouts.has(sellerId)) {
                sellerPayouts.get(sellerId).amount += amount;
              } else {
                sellerPayouts.set(sellerId, {
                  sellerId,
                  amount,
                  companyName: item.seller?.company_name || 'Unknown Seller',
                  orderItemIds: [item.id]
                });
              }
            }
            
            console.log(`Found ${sellerPayouts.size} sellers to pay out`);
            
            // Get bank accounts for each seller
            for (const [sellerId, payoutData] of sellerPayouts) {
              try {
                // Get seller's primary verified bank account
                const { data: bankAccount, error: bankError } = await supabase
                  .from('seller_bank_accounts')
                  .select('*')
                  .eq('seller_id', sellerId)
                  .eq('is_primary', true)
                  .eq('verification_status', 'verified')
                  .single();

                if (bankError || !bankAccount) {
                  console.error(`No verified bank account found for seller ${sellerId}`);
                  Alert.alert(
                    'Payout Pending',
                    `Order placed successfully. Seller payout pending bank verification.`
                  );
                  continue;
                }

                const beneId = bankAccount.cashfree_bene_id || bankAccount.cashfree_beneficiary_id;
                
                if (!beneId) {
                  console.error(`No Cashfree beneficiary ID for seller ${sellerId}`);
                  continue;
                }

                // Create transfer
                const transferId = `TXN_${currentOrderId.substring(0, 8)}_${sellerId.substring(0, 8)}_${Date.now()}`;
                
                console.log(`Creating transfer ${transferId} for ₹${payoutData.amount} to ${payoutData.companyName}`);
                
                const transferResult = await CashfreePayoutService.createTransfer({
                  bene_id: beneId,
                  amount: payoutData.amount,
                  transfer_id: transferId,
                  remarks: `Payment for order ${currentOrderId.substring(0, 13)}`
                });
                
                if (transferResult.success) {
                  console.log(`✅ Payout SUCCESS: ₹${payoutData.amount} to ${payoutData.companyName}`);
                  console.log(`   Transfer ID: ${transferId}`);
                  console.log(`   Reference: ${transferResult.reference_id || 'N/A'}`);
                  console.log(`   UTR: ${transferResult.utr || 'N/A'}`);
                  
                  // Update order items with transfer status
                  await supabase
                    .from('order_items')
                    .update({
                      direct_transfer_status: 'completed',
                      cashfree_transfer_id: transferId,
                      transfer_reference: transferResult.reference_id,
                      payout_completed_at: new Date().toISOString()
                    })
                    .eq('order_id', currentOrderId)
                    .eq('seller_id', sellerId);
                    
                } else {
                  console.error(`❌ Payout FAILED for ${payoutData.companyName}:`, transferResult.error);
                  console.warn('   Marking for manual processing...');
                  
                  // Mark for manual payout
                  await supabase
                    .from('order_items')
                    .update({
                      direct_transfer_status: 'failed',
                      transfer_error: transferResult.error
                    })
                    .eq('order_id', currentOrderId)
                    .eq('seller_id', sellerId);
                  
                  // TODO: Add to admin notification queue
                }
              } catch (sellerPayoutError: any) {
                console.error(`Error processing payout for seller ${sellerId}:`, sellerPayoutError);
                // Continue with other sellers even if one fails
              }
            }
            
            console.log('✅ Auto-payout process completed');
          } else {
            console.warn('No order items found for payout');
          }
        } catch (payoutError: any) {
          console.error('❌ Auto-payout error:', payoutError);
          console.warn('Order placed successfully but payout failed. Admin will process manually.');
          // Don't fail the order - it's placed successfully
          // Payout can be retried manually by admin
        }
        // Step 5: Clear cart
        clearCart();
        
        setLoading(false);
        setProcessingPayment(false);
        
        Alert.alert(
          'Order Placed Successfully!',
          'Your order has been placed and payment confirmed',
          [
            {
              text: 'View Orders',
              onPress: () => router.replace('/orders'),
            },
            {
              text: 'Continue Shopping',
              onPress: () => router.replace('/(tabs)/home'),
            },
          ]
        );
      } else {
        throw new Error(paymentResult.error || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('Payment record error:', error);
      setLoading(false);
      setProcessingPayment(false);
      Alert.alert(
        'Payment Verification Error',
        error.message || 'Payment successful but verification failed. Please contact support with your payment ID: ' + paymentId
      );
    }
  };

  const handlePaymentFailure = (error: string) => {
    console.error('Payment failed:', error);
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
    console.log('Payment cancelled by user');
    setShowCashfree(false);
    setLoading(false);
    setProcessingPayment(false);
    
    Alert.alert(
      'Payment Cancelled',
      'You cancelled the payment. Your order is still pending.',
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
              Secure payment powered by Cashfree
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
          disabled={loading || processingPayment}
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
      {/* Cashfree Payment Modal */}
      {showCashfree && cashfreePaymentUrl && (
        <CashfreePayment
          visible={showCashfree}
          paymentUrl={cashfreePaymentUrl}
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
