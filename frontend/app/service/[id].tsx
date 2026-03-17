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
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useServiceStore } from '../../src/store/serviceStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function ServiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const serviceId = params.id as string;
  
  const { selectedService, loading, fetchServiceById } = useServiceStore();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (serviceId) {
      fetchServiceById(serviceId);
    }
  }, [serviceId]);

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

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'Duration varies';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hour ${mins} minutes` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const getLocationTypeInfo = (locationType: string | null) => {
    const info: { [key: string]: { label: string; icon: any; desc: string } } = {
      visit_customer: {
        label: 'Provider visits you',
        icon: 'home',
        desc: 'The service provider will come to your location',
      },
      customer_visits: {
        label: 'Visit provider',
        icon: 'business',
        desc: 'You will visit the service provider\'s location',
      },
      both: {
        label: 'Both options available',
        icon: 'swap-horizontal',
        desc: 'Choose between home service or visiting the provider',
      },
    };
    return info[locationType || ''] || info.both;
  };

  const locationInfo = getLocationTypeInfo(service.location_type);

  const handleBookService = () => {
    Alert.alert(
      'Book Service',
      'Booking functionality will be implemented in Phase 6',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="heart-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          {service.images && service.images.length > 0 ? (
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
          ) : (
            <View style={[styles.serviceImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={64} color={colors.textSecondary} />
            </View>
          )}

          {/* Image Indicators */}
          {service.images && service.images.length > 1 && (
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

        {/* Service Info */}
        <View style={styles.content}>
          <Text style={styles.serviceName}>{service.name}</Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.price}>₹{service.price.toFixed(2)}</Text>
          </View>

          {/* Service Details Cards */}
          <View style={styles.detailsGrid}>
            {/* Duration Card */}
            {service.duration && (
              <View style={styles.detailCard}>
                <View style={[styles.detailIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="time" size={24} color={colors.primary} />
                </View>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{formatDuration(service.duration)}</Text>
              </View>
            )}

            {/* Location Card */}
            {service.location_type && (
              <View style={styles.detailCard}>
                <View style={[styles.detailIcon, { backgroundColor: colors.info + '15' }]}>
                  <Ionicons name={locationInfo.icon} size={24} color={colors.info} />
                </View>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{locationInfo.label}</Text>
              </View>
            )}
          </View>

          {/* Seller Info */}
          {service.seller && (
            <View style={styles.sellerCard}>
              <View style={styles.sellerInfo}>
                <Ionicons name="person-circle" size={40} color={colors.primary} />
                <View style={styles.sellerDetails}>
                  <Text style={styles.sellerLabel}>Service Provider</Text>
                  <Text style={styles.sellerName}>{service.seller.company_name}</Text>
                  {service.seller.city && (
                    <Text style={styles.sellerLocation}>
                      <Ionicons name="location" size={14} color={colors.textSecondary} />
                      {' '}{service.seller.city}, {service.seller.state}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this Service</Text>
            <Text style={styles.description}>{service.description}</Text>
          </View>

          {/* Location Details */}
          {service.location_type && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Location</Text>
              <View style={styles.locationInfoCard}>
                <Ionicons name={locationInfo.icon} size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationTitle}>{locationInfo.label}</Text>
                  <Text style={styles.locationDesc}>{locationInfo.desc}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>Starting from</Text>
          <Text style={styles.bottomPrice}>₹{service.price.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleBookService}
        >
          <Ionicons name="calendar" size={20} color={colors.surface} />
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
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
    height: width * 0.75,
  },
  placeholderImage: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
  priceContainer: {
    marginBottom: spacing.lg,
  },
  priceLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '700',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  detailCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
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
    flex: 1,
  },
  sellerDetails: {
    flex: 1,
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
  sellerLocation: {
    ...typography.caption,
    color: colors.textSecondary,
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
  locationInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary + '08',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  locationTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  locationDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomPriceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  bookButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
