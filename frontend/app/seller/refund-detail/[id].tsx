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
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRefundStore } from '../../../src/store/refundStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';

const STATUS_OPTIONS = [
  { value: 'approved', label: 'Approve', icon: 'checkmark-circle-outline', gradient: ['#3B82F6', '#2563EB'] },
  { value: 'rejected', label: 'Reject', icon: 'close-circle-outline', gradient: ['#EF4444', '#DC2626'] },
  { value: 'processed', label: 'Processing', icon: 'refresh-outline', gradient: ['#8B5CF6', '#7C3AED'] },
  { value: 'refunded', label: 'Refunded', icon: 'checkmark-done-outline', gradient: ['#10B981', '#059669'] },
];

export default function RefundDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const refundId = params.id as string;
  
  const { selectedRefund, loading, fetchRefundById, updateRefundStatus } = useRefundStore();
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refundId) {
      fetchRefundById(refundId);
    }
  }, [refundId]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setSubmitting(true);
      const result = await updateRefundStatus(refundId, newStatus, response);
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Success',
          `Refund request has been ${newStatus}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update refund status');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'requested':
        return ['#F59E0B', '#D97706'];
      case 'approved':
        return ['#3B82F6', '#2563EB'];
      case 'rejected':
        return ['#EF4444', '#DC2626'];
      case 'processed':
        return ['#8B5CF6', '#7C3AED'];
      case 'refunded':
        return ['#10B981', '#059669'];
      default:
        return ['#6B7280', '#4B5563'];
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

  if (loading || !selectedRefund) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading refund details...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const refund = selectedRefund;
  const statusGradient = getStatusColor(refund.status);
  const canUpdate = refund.status === 'pending' || refund.status === 'requested' || refund.status === 'approved';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          <Text style={styles.headerTitle}>Refund Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* Status Card */}
        <LinearGradient
          colors={statusGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusCard}
        >
          <View style={styles.statusHeader}>
            <Ionicons name="return-down-back-outline" size={32} color="#FFFFFF" />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {refund.status.toUpperCase()}
              </Text>
              <Text style={styles.statusDate}>Requested {formatDate(refund.created_at)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Refund Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.cardIcon}
            >
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Refund Information</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Order Number</Text>
            <Text style={styles.value}>
              #{refund.order?.order_number?.slice(0, 12) || refund.order_id?.slice(0, 8)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Refund Amount</Text>
            <LinearGradient
              colors={['#1E1B4B', '#312E81']}
              style={styles.amountBadge}
            >
              <Text style={styles.amountValue}>₹{refund.amount?.toFixed(2)}</Text>
            </LinearGradient>
          </View>

          <View style={styles.divider} />

          <Text style={styles.messageLabel}>Reason for Refund</Text>
          <Text style={styles.messageText}>{refund.reason}</Text>

          {refund.description && (
            <>
              <View style={styles.divider} />
              <Text style={styles.messageLabel}>Additional Details</Text>
              <Text style={styles.messageText}>{refund.description}</Text>
            </>
          )}
        </View>

        {/* Payment Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.cardIcon}
            >
              <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Payment Details</Text>
          </View>

          {refund.upi_id ? (
            <>
              <View style={styles.paymentMethodRow}>
                <Ionicons name="phone-portrait-outline" size={20} color="#8B5CF6" />
                <Text style={styles.paymentMethodLabel}>UPI ID</Text>
              </View>
              <View style={styles.paymentValueBadge}>
                <Text style={styles.paymentValue}>{refund.upi_id}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.paymentMethodRow}>
                <Ionicons name="business-outline" size={20} color="#8B5CF6" />
                <Text style={styles.paymentMethodLabel}>Bank Account</Text>
              </View>
              
              <View style={styles.bankDetailsContainer}>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankDetailLabel}>Account Holder</Text>
                  <Text style={styles.bankDetailValue}>{refund.account_holder_name}</Text>
                </View>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankDetailLabel}>Account Number</Text>
                  <Text style={styles.bankDetailValue}>{refund.bank_account_number}</Text>
                </View>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankDetailLabel}>IFSC Code</Text>
                  <Text style={styles.bankDetailValue}>{refund.bank_ifsc}</Text>
                </View>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankDetailLabel}>Bank Name</Text>
                  <Text style={styles.bankDetailValue}>{refund.bank_name}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Order Details Card */}
        {refund.order && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.cardIcon}
              >
                <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.cardTitle}>Order Details</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Customer</Text>
              <Text style={styles.value}>{refund.order.shipping_name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{refund.order.shipping_phone}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Order Amount</Text>
              <Text style={styles.orderAmountValue}>₹{refund.order.total_amount?.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Action Card */}
        {canUpdate ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.cardIcon}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.cardTitle}>Response (Optional)</Text>
            </View>

            <TextInput
              style={styles.textArea}
              placeholder="Add a note or message to the customer..."
              placeholderTextColor="#9CA3AF"
              value={response}
              onChangeText={setResponse}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.actionButtons}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.actionButton}
                  onPress={() => {
                    Alert.alert(
                      'Confirm Action',
                      `Are you sure you want to ${option.label.toLowerCase()} this refund request?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Confirm', onPress: () => handleUpdateStatus(option.value) },
                      ]
                    );
                  }}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={option.gradient}
                    style={styles.actionGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name={option.icon as any} size={20} color="#FFFFFF" />
                        <Text style={styles.actionText}>{option.label}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.cardIcon}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.cardTitle}>Seller Response</Text>
            </View>

            <Text style={styles.responseText}>
              {refund.seller_response || 'No response provided'}
            </Text>

            {refund.seller_response_at && (
              <Text style={styles.responseDate}>
                Responded on {formatDate(refund.seller_response_at)}
              </Text>
            )}
          </View>
        )}

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
              <Text style={styles.noticeText}>
                Process refunds to the customer's provided payment method
              </Text>
            </View>
            <View style={styles.noticeItem}>
              <View style={styles.noticeDot} />
              <Text style={styles.noticeText}>
                Keep the customer informed about the refund status
              </Text>
            </View>
            <View style={styles.noticeItem}>
              <View style={styles.noticeDot} />
              <Text style={styles.noticeText}>
                Refunds typically take 5-7 business days to process
              </Text>
            </View>
          </View>
        </LinearGradient>

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
  statusCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
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
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  amountBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderAmountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: spacing.md,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  messageText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentValueBadge: {
    backgroundColor: '#F3F4F6',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  bankDetailsContainer: {
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankDetailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  bankDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  responseText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  responseDate: {
    fontSize: 12,
    color: '#9CA3AF',
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
});
