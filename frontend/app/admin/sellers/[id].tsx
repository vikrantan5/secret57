import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';
import { supabase, supabaseAdmin } from '../../../src/services/supabase';
import {
  useSellerDocumentsStore,
  SellerDocument,
} from '../../../src/store/sellerDocumentsStore';
import { sendApprovalEmail } from '../../../src/utils/sendApprovalEmail';

type ReviewAction = 'approved' | 'rejected';

export default function AdminSellerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sellerId = String(id || '');

  const { documents, loading, fetchBySeller, updateStatus, getSignedPreviewUrl } =
    useSellerDocumentsStore();

  const [seller, setSeller] = useState<any>(null);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<SellerDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reviewModalDoc, setReviewModalDoc] = useState<SellerDocument | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  const loadSeller = useCallback(async () => {
    if (!sellerId) return;
    setLoadingSeller(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('sellers')
        .select(`
          *,
          user:users!sellers_user_id_fkey(*),
          category:categories(id, name, slug, type, icon)
        `)
        .eq('id', sellerId)
        .single();
      if (error) throw error;
      setSeller(data);
    } catch (e: any) {
      console.error('[admin/sellers/[id]] load seller error:', e);
      Alert.alert('Error', e.message || 'Failed to load seller');
    } finally {
      setLoadingSeller(false);
    }
  }, [sellerId]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminUserId(user?.id || null);
    })();
  }, []);

  useEffect(() => {
    if (sellerId) {
      loadSeller();
      fetchBySeller(sellerId);
    }
  }, [sellerId, loadSeller, fetchBySeller]);

  // ✅ Auto-import any legacy verification_documents (sellers.verification_documents array)
  // into the seller_documents table so the admin can verify them.
  useEffect(() => {
    if (!seller?.id) return;
    if (!Array.isArray(seller.verification_documents)) return;
    if (loading || documents === undefined) return;

    const knownUrls = new Set(documents.map((d) => d.document_url));
    const legacy: string[] = seller.verification_documents.filter(
      (u: string) => u && !knownUrls.has(u)
    );
    if (legacy.length === 0) return;

    (async () => {
      console.log(`[admin/sellers/[id]] importing ${legacy.length} legacy documents into seller_documents`);
      const rows = legacy.map((url, idx) => {
        const ext = (url.split('.').pop() || '').toLowerCase().split('?')[0];
        const isPdf = ext === 'pdf';
        return {
          seller_id: seller.id,
          document_name: `Document ${idx + 1}`,
          document_type: isPdf ? 'pdf' : 'image',
          document_url: url,
          mime_type: isPdf ? 'application/pdf' : 'image/jpeg',
          verification_status: 'pending',
        };
      });
      const { error } = await supabaseAdmin.from('seller_documents').insert(rows);
      if (error) {
        console.warn('[seller_documents] legacy import failed:', error.message);
      } else {
        await fetchBySeller(seller.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller?.id, documents.length]);

  const openPreview = async (doc: SellerDocument) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    const url = await getSignedPreviewUrl(doc, 3600);
    console.log('[admin/sellers/[id]] preview URL ready:', url ? 'ok' : 'fallback');
    setPreviewUrl(url);
    setPreviewLoading(false);
  };

  const closePreview = () => {
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  const openExternal = async () => {
    if (!previewUrl) return;
    try {
      await Linking.openURL(previewUrl);
    } catch {
      Alert.alert('Error', 'Could not open document');
    }
  };

  const onReviewPress = (doc: SellerDocument, action: ReviewAction) => {
    setReviewModalDoc(doc);
    setReviewAction(action);
    setReviewNotes(doc.admin_notes || '');
  };

  const submitReview = async () => {
    if (!reviewModalDoc) return;
    if (reviewAction === 'rejected' && !reviewNotes.trim()) {
      Alert.alert('Reason required', 'Please add a note explaining the rejection.');
      return;
    }
    setSubmittingReview(true);
    const result = await updateStatus(
      reviewModalDoc.id,
      reviewAction,
      reviewNotes.trim() || undefined,
      adminUserId || undefined
    );
    setSubmittingReview(false);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to update document');
      return;
    }
    setReviewModalDoc(null);
    setReviewNotes('');
  };

  const verifySeller = async (status: 'approved' | 'rejected', rejectionReason?: string) => {
    if (!seller) return;
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === 'rejected') updates.rejection_reason = rejectionReason || 'Documents rejected';

      const { error } = await supabaseAdmin
        .from('sellers')
        .update(updates)
        .eq('id', seller.id);
      if (error) throw error;

      await supabaseAdmin
        .from('users')
        .update({ seller_status: status })
        .eq('id', seller.user_id);

      if (seller.user?.email) {
        sendApprovalEmail({
          type: status === 'approved' ? 'company_approved' : 'company_rejected',
          to: seller.user.email,
          name: seller.user.name,
          company_name: seller.company_name,
          reason: rejectionReason,
          userId: seller.user_id,
        }).catch((e) => console.warn('email send failed:', e));
      }

      Alert.alert('Success', `Seller ${status}`);
      await loadSeller();
    } catch (e: any) {
      console.error('[admin/sellers/[id]] verify seller error:', e);
      Alert.alert('Error', e.message || 'Failed to update seller');
    }
  };

  const promptVerifyApprove = () => {
    Alert.alert(
      'Approve Seller',
      `Approve "${seller?.company_name}" and grant access?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => verifySeller('approved') },
      ]
    );
  };

  const promptVerifyReject = () => {
    Alert.prompt(
      'Reject Seller',
      'Provide a reason:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: (reason) => verifySeller('rejected', reason || 'Documents rejected'),
        },
      ]
    );
  };

  const renderDocCard = (doc: SellerDocument) => {
    const isPdf = doc.document_type === 'pdf' || doc.mime_type === 'application/pdf';
    const statusColor =
      doc.verification_status === 'approved'
        ? colors.success
        : doc.verification_status === 'rejected'
        ? colors.error
        : colors.warning;

    return (
      <View key={doc.id} style={[styles.docCard, shadows.sm]}>
        <View style={styles.docHeader}>
          <View style={styles.docIconBox}>
            <Ionicons
              name={isPdf ? 'document-text-outline' : 'image-outline'}
              size={26}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docName} numberOfLines={2}>
              {doc.document_name}
            </Text>
            <Text style={styles.docMeta}>
              {(doc.document_type || 'file').toUpperCase()} •{' '}
              {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString('en-IN')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {doc.verification_status.toUpperCase()}
            </Text>
          </View>
        </View>

        {!isPdf && doc.document_url ? (
          <TouchableOpacity onPress={() => openPreview(doc)} activeOpacity={0.85}>
            <Image source={{ uri: doc.document_url }} style={styles.docThumb} resizeMode="cover" />
          </TouchableOpacity>
        ) : null}

        {doc.admin_notes ? (
          <View style={styles.notesBox}>
            <Ionicons name="information-circle" size={14} color={colors.textSecondary} />
            <Text style={styles.notesText}>{doc.admin_notes}</Text>
          </View>
        ) : null}

        <View style={styles.docActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.previewBtn]}
            onPress={() => openPreview(doc)}
            data-testid={`view-doc-${doc.id}`}
          >
            <Ionicons name="eye-outline" size={16} color={colors.white} />
            <Text style={styles.actionBtnText}>{isPdf ? 'View PDF' : 'Preview'}</Text>
          </TouchableOpacity>

          {doc.verification_status !== 'approved' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => onReviewPress(doc, 'approved')}
              data-testid={`approve-doc-${doc.id}`}
            >
              <Ionicons name="checkmark-outline" size={16} color={colors.white} />
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
          )}

          {doc.verification_status !== 'rejected' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => onReviewPress(doc, 'rejected')}
              data-testid={`reject-doc-${doc.id}`}
            >
              <Ionicons name="close-outline" size={16} color={colors.white} />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loadingSeller && !seller) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!seller) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderCenter}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.textSecondary} />
          <Text style={{ ...typography.h4, color: colors.text, marginTop: spacing.md }}>
            Seller not found
          </Text>
          <TouchableOpacity style={{ marginTop: spacing.lg }} onPress={() => router.back()}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pending = documents.filter((d) => d.verification_status === 'pending').length;
  const approved = documents.filter((d) => d.verification_status === 'approved').length;
  const rejected = documents.filter((d) => d.verification_status === 'rejected').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Seller Verification</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {seller.company_name}
            </Text>
          </View>
          <TouchableOpacity onPress={loadSeller} style={styles.backButton}>
            <Ionicons name="refresh" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Seller summary */}
        <View style={[styles.summaryCard, shadows.md]}>
          <View style={styles.summaryHeader}>
            {seller.company_logo ? (
              <Image source={{ uri: seller.company_logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, { backgroundColor: colors.primaryVeryLight, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="business" size={28} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.companyName}>{seller.company_name}</Text>
              {seller.category && (
                <Text style={styles.companyMeta}>{seller.category.name}</Text>
              )}
              <View style={[styles.statusBadge, { backgroundColor: colors.primary + '15', alignSelf: 'flex-start', marginTop: 4 }]}>
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  {(seller.status || '').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{seller.user?.name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{seller.user?.email || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{seller.phone || seller.user?.phone || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {[seller.address, seller.city, seller.state, seller.pincode].filter(Boolean).join(', ') || 'N/A'}
              </Text>
            </View>
            {seller.business_registration_number ? (
              <View style={styles.infoRow}>
                <Ionicons name="document-attach-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>GST/Reg: {seller.business_registration_number}</Text>
              </View>
            ) : null}
          </View>

          {/* Document stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{documents.length}</Text>
              <Text style={styles.statLabel}>Documents</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.success }]}>{approved}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.error }]}>{rejected}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>
        </View>

        {/* Verify seller actions */}
        {seller.status !== 'approved' || seller.status === 'rejected' ? (
          <View style={[styles.actionsCard, shadows.sm]}>
            <Text style={styles.sectionTitle}>Seller Verification Decision</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
              <TouchableOpacity
                style={[styles.bigActionBtn, { backgroundColor: colors.success }]}
                onPress={promptVerifyApprove}
                data-testid="verify-approve-seller"
              >
                <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                <Text style={styles.bigActionText}>Approve Seller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bigActionBtn, { backgroundColor: colors.error }]}
                onPress={promptVerifyReject}
                data-testid="verify-reject-seller"
              >
                <Ionicons name="close-circle" size={18} color={colors.white} />
                <Text style={styles.bigActionText}>Reject Seller</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Documents list */}
        <View style={styles.docsSection}>
          <Text style={styles.sectionTitle}>Uploaded Verification Documents</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
          ) : documents.length === 0 ? (
            <View style={styles.emptyDocs}>
              <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No documents uploaded yet</Text>
            </View>
          ) : (
            documents.map(renderDocCard)
          )}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Document preview modal */}
      <Modal visible={!!previewDoc} animationType="slide" onRequestClose={closePreview}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={closePreview} style={styles.previewClose}>
              <Ionicons name="close" size={26} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {previewDoc?.document_name}
            </Text>
            <TouchableOpacity onPress={openExternal} style={styles.previewClose}>
              <Ionicons name="open-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          {previewLoading || !previewUrl ? (
            <View style={styles.loaderCenter}>
              <ActivityIndicator size="large" color={colors.white} />
            </View>
          ) : previewDoc?.document_type === 'pdf' ||
            previewDoc?.mime_type === 'application/pdf' ? (
            <WebView
              source={{
                uri: `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(previewUrl)}`,
              }}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loaderCenter}>
                  <ActivityIndicator size="large" color={colors.white} />
                </View>
              )}
              style={{ flex: 1, backgroundColor: '#000' }}
            />
          ) : (
            <ScrollView
              maximumZoomScale={4}
              minimumZoomScale={1}
              contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            >
              <Image
                source={{ uri: previewUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Review modal */}
      <Modal
        visible={!!reviewModalDoc}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewModalDoc(null)}
      >
        <View style={styles.reviewOverlay}>
          <View style={[styles.reviewCard, shadows.lg]}>
            <Text style={styles.reviewTitle}>
              {reviewAction === 'approved' ? 'Approve Document' : 'Reject Document'}
            </Text>
            <Text style={styles.reviewSubtitle} numberOfLines={2}>
              {reviewModalDoc?.document_name}
            </Text>
            <TextInput
              style={styles.reviewInput}
              placeholder={
                reviewAction === 'approved'
                  ? 'Optional notes (visible to seller)'
                  : 'Reason for rejection (required)'
              }
              placeholderTextColor={colors.textLight}
              value={reviewNotes}
              onChangeText={setReviewNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              data-testid="review-notes-input"
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => setReviewModalDoc(null)}
                disabled={submittingReview}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: reviewAction === 'approved' ? colors.success : colors.error },
                  submittingReview && { opacity: 0.6 },
                ]}
                onPress={submitReview}
                disabled={submittingReview}
                data-testid="submit-review-btn"
              >
                <Text style={{ color: colors.white, fontWeight: '700' }}>
                  {submittingReview ? 'Saving...' : reviewAction === 'approved' ? 'Approve' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loaderCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  backButton: { padding: spacing.sm },
  headerTitle: { ...typography.h3, color: colors.white, fontWeight: '700' },
  headerSubtitle: { ...typography.bodySmall, color: 'rgba(255,255,255,0.85)' },

  summaryCard: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  logo: { width: 64, height: 64, borderRadius: borderRadius.full, backgroundColor: colors.border },
  companyName: { ...typography.h4, color: colors.text, fontWeight: '700' },
  companyMeta: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  infoGrid: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  infoText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: { ...typography.h4, color: colors.primary, fontWeight: '700' },
  statLabel: { ...typography.caption, color: colors.textSecondary },

  actionsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  sectionTitle: { ...typography.h4, color: colors.text, fontWeight: '700' },
  bigActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  bigActionText: { color: colors.white, fontWeight: '700' },

  docsSection: { paddingHorizontal: spacing.lg },
  emptyDocs: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },

  docCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  docHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: { ...typography.body, color: colors.text, fontWeight: '600' },
  docMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  statusText: { ...typography.caption, fontWeight: '700', fontSize: 10 },

  docThumb: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    backgroundColor: colors.background,
  },

  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
  },
  notesText: { ...typography.caption, color: colors.textSecondary, flex: 1 },

  docActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1,
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  previewBtn: { backgroundColor: colors.primary },
  approveBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: colors.error },
  actionBtnText: { color: colors.white, fontWeight: '600', fontSize: 12 },

  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#111',
  },
  previewClose: { padding: spacing.sm },
  previewTitle: { flex: 1, color: colors.white, fontWeight: '600', textAlign: 'center' },

  reviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  reviewCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  reviewTitle: { ...typography.h3, color: colors.text, fontWeight: '700' },
  reviewSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  reviewInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    color: colors.text,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
