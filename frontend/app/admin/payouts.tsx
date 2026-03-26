import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBankAccountStore } from '../../src/store/bankAccountStore';
import { supabase } from '../../src/services/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

interface SellerWithRevenue {
  seller_id: string;
  company_name: string;
  total_revenue: number;
  total_payouts: number;
  pending_amount: number;
  bank_account?: any;
}

export default function AdminPayoutsScreen() {
  const router = useRouter();
  const { createPayout, updatePayoutStatus, fetchAllPayouts, loading } = useBankAccountStore();
  
  const [sellers, setSellers] = useState<SellerWithRevenue[]>([]);
  const [allPayouts, setAllPayouts] = useState<any[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<SellerWithRevenue | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSellerRevenues();
    loadPayouts();
  }, []);

  const fetchSellerRevenues = async () => {
    try {
      setLoadingSellers(true);

      // Fetch seller revenue summary view
      const { data: revenueData, error } = await supabase
        .from('seller_payout_summary')
        .select('*');

      if (error) {
        console.error('Error fetching revenue:', error);
        return;
      }

      // Fetch bank accounts for each seller
      const sellersWithBanks = await Promise.all(
        (revenueData || []).map(async (seller) => {
          const { data: bankAccounts } = await supabase
            .from('seller_bank_accounts')
            .select('*')
            .eq('seller_id', seller.seller_id)
            .eq('is_primary', true)
            .single();

          return {
            ...seller,
            bank_account: bankAccounts,
          };
        })
      );

      setSellers(sellersWithBanks);
      setLoadingSellers(false);
    } catch (error) {
      console.error('Error in fetchSellerRevenues:', error);
      setLoadingSellers(false);
    }
  };

  const loadPayouts = async () => {
    const payouts = await fetchAllPayouts();
    setAllPayouts(payouts);
  };

  const handleInitiatePayout = (seller: SellerWithRevenue) => {
    if (!seller.bank_account) {
      Alert.alert('Error', 'Seller has not added bank account details yet.');
      return;
    }

    if (seller.pending_amount <= 0) {
      Alert.alert('Info', 'No pending amount to pay out for this seller.');
      return;
    }

    setSelectedSeller(seller);
    setPayoutAmount(seller.pending_amount.toFixed(2));
    setShowPayoutModal(true);
  };

  const handleCreatePayout = async () => {
    if (!selectedSeller || !selectedSeller.bank_account) {
      Alert.alert('Error', 'Invalid seller or bank account');
      return;
    }

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > selectedSeller.pending_amount) {
      Alert.alert('Error', `Amount cannot exceed pending amount of ₹${selectedSeller.pending_amount.toFixed(2)}`);
      return;
    }

    try {
      setProcessing(true);

      const result = await createPayout({
        seller_id: selectedSeller.seller_id,
        bank_account_id: selectedSeller.bank_account.id,
        amount,
        notes: payoutNotes || undefined,
      });

      if (result.success) {
        Alert.alert('Success', 'Payout created successfully!');
        setShowPayoutModal(false);
        setPayoutAmount('');
        setPayoutNotes('');
        setSelectedSeller(null);
        fetchSellerRevenues();
        loadPayouts();
      } else {
        Alert.alert('Error', result.error || 'Failed to create payout');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePayoutStatus = async (
    payoutId: string,
    newStatus: 'processing' | 'completed' | 'failed'
  ) => {
    Alert.alert(
      'Update Payout Status',
      `Mark this payout as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            let reference = undefined;
            if (newStatus === 'completed') {
              // Prompt for transaction reference
              Alert.prompt(
                'Transaction Reference',
                'Enter transaction/UTR number (optional)',
                async (ref) => {
                  const result = await updatePayoutStatus(payoutId, newStatus, ref || undefined);
                  if (result.success) {
                    Alert.alert('Success', `Payout marked as ${newStatus}`);
                    loadPayouts();
                    fetchSellerRevenues();
                  } else {
                    Alert.alert('Error', result.error || 'Failed to update status');
                  }
                }
              );
              return;
            }

            const result = await updatePayoutStatus(payoutId, newStatus);
            if (result.success) {
              Alert.alert('Success', `Payout marked as ${newStatus}`);
              loadPayouts();
              fetchSellerRevenues();
            } else {
              Alert.alert('Error', result.error || 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'processing':
        return colors.primary;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Seller Payouts</Text>
        <TouchableOpacity onPress={() => { fetchSellerRevenues(); loadPayouts(); }}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Sellers with Pending Payouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sellers - Pending Payouts</Text>

          {loadingSellers ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : sellers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No sellers found</Text>
            </View>
          ) : (
            <View style={styles.sellersList}>
              {sellers.map((seller) => (
                <View key={seller.seller_id} style={[styles.sellerCard, shadows.sm]}>
                  <View style={styles.sellerHeader}>
                    <View style={styles.sellerIcon}>
                      <Ionicons name="business" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.sellerInfo}>
                      <Text style={styles.sellerName}>{seller.company_name}</Text>
                      <Text style={styles.sellerSubtext}>
                        {seller.bank_account ? seller.bank_account.bank_name : 'No bank account'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.revenueGrid}>
                    <View style={styles.revenueItem}>
                      <Text style={styles.revenueLabel}>Total Revenue</Text>
                      <Text style={[styles.revenueValue, { color: colors.primary }]}>
                        ₹{seller.total_revenue.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.revenueItem}>
                      <Text style={styles.revenueLabel}>Total Paid</Text>
                      <Text style={[styles.revenueValue, { color: colors.success }]}>
                        ₹{seller.total_payouts.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.revenueItem}>
                      <Text style={styles.revenueLabel}>Pending</Text>
                      <Text style={[styles.revenueValue, { color: colors.warning }]}>
                        ₹{seller.pending_amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {seller.pending_amount > 0 && (
                    <TouchableOpacity
                      style={[styles.payoutButton, shadows.sm]}
                      onPress={() => handleInitiatePayout(seller)}
                      disabled={!seller.bank_account}
                    >
                      <Ionicons name="cash-outline" size={20} color={colors.surface} />
                      <Text style={styles.payoutButtonText}>Initiate Payout</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payout History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Payouts</Text>

          {allPayouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No payouts yet</Text>
            </View>
          ) : (
            <View style={styles.payoutsList}>
              {allPayouts.map((payout) => (
                <View key={payout.id} style={[styles.payoutCard, shadows.sm]}>
                  <View style={styles.payoutHeader}>
                    <View>
                      <Text style={styles.payoutCompany}>
                        {payout.seller?.company_name || 'Unknown Seller'}
                      </Text>
                      <Text style={styles.payoutDate}>
                        {new Date(payout.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(payout.status) + '20' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(payout.status) }
                      ]}>
                        {payout.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.payoutAmount}>₹{payout.amount.toFixed(2)}</Text>
                  
                  {payout.bank_account && (
                    <Text style={styles.payoutBank}>
                      {payout.bank_account.bank_name} - XXXX{payout.bank_account.account_number.slice(-4)}
                    </Text>
                  )}

                  {payout.transaction_reference && (
                    <Text style={styles.payoutRef}>Ref: {payout.transaction_reference}</Text>
                  )}

                  {payout.status === 'pending' && (
                    <View style={styles.payoutActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                        onPress={() => handleUpdatePayoutStatus(payout.id, 'processing')}
                      >
                        <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                          Mark Processing
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.success + '15' }]}
                        onPress={() => handleUpdatePayoutStatus(payout.id, 'completed')}
                      >
                        <Text style={[styles.actionButtonText, { color: colors.success }]}>
                          Mark Completed
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {payout.status === 'processing' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.success + '15', width: '100%' }]}
                      onPress={() => handleUpdatePayoutStatus(payout.id, 'completed')}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.success }]}>
                        Mark Completed
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Payout Modal */}
      <Modal
        visible={showPayoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Initiate Payout</Text>
              <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedSeller && (
              <>
                <View style={styles.modalSellerInfo}>
                  <Text style={styles.modalSellerName}>{selectedSeller.company_name}</Text>
                  <Text style={styles.modalBankInfo}>
                    {selectedSeller.bank_account?.bank_name} - 
                    {selectedSeller.bank_account?.account_holder_name}
                  </Text>
                  <Text style={styles.modalPendingAmount}>
                    Pending Amount: ₹{selectedSeller.pending_amount.toFixed(2)}
                  </Text>
                </View>

                <Input
                  label="Payout Amount (₹)"
                  value={payoutAmount}
                  onChangeText={setPayoutAmount}
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                />

                <Input
                  label="Notes (Optional)"
                  value={payoutNotes}
                  onChangeText={setPayoutNotes}
                  placeholder="Add any notes"
                  multiline
                  numberOfLines={3}
                  style={styles.notesInput}
                />

                <View style={styles.modalActions}>
                  <Button
                    title="Cancel"
                    onPress={() => setShowPayoutModal(false)}
                    variant="outline"
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                  <Button
                    title="Create Payout"
                    onPress={handleCreatePayout}
                    loading={processing}
                    variant="primary"
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
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
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.md,
  },
  sellersList: {
    gap: spacing.md,
  },
  sellerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sellerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  sellerSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  revenueGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  revenueItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  revenueValue: {
    ...typography.h4,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  payoutButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  payoutsList: {
    gap: spacing.md,
  },
  payoutCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  payoutCompany: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  payoutDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  payoutAmount: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginVertical: spacing.sm,
  },
  payoutBank: {
    ...typography.body,
    color: colors.textSecondary,
  },
  payoutRef: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  payoutActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  modalSellerInfo: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  modalSellerName: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  modalBankInfo: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modalPendingAmount: {
    ...typography.h4,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
