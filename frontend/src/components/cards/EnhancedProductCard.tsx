import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
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
/* CHANGES DONE:
- card height reduced 300 → 250
- imageWrapper height reduced 160 → 130
- paddingTop fixed 150 → 120
- top spacing fixed 4 → 6
- content spacing adjusted
*/

const CARD_WIDTH = (width - 32 - 16) / 2;

export const EnhancedProductCard: React.FC<EnhancedProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
  onToggleWishlist,
  isInWishlist = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const hasDiscount =
    product.compare_at_price &&
    product.compare_at_price > product.price;

  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compare_at_price - product.price) /
          product.compare_at_price) *
          100
      )
    : 0;

  const animateIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const addToCart = (e: any) => {
    e.stopPropagation();
    onAddToCart?.();
  };

  const toggleWishlist = (e: any) => {
    e.stopPropagation();
    onToggleWishlist?.();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={1}
        onPress={onPress}
        onPressIn={animateIn}
        onPressOut={animateOut}
      >
        {/* IMAGE */}
        <View style={styles.imageWrapper}>
          <Image
            source={{
              uri:
                product.images?.[0] ||
                "https://via.placeholder.com/200?text=No+Image",
            }}
            style={styles.image}
            contentFit="cover"
          />

          {/* WISHLIST */}
          {onToggleWishlist && (
            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={toggleWishlist}
            >
              <Ionicons
                name={isInWishlist ? "heart" : "heart-outline"}
                size={20}
                color={isInWishlist ? colors.error : "#fff"}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* TEXT CONTENT */}
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>

              {hasDiscount && (
                <Text style={styles.comparePrice}>
                  ₹{product.compare_at_price?.toFixed(2)}
                </Text>
              )}
            </View>

            {onAddToCart && product.stock > 0 && (
              <TouchableOpacity
                style={styles.cartButton}
                onPress={addToCart}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.cartButtonGradient}
                >
                  <Ionicons name="cart-outline" size={18} color="#fff" />
                </LinearGradient>
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
    width: CARD_WIDTH,
    height: 200,          // FIX 1: height reduced
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    paddingTop: 120,      // FIX 2: floating image adjusted
  },

  imageWrapper: {
    width: "90%",
    height: 130,          // FIX 3: image height reduced
    backgroundColor: "#f2f2f2",
    position: "absolute",
    top: 6,               // FIX 4: alignment perfect
    alignSelf: "center",
    borderRadius: 12,
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  wishlistButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    flex: 1,
    
    paddingHorizontal: 10,
    justifyContent: "space-between",
  },

  name: {
    marginTop: 20,
    fontSize: 13,
    fontWeight: "600",
    height: 34,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  price: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },

  comparePrice: {
    fontSize: 11,
    color: "#777",
    textDecorationLine: "line-through",
  },

  cartButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: "hidden",
  },

  cartButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});