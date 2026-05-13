import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from './StarRating';

interface WriteReviewModalProps {
  visible: boolean;
  title?: string;
  subjectName?: string;
  onClose: () => void;
  onSubmit: (rating: number, review: string) => Promise<{ success: boolean; error?: string }>;
}

export default function WriteReviewModal({
  visible,
  title = 'Write a Review',
  subjectName,
  onClose,
  onSubmit,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setRating(0);
    setReview('');
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      Alert.alert('Rating required', 'Please tap a star to rate.');
      return;
    }
    if (review.trim().length < 3) {
      Alert.alert('Review required', 'Please write a short review (3+ characters).');
      return;
    }
    setSubmitting(true);
    const res = await onSubmit(rating, review.trim());
    setSubmitting(false);
    if (res.success) {
      Alert.alert('Thank you!', 'Your review has been submitted.');
      reset();
      onClose();
    } else {
      Alert.alert('Submission failed', res.error || 'Unable to submit review');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!submitting) {
          reset();
          onClose();
        }
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet} testID="write-review-modal">
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              onPress={() => {
                if (!submitting) {
                  reset();
                  onClose();
                }
              }}
              testID="write-review-close"
            >
              <Ionicons name="close" size={26} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            {!!subjectName && (
              <Text style={styles.subject} numberOfLines={2}>
                {subjectName}
              </Text>
            )}

            <Text style={styles.label}>Your Rating</Text>
            <View style={styles.starsRow}>
              <StarRating rating={rating} size={36} onChange={setRating} />
            </View>

            <Text style={styles.label}>Your Review</Text>
            <TextInput
              value={review}
              onChangeText={setReview}
              placeholder="Share your experience..."
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              testID="write-review-input"
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              testID="submit-review-button"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.submitText}>Submit Review</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  subject: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 8 },
  starsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  submitBtn: {
    marginTop: 18,
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
