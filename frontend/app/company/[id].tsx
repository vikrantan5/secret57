// app/company/[id].tsx
// Company Detail page - shows the company profile + tabs for Services & Products
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
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../src/services/supabase';
import { useCompanyStore } from '../../src/store/companyStore';
import { useAuthStore } from '../../src/store/authStore';
import { useCartStore } from '../../src/store/cartStore';
import { useWishlistStore } from '../../src/store/wishlistStore';
import { EnhancedProductCard } from '../../src/components/cards/EnhancedProductCard';
import { ServiceCard } from '../../src/components/cards/ServiceCard';
import { spacing, borderRadius } from '../../src/constants/theme';

type TabKey = 'services' | 'products';

export default function CompanyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = id as string;

  const { user } = useAuthStore();
  const { selectedCompany, fetchCompanyById, loading: companyLoading } = useCompanyStore();
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist, fetchWishlist } = useWishlistStore();

  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tab, setTab] = useState<TabKey>('services');
  const [tabLoading, setTabLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchCompanyById(companyId);
    }
  }, [companyId]);

  useEffect(() => {
    if (user?.id) fetchWishlist(user.id);
  }, [user?.id]);

  // When company loads, set default tab based on category type
  useEffect(() => {
    if (!selectedCompany) return;
    const type = selectedCompany.category?.type;
    if (type === 'ecommerce') setTab('products');
    else setTab('services');
  }, [selectedCompany?.id]);

  // Load both services and products for this company
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setTabLoading(true);
        const [svcRes, prodRes] = await Promise.all([
          supabase
            .from('services')
            .select('*, seller:sellers(*), category:categories(*)')
            .eq('seller_id', companyId)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('products')
            .select('*, seller:sellers(*), category:categories(*)')
            .eq('seller_id', companyId)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
        ]);

        if (cancelled) return;

        const svc = (svcRes.data || []).filter((s: any) => !s.is_deleted);
        const prod = (prodRes.data || []).filter((p: any) => !p.is_deleted);
        setServices(svc);
        setProducts(prod);
      } catch (e) {
        console.error('Error loading company items', e);
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

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

  const handleTabChange = (next: TabKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTab(next);
  };

  const initials = selectedCompany?.company_name
    ?.split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Determine which tabs to show based on category type
  const categoryType = selectedCompany?.category?.type;
  const showServicesTab = categoryType === 'booking' || categoryType === 'hybrid' || categoryType == null;
  const showProductsTab = categoryType === 'ecommerce' || categoryType === 'hybrid' || categoryType == null;

  if (companyLoading || !selectedCompany) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading company...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4C1D95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.topRow}>
          <TouchableOpacity
            testID="company-back-btn"
            style={styles.iconButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.topTitle} numberOfLines={1}>
            {selectedCompany.company_name}
          </Text>

          <View style={styles.iconButton} />
        </View>

        {/* Hero / Profile section */}
        <View style={styles.profileSection}>
          <View style={styles.heroLogo}>
            {selectedCompany.company_logo ? (
              <Image
                source={{ uri: selectedCompany.company_logo }}
                style={styles.heroLogoImg}
              />
            ) : (
              <View style={styles.heroLogoFallback}>
                <Text style={styles.heroLogoInitials}>{initials || 'C'}</Text>
              </View>
            )}
          </View>

          <Text style={styles.companyName} numberOfLines={2}>
            {selectedCompany.company_name}
          </Text>

          {!!selectedCompany.description && (
            <Text style={styles.companyDesc} numberOfLines={3}>
              {selectedCompany.description}
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="location" size={12} color="#FFFFFF" />
              <Text style={styles.metaChipText}>
                {selectedCompany.city}
                {selectedCompany.state ? `, ${selectedCompany.state}` : ''}
              </Text>
            </View>
            {!!selectedCompany.category?.name && (
              <View style={styles.metaChip}>
                <Ionicons name="pricetag" size={12} color="#FFFFFF" />
                <Text style={styles.metaChipText}>{selectedCompany.category.name}</Text>
              </View>
            )}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {showServicesTab && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{services.length}</Text>
                <Text style={styles.statLabel}>Services</Text>
              </View>
            )}
            {showProductsTab && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{products.length}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#FCD34D" />
                <Text style={styles.statValue}>4.8</Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          {showServicesTab && (
            <TouchableOpacity
              testID="tab-services"
              style={[styles.tab, tab === 'services' && styles.tabActive]}
              onPress={() => handleTabChange('services')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="construct-outline"
                size={16}
                color={tab === 'services' ? '#FFFFFF' : '#6B7280'}
              />
              <Text style={[styles.tabText, tab === 'services' && styles.tabTextActive]}>
                Services ({services.length})
              </Text>
            </TouchableOpacity>
          )}
          {showProductsTab && (
            <TouchableOpacity
              testID="tab-products"
              style={[styles.tab, tab === 'products' && styles.tabActive]}
              onPress={() => handleTabChange('products')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="cube-outline"
                size={16}
                color={tab === 'products' ? '#FFFFFF' : '#6B7280'}
              />
              <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive]}>
                Products ({products.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lists */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {tabLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading {tab}...</Text>
          </View>
        ) : tab === 'services' ? (
          services.length === 0 ? (
            <EmptyState icon="construct-outline" message="No services offered yet" />
          ) : (
            <FlatList
              testID="company-services-list"
              data={services}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ServiceCard service={item} onPress={() => handleServicePress(item.id)} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : products.length === 0 ? (
          <EmptyState icon="cube-outline" message="No products available yet" />
        ) : (
          <FlatList
            testID="company-products-list"
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
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const EmptyState = ({ icon, message }: { icon: any; message: string }) => (
  <View style={styles.emptyContainer}>
    <LinearGradient colors={['#F3F4F6', '#E5E7EB']} style={styles.emptyIconContainer}>
      <Ionicons name={icon} size={56} color="#8B5CF6" />
    </LinearGradient>
    <Text style={styles.emptyTitle}>{message}</Text>
    <Text style={styles.emptyText}>Check back later for new offerings from this company.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 32,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: spacing.sm,
  },
  profileSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  heroLogo: {
    width: 88,
    height: 88,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.md,
  },
  heroLogoImg: {
    width: '100%',
    height: '100%',
  },
  heroLogoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroLogoInitials: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  companyName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  companyDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metaChipText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  statBox: {
    minWidth: 70,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
