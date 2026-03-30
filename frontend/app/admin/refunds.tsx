import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRefundStore, RefundRequest } from '../../src/store/refundStore';
import { supabase } from '../../src/services/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';

const statusColors: Record<string, string> = {
  pending: colors.warning,
  seller_approved: colors.info,
  seller_rejected: colors.error,
  processing: colors.primary,
  completed: colors.success,
  failed: colors.error,
};

export default function AdminRefundsScreen() {
  const router = useRouter();
  const { refunds, loading, processRefund, updateRefundStatus } = useRefundStore();
  const [allRefunds, setAllRefunds] = useState<RefundRequest[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAllRefunds();
  }, []);

  const loadAllRefunds = async () => {
    try {
      const { data, error } = await supabase
        .from('refund_requests')
        .select(`
          *,
          user:users!user_id (name, email),
          seller:sellers (company_name),
          order:orders (order_number),
          booking:bookings (booking_date, booking_time)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllRefunds(data || []);
    } catch (error) {
      console.error('Error loading refunds:', error);
      Alert.alert('Error', 'Failed to load refunds');
    }
  };

  const filteredRefunds = filter === 'all'
    ? allRefunds
    : allRefunds.filter(r => r.status === filter);

  const openModal = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setAdminNotes(refund.admin_notes || '');
    setModalVisible(true);
  };

  const handleProcessRefund = async (refundId: string) => {
    Alert.alert(
      'Process Refund',
      'This will initiate a refund via Razorpay. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          onPress: async () => {
            setProcessing(true);
            const result = await processRefund(refundId);
            setProcessing(false);

            if (result.success) {
              Alert.alert('Success', 'Refund processed successfully');
              await loadAllRefunds();
              setModalVisible(false);
            } else {
              Alert.alert('Error', result.error || 'Failed to process refund');
            }
          },
        },
      ]
    );
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedRefund) return;

    const result = await updateRefundStatus(
      selectedRefund.id,
      status,
      adminNotes
    );

    if (result.success) {
      Alert.alert('Success', 'Refund status updated');
      await loadAllRefunds();
      setModalVisible(false);
    } else {
      Alert.alert('Error', result.error || 'Failed to update status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'seller_approved':
        return 'checkmark-circle-outline';
      case 'seller_rejected':
        return 'close-circle-outline';
      case 'processing':
        return 'sync-outline';
      case 'completed':
        return 'checkmark-done-circle-outline';
      case 'failed':
        return 'alert-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Requests</Text>
        <TouchableOpacity onPress={loadAllRefunds}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {['all', 'pending', 'seller_approved', 'processing', 'completed', 'failed'].map((status) => (
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
                ? allRefunds.length
                : allRefunds.filter(r => r.status === status).length}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredRefunds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={colors.textLight} />
          <Text style={styles.emptyText}>No refund requests found</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.refundsList}>
            {filteredRefunds.map((refund) => (
              <TouchableOpacity
                key={refund.id}
                style={styles.refundCard}
                onPress={() => openModal(refund)}
                activeOpacity={0.7}
              >
                {/* Header */}
                <View style={styles.refundHeader}>
                  <View style={styles.typeContainer}>
                    <Ionicons
                      name={refund.order_id ? 'cube' : 'construct'}
                      size={16}
                      color={refund.order_id ? colors.info : colors.purple}
                    />
                    <Text style={styles.typeText}>
                      {refund.order_id ? 'Product Order' : 'Service Booking'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors[refund.status] + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(refund.status) as any}
                      size={14}
                      color={statusColors[refund.status]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColors[refund.status] },
                      ]}
                    >
                      {refund.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.refundDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Customer:</Text>
                    <Text style={styles.detailValue}>{refund.user?.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Seller:</Text>
                    <Text style={styles.detailValue}>{refund.seller?.company_name || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reason:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>{refund.reason}</Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.refundFooter}>
                  <View>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <Text style={styles.amountValue}>₹{refund.amount.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.date}>
                    {new Date(refund.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refund Request Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedRefund && (
                <>
                  {/* Request Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Request ID:</Text>
                    <Text style={styles.detailValue}>{selectedRefund.id.slice(0, 8)}...</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>
                      {selectedRefund.order_id ? 'Product Order' : 'Service Booking'}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Amount:</Text>
                    <Text style={[styles.detailValue, { color: colors.error }]}>
                      ₹{selectedRefund.amount.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Reason:</Text>
                    <Text style={styles.detailValue}>{selectedRefund.reason}</Text>
                  </View>

                  {selectedRefund.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Description:</Text>
                      <Text style={styles.detailValue}>{selectedRefund.description}</Text>
                    </View>
                  )}

                  {selectedRefund.seller_response && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Seller Response:</Text>
                      <Text style={styles.detailValue}>{selectedRefund.seller_response}</Text>
                    </View>
                  )}

                  {/* Admin Notes */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Admin Notes:</Text>
                    <TextInput
                      style={styles.notesInput}
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                      placeholder="Add notes..."
                      placeholderTextColor={colors.textLight}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Action Buttons */}
                  {selectedRefund.status === 'seller_approved' && (
                    <Button
                      title="Process Refund via Razorpay"
                      onPress={() => handleProcessRefund(selectedRefund.id)}
                      loading={processing}
                      variant="primary"
                      style={styles.actionButton}
                    />
                  )}

                  {selectedRefund.status === 'pending' && (
                    <View style={styles.statusActions}>
                      <Button
                        title="Mark as Processing"
                        onPress={() => handleUpdateStatus('processing')}
                        variant="outline"
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}

                  {selectedRefund.status === 'processing' && (
                    <Button
                      title="Mark as Completed"
                      onPress={() => handleUpdateStatus('completed')}
                      variant="primary"
                      style={styles.actionButton}
                    />
                  )}
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
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
    marginLeft: spacing.md,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
   
  },
filterTab: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: spacing.md,
  height: 38,            // 🔥 Fixed height (best size)
  marginRight: spacing.sm,
  borderRadius: 20,      // Capsule shape
  backgroundColor: colors.surface,
  gap: spacing.xs,
},
  filterTabActive: {
    backgroundColor: colors.primary,
  },
filterText: {
  ...typography.bodySmall,
  fontSize: 13,          // 🔥 Slightly smaller
  color: colors.textSecondary,
  fontWeight: '600',
},
  filterTextActive: {
    color: colors.surface,
  },
filterCount: {
  ...typography.caption,
  fontSize: 12,          // 🔥 Cleaner UI
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
  refundsList: {
    padding: spacing.lg,
  },
  refundCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  refundHeader: {
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
    color: colors.text,
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
  refundDetails: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  refundFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  amountValue: {
    ...typography.h4,
    color: colors.error,
    fontWeight: '700',
  },
  date: {
    ...typography.caption,
    color: colors.textLight,
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
  actionButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statusActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
});
