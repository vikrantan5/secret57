import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';

import { useProductStore } from '../../src/store/productStore';
import { useServiceStore } from '../../src/store/serviceStore';
import { useServiceLocationStore } from '../../src/store/serviceLocationStore';
import { useAuthStore } from '../../src/store/authStore';
import { useCategoryStore } from '../../src/store/categoryStore';
import { useCartStore } from '../../src/store/cartStore';
import { useNotificationStore } from '../../src/store/notificationStore';
import { getCurrentLocation } from '../../src/services/locationService';

import { BannerSlider } from '../../src/components/ui/BannerSlider';
import { CategoryBox } from '../../src/components/ui/CategoryBox';
import { EnhancedProductCard } from '../../src/components/cards/EnhancedProductCard';
import { ServiceCard } from '../../src/components/cards/ServiceCard';
import {
  ProductCardSkeleton,
  ServiceCardSkeleton,
  BannerSkeleton,
  CategorySkeleton,
} from '../../src/components/ui/SkeletonLoaders';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;

export default function HomeScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuthStore();
  const { categories, fetchCategories, loading: categoriesLoading } = useCategoryStore();
  const { products, fetchProducts, loading: productsLoading } = useProductStore();
  const { services, fetchServices, loading: servicesLoading } = useServiceStore();
  const { getServicesNearby } = useServiceLocationStore();
  const { addItem } = useCartStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  
  const [nearbyServices, setNearbyServices] = useState<any[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Sample banners - you can fetch these from your backend
  const banners = [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
      link: '/categories',
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
      link: '/categories',
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
      link: '/categories',
    },
  ];

  useEffect(() => {
    loadData();
    loadUserLocation();
  }, [user]);

  const loadUserLocation = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
        loadNearbyServices(location.latitude, location.longitude);
      }
    } catch (error) {
      console.log('Could not fetch user location:', error);
    }
  };

  const loadNearbyServices = async (lat: number, lon: number) => {
    try {
      setLoadingNearby(true);
      const nearby = await getServicesNearby(lat, lon, 50); // 50km max
      setNearbyServices(nearby.slice(0, 10)); // Top 10 nearest
    } catch (error) {
      console.error('Error loading nearby services:', error);
    } finally {
      setLoadingNearby(false);
    }
  };

  const loadData = async () => {
    fetchCategories();
    fetchProducts();
    fetchServices();
    if (user?.id) {
      fetchNotifications(user.id);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  };

  const handleAddToCart = (product: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0],
    });
  };

  // Animated header
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [-50, 0],
    extrapolate: 'clamp',
  });

  // Get featured products & services
  const featuredProducts = products.filter((p) => p.is_active).slice(0, 10);
  const featuredServices = services.filter((s) => s.is_active).slice(0, 5);

  // Get current hour for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.animatedHeader,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.animatedHeaderGradient}
        >
          <Text style={styles.animatedHeaderTitle}>ServiceHub</Text>
          <TouchableOpacity
            style={styles.animatedNotificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.surface} />
            {unreadCount > 0 && <View style={styles.animatedBadge} />}
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Main Header with Gradient */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName}>{user?.name || 'Guest'} 👋</Text>
              </View>

              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => router.push('/notifications')}
              >
                <Ionicons name="notifications-outline" size={26} color={colors.surface} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <TouchableOpacity
              style={styles.searchBar}
              onPress={() => router.push('/(tabs)/categories')}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <Text style={styles.searchPlaceholder}>Search services & products...</Text>
              <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Banner Slider */}
        {banners.length > 0 && <BannerSlider banners={banners} />}

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/categories')}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>

          {categoriesLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <CategorySkeleton key={i} />
              ))}
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {categories.slice(0, 8).map((category, index) => (
                <CategoryBox
                  key={category.id}
                  {...category}
                  index={index}
                  onPress={() => router.push(`/category/${category.slug}?id=${category.id}`)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Featured Products</Text>
                <Text style={styles.sectionSubtitle}>Handpicked for you</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/categories')}>
                <Text style={styles.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>

            {productsLoading ? (
              <View style={styles.productsGrid}>
                {[1, 2, 3, 4].map((i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </View>
            ) : (
              <View style={styles.productsGrid}>
                {featuredProducts.slice(0, 6).map((product) => (
                  <EnhancedProductCard
                    key={product.id}
                    product={product}
                    onPress={() => router.push(`/product/${product.id}`)}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Featured Services Section */}
        {featuredServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Popular Services</Text>
                <Text style={styles.sectionSubtitle}>Book professional services</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/categories')}>
                <Text style={styles.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>

            {servicesLoading ? (
              <View style={styles.servicesList}>
                {[1, 2].map((i) => (
                  <ServiceCardSkeleton key={i} />
                ))}
              </View>
            ) : (
              <View style={styles.servicesList}>
                {featuredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onPress={() => router.push(`/service/${service.id}`)}
                  />
                ))}
              </View>
            )}
          </View>
        )}


           {/* Nearby Services Section */}
        {nearbyServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="location" size={24} color={colors.primary} />
                <View>
                  <Text style={styles.sectionTitle}>Services Near You</Text>
                  <Text style={styles.sectionSubtitle}>Available in your area</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => {
                if (userLocation) {
                  loadNearbyServices(userLocation.latitude, userLocation.longitude);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}>
                <Ionicons name="refresh" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {loadingNearby ? (
              <View style={styles.servicesList}>
                {[1, 2].map((i) => (
                  <ServiceCardSkeleton key={i} />
                ))}
              </View>
            ) : (
              <View style={styles.servicesList}>
                {nearbyServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onPress={() => router.push(`/service/${service.id}`)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: spacing.xxl }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  
  animatedHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  animatedHeaderTitle: {
    ...typography.h4,
    color: colors.surface,
    fontWeight: '700',
  },
  animatedNotificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  headerGradient: {
    paddingBottom: spacing.lg,
  },
  header: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  userName: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: '700',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.surface,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
    ...shadows.md,
  },
  searchPlaceholder: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
    sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  seeAll: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  categoriesScroll: {
    paddingHorizontal: spacing.lg,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  servicesList: {
    paddingHorizontal: spacing.lg,
  },
});
