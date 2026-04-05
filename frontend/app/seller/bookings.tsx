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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSellerStore } from '../../src/store/sellerStore';
import { useBookingStore } from '../../src/store/bookingStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SellerBookingsScreen() {
  const router = useRouter();
  const { seller } = useSellerStore();
  const { bookings, fetchSellerBookings, loading } = useBookingStore();
  const [refreshing, setRefreshing] = useState(false);

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
        return colors.warning;
      case 'confirmed':
        return colors.success;
      case 'in_progress':
        return colors.primary;
      case 'completed':
        return colors.primary;
      case 'cancelled':
      case 'rejected':
        return colors.error;
      default:
        return colors.textSecondary;
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

  const renderBookingCard = ({ item: booking }: { item: any }) => {
    const serviceImage = booking.service?.images?.[0];
    const serviceName = booking.service?.name || 'Service';

    return (
      <TouchableOpacity
        key={booking.id}
        style={[styles.bookingCard, shadows.sm]}
        onPress={() => router.push(`/seller/booking-detail/${booking.id}` as any)}
        data-testid={`booking-card-${booking.id}`}
      >
        {/* Booking Header */}
        <View style={styles.bookingHeader}>
          <View style={styles.bookingHeaderLeft}>
            <Text style={styles.bookingId}>Booking #{booking.id.slice(0, 8)}</Text>
            <Text style={styles.bookingDate}>{formatDate(booking.booking_date)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking.status?.toUpperCase().replace('_', ' ') || 'PENDING'}
            </Text>
          </View>
        </View>

        {/* Service Preview with Image */}
        <View style={styles.servicePreview}>
          {serviceImage && (
            <Image
              source={{ uri: serviceImage }}
              style={styles.serviceImage}
              defaultSource={require('../../assets/images/placeholder.jpg')}
            />
          )}
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName} numberOfLines={2}>
              {serviceName}
            </Text>
            {booking.service?.duration && (
              <Text style={styles.serviceDuration}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                {' '}{booking.service.duration} mins
              </Text>
            )}
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.bookingBody}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{formatTime(booking.booking_time)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{booking.customer_name || booking.customer?.name || 'N/A'}</Text>
          </View>
          {/* Payment Status Indicator */}
          {booking.payment_method && (
            <View style={[styles.infoRow, styles.paymentRow]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.infoText, { color: colors.success, fontWeight: '600' }]}>Payment Received</Text>
            </View>
          )}
        </View>

        {/* Booking Footer */}
        <View style={styles.bookingFooter}>
          <Text style={styles.bookingAmount}>₹{Number(booking.total_amount || 0).toFixed(2)}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      {bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={80} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySubtitle}>Service bookings from customers will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bookingList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  bookingList: {
    padding: spacing.lg,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bookingHeaderLeft: {
    flex: 1,
  },
  bookingId: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  bookingDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  servicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs / 2,
  },
  serviceDuration: {
    ...typography.caption,
    color: colors.textSecondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingBody: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  paymentRow: {
    backgroundColor: colors.success + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  bookingAmount: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
});
