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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useBankAccountStore } from '../../src/store/bankAccountStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

const { width } = Dimensions.get('window');

export default function PayoutSettingsScreen() {
  const router = useRouter();
  const { seller, fetchSellerProfile } = useSellerStore();
  const { user } = useAuthStore();
  const { bankAccounts, payouts, fetchBankAccounts, fetchPayouts, addBankAccount, deleteBankAccount, setPrimaryAccount, validateIFSC, validateAccountNumber, validatePAN, loading } = useBankAccountStore();

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

  // Fetch seller profile when component mounts
  useEffect(() => {
    if (user?.id && !seller) {
      console.log('📋 Fetching seller profile for user:', user.id);
      fetchSellerProfile(user.id);
    }
  }, [user?.id, seller]);

  useEffect(() => {
    if (seller?.id) {
      console.log('💼 Seller profile loaded:', seller.id, seller.company_name);
      fetchBankAccounts(seller.id);
      fetchPayouts(seller.id);
    } else {
      console.warn('⚠️ No seller profile found');
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
              if (seller?.id) fetchBankAccounts(seller.id);
            } else {
              Alert.alert('Error', result.error || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleSetPrimaryAccount = async (accountId: string, bankName: string) => {
    if (!seller?.id) return;
    
    Alert.alert(
      'Set Primary Account',
      `Set ${bankName} as your primary payout account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set as Primary',
          onPress: async () => {
            const result = await setPrimaryAccount(accountId, seller.id);
            if (result.success) {
              Alert.alert('Success', 'Primary account updated successfully');
              fetchBankAccounts(seller.id);
            } else {
              Alert.alert('Error', result.error || 'Failed to set primary account');
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

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'processing':
        return '#6366f1';
      case 'pending':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Payout Settings</Text>
            <View style={{ width: 40 }} />
          </View>
        </BlurView>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Check if seller profile exists */}
          {!seller ? (
            <LinearGradient
              colors={['#1e1e1e', '#161616']}
              style={styles.noSellerContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.noSellerIconContainer}>
                <Ionicons name="alert-circle-outline" size={80} color="#f59e0b" />
              </View>
              <Text style={styles.noSellerTitle}>No Seller Profile Found</Text>
              <Text style={styles.noSellerText}>
                You need to complete your seller registration before managing payout settings.
              </Text>
              <Button
                title="Complete Seller Registration"
                onPress={() => router.push('/seller/company-setup' as any)}
                style={{ marginTop: spacing.lg }}
              />
            </LinearGradient>
          ) : (
            <>
              {/* Payout Summary */}
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.summaryCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.summaryTitle}>Payout Summary</Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Received</Text>
                    <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                      ₹{calculateTotalPayouts().toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Pending</Text>
                    <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                      ₹{calculatePendingPayouts().toFixed(2)}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Bank Accounts Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Bank Accounts</Text>
                  {!showAddForm && (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => setShowAddForm(true)}
                      data-testid="add-bank-account-button"
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['#6366f1', '#8b5cf6']}
                        style={styles.addButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.addButtonText}>Add Account</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Add Bank Account Form */}
                {showAddForm && (
                  <LinearGradient
                    colors={['#1e1e1e', '#161616']}
                    style={styles.formCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.formHeader}>
                      <Text style={styles.formTitle}>Add Bank Account</Text>
                      <TouchableOpacity onPress={() => setShowAddForm(false)}>
                        <Ionicons name="close" size={24} color="#9ca3af" />
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
                  </LinearGradient>
                )}

                {/* Bank Accounts List */}
                {loading && bankAccounts.length === 0 ? (
                  <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
                ) : bankAccounts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <LinearGradient
                      colors={['#1a1a1a', '#0a0a0a']}
                      style={styles.emptyIconContainer}
                    >
                      <Ionicons name="card-outline" size={60} color="#6366f1" />
                    </LinearGradient>
                    <Text style={styles.emptyText}>No bank accounts added</Text>
                    <Text style={styles.emptySubtext}>
                      Add your bank account to receive payouts
                    </Text>
                  </View>
                ) : (
                  <View style={styles.accountsList}>
                    {bankAccounts.map((account) => (
                      <LinearGradient
                        key={account.id}
                        colors={['#1e1e1e', '#161616']}
                        style={styles.accountCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.accountHeader}>
                          <LinearGradient
                            colors={['#6366f1', '#8b5cf6']}
                            style={styles.accountIcon}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name="business" size={24} color="#FFFFFF" />
                          </LinearGradient>
                          <View style={styles.accountInfo}>
                            <Text style={styles.accountBankName}>{account.bank_name}</Text>
                            <Text style={styles.accountHolderName}>
                              {account.account_holder_name}
                            </Text>
                          </View>
                          {account.is_primary && (
                            <LinearGradient
                              colors={['#10b981', '#059669']}
                              style={styles.primaryBadge}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Text style={styles.primaryText}>PRIMARY</Text>
                            </LinearGradient>
                          )}
                        </View>
                        
                        <View style={styles.accountDetails}>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Account Number</Text>
                            <Text style={styles.detailValue}>
                              XXXX{account.account_number?.slice(-4)}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>IFSC Code</Text>
                            <Text style={styles.detailValue}>{account.ifsc_code}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Account Type</Text>
                            <Text style={styles.detailValue}>
                              {account.account_type?.charAt(0).toUpperCase() + account.account_type?.slice(1)}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Status</Text>
                            <View style={[
                              styles.statusBadge,
                              account.verification_status === 'verified' ? styles.verifiedBadge : 
                              account.verification_status === 'failed' ? styles.failedBadge :
                              styles.unverifiedBadge
                            ]}>
                              <View style={[
                                styles.statusDot,
                                account.verification_status === 'verified' ? styles.verifiedDot :
                                account.verification_status === 'failed' ? styles.failedDot :
                                styles.unverifiedDot
                              ]} />
                              <Text style={[
                                styles.statusText,
                                account.verification_status === 'verified' ? styles.verifiedText : 
                                account.verification_status === 'failed' ? styles.failedText :
                                styles.unverifiedText
                              ]}>
                                {account.verification_status === 'verified' ? 'Cashfree Verified' : 
                                 account.verification_status === 'failed' ? 'Verification Failed' :
                                 'Pending Verification'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        {/* Mark as Primary Button */}
                        {!account.is_primary && account.verification_status === 'verified' && (
                          <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleSetPrimaryAccount(account.id, account.bank_name)}
                            data-testid="set-primary-button"
                            activeOpacity={0.7}
                          >
                            <LinearGradient
                              colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                              style={styles.primaryButtonGradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Ionicons name="star-outline" size={18} color="#a78bfa" />
                              <Text style={styles.primaryButtonText}>Set as Primary</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteAccount(account.id, account.bank_name)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={20} color="#f87171" />
                          <Text style={styles.deleteButtonText}>Remove Account</Text>
                        </TouchableOpacity>
                      </LinearGradient>
                    ))}
                  </View>
                )}
              </View>

              {/* Payout History */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payout History</Text>
                
                {payouts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <LinearGradient
                      colors={['#1a1a1a', '#0a0a0a']}
                      style={styles.emptyIconContainer}
                    >
                      <Ionicons name="receipt-outline" size={60} color="#6366f1" />
                    </LinearGradient>
                    <Text style={styles.emptyText}>No payouts yet</Text>
                    <Text style={styles.emptySubtext}>
                      Your payout history will appear here
                    </Text>
                  </View>
                ) : (
                  <View style={styles.payoutsList}>
                    {payouts.map((payout) => (
                      <LinearGradient
                        key={payout.id}
                        colors={['#1e1e1e', '#161616']}
                        style={styles.payoutCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.payoutHeader}>
                          <Text style={styles.payoutAmount}>₹{payout.amount?.toFixed(2)}</Text>
                          <View style={[
                            styles.payoutStatusBadge,
                            { backgroundColor: getPayoutStatusColor(payout.status) + '20' }
                          ]}>
                            <View style={[
                              styles.statusDot,
                              { backgroundColor: getPayoutStatusColor(payout.status) }
                            ]} />
                            <Text style={[
                              styles.payoutStatusText,
                              { color: getPayoutStatusColor(payout.status) }
                            ]}>
                              {payout.status?.toUpperCase()}
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
                      </LinearGradient>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: spacing.xxl,
  },
  noSellerContainer: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noSellerIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  noSellerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  noSellerText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  summaryCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButton: {
    overflow: 'hidden',
    borderRadius: borderRadius.md,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  addButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  formCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
  },
  typeButtonTextSelected: {
    color: '#FFFFFF',
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
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  accountsList: {
    gap: spacing.md,
  },
  accountCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountBankName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  accountHolderName: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: spacing.xs / 2,
  },
  primaryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  primaryText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  accountDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  unverifiedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  failedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  verifiedDot: {
    backgroundColor: '#10b981',
  },
  unverifiedDot: {
    backgroundColor: '#f59e0b',
  },
  failedDot: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  verifiedText: {
    color: '#10b981',
  },
  unverifiedText: {
    color: '#f59e0b',
  },
  failedText: {
    color: '#ef4444',
  },
  primaryButton: {
    marginTop: spacing.md,
    overflow: 'hidden',
    borderRadius: borderRadius.md,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  primaryButtonText: {
    fontSize: 14,
    color: '#a78bfa',
    fontWeight: '600',
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
    fontSize: 14,
    color: '#f87171',
    fontWeight: '600',
  },
  payoutsList: {
    gap: spacing.md,
  },
  payoutCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  payoutAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  payoutStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  payoutStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  payoutDate: {
    fontSize: 14,
    color: '#9ca3af',
  },
  payoutRef: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: spacing.xs,
  },
  payoutNotes: {
    fontSize: 13,
    color: '#d1d5db',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});