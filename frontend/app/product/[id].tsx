import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../src/store/productStore';
import { useCartStore } from '../../src/store/cartStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = params.id as string;
  
  const { selectedProduct, loading, fetchProductById } = useProductStore();
  const { addItem } = useCartStore();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (productId) {
      fetchProductById(productId);
    }
  }, [productId]);

  if (loading || !selectedProduct) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const product = selectedProduct;
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image: product.images?.[0],
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="heart-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(index);
            }}
          >
            {product.images?.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Image Indicators */}
          {product.images && product.images.length > 1 && (
            <View style={styles.indicators}>
              {product.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === activeImageIndex && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.content}>
          <Text style={styles.productName}>{product.name}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>
            {hasDiscount && (
              <Text style={styles.comparePrice}>
                ₹{product.compare_at_price!.toFixed(2)}
              </Text>
            )}
          </View>

          {/* Stock Status */}
          <View style={styles.stockContainer}>
            <Ionicons
              name={product.stock > 0 ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={product.stock > 0 ? colors.success : colors.error}
            />
            <Text style={[
              styles.stockText,
              { color: product.stock > 0 ? colors.success : colors.error }
            ]}>
              {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
            </Text>
          </View>

          {/* Seller Info */}
          {product.seller && (
            <View style={styles.sellerCard}>
              <View style={styles.sellerInfo}>
                <Ionicons name="storefront" size={20} color={colors.primary} />
                <View style={styles.sellerDetails}>
                  <Text style={styles.sellerLabel}>Sold by</Text>
                  <Text style={styles.sellerName}>{product.seller.company_name}</Text>
                </View>
              </View>
              <TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Product Details */}
          {(product.sku || product.weight || product.dimensions) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Details</Text>
              {product.sku && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SKU:</Text>
                  <Text style={styles.detailValue}>{product.sku}</Text>
                </View>
              )}
              {product.weight && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Weight:</Text>
                  <Text style={styles.detailValue}>{product.weight} kg</Text>
                </View>
              )}
              {product.dimensions && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dimensions:</Text>
                  <Text style={styles.detailValue}>{product.dimensions}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      {product.stock > 0 && (
        <View style={styles.bottomBar}>
          {/* Quantity Selector */}
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity
            style={styles.addToCartButton}
            onPress={handleAddToCart}
          >
            <Ionicons name="cart" size={20} color={colors.surface} />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  imageGallery: {
    position: 'relative',
  },
  productImage: {
    width: width,
    height: width,
  },
  indicators: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface + '60',
  },
  activeIndicator: {
    backgroundColor: colors.surface,
    width: 24,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  discountText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
  content: {
    padding: spacing.lg,
  },
  productName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  price: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  comparePrice: {
    ...typography.h4,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  stockText: {
    ...typography.body,
    fontWeight: '600',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sellerDetails: {
    gap: spacing.xs,
  },
  sellerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sellerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  quantityButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...typography.h4,
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  addToCartText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
