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
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useBookingStore } from '../../../src/store/bookingStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function SellerBookingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const bookingId = params.id as string;
  
  const { selectedBooking, loading, fetchBookingById, verifyOTP, setSelectedBooking } = useBookingStore();
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // ✅ Fix: Clear stale booking & refetch on id change
  useEffect(() => {
    let active = true;
    if (!bookingId) return;
    console.log('[SellerBookingDetail] Fetching booking for id:', bookingId);
    setHasLoaded(false);
    setSelectedBooking(null);
    fetchBookingById(bookingId).finally(() => {
      if (active) setHasLoaded(true);
    });
    return () => {
      active = false;
    };
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
        return '#f59e0b';
      case 'confirmed':
        return '#6366f1';
      case 'completed':
        return '#10b981';
      case 'cancelled':
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'completed':
        return 'checkmark-done-circle-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
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

  if (!hasLoaded || loading || !selectedBooking || String(selectedBooking.id) !== String(bookingId)) {
    return (
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading booking details...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const booking = selectedBooking;
 const isCancelled = booking.status === 'cancelled';
  const canComplete = booking.status === 'confirmed' && !booking.otp_verified && !isCancelled;
  const statusColor = getStatusColor(booking.status);

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Booking Details</Text>
            <View style={{ width: 40 }} />
          </View>
        </BlurView>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Status Banner */}
          <LinearGradient
            colors={[statusColor, statusColor + 'cc']}
            style={styles.statusBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name={getStatusIcon(booking.status)} size={24} color="#FFFFFF" />
            <Text style={styles.statusBannerText}>
              {booking.status.toUpperCase().replace('_', ' ')}
            </Text>
          </LinearGradient>

          {/* Customer Info */}
          <LinearGradient
            colors={['#1e1e1e', '#161616']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="person-outline" size={20} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>Customer Information</Text>
            </View>
            
                       <View style={styles.infoRow}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.value}>{booking.customer_name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.value}>{booking.customer_phone || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{booking.customer_email || 'N/A'}</Text>
            </View>
          </LinearGradient>


                    {/* Cancellation Details Card - Show when booking is cancelled */}
          {isCancelled && (
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.1)', 'rgba(220, 38, 38, 0.05)']}
              style={[styles.card, { borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </View>
                <Text style={[styles.cardTitle, { color: '#ef4444' }]}>Booking Cancelled</Text>
              </View>
              
              {booking.cancellation_reason && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Cancellation Reason</Text>
                  <Text style={[styles.value, { color: '#f87171' }]}>{booking.cancellation_reason}</Text>
                </View>
              )}
              
              {booking.cancelled_at && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Cancelled On</Text>
                  <Text style={styles.value}>{formatDate(booking.cancelled_at)}</Text>
                </View>
              )}

              {booking.refund_method && (
                <>
                  <View style={styles.divider} />
                  <Text style={[styles.label, { marginBottom: spacing.sm, color: '#f87171' }]}>
                    Refund Details
                  </Text>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Refund Method</Text>
                    <Text style={styles.value}>{booking.refund_method.toUpperCase()}</Text>
                  </View>

                  {booking.refund_upi_id && (
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>UPI ID</Text>
                      <Text style={styles.value}>{booking.refund_upi_id}</Text>
                    </View>
                  )}

                  {booking.refund_account_number && (
                    <>
                      <View style={styles.infoRow}>
                        <Text style={styles.label}>Account Number</Text>
                        <Text style={styles.value}>****{booking.refund_account_number.slice(-4)}</Text>
                      </View>
                      {booking.refund_bank_ifsc && (
                        <View style={styles.infoRow}>
                          <Text style={styles.label}>IFSC Code</Text>
                          <Text style={styles.value}>{booking.refund_bank_ifsc}</Text>
                        </View>
                      )}
                      {booking.refund_bank_name && (
                        <View style={styles.infoRow}>
                          <Text style={styles.label}>Bank Name</Text>
                          <Text style={styles.value}>{booking.refund_bank_name}</Text>
                        </View>
                      )}
                      {booking.refund_account_holder_name && (
                        <View style={styles.infoRow}>
                          <Text style={styles.label}>Account Holder</Text>
                          <Text style={styles.value}>{booking.refund_account_holder_name}</Text>
                        </View>
                      )}
                    </>
                  )}

                  {booking.refund_status && (
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Refund Status</Text>
                      <View style={[
                        styles.paymentBadge,
                        { 
                          backgroundColor: booking.refund_status === 'completed' 
                            ? 'rgba(16, 185, 129, 0.15)' 
                            : 'rgba(245, 158, 11, 0.15)' 
                        }
                      ]}>
                        <View style={[
                          styles.statusDot,
                          { 
                            backgroundColor: booking.refund_status === 'completed' 
                              ? '#10b981' 
                              : '#f59e0b' 
                          }
                        ]} />
                        <Text style={[
                          styles.paymentBadgeText,
                          { 
                            color: booking.refund_status === 'completed' 
                              ? '#10b981' 
                              : '#f59e0b' 
                          }
                        ]}>
                          {booking.refund_status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              <View style={[styles.divider, { marginTop: spacing.md }]} />
              <View style={[styles.infoRow, { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: spacing.sm, borderRadius: borderRadius.md }]}>
                <Ionicons name="information-circle" size={16} color="#ef4444" />
                <Text style={[styles.label, { flex: 1, marginLeft: spacing.sm, color: '#f87171' }]}>
                  This booking has been cancelled. No further actions can be taken.
                </Text>
              </View>
            </LinearGradient>
          )}

          {/* Service Info */}
          <LinearGradient
            colors={['#1e1e1e', '#161616']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="briefcase-outline" size={20} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>Service Details</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Service Name</Text>
              <Text style={styles.value}>{booking.service?.name || 'N/A'}</Text>
            </View>
            {booking.service?.duration && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Duration</Text>
                <Text style={styles.value}>{booking.service.duration} minutes</Text>
              </View>
            )}
            {booking.service?.price && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Service Price</Text>
                <Text style={styles.value}>₹{booking.service.price.toFixed(2)}</Text>
              </View>
            )}
          </LinearGradient>

          {/* Booking Details */}
          <LinearGradient
            colors={['#1e1e1e', '#161616']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="calendar-outline" size={20} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>Booking Details</Text>
            </View>
            
            <View style={styles.detailRow}>
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                style={styles.detailIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="calendar" size={20} color="#a78bfa" />
              </LinearGradient>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDate(booking.booking_date)}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                style={styles.detailIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="time" size={20} color="#a78bfa" />
              </LinearGradient>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{formatTime(booking.booking_time)}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                style={styles.detailIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="location" size={20} color="#a78bfa" />
              </LinearGradient>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location Type</Text>
                <Text style={styles.detailValue}>
                  {booking.location_type === 'visit_customer'
                    ? '🏠 Visit Customer Location'
                    : '📍 Customer Visits You'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Address (if visit_customer) */}
          {booking.location_type === 'visit_customer' && booking.address && (
            <LinearGradient
              colors={['#1e1e1e', '#161616']}
              style={styles.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="home-outline" size={20} color="#a78bfa" />
                </View>
                <Text style={styles.cardTitle}>Service Address</Text>
              </View>
              <Text style={styles.address}>{booking.address}</Text>
              <Text style={styles.address}>
                {booking.city}, {booking.state} - {booking.pincode}
              </Text>
            </LinearGradient>
          )}

          {/* Notes */}
          {booking.notes && (
            <LinearGradient
              colors={['#1e1e1e', '#161616']}
              style={styles.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="document-text-outline" size={20} color="#a78bfa" />
                </View>
                <Text style={styles.cardTitle}>Customer Notes</Text>
              </View>
              <Text style={styles.notes}>{booking.notes}</Text>
            </LinearGradient>
          )}

          {/* Payment Info */}
          <LinearGradient
            colors={['#1e1e1e', '#161616']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="wallet-outline" size={20} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>Payment Details</Text>
            </View>
            
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Total Amount</Text>
              <Text style={styles.paymentValue}>₹{booking.total_amount?.toFixed(2) || '0.00'}</Text>
            </View>
            
            {booking.payment_method && (
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
                style={styles.paymentStatusRow}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.paymentStatusText}>Payment Received</Text>
              </LinearGradient>
            )}
          </LinearGradient>

          {/* OTP Verified Badge */}
          {booking.otp_verified && (
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
              style={styles.verifiedCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-done-circle" size={32} color="#10b981" />
                <View style={styles.verifiedContent}>
                  <Text style={[styles.cardTitle, { color: '#10b981' }]}>Service Completed</Text>
                  <Text style={styles.verifiedText}>
                    OTP verified successfully. Payment has been processed.
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Complete Service Button */}
          {canComplete && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => setShowOTPModal(true)}
                activeOpacity={0.8}
                data-testid="complete-service-button"
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.completeButtonText}>Complete Service</Text>
                </LinearGradient>
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
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowOTPModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.modalContent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="key" size={32} color="#a78bfa" />
                  </View>
                  <Text style={styles.modalTitle}>Enter Service OTP</Text>
                  <Text style={styles.modalDescription}>
                    Ask the customer for the 6-digit OTP shown on their booking page to verify service completion.
                  </Text>
                </View>

                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#6b7280"
                  value={otpInput}
                  onChangeText={(text) => setOtpInput(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  data-testid="otp-input-field"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowOTPModal(false);
                      setOtpInput('');
                    }}
                    disabled={verifying}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.verifyButton, otpInput.length !== 6 && styles.disabledButton]}
                    onPress={handleVerifyOTP}
                    disabled={verifying || otpInput.length !== 6}
                    data-testid="verify-otp-button"
                  >
                    <LinearGradient
                      colors={otpInput.length === 6 ? ['#10b981', '#059669'] : ['#374151', '#374151']}
                      style={styles.confirmGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {verifying ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.verifyButtonText}>Verify & Complete</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: spacing.md,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    width: '35%',
  },
  value: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  address: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  notes: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 22,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#a78bfa',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  verifiedCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  verifiedContent: {
    flex: 1,
  },
  verifiedText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
    lineHeight: 18,
  },
  actionButtons: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  completeButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  completeButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: width - spacing.xl * 2,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  modalDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '600',
  },
  verifyButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  confirmGradient: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});