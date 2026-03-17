import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useServiceStore } from '../../src/store/serviceStore';
import { useCategoryStore } from '../../src/store/categoryStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

export default function AddServiceScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { createService } = useServiceStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const validate = () => {
    const newErrors: any = {};

    if (!name.trim()) newErrors.name = 'Service name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!basePrice || parseFloat(basePrice) <= 0) newErrors.basePrice = 'Valid price is required';
    if (!categoryId) newErrors.category = 'Category is required';

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

    try {
      setLoading(true);

      const serviceData = {
        seller_id: seller.id,
        category_id: categoryId,
        name,
        description,
price: parseFloat(basePrice),
        duration: duration ? parseInt(duration) : null,
        is_active: true,
      };

      const result = await createService(serviceData);

      if (result.success) {
        Alert.alert('Success', 'Service added successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create service');
      }
    } catch (error: any) {
      console.error('Error creating service:', error);
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
          <Text style={styles.title}>Add Service</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Service Details */}
        <View style={styles.section}>
          <Input
            label="Service Name *"
            value={name}
            onChangeText={setName}
            placeholder="Enter service name"
            error={errors.name}
          />

          <Input
            label="Description *"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your service"
            multiline
            numberOfLines={4}
            style={styles.textArea}
            error={errors.description}
          />

          <Input
            label="Base Price (₹) *"
            value={basePrice}
            onChangeText={setBasePrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.basePrice}
          />

          <Input
            label="Duration (minutes)"
            value={duration}
            onChangeText={setDuration}
            placeholder="Optional"
            keyboardType="number-pad"
          />

          {/* Category Selection */}
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    categoryId === cat.id && styles.categoryChipSelected,
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      categoryId === cat.id && styles.categoryTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>

        {/* Submit Button */}
        <View style={styles.footer}>
          <Button
            title="Add Service"
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
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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
  categoryContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    ...typography.body,
    color: colors.text,
  },
  categoryTextSelected: {
    color: colors.white,
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
});