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
import { useCategoryStore, Category } from '../../src/store/categoryStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import {Button} from '../../src/components/ui/Button';
import {Input} from '../../src/components/ui/Input';

export default function CompanySetupScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createSellerProfile, uploadCompanyLogo, uploadVerificationDocument, loading } = useSellerStore();
  const { categories, fetchCategories, loading: categoriesLoading } = useCategoryStore();

  const [companyName, setCompanyName] = useState('');
  const [businessRegNo, setBusinessRegNo] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [documents, setDocuments] = useState<string[]>([]);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    fetchCategories();
  }, []);

  // Request permission and pick image
  const pickImage = async (type: 'logo' | 'document') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'], // ✅ ONLY THIS (no MediaType, no MediaTypeOptions)
  allowsEditing: true,
  aspect: type === 'logo' ? [1, 1] : [4, 3],
  quality: 0.8,
});

    if (!result.canceled && result.assets[0]) {
      if (type === 'logo') {
        setLogoUri(result.assets[0].uri);
      } else {
        setDocuments([...documents, result.assets[0].uri]);
      }
    }
  };

  const validate = () => {
    const newErrors: any = {};

    if (!selectedCategory) newErrors.category = 'Please select a business category';
    if (!companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!state.trim()) newErrors.state = 'State is required';
    if (!pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(pincode)) {
      newErrors.pincode = 'Invalid pincode format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getCategoryTypeLabel = (type: string) => {
    switch (type) {
      case 'booking':
        return '📅 Booking Services';
      case 'ecommerce':
        return '🛍️ E-commerce';
      case 'hybrid':
        return '🔄 Booking + E-commerce';
      default:
        return type;
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please login again.');
      return;
    }

    try {
      // Create seller profile with category
      const result = await createSellerProfile({
        user_id: user.id,
        company_name: companyName,
        business_registration_number: businessRegNo || undefined,
        address,
        city,
        state,
        pincode,
        description: description || undefined,
        category_id: selectedCategory!.id,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create seller profile');
        return;
      }

      // Get the seller ID from the store (it should be set after createSellerProfile)
      const { seller } = useSellerStore.getState();
      
      if (seller) {
        // Upload logo if provided
        if (logoUri) {
          await uploadCompanyLogo(seller.id, logoUri);
        }

        // Upload verification documents
        for (const docUri of documents) {
          await uploadVerificationDocument(seller.id, docUri);
        }
      }

      Alert.alert(
        'Success',
        'Your company profile has been submitted for approval. You will be notified once approved.',
        [{ text: 'OK', onPress: () => router.replace('/seller/pending-approval') }]
      );
    } catch (error: any) {
      console.error('Error submitting company profile:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
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
          <Text style={styles.title}>Company Setup</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.subtitle}>
          Complete your company profile to start selling on ServiceHub
        </Text>

            {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Your Business Category *</Text>
          <Text style={styles.helperText}>
            Choose the category that best describes your business. This will determine your dashboard features.
          </Text>
          
          {categoriesLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory?.id === category.id && styles.categoryCardSelected,
                    shadows.sm,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <View style={[
                    styles.categoryIconBox,
                    selectedCategory?.id === category.id && styles.categoryIconBoxSelected,
                  ]}>
                    <Ionicons 
                      name={category.icon as any} 
                      size={28} 
                      color={selectedCategory?.id === category.id ? colors.white : colors.primary} 
                    />
                  </View>
                  <Text style={[
                    styles.categoryName,
                    selectedCategory?.id === category.id && styles.categoryNameSelected,
                  ]}>
                    {category.name}
                  </Text>
                  <Text style={styles.categoryType}>
                    {getCategoryTypeLabel(category.type)}
                  </Text>
                  <Text style={styles.categoryDescription} numberOfLines={2}>
                    {category.description}
                  </Text>
                  {selectedCategory?.id === category.id && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {errors.category && (
            <Text style={styles.errorText}>{errors.category}</Text>
          )}
        </View>

        {/* Company Logo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Logo</Text>
          <TouchableOpacity
            style={[styles.logoUpload, logoUri && styles.logoUploaded]}
            onPress={() => pickImage('logo')}
          >
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera" size={40} color={colors.textSecondary} />
                <Text style={styles.logoText}>Upload Logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Company Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Details</Text>
          
          <Input
            label="Company Name *"
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Enter your company name"
            error={errors.companyName}
          />

          <Input
            label="Business Registration Number"
            value={businessRegNo}
            onChangeText={setBusinessRegNo}
            placeholder="Optional"
          />

          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of your business"
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Address</Text>
          
          <Input
            label="Address *"
            value={address}
            onChangeText={setAddress}
            placeholder="Street address"
            error={errors.address}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="City *"
                value={city}
                onChangeText={setCity}
                placeholder="City"
                error={errors.city}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="State *"
                value={state}
                onChangeText={setState}
                placeholder="State"
                error={errors.state}
              />
            </View>
          </View>

          <Input
            label="Pincode *"
            value={pincode}
            onChangeText={setPincode}
            placeholder="6-digit pincode"
            keyboardType="numeric"
            maxLength={6}
            error={errors.pincode}
          />
        </View>

        {/* Verification Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Documents (Optional)</Text>
          <Text style={styles.helperText}>
            Upload business license, GST certificate, or any verification documents
          </Text>

          <View style={styles.documentsContainer}>
            {documents.map((doc, index) => (
              <View key={index} style={styles.documentItem}>
                <Image source={{ uri: doc }} style={styles.documentImage} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => setDocuments(documents.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addDocumentButton}
              onPress={() => pickImage('document')}
            >
              <Ionicons name="add-circle" size={32} color={colors.primary} />
              <Text style={styles.addDocumentText}>Add Document</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.footer}>
          <Button
            title="Submit for Approval"
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
            fullWidth
          />
        </View>
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
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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
  logoUpload: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    alignSelf: 'center',
  },
  logoUploaded: {
    borderStyle: 'solid',
    borderColor: colors.primary,
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
  },
  logoText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  documentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  documentItem: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  documentImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  addDocumentButton: {
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
  addDocumentText: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  categoriesGrid: {
    gap: spacing.md,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  categoryIconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  categoryIconBoxSelected: {
    backgroundColor: colors.primary,
  },
  categoryName: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  categoryNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  categoryType: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontSize: 11,
  },
  categoryDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
