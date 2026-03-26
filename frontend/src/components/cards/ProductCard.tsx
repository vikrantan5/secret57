import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Product } from '../../store/productStore';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onPress, 
  onAddToCart 
}) => {
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.images?.[0] || 'https://via.placeholder.com/200' }}
          style={styles.image}
          resizeMode="cover"
        />
        
        {/* Discount Badge */}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
          </View>
        )}

        {/* Stock Badge */}
        {product.stock === 0 && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>
            {hasDiscount && (
              <Text style={styles.comparePrice}>
                ₹{product.compare_at_price!.toFixed(2)}
              </Text>
            )}
          </View>

          {/* Add to Cart Button */}
          {onAddToCart && product.stock > 0 && (
            <TouchableOpacity
              style={styles.cartButton}
              onPress={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
            >
              <Ionicons name="cart-outline" size={20} color={colors.surface} />
            </TouchableOpacity>
          )}
        </View>

        {/* Seller Name */}
        {product.seller && (
          <Text style={styles.seller} numberOfLines={1}>
            by {product.seller.company_name}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    overflow: 'hidden',
    elevation: 3, // Android shadow
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1, // Square aspect ratio for consistency
    position: 'relative',
    backgroundColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
  },
  outOfStockBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  outOfStockText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  content: {
    padding: spacing.sm,
    minHeight: 100, // Ensure consistent card height
  },
  name: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 18,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    height: 36, // Fixed height for 2 lines (2 * 18)
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  comparePrice: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  cartButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seller: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
