import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useCategoryStore } from '../../src/store/categoryStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md * 2) / 3;

const getIconName = (icon: string): any => {
  const iconMap: { [key: string]: any } = {
    'hand-left': 'hand-left-outline',
    'color-palette': 'color-palette-outline',
    'shirt': 'shirt-outline',
    'pizza': 'pizza-outline',
    'gift': 'gift-outline',
    'calendar': 'calendar-outline',
    'book': 'book-outline',
    'construct': 'construct-outline',
    'home': 'home-outline',
    'fitness': 'fitness-outline',
  };
  return iconMap[icon] || 'apps-outline';
};

const getCategoryGradient = (index: number): string[] => {
  const gradients = [
    ['#8B5CF6', '#7C3AED', '#6D28D9'],
    ['#EC4899', '#DB2777', '#BE185D'],
    ['#F59E0B', '#D97706', '#B45309'],
    ['#10B981', '#059669', '#047857'],
    ['#3B82F6', '#2563EB', '#1D4ED8'],
    ['#EF4444', '#DC2626', '#B91C1C'],
    ['#14B8A6', '#0D9488', '#0F766E'],
    ['#8B5CF6', '#7C3AED', '#6D28D9'],
  ];
  return gradients[index % gradients.length];
};

export default function CategoriesScreen() {
  const router = useRouter();
  const { categories, loading, fetchCategories } = useCategoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'services' | 'products'>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchCategories();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.spring(searchAnimation, {
      toValue: isSearchFocused ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [isSearchFocused]);

  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'services' && category.type === 'service') ||
      (selectedFilter === 'products' && category.type === 'product');

    return matchesSearch && matchesFilter;
  });

  const handleCategoryPress = (categoryId: string, categorySlug: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/category/${categorySlug}?id=${categoryId}`);
  };

  const handleFilterPress = (filter: 'all' | 'services' | 'products') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFilter(filter);
  };

  const searchBorderColor = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#8B5CF6'],
  });

  const searchScale = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const getFilterGradient = (filter: string) => {
    switch (filter) {
      case 'services':
        return ['#10B981', '#059669'];
      case 'products':
        return ['#F59E0B', '#D97706'];
      default:
        return ['#8B5CF6', '#7C3AED'];
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4C1D95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Categories</Text>
            <View style={styles.headerBadge}>
              <Text style={styles.subtitle}>Explore & Discover</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.content, { opacity: fadeAnim }]}
      >
        {/* Premium Search Bar */}
        <Animated.View
          style={[
            styles.searchContainer,
            {
              borderColor: searchBorderColor,
              transform: [{ scale: searchScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.searchGradient}
          >
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color="#8B5CF6" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search categories..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={styles.clearIcon}>
                  <Ionicons name="close" size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity>
                <View style={styles.filterIcon}>
                  <Feather name="sliders" size={18} color="#8B5CF6" />
                </View>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Premium Filter Chips */}
        <View style={styles.filterContainer}>
          {[
            { key: 'all', label: 'All', icon: 'grid-outline' },
            { key: 'services', label: 'Services', icon: 'construct-outline' },
            { key: 'products', label: 'Products', icon: 'cube-outline' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={styles.filterChipWrapper}
              onPress={() => handleFilterPress(filter.key as any)}
              activeOpacity={0.8}
            >
              {selectedFilter === filter.key ? (
                <LinearGradient
                  colors={getFilterGradient(filter.key)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterChipActive}
                >
                  <Ionicons name={filter.icon as any} size={16} color="#FFFFFF" />
                  <Text style={styles.filterChipTextActive}>{filter.label}</Text>
                </LinearGradient>
              ) : (
                <BlurView intensity={5} tint="light" style={styles.filterChipInactive}>
                  <Ionicons name={filter.icon as any} size={16} color="#6B7280" />
                  <Text style={styles.filterChipText}>{filter.label}</Text>
                </BlurView>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Results Header */}
        <View style={styles.resultsHeader}>
          <LinearGradient
            colors={['#F3F4F6', '#E5E7EB']}
            style={styles.resultsBadge}
          >
            <Ionicons name="apps-outline" size={14} color="#6B7280" />
            <Text style={styles.resultsText}>
              {filteredCategories.length} {filteredCategories.length === 1 ? 'Category' : 'Categories'}
            </Text>
          </LinearGradient>
        </View>

        {/* Categories Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.loadingCard}
            >
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </LinearGradient>
          </View>
        ) : filteredCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No categories found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search' : 'Categories will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {filteredCategories.map((category, index) => (
              <Animated.View
                key={category.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ scale: fadeAnim }],
                }}
              >
                <TouchableOpacity
                  style={styles.categoryCard}
                  onPress={() => handleCategoryPress(category.id, category.slug)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={getCategoryGradient(index)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.categoryIconContainer}
                  >
                    <Ionicons name={getIconName(category.icon)} size={28} color="#FFFFFF" />
                    <LinearGradient
                      colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
                      style={styles.iconOverlay}
                    />
                  </LinearGradient>
                  <Text style={styles.categoryName} numberOfLines={2}>
                    {category.name}
                  </Text>
                  {category.description && (
                    <Text style={styles.categoryDesc} numberOfLines={1}>
                      {category.description}
                    </Text>
                  )}
                  <View style={styles.categoryArrow}>
                    <Ionicons name="arrow-forward" size={12} color="#8B5CF6" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingBottom: spacing.xl,
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
    justifyContent: 'space-between',
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
  headerTextContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.md,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginTop: -spacing.lg,
  },
  searchContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: spacing.xs,
  },
  clearIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChipWrapper: {
    flex: 1,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  filterChipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultsHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  resultsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  resultsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingCard: {
    width: 200,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
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
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  categoryCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
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
    position: 'relative',
  },
  categoryIconContainer: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  categoryDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  categoryArrow: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Add ActivityIndicator import
import { ActivityIndicator } from 'react-native';