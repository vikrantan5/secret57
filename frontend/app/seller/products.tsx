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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useProductStore } from '../../src/store/productStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

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
              loadProducts();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>My Products</Text>
            <TouchableOpacity
              onPress={() => router.push('/seller/add-product' as any)}
              style={styles.addButton}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
        >
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#1a1a1a', '#0a0a0a']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="cube-outline" size={80} color="#6366f1" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptySubtitle}>
                Start adding products to showcase your offerings
              </Text>
              <TouchableOpacity
                style={styles.addProductButton}
                onPress={() => router.push('/seller/add-product' as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.addProductGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.addProductButtonText}>Add First Product</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.productList}>
              {products.map((product, index) => (
                <TouchableOpacity
                  key={product.id}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/seller/products/edit?id=${product.id}` as any)}
                >
                  <LinearGradient
                    colors={['#1e1e1e', '#161616']}
                    style={styles.productCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {/* Product Image */}
                    {product.images && product.images.length > 0 ? (
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: product.images[0] }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.6)']}
                          style={styles.imageOverlay}
                        />
                      </View>
                    ) : (
                      <LinearGradient
                        colors={['#6366f1', '#8b5cf6']}
                        style={styles.productImagePlaceholder}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="cube-outline" size={32} color="#FFFFFF" />
                      </LinearGradient>
                    )}

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      
                      <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
                      
                      <View style={styles.productMeta}>
                        <View style={styles.stockContainer}>
                          <Ionicons name="archive-outline" size={12} color="#6b7280" />
                          <Text style={styles.productStock}>
                            Stock: {product.stock}
                          </Text>
                        </View>
                        
                        <View
                          style={[
                            styles.statusBadge,
                            product.is_active ? styles.activeBadge : styles.inactiveBadge,
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              product.is_active ? styles.activeDot : styles.inactiveDot,
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              product.is_active ? styles.activeText : styles.inactiveText,
                            ]}
                          >
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.productActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/seller/products/edit?id=${product.id}` as any)}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                          style={styles.actionGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="create-outline" size={20} color="#a78bfa" />
                        </LinearGradient>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteProduct(product.id, product.name)}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.15)']}
                          style={styles.actionGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="trash-outline" size={20} color="#f87171" />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  addProductButton: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  addProductGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  addProductButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  productList: {
    padding: spacing.lg,
  },
  productCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#a78bfa',
    marginBottom: spacing.xs,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.sm,
  },
  productStock: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: '#10b981',
  },
  inactiveDot: {
    backgroundColor: '#6b7280',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeText: {
    color: '#10b981',
  },
  inactiveText: {
    color: '#9ca3af',
  },
  productActions: {
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});