import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Service } from '../../store/serviceStore';

interface ServiceCardProps {
  service: Service;
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
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'Duration varies';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Service Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ 
            uri: service.images?.[0] || 'https://via.placeholder.com/300x200' 
          }}
          style={styles.image}
          resizeMode="cover"
        />
         {/* Video Badge */}
        {service.video_url && (
          <View style={styles.videoBadge}>
            <Ionicons name="play-circle" size={24} color={colors.white} />
          </View>
        )}
      </View>

      {/* Service Info */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {service.name}
        </Text>
        
        <Text style={styles.description} numberOfLines={2}>
          {service.description}
        </Text>

        {/* Service Details */}
        <View style={styles.detailsRow}>
          {/* Duration */}
          {service.duration && (
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {formatDuration(service.duration)}
              </Text>
            </View>
          )}

          {/* Location Type */}
          {service.location_type && (
            <View style={styles.detailItem}>
              <Ionicons 
                name={getLocationIcon(service.location_type)} 
                size={16} 
                color={colors.textSecondary} 
              />
              <Text style={styles.detailText} numberOfLines={1}>
                {getLocationTypeLabel(service.location_type)}
              </Text>
            </View>
          )}
        </View>

        {/* Price and Book Button */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.price}>₹{service.price.toFixed(2)}</Text>
          </View>

          <View style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Book Now</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.surface} />
          </View>
        </View>

        {/* Seller Name */}
        {service.seller && (
          <Text style={styles.seller} numberOfLines={1}>
            by {service.seller.company_name}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: borderRadius.full,
    padding: spacing.xs,
  },
  content: {
    padding: spacing.md,
  },
  name: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: '45%',
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  price: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  bookButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  seller: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
