import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useIssueReportStore } from '../../../src/store/issueReportStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';

export default function IssueDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const issueId = params.id as string;
  
  const { selectedIssue, loading, fetchIssueById, updateIssueStatus } = useIssueReportStore();
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (issueId) {
      fetchIssueById(issueId);
    }
  }, [issueId]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleUpdateStatus = async (newStatus: string) => {
    if (newStatus === 'resolved' && !response.trim()) {
      Alert.alert('Error', 'Please provide a response before resolving the issue');
      return;
    }

    try {
      setSubmitting(true);
      const result = await updateIssueStatus(issueId, newStatus, response);
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Success',
          `Issue has been ${newStatus}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update issue');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return ['#F59E0B', '#D97706'];
      case 'under_review':
        return ['#3B82F6', '#2563EB'];
      case 'resolved':
        return ['#10B981', '#059669'];
      case 'closed':
        return ['#6B7280', '#4B5563'];
      case 'rejected':
        return ['#EF4444', '#DC2626'];
      default:
        return ['#8B5CF6', '#7C3AED'];
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading || !selectedIssue) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading issue details...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const issue = selectedIssue;
  const statusGradient = getStatusColor(issue.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          <Text style={styles.headerTitle}>Issue Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* Status Card */}
        <LinearGradient
          colors={statusGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusCard}
        >
          <View style={styles.statusHeader}>
            <Ionicons name="alert-circle-outline" size={32} color="#FFFFFF" />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {issue.status.toUpperCase().replace('_', ' ')}
              </Text>
              <Text style={styles.statusDate}>Reported {formatDate(issue.created_at)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Issue Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.cardIcon}
            >
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Issue Information</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Subject</Text>
            <Text style={styles.value}>{issue.subject}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Order Number</Text>
            <Text style={styles.value}>
              #{issue.order?.order_number?.slice(0, 12) || issue.order_id?.slice(0, 8)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Issue Type</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{issue.issue_type || 'General'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.messageLabel}>Customer Message</Text>
          <Text style={styles.messageText}>{issue.message}</Text>
        </View>

        {/* Order Details Card */}
        {issue.order && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.cardIcon}
              >
                <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.cardTitle}>Order Details</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Customer</Text>
              <Text style={styles.value}>{issue.order.shipping_name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{issue.order.shipping_phone}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Total Amount</Text>
              <Text style={styles.amountValue}>₹{issue.order.total_amount?.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Seller Response Card */}
        {issue.status === 'pending' || issue.status === 'under_review' ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.cardIcon}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.cardTitle}>Your Response</Text>
            </View>

            <TextInput
              style={styles.textArea}
              placeholder="Provide your response to the customer..."
              placeholderTextColor="#9CA3AF"
              value={response}
              onChangeText={setResponse}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleUpdateStatus('under_review')}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.actionGradient}
                >
                  <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionText}>Mark Under Review</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleUpdateStatus('resolved')}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.actionGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.actionText}>Mark as Resolved</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.cardIcon}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.cardTitle}>Seller Response</Text>
            </View>

            <Text style={styles.responseText}>
              {issue.seller_response || 'No response provided'}
            </Text>

            {issue.seller_response_at && (
              <Text style={styles.responseDate}>
                Responded on {formatDate(issue.seller_response_at)}
              </Text>
            )}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
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
  statusCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  typeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: spacing.md,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  messageText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 120,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  responseText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  responseDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
