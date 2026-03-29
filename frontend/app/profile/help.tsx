import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I place an order?',
    answer: 'Browse products or services, add them to your cart, and proceed to checkout. You can pay using UPI, card, or net banking.',
  },
  {
    question: 'How do I track my order?',
    answer: 'Go to "My Orders" in your profile. Click on any order to see detailed tracking information and delivery status.',
  },
  {
    question: 'What is the refund policy?',
    answer: 'You can request a refund within 7 days of delivery for products and within 24 hours for services. Seller will review and approve refund requests.',
  },
  {
    question: 'How do I contact a seller?',
    answer: 'Visit the seller\'s profile or product page and use the "Contact Seller" button to send them a message.',
  },
  {
    question: 'How do I report a problem?',
    answer: 'You can report issues from the order details page or use the "Contact Support" form below. Our team will respond within 24 hours.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // In production, send to support API
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Message Sent',
      'Thank you for contacting us. We\'ll get back to you within 24 hours.',
      [
        {
          text: 'OK',
          onPress: () => {
            setSubject('');
            setMessage('');
            setShowContactForm(false);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <Ionicons name="call-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.actionLabel}>Call Us</Text>
              <Text style={styles.actionValue}>1800-123-4567</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <Ionicons name="mail-outline" size={24} color={colors.secondary} />
              </View>
              <Text style={styles.actionLabel}>Email Us</Text>
              <Text style={styles.actionValue}>support@app.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqCard}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
              {expandedIndex === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Support Form */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => setShowContactForm(!showContactForm)}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={colors.surface} />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>

          {showContactForm && (
            <View style={styles.contactForm}>
              <Text style={styles.formTitle}>Send us a message</Text>
              <TextInput
                style={styles.formInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Subject"
                placeholderTextColor={colors.textLight}
              />
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Common Issues */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Issues</Text>
          <View style={styles.issuesList}>
            <TouchableOpacity style={styles.issueItem}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
              <Text style={styles.issueText}>Payment Failed</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.issueItem}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
              <Text style={styles.issueText}>Delayed Delivery</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.issueItem}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.info} />
              <Text style={styles.issueText}>Wrong Item Received</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>
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
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  actionValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  faqAnswer: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  contactButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
  contactForm: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  formTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTextArea: {
    height: 120,
  },
  submitButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
  issuesList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  issueText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
});