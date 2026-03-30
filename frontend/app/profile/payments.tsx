import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { usePaymentMethodStore } from '../../src/store/paymentMethodStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { paymentMethod, loading, fetchPaymentMethod, savePaymentMethod } = usePaymentMethodStore();

  const [upiId, setUpiId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [preferredMethod, setPreferredMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchPaymentMethod(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (paymentMethod) {
      setUpiId(paymentMethod.upi_id || '');
      setPhoneNumber(paymentMethod.phone_number || '');
      setPreferredMethod(paymentMethod.preferred_method || 'upi');
    }
  }, [paymentMethod]);

  const paymentMethods = [
    { id: 'upi' as const, label: 'UPI', icon: 'wallet-outline' },
    { id: 'card' as const, label: 'Card', icon: 'card-outline' },
    { id: 'netbanking' as const, label: 'Net Banking', icon: 'business-outline' },
  ];

  const handleSave = async () => {
    if (preferredMethod === 'upi' && !upiId.trim()) {
      Alert.alert('Error', 'Please enter your UPI ID');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please login to save payment methods');
      return;
    }

    setSaving(true);

    const result = await savePaymentMethod(user.id, {
      upi_id: upiId.trim(),
      phone_number: phoneNumber.trim(),
      preferred_method: preferredMethod,
    });

    setSaving(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Payment methods saved successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to save payment methods');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 40 }} />
      </View>

         <ScrollView showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Saved Payment Info */}
            {paymentMethod && paymentMethod.upi_id && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Saved Payment Info</Text>
                <View style={styles.savedCard}>
                  <View style={styles.savedHeader}>
                    <Ionicons name="wallet" size={24} color={colors.success} />
                    <View style={styles.savedInfo}>
                      <Text style={styles.savedLabel}>UPI ID</Text>
                      <Text style={styles.savedValue}>{paymentMethod.upi_id}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
        {/* Preferred Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Payment Method</Text>
          <View style={styles.methodsContainer}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  preferredMethod === method.id && styles.methodCardActive,
                ]}
                onPress={() => {
                  setPreferredMethod(method.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons
                  name={method.icon as any}
                  size={32}
                  color={preferredMethod === method.id ? colors.primary : colors.textLight}
                />
                <Text
                  style={[
                    styles.methodLabel,
                    preferredMethod === method.id && styles.methodLabelActive,
                  ]}
                >
                  {method.label}
                </Text>
                {preferredMethod === method.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* UPI Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPI Details</Text>
          <View style={styles.card}>
            <Text style={styles.label}>UPI ID</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="at-outline" size={20} color={colors.textLight} />
              <TextInput
                style={styles.input}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="yourname@upi"
                placeholderTextColor={colors.textLight}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <Text style={styles.hint}>
              Enter your UPI ID for quick payments (e.g., yourname@paytm, yourname@phonepe)
            </Text>
          </View>
        </View>

        {/* Phone Number for Payments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phone Number for Payments</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={colors.textLight} />
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
              />
            </View>
            <Text style={styles.hint}>
              Phone number linked with your payment accounts
            </Text>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <Text style={styles.infoText}>
            Your payment information is securely stored and never shared with third parties.
            Card details are not stored on our servers.
          </Text>
        </View>

            {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.saveButton, (saving || loading) && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.saveButtonText}>Save Payment Methods</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
          </>
        )}
      </ScrollView>
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
    paddingVertical: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  savedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  savedInfo: {
    flex: 1,
  },
  savedLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  savedValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  methodsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  methodCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  methodCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  methodLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  methodLabelActive: {
    color: colors.primary,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.info,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.md,
  },
    saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
});