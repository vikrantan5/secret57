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
  Image,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRefundStore } from '../../../src/store/refundStore';
import { spacing, borderRadius } from '../../../src/constants/theme';

const STATUS_OPTIONS = [
  { value: 'approved',  label: 'Approve',       icon: 'checkmark-circle-outline', gradient: ['#3B82F6', '#2563EB'] as const, showFor: ['pending', 'requested', 'under_review'] },
  { value: 'rejected',  label: 'Reject',        icon: 'close-circle-outline',     gradient: ['#EF4444', '#DC2626'] as const, showFor: ['pending', 'requested', 'under_review'] },
  { value: 'processing',label: 'Mark Processing', icon: 'refresh-outline',         gradient: ['#8B5CF6', '#7C3AED'] as const, showFor: ['approved'] },
];

const TERMINAL = new Set(['rejected', 'refunded', 'processed']);
const PROCESSABLE = new Set(['approved', 'processing']);

const PAYMENT_METHODS = ['UPI', 'Bank Transfer', 'Wallet', 'Cash', 'Razorpay', 'Cashfree', 'Other'];

const formatDate = (s?: string) => {
  if (!s) return 'N/A';
  return new Date(s).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const getStatusGradient = (status: string): [string, string] => {
  switch (status) {
    case 'pending':
    case 'requested':
    case 'under_review':
      return ['#F59E0B', '#D97706'];
    case 'approved':
    case 'processing':
      return ['#3B82F6', '#2563EB'];
    case 'rejected':
    case 'cancelled':
      return ['#EF4444', '#DC2626'];
    case 'processed':
    case 'refunded':
      return ['#10B981', '#059669'];
    default:
      return ['#6B7280', '#4B5563'];
  }
};

export default function RefundDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const refundId = params.id as string;

  const {
    selectedRefund, loading,
    fetchRefundById, updateRefundStatus, setSelectedRefund,
    markRefundProcessed,
  } = useRefundStore();

  const [response, setResponse]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Mark processed modal state
  const [processModal, setProcessModal] = useState(false);
  const [txId, setTxId]                  = useState('');
  const [payMethod, setPayMethod]        = useState('UPI');
  const [processing, setProcessing]      = useState(false);

  useEffect(() => {
    let active = true;
    if (!refundId) return;
    setHasLoaded(false);
    setSelectedRefund(null);
    fetchRefundById(refundId).finally(() => { if (active) setHasLoaded(true); });
    return () => { active = false; };
  }, [refundId]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setSubmitting(true);
      const result = await updateRefundStatus(refundId, newStatus, response);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', `Refund request has been ${newStatus}`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to update refund status');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkProcessed = async () => {
    if (!txId.trim()) {
      Alert.alert('Transaction ID required', 'Please enter the refund transaction reference.');
      return;
    }
    setProcessing(true);
    const res = await markRefundProcessed(refundId, {
      refund_transaction_id: txId.trim(),
      refund_payment_method: payMethod,
      seller_notes: response.trim() || undefined,
    });
    setProcessing(false);

    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProcessModal(false);
      Alert.alert('Refund Processed', 'Refund marked as processed successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', res.error || 'Failed to mark refund processed.');
    }
  };

  if (!hasLoaded || loading || !selectedRefund || selectedRefund.id !== refundId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>Loading refund details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const refund   = selectedRefund as any;
  const isProduct = refund.refund_type === 'product' || !!refund.order_id;
  const isService = refund.refund_type === 'service' || !!refund.booking_id;

  const customerName = refund.user?.name
    || refund.order?.shipping_name
    || refund.booking?.address?.split(',')[0]
    || 'Customer';
  const customerPhone = refund.user?.phone
    || refund.order?.shipping_phone
    || refund.booking?.phone;
  const customerEmail = refund.user?.email;

  const itemName = isProduct
    ? (refund.refund_items?.[0]?.product_name || refund.refund_items?.[0]?.product?.name || 'Product')
    : (refund.service_refunds?.[0]?.service_name || refund.booking?.service?.name || 'Service');

  const itemImage = isProduct
    ? (refund.refund_items?.[0]?.product_image || refund.refund_items?.[0]?.product?.images?.[0])
    : (refund.service_refunds?.[0]?.service_image || refund.booking?.service?.images?.[0]);

  const statusGrad = getStatusGradient(refund.status);
  const canUpdate  = !TERMINAL.has(refund.status);
  const canProcess = PROCESSABLE.has(refund.status) && !refund.refund_transaction_id;
  const visibleStatusOptions = STATUS_OPTIONS.filter(o => o.showFor.includes(refund.status));

  // Build timeline
  const timeline: { label: string; date?: string; done: boolean }[] = [
    { label: 'Refund Requested', date: refund.created_at, done: true },
    { label: 'Under Review',     date: refund.status === 'approved' || refund.status === 'processing' || refund.status === 'rejected' || refund.status === 'refunded' || refund.status === 'processed'
        ? refund.seller_response_at : undefined,
      done: ['approved','processing','rejected','refunded','processed','under_review'].includes(refund.status) },
    refund.status === 'rejected'
      ? { label: 'Rejected', date: refund.seller_response_at || refund.updated_at, done: true }
      : { label: 'Approved', date: ['approved','processing','refunded','processed'].includes(refund.status) ? (refund.seller_response_at || refund.updated_at) : undefined, done: ['approved','processing','refunded','processed'].includes(refund.status) },
    { label: 'Processed',
      date: refund.refund_processed_at,
      done: refund.status === 'refunded' || refund.status === 'processed' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top'] as any}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#312E81']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} testID="refund-detail-back">
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refund Details</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <Animated.ScrollView showsVerticalScrollIndicator={false} style={{ opacity: fadeAnim }}>
        {/* Hero — type + status */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <LinearGradient
              colors={isProduct ? ['#0EA5E9', '#0284C7'] : ['#A855F7', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.typePill}
            >
              <Ionicons name={isProduct ? 'cube' : 'briefcase'} size={11} color="#FFF" />
              <Text style={styles.typePillText}>{isProduct ? 'PRODUCT REFUND' : 'SERVICE REFUND'}</Text>
            </LinearGradient>

            <LinearGradient colors={statusGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{String(refund.status || '').toUpperCase()}</Text>
            </LinearGradient>
          </View>

          <Text style={styles.heroAmount}>
            ₹{(Number(refund.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.heroSub}>Refund #{(refund.id || '').slice(0, 8)} • Requested {formatDate(refund.created_at)}</Text>
        </View>

        {/* Item */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isProduct ? 'Product Information' : 'Service Information'}</Text>
          <View style={styles.itemRow}>
            {itemImage ? (
              <Image source={{ uri: itemImage }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]}>
                <Ionicons name={isProduct ? 'cube-outline' : 'briefcase-outline'} size={26} color="#9CA3AF" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{itemName}</Text>
              {isProduct && refund.refund_items?.[0]?.quantity && (
                <Text style={styles.subText}>Qty: {refund.refund_items[0].quantity}</Text>
              )}
              {isService && refund.booking?.booking_date && (
                <Text style={styles.subText}>
                  {new Date(refund.booking.booking_date).toLocaleDateString('en-IN')} • {refund.booking.booking_time}
                </Text>
              )}
              {isProduct && refund.order?.order_number && (
                <Text style={styles.subText}>Order #{refund.order.order_number}</Text>
              )}
              {isService && refund.booking?.id && (
                <Text style={styles.subText}>Booking #{String(refund.booking.id).slice(0,8)}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <DetailRow label="Name" value={customerName} />
          {!!customerPhone && <DetailRow label="Phone" value={String(customerPhone)} />}
          {!!customerEmail && <DetailRow label="Email" value={String(customerEmail)} />}
          {(isProduct && refund.order) && (
            <DetailRow label="Order Total" value={`₹${(Number(refund.order.total_amount)||0).toFixed(2)}`} />
          )}
          {(isService && refund.booking) && (
            <DetailRow label="Booking Total" value={`₹${(Number(refund.booking.total_amount)||0).toFixed(2)}`} />
          )}
        </View>

        {/* Reason + evidence */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Refund Reason</Text>
          <Text style={styles.bodyText}>{refund.reason || '—'}</Text>
          {!!refund.description && (
            <>
              <View style={styles.divider} />
              <Text style={styles.bodyLabel}>Additional Details</Text>
              <Text style={styles.bodyText}>{refund.description}</Text>
            </>
          )}
          {!!(refund.images && refund.images.length) && (
            <>
              <View style={styles.divider} />
              <Text style={styles.bodyLabel}>Evidence</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {refund.images.map((u: string, i: number) => (
                  <Image key={i} source={{ uri: u }} style={styles.evidenceImg} />
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* Refund payment instruction (from customer) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Refund Method</Text>
          {refund.upi_id ? (
            <DetailRow label="UPI ID" value={refund.upi_id} highlight />
          ) : refund.bank_account_number ? (
            <>
              <DetailRow label="Account Holder" value={refund.account_holder_name || '—'} />
              <DetailRow label="Account Number" value={refund.bank_account_number} />
              <DetailRow label="IFSC" value={refund.bank_ifsc || '—'} />
              <DetailRow label="Bank" value={refund.bank_name || '—'} />
            </>
          ) : (
            <Text style={styles.subText}>No customer payment preference provided. Use original payment method.</Text>
          )}
        </View>

        {/* Refund transaction (if processed) */}
        {refund.refund_transaction_id && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Refund Transaction</Text>
            <DetailRow label="Transaction ID" value={refund.refund_transaction_id} highlight />
            <DetailRow label="Method" value={refund.refund_payment_method || '—'} />
            <DetailRow label="Processed At" value={formatDate(refund.refund_processed_at)} />
          </View>
        )}

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Refund Timeline</Text>
          <View style={{ marginTop: 4 }}>
            {timeline.map((t, idx) => (
              <View key={idx} style={styles.timelineRow}>
                <View style={[styles.timelineDot, t.done && styles.timelineDotDone]}>
                  {t.done && <Ionicons name="checkmark" size={10} color="#FFF" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timelineLabel, t.done && { color: '#F1F5F9' }]}>{t.label}</Text>
                  {!!t.date && <Text style={styles.timelineDate}>{formatDate(t.date)}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Seller actions */}
        {canUpdate && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Seller Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add a note or message to the customer…"
              placeholderTextColor="#6B7280"
              value={response}
              onChangeText={setResponse}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              testID="seller-refund-notes"
            />

            {/* Status transition buttons */}
            <View style={{ gap: 10, marginTop: 8 }}>
              {visibleStatusOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    if (submitting) return;
                    Alert.alert('Confirm', `Are you sure you want to ${opt.label.toLowerCase()} this refund?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Confirm', onPress: () => handleUpdateStatus(opt.value) },
                    ]);
                  }}
                  disabled={submitting}
                  activeOpacity={0.85}
                  testID={`refund-action-${opt.value}`}
                  style={styles.actionBtnOuter}
                >
                  <LinearGradient
                    colors={opt.gradient as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.actionBtn}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name={opt.icon as any} size={18} color="#FFF" />
                        <Text style={styles.actionBtnText}>{opt.label}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}

              {canProcess && (
                <TouchableOpacity
                  onPress={() => { setTxId(''); setPayMethod(refund.upi_id ? 'UPI' : 'Bank Transfer'); setProcessModal(true); }}
                  activeOpacity={0.85}
                  testID="refund-action-mark-processed"
                  style={styles.actionBtnOuter}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Mark Refund Processed</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {!!customerPhone && (
                <TouchableOpacity
                  onPress={() => Alert.alert('Contact Customer', `Phone: ${customerPhone}`)}
                  activeOpacity={0.85}
                  testID="refund-action-contact-customer"
                  style={[styles.actionBtnOuter, { borderWidth: 1, borderColor: '#1E222A', borderRadius: 12 }]}
                >
                  <View style={[styles.actionBtn, { backgroundColor: 'transparent' }]}>
                    <Ionicons name="call-outline" size={18} color="#A855F7" />
                    <Text style={[styles.actionBtnText, { color: '#A855F7' }]}>Contact Customer</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {!canUpdate && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Seller Response</Text>
            <Text style={styles.bodyText}>{refund.seller_response || 'No response provided.'}</Text>
            {!!refund.seller_response_at && (
              <Text style={[styles.subText, { marginTop: 6 }]}>Responded on {formatDate(refund.seller_response_at)}</Text>
            )}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </Animated.ScrollView>

      {/* Mark Processed Modal */}
      <Modal visible={processModal} transparent animationType="fade" onRequestClose={() => setProcessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.modalIconCircle}>
                <Ionicons name="checkmark-done" size={26} color="#FFF" />
              </LinearGradient>
            </View>
            <Text style={styles.modalTitle}>Mark Refund Processed</Text>
            <Text style={styles.modalSubtitle}>
              Enter the refund transaction reference shared with the customer.
            </Text>

            <Text style={styles.bodyLabel}>Transaction ID</Text>
            <TextInput
              value={txId}
              onChangeText={setTxId}
              placeholder="e.g. RFND-2026-00124 / UTR / Razorpay ID"
              placeholderTextColor="#6B7280"
              style={styles.modalInput}
              testID="process-refund-tx-id"
            />

            <Text style={styles.bodyLabel}>Refund Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setPayMethod(m)}
                  style={[styles.methodChip, payMethod === m && styles.methodChipActive]}
                  testID={`process-refund-method-${m}`}
                >
                  <Text style={[styles.methodChipText, payMethod === m && styles.methodChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setProcessModal(false)}
                disabled={processing}
                style={[styles.modalBtn, styles.modalBtnCancel]}
                testID="process-refund-cancel"
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleMarkProcessed}
                disabled={processing}
                style={[styles.modalBtn, styles.modalBtnConfirm, processing && { opacity: 0.6 }]}
                testID="process-refund-confirm"
              >
                {processing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && { color: '#A855F7', fontWeight: '700' }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0C10' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#9CA3AF', fontSize: 13 },
  headerGradient: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  backButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center' },

  heroCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md,
    padding: spacing.lg, borderRadius: 18,
    backgroundColor: '#13151A', borderWidth: 1, borderColor: '#1E222A',
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  typePillText: { fontSize: 9, color: '#FFF', fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 9, color: '#FFF', fontWeight: '800', letterSpacing: 0.5 },
  heroAmount: { fontSize: 32, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.5 },
  heroSub: { marginTop: 6, fontSize: 12, color: '#8E95A9' },

  card: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.lg, borderRadius: 16,
    backgroundColor: '#13151A', borderWidth: 1, borderColor: '#1E222A',
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#FFF', marginBottom: spacing.sm, letterSpacing: 0.3 },

  itemRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#0B0C10' },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E222A' },
  itemName: { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  subText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  detailLabel: { fontSize: 12, color: '#9CA3AF' },
  detailValue: { fontSize: 13, color: '#F1F5F9', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },

  bodyText: { fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
  bodyLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', marginTop: 8, marginBottom: 6 },
  divider: { height: 1, backgroundColor: '#1E222A', marginVertical: spacing.md },

  evidenceImg: { width: 96, height: 96, borderRadius: 12 },

  timelineRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 6 },
  timelineDot: {
    width: 18, height: 18, borderRadius: 9, marginTop: 2,
    backgroundColor: '#1E222A', alignItems: 'center', justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: '#10B981' },
  timelineLabel: { fontSize: 13, color: '#8E95A9', fontWeight: '600' },
  timelineDate: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  notesInput: {
    backgroundColor: '#0B0C10',
    borderColor: '#1E222A', borderWidth: 1,
    borderRadius: 12, padding: spacing.md,
    color: '#F1F5F9', minHeight: 90, fontSize: 13,
  },

  actionBtnOuter: { borderRadius: 12, overflow: 'hidden' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  modalCard: {
    width: '100%', maxWidth: 460,
    backgroundColor: '#13151A',
    borderRadius: 20, padding: spacing.lg,
    borderWidth: 1, borderColor: '#1E222A',
  },
  modalIconBox: { alignItems: 'center', marginBottom: 12 },
  modalIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: spacing.md, lineHeight: 18 },
  modalInput: {
    backgroundColor: '#0B0C10', borderColor: '#1E222A', borderWidth: 1,
    borderRadius: 12, padding: spacing.md, color: '#F1F5F9', fontSize: 13, marginBottom: 4,
  },
  methodChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
    backgroundColor: '#0B0C10', borderColor: '#1E222A', borderWidth: 1,
  },
  methodChipActive: { backgroundColor: '#312E81', borderColor: '#7C3AED' },
  methodChipText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  methodChipTextActive: { color: '#FFF' },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: '#0B0C10', borderWidth: 1, borderColor: '#1E222A' },
  modalBtnConfirm: { backgroundColor: '#10B981' },
  modalBtnCancelText: { color: '#F1F5F9', fontWeight: '700' },
  modalBtnConfirmText: { color: '#FFF', fontWeight: '700' },
});
