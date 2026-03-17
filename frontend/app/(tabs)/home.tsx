import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function HomeScreen() {
  const { user } = useAuthStore();

  const categories = [
    { id: '1', name: 'Mehndi Artist', icon: 'hand-left' as const },
    { id: '2', name: 'Makeup Artist', icon: 'color-palette' as const },
    { id: '3', name: 'Fashion Designer', icon: 'shirt' as const },
    { id: '4', name: 'Home Bakers', icon: 'pizza' as const },
    { id: '5', name: 'Handmade Gifts', icon: 'gift' as const },
    { id: '6', name: 'Event Manager', icon: 'calendar' as const },
    { id: '7', name: 'Tutors', icon: 'book' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color={colors.text} />
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity style={[styles.searchBar, shadows.sm]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <Text style={styles.searchPlaceholder}>Search services or products...</Text>
        </TouchableOpacity>

        {/* Welcome Card */}
        <View style={[styles.welcomeCard, shadows.md]}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Welcome to ServiceHub</Text>
            <Text style={styles.welcomeText}>
              Discover amazing services and products from verified vendors
            </Text>
          </View>
          <Ionicons name="storefront" size={60} color={colors.primary} />
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, shadows.sm]}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons name={category.icon} size={28} color={colors.primary} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Services</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
          >
            {[1, 2, 3].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.featuredCard, shadows.md]}
              >
                <View style={styles.featuredImagePlaceholder}>
                  <Ionicons name="image" size={40} color={colors.textLight} />
                </View>
                <View style={styles.featuredInfo}>
                  <Text style={styles.featuredTitle}>Service Name</Text>
                  <Text style={styles.featuredPrice}>₹999</Text>
                  <View style={styles.rating}>
                    <Ionicons name="star" size={14} color={colors.warning} />
                    <Text style={styles.ratingText}>4.8 (120)</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  greeting: {
    ...typography.body,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
  },
  notificationButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  searchPlaceholder: {
    ...typography.body,
    color: colors.textLight,
    marginLeft: spacing.sm,
  },
  welcomeCard: {
    backgroundColor: colors.primaryLight + '20',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  welcomeTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  welcomeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  seeAll: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    width: '30%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryName: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
  },
  featuredScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  featuredCard: {
    backgroundColor: colors.surface,
    width: 200,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredInfo: {
    padding: spacing.md,
  },
  featuredTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  featuredPrice: {
    ...typography.h4,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
});
