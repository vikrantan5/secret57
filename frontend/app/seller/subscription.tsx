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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useSubscriptionStore, SubscriptionPlan } from '../../src/store/subscriptionStore';
import CashfreePayment from '../../src/components/CashfreePayment';

// Premium Professional Color Palette
const colors = {
  background: '#0B0C10',
  surface: '#13151A',
  surfaceElevated: '#1A1D24',
  surfaceHigher: '#22262F',
  
  textPrimary: '#FFFFFF',
  textSecondary: '#C0C5D0',
  textTertiary: '#A0A5B5',
  textMuted: '#6B7280',
  
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
  header: ['#0B0C10', '#13151A'],
  premium: ['#667eea', '#764ba2', '#f093fb'],
};

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
      
      if (!result.order_data.payment_session_id) {
        Alert.alert('Error', 'Payment session ID not received from server');
        return;
      }
      
      setOrderData(result.order_data);
      setPaymentVisible(true);
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
        return colors.accentSuccess;
      case 'expired':
        return colors.accentError;
      case 'cancelled':
        return colors.textTertiary;
      default:
        return colors.textTertiary;
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
        <LinearGradient
          colors={[colors.background, colors.surface]}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color={colors.accentPrimary} />
          <Text style={styles.loadingText}>Loading subscription data...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={gradients.header}
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
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={colors.accentPrimary}
              colors={[colors.accentPrimary]} 
            />
          }
        >
          {/* Current Subscription Status */}
          {currentSubscription ? (
            <LinearGradient
              colors={gradients.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.currentPlanCard}
            >
              <View style={styles.currentPlanHeader}>
                <LinearGradient
                  colors={gradients.success}
                  style={styles.checkIcon}
                >
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                </LinearGradient>
                <View style={styles.currentPlanInfo}>
                  <Text style={styles.currentPlanLabel}>Current Plan</Text>
                  <Text style={styles.currentPlanName}>{currentSubscription.plan?.name}</Text>
                </View>
                <LinearGradient
                  colors={[getStatusColor(currentSubscription.status) + '20', getStatusColor(currentSubscription.status) + '10']}
                  style={styles.statusBadge}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(currentSubscription.status) },
                    ]}
                  >
                    {currentSubscription.status.toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>

              <View style={styles.divider} />

              <View style={styles.expirySection}>
                <View style={styles.expiryRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
                  <Text style={styles.expiryLabel}>Expires on:</Text>
                  <Text style={styles.expiryDate}>
                    {new Date(currentSubscription.expires_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                {isExpiringSoon && (
                  <LinearGradient
                    colors={[colors.accentWarningGlow, 'transparent']}
                    style={styles.warningBanner}
                  >
                    <Ionicons name="alert-circle" size={16} color={colors.accentWarning} />
                    <Text style={styles.warningText}>
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                    </Text>
                  </LinearGradient>
                )}
                {daysRemaining === 0 && (
                  <LinearGradient
                    colors={[colors.accentErrorGlow, 'transparent']}
                    style={styles.warningBanner}
                  >
                    <Ionicons name="close-circle" size={16} color={colors.accentError} />
                    <Text style={[styles.warningText, { color: colors.accentError }]}>Expired</Text>
                  </LinearGradient>
                )}
              </View>

              {currentSubscription.plan?.features && (
                <View style={styles.featuresSection}>
                  <Text style={styles.featuresTitle}>Plan Features:</Text>
                  {currentSubscription.plan.features.map((feature: string, index: number) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.accentSuccess} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={gradients.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.noSubscriptionCard}
            >
              <LinearGradient
                colors={gradients.warning}
                style={styles.warningIconContainer}
              >
                <Ionicons name="alert-circle-outline" size={32} color="#FFF" />
              </LinearGradient>
              <Text style={styles.noSubscriptionTitle}>No Active Subscription</Text>
              <Text style={styles.noSubscriptionText}>
                Subscribe to a plan to start selling products and services
              </Text>
            </LinearGradient>
          )}

          {/* Available Plans */}
          <View style={styles.plansSection}>
            <Text style={styles.sectionTitle}>
              {currentSubscription ? 'Upgrade or Renew' : 'Choose Your Plan'}
            </Text>

            {plans.map((plan, index) => {
              const isCurrentPlan = currentSubscription?.plan_id === plan.id;
              const isPopular = plan.duration_type === 'yearly';

              return (
                <LinearGradient
                  key={plan.id}
                  colors={isPopular ? ['#1A1D24', '#13151A'] : gradients.card}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.planCard,
                    isPopular && styles.popularPlanCard,
                  ]}
                >
                  {isPopular && (
                    <LinearGradient
                      colors={gradients.premium}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.popularBadge}
                    >
                      <Text style={styles.popularText}>BEST VALUE</Text>
                    </LinearGradient>
                  )}

                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.planPrice}>₹{plan.price}</Text>
                    <Text style={styles.planDuration}>/{plan.duration_type}</Text>
                  </View>

                  {plan.features && (
                    <View style={styles.planFeatures}>
                      {plan.features.slice(0, 4).map((feature, idx) => (
                        <View key={idx} style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.accentPrimary} />
                          <Text style={styles.planFeatureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSubscribe(plan)}
                    disabled={isCurrentPlan}
                  >
                    <LinearGradient
                      colors={isCurrentPlan ? [colors.surfaceHigher, colors.surface] : gradients.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.subscribeButton}
                    >
                      <Text style={styles.subscribeButtonText}>
                        {isCurrentPlan ? 'Current Plan' : `Subscribe • ₹${plan.price}`}
                      </Text>
                      {!isCurrentPlan && (
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {isPopular && (
                    <Text style={styles.savingsText}>
                      Save ₹{499 * 12 - plan.price} compared to monthly
                    </Text>
                  )}
                </LinearGradient>
              );
            })}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <LinearGradient
              colors={[colors.accentPrimaryGlow, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoCard}
            >
              <Ionicons name="information-circle" size={20} color={colors.accentPrimary} />
              <Text style={styles.infoText}>
                With an active subscription, you can add unlimited products and services. Payments
                from customers go directly to your bank account.
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>

        {/* Payment Modal */}
        {paymentVisible && orderData && (
          <CashfreePayment
            visible={paymentVisible}
            paymentSessionId={orderData.payment_session_id}
            orderId={orderData.order_id}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
            onCancel={handlePaymentCancel}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  currentPlanCard: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  currentPlanName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
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
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  expirySection: {
    gap: 12,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expiryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  expiryDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentWarning,
  },
  featuresSection: {
    marginTop: 16,
    gap: 8,
  },
  featuresTitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  noSubscriptionCard: {
    margin: 20,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSubscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  noSubscriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  plansSection: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  planCard: {
    padding: 20,
    borderRadius: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  popularPlanCard: {
    borderWidth: 2,
    borderColor: colors.accentPurple,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.accentPrimary,
    letterSpacing: -1,
  },
  planDuration: {
    fontSize: 14,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  planFeatures: {
    gap: 10,
    marginBottom: 20,
  },
  planFeatureText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  subscribeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  savingsText: {
    fontSize: 11,
    color: colors.accentSuccess,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});