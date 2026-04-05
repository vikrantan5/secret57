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

import { useAuthStore } from '../../../../src/store/authStore';
import { useSellerStore } from '../../../../src/store/sellerStore';
import { useServiceStore } from '../../../../src/store/serviceStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../../src/constants/theme';
import { Button } from '../../../../src/components/ui/Button';
import { Input } from '../../../../src/components/ui/Input';
import { uploadMultipleImages } from '../../../../src/utils/imageUpload';
import { isValidYouTubeUrl } from '../../../../src/utils/youtubeHelper';

const { width } = Dimensions.get('window');

export default function EditServiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const serviceId = id;
  
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { selectedService, loading: storeLoading, error: storeError, fetchServiceById, updateService, setSelectedService } = useServiceStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [locationType, setLocationType] = useState<'visit_customer' | 'customer_visits' | 'both'>('visit_customer');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    setSelectedService(null);
    setDataLoaded(false);
    
    if (serviceId) {
      console.log('Loading service with ID:', serviceId);
      loadService();
    } else {
      console.error('No service ID provided in route params');
      Alert.alert('Error', 'No service ID provided');
      router.back();
    }
    
    return () => {
      setSelectedService(null);
    };
  }, [serviceId]);

  const loadService = async () => {
    try {
      console.log('Fetching service:', serviceId);
      await fetchServiceById(serviceId);
    } catch (error: any) {
      console.error('Failed to load service:', error);
      Alert.alert('Error', 'Failed to load service details. Please try again.');
    }
  };

  useEffect(() => {
    if (selectedService && selectedService.id === serviceId) {
      console.log('Service loaded successfully:', selectedService.name);
      setName(selectedService.name || '');
      setDescription(selectedService.description || '');
      setBasePrice(selectedService.price?.toString() || '');
      setDuration(selectedService.duration?.toString() || '');
      setVideoUrl(selectedService.video_url || '');
      setImages(selectedService.images || []);
      setLocationType(selectedService.location_type || 'visit_customer');
      setIsActive(selectedService.is_active ?? true);
      setDataLoaded(true);
    }
  }, [selectedService, serviceId]);

  useEffect(() => {
    if (storeError && !storeLoading) {
      console.error('Store error:', storeError);
      Alert.alert('Error', `Failed to load service: ${storeError}`);
    }
  }, [storeError, storeLoading]);

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
      let finalImages = [...images];
      const localImages = images.filter(img => img.startsWith('file://'));
      
      if (localImages.length > 0 && seller?.id) {
        const uploadedUrls = await uploadMultipleImages(localImages, seller.id, 'services');
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

  if (storeLoading && !dataLoaded) {
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
            <Text style={styles.loadingText}>Loading service...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!selectedService && !storeLoading) {
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
            <Text style={styles.errorText}>Service not found</Text>
            <Button title="Go Back" onPress={() => router.back()} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!dataLoaded) {
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
            <Text style={styles.loadingText}>Loading service data...</Text>
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
            <Text style={styles.headerTitle}>Edit Service</Text>
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
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={locationType === 'visit_customer' ? ['#6366f1', '#8b5cf6'] : ['#1e1e1e', '#161616']}
                    style={styles.locationGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons
                      name="home"
                      size={20}
                      color={locationType === 'visit_customer' ? '#FFFFFF' : '#a78bfa'}
                    />
                    <Text
                      style={[
                        styles.locationOptionText,
                        locationType === 'visit_customer' && styles.locationOptionTextActive,
                      ]}
                    >
                      Visit Customer
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    locationType === 'customer_visits' && styles.locationOptionActive,
                  ]}
                  onPress={() => setLocationType('customer_visits')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={locationType === 'customer_visits' ? ['#6366f1', '#8b5cf6'] : ['#1e1e1e', '#161616']}
                    style={styles.locationGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons
                      name="location"
                      size={20}
                      color={locationType === 'customer_visits' ? '#FFFFFF' : '#a78bfa'}
                    />
                    <Text
                      style={[
                        styles.locationOptionText,
                        locationType === 'customer_visits' && styles.locationOptionTextActive,
                      ]}
                    >
                      At Location
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    locationType === 'both' && styles.locationOptionActive,
                  ]}
                  onPress={() => setLocationType('both')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={locationType === 'both' ? ['#6366f1', '#8b5cf6'] : ['#1e1e1e', '#161616']}
                    style={styles.locationGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons
                      name="swap-horizontal"
                      size={20}
                      color={locationType === 'both' ? '#FFFFFF' : '#a78bfa'}
                    />
                    <Text
                      style={[
                        styles.locationOptionText,
                        locationType === 'both' && styles.locationOptionTextActive,
                      ]}
                    >
                      Both
                    </Text>
                  </LinearGradient>
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
              {videoUrl && isValidYouTubeUrl(videoUrl) && (
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
                  style={styles.validUrlBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                  <Text style={styles.validUrlText}>Valid YouTube URL</Text>
                </LinearGradient>
              )}
            </View>

            {/* Images */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Images</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImages} activeOpacity={0.7}>
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.uploadGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="image-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.uploadButtonText}>Add Images</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              {images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreview}>
                  {images.map((uri, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image source={{ uri }} style={styles.image} />
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
                </ScrollView>
              )}
            </View>

            {/* Active Status */}
            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setIsActive(!isActive)}
                activeOpacity={0.7}
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
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleUpdateService}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#374151', '#374151'] : ['#10b981', '#059669']}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Update Service</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: spacing.xl }} />
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
  headerTitle: {
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
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
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  locationGradient: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  locationOptionActive: {
    borderColor: '#6366f1',
  },
  locationOptionText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600',
  },
  locationOptionTextActive: {
    color: '#FFFFFF',
  },
  uploadButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  uploadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
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
  validUrlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  validUrlText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#10b981',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  submitButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
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