import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { useBookingStore, Booking } from '../../src/store/bookingStore';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

type FilterType = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onPress }) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'completed':
        return 'checkmark-done-circle-outline';
      case 'cancelled':
      case 'rejected':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
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

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Time not set';

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

  const statusColor = getStatusColor(booking.status);

  // ✅ FIX: Get service image
  const serviceImage = booking.service?.images?.[0];
  const serviceName = booking.service?.name || 'Service Booking';

  return (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.8}
    >
      {/* Status Timeline Indicator */}
      <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />

      <View style={styles.cardContent}>
        {/* Booking Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Ionicons name={getStatusIcon(booking.status)} size={16} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.bookingId}>#{booking.id.slice(0, 8)}</Text>
        </View>

        {/* ✅ FIX: Service Preview with Image */}
        {serviceImage && (
          <View style={styles.servicePreview}>
            <Image
              source={{ uri: serviceImage }}
              style={styles.serviceImage}
              defaultSource={require('../../assets/images/placeholder.jpg')}
            />
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
        )}

        {/* Service Name (if no image) */}
        {!serviceImage && (
          <Text style={styles.serviceName} numberOfLines={2}>
            {serviceName}
          </Text>
        )}

        {/* Details Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{formatDate(booking.booking_date)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {booking.booking_time ? formatTime(booking.booking_time) : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Location */}
        {booking.address && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {booking.address}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.priceValue}>₹{(booking.total_amount || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.arrowButton}>
            <Ionicons name="arrow-forward" size={20} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { bookings, loading, fetchBookings } = useBookingStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchBookings(user.id);
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user?.id) {
      await fetchBookings(user.id);
    }
    setRefreshing(false);
  };

  const filters = [
    { key: 'all' as FilterType, label: 'All', icon: 'list-outline' },
    { key: 'pending' as FilterType, label: 'Pending', icon: 'time-outline' },
    { key: 'confirmed' as FilterType, label: 'Confirmed', icon: 'checkmark-circle-outline' },
    { key: 'completed' as FilterType, label: 'Completed', icon: 'checkmark-done-outline' },
    { key: 'cancelled' as FilterType, label: 'Cancelled', icon: 'close-circle-outline' },
  ];

  const filteredBookings = bookings.filter((booking) => {
    if (activeFilter === 'all') return true;
    return booking.status === activeFilter;
  });

  const handleFilterPress = (filter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(filter);
  };

  const getFilterColor = (filter: FilterType) => {
    switch (filter) {
      case 'pending':
        return colors.warning;
      case 'confirmed':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Bookings</Text>
            <Text style={styles.subtitle}>
              {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === item.key && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress(item.key)}
            >
              {activeFilter === item.key ? (
                <LinearGradient
                  colors={[getFilterColor(item.key), getFilterColor(item.key) + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterChipGradient}
                >
                  <Ionicons name={item.icon as any} size={18} color={colors.surface} />
                  <Text style={styles.filterChipTextActive}>{item.label}</Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name={item.icon as any} size={18} color={colors.textSecondary} />
                  <Text style={styles.filterChipText}>{item.label}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Bookings List */}
      {loading && bookings.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          title="No bookings found"
          message={
            activeFilter === 'all'
              ? 'Your bookings will appear here once you book a service'
              : `You don't have any ${activeFilter} bookings`
          }
          type="bookings"
        />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard booking={item} onPress={() => router.push(`/booking/${item.id}` as any)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  headerGradient: {
    paddingBottom: spacing.lg,
  },
  header: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.surface,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  filterContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    ...shadows.sm,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  filterChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    ...typography.bodySmall,
    color: colors.surface,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.lg,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
    flexDirection: 'row',
  },
  statusIndicator: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  bookingId: {
    ...typography.caption,
    color: colors.textLight,
  },
  servicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
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
    ...typography.h4,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  serviceDuration: {
    ...typography.caption,
    color: colors.textSecondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
