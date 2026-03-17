import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../src/store/productStore';
import { useServiceStore } from '../../src/store/serviceStore';
import { useAuthStore } from '../../src/store/authStore';
import { useCategoryStore } from '../../src/store/categoryStore';
import { ProductCard } from '../../src/components/cards/ProductCard';
import { ServiceCard } from '../../src/components/cards/ServiceCard';
import { useCartStore } from '../../src/store/cartStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const getIconName = (icon: string): any => {
  const iconMap: { [key: string]: any } = {
    'hand-left': 'hand-left',
    'color-palette': 'color-palette',
    'shirt': 'shirt',
    'pizza': 'pizza',
    'gift': 'gift',
    'calendar': 'calendar',
    'book': 'book',
  };
  return iconMap[icon] || 'apps';
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { products, fetchProducts } = useProductStore();
  const { services, fetchServices } = useServiceStore();
  const { addItem } = useCartStore();

  useEffect(() => {
    fetchCategories();
    // Fetch recent products and services
    fetchProducts();
    fetchServices();
  }, []);

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0],
    });
  };

  // Get featured products (most recent 5)
  const featuredProducts = products.filter(p => p.is_active).slice(0, 5);
  
  // Get featured services (most recent 5)
  const featuredServices = services.filter(s => s.is_active).slice(0, 5);

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
        <TouchableOpacity 
          style={[styles.searchBar, shadows.sm]}
          onPress={() => router.push('/(tabs)/categories')}
          data-testid="search-bar"
        >
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
            <TouchableOpacity onPress={() => router.push('/(tabs)/categories')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.slice(0, 6).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, shadows.sm]}
                onPress={() => router.push(`/category/${category.slug}?id=${category.id}`)}
                data-testid={`category-card-${category.slug}`}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons name={getIconName(category.icon)} size={28} color={colors.primary} />
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Products</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/categories')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredProducts.map((product) => (
                <View key={product.id} style={styles.featuredCardWrapper}>
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.id}`)}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Featured Services Section */}
        {featuredServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Services</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/categories')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredServices.map((service) => (
                <View key={service.id} style={styles.featuredServiceCard}>
                  <ServiceCard
                    service={service}
                    onPress={() => router.push(`/service/${service.id}`)}
                  />
                </View>
              ))}
            </ScrollView>
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
  featuredCardWrapper: {
    width: 160,
  },
  featuredServiceCard: {
    width: 280,
  },
});