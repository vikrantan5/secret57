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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrderStore } from '../../../src/store/orderStore';
import { useRefundStore } from '../../../src/store/refundStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';
import { Button } from '../../../src/components/ui/Button';

const REFUND_REASONS = [
  'Product defective or damaged',
  'Product not as described',
  'Wrong item received',
  'Quality issues',
  'Changed my mind',
  'Other',
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderById(orderId);
    }
  }, [orderId]);

  const handleSubmitRefund = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for refund');
      return;
    }

    if (selectedReason === 'Other' && !customReason.trim()) {
      Alert.alert('Error', 'Please provide a reason');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please provide details about your refund request');
      return;
    }

    try {
      setSubmitting(true);

      const reason = selectedReason === 'Other' ? customReason : selectedReason;

      const result = await createRefundRequest({
        order_id: orderId,
        seller_id: selectedOrder?.items?.[0]?.seller_id,
        amount: selectedOrder?.total_amount || 0,
        reason,
        description,
      });

      if (result.success) {
        Alert.alert(
          'Refund Request Submitted',
          'Your refund request has been submitted successfully. The seller will review it shortly.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
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

  if (orderLoading || !selectedOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Refund</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Info */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Order Number:</Text>
            <Text style={styles.value}>{selectedOrder.order_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Total Amount:</Text>
            <Text style={styles.value}>₹{selectedOrder.total_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, { color: colors.success }]}>
              {selectedOrder.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Reason Selection */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Reason for Refund *</Text>
          <View style={styles.reasonsContainer}>
            {REFUND_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  selectedReason === reason && styles.reasonOptionActive,
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <View style={styles.radioOuter}>
                  {selectedReason === reason && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextActive,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedReason === 'Other' && (
            <TextInput
              style={styles.input}
              placeholder="Please specify..."
              placeholderTextColor={colors.textSecondary}
              value={customReason}
              onChangeText={setCustomReason}
            />
          )}
        </View>

        {/* Description */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Additional Details *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please provide details about why you're requesting a refund..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Important Notice */}
        <View style={[styles.card, shadows.sm, { backgroundColor: colors.warning + '10' }]}>
          <View style={styles.noticeHeader}>
            <Ionicons name="information-circle" size={24} color={colors.warning} />
            <Text style={[styles.cardTitle, { color: colors.warning, marginBottom: 0 }]}>
              Important
            </Text>
          </View>
          <Text style={styles.noticeText}>
            • Your refund request will be reviewed by the seller{''}
            • Refunds are typically processed within 5-7 business days{''}
            • The amount will be credited to your original payment method
          </Text>
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Submit Refund Request"
            onPress={handleSubmitRefund}
            loading={submitting || refundLoading}
            variant="primary"
            data-testid="submit-refund-button"
          />
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.text,
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
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  reasonOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  reasonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  noticeText: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 20,
  },
  buttonContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
});
