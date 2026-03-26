import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    ['#5B7CFF', '#7B95FF'],
    ['#8B5CF6', '#A78BFA'],
    ['#F59E0B', '#FCD34D'],
    ['#10B981', '#34D399'],
    ['#EF4444', '#F87171'],
    ['#3B82F6', '#60A5FA'],
    ['#EC4899', '#F472B6'],
    ['#14B8A6', '#2DD4BF'],
  ];
  return gradients[index % gradients.length];
};

export default function CategoriesScreen() {
  const router = useRouter();
  const { categories, loading, fetchCategories } = useCategoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'services' | 'products'>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchAnimation = new Animated.Value(0);

  useEffect(() => {
    fetchCategories();
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
    outputRange: [colors.border, colors.primary],
  });

  const searchScale = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Categories</Text>
          <Text style={styles.subtitle}>Explore services and products</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Search Bar */}
        <Animated.View
          style={[
            styles.searchContainer,
            {
              borderColor: searchBorderColor,
              transform: [{ scale: searchScale }],
            },
          ]}
        >
          <Ionicons name="search" size={22} color={colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
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
              <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity>
              <Ionicons name="options-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => handleFilterPress('all')}
          >
            {selectedFilter === 'all' ? (
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.filterChipGradient}
              >
                <Ionicons name="grid-outline" size={18} color={colors.surface} />
                <Text style={styles.filterChipTextActive}>All</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="grid-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.filterChipText}>All</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'services' && styles.filterChipActive]}
            onPress={() => handleFilterPress('services')}
          >
            {selectedFilter === 'services' ? (
              <LinearGradient
                colors={[colors.secondary, colors.secondaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.filterChipGradient}
              >
                <Ionicons name="construct-outline" size={18} color={colors.surface} />
                <Text style={styles.filterChipTextActive}>Services</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="construct-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.filterChipText}>Services</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'products' && styles.filterChipActive]}
            onPress={() => handleFilterPress('products')}
          >
            {selectedFilter === 'products' ? (
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.filterChipGradient}
              >
                <Ionicons name="cube-outline" size={18} color={colors.surface} />
                <Text style={styles.filterChipTextActive}>Products</Text>
              </LinearGradient>
            ) : (
              <>
                <Ionicons name="cube-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.filterChipText}>Products</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Results Count */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'} found
          </Text>
        </View>

        {/* Categories Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading categories...</Text>
          </View>
        ) : filteredCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={80} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No categories found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search' : 'Categories will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {filteredCategories.map((category, index) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category.id, category.slug)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={getCategoryGradient(index)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.categoryIconContainer}
                >
                  <Ionicons name={getIconName(category.icon)} size={32} color={colors.surface} />
                </LinearGradient>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {category.name}
                </Text>
                {category.description && (
                  <Text style={styles.categoryDesc} numberOfLines={1}>
                    {category.description}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    marginTop: -spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    gap: spacing.sm,
    ...shadows.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    ...shadows.sm,
  },
  filterChipActive: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  filterChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    ...typography.bodySmall,
    color: colors.surface,
    fontWeight: '700',
  },
  resultsHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  resultsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  categoryName: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  categoryDesc: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
