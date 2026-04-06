import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const formHeightAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    Animated.spring(formHeightAnim, {
      toValue: showContactForm ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [showContactForm]);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

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

  const handleCallPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('tel:18001234567');
  };

  const handleEmailPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('mailto:support@app.com');
  };

  const formHeight = formHeightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 420],
  });

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
          <Text style={styles.headerTitle}>Help & Support</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard} onPress={handleCallPress} activeOpacity={0.9}>
              <LinearGradient
                colors={['#FFFFFF', '#F9FAFB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGradient}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="call-outline" size={24} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.actionLabel}>Call Us</Text>
                <Text style={styles.actionValue}>1800-123-4567</Text>
                <View style={styles.actionArrow}>
                  <Ionicons name="arrow-forward" size={12} color="#8B5CF6" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleEmailPress} activeOpacity={0.9}>
              <LinearGradient
                colors={['#FFFFFF', '#F9FAFB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGradient}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="mail-outline" size={24} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.actionLabel}>Email Us</Text>
                <Text style={styles.actionValue}>support@app.com</Text>
                <View style={styles.actionArrow}>
                  <Ionicons name="arrow-forward" size={12} color="#10B981" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.sectionIcon}
            >
              <Ionicons name="help-circle-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqCard}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F9FAFB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.faqGradient}
              >
                <View style={styles.faqHeader}>
                  <View style={styles.faqNumber}>
                    <Text style={styles.faqNumberText}>{(index + 1).toString().padStart(2, '0')}</Text>
                  </View>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <LinearGradient
                    colors={expandedIndex === index ? ['#8B5CF6', '#7C3AED'] : ['#F3F4F6', '#E5E7EB']}
                    style={styles.faqChevron}
                  >
                    <Ionicons
                      name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={expandedIndex === index ? '#FFFFFF' : '#6B7280'}
                    />
                  </LinearGradient>
                </View>
                {expandedIndex === index && (
                  <Animated.View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </Animated.View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Support Form */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowContactForm(!showContactForm);
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.contactGradient}
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Contact Support</Text>
              <Ionicons
                name={showContactForm ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#FFFFFF"
              />
            </LinearGradient>
          </TouchableOpacity>

          <Animated.View style={{ height: formHeight, overflow: 'hidden' }}>
            <LinearGradient
              colors={['#FFFFFF', '#F9FAFB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.contactForm}
            >
              <View style={styles.formHeader}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.formIcon}
                >
                  <Ionicons name="create-outline" size={20} color="#8B5CF6" />
                </LinearGradient>
                <Text style={styles.formTitle}>Send us a message</Text>
              </View>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.formInput}
              >
                <Ionicons name="text-outline" size={18} color="#8B5CF6" />
                <TextInput
                  style={styles.formInputField}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Subject"
                  placeholderTextColor="#9CA3AF"
                />
              </LinearGradient>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={[styles.formInput, styles.formTextArea]}
              >
                <Ionicons name="document-text-outline" size={18} color="#8B5CF6" />
                <TextInput
                  style={[styles.formInputField, styles.textAreaField]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Describe your issue..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </LinearGradient>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.9}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitGradient}
                >
                  <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Send Message</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Common Issues */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.sectionIcon}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Common Issues</Text>
          </View>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.issuesList}
          >
            <TouchableOpacity style={styles.issueItem} activeOpacity={0.7}>
              <LinearGradient
                colors={['#FEE2E2', '#FECACA']}
                style={styles.issueIcon}
              >
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
              </LinearGradient>
              <Text style={styles.issueText}>Payment Failed</Text>
              <View style={styles.issueArrow}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.issueItem} activeOpacity={0.7}>
              <LinearGradient
                colors={['#FEF3C7', '#FDE68A']}
                style={styles.issueIcon}
              >
                <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
              </LinearGradient>
              <Text style={styles.issueText}>Delayed Delivery</Text>
              <View style={styles.issueArrow}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.issueItem, styles.lastIssueItem]} activeOpacity={0.7}>
              <LinearGradient
                colors={['#E0E7FF', '#C7D2FE']}
                style={styles.issueIcon}
              >
                <Ionicons name="alert-circle-outline" size={18} color="#3B82F6" />
              </LinearGradient>
              <Text style={styles.issueText}>Wrong Item Received</Text>
              <View style={styles.issueArrow}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </LinearGradient>
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  actionValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  actionArrow: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqCard: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
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
  faqGradient: {
    padding: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  faqNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  faqChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqAnswerContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  faqAnswer: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  contactButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  contactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactForm: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  formIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  formInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  formInputField: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: '#1F2937',
  },
  textAreaField: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  formTextArea: {
    alignItems: 'flex-start',
    minHeight: 110,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  issuesList: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastIssueItem: {
    borderBottomWidth: 0,
  },
  issueIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  issueArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});