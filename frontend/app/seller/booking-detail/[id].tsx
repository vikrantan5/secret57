// Seller Booking Detail with OTP Entry
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
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '../../../src/store/bookingStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';

export default function SellerBookingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const bookingId = params.id as string;
  
  const { selectedBooking, loading, fetchBookingById, verifyOTP } = useBookingStore();
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (bookingId) {
      fetchBookingById(bookingId);
    }
  }, [bookingId]);

  const handleVerifyOTP = async () => {
    if (!otpInput || otpInput.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setVerifying(true);
    const result = await verifyOTP(bookingId, otpInput);
    setVerifying(false);

    if (result.success) {
      setShowOTPModal(false);
      setOtpInput('');
      Alert.alert(
        'Success',
        'Service completed successfully! Payment will be processed shortly.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', result.error || 'Invalid OTP');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'confirmed':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'cancelled':
      case 'rejected':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  if (loading || !selectedBooking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const booking = selectedBooking;
  const canComplete = booking.status === 'confirmed' && !booking.otp_verified;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(booking.status) }]}>
          <Text style={styles.statusBannerText}>
            {booking.status.toUpperCase().replace('_', ' ')}
          </Text>
        </View>

        {/* Customer Info */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{booking.customer?.name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{booking.customer?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{booking.customer?.email || 'N/A'}</Text>
          </View>
        </View>

        {/* Service Info */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Service Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Service:</Text>
            <Text style={styles.value}>{booking.service?.name}</Text>
          </View>
          {booking.service?.duration && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Duration:</Text>
              <Text style={styles.value}>{booking.service.duration} minutes</Text>
            </View>
          )}
        </View>

        {/* Booking Details */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Booking Details</Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(booking.booking_date)}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{formatTime(booking.booking_time)}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {booking.location_type === 'visit_customer'
                  ? 'Visit Customer Location'
                  : 'Customer Visits You'}
              </Text>
            </View>
          </View>
        </View>

        {/* Address (if visit_customer) */}
        {booking.location_type === 'visit_customer' && booking.address && (
          <View style={[styles.card, shadows.sm]}>
            <Text style={styles.cardTitle}>Service Address</Text>
            <Text style={styles.address}>{booking.address}</Text>
            <Text style={styles.address}>
              {booking.city}, {booking.state} - {booking.pincode}
            </Text>
          </View>
        )}

        {/* Notes */}
        {booking.notes && (
          <View style={[styles.card, shadows.sm]}>
            <Text style={styles.cardTitle}>Customer Notes</Text>
            <Text style={styles.notes}>{booking.notes}</Text>
          </View>
        )}

        {/* Payment Info */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total Amount</Text>
            <Text style={styles.paymentValue}>₹{booking.total_amount.toFixed(2)}</Text>
          </View>
          {booking.payment_method && (
            <View style={[styles.paymentStatusRow, { backgroundColor: colors.success + '10' }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.paymentStatusText, { color: colors.success }]}>
                Payment Received
              </Text>
            </View>
          )}
        </View>

        {/* OTP Verified Badge */}
        {booking.otp_verified && (
          <View style={[styles.card, shadows.sm, { backgroundColor: colors.success + '10' }]}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-done-circle" size={32} color={colors.success} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.cardTitle, { color: colors.success }]}>
                  Service Completed
                </Text>
                <Text style={styles.verifiedText}>
                  OTP verified successfully. Payment processed.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Complete Service Button */}
        {canComplete && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => setShowOTPModal(true)}
              data-testid="complete-service-button"
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
              <Text style={styles.completeButtonText}>Complete Service</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOTPModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOTPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Ionicons name="key" size={32} color={colors.primary} />
              <Text style={styles.modalTitle}>Enter Service OTP</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              Ask the customer for the 6-digit OTP shown on their booking page to verify service completion.
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor={colors.textSecondary}
              value={otpInput}
              onChangeText={(text) => setOtpInput(text.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              data-testid="otp-input-field"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowOTPModal(false);
                  setOtpInput('');
                }}
                disabled={verifying}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.verifyButton]}
                onPress={handleVerifyOTP}
                disabled={verifying || otpInput.length !== 6}
                data-testid="verify-otp-button"
              >
                {verifying ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify & Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  statusBanner: {
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusBannerText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    letterSpacing: 1,
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
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
  },
  address: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  notes: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  paymentLabel: {
    ...typography.h4,
    color: colors.text,
  },
  paymentValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  paymentStatusText: {
    ...typography.body,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  actionButtons: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  completeButton: {
    backgroundColor: colors.success,
  },
  completeButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  modalDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  otpInput: {
    ...typography.h2,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: colors.primary,
  },
  verifyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
