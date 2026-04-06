import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useComplaintStore } from '../../src/store/complaintStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

const reportTypes = [
  { id: 'product_quality', label: 'Product Quality', icon: 'cube-outline', color: '#8B5CF6' },
  { id: 'service_quality', label: 'Service Quality', icon: 'construct-outline', color: '#10B981' },
  { id: 'fraud', label: 'Fraud/Scam', icon: 'warning-outline', color: '#EF4444' },
  { id: 'fake_listing', label: 'Fake Listing', icon: 'alert-circle-outline', color: '#F59E0B' },
  { id: 'inappropriate_content', label: 'Inappropriate', icon: 'eye-off-outline', color: '#EC4899' },
  { id: 'delayed_delivery', label: 'Delayed Delivery', icon: 'time-outline', color: '#3B82F6' },
  { id: 'rude_behavior', label: 'Rude Behavior', icon: 'sad-outline', color: '#8B5CF6' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

export default function CreateComplaintScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { createComplaint, loading } = useComplaintStore();

  const sellerId = params.sellerId as string;
  const orderId = params.orderId as string;
  const bookingId = params.bookingId as string;
  const productId = params.productId as string;
  const serviceId = params.serviceId as string;
  const sellerName = params.sellerName as string;

  const [selectedType, setSelectedType] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages([...images, ...newImages]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select an issue type');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }

    if (!sellerId) {
      Alert.alert('Error', 'Seller information is missing');
      return;
    }

    const complaintData: any = {
      seller_id: sellerId,
      report_type: selectedType,
      subject: subject.trim(),
      message: message.trim(),
      images: images.length > 0 ? images : undefined,
    };

    if (orderId) complaintData.order_id = orderId;
    if (bookingId) complaintData.booking_id = bookingId;
    if (productId) complaintData.product_id = productId;
    if (serviceId) complaintData.service_id = serviceId;

    const result = await createComplaint(complaintData);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Complaint Submitted',
        'Your complaint has been submitted successfully. We will review it and take appropriate action.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to submit complaint');
    }
  };

  const getSelectedTypeColor = () => {
    const type = reportTypes.find(t => t.id === selectedType);
    return type?.color || '#8B5CF6';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4C1D95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Issue</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Seller Info Card */}
        {sellerName && (
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sellerInfoCard}
          >
            <View style={styles.sellerIconContainer}>
              <Ionicons name="storefront" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.sellerInfoContent}>
              <Text style={styles.sellerLabel}>Reporting Seller</Text>
              <Text style={styles.sellerName}>{sellerName}</Text>
            </View>
          </LinearGradient>
        )}

        {/* Report Type Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.sectionIcon}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Select Issue Type *</Text>
          </View>
          <View style={styles.typesGrid}>
            {reportTypes.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeCard, isSelected && styles.typeCardActive]}
                  onPress={() => {
                    setSelectedType(type.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={isSelected ? [type.color, type.color + 'CC'] : ['#F9FAFB', '#FFFFFF']}
                    style={styles.typeIconContainer}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={24}
                      color={isSelected ? '#FFFFFF' : type.color}
                    />
                  </LinearGradient>
                  <Text
                    style={[
                      styles.typeLabel,
                      isSelected && styles.typeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={20} color={type.color} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Subject Input */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.sectionIcon}
            >
              <Ionicons name="text-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Subject *</Text>
          </View>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.inputCard}
          >
            <View style={styles.inputContainer}>
              <Ionicons name="create-outline" size={20} color="#8B5CF6" />
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief summary of the issue"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.sectionIcon}
            >
              <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Description *</Text>
          </View>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.textAreaCard}
          >
            <TextInput
              style={styles.textArea}
              value={message}
              onChangeText={setMessage}
              placeholder="Please describe the issue in detail..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </LinearGradient>
        </View>

        {/* Images Upload Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#EC4899', '#DB2777']}
              style={styles.sectionIcon}
            >
              <Ionicons name="images-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Add Images (Optional)</Text>
          </View>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage} activeOpacity={0.8}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.uploadGradient}
            >
              <Ionicons name="cloud-upload-outline" size={28} color="#8B5CF6" />
              <Text style={styles.uploadText}>Tap to upload images</Text>
              <Text style={styles.uploadSubtext}>PNG, JPG up to 5MB</Text>
            </LinearGradient>
          </TouchableOpacity>

          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
              {images.map((image, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)']}
                    style={styles.imageOverlay}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={28} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Info Banner */}
        <LinearGradient
          colors={['#E0E7FF', '#C7D2FE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.infoBanner}
        >
          <Ionicons name="information-circle" size={24} color="#4C1D95" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Important Note</Text>
            <Text style={styles.infoText}>
              Your complaint will be reviewed by our team. We take all reports seriously and will investigate accordingly. You will be notified of any updates.
            </Text>
          </View>
        </LinearGradient>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={selectedType ? [getSelectedTypeColor(), getSelectedTypeColor() + 'CC'] : ['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Submit Complaint</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  sellerInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sellerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sellerInfoContent: {
    flex: 1,
  },
  sellerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  typeCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  typeCardActive: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
  },
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  typeLabelActive: {
    color: '#8B5CF6',
  },
  checkmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  inputCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: '#1F2937',
  },
  textAreaCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  textArea: {
    padding: spacing.md,
    minHeight: 140,
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  uploadButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  uploadGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  uploadSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  imagesScroll: {
    marginTop: spacing.md,
  },
  imagePreview: {
    position: 'relative',
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  infoBanner: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4C1D95',
    marginBottom: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#4C1D95',
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  submitButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});