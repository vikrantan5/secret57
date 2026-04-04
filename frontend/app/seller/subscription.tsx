import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useSubscriptionStore, SubscriptionPlan } from '../../src/store/subscriptionStore';
import CashfreePayment from '../../src/components/CashfreePayment';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SellerSubscription() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { seller, fetchSellerProfile } = useSellerStore();
  const {
    plans,
    currentSubscription,
    loading,
    fetchPlans,
    fetchSellerSubscriptions,
    createSubscriptionOrder,
    completeSubscription,
  } = useSubscriptionStore();

  const [refreshing, setRefreshing] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;
    
    await fetchSellerProfile(user.id);
    await fetchPlans();
    
    if (seller?.id) {
      await fetchSellerSubscriptions(seller.id);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!seller?.id) {
      Alert.alert('Error', 'Seller profile not found');
      return;
    }

    if (!user?.email || !user?.phone) {
      Alert.alert('Error', 'Please complete your profile with email and phone number');
      return;
    }

    setSelectedPlan(plan);

 try {
      const result = await createSubscriptionOrder({
        seller_id: seller.id,
        plan_id: plan.id,
        seller_name: seller.company_name || user.name || user.email,
        seller_email: user.email,
        seller_phone: user.phone,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create subscription order');
        return;
      }

      // Open payment modal
      console.log('Order result from edge function:', JSON.stringify(result.order_data, null, 2));
      setOrderData(result.order_data);
      setPaymentSessionId(result.order_data.payment_session_id);
      setPaymentVisible(true);
      console.log('Payment Session ID:', result.order_data.payment_session_id);
      console.log('Payment URL from API:', result.order_data.payment_url || 'Not provided');
    } catch (error: any) {
      console.error('Subscription error:', error);
      Alert.alert('Error', error.message || 'Failed to initiate subscription');
    }
  };

  const handlePaymentSuccess = async (paymentId: string, orderId: string) => {
    setPaymentVisible(false);

    if (!selectedPlan || !orderData || !seller?.id) return;

    try {
      const result = await completeSubscription({
        seller_id: seller.id,
        plan_id: selectedPlan.id,
        cashfree_order_id: orderId,
        payment_id: paymentId,
        amount_paid: orderData.amount,
      });

      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          `Your ${selectedPlan.name} subscription is now active!`,
          [
            {
              text: 'OK',
              onPress: () => {
                loadData();
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to activate subscription');
      }
    } catch (error: any) {
      console.error('Complete subscription error:', error);
      Alert.alert('Error', 'Failed to activate subscription');
    }

    setSelectedPlan(null);
    setOrderData(null);
  };

  const handlePaymentFailure = (error: string) => {
    setPaymentVisible(false);
    Alert.alert('Payment Failed', error);
    setSelectedPlan(null);
    setOrderData(null);
  };

  const handlePaymentCancel = () => {
    setPaymentVisible(false);
    setSelectedPlan(null);
    setOrderData(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'expired':
        return colors.error;
      case 'cancelled':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getDaysRemaining = () => {
    if (!currentSubscription) return 0;
    const now = new Date();
    const expiry = new Date(currentSubscription.expires_at);
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subscription data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Current Subscription Status */}
        {currentSubscription ? (
          <View style={[styles.currentPlanCard, shadows.md]}>
            <View style={styles.currentPlanHeader}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanLabel}>Current Plan</Text>
                <Text style={styles.currentPlanName}>{currentSubscription.plan?.name}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(currentSubscription.status) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(currentSubscription.status) },
                  ]}
                >
                  {currentSubscription.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.expirySection}>
              <View style={styles.expiryRow}>
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.expiryLabel}>Expires on:</Text>
                <Text style={styles.expiryDate}>
                  {new Date(currentSubscription.expires_at).toLocaleDateString()}
                </Text>
              </View>
              {isExpiringSoon && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning" size={16} color={colors.warning} />
                  <Text style={styles.warningText}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                  </Text>
                </View>
              )}
              {daysRemaining === 0 && (
                <View style={[styles.warningBanner, { backgroundColor: colors.error + '15' }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={[styles.warningText, { color: colors.error }]}>Expired</Text>
                </View>
              )}
            </View>

            {currentSubscription.plan?.features && (
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>Plan Features:</Text>
                {currentSubscription.plan.features.map((feature: string, index: number) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={16} color={colors.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.noSubscriptionCard, shadows.sm]}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
            <Text style={styles.noSubscriptionTitle}>No Active Subscription</Text>
            <Text style={styles.noSubscriptionText}>
              Subscribe to a plan to start selling products and services
            </Text>
          </View>
        )}

        {/* Available Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>
            {currentSubscription ? 'Upgrade or Renew' : 'Choose Your Plan'}
          </Text>

          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;

            return (
              <View key={plan.id} style={[styles.planCard, shadows.sm]}>
                {plan.duration_type === 'yearly' && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>BEST VALUE</Text>
                  </View>
                )}

                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.planPrice}>₹{plan.price}</Text>
                  <Text style={styles.planDuration}>/{plan.duration_type}</Text>
                </View>

                {plan.features && (
                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                        <Text style={styles.planFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    isCurrentPlan && styles.subscribeButtonDisabled,
                  ]}
                  onPress={() => handleSubscribe(plan)}
                  disabled={isCurrentPlan}
                  data-testid={`subscribe-${plan.duration_type}-button`}
                >
                  <Text
                    style={[
                      styles.subscribeButtonText,
                      isCurrentPlan && styles.subscribeButtonTextDisabled,
                    ]}
                  >
                    {isCurrentPlan ? 'Current Plan' : `Subscribe for ₹${plan.price}`}
                  </Text>
                </TouchableOpacity>

                {plan.duration_type === 'yearly' && (
                  <Text style={styles.savingsText}>
                    Save ₹{499 * 12 - plan.price} compared to monthly
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              With an active subscription, you can add unlimited products and services. Payments
              from customers go directly to your bank account.
            </Text>
          </View>
        </View>
      </ScrollView>

         {/* Payment Modal */}
      {paymentVisible && paymentSessionId && orderData && (
       <CashfreePayment
  visible={paymentVisible}
  paymentSessionId={orderData.payment_session_id}
  paymentUrl={orderData.payment_url || `https://sandbox.cashfree.com/pg/orders/pay/${orderData.payment_session_id}`}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  currentPlanCard: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  currentPlanName: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.xs / 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  expirySection: {
    gap: spacing.sm,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expiryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  expiryDate: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning + '15',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
  },
  featuresSection: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  featuresTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  noSubscriptionCard: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  noSubscriptionTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
  },
  noSubscriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  plansSection: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  planCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  popularText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    fontSize: 10,
  },
  planName: {
    ...typography.h3,
    color: colors.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  planPrice: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  planDuration: {
    ...typography.body,
    color: colors.textSecondary,
  },
  planFeatures: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  planFeatureText: {
    ...typography.body,
    color: colors.text,
  },
  subscribeButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  subscribeButtonDisabled: {
    backgroundColor: colors.border,
  },
  subscribeButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  subscribeButtonTextDisabled: {
    color: colors.textSecondary,
  },
  savingsText: {
    ...typography.caption,
    color: colors.success,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  infoSection: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
});
