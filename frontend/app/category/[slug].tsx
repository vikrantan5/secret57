import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryStore, Category } from '../../src/store/categoryStore';
import { useProductStore } from '../../src/store/productStore';
import { useServiceStore } from '../../src/store/serviceStore';
import { ProductCard } from '../../src/components/cards/ProductCard';
import { ServiceCard } from '../../src/components/cards/ServiceCard';
import { useCartStore } from '../../src/store/cartStore';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function CategoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; slug?: string }>();
  const categoryId = params.id as string;
  
  const { getCategoryById } = useCategoryStore();
  const { products, loading: productsLoading, fetchProducts } = useProductStore();
  const { services, loading: servicesLoading, fetchServices } = useServiceStore();
  const { addItem } = useCartStore();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');

  useEffect(() => {
    if (categoryId) {
      const cat = getCategoryById(categoryId);
      if (cat) {
        setCategory(cat);
        
        // Fetch data based on category type
        if (cat.type === 'ecommerce' || cat.type === 'hybrid') {
          fetchProducts(categoryId);
          setActiveTab('products');
        }
        if (cat.type === 'booking') {
          fetchServices(categoryId);
          setActiveTab('services');
        }
        if (cat.type === 'hybrid') {
          fetchServices(categoryId);
        }
      }
    }
  }, [categoryId]);

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleServicePress = (serviceId: string) => {
    router.push(`/service/${serviceId}`);
  };

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

  const showTabs = category.type === 'hybrid';
  const loading = activeTab === 'products' ? productsLoading : servicesLoading;
  const data = activeTab === 'products' ? products : services;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{category.name}</Text>
          {category.description && (
            <Text style={styles.subtitle}>{category.description}</Text>
          )}
        </View>
      </View>

      {/* Tabs for Hybrid Categories */}
      {showTabs && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'products' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons
              name="pricetag"
              size={20}
              color={activeTab === 'products' ? colors.primary : colors.textSecondary}
            />
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
            style={[
              styles.tab,
              activeTab === 'services' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('services')}
          >
            <Ionicons
              name="calendar"
              size={20}
              color={activeTab === 'services' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'services' && styles.activeTabText,
              ]}
            >
              Services
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            No {activeTab === 'products' ? 'products' : 'services'} available yet
          </Text>
        </View>
      ) : activeTab === 'products' ? (
       <FlatList
  key={'products-2-columns'}   // 👈 Important
  data={products}
  keyExtractor={(item) => item.id}
  numColumns={2}
  columnWrapperStyle={styles.row}
  renderItem={({ item }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item.id)}
      onAddToCart={() => handleAddToCart(item)}
    />
  )}
  contentContainerStyle={styles.listContent}
  showsVerticalScrollIndicator={false}
/>
      ) : (
        <FlatList
  key={'services-list'}   // 👈 Important
  data={services}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <ServiceCard
      service={item}
      onPress={() => handleServicePress(item.id)}
    />
  )}
  contentContainerStyle={styles.listContent}
  showsVerticalScrollIndicator={false}
/>
      )}
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
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  activeTab: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  row: {
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
