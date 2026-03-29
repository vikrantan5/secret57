import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useServiceStore } from '../../src/store/serviceStore';
import { useBookingStore } from '../../src/store/bookingStore';
import { useAuthStore } from '../../src/store/authStore';
import { usePaymentStore } from '../../src/store/paymentStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { YouTubePlayerComponent } from '../../src/components/ui/YouTubePlayer';
import RazorpayService from '../../src/services/razorpay';

const { width } = Dimensions.get('window');

export default function ServiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const serviceId = params.id as string;
  
  const { user } = useAuthStore();
  const { selectedService, loading, fetchServiceById } = useServiceStore();
  const { createBooking } = useBookingStore();
  const { createPayment, updatePaymentStatus } = usePaymentStore();
  
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    locationType: 'visit_customer' as 'visit_customer' | 'customer_visits',
    address: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
  });
  const [activeImageIndex, setActiveImageIndex] = useState(0);
 const [activeTab, setActiveTab] = useState<'details' | 'video'>('details');
   
  // Date/Time picker states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (serviceId) {
      fetchServiceById(serviceId);
    }
  }, [serviceId]);



   const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      setBookingData({ ...bookingData, date: formattedDate });
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
      const hours = String(time.getHours()).padStart(2, '0');
      const minutes = String(time.getMinutes()).padStart(2, '0');
      setBookingData({ ...bookingData, time: `${hours}:${minutes}` });
    }
  };

  const handleBookService = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please login to book a service');
      router.push('/auth/login');
      return;
    }

    if (!bookingData.date || !bookingData.time) {
      Alert.alert('Error', 'Please select date and time');
      return;
    }

    if (bookingData.locationType === 'visit_customer') {
      if (!bookingData.address || !bookingData.city || !bookingData.state || !bookingData.pincode) {
        Alert.alert('Error', 'Please provide complete address');
        return;
      }
    }

    setProcessingPayment(true);

    try {
      // Step 1: Create booking
      const result = await createBooking({
        customer_id: user.id,
        seller_id: selectedService?.seller_id,
        service_id: serviceId,
        booking_date: bookingData.date,
        booking_time: bookingData.time,
        location_type: bookingData.locationType,
        address: bookingData.locationType === 'visit_customer' ? bookingData.address : null,
        city: bookingData.locationType === 'visit_customer' ? bookingData.city : null,
        state: bookingData.locationType === 'visit_customer' ? bookingData.state : null,
        pincode: bookingData.locationType === 'visit_customer' ? bookingData.pincode : null,
        notes: bookingData.notes || null,
        total_amount: selectedService?.price || 0,
      });

      if (!result.success || !result.booking) {
        throw new Error(result.error || 'Failed to create booking');
      }

      const bookingId = result.booking.id;

      // Step 2: Process payment
      const amount = selectedService?.price || 0;
      
      RazorpayService.openCheckout(
        {
          amount: Math.round(amount * 100), // Convert to paise
          currency: 'INR',
          name: 'ServiceHub',
          description: selectedService?.name || 'Service Booking',
          order_id: bookingId,
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone,
          },
          theme: {
            color: colors.primary,
          },
        },
        async (response) => {
          // Payment successful
          try {
            // Create payment record
            const paymentResult = await createPayment({
              booking_id: bookingId,
              amount: amount,
              payment_method: 'razorpay',
            });

                    if (paymentResult.success && paymentResult.payment) {
              // Update payment status
              await updatePaymentStatus(
                paymentResult.payment.id,
                'success',
                response
              );

              // Auto-confirm booking after successful payment
              const { updateBookingStatus } = require('../../src/store/bookingStore').useBookingStore.getState();
              await updateBookingStatus(bookingId, 'confirmed');

              setProcessingPayment(false);
              setShowBookingForm(false);

              Alert.alert(
                'Booking Confirmed!',
                'Your booking has been confirmed and payment received. The seller will contact you soon.',
                [
                  {
                    text: 'View Booking',
                    onPress: () => router.push('/(tabs)/bookings'),
                  },
                  {
                    text: 'OK',
                  },
                ]
              );
            }
          } catch (error: any) {
            console.error('Payment record error:', error);
            setProcessingPayment(false);
            Alert.alert('Error', 'Payment successful but failed to update booking. Please contact support.');
          }
        },
        (error) => {
          // Payment failed
          console.error('Payment failed:', error);
          setProcessingPayment(false);
          Alert.alert('Payment Failed', error.error || 'Payment was not successful. Please try again.');
        }
      );
    } catch (error: any) {
      console.error('Booking error:', error);
      setProcessingPayment(false);
      Alert.alert('Error', error.message || 'Failed to create booking');
    }
  };

  if (loading || !selectedService) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const service = selectedService;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="heart-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Image Gallery */}
        {service.images && service.images.length > 0 && (
          <View style={styles.imageGallery}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(index);
              }}
            >
              {service.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={styles.serviceImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {service.images.length > 1 && (
              <View style={styles.indicators}>
                {service.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      index === activeImageIndex && styles.activeIndicator,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Service Info */}
        <View style={styles.content}>
          <Text style={styles.serviceName}>{service.name}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{service.price.toFixed(2)}</Text>
            {service.duration && (
              <Text style={styles.duration}>• {service.duration} mins</Text>
            )}
          </View>

          {/* Location Type */}
          <View style={styles.locationTypeContainer}>
            {(service.location_type === 'visit_customer' || service.location_type === 'both') && (
              <View style={styles.locationBadge}>
                <Ionicons name="home" size={16} color={colors.primary} />
                <Text style={styles.locationBadgeText}>Visits your location</Text>
              </View>
            )}
            {(service.location_type === 'customer_visits' || service.location_type === 'both') && (
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={styles.locationBadgeText}>At provider location</Text>
              </View>
            )}
          </View>

          {/* Seller Info */}
          {service.seller && (
            <View style={styles.sellerCard}>
              <View style={styles.sellerInfo}>
                <Ionicons name="storefront" size={20} color={colors.primary} />
                <View style={styles.sellerDetails}>
                  <Text style={styles.sellerLabel}>Service by</Text>
                  <Text style={styles.sellerName}>{service.seller.company_name}</Text>
                </View>
              </View>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Tabs - Show only if video exists */}
          {service.video_url && (
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'details' && styles.tabActive]}
                onPress={() => setActiveTab('details')}
              >
                <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
                  Details
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'video' && styles.tabActive]}
                onPress={() => setActiveTab('video')}
              >
                <Ionicons 
                  name="play-circle" 
                  size={18} 
                  color={activeTab === 'video' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[styles.tabText, activeTab === 'video' && styles.tabTextActive]}>
                  Video
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tab Content */}
          {activeTab === 'details' ? (
            <>
              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{service.description}</Text>
              </View>
            </>
          ) : (
            <>
              {/* Video Player */}
              {service.video_url && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Service Video</Text>
                  <YouTubePlayerComponent videoUrl={service.video_url} height={220} />
                </View>
              )}
            </>
          )}

          {/* Description (if no video, show without tabs) */}
          {!service.video_url && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{service.description}</Text>
            </View>
          )}

          {/* Booking Form */}
          {showBookingForm && (
            <View style={[styles.bookingForm, shadows.md]}>
              <Text style={styles.formTitle}>Book This Service</Text>

                           {/* Date Input */}
              <Text style={styles.inputLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.datePickerText}>
                  {bookingData.date || 'Select date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}

              {/* Time Input */}
              <Text style={styles.inputLabel}>Time *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={styles.datePickerText}>
                  {bookingData.time || 'Select time'}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              )}

              {/* Location Type */}
              {service.location_type === 'both' && (
                <>
                  <Text style={styles.inputLabel}>Where? *</Text>
                  <View style={styles.locationOptions}>
                    <TouchableOpacity
                      style={[
                        styles.locationOption,
                        bookingData.locationType === 'visit_customer' && styles.locationOptionActive,
                      ]}
                      onPress={() => setBookingData({ ...bookingData, locationType: 'visit_customer' })}
                    >
                      <Ionicons
                        name="home"
                        size={20}
                        color={bookingData.locationType === 'visit_customer' ? colors.surface : colors.text}
                      />
                      <Text
                        style={[
                          styles.locationOptionText,
                          bookingData.locationType === 'visit_customer' && styles.locationOptionTextActive,
                        ]}
                      >
                        Visit Me
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.locationOption,
                        bookingData.locationType === 'customer_visits' && styles.locationOptionActive,
                      ]}
                      onPress={() => setBookingData({ ...bookingData, locationType: 'customer_visits' })}
                    >
                      <Ionicons
                        name="location"
                        size={20}
                        color={bookingData.locationType === 'customer_visits' ? colors.surface : colors.text}
                      />
                      <Text
                        style={[
                          styles.locationOptionText,
                          bookingData.locationType === 'customer_visits' && styles.locationOptionTextActive,
                        ]}
                      >
                        I'll Visit
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Address Fields (if visit_customer) */}
              {bookingData.locationType === 'visit_customer' && (
                <>
                  <Text style={styles.inputLabel}>Address *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Complete address"
                    placeholderTextColor={colors.textSecondary}
                    value={bookingData.address}
                    onChangeText={(text) => setBookingData({ ...bookingData, address: text })}
                    multiline
                    numberOfLines={3}
                  />

                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <Text style={styles.inputLabel}>City *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="City"
                        placeholderTextColor={colors.textSecondary}
                        value={bookingData.city}
                        onChangeText={(text) => setBookingData({ ...bookingData, city: text })}
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={styles.inputLabel}>State *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="State"
                        placeholderTextColor={colors.textSecondary}
                        value={bookingData.state}
                        onChangeText={(text) => setBookingData({ ...bookingData, state: text })}
                      />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Pincode *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pincode"
                    placeholderTextColor={colors.textSecondary}
                    value={bookingData.pincode}
                    onChangeText={(text) => setBookingData({ ...bookingData, pincode: text })}
                    keyboardType="number-pad"
                  />
                </>
              )}

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special instructions..."
                placeholderTextColor={colors.textSecondary}
                value={bookingData.notes}
                onChangeText={(text) => setBookingData({ ...bookingData, notes: text })}
                multiline
                numberOfLines={3}
              />

              {/* Form Actions */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={() => setShowBookingForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.confirmButton]}
                  onPress={handleBookService}
                  data-testid="confirm-booking-button"
                >
                  <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Book Button */}
      {!showBookingForm && (
        <View style={styles.bottomBar}>
          <View style={styles.priceContainer}>
            <Text style={styles.bottomPrice}>₹{service.price.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => setShowBookingForm(true)}
            data-testid="book-service-button"
          >
            <Ionicons name="calendar" size={20} color={colors.surface} />
            <Text style={styles.bookButtonText}>Book Service</Text>
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  imageGallery: {
    position: 'relative',
  },
  serviceImage: {
    width: width,
    height: width,
  },
  indicators: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface + '60',
  },
  activeIndicator: {
    backgroundColor: colors.surface,
    width: 24,
  },
  content: {
    padding: spacing.lg,
  },
  serviceName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  price: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  duration: {
    ...typography.body,
    color: colors.textSecondary,
  },
  locationTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.full,
  },
  locationBadgeText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sellerDetails: {
    gap: spacing.xs,
  },
  sellerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sellerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bookingForm: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  locationOptions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  locationOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  locationOptionText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  locationOptionTextActive: {
    color: colors.surface,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  formButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  priceContainer: {
    flex: 1,
  },
  bottomPrice: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  bookButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePickerText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
    tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.background,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
});
