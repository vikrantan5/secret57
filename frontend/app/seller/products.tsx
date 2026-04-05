import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useProductStore } from '../../src/store/productStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SellerProductsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { products, fetchSellerProducts, deleteProduct, loading } = useProductStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (seller?.id) {
      loadProducts();
    }
  }, [seller?.id]);

  const loadProducts = async () => {
    if (seller?.id) {
      await fetchSellerProducts(seller.id);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteProduct(productId);
            if (result.success) {
              Alert.alert('Success', 'Product deleted successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Products</Text>
        <TouchableOpacity
          onPress={() => router.push('/seller/add-product' as any)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptySubtitle}>
              Start adding products to showcase your offerings
            </Text>
            <TouchableOpacity
              style={[styles.addProductButton, shadows.md]}
              onPress={() => router.push('/seller/add-product' as any)}
            >
              <Text style={styles.addProductButtonText}>Add First Product</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productList}>
            {products.map((product) => (
              <View key={product.id} style={[styles.productCard, shadows.sm]}>
                {product.images && product.images.length > 0 && (
                  <Image
                    source={{ uri: product.images[0] }}
                    style={styles.productImage}
                  />
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>₹{product.price}</Text>
                  <View style={styles.productMeta}>
                    <Text style={styles.productStock}>
                      Stock: {product.stock}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      product.is_active ? styles.activeBadge : styles.inactiveBadge
                    ]}>
                      <Text style={[
                        styles.statusText,
                        product.is_active ? styles.activeText : styles.inactiveText
                      ]}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                       onPress={() => router.push(`/seller/products/edit?id=${product.id}` as any)}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteProduct(product.id, product.name)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
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
  addButton: {
    padding: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  addProductButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  addProductButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  productList: {
    padding: spacing.lg,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.border,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  productName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  productPrice: {
    ...typography.h4,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productStock: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  activeBadge: {
    backgroundColor: colors.success + '20',
  },
  inactiveBadge: {
    backgroundColor: colors.textSecondary + '20',
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.textSecondary,
  },
  productActions: {
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
  },
});