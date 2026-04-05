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
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useProductStore } from '../../src/store/productStore';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { useBankAccountStore } from '../../src/store/bankAccountStore';

import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { supabase } from '../../src/services/supabase';
import { uploadMultipleImages } from '../../src/utils/imageUpload';

// Premium Professional Color Palette
const colors = {
  background: '#0B0C10',
  surface: '#13151A',
  surfaceElevated: '#1A1D24',
  surfaceHigher: '#22262F',
  
  textPrimary: '#FFFFFF',
  textSecondary: '#C0C5D0',
  textTertiary: '#A0A5B5',
  textMuted: '#6B7280',
  
  accentPrimary: '#2463EB',
  accentPrimaryLight: '#4B82F5',
  accentPrimaryGlow: '#2463EB20',
  
  accentSuccess: '#00D26A',
  accentSuccessGlow: '#00D26A10',
  
  accentWarning: '#FFB443',
  accentWarningGlow: '#FFB44310',
  
  accentError: '#FF5C8A',
  accentErrorGlow: '#FF5C8A10',
  
  accentPurple: '#7C5CFF',
  border: '#1E222A',
};

const gradients = {
  primary: ['#2463EB', '#1A4FCC'],
  success: ['#00D26A', '#00A855'],
  warning: ['#FFB443', '#E69900'],
  error: ['#FF5C8A', '#E63E6C'],
  card: ['#13151A', '#0F1116'],
  header: ['#0B0C10', '#13151A'],
};

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
      const uploadedUrls = await uploadMultipleImages(
        images,
        'product-images',
        sellerId
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

      const imageUrls = await uploadProductImages(seller.id);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const productData = {
        seller_id: seller.id,
        category_id: seller.category_id,
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

  // Custom Label Component with white text
  const CustomLabel = ({ text, required }: { text: string; required?: boolean }) => (
    <Text style={styles.customLabel}>
      {text} {required && <Text style={styles.requiredStar}>*</Text>}
    </Text>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={gradients.header}
        style={styles.gradientBackground}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <LinearGradient
                colors={[colors.surfaceElevated, colors.surface]}
                style={styles.backButtonGradient}
              >
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.title}>Add Product</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Subscription & Bank Account Check */}
          {(subscriptionLoading || bankLoading) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accentPrimary} />
              <Text style={styles.loadingText}>Checking requirements...</Text>
            </View>
          ) : !hasActiveSubscription || !verifiedBankAccount ? (
            <View style={styles.restrictionContainer}>
              <LinearGradient
                colors={[colors.surface, colors.surfaceElevated]}
                style={styles.restrictionIconContainer}
              >
                <Ionicons name="alert-circle" size={48} color={colors.accentWarning} />
              </LinearGradient>
              <Text style={styles.restrictionTitle}>Requirements Not Met</Text>
              <Text style={styles.restrictionSubtitle}>Complete these to start selling</Text>
              
              {!hasActiveSubscription && (
                <LinearGradient
                  colors={[colors.surface, colors.surfaceElevated]}
                  style={styles.requirementCard}
                >
                  <LinearGradient
                    colors={gradients.warning}
                    style={styles.requirementIcon}
                  >
                    <Ionicons name="close-circle" size={20} color="#FFF" />
                  </LinearGradient>
                  <View style={styles.requirementText}>
                    <Text style={styles.requirementTitle}>Active Subscription Required</Text>
                    <Text style={styles.requirementDesc}>
                      You need an active subscription to add products
                    </Text>
                  </View>
                </LinearGradient>
              )}

              {!verifiedBankAccount && (
                <LinearGradient
                  colors={[colors.surface, colors.surfaceElevated]}
                  style={styles.requirementCard}
                >
                  <LinearGradient
                    colors={gradients.error}
                    style={styles.requirementIcon}
                  >
                    <Ionicons name="close-circle" size={20} color="#FFF" />
                  </LinearGradient>
                  <View style={styles.requirementText}>
                    <Text style={styles.requirementTitle}>Verified Bank Account Required</Text>
                    <Text style={styles.requirementDesc}>
                      Add and verify your bank account to receive payments
                    </Text>
                  </View>
                </LinearGradient>
              )}

              <View style={styles.actionButtons}>
                {!hasActiveSubscription && (
                  <TouchableOpacity
                    onPress={() => router.push('/seller/subscription')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={gradients.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionButtonText}>View Subscription Plans</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                {!verifiedBankAccount && (
                  <TouchableOpacity
                    onPress={() => router.push('/seller/payout-settings')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.surfaceElevated, colors.surface]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.actionButton, styles.outlineButton]}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.accentPrimary }]}>Add Bank Account</Text>
                      <Ionicons name="arrow-forward" size={18} color={colors.accentPrimary} />
                    </LinearGradient>
                  </TouchableOpacity>
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
                          <LinearGradient
                            colors={gradients.error}
                            style={styles.removeButtonGradient}
                          >
                            <Ionicons name="close" size={14} color="#FFF" />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                      <LinearGradient
                        colors={[colors.surfaceElevated, colors.surface]}
                        style={styles.addImageGradient}
                      >
                        <Ionicons name="add-circle" size={32} color={colors.accentPrimary} />
                        <Text style={styles.addImageText}>Add Images</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>

              {/* Product Details with Custom Labels */}
              <View style={styles.section}>
                {/* Product Name */}
                <View style={styles.inputWrapper}>
                  <CustomLabel text="Product Name" required />
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter product name"
                    error={errors.name}
                  />
                </View>

                {/* Description */}
                <View style={styles.inputWrapper}>
                  <CustomLabel text="Description" required />
                  <Input
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe your product"
                    multiline
                    numberOfLines={4}
                    style={styles.textArea}
                    error={errors.description}
                  />
                </View>

                {/* Price */}
                <View style={styles.inputWrapper}>
                  <CustomLabel text="Price (₹)" required />
                  <Input
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    error={errors.price}
                  />
                </View>

                {/* Compare at Price */}
                <View style={styles.inputWrapper}>
                  <CustomLabel text="Compare at Price (₹)" />
                  <Input
                    value={comparePrice}
                    onChangeText={setComparePrice}
                    placeholder="Optional"
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Stock */}
                <View style={styles.inputWrapper}>
                  <CustomLabel text="Stock" required />
                  <Input
                    value={stock}
                    onChangeText={setStock}
                    placeholder="Available quantity"
                    keyboardType="number-pad"
                    error={errors.stock}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <View style={styles.footer}>
                <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
                  <LinearGradient
                    colors={gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButton}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Text style={styles.submitButtonText}>Add Product</Text>
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imageItem: {
    position: 'relative',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    overflow: 'hidden',
    borderRadius: 12,
  },
  removeButtonGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  addImageGradient: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 11,
    color: colors.accentPrimary,
    marginTop: 6,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  restrictionContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
  },
  restrictionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  restrictionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  restrictionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  requirementCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  requirementIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requirementText: {
    flex: 1,
  },
  requirementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  requirementDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionButtons: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.accentPrimary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Custom Label Styles
  customLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF', // White text for labels
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  requiredStar: {
    color: '#FF5C8A', // Red/pink color for required star
  },
  inputWrapper: {
    marginBottom: 16,
  },
});