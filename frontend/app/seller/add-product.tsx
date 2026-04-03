import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useProductStore } from '../../src/store/productStore';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { useBankAccountStore } from '../../src/store/bankAccountStore';

import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { supabase } from '../../src/services/supabase';
import { uploadMultipleImages } from '../../src/utils/imageUpload';
export default function AddProductScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { createProduct } = useProductStore();
  const { currentSubscription, fetchSellerSubscriptions, loading: subscriptionLoading } = useSubscriptionStore();
  const { bankAccounts, fetchBankAccounts, loading: bankLoading } = useBankAccountStore();


  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [stock, setStock] = useState('');

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});


  
  // Check subscription and bank account
  useEffect(() => {
    if (seller?.id) {
      fetchSellerSubscriptions(seller.id);
      fetchBankAccounts(seller.id);
    }
  }, [seller?.id]);

  const hasActiveSubscription = currentSubscription && new Date(currentSubscription.expires_at) > new Date();
  const hasBankAccount = bankAccounts.length > 0;
  const verifiedBankAccount = bankAccounts.find(acc => acc.verification_status === 'verified');


  // No longer need to fetch categories or manage categoryId state

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

  const uploadProductImages = async (sellerId: string) => {
    try {
      // Use centralized upload utility
      const uploadedUrls = await uploadMultipleImages(
        images,
        'product-images',
        sellerId // Organize by seller ID
      );

      if (uploadedUrls.length === 0) {
        console.warn('No images were uploaded successfully');
      } else {
        console.log(`Successfully uploaded ${uploadedUrls.length} images`);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading product images:', error);
      return [];
    }
  };

  const validate = () => {
    const newErrors: any = {};

    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!price || parseFloat(price) <= 0) newErrors.price = 'Valid price is required';
    if (!stock || parseInt(stock) < 0) newErrors.stock = 'Valid stock is required';
  
    // Category is auto-assigned from seller, no validation needed


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly.');
      return;
    }

    if (!seller?.id) {
      Alert.alert('Error', 'Seller profile not found. Please complete your profile first.');
      return;
    }
    
        if (!seller?.category_id) {
      Alert.alert('Error', 'Your seller category is not set. Please contact support.');
      return;
    }
    try {
      setLoading(true);

      // Upload images first
      const imageUrls = await uploadProductImages(seller.id);

      // Create slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const productData = {
        seller_id: seller.id,
        category_id: seller.category_id, // Auto-assign from seller's category
        name,
        slug,
        description,
        price: parseFloat(price),
        compare_at_price: comparePrice ? parseFloat(comparePrice) : null,
        stock: parseInt(stock),
        images: imageUrls,
        is_active: true,
        is_featured: false,
      };

      const result = await createProduct(productData);

      if (result.success) {
        Alert.alert('Success', 'Product added successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create product');
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Product</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Subscription & Bank Account Check */}
        {(subscriptionLoading || bankLoading) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Checking requirements...</Text>
          </View>
        ) : !hasActiveSubscription || !verifiedBankAccount ? (
          <View style={styles.restrictionContainer}>
            <Ionicons name="alert-circle" size={64} color={colors.warning} />
            <Text style={styles.restrictionTitle}>Requirements Not Met</Text>
            
            {!hasActiveSubscription && (
              <View style={styles.requirementCard}>
                <Ionicons name="close-circle" size={24} color={colors.error} />
                <View style={styles.requirementText}>
                  <Text style={styles.requirementTitle}>Active Subscription Required</Text>
                  <Text style={styles.requirementDesc}>
                    You need an active subscription to add products
                  </Text>
                </View>
              </View>
            )}

            {!verifiedBankAccount && (
              <View style={styles.requirementCard}>
                <Ionicons name="close-circle" size={24} color={colors.error} />
                <View style={styles.requirementText}>
                  <Text style={styles.requirementTitle}>Verified Bank Account Required</Text>
                  <Text style={styles.requirementDesc}>
                    Add and verify your bank account to receive payments
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.actionButtons}>
              {!hasActiveSubscription && (
                <Button
                  title="View Subscription Plans"
                  onPress={() => router.push('/seller/subscription')}
                  variant="primary"
                  style={styles.actionButton}
                />
              )}
              {!verifiedBankAccount && (
                <Button
                  title="Add Bank Account"
                  onPress={() => router.push('/seller/payout-settings')}
                  variant="outline"
                  style={styles.actionButton}
                />
              )}
            </View>
          </View>
        ) : (
          <>
            {/* Product Images */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Images</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imagesContainer}>
                  {images.map((image, index) => (
                    <View key={index} style={styles.imageItem}>
                      <Image source={{ uri: image }} style={styles.productImage} />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                    <Ionicons name="add-circle" size={32} color={colors.primary} />
                    <Text style={styles.addImageText}>Add Images</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
             {/* Product Details */}
        <View style={styles.section}>
          <Input
            label="Product Name *"
            value={name}
            onChangeText={setName}
            placeholder="Enter product name"
            error={errors.name}
          />

          <Input
            label="Description *"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your product"
            multiline
            numberOfLines={4}
            style={styles.textArea}
            error={errors.description}
          />

          <Input
            label="Price (₹) *"
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.price}
          />

          <Input
            label="Compare at Price (₹)"
            value={comparePrice}
            onChangeText={setComparePrice}
            placeholder="Optional"
            keyboardType="decimal-pad"
          />

          <Input
            label="Stock *"
            value={stock}
            onChangeText={setStock}
            placeholder="Available quantity"
            keyboardType="number-pad"
            error={errors.stock}
          />

       
        </View>

        {/* Submit Button */}
        <View style={styles.footer}>
          <Button
            title="Add Product"
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
            fullWidth
          />
        </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  imageItem: {
    position: 'relative',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addImageText: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
    loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  restrictionContainer: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  restrictionTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  requirementCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    width: '100%',
    ...shadows.sm,
  },
  requirementText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  requirementTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  requirementDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  actionButtons: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
});