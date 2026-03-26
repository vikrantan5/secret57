import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { colors, spacing, borderRadius } from '../../constants/theme';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
const { width } = Dimensions.get('window');

export const ProductCardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      <ShimmerPlaceholder style={styles.image} />
      <View style={styles.content}>
        <ShimmerPlaceholder style={styles.name} />
        <ShimmerPlaceholder style={styles.price} />
        <ShimmerPlaceholder style={styles.seller} />
      </View>
    </View>
  );
};

export const ServiceCardSkeleton: React.FC = () => {
  return (
    <View style={styles.serviceCard}>
      <ShimmerPlaceholder style={styles.serviceImage} />
      <View style={styles.serviceContent}>
        <ShimmerPlaceholder style={styles.serviceName} />
        <ShimmerPlaceholder style={styles.serviceDesc} />
        <ShimmerPlaceholder style={styles.servicePrice} />
      </View>
    </View>
  );
};

export const BannerSkeleton: React.FC = () => {
  return (
    <View style={styles.bannerContainer}>
      <ShimmerPlaceholder style={styles.banner} />
    </View>
  );
};

export const CategorySkeleton: React.FC = () => {
  return (
    <View style={styles.categoryContainer}>
      <ShimmerPlaceholder style={styles.categoryIcon} />
      <ShimmerPlaceholder style={styles.categoryName} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: spacing.sm,
  },
  name: {
    width: '80%',
    height: 16,
    marginBottom: spacing.xs,
    borderRadius: 4,
  },
  price: {
    width: '40%',
    height: 20,
    marginBottom: spacing.xs,
    borderRadius: 4,
  },
  seller: {
    width: '60%',
    height: 12,
    borderRadius: 4,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: 180,
  },
  serviceContent: {
    padding: spacing.md,
  },
  serviceName: {
    width: '70%',
    height: 20,
    marginBottom: spacing.sm,
    borderRadius: 4,
  },
  serviceDesc: {
    width: '100%',
    height: 14,
    marginBottom: spacing.xs,
    borderRadius: 4,
  },
  servicePrice: {
    width: '30%',
    height: 24,
    borderRadius: 4,
  },
  bannerContainer: {
    marginVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  banner: {
    width: width - spacing.lg * 2,
    height: 180,
    borderRadius: borderRadius.lg,
  },
  categoryContainer: {
    width: 90,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryIcon: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  categoryName: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
});
