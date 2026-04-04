import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { useSellerStore } from '../../src/store/sellerStore';
import CashfreeService from '../../src/services/cashfreeService';
import { supabase } from '../../src/services/supabase';

export default function SubscriptionSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const { completeSubscription, fetchSellerSubscriptions } = useSubscriptionStore();
  const { fetchSellerBySellerId } = useSellerStore();
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    verifyAndCompleteSubscription();
  }, []);

  const verifyAndCompleteSubscription = async () => {
    try {
      console.log('📝 Subscription Success - Params:', params);
      
      // Get order_id from URL params (Cashfree returns this)
      const cashfreeOrderId = params.order_id || params.orderId || params.cf_order_id;
      const paymentStatus = params.payment_status || params.status;
      
      if (!cashfreeOrderId) {
        throw new Error('Order ID not found in URL parameters');
      }

      console.log('🔍 Verifying Cashfree payment:', cashfreeOrderId);

      // Step 1: Verify payment with Cashfree
      const verificationResult = await CashfreeService.verifyPayment(cashfreeOrderId as string);
      
      console.log('✅ Verification result:', verificationResult);

      if (!verificationResult.success) {
        throw new Error(verificationResult.error || 'Payment verification failed');
      }

      const paymentData = verificationResult.data;
      const orderStatus = paymentData.order_status || paymentData.payment_status;

      if (orderStatus !== 'PAID' && orderStatus !== 'SUCCESS') {
        throw new Error(`Payment not successful. Status: ${orderStatus}`);
      }

      // Step 2: Extract subscription details from order_id
      // Format: sub_{seller_id}_{timestamp}
      const orderIdParts = (cashfreeOrderId as string).split('_');
      if (orderIdParts.length < 2) {
        throw new Error('Invalid subscription order ID format');
      }

      const sellerId = orderIdParts[1];
      
      console.log('🔍 Seller ID from order:', sellerId);

      // Step 3: Get plan details from database (should be stored when order was created)
      // For now, we'll fetch the active monthly plan
      // TODO: Store plan_id in a subscription_orders table for proper tracking
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })
        .limit(1)
        .single();

      if (!plans) {
        throw new Error('Subscription plan not found');
      }

      const planId = plans.id;
      const amountPaid = paymentData.order_amount || paymentData.amount || plans.price;

      console.log('📦 Plan details:', { planId, amountPaid });

      // Step 4: Complete subscription in database
      console.log('💾 Creating subscription record...');
      
      const subscriptionResult = await completeSubscription({
        seller_id: sellerId,
        plan_id: planId,
        cashfree_order_id: cashfreeOrderId as string,
        payment_id: paymentData.cf_payment_id || paymentData.payment_id || cashfreeOrderId as string,
        amount_paid: parseFloat(amountPaid)
      });

      if (!subscriptionResult.success) {
        throw new Error(subscriptionResult.error || 'Failed to complete subscription');
      }

      console.log('✅ Subscription activated successfully!');
      setSubscriptionDetails(subscriptionResult.subscription);
      setSuccess(true);
      setLoading(false);

      // Refresh seller subscriptions
      await fetchSellerSubscriptions(sellerId);

    } catch (err: any) {
      console.error('❌ Subscription verification error:', err);
      setError(err.message || 'Failed to verify subscription');
      setSuccess(false);
      setLoading(false);

      Alert.alert(
        'Verification Error',
        'We could not verify your subscription payment. Please contact support if money was deducted.',
        [
          { text: 'OK', onPress: () => router.replace('/seller/dashboard') }
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Verifying your subscription...</Text>
          <Text style={styles.subText}>Please wait, do not close this page</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={80} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Verification Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/seller/dashboard')}
          >
            <Text style={styles.buttonText}>Go to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.replace('/seller/subscription')}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        </View>
        
        <Text style={styles.successTitle}>🎉 Subscription Activated!</Text>
        <Text style={styles.successMessage}>
          Your subscription has been successfully activated.
        </Text>

        {subscriptionDetails && (
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plan:</Text>
              <Text style={styles.detailValue}>
                {subscriptionDetails.plan?.name || 'Subscription Plan'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount Paid:</Text>
              <Text style={styles.detailValue}>
                ₹{subscriptionDetails.amount_paid?.toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Valid Until:</Text>
              <Text style={styles.detailValue}>
                {new Date(subscriptionDetails.expires_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>✨ What's Next?</Text>
          <Text style={styles.benefitItem}>✅ Add unlimited products and services</Text>
          <Text style={styles.benefitItem}>✅ Receive direct payments from customers</Text>
          <Text style={styles.benefitItem}>✅ Access seller dashboard and analytics</Text>
          <Text style={styles.benefitItem}>✅ Manage your orders and bookings</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/seller/products/add')}
        >
          <Text style={styles.primaryButtonText}>Add Your First Product</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/seller/dashboard')}
        >
          <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.error,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  detailValue: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  statusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  benefitsCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl,
  },
  benefitsTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  benefitItem: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginRight: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    width: '100%',
    marginBottom: spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    width: '100%',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});
