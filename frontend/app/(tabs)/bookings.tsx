import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/store/authStore';
import { useBookingStore, Booking } from '../../src/store/bookingStore';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');
type FilterType = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  index: number;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'confirmed':
        return '#8B5CF6';
      case 'completed':
        return '#10B981';
      case 'cancelled':
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'pending':
        return ['#FEF3C7', '#FDE68A'];
      case 'confirmed':
        return ['#E0E7FF', '#C7D2FE'];
      case 'completed':
        return ['#D1FAE5', '#A7F3D0'];
      case 'cancelled':
        return ['#FEE2E2', '#FECACA'];
      default:
        return ['#F3F4F6', '#E5E7EB'];
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
  const statusGradient = getStatusGradient(booking.status);
  const serviceImage = booking.service?.images?.[0];
  const serviceName = booking.service?.name || 'Service Booking';

  return (
    <Animated.View
      style={[
        styles.bookingCardWrapper,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.95}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F9FAFB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bookingCard}
        >
          {/* Premium Status Bar */}
          <LinearGradient
            colors={[statusColor, statusColor + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statusBar}
          >
            <View style={styles.statusBarContent}>
              <Ionicons name={getStatusIcon(booking.status)} size={14} color="#FFFFFF" />
              <Text style={styles.statusBarText}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Text>
            </View>
            <Text style={styles.bookingIdText}>#{booking.id.slice(0, 8)}</Text>
          </LinearGradient>

          <View style={styles.cardContent}>
            {/* Service Image & Info */}
            <View style={styles.serviceSection}>
              {serviceImage ? (
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: serviceImage }}
                    style={styles.serviceImage}
                    defaultSource={require('../../assets/images/placeholder.jpg')}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                    style={styles.imageOverlay}
                  />
                </View>
              ) : (
                <LinearGradient
                  colors={['#E0E7FF', '#C7D2FE']}
                  style={styles.imagePlaceholder}
                >
                  <Ionicons name="briefcase-outline" size={32} color="#8B5CF6" />
                </LinearGradient>
              )}

              <View style={styles.serviceDetails}>
                <Text style={styles.serviceName} numberOfLines={2}>
                  {serviceName}
                </Text>
                {booking.service?.duration && (
                  <View style={styles.durationBadge}>
                    <Ionicons name="time-outline" size={12} color="#8B5CF6" />
                    <Text style={styles.durationText}>{booking.service.duration} mins</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Date & Time Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.infoIconBg}
                >
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                </LinearGradient>
                <Text style={styles.infoText}>{formatDate(booking.booking_date)}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.infoIconBg}
                >
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                </LinearGradient>
                <Text style={styles.infoText}>
                  {booking.booking_time ? formatTime(booking.booking_time) : 'N/A'}
                </Text>
              </View>
            </View>

            {/* Location */}
            {booking.address && (
              <View style={styles.locationContainer}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.locationIconBg}
                >
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                </LinearGradient>
                <Text style={styles.locationText} numberOfLines={1}>
                  {booking.address}
                </Text>
              </View>
            )}

            {/* Footer with Price and Action */}
            <View style={styles.cardFooter}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Total Amount</Text>
                <LinearGradient
                  colors={['#1E1B4B', '#312E81']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.priceGradient}
                >
                  <Text style={styles.priceValue}>₹{(booking.total_amount || 0).toFixed(2)}</Text>
                </LinearGradient>
              </View>
              <TouchableOpacity style={styles.detailsButton}>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.detailsButtonGradient}
                >
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { bookings, loading, fetchBookings } = useBookingStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

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
    { key: 'all' as FilterType, label: 'All', icon: 'apps-outline', color: '#8B5CF6' },
    { key: 'pending' as FilterType, label: 'Pending', icon: 'time-outline', color: '#F59E0B' },
    { key: 'confirmed' as FilterType, label: 'Confirmed', icon: 'checkmark-circle-outline', color: '#8B5CF6' },
    { key: 'completed' as FilterType, label: 'Completed', icon: 'checkmark-done-outline', color: '#10B981' },
    { key: 'cancelled' as FilterType, label: 'Cancelled', icon: 'close-circle-outline', color: '#EF4444' },
  ];

  const filteredBookings = bookings.filter((booking) => {
    if (activeFilter === 'all') return true;
    return booking.status === activeFilter;
  });

  const handleFilterPress = (filter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(filter);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <Animated.View
        style={[
          styles.headerWrapper,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={['#1E1B4B', '#312E81', '#4C1D95']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>My Bookings</Text>
              <View style={styles.bookingCountBadge}>
                <Text style={styles.bookingCount}>
                  {filteredBookings.length} {filteredBookings.length === 1 ? 'Booking' : 'Bookings'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.menuButton}>
              <Ionicons name="options-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Premium Filter Chips */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.key;
            return (
              <TouchableOpacity
                style={styles.filterChipWrapper}
                onPress={() => handleFilterPress(item.key)}
                activeOpacity={0.8}
              >
                {isActive ? (
                  <LinearGradient
                    colors={[item.color, item.color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.filterChipActive}
                  >
                    <Ionicons name={item.icon as any} size={16} color="#FFFFFF" />
                    <Text style={styles.filterChipTextActive}>{item.label}</Text>
                  </LinearGradient>
                ) : (
                  <BlurView intensity={5} tint="light" style={styles.filterChipInactive}>
                    <Ionicons name={item.icon as any} size={16} color="#6B7280" />
                    <Text style={styles.filterChipText}>{item.label}</Text>
                  </BlurView>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Bookings List */}
      {loading && bookings.length === 0 ? (
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={['#F3F4F6', '#E5E7EB']}
            style={styles.loadingCard}
          >
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading your bookings...</Text>
          </LinearGradient>
        </View>
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          title="No Bookings Found"
          message={
            activeFilter === 'all'
              ? 'Your bookings will appear here once you book a service'
              : `You don't have any ${activeFilter} bookings`
          }
          type="bookings"
        />
      ) : (
        <Animated.FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <BookingCard
              booking={item}
              index={index}
              onPress={() => router.push(`/booking/${item.id}` as any)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  headerGradient: {
    paddingBottom: spacing.xl,
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
  headerTextContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bookingCountBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.md,
  },
  bookingCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChipWrapper: {
    marginRight: spacing.sm,
  },
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  filterChipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingCard: {
    width: 200,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: spacing.md,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  bookingCardWrapper: {
    marginBottom: spacing.md,
  },
  bookingCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
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
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingIdText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  cardContent: {
    padding: spacing.md,
  },
  serviceSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.sm,
  },
  durationText: {
    fontSize: 11,
    color: '#6B7280',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#4B5563',
  },
  infoDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  locationIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  priceGradient: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  detailsButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});