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
  Platform,  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useServiceStore } from '../../src/store/serviceStore';
import { useBookingStore } from '../../src/store/bookingStore';
import { useAuthStore } from '../../src/store/authStore';
import { usePaymentStore } from '../../src/store/paymentStore';
import { useWishlistStore } from '../../src/store/wishlistStore';
import { useAddressStore } from '../../src/store/addressStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { YouTubePlayerComponent } from '../../src/components/ui/YouTubePlayer';
import CashfreePayment from '../../src/components/CashfreePayment';
import CashfreeService from '../../src/services/cashfreeService';
import { supabase } from '../../src/services/supabase';

const { width } = Dimensions.get('window');

export default function ServiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const serviceId = params.id as string;
  
  const { user } = useAuthStore();
  const { selectedService, loading, fetchServiceById } = useServiceStore();
  const { createBooking } = useBookingStore();
  const { createPayment, updatePaymentStatus } = usePaymentStore();
  const { addresses, getDefaultAddress, fetchUserAddresses } = useAddressStore();
    const { isInWishlist, toggleWishlist, fetchWishlist } = useWishlistStore();
  
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCashfree, setShowCashfree] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState<string>('');
  const [cashfreePaymentUrl, setCashfreePaymentUrl] = useState<string>('');
  const [cashfreeOrderId, setCashfreeOrderId] = useState<string>('');

const [cashfreePaymentSessionId, setCashfreePaymentSessionId] = useState<string>('');

  
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
  if (user?.id) {
      fetchWishlist(user.id);
    }
  }, [serviceId, user?.id]);

  // Load user addresses and auto-fill with default address
  useEffect(() => {
    if (user?.id && showBookingForm) {
      fetchUserAddresses(user.id).then(() => {
        const defaultAddr = getDefaultAddress();
        if (defaultAddr && bookingData.locationType === 'visit_customer') {
          setBookingData(prev => ({
            ...prev,
            address: defaultAddr.address_line1 + (defaultAddr.address_line2 ? `, ${defaultAddr.address_line2}` : ''),
            city: defaultAddr.city,
            state: defaultAddr.state,
            pincode: defaultAddr.pincode,
          }));
        }
      });
    }
  }, [user, showBookingForm, bookingData.locationType]);



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

 // Update the handleBookService function
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
       customer_name: user.name || 'Customer',
      customer_email: user.email || '',
      customer_phone: user.phone || '',
    });

    if (!result.success || !result.booking) {
      throw new Error(result.error || 'Failed to create booking');
    }

    const bookingId = result.booking.id;
    setCurrentBookingId(bookingId);

    console.log('Booking created, ID:', bookingId);

    // Step 2: Create Cashfree order
    const amount = selectedService?.price || 0;
    console.log('Creating Cashfree order for booking, amount:', amount);
    
    if (!user.email || !user.phone) {
      throw new Error('Please update your profile with email and phone number');
    }

    const cashfreeOrderResult = await CashfreeService.createOrder({
      amount: amount,
      currency: 'INR',
      order_note: `Service Booking: ${selectedService?.name}`,
      customer_id: user.id,
      customer_name: user.name || 'Customer',
      customer_email: user.email,
      customer_phone: user.phone,
      return_url: 'https://hybrid-bazaar.preview.emergentagent.com/booking-success',
    });

    console.log('Cashfree order result:', cashfreeOrderResult);

    if (!cashfreeOrderResult.success || !cashfreeOrderResult.data) {
      throw new Error(cashfreeOrderResult.error || 'Failed to create Cashfree order');
    }

    const orderId = cashfreeOrderResult.data.order_id;
    const paymentSessionId = cashfreeOrderResult.data.payment_session_id; // Get session ID
    const paymentUrl = cashfreeOrderResult.data.payment_url;
    
    if (!paymentSessionId) {
      throw new Error('Payment session ID not received from Cashfree');
    }
    
    setCashfreeOrderId(orderId);
    setCashfreePaymentSessionId(paymentSessionId); // Store session ID, not URL
    
    console.log('Cashfree order created successfully:', orderId);
    console.log('Payment Session ID:', paymentSessionId);


      // ✅ FIX: Store Cashfree order ID in Supabase booking IMMEDIATELY
    // This links the internal booking with Cashfree order so webhook can find it
    console.log('Linking Cashfree order to Supabase booking...');
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        cashfree_order_id: orderId,
        payment_method: 'cashfree',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Failed to link Cashfree order to booking:', updateError);
      throw new Error('Failed to link payment gateway. Please try again.');
    }

    console.log('✅ Cashfree order linked to Supabase booking successfully');

    // Step 3: Open Cashfree payment gateway
    setProcessingPayment(false);
    setShowCashfree(true);

  } catch (error: any) {
    console.error('Booking error:', error);
    setProcessingPayment(false);
    Alert.alert('Error', error.message || 'Failed to create booking');
  }
};

   const handlePaymentSuccess = async (paymentId: string, orderId: string) => {
    console.log('Service payment successful - Payment ID:', paymentId, 'Order ID:', orderId);
    setShowCashfree(false);
    setProcessingPayment(true);

    try {
      const amount = selectedService?.price || 0;

      console.log('Payment completed successfully!');

      // Step 1: Create payment record
      console.log('Creating payment record for booking:', currentBookingId);
      const paymentResult = await createPayment({
        booking_id: currentBookingId,
        amount: amount,
        payment_method: 'cashfree',
      });

      if (paymentResult.success && paymentResult.payment) {
        console.log('Payment record created:', paymentResult.payment.id);
        
        // Step 2: Update payment status with Cashfree details
        await updatePaymentStatus(
          paymentResult.payment.id,
          'success',
          {
            cashfree_payment_id: paymentId,
            cashfree_order_id: orderId,
          }
        );
        console.log('Payment status updated to success');

        // Step 3: Auto-confirm booking after successful payment
        const { updateBookingStatus } = require('../../src/store/bookingStore').useBookingStore.getState();
        await updateBookingStatus(currentBookingId, 'confirmed');
        console.log('Booking status updated to confirmed');


        
        // Step 4: Send notifications to admin and seller
        console.log('📧 Sending notifications...');
        try {
          // Get booking details with seller info
          const { data: bookingDetails, error: bookingError } = await supabase
            .from('bookings')
            .select(`
              *,
              service:services(name),
              seller:sellers!inner(
                id,
                company_name,
                user_id
              )
            `)
            .eq('id', currentBookingId)
            .single();

          if (!bookingError && bookingDetails) {
            // Notify Admin
            const { data: adminUsers } = await supabase
              .from('users')
              .select('id')
              .eq('role', 'admin');

            if (adminUsers && adminUsers.length > 0) {
              for (const admin of adminUsers) {
                await supabase.from('notifications').insert({
                  user_id: admin.id,
                  title: '📅 New Service Booking',
                  message: `New booking for ${bookingDetails.service?.name || 'service'}. Amount: ₹${amount}. Date: ${bookingDetails.booking_date}`,
                  type: 'new_booking',
                  reference_id: currentBookingId,
                  reference_type: 'booking',
                  created_at: new Date().toISOString(),
                });
              }
              console.log('✅ Admin notified');
            }

            // Notify Seller
            await supabase.from('notifications').insert({
              user_id: bookingDetails.seller.user_id,
              title: '🎉 New Booking Received!',
              message: `You have a new booking for ${bookingDetails.service?.name || 'service'}. Payment received: ₹${amount}`,
              type: 'new_booking',
              reference_id: currentBookingId,
              reference_type: 'booking',
              created_at: new Date().toISOString(),
            });
            console.log('✅ Seller notified');
          }
        } catch (notifError: any) {
          console.error('❌ Notification error:', notifError);
          // Don't fail the booking
        }

        setProcessingPayment(false);
        setShowBookingForm(false);

        Alert.alert(
          'Booking Confirmed!',
          'Your booking has been confirmed and payment received. The seller will contact you soon.',
          [
            {
              text: 'View Bookings',
              onPress: () => router.push('/(tabs)/bookings'),
            },
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error(paymentResult.error || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('Payment record error:', error);
      setProcessingPayment(false);
      Alert.alert(
        'Payment Verification Error',
        error.message || 'Payment successful but verification failed. Please contact support with your payment ID: ' + paymentId
      );
    }
  };
   const handlePaymentFailure = (error: string) => {
    console.error('Service payment failed:', error);
    setShowCashfree(false);
    setProcessingPayment(false);
    
    // Notify seller about payment cancellation
    if (currentBookingId) {
      notifySellerOfBookingCancellation(currentBookingId);
    }
    
    Alert.alert(
      'Payment Failed',
      error || 'Payment was not successful. Please try again.',
      [
        {
          text: 'Try Again',
          onPress: () => handleBookService(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handlePaymentCancel = () => {
    setShowCashfree(false);
    setProcessingPayment(false);
    
    // Notify seller about payment cancellation
    if (currentBookingId) {
      notifySellerOfBookingCancellation(currentBookingId);
    }
  };

  const notifySellerOfBookingCancellation = async (bookingId: string) => {
    try {
      // Get booking details and seller info
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          id,
          seller_id,
          service_id,
          seller:sellers!inner(
            id,
            company_name,
            user_id
          ),
          service:services(name)
        `)
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        console.error('Failed to fetch booking for notification:', error);
        return;
      }

      // Create notification for seller
      await supabase.from('notifications').insert({
        user_id: booking.seller.user_id,
        title: 'Booking Payment Cancelled',
        message: `Customer cancelled payment for ${booking.service?.name || 'service'} booking. The booking is still pending.`,
        type: 'payment_cancelled',
        reference_id: bookingId,
        reference_type: 'booking',
        created_at: new Date().toISOString(),
      });

      console.log('Sent booking cancellation notification to seller');
    } catch (error) {
      console.error('Error sending booking cancellation notification:', error);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please login to add items to wishlist');
      return;
    }
    await toggleWishlist(serviceId, user.id, 'service');
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
  const inWishlist = isInWishlist(serviceId);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleToggleWishlist}>
            <Ionicons 
              name={inWishlist ? "heart" : "heart-outline"} 
              size={24} 
              color={inWishlist ? colors.error : colors.text} 
            />
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

            {/* Contact Seller Card - Prominent placement */}
          {service.seller?.user && (
            <View style={[styles.contactSellerCard, shadows.md]}>
              <View style={styles.contactSellerHeader}>
                <Ionicons name="chatbubbles" size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.contactSellerTitle}>Have questions?</Text>
                  <Text style={styles.contactSellerSubtitle}>
                    Contact the service provider before booking
                  </Text>
                </View>
              </View>
              <View style={styles.contactButtonsRow}>
                {service.seller.user.phone && (
                  <TouchableOpacity 
                    style={[styles.contactMethodButton, shadows.sm]}
                    onPress={() => {
                      const phoneUrl = `tel:${service.seller.user.phone}`;
                      Alert.alert(
                        'Call Service Provider',
                        `Do you want to call ${service.seller.user.phone}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Call', 
                             onPress: () => Linking.openURL(phoneUrl)
                          }
                        ]
                      );
                    }}
                    data-testid="service-contact-phone-button"
                  >
                    <Ionicons name="call" size={20} color={colors.primary} />
                    <Text style={styles.contactMethodText}>Call</Text>
                  </TouchableOpacity>
                )}
                {service.seller.user.email && (
                  <TouchableOpacity 
                    style={[styles.contactMethodButton, shadows.sm]}
                    onPress={() => {
                      const emailUrl = `mailto:${service.seller.user.email}?subject=Inquiry about ${service.name}`;
                      Alert.alert(
                        'Email Service Provider',
                        `Do you want to send email to ${service.seller.user.email}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Email', 
                            onPress: () => Linking.openURL(emailUrl)
                          }
                        ]
                      );
                    }}
                    data-testid="service-contact-email-button"
                  >
                    <Ionicons name="mail" size={20} color={colors.primary} />
                    <Text style={styles.contactMethodText}>Email</Text>
                  </TouchableOpacity>
                )}
              </View>
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
        {/* Cashfree Payment Modal */}
      {showCashfree && cashfreePaymentSessionId && (
  <CashfreePayment
    visible={showCashfree}
    paymentSessionId={cashfreePaymentSessionId}  // Pass session ID, not URL
    orderId={cashfreeOrderId}
    onSuccess={handlePaymentSuccess}
    onFailure={handlePaymentFailure}
    onCancel={handlePaymentCancel}
  />
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
  contactSellerCard: {
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  contactSellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  contactSellerTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  contactSellerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  contactButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  contactMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  contactMethodText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
