import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWishlistStore } from '../../src/store/wishlistStore';
import { useAuthStore } from '../../src/store/authStore';
import { useCartStore } from '../../src/store/cartStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function WishlistScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  // ✅ FIX: items = [] default fallback to avoid undefined.length error
  const {
    items = [],
    loading,
    fetchWishlist,
    removeFromWishlist,
  } = useWishlistStore();

  const { addItem } = useCartStore();

  useEffect(() => {
    if (user?.id) {
      fetchWishlist(user.id);
    }
  }, [user]);

  const handleRemove = async (productId: string) => {
    if (user?.id) {
      await removeFromWishlist(user.id, productId);
    }
  };

  const handleAddToCart = (item: any) => {
    const product = item.product;
    if (product && product.stock > 0) {
      addItem({
        id: product.id,
        productId: product.id,
        sellerId: product.seller_id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.images?.[0],
      });
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const product = item.product;
    if (!product) return null;

    const hasDiscount =
      product.compare_at_price && product.compare_at_price > product.price;
    const discountPercent = hasDiscount
      ? Math.round(
          ((product.compare_at_price - product.price) / product.compare_at_price) * 100
        )
      : 0;

    return (
      <TouchableOpacity
        style={[styles.itemCard, shadows.sm]}
        onPress={() => router.push(`/product/${product.id}`)}
      >
        <Image
          source={{ uri: product.images?.[0] || 'https://via.placeholder.com/100' }}
          style={styles.image}
        />

        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discountPercent}% OFF</Text>
              </View>
            )}
          </View>

          {product.stock === 0 ? (
            <Text style={styles.outOfStock}>Out of Stock</Text>
          ) : (
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => handleAddToCart(item)}
            >
              <Ionicons name="cart-outline" size={18} color={colors.primary} />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(product.id)}
        >
          <Ionicons name="close" size={24} color={colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* ✔ FIX: items always defined now */}
        <Text style={styles.headerTitle}>Wishlist ({items.length})</Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Empty state */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptyText}>Add products you love to your wishlist</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 40 },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  listContainer: { padding: spacing.lg, gap: spacing.md },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  content: { flex: 1, justifyContent: 'space-between' },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  discountBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  outOfStock: { ...typography.bodySmall, color: colors.error },
  addToCartButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  addToCartText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  removeButton: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
    marginBottom: spacing.xl,
  },
  shopButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  shopButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});