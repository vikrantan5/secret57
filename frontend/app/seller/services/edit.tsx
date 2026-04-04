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
import { useServiceStore } from '../../../src/store/serviceStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { uploadMultipleImages } from '../../../src/utils/imageUpload';
import { isValidYouTubeUrl } from '../../../src/utils/youtubeHelper';

export default function EditServiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const serviceId = params.id as string;
  
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { selectedService, fetchServiceById, updateService } = useServiceStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [locationType, setLocationType] = useState<'visit_customer' | 'customer_visits' | 'both'>('visit_customer');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (serviceId) {
      loadService();
    }
  }, [serviceId]);

  const loadService = async () => {
    try {
      setInitialLoading(true);
      await fetchServiceById(serviceId);
    } catch (error) {
      Alert.alert('Error', 'Failed to load service details');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (selectedService) {
      setName(selectedService.name || '');
      setDescription(selectedService.description || '');
      setBasePrice(selectedService.price?.toString() || '');
      setDuration(selectedService.duration?.toString() || '');
      setVideoUrl(selectedService.video_url || '');
      setImages(selectedService.images || []);
      setLocationType(selectedService.location_type || 'visit_customer');
      setIsActive(selectedService.is_active ?? true);
    }
  }, [selectedService]);

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
    if (!name.trim()) newErrors.name = 'Service name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!basePrice || parseFloat(basePrice) <= 0) newErrors.basePrice = 'Valid price is required';
    if (videoUrl && !isValidYouTubeUrl(videoUrl)) {
      newErrors.videoUrl = 'Please enter a valid YouTube URL';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateService = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again.');
      return;
    }

    setLoading(true);

    try {
      // Upload new images if any local URIs exist
      let finalImages = [...images];
      const localImages = images.filter(img => img.startsWith('file://'));
      
      if (localImages.length > 0 && seller?.id) {
        const uploadedUrls = await uploadMultipleImages(localImages, seller.id, 'services');
        // Replace local URIs with uploaded URLs
        finalImages = images.map(img => {
          const localIndex = localImages.indexOf(img);
          return localIndex >= 0 ? uploadedUrls[localIndex] : img;
        });
      }

      const serviceData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(basePrice),
        duration: duration ? parseInt(duration) : null,
        video_url: videoUrl.trim() || null,
        images: finalImages.length > 0 ? finalImages : null,
        location_type: locationType,
        is_active: isActive,
      };

      const result = await updateService(serviceId, serviceData);

      if (result.success) {
        Alert.alert('Success', 'Service updated successfully!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to update service');
      }
    } catch (error: any) {
      console.error('Update service error:', error);
      Alert.alert('Error', error.message || 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading service...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Service Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Name *</Text>
            <Input
              placeholder="e.g., Home Cleaning"
              value={name}
              onChangeText={setName}
              error={errors.name}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <Input
              placeholder="Describe your service..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              style={styles.textArea}
              error={errors.description}
            />
          </View>

          {/* Price and Duration */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Price (₹) *</Text>
              <Input
                placeholder="0.00"
                value={basePrice}
                onChangeText={setBasePrice}
                keyboardType="decimal-pad"
                error={errors.basePrice}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Duration (mins)</Text>
              <Input
                placeholder="60"
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Location Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Location *</Text>
            <View style={styles.locationOptions}>
              <TouchableOpacity
                style={[
                  styles.locationOption,
                  locationType === 'visit_customer' && styles.locationOptionActive,
                ]}
                onPress={() => setLocationType('visit_customer')}
              >
                <Ionicons
                  name="home"
                  size={20}
                  color={locationType === 'visit_customer' ? colors.surface : colors.text}
                />
                <Text
                  style={[
                    styles.locationOptionText,
                    locationType === 'visit_customer' && styles.locationOptionTextActive,
                  ]}
                >
                  Visit Customer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationOption,
                  locationType === 'customer_visits' && styles.locationOptionActive,
                ]}
                onPress={() => setLocationType('customer_visits')}
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={locationType === 'customer_visits' ? colors.surface : colors.text}
                />
                <Text
                  style={[
                    styles.locationOptionText,
                    locationType === 'customer_visits' && styles.locationOptionTextActive,
                  ]}
                >
                  At Location
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationOption,
                  locationType === 'both' && styles.locationOptionActive,
                ]}
                onPress={() => setLocationType('both')}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={20}
                  color={locationType === 'both' ? colors.surface : colors.text}
                />
                <Text
                  style={[
                    styles.locationOptionText,
                    locationType === 'both' && styles.locationOptionTextActive,
                  ]}
                >
                  Both
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Video URL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>YouTube Video URL (Optional)</Text>
            <Input
              placeholder="https://youtube.com/watch?v=..."
              value={videoUrl}
              onChangeText={setVideoUrl}
              error={errors.videoUrl}
            />
          </View>

          {/* Images */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Images</Text>
            <TouchableOpacity style={[styles.uploadButton, shadows.sm]} onPress={pickImages}>
              <Ionicons name="image-outline" size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Add Images</Text>
            </TouchableOpacity>
            
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreview}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Active Status */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setIsActive(!isActive)}
            >
              <View>
                <Text style={styles.toggleLabel}>Service Active</Text>
                <Text style={styles.toggleDescription}>
                  {isActive ? 'Service is visible to customers' : 'Service is hidden from customers'}
                </Text>
              </View>
              <View
                style={[
                  styles.toggle,
                  isActive && styles.toggleActive,
                ]}
              >
                <View style={[styles.toggleThumb, isActive && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Update Button */}
          <Button
            title="Update Service"
            onPress={handleUpdateService}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />

          <View style={{ height: spacing.xl }} />
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  halfInput: {
    flex: 1,
  },
  locationOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  locationOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  locationOptionText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  locationOptionTextActive: {
    color: colors.surface,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  uploadButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  imagePreview: {
    marginTop: spacing.md,
  },
  imageContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  toggleDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  submitButton: {
    marginTop: spacing.md,
  },
});
