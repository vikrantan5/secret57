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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSellerStore } from '../../src/store/sellerStore';
import { useBankAccountStore } from '../../src/store/bankAccountStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

export default function PayoutSettingsScreen() {
  const router = useRouter();
  const { seller } = useSellerStore();
  const { bankAccounts, payouts, fetchBankAccounts, fetchPayouts, addBankAccount, deleteBankAccount, validateIFSC, validateAccountNumber, validatePAN, loading } = useBankAccountStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState<'savings' | 'current'>('savings');
  const [upiId, setUpiId] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (seller?.id) {
      fetchBankAccounts(seller.id);
      fetchPayouts(seller.id);
    }
  }, [seller?.id]);

  const validate = () => {
    const newErrors: any = {};

    if (!accountHolderName.trim()) newErrors.accountHolderName = 'Account holder name is required';
    if (!accountNumber.trim()) newErrors.accountNumber = 'Account number is required';
    if (!confirmAccountNumber.trim()) newErrors.confirmAccountNumber = 'Please confirm account number';
    if (accountNumber !== confirmAccountNumber) newErrors.confirmAccountNumber = 'Account numbers do not match';
    
    if (!ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!validateIFSC(ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC code format (e.g., SBIN0001234)';
    }
    
    if (!validateAccountNumber(accountNumber)) {
      newErrors.accountNumber = 'Account number must be 9-18 digits';
    }
    
    if (!bankName.trim()) newErrors.bankName = 'Bank name is required';
    
    if (panNumber && !validatePAN(panNumber)) {
      newErrors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddBankAccount = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly.');
      return;
    }

    if (!seller?.id) {
      Alert.alert('Error', 'Seller profile not found.');
      return;
    }

    try {
      setSubmitting(true);

      const result = await addBankAccount({
        seller_id: seller.id,
        account_holder_name: accountHolderName,
        account_number: accountNumber,
        ifsc_code: ifscCode.toUpperCase(),
        bank_name: bankName,
        account_type: accountType,
        upi_id: upiId || undefined,
        pan_number: panNumber ? panNumber.toUpperCase() : undefined,
      });

      if (result.success) {
        Alert.alert('Success', 'Bank account added successfully!');
        // Reset form
        setAccountHolderName('');
        setAccountNumber('');
        setConfirmAccountNumber('');
        setIfscCode('');
        setBankName('');
        setAccountType('savings');
        setUpiId('');
        setPanNumber('');
        setErrors({});
        setShowAddForm(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to add bank account');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = (accountId: string, bankName: string) => {
    Alert.alert(
      'Delete Bank Account',
      `Are you sure you want to remove this account from ${bankName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteBankAccount(accountId);
            if (result.success) {
              Alert.alert('Success', 'Bank account removed successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const calculateTotalPayouts = () => {
    return payouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const calculatePendingPayouts = () => {
    return payouts
      .filter(p => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Payout Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Payout Summary */}
        <View style={[styles.summaryCard, shadows.md]}>
          <Text style={styles.summaryTitle}>Payout Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Received</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                ₹{calculateTotalPayouts().toFixed(2)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>
                ₹{calculatePendingPayouts().toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Bank Accounts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bank Accounts</Text>
            {!showAddForm && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddForm(true)}
                data-testid="add-bank-account-button"
              >
                <Ionicons name="add-circle" size={24} color={colors.primary} />
                <Text style={styles.addButtonText}>Add Account</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Add Bank Account Form */}
          {showAddForm && (
            <View style={[styles.formCard, shadows.sm]}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Add Bank Account</Text>
                <TouchableOpacity onPress={() => setShowAddForm(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Input
                label="Account Holder Name *"
                value={accountHolderName}
                onChangeText={setAccountHolderName}
                placeholder="Enter account holder name"
                error={errors.accountHolderName}
              />

              <Input
                label="Account Number *"
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Enter account number"
                keyboardType="number-pad"
                error={errors.accountNumber}
              />

              <Input
                label="Confirm Account Number *"
                value={confirmAccountNumber}
                onChangeText={setConfirmAccountNumber}
                placeholder="Re-enter account number"
                keyboardType="number-pad"
                error={errors.confirmAccountNumber}
              />

              <Input
                label="IFSC Code *"
                value={ifscCode}
                onChangeText={(text) => setIfscCode(text.toUpperCase())}
                placeholder="Enter IFSC code"
                autoCapitalize="characters"
                maxLength={11}
                error={errors.ifscCode}
              />

              <Input
                label="Bank Name *"
                value={bankName}
                onChangeText={setBankName}
                placeholder="Enter bank name"
                error={errors.bankName}
              />
                <Input
                label="UPI ID (Optional)"
                value={upiId}
                onChangeText={setUpiId}
                placeholder="yourname@upi"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="PAN Number (Optional)"
                value={panNumber}
                onChangeText={(text) => setPanNumber(text.toUpperCase())}
                placeholder="ABCDE1234F"
                autoCapitalize="characters"
                maxLength={10}
                error={errors.panNumber}
              />

              {/* Account Type */}
              <Text style={styles.label}>Account Type</Text>
              <View style={styles.accountTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    accountType === 'savings' && styles.typeButtonSelected,
                  ]}
                  onPress={() => setAccountType('savings')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      accountType === 'savings' && styles.typeButtonTextSelected,
                    ]}
                  >
                    Savings
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    accountType === 'current' && styles.typeButtonSelected,
                  ]}
                  onPress={() => setAccountType('current')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      accountType === 'current' && styles.typeButtonTextSelected,
                    ]}
                  >
                    Current
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowAddForm(false)}
                  variant="outline"
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title="Add Account"
                  onPress={handleAddBankAccount}
                  loading={submitting}
                  variant="primary"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          {/* Bank Accounts List */}
          {loading && bankAccounts.length === 0 ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : bankAccounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No bank accounts added</Text>
              <Text style={styles.emptySubtext}>
                Add your bank account to receive payouts
              </Text>
            </View>
          ) : (
            <View style={styles.accountsList}>
              {bankAccounts.map((account) => (
                <View key={account.id} style={[styles.accountCard, shadows.sm]}>
                  <View style={styles.accountHeader}>
                    <View style={styles.accountIcon}>
                      <Ionicons name="business" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountBankName}>{account.bank_name}</Text>
                      <Text style={styles.accountHolderName}>
                        {account.account_holder_name}
                      </Text>
                    </View>
                    {account.is_primary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryText}>PRIMARY</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.accountDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account Number</Text>
                      <Text style={styles.detailValue}>
                        XXXX{account.account_number.slice(-4)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>IFSC Code</Text>
                      <Text style={styles.detailValue}>{account.ifsc_code}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account Type</Text>
                      <Text style={styles.detailValue}>
                        {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <View style={[
                        styles.statusBadge,
                        account.is_verified ? styles.verifiedBadge : styles.unverifiedBadge
                      ]}>
                        <Text style={[
                          styles.statusText,
                          account.is_verified ? styles.verifiedText : styles.unverifiedText
                        ]}>
                          {account.is_verified ? 'Verified' : 'Pending Verification'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteAccount(account.id, account.bank_name)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Text style={styles.deleteButtonText}>Remove Account</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payout History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout History</Text>
          
          {payouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No payouts yet</Text>
              <Text style={styles.emptySubtext}>
                Your payout history will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.payoutsList}>
              {payouts.map((payout) => (
                <View key={payout.id} style={[styles.payoutCard, shadows.sm]}>
                  <View style={styles.payoutHeader}>
                    <Text style={styles.payoutAmount}>₹{payout.amount.toFixed(2)}</Text>
                    <View style={[
                      styles.payoutStatusBadge,
                      { backgroundColor: getPayoutStatusColor(payout.status) + '20' }
                    ]}>
                      <Text style={[
                        styles.payoutStatusText,
                        { color: getPayoutStatusColor(payout.status) }
                      ]}>
                        {payout.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.payoutDate}>
                    {new Date(payout.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                  {payout.transaction_reference && (
                    <Text style={styles.payoutRef}>
                      Ref: {payout.transaction_reference}
                    </Text>
                  )}
                  {payout.notes && (
                    <Text style={styles.payoutNotes}>{payout.notes}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getPayoutStatusColor = (status: string) => {
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
  summaryCard: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  summaryTitle: {
    ...typography.h4,
    color: colors.surface,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: colors.surface + '30',
  },
  summaryLabel: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  formTitle: {
    ...typography.h4,
    color: colors.text,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  typeButtonTextSelected: {
    color: colors.surface,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
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
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  accountsList: {
    gap: spacing.md,
  },
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountBankName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  accountHolderName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  primaryBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  primaryText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
    fontSize: 10,
  },
  accountDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  verifiedBadge: {
    backgroundColor: colors.success + '20',
  },
  unverifiedBadge: {
    backgroundColor: colors.warning + '20',
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  verifiedText: {
    color: colors.success,
  },
  unverifiedText: {
    color: colors.warning,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  deleteButtonText: {
    ...typography.body,
    color: colors.error,
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
  payoutAmount: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  payoutStatusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  payoutStatusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  payoutDate: {
    ...typography.body,
    color: colors.textSecondary,
  },
  payoutRef: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  payoutNotes: {
    ...typography.bodySmall,
    color: colors.text,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
