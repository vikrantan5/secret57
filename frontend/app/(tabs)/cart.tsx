import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useCartStore } from '../../src/store/cartStore';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/constants/theme';
import { calculateOrderSummary, FREE_DELIVERY_THRESHOLD } from '../../src/utils/pricing';

const { width } = Dimensions.get('window');

interface CartItemProps {
  item: any;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string, name: string) => void;
  index: number;
}

const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove, index }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [isSwiped, setIsSwiped] = React.useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSwipe = () => {
    if (!isSwiped) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.spring(translateX, {
        toValue: -80,
        useNativeDriver: true,
      }).start();
      setIsSwiped(true);
    } else {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      setIsSwiped(false);
    }
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove(item.id, item.name);
    });
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) {
      onRemove(item.id, item.name);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  return (
    <View style={styles.cartItemWrapper}>
      <Animated.View
        style={[
          styles.cartItemContainer,
          {
            opacity,
            transform: [{ translateX }, { scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F9FAFB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cartItem}
        >
          <TouchableOpacity onLongPress={handleSwipe} activeOpacity={0.95} style={styles.itemContent}>
            {/* Premium Image Container */}
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: item.image || 'https://via.placeholder.com/100' }}
                style={styles.itemImage}
                contentFit="cover"
                transition={200}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.2)']}
                style={styles.imageOverlay}
              />
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-15%</Text>
              </View>
            </View>

            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.originalPrice}>₹{(item.price * 1.15).toFixed(2)}</Text>
                <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
              </View>

              {/* Premium Quantity Controls */}
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(-1)}
                >
                  <LinearGradient
                    colors={['#F3F4F6', '#E5E7EB']}
                    style={styles.quantityButtonGradient}
                  >
                    <Ionicons name="remove" size={14} color="#8B5CF6" />
                  </LinearGradient>
                </TouchableOpacity>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.quantityValueContainer}
                >
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                </LinearGradient>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(1)}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    style={styles.quantityButtonGradientAdd}
                  >
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.itemRight}>
              <LinearGradient
                colors={['#1E1B4B', '#312E81']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.totalPriceContainer}
              >
                <Text style={styles.itemTotal}>₹{(item.price * item.quantity).toFixed(2)}</Text>
              </LinearGradient>
              <TouchableOpacity style={styles.moreButton} onPress={handleSwipe}>
                <Feather name="more-horizontal" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* Premium Delete Action */}
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.deleteAction}
      >
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
          <Text style={styles.deleteText}>Remove</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

export default function CartScreen() {
  const router = useRouter();
  const { items, total, updateQuantity, removeItem, clearCart } = useCartStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const summary = calculateOrderSummary(items);
  const taxAmount = summary.gst;
  const DELIVERY_CHARGE = summary.deliveryCharge;
  const finalTotal = summary.totalAmount;

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/checkout' as any);
  };

  const handleRemoveItem = (id: string, name: string) => {
    removeItem(id);
  };

  const handleClearCart = () => {
    if (items.length === 0) return;

    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cart',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearCart();
          },
        },
      ]
    );
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Premium Header */}
        <LinearGradient
          colors={['#1E1B4B', '#312E81', '#4C1D95']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>My Cart</Text>
            <View style={styles.placeholderButton} />
          </View>
        </LinearGradient>

        <EmptyState
          title="Your cart is empty"
          message="Add products to your cart to see them here"
          type="cart"
        />

        <View style={styles.emptyActions}>
          <TouchableOpacity
            style={styles.shopButtonEmpty}
            onPress={() => router.push('/(tabs)/categories')}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shopButtonGradient}
            >
              <Ionicons name="storefront-outline" size={24} color="#FFFFFF" />
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4C1D95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>My Cart</Text>
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCount}>
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearCart}>
            <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Cart Items */}
      <Animated.FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <CartItem
            item={item}
            index={index}
            onUpdateQuantity={updateQuantity}
            onRemove={handleRemoveItem}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      />

      {/* Premium Price Breakdown */}
      <Animated.View style={[styles.summaryContainer, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#FFFFFF', '#F9FAFB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Price Details</Text>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.savingsBadge}
            >
              <Ionicons name="wallet-outline" size={14} color="#10B981" />
              <Text style={styles.savingsText}>Save ₹{(total * 0.1).toFixed(2)}</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{total.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (18% GST)</Text>
            <Text style={styles.summaryValue}>₹{taxAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charges</Text>
            {DELIVERY_CHARGE === 0 ? (
              <View style={styles.freeBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.summaryValueFree}>FREE</Text>
              </View>
            ) : (
              <Text style={styles.summaryValue}>₹{DELIVERY_CHARGE.toFixed(2)}</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <LinearGradient
              colors={['#1E1B4B', '#312E81']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.totalAmountContainer}
            >
              <Text style={styles.totalValue}>₹{finalTotal.toFixed(2)}</Text>
            </LinearGradient>
          </View>

          {total < FREE_DELIVERY_THRESHOLD && (
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.deliveryInfo}
            >
              <Ionicons name="information-circle" size={18} color="#92400E" />
              <Text style={styles.deliveryInfoText}>
                Add ₹{(FREE_DELIVERY_THRESHOLD - total).toFixed(2)} more to get FREE delivery
              </Text>
            </LinearGradient>
          )}
        </LinearGradient>

        {/* Premium Checkout Button */}
        <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkoutGradient}
          >
            <View style={styles.checkoutContent}>
              <View>
                <Text style={styles.checkoutLabel}>Total Amount</Text>
                <Text style={styles.checkoutAmount}>₹{finalTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.checkoutRight}>
                <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                <View style={styles.checkoutIconCircle}>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  itemCountBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.md,
  },
  itemCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderButton: {
    width: 40,
    height: 40,
  },
  listContent: {
    padding: spacing.lg,
  },
  cartItemWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
    minHeight: 130,
  },
  cartItemContainer: {
    position: 'relative',
    zIndex: 2,
  },
  cartItem: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  itemContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  imageWrapper: {
    position: 'relative',
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: '#F3F4F6',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  quantityButtonGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonGradientAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValueContainer: {
    minWidth: 48,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: spacing.sm,
  },
  totalPriceContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreButton: {
    padding: spacing.xs,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  summaryContainer: {
    marginTop: spacing.md,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryValueFree: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalAmountContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  deliveryInfoText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
    flex: 1,
  },
  checkoutButton: {
    margin: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  checkoutGradient: {
    padding: spacing.md,
  },
  checkoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkoutLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  checkoutAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  checkoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkoutIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActions: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
  },
  shopButtonEmpty: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  shopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  shopButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});