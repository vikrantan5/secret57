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
      if (pincode.trim() && !/^d{6}$/.test(pincode.trim())) {
        newErrors.pincode = 'Invalid pincode (6 digits required)';
      }
    }

      // Validate YouTube URL if provided
    if (videoUrl.trim() && !isValidYouTubeUrl(videoUrl.trim())) {
      newErrors.videoUrl = 'Please enter a valid YouTube URL';
    }
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
                    You need an active subscription to add services
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
            <View style={styles.successMessage}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.successText}>Valid YouTube URL</Text>
            </View>
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
              >
                <Ionicons name="locate" size={16} color={colors.primary} />
                <Text style={styles.locationButtonText}>
                  {fetchingLocation ? 'Fetching...' : 'Use Current'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {hasExistingLocation && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                You already have a service location. You can update it below or leave it as is.
              </Text>
            </View>
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
          >
            <Text style={styles.advancedToggleText}>
              {errors.showAdvanced ? 'Hide' : 'Show'} Advanced (Coordinates)
            </Text>
            <Ionicons 
              name={errors.showAdvanced ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={colors.textSecondary} 
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
  serviceImage: {
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
   successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  successText: {
    ...typography.caption,
    color: colors.success,
  },

   sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
  },
  locationButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
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
    ...typography.body,
    color: colors.textSecondary,
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