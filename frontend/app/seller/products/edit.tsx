import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../src/store/authStore';
import { useSellerStore } from '../../../src/store/sellerStore';
import { useProductStore } from '../../../src/store/productStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';

import { Input } from '../../../src/components/ui/Input';
import { uploadMultipleImages } from '../../../src/utils/imageUpload';

const { width } = Dimensions.get('window');

export default function EditProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = params.id as string;
  
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { selectedProduct, fetchProductById, updateProduct } = useProductStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [stock, setStock] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      setInitialLoading(true);
      await fetchProductById(productId);
    } catch (error) {
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      setName(selectedProduct.name || '');
      setDescription(selectedProduct.description || '');
      setPrice(selectedProduct.price?.toString() || '');
      setComparePrice(selectedProduct.compare_at_price?.toString() || '');
      setStock(selectedProduct.stock?.toString() || '');
      setImages(selectedProduct.images || []);
      setIsActive(selectedProduct.is_active ?? true);
    }
  }, [selectedProduct]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors: any = {};

    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!price || parseFloat(price) <= 0) newErrors.price = 'Valid price is required';
    if (!stock || parseInt(stock) < 0) newErrors.stock = 'Valid stock quantity is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadProductImages = async (sellerId: string): Promise<string[]> => {
    try {
      const newImages = images.filter(img => img.startsWith('file://'));
      const existingImages = images.filter(img => !img.startsWith('file://'));

      if (newImages.length === 0) {
        return existingImages;
      }

      console.log(`Uploading ${newImages.length} new images...`);
      const uploadedUrls = await uploadMultipleImages(newImages, sellerId, 'products');

      if (uploadedUrls.length > 0) {
        console.log(`Successfully uploaded ${uploadedUrls.length} images`);
      }

      return [...existingImages, ...uploadedUrls];
    } catch (error) {
      console.error('Error uploading product images:', error);
      return images.filter(img => !img.startsWith('file://'));
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly.');
      return;
    }

    if (!seller?.id) {
      Alert.alert('Error', 'Seller profile not found.');
      return;
    }

    try {
      setLoading(true);

      const imageUrls = await uploadProductImages(seller.id);

      const updateData = {
        name,
        description,
        price: parseFloat(price),
        compare_at_price: comparePrice ? parseFloat(comparePrice) : null,
        stock: parseInt(stock),
        images: imageUrls,
        is_active: isActive,
      };

      const result = await updateProduct(productId, updateData);

      if (result.success) {
        Alert.alert('Success', 'Product updated successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to update product');
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading product...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!selectedProduct) {
    return (
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <LinearGradient
              colors={['#1a1a1a', '#0a0a0a']}
              style={styles.errorIconContainer}
            >
              <Ionicons name="alert-circle-outline" size={80} color="#f59e0b" />
            </LinearGradient>
            <Text style={styles.errorText}>Product not found</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.errorButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                <Text style={styles.backButtonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

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
            <Text style={styles.title}>Edit Product</Text>
            <View style={{ width: 40 }} />
          </View>
        </BlurView>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <LinearGradient
            colors={['#1e1e1e', '#161616']}
            style={styles.formCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Product Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Enter product name"
                error={errors.name}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Enter product description"
                multiline
                numberOfLines={4}
                error={errors.description}
              />
            </View>

            {/* Price and Compare Price Row */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Price (₹) *</Text>
                <Input
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Enter price"
                  keyboardType="decimal-pad"
                  error={errors.price}
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>Compare Price (₹)</Text>
                <Input
                  value={comparePrice}
                  onChangeText={setComparePrice}
                  placeholder="Original price"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Stock */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Stock Quantity *</Text>
              <Input
                value={stock}
                onChangeText={setStock}
                placeholder="Enter stock quantity"
                keyboardType="number-pad"
                error={errors.stock}
              />
            </View>

            {/* Product Images */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Images</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.imageScroll}
              >
                {images.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: image }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['#ef4444', '#dc2626']}
                        style={styles.removeGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="close" size={16} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addImageButton} onPress={pickImages} activeOpacity={0.7}>
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.addImageGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="add" size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.addImageText}>Add Image</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Active Status */}
            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.label}>Product Status</Text>
                  <Text style={styles.hint}>
                    {isActive ? 'Product is visible to customers' : 'Product is hidden'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.switch, isActive && styles.switchActive]}
                  onPress={() => setIsActive(!isActive)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.switchThumb, isActive && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#374151', '#374151'] : ['#6366f1', '#8b5cf6']}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Update Product</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
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
  scrollContent: {
    paddingTop: 100,
    paddingBottom: spacing.xxl,
  },
  formCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  errorButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  errorButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  halfInput: {
    flex: 1,
  },
  imageScroll: {
    marginTop: spacing.sm,
  },
  imageContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  removeGradient: {
    padding: 4,
    borderRadius: 12,
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addImageGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: '#a78bfa',
    marginTop: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#10b981',
  },
  switchThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  submitButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});