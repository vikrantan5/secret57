import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../src/store/cartStore';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/constants/theme';

export default function CartScreen() {
  const router = useRouter();
  const { items, total, updateQuantity, removeItem, clearCart } = useCartStore();

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout');
      return;
    }
    router.push('/checkout' as any);
  };

  const handleRemoveItem = (id: string, name: string) => {
    Alert.alert(
      'Remove Item',
      `Remove ${name} from cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeItem(id) },
      ]
    );
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearCart() },
      ]
    );
  };

  const renderCartItem = ({ item }: any) => (
    <View style={styles.cartItem}>
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/100' }}
        style={styles.itemImage}
        resizeMode="cover"
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
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveItem(item.id, item.name)}
      >
        <Ionicons name="trash-outline" size={20} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cart</Text>
          <TouchableOpacity onPress={handleClearCart}>
            <Ionicons name="trash-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add products to your cart to see them here
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/(tabs)/categories')}
            data-testid="start-shopping-button"
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cart</Text>
          <Text style={styles.itemCount}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleClearCart}>
          <Ionicons name="trash-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Cart Items */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderCartItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₹{total.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery</Text>
          <Text style={styles.summaryValue}>FREE</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          data-testid="proceed-checkout-button"
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.surface} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  itemCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  itemPrice: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  quantityButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'center',
  },
  removeButton: {
    padding: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  shopButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  shopButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalLabel: {
    ...typography.h4,
    color: colors.text,
  },
  totalValue: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  checkoutButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});