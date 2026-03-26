import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Product } from '../../store/productStore';

interface EnhancedProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  onToggleWishlist?: () => void;
  isInWishlist?: boolean;
}

export const EnhancedProductCard: React.FC<EnhancedProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
  onToggleWishlist,
  isInWishlist = false,
}) => {
  const scaleAnim = new Animated.Value(1);

  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleAddToCart = (e: any) => {
    e.stopPropagation();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAddToCart?.();
  };

  const handleWishlistToggle = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleWishlist?.();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.images?.[0] || 'https://via.placeholder.com/200' }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />

          {/* Discount Badge */}
          {hasDiscount && (
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.discountBadge}
            >
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            </LinearGradient>
          )}

          {/* Stock Badge */}
          {product.stock === 0 && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}

          {/* Wishlist Button */}
          {onToggleWishlist && (
            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={handleWishlistToggle}
            >
              <Ionicons
                name={isInWishlist ? 'heart' : 'heart-outline'}
                size={20}
                color={isInWishlist ? colors.error : colors.surface}
              />
            </TouchableOpacity>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.1)']}
            style={styles.imageGradient}
          />
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
              <TouchableOpacity style={styles.cartButton} onPress={handleAddToCart}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cartButtonGradient}
                >
                  <Ionicons name="cart-outline" size={18} color={colors.surface} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Seller Name */}
          {product.seller && (
            <View style={styles.sellerRow}>
              <Ionicons name="storefront-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.seller} numberOfLines={1}>
                {product.seller.company_name}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    ...shadows.md,
    overflow: 'hidden',
    elevation: 4, // Android shadow
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
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    ...shadows.sm,
  },
  discountText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.surface,
    fontWeight: '800',
  },
  outOfStockBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  outOfStockText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  wishlistButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  content: {
    padding: spacing.md,
    minHeight: 110, // Ensure consistent card height
  },
  name: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 18,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
    height: 36, // Fixed height for 2 lines
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
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  comparePrice: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  cartButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  cartButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seller: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
});
