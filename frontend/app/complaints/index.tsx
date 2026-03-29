import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useComplaintStore, Complaint } from '../../src/store/complaintStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const statusColors: Record<string, string> = {
  pending: colors.warning,
  under_review: colors.info,
  resolved: colors.success,
  closed: colors.textSecondary,
  rejected: colors.error,
};

const reportTypeLabels: Record<string, string> = {
  product_quality: 'Product Quality',
  service_quality: 'Service Quality',
  fraud: 'Fraud/Scam',
  fake_listing: 'Fake Listing',
  inappropriate_content: 'Inappropriate Content',
  delayed_delivery: 'Delayed Delivery',
  rude_behavior: 'Rude Behavior',
  other: 'Other',
};

export default function ComplaintsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { complaints, loading, fetchUserComplaints } = useComplaintStore();
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      fetchUserComplaints(user.id);
    }
  }, [user]);

  const filteredComplaints = filter === 'all'
    ? complaints
    : complaints.filter(c => c.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'under_review':
        return 'eye-outline';
      case 'resolved':
        return 'checkmark-circle-outline';
      case 'closed':
        return 'close-circle-outline';
      case 'rejected':
        return 'ban-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Complaints</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {['all', 'pending', 'under_review', 'resolved', 'closed'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              filter === status && styles.filterTabActive,
            ]}
            onPress={() => setFilter(status)}
          >
            <Text
              style={[
                styles.filterText,
                filter === status && styles.filterTextActive,
              ]}
            >
              {status === 'all' ? 'All' : status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredComplaints.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color={colors.textLight} />
          <Text style={styles.emptyText}>No complaints found</Text>
          <Text style={styles.emptySubtext}>
            {filter === 'all'
              ? "You haven't filed any complaints yet"
              : `No ${filter.replace('_', ' ')} complaints`}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.complaintsList}>
            {filteredComplaints.map((complaint) => (
              <View key={complaint.id} style={styles.complaintCard}>
                {/* Header */}
                <View style={styles.complaintHeader}>
                  <View style={styles.typeContainer}>
                    <Ionicons name="warning" size={16} color={colors.error} />
                    <Text style={styles.typeText}>
                      {reportTypeLabels[complaint.report_type] || complaint.report_type}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors[complaint.status] + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(complaint.status) as any}
                      size={14}
                      color={statusColors[complaint.status]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColors[complaint.status] },
                      ]}
                    >
                      {complaint.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Text>
                  </View>
                </View>

                {/* Subject */}
                <Text style={styles.subject}>{complaint.subject}</Text>

                {/* Message */}
                <Text style={styles.message} numberOfLines={3}>
                  {complaint.message}
                </Text>

                {/* Images */}
                {complaint.images && complaint.images.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagesContainer}
                  >
                    {complaint.images.map((image, index) => (
                      <Image key={index} source={{ uri: image }} style={styles.complaintImage} />
                    ))}
                  </ScrollView>
                )}

                {/* Admin Notes */}
                {complaint.admin_notes && (
                  <View style={styles.adminNotes}>
                    <View style={styles.adminNotesHeader}>
                      <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                      <Text style={styles.adminNotesLabel}>Admin Notes:</Text>
                    </View>
                    <Text style={styles.adminNotesText}>{complaint.admin_notes}</Text>
                  </View>
                )}

                {/* Resolution */}
                {complaint.resolution && (
                  <View style={styles.resolution}>
                    <View style={styles.resolutionHeader}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.resolutionLabel}>Resolution:</Text>
                    </View>
                    <Text style={styles.resolutionText}>{complaint.resolution}</Text>
                  </View>
                )}

                {/* Date */}
                <Text style={styles.date}>
                  Filed on {new Date(complaint.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}
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
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  complaintsList: {
    padding: spacing.lg,
  },
  complaintCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  typeText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  subject: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  imagesContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  complaintImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  adminNotes: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  adminNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  adminNotesLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  adminNotesText: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 20,
  },
  resolution: {
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  resolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  resolutionLabel: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
  resolutionText: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 20,
  },
  date: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
});