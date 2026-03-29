import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useComplaintStore } from '../../src/store/complaintStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const reportTypes = [
  { id: 'product_quality', label: 'Product Quality Issue', icon: 'cube-outline' },
  { id: 'service_quality', label: 'Service Quality Issue', icon: 'construct-outline' },
  { id: 'fraud', label: 'Fraud/Scam', icon: 'warning-outline' },
  { id: 'fake_listing', label: 'Fake Listing', icon: 'alert-circle-outline' },
  { id: 'inappropriate_content', label: 'Inappropriate Content', icon: 'eye-off-outline' },
  { id: 'delayed_delivery', label: 'Delayed Delivery', icon: 'time-outline' },
  { id: 'rude_behavior', label: 'Rude Behavior', icon: 'sad-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function CreateComplaintScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { createComplaint, loading } = useComplaintStore();

  // Get params from query
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

  const pickImage = async () => {
    try {
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
      Alert.alert('Error', 'Please select a report type');
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
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to submit complaint');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Issue</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Seller Info */}
        {sellerName && (
          <View style={styles.sellerInfo}>
            <Ionicons name="storefront" size={20} color={colors.primary} />
            <Text style={styles.sellerName}>Reporting: {sellerName}</Text>
          </View>
        )}

        {/* Report Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Issue Type *</Text>
          <View style={styles.typesGrid}>
            {reportTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardActive,
                ]}
                onPress={() => {
                  setSelectedType(type.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={selectedType === type.id ? colors.primary : colors.textLight}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type.id && styles.typeLabelActive,
                  ]}
                >
                  {type.label}
                </Text>
                {selectedType === type.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subject *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="text-outline" size={20} color={colors.textLight} />
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief summary of the issue"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        {/* Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description *</Text>
          <TextInput
            style={[styles.inputContainer, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Please describe the issue in detail..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Images (Optional)</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={24} color={colors.primary} />
            <Text style={styles.uploadText}>Upload Images</Text>
          </TouchableOpacity>

          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
              {images.map((image, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <Text style={styles.infoText}>
            Your complaint will be reviewed by our team. We take all reports seriously and will
            investigate accordingly. You will be notified of any updates.
          </Text>
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Complaint</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  sellerName: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  typeLabelActive: {
    color: colors.primary,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  textArea: {
    minHeight: 150,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  uploadText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  imagesScroll: {
    marginTop: spacing.md,
  },
  imagePreview: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.info,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  submitButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
});