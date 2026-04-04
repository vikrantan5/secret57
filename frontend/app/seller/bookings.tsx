import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
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
        return colors.warning;
      case 'confirmed':
        return colors.success;
      case 'completed':
        return colors.primary;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySubtitle}>
              Service bookings from customers will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.bookingList}>
            {bookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={[styles.bookingCard, shadows.sm]}
                onPress={() => router.push(`/booking/${booking.id}` as any)}
              >
                <View style={styles.bookingHeader}>
                  <View>
                    <Text style={styles.bookingId}>Booking #{booking.id.slice(0, 8)}</Text>
                    <Text style={styles.bookingDate}>
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(booking.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(booking.status) }
                    ]}>
                      {booking.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingBody}>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{booking.booking_time || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{booking.customer_name || 'N/A'}</Text>
                  </View>
                     {/* Payment Status Indicator */}
                  {booking.payment_method && (
                    <View style={[styles.infoRow, styles.paymentRow]}>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={16} 
                        color={colors.success} 
                      />
                      <Text style={[styles.infoText, { color: colors.success, fontWeight: '600' }]}>
                        Payment Received
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.bookingFooter}>
                  <Text style={styles.serviceType}>
                    Service: {booking.service_type || 'Standard'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
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
  serviceType: {
    ...typography.body,
    color: colors.text,
  },
});