// src/components/cards/EnhancedProductCard.tsx
import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "../../constants/theme";
import { Product } from "../../store/productStore";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2; // 2 columns with 16px gap on each side

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
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const cartScale = useRef(new Animated.Value(1)).current;

  const hasDiscount =
    product.compare_at_price &&
    product.compare_at_price > product.price;

  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compare_at_price! - product.price) /
          product.compare_at_price!) *
          100
      )
    : 0;

  const animateIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const addToCart = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.sequence([
      Animated.spring(cartScale, {
        toValue: 0.8,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(cartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    
    onAddToCart?.();
  };

  const toggleWishlist = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.3,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    
    onToggleWishlist?.();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: CARD_WIDTH }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={animateIn}
        onPressOut={animateOut}
      >
        {/* Premium Gradient Border */}
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        />

        {/* IMAGE SECTION */}
        <View style={styles.imageWrapper}>
          <Image
            source={{
              uri:
                product.images?.[0] ||
                "https://via.placeholder.com/200?text=No+Image",
            }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />

          {/* Discount Badge */}
          {hasDiscount && (
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.discountBadge}
            >
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            </LinearGradient>
          )}

          {/* Stock Badge */}
          {product.stock === 0 && (
            <LinearGradient
              colors={['#6B7280', '#4B5563']}
              style={styles.stockBadge}
            >
              <Text style={styles.stockText}>Out of Stock</Text>
            </LinearGradient>
          )}

          {/* Wishlist Button */}
          {onToggleWishlist && (
            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={toggleWishlist}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <LinearGradient
                  colors={isInWishlist ? ['#EF4444', '#DC2626'] : ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.3)']}
                  style={styles.wishlistGradient}
                >
                  <Ionicons
                    name={isInWishlist ? "heart" : "heart-outline"}
                    size={16}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>

        {/* CONTENT SECTION */}
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>
              {hasDiscount && (
                <Text style={styles.comparePrice}>
                  ₹{product.compare_at_price?.toFixed(2)}
                </Text>
              )}
            </View>

            {/* Add to Cart Button */}
            {onAddToCart && product.stock > 0 && (
              <TouchableOpacity
                style={styles.cartButton}
                onPress={addToCart}
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ scale: cartScale }] }}>
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cartButtonGradient}
                  >
                    <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 1,
  },
  imageWrapper: {
    position: 'relative',
    height: 140,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 2,
  },
  discountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stockBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 2,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  wishlistGradient: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 18,
    minHeight: 36,
    marginBottom: 8,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: {
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  comparePrice: {
    fontSize: 10,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  cartButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cartButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});