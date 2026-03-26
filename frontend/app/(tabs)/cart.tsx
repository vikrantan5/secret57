import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../src/store/cartStore';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

interface CartItemProps {
  item: any;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string, name: string) => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [isSwiped, setIsSwiped] = React.useState(false);

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
          styles.cartItem,
          {
            opacity,
            transform: [{ translateX }],
          },
        ]}
      >
        <TouchableOpacity onLongPress={handleSwipe} activeOpacity={0.9} style={styles.itemContent}>
          <Image
            source={{ uri: item.image || 'https://via.placeholder.com/100' }}
            style={styles.itemImage}
            contentFit="cover"
            transition={200}
          />

          <View style={styles.itemDetails}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>

            {/* Quantity Controls */}
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(-1)}
              >
                <Ionicons name="remove" size={16} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.quantityValueContainer}>
                <Text style={styles.quantityText}>{item.quantity}</Text>
              </View>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(1)}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.itemRight}>
            <Text style={styles.itemTotal}>₹{(item.price * item.quantity).toFixed(2)}</Text>
            <TouchableOpacity style={styles.removeButton} onPress={handleSwipe}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Delete Action */}
      <View style={styles.deleteAction}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash" size={24} color={colors.surface} />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function CartScreen() {
  const router = useRouter();
  const { items, total, updateQuantity, removeItem, clearCart } = useCartStore();

  const TAX_RATE = 0.18; // 18% GST
  const DELIVERY_CHARGE = items.length > 0 ? (total > 500 ? 0 : 40) : 0;
  const taxAmount = total * TAX_RATE;
  const finalTotal = total + taxAmount + DELIVERY_CHARGE;

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

    Alert.alert('Clear Cart', 'Are you sure you want to remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          clearCart();
        },
      },
    ]);
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <Text style={styles.title}>My Cart</Text>
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
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shopButtonGradient}
            >
              <Ionicons name="storefront-outline" size={24} color={colors.surface} />
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Cart</Text>
            <Text style={styles.itemCount}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearCart}>
            <Ionicons name="trash-outline" size={24} color={colors.surface} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Cart Items */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CartItem item={item} onUpdateQuantity={updateQuantity} onRemove={handleRemoveItem} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Price Breakdown */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Price Details</Text>

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
              <Text style={styles.summaryValueFree}>FREE</Text>
            ) : (
              <Text style={styles.summaryValue}>₹{DELIVERY_CHARGE.toFixed(2)}</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{finalTotal.toFixed(2)}</Text>
          </View>

          {total < 500 && (
            <View style={styles.deliveryInfo}>
              <Ionicons name="information-circle" size={16} color={colors.info} />
              <Text style={styles.deliveryInfoText}>
                Add ₹{(500 - total).toFixed(2)} more to get FREE delivery
              </Text>
            </View>
          )}
        </View>

        {/* Checkout Button */}
        <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkoutGradient}
          >
            <View style={styles.checkoutContent}>
              <View>
                <Text style={styles.checkoutLabel}>Total</Text>
                <Text style={styles.checkoutAmount}>₹{finalTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.checkoutRight}>
                <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                <Ionicons name="arrow-forward" size={24} color={colors.surface} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: '700',
  },
  itemCount: {
    ...typography.bodySmall,
    color: colors.surface,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.lg,
  },
  cartItemWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
    height: 120,
  },
  cartItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    overflow: 'hidden',
  },
  itemContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  itemPrice: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValueContainer: {
    minWidth: 40,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  quantityText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: spacing.sm,
  },
  itemTotal: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  removeButton: {
    padding: spacing.xs,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 70,
    height: '95%',
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  deleteText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  summaryContainer: {
    backgroundColor: colors.surface,
    paddingTop: spacing.lg,
    ...shadows.lg,
  },
  summaryCard: {
    paddingHorizontal: spacing.lg,
  },
  summaryTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  summaryValueFree: {
    ...typography.body,
    color: colors.success,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  totalValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '15',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  deliveryInfoText: {
    ...typography.caption,
    color: colors.info,
    flex: 1,
  },
  checkoutButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
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
    ...typography.bodySmall,
    color: colors.surface,
    opacity: 0.9,
  },
  checkoutAmount: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '700',
  },
  checkoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkoutText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
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
    ...shadows.lg,
  },
  shopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  shopButtonText: {
    ...typography.h4,
    color: colors.surface,
    fontWeight: '700',
  },
});
