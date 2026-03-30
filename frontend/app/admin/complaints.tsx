import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

export default function AdminComplaintsScreen() {
  const router = useRouter();
  const { complaints, loading, fetchAllComplaints, updateComplaintStatus } = useComplaintStore();
  const [filter, setFilter] = useState<string>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchAllComplaints();
  }, []);

  const filteredComplaints = filter === 'all'
    ? complaints
    : complaints.filter(c => c.status === filter);

  const openModal = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setAdminNotes(complaint.admin_notes || '');
    setSelectedStatus(complaint.status);
    setModalVisible(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedComplaint) return;

    const result = await updateComplaintStatus(
      selectedComplaint.id,
      selectedStatus,
      adminNotes
    );

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Complaint status updated');
      setModalVisible(false);
      fetchAllComplaints();
    } else {
      Alert.alert('Error', result.error || 'Failed to update complaint');
    }
  };

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
        <Text style={styles.headerTitle}>Complaints Management</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>{complaints.length}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {['all', 'pending', 'under_review', 'resolved', 'closed', 'rejected'].map((status) => (
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
            <Text
              style={[
                styles.filterCount,
                filter === status && styles.filterCountActive,
              ]}
            >
              {status === 'all' 
                ? complaints.length 
                : complaints.filter(c => c.status === status).length}
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
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.complaintsList}>
            {filteredComplaints.map((complaint) => (
              <TouchableOpacity
                key={complaint.id}
                style={styles.complaintCard}
                onPress={() => openModal(complaint)}
                activeOpacity={0.7}
              >
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
                <Text style={styles.message} numberOfLines={2}>
                  {complaint.message}
                </Text>

                {/* Images Preview */}
                {complaint.images && complaint.images.length > 0 && (
                  <View style={styles.imagePreviewContainer}>
                    <Ionicons name="image" size={16} color={colors.textLight} />
                    <Text style={styles.imageCount}>{complaint.images.length} image(s)</Text>
                  </View>
                )}

                {/* Footer */}
                <View style={styles.complaintFooter}>
                  <Text style={styles.date}>
                    {new Date(complaint.created_at).toLocaleDateString()}
                  </Text>
                  <View style={styles.actionButton}>
                    <Text style={styles.actionText}>Review</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* Update Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Complaint</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedComplaint && (
                <>
                  {/* Complaint Details */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Report Type:</Text>
                    <Text style={styles.detailValue}>
                      {reportTypeLabels[selectedComplaint.report_type]}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Subject:</Text>
                    <Text style={styles.detailValue}>{selectedComplaint.subject}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description:</Text>
                    <Text style={styles.detailValue}>{selectedComplaint.message}</Text>
                  </View>

                  {/* Images */}
                  {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Evidence Images:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {selectedComplaint.images.map((image, index) => (
                          <Image key={index} source={{ uri: image }} style={styles.modalImage} />
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Status Update */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Update Status:</Text>
                    <View style={styles.statusOptions}>
                      {['pending', 'under_review', 'resolved', 'closed', 'rejected'].map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusOption,
                            selectedStatus === status && styles.statusOptionActive,
                          ]}
                          onPress={() => setSelectedStatus(status)}
                        >
                          <Text
                            style={[
                              styles.statusOptionText,
                              selectedStatus === status && styles.statusOptionTextActive,
                            ]}
                          >
                            {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Admin Notes */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Admin Notes:</Text>
                    <TextInput
                      style={styles.notesInput}
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                      placeholder="Add notes about this complaint..."
                      placeholderTextColor={colors.textLight}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Update Button */}
                  <TouchableOpacity
                    style={styles.updateButton}
                    onPress={handleUpdateStatus}
                  >
                    <Text style={styles.updateButtonText}>Update Complaint</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flex: 1,
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginLeft: spacing.md,
  },
  statsContainer: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statsText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '700',
  },
filterContainer: {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm, // was md — TOO BIG
},

filterTab: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',

  height: 36,                         // 🔥 FIXED HEIGHT
  paddingHorizontal: spacing.sm,      // smaller
  paddingVertical: 0,                 // ZERO padding → slim UI

  marginRight: spacing.sm,
  borderRadius: 18,                   // better capsule shape
  backgroundColor: colors.surface,

  gap: 4,
},

filterTabActive: {
  backgroundColor: colors.primary,
},

filterText: {
  fontSize: 13,                       // override typography.bodySmall
  color: colors.textSecondary,
  fontWeight: '600',
},

filterTextActive: {
  color: colors.surface,
},

filterCount: {
  fontSize: 12,
  color: colors.textLight,
  fontWeight: '700',
},

filterCountActive: {
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
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  imageCount: {
    ...typography.caption,
    color: colors.textLight,
  },
  complaintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  date: {
    ...typography.caption,
    color: colors.textLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  detailSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  modalImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    marginTop: spacing.sm,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statusOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusOptionText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  statusOptionTextActive: {
    color: colors.surface,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...typography.body,
    color: colors.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  updateButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  updateButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
});
