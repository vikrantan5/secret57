import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/services/supabase';

type ApprovalTab = 'profile' | 'company';

export default function PendingSellersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ApprovalTab>('profile');
  const [profileApprovals, setProfileApprovals] = useState<any[]>([]);
  const [companyApprovals, setCompanyApprovals] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      
      // Load pending seller profile approvals (users who just registered)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'seller')
        .eq('seller_status', 'pending')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      
      // Load pending company approvals (sellers who submitted company details)
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select(`
          *,
          user:users!sellers_user_id_fkey(*),
          category:categories(id, name, slug, type, icon)
        `)
        .eq('status', 'pending')
        .eq('approval_stage', 'company_details')
        .order('created_at', { ascending: false });

      if (sellersError) throw sellersError;
      
      setProfileApprovals(usersData || []);
      setCompanyApprovals(sellersData || []);
    } catch (error: any) {
      console.error('Error loading pending approvals:', error);
      Alert.alert('Error', error.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingApprovals();
    setRefreshing(false);
  };

  // Handle approval for seller profile (basic registration)
  const handleApproveProfile = async (userId: string, userName: string) => {
    Alert.alert(
      'Approve Seller Profile',
      `Approve seller registration for ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .update({ seller_status: 'approved' })
                .eq('id', userId);
              
              if (error) throw error;
              
              Alert.alert('Success', 'Seller profile approved! They can now submit company details.');
              loadPendingApprovals();
            } catch (error) {
              console.error('Approval error:', error);
              Alert.alert('Error', 'Failed to approve seller profile');
            }
          },
        },
      ]
    );
  };

  const handleRejectProfile = async (userId: string, userName: string) => {
    Alert.prompt(
      'Reject Seller Profile',
      `Provide reason for rejecting ${userName}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              const { error } = await supabase
                .from('users')
                .update({ seller_status: 'rejected' })
                .eq('id', userId);
              
              if (error) throw error;
              
              Alert.alert('Success', 'Seller profile rejected');
              loadPendingApprovals();
            } catch (error) {
              console.error('Rejection error:', error);
              Alert.alert('Error', 'Failed to reject seller profile');
            }
          },
        },
      ]
    );
  };

  // Handle approval for company details
  const handleApproveCompany = async (sellerId: string, companyName: string, userId: string) => {
    Alert.alert(
      'Approve Company',
      `Approve company "${companyName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sellers')
                .update({ status: 'approved' })
                .eq('id', sellerId);
              
              if (error) throw error;

              // Also update user status to approved
              const { error: userError } = await supabase
                .from('users')
                .update({ seller_status: 'approved' })
                .eq('id', userId);
              
              if (userError) console.error('Error updating user status:', userError);
              
              Alert.alert('Success', 'Company approved successfully! Seller can now start listing.');
              loadPendingApprovals();
            } catch (error) {
              console.error('Approval error:', error);
              Alert.alert('Error', 'Failed to approve company');
            }
          },
        },
      ]
    );
  };

  const handleRejectCompany = async (sellerId: string, companyName: string, userId: string) => {
    Alert.prompt(
      'Reject Company',
      `Provide reason for rejecting "${companyName}":`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              const { error } = await supabase
                .from('sellers')
                .update({ 
                  status: 'rejected',
                  rejection_reason: reason || 'Not specified'
                })
                .eq('id', sellerId);
              
              if (error) throw error;

              const { error: userError } = await supabase
                .from('users')
                .update({ seller_status: 'rejected' })
                .eq('id', userId);
              
              if (userError) console.error('Error updating user status:', userError);
              
              Alert.alert('Success', 'Company rejected');
              loadPendingApprovals();
            } catch (error) {
              console.error('Rejection error:', error);
              Alert.alert('Error', 'Failed to reject company');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (sellerId: string, companyName: string, seller: any) => {
    Alert.prompt(
      'Reject Seller',
      `Provide reason for rejecting ${companyName}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              if (seller.isIncomplete) {
                const { error: userError } = await supabase
                  .from('users')
                  .update({ seller_status: 'rejected' })
                  .eq('id', sellerId);
                if (userError) throw userError;
              } else {
                const { error } = await supabase
                  .from('sellers')
                  .update({ 
                    status: 'rejected',
                    rejection_reason: reason || 'Not specified'
                  })
                  .eq('id', sellerId);
                if (error) throw error;

                const { error: userError } = await supabase
                  .from('users')
                  .update({ seller_status: 'rejected' })
                  .eq('id', seller.user_id);
                if (userError) console.error('Error updating user status:', userError);
              }
              
              Alert.alert('Success', 'Seller rejected');
              loadPendingSellers();
            } catch (error) {
              console.error('Rejection error:', error);
              Alert.alert('Error', 'Failed to reject seller');
            }
          },
        },
      ]
    );
  };

  const currentList = activeTab === 'profile' ? profileApprovals : companyApprovals;
  const currentCount = currentList.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[colors.warning, '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Pending Approvals</Text>
            <Text style={styles.headerSubtitle}>
              {profileApprovals.length} profiles • {companyApprovals.length} companies
            </Text>
          </View>
          <TouchableOpacity onPress={loadPendingApprovals} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons 
            name="person-outline" 
            size={20} 
            color={activeTab === 'profile' ? colors.white : colors.text} 
          />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            Seller Profile
          </Text>
          {profileApprovals.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{profileApprovals.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'company' && styles.activeTab]}
          onPress={() => setActiveTab('company')}
        >
          <Ionicons 
            name="business-outline" 
            size={20} 
            color={activeTab === 'company' ? colors.white : colors.text} 
          />
          <Text style={[styles.tabText, activeTab === 'company' && styles.activeTabText]}>
            Company Details
          </Text>
          {companyApprovals.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{companyApprovals.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {currentCount === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="checkmark-circle" size={60} color={colors.success} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>
              No pending {activeTab === 'profile' ? 'seller profile' : 'company'} approvals
            </Text>
          </View>
        ) : (
          <View style={styles.sellerList}>
            {activeTab === 'profile' ? (
              // Render Profile Approvals
              profileApprovals.map((user) => (
                <View key={user.id} style={[styles.sellerCard, shadows.md]}>
                  <View style={styles.profileBadge}>
                    <Ionicons name="person-add" size={16} color={colors.primary} />
                    <Text style={styles.profileBadgeText}>Seller Registration</Text>
                  </View>
                  
                  <Text style={styles.companyName}>{user.name}</Text>
                  
                  <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <Ionicons name="mail" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>{user.email}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Ionicons name="call" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>{user.phone}</Text>
                    </View>
                    
                    <View style={styles.dateRow}>
                      <Ionicons name="calendar" size={14} color={colors.textLight} />
                      <Text style={styles.dateText}>
                        Registered: {new Date(user.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton, shadows.sm]}
                      onPress={() => handleRejectProfile(user.id, user.name)}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.white} />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton, shadows.sm]}
                      onPress={() => handleApproveProfile(user.id, user.name)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              // Render Company Approvals
              companyApprovals.map((seller) => (
                <View key={seller.id} style={[styles.sellerCard, shadows.md]}>
                  {seller.company_logo && (
                    <Image source={{ uri: seller.company_logo }} style={styles.logo} />
                  )}
                  
                  <Text style={styles.companyName}>{seller.company_name}</Text>
                  
                  {seller.category && (
                    <View style={[styles.categoryBadge, { 
                      backgroundColor: seller.category.type === 'booking' ? '#F59E0B20' : 
                                       seller.category.type === 'ecommerce' ? '#10B98120' : '#8B5CF620' 
                    }]}>
                      <Ionicons 
                        name={seller.category.icon as any} 
                        size={14} 
                        color={seller.category.type === 'booking' ? '#F59E0B' : 
                               seller.category.type === 'ecommerce' ? '#10B981' : '#8B5CF6'} 
                      />
                      <Text style={[styles.categoryText, { 
                        color: seller.category.type === 'booking' ? '#F59E0B' : 
                               seller.category.type === 'ecommerce' ? '#10B981' : '#8B5CF6' 
                      }]}>
                        {seller.category.name} • {seller.category.type}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <Ionicons name="person" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>{seller.user?.name || 'N/A'}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>{seller.city}, {seller.state}</Text>
                    </View>
                    
                    {seller.description && (
                      <View style={styles.descriptionBox}>
                        <Text style={styles.description} numberOfLines={2}>
                          {seller.description}
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.dateRow}>
                      <Ionicons name="calendar" size={14} color={colors.textLight} />
                      <Text style={styles.dateText}>
                        Submitted: {new Date(seller.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton, shadows.sm]}
                      onPress={() => handleRejectCompany(seller.id, seller.company_name, seller.user_id)}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.white} />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton, shadows.sm]}
                      onPress={() => handleApproveCompany(seller.id, seller.company_name, seller.user_id)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs / 2,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  activeTabText: {
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs / 2,
  },
  badgeText: {
    ...typography.caption,
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIconBox: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  sellerList: {
    padding: spacing.lg,
  },
  sellerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.xs / 2,
  },
  profileBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  incompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.xs / 2,
  },
  incompleteText: {
    ...typography.caption,
    color: '#F59E0B',
    fontWeight: '700',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.border,
    borderWidth: 3,
    borderColor: colors.primaryVeryLight,
  },
  companyName: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs / 2,
    marginBottom: spacing.md,
  },
  categoryText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  descriptionBox: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dateText: {
    ...typography.caption,
    color: colors.textLight,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
});