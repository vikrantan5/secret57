import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/services/supabase';

export default function AllBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [searchQuery, selectedFilter, bookings]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          user:users(id, name, email, phone),
  seller:sellers(id, company_name),
  service:services(id, name, category:categories(name, icon))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === selectedFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.id?.toLowerCase().includes(query) ||
        booking.user?.name?.toLowerCase().includes(query) ||
        booking.seller?.company_name?.toLowerCase().includes(query) ||
         booking.service?.name?.toLowerCase().includes(query)
      );
    }

    setFilteredBookings(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'confirmed': return colors.primary;
      case 'pending': return colors.warning;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const calculateStats = () => {
    const totalBookings = bookings.length;
    const totalRevenue = bookings
  .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const pending = bookings.filter(b => b.status === 'pending').length;
    const completed = bookings.filter(b => b.status === 'completed').length;

    return { totalBookings, totalRevenue, pending, completed };
  };

  const stats = calculateStats();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>All Bookings</Text>
        <TouchableOpacity onPress={loadBookings}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by booking ID, customer, or service"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.filterTabActive
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[
              styles.filterTabText,
              selectedFilter === filter && styles.filterTabTextActive
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalBookings}</Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            ₹{(stats.totalRevenue / 1000).toFixed(1)}k
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {stats.pending}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No bookings found</Text>
          </View>
        ) : (
          <View style={styles.bookingList}>
            {filteredBookings.map((booking) => (
  <View key={booking.id} style={[styles.bookingCard, shadows.sm]}>
    <View style={styles.bookingHeader}>
      <View>
        <Text style={styles.bookingId}>#{String(booking.id).slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.serviceType}>
          {booking.service?.title || booking.service?.name || 'Service Booking'}
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
          {booking.status ? String(booking.status).toUpperCase() : 'PENDING'}
        </Text>
      </View>
    </View>

    <View style={styles.bookingBody}>
      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.infoText}>{booking.user?.name || 'Unknown Customer'}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.infoText}>{booking.seller?.company_name || 'Unknown Seller'}</Text>
      </View>
      
      {/* Service Name - Fixed to avoid duplicate */}
      {(booking.service?.title || booking.service?.name) && (
        <View style={styles.infoRow}>
          <Ionicons name="briefcase-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>{booking.service?.title || booking.service?.name}</Text>
        </View>
      )}
      
      {/* Category with icon - Fixed icon handling */}
      {booking.service?.category && (
        <View style={styles.infoRow}>
          <Ionicons 
            name={booking.service.category.icon || 'apps-outline'} 
            size={16} 
            color={colors.textSecondary} 
          />
          <Text style={styles.infoText}>{booking.service.category.name}</Text>
        </View>
      )}
      
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          {new Date(booking.booking_date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </Text>
      </View>
      
      {booking.booking_time && (
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>{String(booking.booking_time)}</Text>
        </View>
      )}
      
      {booking.address && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>{String(booking.address)}</Text>
        </View>
      )}
    </View>

    <View style={styles.bookingFooter}>
      <View>
        <Text style={styles.amountLabel}>Booking Amount</Text>
        <Text style={styles.amountValue}>
          ₹{booking.total_amount ? Number(booking.total_amount).toLocaleString() : '0'}
        </Text>
      </View>
      <View style={[
        styles.paymentBadge,
        { backgroundColor: getStatusColor(booking.payment_status || 'pending') + '20' }
      ]}>
        <Text style={[
          styles.paymentText,
          { color: getStatusColor(booking.payment_status || 'pending') }
        ]}>
          {(booking.payment_status || 'PENDING').toUpperCase()}
        </Text>
      </View>
    </View>

    {booking.notes && (
      <View style={styles.notesContainer}>
        <Text style={styles.notesLabel}>Notes:</Text>
        <Text style={styles.notesText}>{booking.notes}</Text>
      </View>
    )}
  </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.white,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  bookingList: {
    padding: spacing.lg,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bookingId: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  serviceType: {
    ...typography.body,
    color: colors.primary,
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
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  amountValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.xs / 2,
  },
  paymentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  paymentText: {
    ...typography.caption,
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  notesLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  notesText: {
    ...typography.body,
    color: colors.text,
  },
});