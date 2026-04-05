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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useServiceStore } from '../../src/store/serviceStore';
import { useServiceLocationStore } from '../../src/store/serviceLocationStore';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { useBankAccountStore } from '../../src/store/bankAccountStore';
import { getCurrentLocation, getAddressFromCoordinates } from '../../src/services/locationService';

import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { uploadMultipleImages } from '../../src/utils/imageUpload';
import { isValidYouTubeUrl } from '../../src/utils/youtubeHelper';

const { width } = Dimensions.get('window');

export default function AddServiceScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { createService } = useServiceStore();
  const { addServiceLocation, fetchSellerLocations, locations } = useServiceLocationStore();
  const { currentSubscription, fetchSellerSubscriptions, loading: subscriptionLoading } = useSubscriptionStore();
  const { bankAccounts, fetchBankAccounts, loading: bankLoading } = useBankAccountStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  
  // Service location fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusKm, setRadiusKm] = useState('10');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [hasExistingLocation, setHasExistingLocation] = useState(false);

  useEffect(() => {
    if (seller?.id) {
      loadSellerLocations();
      fetchSellerSubscriptions(seller.id);
      fetchBankAccounts(seller.id);
    }
  }, [seller?.id]);

  const hasActiveSubscription = currentSubscription && new Date(currentSubscription.expires_at) > new Date();
  const hasBankAccount = bankAccounts.length > 0;
  const verifiedBankAccount = bankAccounts.find(acc => acc.verification_status === 'verified');

  const loadSellerLocations = async () => {
    if (seller?.id) {
      await fetchSellerLocations(seller.id);
    }
  };

  useEffect(() => {
    // Check if seller already has a location
    if (locations.length > 0) {
      setHasExistingLocation(true);
      // Pre-fill with primary location
      const primaryLocation = locations.find(l => l.is_primary) || locations[0];
      if (primaryLocation) {
        setAddress(primaryLocation.address);
        setCity(primaryLocation.city);
        setPincode(primaryLocation.pincode);
        setLatitude(primaryLocation.latitude.toString());
        setLongitude(primaryLocation.longitude.toString());
        setRadiusKm(primaryLocation.radius_km.toString());
      }
    }
  }, [locations]);

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

  const handleUseCurrentLocation = async () => {
    setFetchingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        const addressData = await getAddressFromCoordinates(location.latitude, location.longitude);
        if (addressData) {
          setAddress(addressData.address);
          setCity(addressData.city);
          setPincode(addressData.pincode);
          setLatitude(location.latitude.toString());
          setLongitude(location.longitude.toString());
          Alert.alert('Success', 'Location fetched successfully!');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not fetch location');
    } finally {
      setFetchingLocation(false);
    }
  };

  const validate = () => {
    const newErrors: any = {};

    if (!name.trim()) newErrors.name = 'Service name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!basePrice || parseFloat(basePrice) <= 0) newErrors.basePrice = 'Valid price is required';
    
    // Validate location (only if not already exists)
    if (!hasExistingLocation) {
      if (!address.trim()) newErrors.address = 'Service address is required';
      if (!city.trim()) newErrors.city = 'City is required';
      if (!pincode.trim()) newErrors.pincode = 'Pincode is required';
      if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) {
        newErrors.pincode = 'Invalid pincode (6 digits required)';
      }
    }

    // Validate YouTube URL if provided
    if (videoUrl.trim() && !isValidYouTubeUrl(videoUrl.trim())) {
      newErrors.videoUrl = 'Please enter a valid YouTube URL';
    }
    
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

      // Step 1: Create/Update service location (if new or changed)
      if (!hasExistingLocation || address || city || pincode) {
        const locationData = {
          seller_id: seller.id,
          address: address.trim(),
          city: city.trim(),
          pincode: pincode.trim(),
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          radius_km: radiusKm ? parseInt(radiusKm) : 10,
        };

        const locationResult = await addServiceLocation(locationData);
        
        if (!locationResult.success) {
          Alert.alert('Location Error', locationResult.error || 'Failed to save service location');
          setLoading(false);
          return;
        }
      }

      // Step 2: Upload images
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadMultipleImages(
          images,
          'service-images',
          seller.id
        );
        console.log(`Uploaded ${imageUrls.length} service images`);
      }

      // Step 3: Create service
      const serviceData = {
        seller_id: seller.id,
        category_id: seller.category_id,
        name,
        description,
        price: parseFloat(basePrice),
        duration: duration ? parseInt(duration) : null,
        video_url: videoUrl.trim() || null,
        images: imageUrls,
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
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.title}>Add New Service</Text>
              <View style={{ width: 40 }} />
            </View>
          </BlurView>

          {/* Subscription & Bank Account Check */}
          {(subscriptionLoading || bankLoading) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Checking requirements...</Text>
            </View>
          ) : !hasActiveSubscription || !verifiedBankAccount ? (
            <LinearGradient
              colors={['#1e1e1e', '#161616']}
              style={styles.restrictionContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.restrictionIconContainer}>
                <Ionicons name="alert-circle" size={64} color="#f59e0b" />
              </View>
              <Text style={styles.restrictionTitle}>Requirements Not Met</Text>
              
              {!hasActiveSubscription && (
                <LinearGradient
                  colors={['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.15)']}
                  style={styles.requirementCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                  <View style={styles.requirementText}>
                    <Text style={styles.requirementTitle}>Active Subscription Required</Text>
                    <Text style={styles.requirementDesc}>
                      You need an active subscription to add services
                    </Text>
                  </View>
                </LinearGradient>
              )}

              {!verifiedBankAccount && (
                <LinearGradient
                  colors={['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.15)']}
                  style={styles.requirementCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
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
            </LinearGradient>
          ) : (
            <>
              {/* Service Images */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Service Images</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.imagesContainer}>
                    {images.map((image, index) => (
                      <View key={index} style={styles.imageItem}>
                        <Image source={{ uri: image }} style={styles.serviceImage} />
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeImage(index)}
                        >
                          <LinearGradient
                            colors={['#ef4444', '#dc2626']}
                            style={styles.removeButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name="close" size={16} color="#FFFFFF" />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                      <LinearGradient
                        colors={['#6366f1', '#8b5cf6']}
                        style={styles.addImageGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="add" size={32} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={styles.addImageText}>Add Images</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>

              {/* Service Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Service Details</Text>
                
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

                <Input
                  label="YouTube Video URL (Optional)"
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  placeholder="https://www.youtube.com/watch?v=..."
                  error={errors.videoUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                
                {videoUrl.trim() && isValidYouTubeUrl(videoUrl.trim()) && (
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
                    style={styles.successMessage}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.successText}>Valid YouTube URL</Text>
                  </LinearGradient>
                )}
              </View>

              {/* Service Location */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {hasExistingLocation ? 'Service Location (Optional - Update if needed)' : 'Service Location *'}
                  </Text>
                  {!hasExistingLocation && (
                    <TouchableOpacity
                      style={styles.locationButton}
                      onPress={handleUseCurrentLocation}
                      disabled={fetchingLocation}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['#6366f1', '#8b5cf6']}
                        style={styles.locationButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="locate" size={16} color="#FFFFFF" />
                        <Text style={styles.locationButtonText}>
                          {fetchingLocation ? 'Fetching...' : 'Use Current'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>

                {hasExistingLocation && (
                  <LinearGradient
                    colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
                    style={styles.infoBox}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="information-circle" size={20} color="#a78bfa" />
                    <Text style={styles.infoText}>
                      You already have a service location. You can update it below or leave it as is.
                    </Text>
                  </LinearGradient>
                )}

                <Input
                  label="Service Address *"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street address, building name"
                  multiline
                  numberOfLines={2}
                  error={errors.address}
                />

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Input
                      label="City *"
                      value={city}
                      onChangeText={setCity}
                      placeholder="City"
                      error={errors.city}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Input
                      label="Pincode *"
                      value={pincode}
                      onChangeText={setPincode}
                      placeholder="000000"
                      keyboardType="number-pad"
                      maxLength={6}
                      error={errors.pincode}
                    />
                  </View>
                </View>

                <Input
                  label="Service Radius (km)"
                  value={radiusKm}
                  onChangeText={setRadiusKm}
                  placeholder="10"
                  keyboardType="number-pad"
                  helpText="Customers within this radius can book your service"
                />

                {/* Optional: Manual coordinates */}
                <TouchableOpacity 
                  style={styles.advancedToggle}
                  onPress={() => setErrors({ ...errors, showAdvanced: !errors.showAdvanced })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.advancedToggleText}>
                    {errors.showAdvanced ? 'Hide' : 'Show'} Advanced (Coordinates)
                  </Text>
                  <Ionicons 
                    name={errors.showAdvanced ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>

                {errors.showAdvanced && (
                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <Input
                        label="Latitude"
                        value={latitude}
                        onChangeText={setLatitude}
                        placeholder="Auto-filled"
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Input
                        label="Longitude"
                        value={longitude}
                        onChangeText={setLongitude}
                        placeholder="Auto-filled"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                )}
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
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
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
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  imageItem: {
    position: 'relative',
  },
  serviceImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  removeButtonGradient: {
    padding: 4,
    borderRadius: borderRadius.full,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addImageGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: '#a78bfa',
    marginTop: spacing.xs,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationButton: {
    overflow: 'hidden',
    borderRadius: borderRadius.md,
  },
  locationButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  infoText: {
    fontSize: 13,
    color: '#d1d5db',
    flex: 1,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  advancedToggleText: {
    fontSize: 14,
    color: '#6b7280',
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
  restrictionContainer: {
    margin: spacing.lg,
    marginTop: 100,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  restrictionIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  restrictionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  requirementCard: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  requirementText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  requirementTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  requirementDesc: {
    fontSize: 12,
    color: '#9ca3af',
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