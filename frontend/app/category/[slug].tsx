// app/category/[slug].tsx
// Companies/Vendors listing for a given category
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCategoryStore, Category } from '../../src/store/categoryStore';
import { useCompanyStore, Company } from '../../src/store/companyStore';
import { spacing, borderRadius } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function CategoryCompaniesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string; id?: string }>();
  const categorySlug = params.slug as string;

  const { categories, getCategoryBySlug, fetchCategories } = useCategoryStore();
  const { companies, loading, fetchCompaniesByCategory } = useCompanyStore();

  const [category, setCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (categories.length === 0) fetchCategories();
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
        fetchCompaniesByCategory(cat.id);
      }
    }
  }, [categorySlug, categories]);

  
  // Always re-fetch companies when the screen regains focus so users see
  // fresh data after navigating back from a company detail page (and so
  // brand-new sellers appear without a manual reload).
  useFocusEffect(
    useCallback(() => {
      if (categorySlug && categories.length > 0) {
        const cat = getCategoryBySlug(categorySlug);
        if (cat) {
          setCategory(cat);
          fetchCompaniesByCategory(cat.id);
        }
      }
    }, [categorySlug, categories])
  );

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.company_name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  const handleCompanyPress = (companyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/company/${companyId}`);
  };

  const getCategoryGradient = () => {
    if (!category) return ['#8B5CF6', '#7C3AED', '#6D28D9'];
    if (category.type === 'ecommerce') return ['#8B5CF6', '#7C3AED', '#6D28D9'];
    if (category.type === 'booking') return ['#10B981', '#059669', '#047857'];
    return ['#F59E0B', '#D97706', '#B45309'];
  };

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading category...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showServicesBadge = category.type === 'booking' || category.type === 'hybrid';
  const showProductsBadge = category.type === 'ecommerce' || category.type === 'hybrid';

  const renderCompany = ({ item, index }: { item: Company; index: number }) => {
    const initials = item.company_name
      ?.split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <TouchableOpacity
          testID={`company-card-${item.id}`}
          style={styles.companyCard}
          onPress={() => handleCompanyPress(item.id)}
          activeOpacity={0.85}
        >
          {/* Logo / Initials */}
          <View style={styles.logoContainer}>
            {item.company_logo ? (
              <Image source={{ uri: item.company_logo }} style={styles.logoImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={getCategoryGradient() as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoFallback}
              >
                <Text style={styles.logoInitials}>{initials || 'C'}</Text>
              </LinearGradient>
            )}
          </View>

          {/* Content */}
          <View style={styles.companyContent}>
            <Text style={styles.companyName} numberOfLines={1}>
              {item.company_name}
            </Text>

            {!!item.description && (
              <Text style={styles.companyDesc} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View style={styles.cityRow}>
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text style={styles.cityText} numberOfLines={1}>
                {item.city}
                {item.state ? `, ${item.state}` : ''}
              </Text>
            </View>

            <View style={styles.badgesRow}>
              {showServicesBadge && (
                <View style={[styles.statBadge, styles.statBadgeService]}>
                  <Ionicons name="construct-outline" size={12} color="#059669" />
                  <Text style={[styles.statBadgeText, { color: '#047857' }]}>
                    {item.services_count} {item.services_count === 1 ? 'Service' : 'Services'}
                  </Text>
                </View>
              )}
              {showProductsBadge && (
                <View style={[styles.statBadge, styles.statBadgeProduct]}>
                  <Ionicons name="cube-outline" size={12} color="#7C3AED" />
                  <Text style={[styles.statBadgeText, { color: '#6D28D9' }]}>
                    {item.products_count} {item.products_count === 1 ? 'Product' : 'Products'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Chevron */}
          <View style={styles.chevron}>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Gradient Header */}
      <LinearGradient
        colors={getCategoryGradient() as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            testID="category-back-btn"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title} numberOfLines={1}>
              {category.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Browse trusted vendors
            </Text>
          </View>

          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>{filteredCompanies.length}</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#FFFFFF" />
            <TextInput
              testID="company-search-input"
              style={styles.searchInput}
              placeholder="Search companies, city..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading vendors...</Text>
          </View>
        ) : filteredCompanies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient colors={['#F3F4F6', '#E5E7EB']} style={styles.emptyIconContainer}>
              <Ionicons name="business-outline" size={56} color="#8B5CF6" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No vendors match your search' : 'No vendors available'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try a different keyword or clear your search'
                : 'New companies will appear here once they join'}
            </Text>
          </View>
        ) : (
          <FlatList
            testID="companies-list"
            data={filteredCompanies}
            keyExtractor={(item) => item.id}
            renderItem={renderCompany}
            contentContainerStyle={styles.listContent}
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
    paddingTop: Platform.OS === 'ios' ? 50 : 32,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  itemCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchWrapper: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: '#F3F4F6',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  companyContent: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  companyDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 16,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  cityText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  statBadgeService: {
    backgroundColor: '#D1FAE5',
  },
  statBadgeProduct: {
    backgroundColor: '#EDE9FE',
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
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
