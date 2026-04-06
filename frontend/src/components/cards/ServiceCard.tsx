// src/components/cards/ServiceCard.tsx
import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Service } from '../../store/serviceStore';
import { formatDistance } from '../../services/locationService';

interface ServiceCardProps {
  service: Service & { distance?: number | null };
  onPress: () => void;
}

const getLocationTypeLabel = (locationType: string | null) => {
  const labels: { [key: string]: string } = {
    visit_customer: 'Provider visits you',
    customer_visits: 'Visit provider',
    both: 'Both options available',
  };
  return labels[locationType || ''] || 'Location TBD';
};

const getLocationIcon = (locationType: string | null): any => {
  const icons: { [key: string]: any } = {
    visit_customer: 'home-outline',
    customer_visits: 'business-outline',
    both: 'swap-horizontal-outline',
  };
  return icons[locationType || ''] || 'location-outline';
};

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isBookmarked, setIsBookmarked] = React.useState(false);
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'Duration varies';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const animateIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleBookmark = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.sequence([
      Animated.spring(bookmarkScale, {
        toValue: 1.3,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(bookmarkScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsBookmarked(!isBookmarked);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        onPressIn={animateIn}
        onPressOut={animateOut}
        activeOpacity={0.9}
      >
        {/* Premium Gradient Border */}
        <LinearGradient
          colors={['#10B981', '#059669', '#047857']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        />

        {/* Service Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={{ 
              uri: service.images?.[0] || 'https://via.placeholder.com/400x240?text=No+Image' 
            }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageOverlay}
          />

          {/* Video Badge */}
          {service.video_url && (
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)']}
              style={styles.videoBadge}
            >
              <Ionicons name="play-circle" size={28} color="#FFFFFF" />
            </LinearGradient>
          )}

          {/* Distance Badge */}
          {service.distance !== undefined && service.distance !== null && (
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.distanceBadge}
            >
              <Ionicons name="location" size={12} color="#FFFFFF" />
              <Text style={styles.distanceText}>{formatDistance(service.distance)}</Text>
            </LinearGradient>
          )}

          {/* Bookmark Button */}
          <TouchableOpacity
            style={styles.bookmarkButton}
            onPress={handleBookmark}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
              <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.4)']}
                style={styles.bookmarkGradient}
              >
                <Ionicons 
                  name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                  size={18} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Service Info */}
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={2}>
            {service.name}
          </Text>
          
          <Text style={styles.description} numberOfLines={2}>
            {service.description}
          </Text>

          {/* Service Details Row */}
          <View style={styles.detailsRow}>
            {/* Duration */}
            {service.duration && (
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.detailChip}
              >
                <Ionicons name="time-outline" size={14} color="#10B981" />
                <Text style={styles.detailText}>
                  {formatDuration(service.duration)}
                </Text>
              </LinearGradient>
            )}

            {/* Location Type */}
            {service.location_type && (
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.detailChip}
              >
                <Ionicons 
                  name={getLocationIcon(service.location_type)} 
                  size={14} 
                  color="#F59E0B" 
                />
                <Text style={styles.detailText} numberOfLines={1}>
                  {getLocationTypeLabel(service.location_type)}
                </Text>
              </LinearGradient>
            )}
          </View>

          {/* Price and Book Button */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.priceLabel}>Starting from</Text>
              <Text style={styles.price}>₹{service.price.toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.bookButton} activeOpacity={0.8}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bookButtonGradient}
              >
                <Text style={styles.bookButtonText}>Book Now</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Seller Name */}
          {service.seller && (
            <View style={styles.sellerContainer}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.sellerIcon}
              >
                <Ionicons name="storefront-outline" size={10} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.seller} numberOfLines={1}>
                by {service.seller.company_name}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 2,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  videoBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    borderRadius: 30,
    padding: spacing.sm,
    zIndex: 2,
  },
  distanceBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bookmarkButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    zIndex: 2,
  },
  bookmarkGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  content: {
    padding: spacing.md,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 20,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4B5563',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
  },
  bookButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sellerIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seller: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});