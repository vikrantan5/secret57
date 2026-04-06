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
  Image,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

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
  CategorySkeleton,
} from '../../src/components/ui/SkeletonLoaders';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const banners = [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
      link: '/categories',
      title: 'Super Sale',
      subtitle: 'Up to 50% Off',
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
      link: '/categories',
      title: 'Premium Services',
      subtitle: 'Professional & Reliable',
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
      link: '/categories',
      title: 'New Arrivals',
      subtitle: 'Discover Latest Trends',
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
      const nearby = await getServicesNearby(lat, lon, 50);
      setNearbyServices(nearby.slice(0, 10));
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
      sellerId: product.seller_id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0],
    });
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [0, 0.7, 1],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0.95, 1],
    extrapolate: 'clamp',
  });

  const heroScale = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.97],
    extrapolateRight: 'clamp',
  });

  const featuredProducts = products.filter((p) => p.is_active).slice(0, 10);
  const featuredServices = services.filter((s) => s.is_active).slice(0, 5);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Animated Compact Header */}
      <Animated.View
        style={[
          styles.compactHeader,
          {
            opacity: headerOpacity,
            transform: [{ scale: headerScale }],
          },
        ]}
      >
        <LinearGradient
          colors={['#0F172A', '#1E1B4B', '#2E1065']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactHeaderGradient}
        >
          <TouchableOpacity
            style={styles.compactMenuButton}
            onPress={() => router.push('/profile')}
          >
            <Feather name="menu" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.compactLogoContainer}>
            <LinearGradient
              colors={['#A855F7', '#D946EF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.compactLogoGradient}
            >
              <Text style={styles.compactLogoText}>S</Text>
            </LinearGradient>
            <Text style={styles.compactTitle}>ServiceHub</Text>
          </View>
          <TouchableOpacity
            style={styles.compactNotificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {unreadCount > 0 && <View style={styles.compactBadge} />}
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />}
      >
        {/* Premium Hero Section */}
        <Animated.View style={{ transform: [{ scale: heroScale }] }}>
          <LinearGradient
            colors={['#0F172A', '#1E1B4B', '#2E1065', '#4C1D95']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.greetingText}>{getGreeting()}</Text>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userNameText}>{user?.name || 'Guest'}</Text>
                    <Text style={styles.waveEmoji}>✨</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.heroNotificationBtn}
                  onPress={() => router.push('/notifications')}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                    style={styles.heroNotificationGradient}
                  >
                    <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                    {unreadCount > 0 && (
                      <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Premium Search Input */}
              <View style={styles.searchSection}>
                <View style={styles.searchInputContainer}>
                  <Feather name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search services & products..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={() => {
                      if (searchQuery.trim()) {
                        router.push(`/(tabs)/categories?search=${searchQuery}`);
                      }
                    }}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Feather name="x" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.searchDivider} />
                  <TouchableOpacity style={styles.filterButton}>
                    <LinearGradient
                      colors={['#A855F7', '#D946EF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.filterGradient}
                    >
                      <Feather name="sliders" size={16} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>150+</Text>
                <Text style={styles.statLabel}>Brands</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>2k+</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>500+</Text>
                <Text style={styles.statLabel}>Services</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

      {/* Premium Banner Slider - With Clean Shadow */}
{/* Premium Banner Slider - Floating Effect */}
<View style={styles.bannerOuterContainer}>
  <View style={styles.bannerWrapper}>
    <BannerSlider banners={banners} />
  </View>
</View>

        {/* Categories Section with Gradient Underline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <View style={styles.titleUnderline} />
              <Text style={styles.sectionSubtitle}>Discover your favorite items</Text>
            </View>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/categories')}
              activeOpacity={0.8}
            >
              <Text style={styles.exploreButtonText}>Explore</Text>
              <Ionicons name="arrow-forward-circle" size={20} color="#A855F7" />
            </TouchableOpacity>
          </View>

          {categoriesLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CategorySkeleton key={i} />
              ))}
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {categories.slice(0, 10).map((category, index) => (
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

        {/* Flash Sale Card - Premium */}
        {/* <View style={styles.flashSaleOuter}>
          <LinearGradient
            colors={['#FEF08A', '#FDE047', '#EAB308']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.flashSaleCard}
          >
            <View style={styles.flashSaleContent}>
              <View style={styles.flashSaleTag}>
                <Text style={styles.flashSaleTagText}>LIMITED TIME</Text>
              </View>
              <Text style={styles.flashSaleTitle}>Flash Sale</Text>
              <Text style={styles.flashSaleSubtitle}>Up to 70% OFF</Text>
              <View style={styles.countdownRow}>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownNumber}>12</Text>
                  <Text style={styles.countdownLabel}>Hrs</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownNumber}>45</Text>
                  <Text style={styles.countdownLabel}>Min</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownNumber}>30</Text>
                  <Text style={styles.countdownLabel}>Sec</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.flashSaleShopButton}>
                <Text style={styles.flashSaleShopText}>Shop Now →</Text>
              </TouchableOpacity>
            </View>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1606293926070-e4b5f4e7d5b2?w=200&q=80' }}
              style={styles.flashSaleImage}
            />
          </LinearGradient>
        </View> */}

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>✨ Featured Products</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.sectionSubtitle}>Handpicked just for you</Text>
              </View>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push('/(tabs)/categories')}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreButtonText}>View All</Text>
                <Ionicons name="arrow-forward-circle" size={20} color="#A855F7" />
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

        {/* Popular Services Section */}
        {featuredServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>🔧 Popular Services</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.sectionSubtitle}>Book trusted professionals</Text>
              </View>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push('/(tabs)/categories')}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreButtonText}>Explore</Text>
                <Ionicons name="arrow-forward-circle" size={20} color="#A855F7" />
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
              <View style={styles.locationHeader}>
                <LinearGradient
                  colors={['#A855F7', '#D946EF']}
                  style={styles.locationIconGradient}
                >
                  <Ionicons name="location" size={20} color="#FFFFFF" />
                </LinearGradient>
                <View>
                  <Text style={styles.sectionTitle}>Services Near You</Text>
                  <View style={styles.titleUnderline} />
                  <Text style={styles.sectionSubtitle}>Available in your area</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => {
                  if (userLocation) {
                    loadNearbyServices(userLocation.latitude, userLocation.longitude);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Feather name="refresh-cw" size={18} color="#A855F7" />
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
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // Compact Header Styles
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  compactHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  compactMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLogoGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactLogoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  compactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  compactNotificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  // Hero Section
  heroGradient: {
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  heroContent: {
    paddingHorizontal: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-medium',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  waveEmoji: {
    fontSize: 28,
  },
  heroNotificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroNotificationGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Search Section
  searchSection: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 60,
    paddingHorizontal: 18,
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    color: '#1E293B',
    paddingVertical: 14,
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  filterButton: {
    overflow: 'hidden',
    borderRadius: 30,
  },
  filterGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 60,
    backdropFilter: 'blur(10px)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  // Banner
 bannerOuterContainer: {
    marginTop: -25,
    marginBottom: 16,
    alignItems: 'center', // Centers horizontally
    justifyContent: 'center',
  },
   bannerWrapper: {
    width: width - 32, // Full width with padding (16px on each side)
    borderRadius: 24,
    overflow: 'hidden',
    // Remove any background color to prevent white square
  },
  bannerInnerContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  // Section
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: '#A855F7',
    borderRadius: 2,
    marginTop: 4,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-bold',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A855F7',
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  // Flash Sale
  flashSaleOuter: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  flashSaleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#EAB308',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  flashSaleContent: {
    flex: 1,
  },
  flashSaleTag: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  flashSaleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#854D0E',
    letterSpacing: 1,
  },
  flashSaleTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#854D0E',
    marginBottom: 4,
  },
  flashSaleSubtitle: {
    fontSize: 14,
    color: '#A16207',
    marginBottom: 16,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  countdownUnit: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countdownNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#854D0E',
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#854D0E',
  },
  countdownSeparator: {
    fontSize: 20,
    fontWeight: '700',
    color: '#854D0E',
  },
  flashSaleShopButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 40,
    alignSelf: 'flex-start',
  },
  flashSaleShopText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#854D0E',
  },
  flashSaleImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  // Products Grid
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 16,
  },
  // Services List
  servicesList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  // Location Header
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
 
  
 
});