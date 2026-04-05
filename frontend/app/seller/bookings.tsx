import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
   ScrollView, // Add this import
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSellerStore } from '../../src/store/sellerStore';
import { useBookingStore } from '../../src/store/bookingStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function SellerBookingsScreen() {
  const router = useRouter();
  const { seller } = useSellerStore();
  const { bookings, fetchSellerBookings, loading } = useBookingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    if (seller?.id) {
      loadBookings();
    }
  }, [seller?.id]);

  const loadBookings = async () => {
    if (seller?.id) {
      await fetchSellerBookings(seller.id);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_payment':
        return '#f59e0b';
      case 'confirmed':
        return '#10b981';
      case 'in_progress':
        return '#6366f1';
      case 'completed':
        return '#8b5cf6';
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
      case 'pending_payment':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'in_progress':
        return 'refresh-circle-outline';
      case 'completed':
        return 'checkmark-done-circle-outline';
      case 'cancelled':
      case 'rejected':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const getFilteredBookings = () => {
    if (filter === 'all') return bookings;
    return bookings.filter(booking => booking.status === filter);
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return bookings.length;
    return bookings.filter(booking => booking.status === status).length;
  };

  const renderFilterChip = (label: string, value: string) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        filter === value && styles.filterChipActive
      ]}
      onPress={() => setFilter(value as any)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.filterChipText,
        filter === value && styles.filterChipTextActive
      ]}>
        {label}
      </Text>
      <View style={styles.filterChipBadge}>
        <Text style={styles.filterChipBadgeText}>
          {getStatusCount(value)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderBookingCard = ({ item: booking }: { item: any }) => {
    const serviceImage = booking.service?.images?.[0];
    const serviceName = booking.service?.name || 'Service';
    const statusColor = getStatusColor(booking.status);

    return (
      <TouchableOpacity
        key={booking.id}
        activeOpacity={0.9}
        onPress={() => router.push(`/seller/booking-detail/${booking.id}` as any)}
        data-testid={`booking-card-${booking.id}`}
      >
        <LinearGradient
          colors={['#1e1e1e', '#161616']}
          style={styles.bookingCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Booking Header */}
          <View style={styles.bookingHeader}>
            <View style={styles.bookingHeaderLeft}>
              <View style={styles.bookingIdContainer}>
                <Ionicons name="bookmark-outline" size={14} color="#a78bfa" />
                <Text style={styles.bookingId}>Booking #{booking.id.slice(0, 8)}</Text>
              </View>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                <Text style={styles.bookingDate}>{formatDate(booking.booking_date)}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Ionicons name={getStatusIcon(booking.status)} size={12} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {booking.status?.toUpperCase().replace('_', ' ') || 'PENDING'}
              </Text>
            </View>
          </View>

          {/* Service Preview with Image */}
          <View style={styles.servicePreview}>
            {serviceImage ? (
              <Image
                source={{ uri: serviceImage }}
                style={styles.serviceImage}
                defaultSource={require('../../assets/images/placeholder.jpg')}
              />
            ) : (
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.serviceImagePlaceholder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="briefcase-outline" size={24} color="#FFFFFF" />
              </LinearGradient>
            )}
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={2}>
                {serviceName}
              </Text>
              {booking.service?.duration && (
                <View style={styles.serviceDuration}>
                  <Ionicons name="time-outline" size={14} color="#6b7280" />
                  <Text style={styles.serviceDurationText}>{booking.service.duration} mins</Text>
                </View>
              )}
            </View>
            <View style={styles.servicePrice}>
              <Text style={styles.servicePriceValue}>
                ₹{Number(booking.total_amount || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Booking Details */}
          <View style={styles.bookingBody}>
            <View style={styles.infoRow}>
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                style={styles.infoIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="time-outline" size={14} color="#a78bfa" />
              </LinearGradient>
              <Text style={styles.infoText}>{formatTime(booking.booking_time)}</Text>
            </View>
            <View style={styles.infoRow}>
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                style={styles.infoIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person-outline" size={14} color="#a78bfa" />
              </LinearGradient>
              <Text style={styles.infoText}>{booking.customer_name || booking.customer?.name || 'N/A'}</Text>
            </View>
            
            {/* Payment Status Indicator */}
            {booking.payment_method && (
              <View style={styles.paymentRow}>
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
                  style={styles.paymentBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                  <Text style={styles.paymentText}>Payment Received</Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Booking Footer */}
          <View style={styles.bookingFooter}>
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => router.push(`/seller/booking-detail/${booking.id}` as any)}
            >
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Ionicons name="arrow-forward" size={14} color="#a78bfa" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const filteredBookings = getFilteredBookings();

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
            <Text style={styles.title}>Bookings</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton} activeOpacity={0.7}>
              <Ionicons name="refresh" size={22} color="#a78bfa" />
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {renderFilterChip('All', 'all')}
            {renderFilterChip('Pending', 'pending')}
            {renderFilterChip('Confirmed', 'confirmed')}
            {renderFilterChip('Completed', 'completed')}
            {renderFilterChip('Cancelled', 'cancelled')}
          </ScrollView>
        </View>

        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#1a1a1a', '#0a0a0a']}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="calendar-outline" size={80} color="#6366f1" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all' 
                ? 'Service bookings from customers will appear here'
                : `No ${filter} bookings found`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredBookings}
            renderItem={renderBookingCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.bookingList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#6366f1"
                colors={['#6366f1']}
              />
            }
          />
        )}
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  filterContainer: {
    marginTop: 100,
    marginBottom: spacing.md,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.full,
  },
  filterChipBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  bookingList: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  bookingCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bookingHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  bookingIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingId: {
    fontSize: 14,
    color: '#a78bfa',
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  servicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
  },
  serviceImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDurationText: {
    fontSize: 11,
    color: '#6b7280',
  },
  servicePrice: {
    alignItems: 'flex-end',
  },
  servicePriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#a78bfa',
  },
  bookingBody: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  paymentRow: {
    marginTop: spacing.xs,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  paymentText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: borderRadius.md,
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#a78bfa',
    fontWeight: '600',
  },
});