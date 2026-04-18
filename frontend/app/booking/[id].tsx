// app/booking/[id].tsx
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
  Platform,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useBookingStore } from '../../src/store/bookingStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function BookingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bookingId = params.id;
  
  const { selectedBooking, loading, fetchBookingById, cancelBooking } = useBookingStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Fix: Reset animation values on mount and add proper cleanup
  useEffect(() => {
    // Reset animation values before starting
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    scaleAnim.setValue(0.95);
    
    // Add small delay to ensure component is mounted
    const timer = setTimeout(() => {
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
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []); // Empty dependency array - runs once on mount

  useEffect(() => {
    if (bookingId) {
      fetchBookingById(bookingId);
    }
  }, [bookingId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return ['#F59E0B', '#D97706'];
      case 'confirmed':
        return ['#8B5CF6', '#7C3AED'];
      case 'in_progress':
        return ['#3B82F6', '#2563EB'];
      case 'completed':
        return ['#10B981', '#059669'];
      case 'cancelled':
      case 'rejected':
        return ['#EF4444', '#DC2626'];
      default:
        return ['#6B7280', '#4B5563'];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'in_progress':
        return 'play-circle-outline';
      case 'completed':
        return 'checkmark-done-circle-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const handleCancelBooking = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    if (!cancellationReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    const result = await cancelBooking(bookingId, cancellationReason);
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', result.error || 'Failed to cancel booking');
    }
  };

  // Fix: Add safe navigation for optional chaining
  if (loading || !selectedBooking) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F3F4F6', '#E5E7EB']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const booking = selectedBooking;
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const statusGradient = getStatusColor(booking.status);
  const statusIcon = getStatusIcon(booking.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Gradient Header */}
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
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Premium Status Banner */}
        <LinearGradient
          colors={statusGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.statusBanner}
        >
          <Ionicons name={statusIcon} size={24} color="#FFFFFF" />
          <Text style={styles.statusBannerText}>
            {booking.status?.toUpperCase() || 'UNKNOWN'}
          </Text>
        </LinearGradient>

        {/* Service Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.cardIcon}
            >
              <Ionicons name="briefcase-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Service Information</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Service</Text>
            <Text style={styles.value}>{booking.service?.name || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Provider</Text>
            <Text style={styles.value}>{booking.seller?.company_name || 'N/A'}</Text>
          </View>
          
          {booking.service?.duration && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={12} color="#10B981" />
                <Text style={styles.durationText}>{booking.service.duration} minutes</Text>
              </View>
            </View>
          )}
        </View>

        {/* Contact Seller Card */}
        {booking.payment_method && (booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'in_progress') && (
          <View style={[styles.card, styles.contactCard]}>
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.cardIcon}
              >
                <Ionicons name="chatbubbles-outline" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.cardTitle}>Contact Provider</Text>
            </View>
            
            <Text style={styles.contactDescription}>
              Reach out to the service provider for any queries or coordination
            </Text>
            
            {booking.seller?.user?.phone && (
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const phoneUrl = `tel:${booking.seller.user.phone}`;
                  Alert.alert(
                    'Call Provider',
                    `Do you want to call ${booking.seller.user.phone}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Call', onPress: () => Linking.openURL(phoneUrl) }
                    ]
                  );
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.contactButtonGradient}
                >
                  <Ionicons name="call-outline" size={20} color="#8B5CF6" />
                  <View style={styles.contactButtonContent}>
                    <Text style={styles.contactButtonLabel}>Phone</Text>
                    <Text style={styles.contactButtonValue}>{booking.seller.user.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            {booking.seller?.user?.email && (
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const emailUrl = `mailto:${booking.seller.user.email}?subject=Regarding Booking ${booking.id?.slice(0, 8)}`;
                  Alert.alert(
                    'Email Provider',
                    `Do you want to send email to ${booking.seller.user.email}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Email', onPress: () => Linking.openURL(emailUrl) }
                    ]
                  );
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.contactButtonGradient}
                >
                  <Ionicons name="mail-outline" size={20} color="#8B5CF6" />
                  <View style={styles.contactButtonContent}>
                    <Text style={styles.contactButtonLabel}>Email</Text>
                    <Text style={styles.contactButtonValue}>{booking.seller.user.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Booking Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.cardIcon}
            >
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Booking Details</Text>
          </View>
          
          <View style={styles.detailItem}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.detailIcon}
            >
              <Ionicons name="calendar" size={18} color="#8B5CF6" />
            </LinearGradient>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(booking.booking_date)}</Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.detailIcon}
            >
              <Ionicons name="time" size={18} color="#8B5CF6" />
            </LinearGradient>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{formatTime(booking.booking_time)}</Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.detailIcon}
            >
              <Ionicons name="location" size={18} color="#8B5CF6" />
            </LinearGradient>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {booking.location_type === 'visit_customer'
                  ? '🏠 Provider will visit you'
                  : '📍 You will visit provider'}
              </Text>
            </View>
          </View>
        </View>

        {/* OTP Card - Fix: Add safe check for payment_method */}
        {booking.payment_method && booking.otp && booking.status !== 'completed' && booking.status !== 'cancelled' && (
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.otpCard}
          >
            <View style={styles.otpHeader}>
              <Ionicons name="key-outline" size={28} color="#FFFFFF" />
              <Text style={styles.otpTitle}>Verification OTP</Text>
            </View>
            
            <Text style={styles.otpDescription}>
              Share this OTP with the service provider when they complete the service
            </Text>
            
            <View style={styles.otpContainer}>
              <Text style={styles.otpText}>{booking.otp}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.copyOtpButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert('OTP Copied', 'OTP has been copied to clipboard');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.copyOtpGradient}
              >
                <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                <Text style={styles.copyOtpText}>Copy OTP</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Address Card - Fix: Add safe check for address fields */}
        {booking.location_type === 'visit_customer' && booking.address && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.cardIcon}
              >
                <Ionicons name="location-outline" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.cardTitle}>Service Address</Text>
            </View>
            
            <Text style={styles.address}>{booking.address}</Text>
            {booking.city && booking.state && booking.pincode && (
              <Text style={styles.address}>
                {booking.city}, {booking.state} - {booking.pincode}
              </Text>
            )}
          </View>
        )}

        {/* Payment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.cardIcon}
            >
              <Ionicons name="card-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Payment Details</Text>
          </View>
          
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total Amount</Text>
            <Text style={styles.paymentValue}>₹{(booking.total_amount || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {canCancel && !showCancelModal && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowCancelModal(true);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cancelButtonGradient}
              >
                <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: spacing.xxl || 40 }} />
      </Animated.ScrollView>

      {/* Cancel Modal */}
      {showCancelModal && (
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.modalIcon}
              >
                <Ionicons name="alert-circle-outline" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.modalTitle}>Cancel Booking</Text>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Please provide a reason for cancellation:
            </Text>
            
            <TextInput
              style={styles.textArea}
              placeholder="Enter reason..."
              placeholderTextColor="#9CA3AF"
              value={cancellationReason}
              onChangeText={setCancellationReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancellationReason('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Go Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCancelBooking}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.modalConfirmGradient}
                >
                  <Text style={styles.modalConfirmText}>Confirm Cancellation</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    paddingBottom: 20,
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
  headerRight: {
    width: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
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
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
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
    width: 28,
    height: 28,
    borderRadius: 14,
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
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98115',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  contactCard: {
    borderWidth: 1,
    borderColor: '#8B5CF620',
  },
  contactDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  contactButton: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  contactButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  contactButtonContent: {
    flex: 1,
  },
  contactButtonLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  contactButtonValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  address: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 20,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  otpCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  otpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  otpDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  otpContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
  },
  otpText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  copyOtpButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  copyOtpGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  copyOtpText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  cancelButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cancelButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: spacing.md,
  },
  textArea: {
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});