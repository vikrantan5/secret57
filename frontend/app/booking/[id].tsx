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
    Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '../../src/store/bookingStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function BookingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const bookingId = params.id as string;
  
  const { selectedBooking, loading, fetchBookingById, cancelBooking } = useBookingStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    if (bookingId) {
      fetchBookingById(bookingId);
    }
  }, [bookingId]);

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

  const handleCancelBooking = async () => {
    if (!cancellationReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    const result = await cancelBooking(bookingId, cancellationReason);
    
    if (result.success) {
      setShowCancelModal(false);
      setCancellationReason('');
      Alert.alert(
        'Booking Cancelled',
        'Your booking has been cancelled successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to cancel booking');
    }
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
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

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
            {booking.status.toUpperCase()}
          </Text>
        </View>

        {/* Service Info */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Service Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Service:</Text>
            <Text style={styles.value}>{booking.service?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Provider:</Text>
            <Text style={styles.value}>{booking.seller?.company_name}</Text>
          </View>
          {booking.service?.duration && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Duration:</Text>
              <Text style={styles.value}>{booking.service.duration} minutes</Text>
            </View>
          )}
        </View>


          {/* Contact Seller - Show after payment */}
        {booking.payment_method && (booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'in_progress') && (
          <View style={[styles.card, shadows.sm, styles.contactCard]}>
            <View style={styles.contactHeader}>
              <Ionicons name="chatbubbles" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Contact Service Provider</Text>
            </View>
            <Text style={styles.contactDescription}>
              Reach out to the service provider for any queries or coordination
            </Text>
            {booking.seller?.user?.phone && (
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => {
                  // Open phone dialer
                  const phoneUrl = `tel:${booking.seller.user.phone}`;
                  Alert.alert(
                    'Call Seller',
                    `Do you want to call ${booking.seller.user.phone}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Call', onPress: () => {
                        if (Platform.OS === 'web') {
                          window.open(phoneUrl);
                        } else {
                          require('react-native').Linking.openURL(phoneUrl);
                        }
                      }}
                    ]
                  );
                }}
                data-testid="contact-seller-phone-button"
              >
                <Ionicons name="call" size={20} color={colors.primary} />
                <View style={styles.contactButtonContent}>
                  <Text style={styles.contactButtonLabel}>Phone</Text>
                  <Text style={styles.contactButtonValue}>{booking.seller.user.phone}</Text>
                </View>
              </TouchableOpacity>
            )}
            {booking.seller?.user?.email && (
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => {
                  // Open email client
                  const emailUrl = `mailto:${booking.seller.user.email}?subject=Regarding Booking ${booking.id.slice(0, 8)}`;
                  Alert.alert(
                    'Email Seller',
                    `Do you want to send email to ${booking.seller.user.email}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Email', onPress: () => {
                        if (Platform.OS === 'web') {
                          window.open(emailUrl);
                        } else {
                          require('react-native').Linking.openURL(emailUrl);
                        }
                      }}
                    ]
                  );
                }}
                data-testid="contact-seller-email-button"
              >
                <Ionicons name="mail" size={20} color={colors.primary} />
                <View style={styles.contactButtonContent}>
                  <Text style={styles.contactButtonLabel}>Email</Text>
                  <Text style={styles.contactButtonValue}>{booking.seller.user.email}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

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
                  ? 'Service provider will visit you'
                  : 'You will visit service provider'}
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
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notes}>{booking.notes}</Text>
          </View>
        )}

        {/* Cancellation Reason */}
        {booking.cancellation_reason && (
          <View style={[styles.card, shadows.sm, { backgroundColor: colors.error + '10' }]}>
            <Text style={[styles.cardTitle, { color: colors.error }]}>Cancellation Reason</Text>
            <Text style={styles.notes}>{booking.cancellation_reason}</Text>
          </View>
        )}

        {/* Payment Info */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total Amount</Text>
            <Text style={styles.paymentValue}>₹{booking.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Cancel Modal */}
        {showCancelModal && (
          <View style={[styles.card, shadows.md, { backgroundColor: colors.surface }]}>
            <Text style={styles.cardTitle}>Cancel Booking</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for cancellation:</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter reason..."
              placeholderTextColor={colors.textSecondary}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancellationReason('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmCancelButton]}
                onPress={handleCancelBooking}
              >
                <Text style={styles.confirmCancelButtonText}>Cancel Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {canCancel && !showCancelModal && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setShowCancelModal(true)}
              data-testid="cancel-booking-button"
            >
              <Ionicons name="close-circle" size={20} color={colors.surface} />
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
          
          {/* Report Seller Button */}
          {booking.status === 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.reportButton]}
              onPress={() => router.push(`/complaints/create?bookingId=${bookingId}&sellerId=${booking.seller_id}`)}
              data-testid="report-seller-button"
            >
              <Ionicons name="flag-outline" size={20} color={colors.surface} />
              <Text style={styles.reportButtonText}>Report Issue</Text>
            </TouchableOpacity>
          )}
          
          {/* Request Refund Button */}
          {booking.status === 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.refundButton]}
              onPress={() => router.push(`/booking/${bookingId}/refund`)}
              data-testid="request-refund-button"
            >
              <Ionicons name="return-down-back-outline" size={20} color={colors.surface} />
              <Text style={styles.refundButtonText}>Request Refund</Text>
            </TouchableOpacity>
          )}
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
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  textArea: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  cancelModalButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelModalButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  confirmCancelButton: {
    backgroundColor: colors.error,
  },
  confirmCancelButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
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
  cancelButton: {
    backgroundColor: colors.error,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
    reportButton: {
    backgroundColor: colors.warning,
    marginTop: spacing.sm,
  },
  reportButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  refundButton: {
    backgroundColor: colors.info,
    marginTop: spacing.sm,
  },
  refundButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
   contactCard: {
    backgroundColor: colors.primary + '08',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  contactDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactButtonContent: {
    flex: 1,
  },
  contactButtonLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  contactButtonValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
});