// app/category/[slug].tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCategoryStore, Category } from '../../src/store/categoryStore';
import { useProductStore } from '../../src/store/productStore';
import { useServiceStore } from '../../src/store/serviceStore';
import { EnhancedProductCard } from '../../src/components/cards/EnhancedProductCard';
import { ServiceCard } from '../../src/components/cards/ServiceCard';
import { useCartStore } from '../../src/store/cartStore';
import { useWishlistStore } from '../../src/store/wishlistStore';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function CategoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const categorySlug = params.slug as string;
  
  const { user } = useAuthStore();
  const { categories, getCategoryBySlug } = useCategoryStore();
  const { products, loading: productsLoading, fetchProducts } = useProductStore();
  const { services, loading: servicesLoading, fetchServices } = useServiceStore();
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist, fetchWishlist } = useWishlistStore();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (categorySlug && categories.length > 0) {
      const cat = getCategoryBySlug(categorySlug);
      if (cat) {
        setCategory(cat);
        
        // Fetch data based on category type
        if (cat.type === 'ecommerce' || cat.type === 'hybrid') {
          fetchProducts(cat.id);
          setActiveTab('products');
        }
        if (cat.type === 'booking') {
          fetchServices(cat.id);
          setActiveTab('services');
        }
        if (cat.type === 'hybrid') {
          fetchServices(cat.id);
        }
      }
    }
  }, [categorySlug, categories]);

  useEffect(() => {
    if (user?.id) {
      fetchWishlist(user.id);
    }
  }, [user?.id]);

  const handleProductPress = (productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/product/${productId}`);
  };

  const handleServicePress = (serviceId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/service/${serviceId}`);
  };

  const handleAddToCart = (product: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleToggleWishlist = async (productId: string) => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please login to add items to wishlist');
      return;
    }
    await toggleWishlist(productId, user.id, 'product');
  };

  const handleTabChange = (tab: 'products' | 'services') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading category...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const showTabs = category.type === 'hybrid';
  const loading = activeTab === 'products' ? productsLoading : servicesLoading;
  const data = activeTab === 'products' ? products : services;

  // Get gradient colors based on category type
  const getCategoryGradient = () => {
    if (category.type === 'ecommerce') {
      return ['#8B5CF6', '#7C3AED', '#6D28D9'];
    } else if (category.type === 'booking') {
      return ['#10B981', '#059669', '#047857'];
    } else {
      return ['#F59E0B', '#D97706', '#B45309'];
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Gradient Header */}
      <LinearGradient
        colors={getCategoryGradient()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.title} numberOfLines={1}>{category.name}</Text>
            {category.description && (
              <Text style={styles.subtitle} numberOfLines={1}>{category.description}</Text>
            )}
          </View>
          
          <View style={styles.headerRight}>
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>
                {activeTab === 'products' ? products.length : services.length}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs for Hybrid Categories */}
      {showTabs && (
        <Animated.View 
          style={[
            styles.tabsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.tabsWrapper}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'products' && styles.activeTab]}
              onPress={() => handleTabChange('products')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={activeTab === 'products' ? ['#8B5CF6', '#7C3AED'] : ['#F3F4F6', '#E5E7EB']}
                style={styles.tabIcon}
              >
                <Ionicons
                  name="cube-outline"
                  size={18}
                  color={activeTab === 'products' ? '#FFFFFF' : '#6B7280'}
                />
              </LinearGradient>
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'products' && styles.activeTabText,
                ]}
              >
                Products
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'services' && styles.activeTab]}
              onPress={() => handleTabChange('services')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={activeTab === 'services' ? ['#10B981', '#059669'] : ['#F3F4F6', '#E5E7EB']}
                style={styles.tabIcon}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={activeTab === 'services' ? '#FFFFFF' : '#6B7280'}
                />
              </LinearGradient>
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'services' && styles.activeTabTextServices,
                ]}
              >
                Services
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Content */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading {activeTab}...</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.emptyIconContainer}
            >
              <Ionicons 
                name={activeTab === 'products' ? "cube-outline" : "calendar-outline"} 
                size={64} 
                color="#8B5CF6" 
              />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No {activeTab} available</Text>
            <Text style={styles.emptyText}>
              Check back later for new {activeTab === 'products' ? 'products' : 'services'}
            </Text>
          </View>
        ) : activeTab === 'products' ? (
          <FlatList
            key="products-grid"
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <EnhancedProductCard
                product={item}
                onPress={() => handleProductPress(item.id)}
                onAddToCart={() => handleAddToCart(item)}
                onToggleWishlist={() => handleToggleWishlist(item.id)}
                isInWishlist={isInWishlist(item.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            key="services-list"
            data={services}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ServiceCard
                service={item}
                onPress={() => handleServicePress(item.id)}
              />
            )}
            contentContainerStyle={styles.listContentServices}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingBottom: spacing.lg,
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
  headerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 60,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 60,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#F3F4F6',
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#8B5CF6',
  },
  activeTabTextServices: {
    color: '#10B981',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  listContentServices: {
    padding: spacing.lg,
  },
  row: {
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});