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
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useOrderStore } from '../../../src/store/orderStore';
import { useRefundStore } from '../../../src/store/refundStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';
import { Button } from '../../../src/components/ui/Button';

const { width, height } = Dimensions.get('window');

const REFUND_REASONS = [
  { id: 'defective', label: 'Product defective or damaged', icon: 'warning-outline', color: '#EF4444' },
  { id: 'not_as_described', label: 'Product not as described', icon: 'eye-off-outline', color: '#F59E0B' },
  { id: 'wrong_item', label: 'Wrong item received', icon: 'swap-horizontal-outline', color: '#8B5CF6' },
  { id: 'quality_issues', label: 'Quality issues', icon: 'thumbs-down-outline', color: '#EC4899' },
  { id: 'changed_mind', label: 'Changed my mind', icon: 'refresh-outline', color: '#3B82F6' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

export default function OrderRefundRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = params.id as string;
  
  const { selectedOrder, loading: orderLoading, fetchOrderById } = useOrderStore();
  const { createRefundRequest, loading: refundLoading } = useRefundStore();
  
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [description, setDescription] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'upi' | 'bank'>('upi');
  const [submitting, setSubmitting] = useState(false);
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
  }, []);

  const handleSubmitRefund = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for refund');
      return;
    }

    const selectedReasonData = REFUND_REASONS.find(r => r.id === selectedReason);
    if (selectedReason === 'other' && !customReason.trim()) {
      Alert.alert('Error', 'Please provide a reason');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please provide details about your refund request');
      return;
    }

    // Validate payment details
    if (paymentMode === 'upi') {
      if (!upiId.trim()) {
        Alert.alert('Error', 'Please provide your UPI ID');
        return;
      }
    } else {
      if (!bankAccountNumber.trim() || !bankIfsc.trim() || !bankName.trim() || !accountHolderName.trim()) {
        Alert.alert('Error', 'Please fill in all bank account details');
        return;
      }
    }

    try {
      setSubmitting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const reason = selectedReason === 'other' ? customReason : (selectedReasonData?.label || '');

      const refundData: any = {
        order_id: orderId,
          seller_id: selectedOrder?.order_items?.[0]?.seller_id || selectedOrder?.items?.[0]?.seller_id,
        amount: selectedOrder?.total_amount || 0,
        reason,
        description,
      };

      // Add payment details based on mode
      if (paymentMode === 'upi') {
        refundData.upi_id = upiId;
      } else {
        refundData.bank_account_number = bankAccountNumber;
        refundData.bank_ifsc = bankIfsc;
        refundData.bank_name = bankName;
        refundData.account_holder_name = accountHolderName;
      }

      const result = await createRefundRequest(refundData);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Refund Request Submitted',
          'Your refund request has been submitted successfully. The seller will review it shortly.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit refund request');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedReasonColor = () => {
    const reason = REFUND_REASONS.find(r => r.id === selectedReason);
    return reason?.color || '#8B5CF6';
  };

  if (orderLoading || !selectedOrder) {
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
          <Text style={styles.headerTitle}>Request Refund</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Order Info Card */}
        <LinearGradient
          colors={['#FFFFFF', '#F9FAFB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.cardIcon}
            >
              <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Order Information</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Order Number</Text>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.valueBadge}
            >
              <Text style={styles.value}>#{selectedOrder.order_number?.slice(0, 12)}</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Total Amount</Text>
            <LinearGradient
              colors={['#1E1B4B', '#312E81']}
              style={styles.amountBadge}
            >
              <Text style={styles.amountValue}>₹{selectedOrder.total_amount.toFixed(2)}</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Order Status</Text>
            <LinearGradient
              colors={['#D1FAE5', '#A7F3D0']}
              style={styles.statusBadge}
            >
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={[styles.statusText, { color: '#10B981' }]}>
                {selectedOrder.status.toUpperCase()}
              </Text>
            </LinearGradient>
          </View>
        </LinearGradient>

        {/* Reason Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.cardIcon}
            >
              <Ionicons name="alert-circle-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Reason for Refund *</Text>
          </View>
          
          <View style={styles.reasonsContainer}>
            {REFUND_REASONS.map((reason) => {
              const isSelected = selectedReason === reason.id;
              return (
                <TouchableOpacity
                  key={reason.id}
                  style={[styles.reasonOption, isSelected && styles.reasonOptionActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedReason(reason.id);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isSelected ? [reason.color, reason.color + 'CC'] : ['#F9FAFB', '#FFFFFF']}
                    style={styles.reasonIconContainer}
                  >
                    <Ionicons name={reason.icon as any} size={20} color={isSelected ? '#FFFFFF' : reason.color} />
                  </LinearGradient>
                  <Text
                    style={[
                      styles.reasonText,
                      isSelected && styles.reasonTextActive,
                    ]}
                  >
                    {reason.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.reasonCheckmark}>
                      <Ionicons name="checkmark-circle" size={20} color={reason.color} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedReason === 'other' && (
            <Animated.View style={styles.customReasonContainer}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.customReasonGradient}
              >
                <Ionicons name="create-outline" size={20} color="#8B5CF6" />
                <TextInput
                  style={styles.customReasonInput}
                  placeholder="Please specify your reason..."
                  placeholderTextColor="#9CA3AF"
                  value={customReason}
                  onChangeText={setCustomReason}
                />
              </LinearGradient>
            </Animated.View>
          )}
        </View>

        {/* Description */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.cardIcon}
            >
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Additional Details *</Text>
          </View>
          
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.textAreaContainer}
          >
            <TextInput
              style={styles.textArea}
              placeholder="Please provide details about why you're requesting a refund..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </LinearGradient>
        </View>


            {/* Payment Mode Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.cardIcon}
            >
              <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Refund Payment Method *</Text>
          </View>
          
          <View style={styles.paymentModeContainer}>
            <TouchableOpacity
              style={[styles.paymentModeOption, paymentMode === 'upi' && styles.paymentModeOptionActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPaymentMode('upi');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={paymentMode === 'upi' ? ['#3B82F6', '#2563EB'] : ['#F9FAFB', '#FFFFFF']}
                style={styles.paymentModeIconContainer}
              >
                <Ionicons name="phone-portrait-outline" size={24} color={paymentMode === 'upi' ? '#FFFFFF' : '#3B82F6'} />
              </LinearGradient>
              <Text style={[styles.paymentModeText, paymentMode === 'upi' && styles.paymentModeTextActive]}>
                UPI ID
              </Text>
              {paymentMode === 'upi' && (
                <Ionicons name="checkmark-circle" size={20} color="#3B82F6" style={styles.paymentModeCheck} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentModeOption, paymentMode === 'bank' && styles.paymentModeOptionActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPaymentMode('bank');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={paymentMode === 'bank' ? ['#3B82F6', '#2563EB'] : ['#F9FAFB', '#FFFFFF']}
                style={styles.paymentModeIconContainer}
              >
                <Ionicons name="business-outline" size={24} color={paymentMode === 'bank' ? '#FFFFFF' : '#3B82F6'} />
              </LinearGradient>
              <Text style={[styles.paymentModeText, paymentMode === 'bank' && styles.paymentModeTextActive]}>
                Bank Account
              </Text>
              {paymentMode === 'bank' && (
                <Ionicons name="checkmark-circle" size={20} color="#3B82F6" style={styles.paymentModeCheck} />
              )}
            </TouchableOpacity>
          </View>

          {/* UPI Input */}
          {paymentMode === 'upi' && (
            <Animated.View style={styles.paymentInputContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F9FAFB']}
                style={styles.inputGradient}
              >
                <Ionicons name="at-outline" size={20} color="#3B82F6" />
                <TextInput
                  style={styles.paymentInput}
                  placeholder="Enter your UPI ID (e.g., yourname@upi)"
                  placeholderTextColor="#9CA3AF"
                  value={upiId}
                  onChangeText={setUpiId}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </LinearGradient>
            </Animated.View>
          )}

          {/* Bank Account Inputs */}
          {paymentMode === 'bank' && (
            <Animated.View style={styles.paymentInputContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F9FAFB']}
                style={styles.inputGradient}
              >
                <Ionicons name="person-outline" size={20} color="#3B82F6" />
                <TextInput
                  style={styles.paymentInput}
                  placeholder="Account Holder Name"
                  placeholderTextColor="#9CA3AF"
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                />
              </LinearGradient>

              <LinearGradient
                colors={['#FFFFFF', '#F9FAFB']}
                style={styles.inputGradient}
              >
                <Ionicons name="card-outline" size={20} color="#3B82F6" />
                <TextInput
                  style={styles.paymentInput}
                  placeholder="Account Number"
                  placeholderTextColor="#9CA3AF"
                  value={bankAccountNumber}
                  onChangeText={setBankAccountNumber}
                  keyboardType="number-pad"
                />
              </LinearGradient>

              <LinearGradient
                colors={['#FFFFFF', '#F9FAFB']}
                style={styles.inputGradient}
              >
                <Ionicons name="business-outline" size={20} color="#3B82F6" />
                <TextInput
                  style={styles.paymentInput}
                  placeholder="Bank Name"
                  placeholderTextColor="#9CA3AF"
                  value={bankName}
                  onChangeText={setBankName}
                />
              </LinearGradient>

              <LinearGradient
                colors={['#FFFFFF', '#F9FAFB']}
                style={styles.inputGradient}
              >
                <Ionicons name="code-outline" size={20} color="#3B82F6" />
                <TextInput
                  style={styles.paymentInput}
                  placeholder="IFSC Code"
                  placeholderTextColor="#9CA3AF"
                  value={bankIfsc}
                  onChangeText={setBankIfsc}
                  autoCapitalize="characters"
                />
              </LinearGradient>
            </Animated.View>
          )}
        </View>


        {/* Important Notice */}
        <LinearGradient
          colors={['#FEF3C7', '#FDE68A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.noticeCard}
        >
          <View style={styles.noticeHeader}>
            <Ionicons name="information-circle" size={24} color="#92400E" />
            <Text style={styles.noticeTitle}>Important Information</Text>
          </View>
          <View style={styles.noticeList}>
            <View style={styles.noticeItem}>
              <View style={styles.noticeDot} />
              <Text style={styles.noticeText}>Your refund request will be reviewed by the seller</Text>
            </View>
            <View style={styles.noticeItem}>
              <View style={styles.noticeDot} />
              <Text style={styles.noticeText}>Refunds are typically processed within 5-7 business days</Text>
            </View>
            <View style={styles.noticeItem}>
              <View style={styles.noticeDot} />
              <Text style={styles.noticeText}>The amount will be credited to your original payment method</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.submitButton, (submitting || refundLoading) && styles.submitButtonDisabled]}
            onPress={handleSubmitRefund}
            disabled={submitting || refundLoading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={selectedReason ? [getSelectedReasonColor(), getSelectedReasonColor() + 'CC'] : ['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              {submitting || refundLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="return-down-back-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Submit Refund Request</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  valueBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  amountBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reasonsContainer: {
    gap: spacing.sm,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  reasonOptionActive: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
  },
  reasonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
  },
  reasonTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  reasonCheckmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  customReasonContainer: {
    marginTop: spacing.md,
  },
  customReasonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customReasonInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: '#1F2937',
  },
  textAreaContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  textArea: {
    padding: spacing.md,
    minHeight: 140,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 22,
  },
  noticeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  noticeList: {
    gap: spacing.sm,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noticeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#92400E',
    marginTop: 6,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
  buttonContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  submitButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },


   paymentModeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  paymentModeOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    position: 'relative',
  },
  paymentModeOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  paymentModeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  paymentModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  paymentModeTextActive: {
    color: '#3B82F6',
  },
  paymentModeCheck: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  paymentInputContainer: {
    gap: spacing.md,
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: spacing.sm,
  },
  paymentInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: '#1F2937',
  },
});