import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/services/supabase';

export default function AllProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
         seller:sellers(id, company_name, user:users!sellers_user_id_fkey(name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter(product =>
      product.title?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.seller?.company_name?.toLowerCase().includes(query)
    );
    setFilteredProducts(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const calculateStats = () => {
    const totalProducts = products.length;
    const inStock = products.filter(p => p.stock > 0).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    return { totalProducts, inStock, outOfStock, totalValue };
  };

  const stats = calculateStats();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>All Products</Text>
        <TouchableOpacity onPress={loadProducts}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products or sellers"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {stats.inStock}
          </Text>
          <Text style={styles.statLabel}>In Stock</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.error }]}>
            {stats.outOfStock}
          </Text>
          <Text style={styles.statLabel}>Out of Stock</Text>
        </View>
      </View>

      <View style={[styles.revenueCard, shadows.sm]}>
        <Text style={styles.revenueLabel}>Total Inventory Value</Text>
        <Text style={styles.revenueValue}>₹{stats.totalValue.toLocaleString()}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No products found</Text>
          </View>
        ) : (
          <View style={styles.productList}>
            {filteredProducts.map((product) => (
              <View key={product.id} style={[styles.productCard, shadows.sm]}>
                {product.images && product.images.length > 0 && (
                  <Image source={{ uri: product.images[0] }} style={styles.productImage} />
                )}
                
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {product.title}
                  </Text>
                  
                  <Text style={styles.sellerName}>
                    by {product.seller?.company_name || 'Unknown Seller'}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>₹{product.price.toLocaleString()}</Text>
                    {product.discount_price && (
                      <Text style={styles.discountPrice}>₹{product.discount_price.toLocaleString()}</Text>
                    )}
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.stockBadge}>
                      <Ionicons 
                        name={product.stock > 0 ? 'checkmark-circle' : 'close-circle'} 
                        size={16} 
                        color={product.stock > 0 ? colors.success : colors.error} 
                      />
                      <Text style={[
                        styles.stockText,
                        { color: product.stock > 0 ? colors.success : colors.error }
                      ]}>
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                      </Text>
                    </View>
                  </View>

                  {product.delivery_days && (
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.infoText}>
                        {product.delivery_days} days delivery
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  revenueCard: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  revenueLabel: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
  },
  revenueValue: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  productList: {
    padding: spacing.lg,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
  },
  productInfo: {
    padding: spacing.md,
  },
  productTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sellerName: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  price: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  discountPrice: {
    ...typography.body,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  stockText: {
    ...typography.body,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});