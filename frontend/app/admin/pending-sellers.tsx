import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdminStore } from '../../src/store/adminStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function PendingSellersScreen() {
  const router = useRouter();
  const { pendingSellers, loading, fetchPendingSellers, approveSeller, rejectSeller } = useAdminStore();
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPendingSellers();
  }, []);

  const handleApprove = (seller: any) => {
    Alert.alert(
      'Approve Seller',
      `Are you sure you want to approve ${seller.company_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            const result = await approveSeller(seller.id);
            if (result.success) {
              Alert.alert('Success', 'Seller approved successfully');
              fetchPendingSellers();
            } else {
              Alert.alert('Error', result.error || 'Failed to approve seller');
            }
          },
        },
      ]
    );
  };

  const handleReject = (seller: any) => {
    setSelectedSeller(seller);
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    if (selectedSeller) {
      const result = await rejectSeller(selectedSeller.id, rejectReason);
      if (result.success) {
        Alert.alert('Success', 'Seller rejected successfully');
        setRejectModalVisible(false);
        setRejectReason('');
        fetchPendingSellers();
      } else {
        Alert.alert('Error', result.error || 'Failed to reject seller');
      }
    }
  };

  const renderSeller = ({ item }: { item: any }) => (
    <View style={[styles.sellerCard, shadows.sm]}>
      <View style={styles.sellerHeader}>
        <View style={styles.sellerInfo}>
          <Text style={styles.companyName}>{item.company_name}</Text>
          <Text style={styles.ownerName}>{item.user?.name}</Text>
          <Text style={styles.email}>{item.user?.email}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Pending</Text>
        </View>
      </View>

      <View style={styles.sellerDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {item.address}, {item.city}, {item.state}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.user?.phone}</Text>
        </View>
        {item.business_registration_number && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.business_registration_number}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.rejectButton]}
          onPress={() => handleReject(item)}
        >
          <Ionicons name="close-circle" size={20} color={colors.error} />
          <Text style={[styles.buttonText, { color: colors.error }]}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.approveButton]}
          onPress={() => handleApprove(item)}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Sellers ({pendingSellers.length})</Text>
        <TouchableOpacity onPress={fetchPendingSellers}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {pendingSellers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          <Text style={styles.emptyText}>No pending seller applications</Text>
        </View>
      ) : (
        <FlatList
          data={pendingSellers}
          renderItem={renderSeller}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, shadows.lg]}>
            <Text style={styles.modalTitle}>Reject Seller Application</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting {selectedSeller?.company_name}
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder="Enter rejection reason..."
              placeholderTextColor={colors.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmReject}
              >
                <Text style={styles.confirmButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  listContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sellerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  sellerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sellerInfo: {
    flex: 1,
  },
  companyName: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ownerName: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  email: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    height: 28,
  },
  statusText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  sellerDetails: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  rejectButton: {
    backgroundColor: colors.error + '15',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h4,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  textArea: {
    ...typography.body,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.error,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  confirmButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
