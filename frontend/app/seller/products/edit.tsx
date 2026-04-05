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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../src/store/authStore';
import { useSellerStore } from '../../../src/store/sellerStore';
import { useProductStore } from '../../../src/store/productStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';

import { Input } from '../../../src/components/ui/Input';
import { uploadMultipleImages } from '../../../src/utils/imageUpload';

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
      // Filter only new images (those starting with 'file://')
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

      // Upload any new images
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size=  "large    " color={colors.primary} />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedProduct) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name=   "alert-circle-outline  " size={64} color={colors.error} />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name= "arrow-back  " size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Product</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.form}>
          {/* Product Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder=  "Enter product name   "
              error={errors.name}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder=  "Enter product description    "
              multiline
              numberOfLines={4}
              error={errors.description}
            />
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price (  u20b9) *</Text>
            <Input
              value={price}
              onChangeText={setPrice}
              placeholder=  "Enter price  "
              keyboardType= "decimal-pad "
              error={errors.price}
            />
          </View>

          {/* Compare Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Compare at Price (   u20b9)</Text>
            <Input
              value={comparePrice}
              onChangeText={setComparePrice}
              placeholder=  "Enter original price (optional)  "
              keyboardType= "decimal-pad "
            />
          </View>

          {/* Stock */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stock Quantity *</Text>
            <Input
              value={stock}
              onChangeText={setStock}
              placeholder=  "Enter stock quantity "
              keyboardType= "number-pad  "
              error={errors.stock}
            />
          </View>

          {/* Product Images */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name= "close-circle    " size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                <Ionicons name= "add-circle-outline  " size={48} color={colors.primary} />
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
              >
                <View style={[styles.switchThumb, isActive && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>Update Product</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.h4,
    color: colors.error,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  form: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
    backgroundColor: colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  addImageText: {
    ...typography.caption,
    color: colors.primary,
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
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: colors.success,
  },
  switchThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
   submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 48,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
