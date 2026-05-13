import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBankAccountStore } from '../../src/store/bankAccountStore';
import { usePayoutStore } from '../../src/store/payoutStore';
import { supabase } from '../../src/services/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function AdminPayoutsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { createPayout, updatePayoutStatus, fetchAllPayouts } = useBankAccountStore();
  const { 
    eligibleSellers, 
    payouts: storePayouts,
    generateBatchPayouts,
    fetchEligibleSellers,
    processPayout,
    loading: payoutLoading
  } = usePayoutStore();
  
  const [allPayouts, setAllPayouts] = useState<any[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await fetchEligibleSellers();
    await loadPayouts();
  };

  const loadPayouts = async () => {
    const payouts = await fetchAllPayouts();
    setAllPayouts(payouts);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleGenerateBatchPayouts = async () => {
    Alert.alert(
      'Generate Batch Payouts',
      `This will create payouts for ${eligibleSellers.length} eligible sellers. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              setGeneratingBatch(true);
              const result = await generateBatchPayouts();
              
              if (result.success) {
                Alert.alert(
                  'Batch Generation Complete',
                  `✅ Created: ${result.created}\n❌ Failed: ${result.failed}${
                    result.errors.length > 0 ? `\n\nErrors:\n${result.errors.join('\n')}` : ''
                  }`
                );
                await loadData();
              } else {
                Alert.alert('Error', result.errors[0] || 'Failed to generate batch payouts');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Something went wrong');
            } finally {
              setGeneratingBatch(false);
            }
          }
        }
      ]
    );
  };

  const handleInitiatePayout = async (seller: any) => {
    const { data: bankAccount } = await supabase
      .from('seller_bank_accounts')
      .select('*')
      .eq('seller_id', seller.seller_id)
      .eq('is_primary', true)
      .single();

    if (!bankAccount) {
      Alert.alert('Error', 'Seller has not added bank account details yet.');
      return;
    }

    if (seller.net_eligible_amount <= 0) {
      Alert.alert('Info', 'No eligible amount to pay out for this seller.');
      return;
    }

    setSelectedSeller({ ...seller, bank_account: bankAccount });
    setPayoutAmount(seller.net_eligible_amount.toFixed(2));
    setShowPayoutModal(true);
  };

  const handleProcessPayoutViaRazorpay = async (payoutId: string) => {
    Alert.alert(
      'Process Payout via Razorpay',
      "This will initiate a real money transfer to the seller's bank account. Continue?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const result = await processPayout(payoutId);
              
              if (result.success) {
                Alert.alert('Success', '✅ Payout processed successfully via Razorpay!');
                await loadData();
              } else {
                Alert.alert('Error', result.error || 'Failed to process payout');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Something went wrong');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
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

    if (amount > selectedSeller.net_eligible_amount) {
      Alert.alert('Error', `Amount cannot exceed eligible amount of ₹${selectedSeller.net_eligible_amount.toFixed(2)}`);
      return;
    }

    try {
      setProcessing(true);

      const result = await createPayout({
        seller_id: selectedSeller.seller_id,
        bank_account_id: selectedSeller.bank_account.id,
        amount,
        order_ids: selectedSeller.eligible_order_ids || [],
        notes: payoutNotes || undefined,
      });

      if (result.success) {
        Alert.alert('Success', '✅ Payout created successfully!');
        setShowPayoutModal(false);
        setPayoutAmount('');
        setPayoutNotes('');
        setSelectedSeller(null);
        await loadData();
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
              if (Platform.OS === 'web') {
                const ref = prompt('Enter transaction/UTR number (optional)');
                const result = await updatePayoutStatus(payoutId, newStatus, ref || undefined);
                if (result.success) {
                  Alert.alert('Success', `✅ Payout marked as ${newStatus}`);
                  await loadData();
                } else {
                  Alert.alert('Error', result.error || 'Failed to update status');
                }
              } else {
                Alert.prompt(
                  'Transaction Reference',
                  'Enter transaction/UTR number (optional)',
                  async (ref) => {
                    const result = await updatePayoutStatus(payoutId, newStatus, ref || undefined);
                    if (result.success) {
                      Alert.alert('Success', `✅ Payout marked as ${newStatus}`);
                      await loadData();
                    } else {
                      Alert.alert('Error', result.error || 'Failed to update status');
                    }
                  }
                );
              }
              return;
            }

            const result = await updatePayoutStatus(payoutId, newStatus);
            if (result.success) {
              Alert.alert('Success', `✅ Payout marked as ${newStatus}`);
              await loadData();
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
      case 'completed': return colors.success;
      case 'processing': return colors.info;
      case 'pending': return colors.warning;
      case 'failed': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'processing': return 'sync';
      case 'pending': return 'time';
      case 'failed': return 'close-circle';
      default: return 'ellipse';
    }
  };

  const analytics = useMemo(() => {
    const totalEligible = eligibleSellers.reduce((sum, s) => sum + s.net_eligible_amount, 0);
    const totalOrders = eligibleSellers.reduce((sum, s) => sum + s.eligible_order_count, 0);
    const totalPaid = allPayouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      totalEligible,
      totalOrders,
      totalPaid,
      pendingPayouts: allPayouts.filter(p => p.status === 'pending').length,
    };
  }, [eligibleSellers, allPayouts]);

  const isTablet = width >= 768;
  const cardWidth = isTablet ? '31%' : '100%';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Seller Payouts</Text>
            <Text style={styles.headerSubtitle}>
              {eligibleSellers.length} eligible • {allPayouts.length} total
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.iconButton}>
            <Ionicons name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        {/* KPI Cards */}
        <View style={[styles.kpiGrid, { paddingHorizontal: spacing.lg }]}>
          <View style={[styles.kpiCard, shadows.sm, { width: cardWidth }]}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.kpiIcon}>
              <Ionicons name="people-outline" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.kpiLabel}>Eligible Sellers</Text>
            <Text style={styles.kpiValue}>{eligibleSellers.length}</Text>
            <Text style={styles.kpiSub}>{analytics.totalOrders} orders pending</Text>
          </View>

          <View style={[styles.kpiCard, shadows.sm, { width: cardWidth }]}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.kpiIcon}>
              <Ionicons name="cash-outline" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.kpiLabel}>Total Pending</Text>
            <Text style={styles.kpiValue}>
              ₹{analytics.totalEligible.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.kpiSub}>To be paid out</Text>
          </View>

          <View style={[styles.kpiCard, shadows.sm, { width: cardWidth }]}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.kpiIcon}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.kpiLabel}>Total Paid</Text>
            <Text style={styles.kpiValue}>
              ₹{analytics.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.kpiSub}>Completed payouts</Text>
          </View>
        </View>

        {/* Batch Payout Section */}
        {eligibleSellers.length > 0 && (
          <View style={[styles.batchSection, shadows.md, { marginHorizontal: spacing.lg }]}>
            <LinearGradient
              colors={['#FBBF2415', '#FBBF2408']}
              style={styles.batchGradient}
            >
              <View style={styles.batchInfo}>
                <View style={styles.batchIcon}>
                  <Ionicons name="flash" size={28} color={colors.warning} />
                </View>
                <View style={styles.batchTextContainer}>
                  <Text style={styles.batchTitle}>Batch Payout Ready</Text>
                  <Text style={styles.batchSubtitle}>
                    {eligibleSellers.length} sellers • ₹{analytics.totalEligible.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={styles.batchNote}>
                    Orders delivered ≥7 days ago • Min ₹500
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.batchButton}
                onPress={handleGenerateBatchPayouts}
                disabled={generatingBatch}
              >
                {generatingBatch ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="layers-outline" size={20} color="#fff" />
                    <Text style={styles.batchButtonText}>Generate Batch Payouts</Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Eligible Sellers Section */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Eligible Sellers</Text>
            <Text style={styles.sectionCount}>{eligibleSellers.length} sellers</Text>
          </View>

          {payoutLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading sellers...</Text>
            </View>
          ) : eligibleSellers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>No eligible sellers at the moment</Text>
            </View>
          ) : (
            <View style={styles.sellersList}>
              {eligibleSellers.map((seller) => (
                <View key={seller.seller_id} style={[styles.sellerCard, shadows.sm]}>
                  <View style={styles.sellerHeader}>
                    <View style={[styles.sellerIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="business-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.sellerInfo}>
                      <Text style={styles.sellerName}>{seller.company_name}</Text>
                      <Text style={styles.sellerSubtext}>
                        {seller.eligible_order_count} eligible order{seller.eligible_order_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.revenueGrid}>
                    <View style={styles.revenueItem}>
                      <Text style={styles.revenueLabel}>Gross Revenue</Text>
                      <Text style={[styles.revenueValue, { color: colors.primary }]}>
                        ₹{seller.total_eligible_revenue.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.revenueItem}>
                      <Text style={styles.revenueLabel}>Commission (10%)</Text>
                      <Text style={[styles.revenueValue, { color: colors.error }]}>
                        -₹{(seller.total_eligible_revenue * 0.10).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.revenueItem}>
                      <Text style={styles.revenueLabel}>Net Payout</Text>
                      <Text style={[styles.revenueValue, { color: colors.success }]}>
                        ₹{seller.net_eligible_amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.payoutButton}
                    onPress={() => handleInitiatePayout(seller)}
                  >
                    <Ionicons name="cash-outline" size={20} color="#fff" />
                    <Text style={styles.payoutButtonText}>Create Payout</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payout History Section */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payouts</Text>
            <Text style={styles.sectionCount}>{allPayouts.length} total</Text>
          </View>

          {allPayouts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No payouts yet</Text>
              <Text style={styles.emptySubtitle}>Payouts will appear here once created</Text>
            </View>
          ) : (
            <View style={styles.payoutsList}>
              {allPayouts.map((payout) => (
                <View key={payout.id} style={[styles.payoutCard, shadows.sm]}>
                  <View style={styles.payoutHeader}>
                    <View style={styles.payoutSellerInfo}>
                      <View style={[styles.payoutIcon, { backgroundColor: colors.primary + '10' }]}>
                        <Ionicons name="business-outline" size={16} color={colors.primary} />
                      </View>
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
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(payout.status) + '15' }
                    ]}>
                      <Ionicons 
                        name={getStatusIcon(payout.status)} 
                        size={12} 
                        color={getStatusColor(payout.status)} 
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(payout.status) }]}>
                        {payout.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.payoutAmount}>₹{payout.amount.toFixed(2)}</Text>
                  
                  {payout.bank_account && (
                    <View style={styles.payoutBankInfo}>
                      <Ionicons name="card-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.payoutBank}>
                        {payout.bank_account.bank_name} • XXXX{payout.bank_account.account_number.slice(-4)}
                      </Text>
                    </View>
                  )}

                  {payout.transaction_reference && (
                    <View style={styles.payoutRefInfo}>
                      <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.payoutRef}>Ref: {payout.transaction_reference}</Text>
                    </View>
                  )}

                  {payout.status === 'pending' && (
                    <View style={styles.payoutActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.razorpayButton]}
                        onPress={() => handleProcessPayoutViaRazorpay(payout.id)}
                        disabled={processing}
                      >
                        <Ionicons name="flash-outline" size={16} color={colors.primary} />
                        <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                          Process via Razorpay
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={() => handleUpdatePayoutStatus(payout.id, 'completed')}
                      >
                        <Ionicons name="checkmark-outline" size={16} color={colors.success} />
                        <Text style={[styles.actionButtonText, { color: colors.success }]}>
                          Mark Completed
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {payout.status === 'processing' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton, { width: '100%' }]}
                      onPress={() => handleUpdatePayoutStatus(payout.id, 'completed')}
                    >
                      <Ionicons name="checkmark-outline" size={16} color={colors.success} />
                      <Text style={[styles.actionButtonText, { color: colors.success }]}>
                        Mark as Completed
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
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Initiate Payout</Text>
              <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {selectedSeller && (
              <View style={styles.modalBody}>
                <View style={styles.modalSellerInfo}>
                  <View style={styles.modalSellerIcon}>
                    <Ionicons name="business-outline" size={32} color={colors.primary} />
                  </View>
                  <View style={styles.modalSellerDetails}>
                    <Text style={styles.modalSellerName}>{selectedSeller.company_name}</Text>
                    <Text style={styles.modalBankInfo}>
                      {selectedSeller.bank_account?.bank_name} • {selectedSeller.bank_account?.account_holder_name}
                    </Text>
                    <View style={styles.modalAmountBadge}>
                      <Text style={styles.modalPendingAmount}>
                        Eligible: ₹{selectedSeller.net_eligible_amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payout Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={payoutAmount}
                    onChangeText={setPayoutAmount}
                    placeholder="Enter amount"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={payoutNotes}
                    onChangeText={setPayoutNotes}
                    placeholder="Add any notes"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowPayoutModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.createButton]}
                    onPress={handleCreatePayout}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="cash-outline" size={18} color="#fff" />
                        <Text style={styles.createButtonText}>Create Payout</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
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
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? spacing.md : spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.85,
    fontSize: 12,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.lg,
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  kpiValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  kpiSub: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 4,
  },
  batchSection: {
    marginTop: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  batchGradient: {
    padding: spacing.lg,
  },
  batchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  batchIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.warning + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  batchTextContainer: {
    flex: 1,
  },
  batchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  batchSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  batchNote: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  batchButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  batchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sellersList: {
    gap: 12,
  },
  sellerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sellerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sellerSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  revenueGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  revenueItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  revenueValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  payoutButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  payoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  payoutsList: {
    gap: 12,
  },
  payoutCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payoutSellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutCompany: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  payoutDate: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginVertical: 8,
  },
  payoutBankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  payoutBank: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  payoutRefInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  payoutRef: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  payoutActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  razorpayButton: {
    backgroundColor: colors.primary + '10',
  },
  completeButton: {
    backgroundColor: colors.success + '10',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  modalSellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalSellerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSellerDetails: {
    flex: 1,
  },
  modalSellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalBankInfo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalAmountBadge: {
    marginTop: 6,
  },
  modalPendingAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: colors.primary,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});