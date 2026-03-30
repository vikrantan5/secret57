import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>All Bookings</Text>
            <Text style={styles.headerSubtitle}>{stats.totalBookings} total bookings</Text>
          </View>
          <TouchableOpacity onPress={loadBookings} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, shadows.sm]}>
          <Ionicons name="search" size={20} color={colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by booking ID, customer, or service"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
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

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={[colors.primaryVeryLight, colors.primaryLight]}
            style={[styles.statCard, shadows.md]}
          >
            <View style={styles.statIconBox}>
              <Ionicons name="calendar" size={24} color={colors.primaryDark} />
            </View>
            <Text style={styles.statValue}>{stats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#34D39920', '#34D39940']}
            style={[styles.statCard, shadows.md]}
          >
            <View style={[styles.statIconBox, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="cash" size={24} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.success }]}>
              ₹{(stats.totalRevenue / 1000).toFixed(1)}k
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#FBBF2420', '#FBBF2440']}
            style={[styles.statCard, shadows.md]}
          >
            <View style={[styles.statIconBox, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time" size={24} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {stats.pending}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </LinearGradient>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="calendar-outline" size={60} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No bookings found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'No bookings available'}
              </Text>
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
                      <Ionicons 
                        name={booking.status === 'completed' ? 'checkmark-circle' : 
                              booking.status === 'confirmed' ? 'checkmark' : 
                              booking.status === 'cancelled' ? 'close-circle' : 'time'} 
                        size={14} 
                        color={getStatusColor(booking.status)} 
                      />
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
                      <Ionicons name="person" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>{booking.user?.name || 'Unknown Customer'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="business" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>{booking.seller?.company_name || 'Unknown Seller'}</Text>
                    </View>
                    
                    {(booking.service?.title || booking.service?.name) && (
                      <View style={styles.infoRow}>
                        <Ionicons name="briefcase" size={16} color={colors.primary} />
                        <Text style={styles.infoText}>{booking.service?.title || booking.service?.name}</Text>
                      </View>
                    )}
                    
                    {booking.service?.category && (
                      <View style={styles.infoRow}>
                        <Ionicons 
                          name={booking.service.category.icon || 'apps'} 
                          size={16} 
                          color={colors.primary} 
                        />
                        <Text style={styles.infoText}>{booking.service.category.name}</Text>
                      </View>
                    )}
                    
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar" size={16} color={colors.primary} />
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
                        <Ionicons name="time" size={16} color={colors.primary} />
                        <Text style={styles.infoText}>{String(booking.booking_time)}</Text>
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
                </View>
              ))}
            </View>
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.primaryVeryLight,
    marginTop: spacing.xs / 2,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    marginTop: -spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    maxHeight: 50,
  },
  filterTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h3,
    color: colors.primaryDark,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIconBox: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  bookingList: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  bookingId: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  serviceType: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: spacing.xs / 2,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs / 2,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  bookingBody: {
    marginBottom: spacing.md,
    gap: spacing.sm,
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
    borderTopColor: colors.borderLight,
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
});