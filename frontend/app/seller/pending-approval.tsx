import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { supabase } from '../../src/services/supabase';

const { width, height } = Dimensions.get('window');

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const { seller, fetchSellerProfile } = useSellerStore();
  // Local copy of user.seller_status so the screen reacts instantly to realtime updates
  const [profileStatus, setProfileStatus] = useState<
    'pending' | 'approved' | 'rejected' | null | undefined
  >(user?.seller_status);

  useEffect(() => {
    if (user?.id) {
      fetchSellerProfile(user.id);
    }
  }, [user]);

  // Realtime subscription: react to admin approving/rejecting the seller's account
  // (Stage 1 - users.seller_status) or company (Stage 2 - sellers.status).
  useEffect(() => {
    if (!user?.id) return;

    const userChannel = supabase
      .channel(`pending-approval-user-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        (payload: any) => {
          const updated = payload?.new;
          if (!updated) return;
          setProfileStatus(updated.seller_status);
          // Refresh user in auth store
          setUser(updated);

          if (updated.seller_status === 'approved') {
            // Stage 1 approved - move them to company setup if they haven't filled it
            // (fetchSellerProfile will tell us)
            fetchSellerProfile(user.id).then(() => {
              const currentSeller = useSellerStore.getState().seller;
              if (!currentSeller) {
                router.replace('/seller/company-setup');
              } else if (currentSeller.status === 'approved') {
                router.replace('/seller/dashboard');
              }
            });
          }
        }
      )
      .subscribe();

    const sellerChannel = supabase
      .channel(`pending-approval-seller-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sellers', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          fetchSellerProfile(user.id);
          const updated = payload?.new;
          if (updated?.status === 'approved') {
            router.replace('/seller/dashboard');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
      supabase.removeChannel(sellerChannel);
    };
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/role-selection');
  };

  const handleRefresh = async () => {
    if (!user?.id) return;
    // Refresh both user record and seller record
    const { data: refreshedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    if (refreshedUser) {
      setUser(refreshedUser);
      setProfileStatus(refreshedUser.seller_status);
      if (refreshedUser.seller_status === 'approved') {
        await fetchSellerProfile(user.id);
        const currentSeller = useSellerStore.getState().seller;
        if (!currentSeller) {
          router.replace('/seller/company-setup');
          return;
        } else if (currentSeller.status === 'approved') {
          router.replace('/seller/dashboard');
          return;
        }
      }
    }
    await fetchSellerProfile(user.id);
  };

  const getStatusInfo = () => {
    // Stage 2 (company-level) - if seller record exists, use its status
    if (seller) {
      if (seller.status === 'rejected') {
        return {
          icon: 'close-circle' as const,
          color: '#ef4444',
          gradientColors: ['#ef4444', '#dc2626'],
          title: 'Company Application Rejected',
          message:
            seller.rejection_reason ||
            'Your company application was rejected. Please contact support for more information.',
          action: 'Contact Support',
          stageLabel: 'Stage 2: Company Verification',
        };
      }

      return {
        icon: 'hourglass-outline' as const,
        color: '#f59e0b',
        gradientColors: ['#f59e0b', '#d97706'],
        title: 'Company Pending Approval',
        message:
          'Your company details are under review. We will notify you once approved. This usually takes 1-2 business days.',
        action: 'Refresh Status',
        stageLabel: 'Stage 2: Company Verification',
      };
    }

    // Stage 1 (profile-level) - no seller record yet
    if (profileStatus === 'rejected') {
      return {
        icon: 'close-circle' as const,
        color: '#ef4444',
        gradientColors: ['#ef4444', '#dc2626'],
        title: 'Seller Account Rejected',
        message:
          'Your seller account application was rejected. Please contact support for more information.',
        action: 'Contact Support',
        stageLabel: 'Stage 1: Account Verification',
      };
    }

    return {
      icon: 'hourglass-outline' as const,
      color: '#f59e0b',
      gradientColors: ['#f59e0b', '#d97706'],
      title: 'Seller Account Pending Approval',
      message:
        'Your seller account is under review. Once the admin approves your account, you will be able to submit your company details. We will notify you by email.',
      action: 'Refresh Status',
      stageLabel: 'Stage 1: Account Verification',
    };
  };

  const statusInfo = getStatusInfo();

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
            <Text style={styles.headerTitle}>Account Status</Text>
            <View style={{ width: 40 }} />
          </View>
        </BlurView>

                <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Animated Icon Container */}
          <LinearGradient
            colors={[statusInfo.gradientColors[0] + '20', statusInfo.gradientColors[1] + '20']}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconInner}>
              <Ionicons name={statusInfo.icon} size={80} color={statusInfo.color} />
            </View>
          </LinearGradient>

          {/* Title */}
          <Text style={styles.title}>{statusInfo.title}</Text>
          
          {/* Stage Label */}
          <View style={styles.stageBadgeWrap}>
            <Ionicons name="layers-outline" size={14} color="#a78bfa" />
            <Text style={styles.stageBadgeText}>{statusInfo.stageLabel}</Text>
          </View>

          {/* Message */}
          <Text style={styles.message}>{statusInfo.message}</Text>

          {/* Company Info Card - only when seller record exists (Stage 2) */}
          {seller ? (
            <LinearGradient
              colors={['#1e1e1e', '#161616']}
              style={styles.companyCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.companyHeader}>
                <View style={styles.companyIconContainer}>
                  <Ionicons name="business-outline" size={20} color="#a78bfa" />
                </View>
                <Text style={styles.companyCardTitle}>Company Information</Text>
              </View>
              
              <View style={styles.companyDetailRow}>
                <Text style={styles.companyLabel}>Company Name</Text>
                <Text style={styles.companyName}>{seller.company_name}</Text>
              </View>
              
              <View style={styles.companyDetailRow}>
                <Text style={styles.companyLabel}>Application Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {seller.status?.toUpperCase() || 'PENDING'}
                  </Text>
                </View>
              </View>

              {seller.created_at && (
                <View style={styles.companyDetailRow}>
                  <Text style={styles.companyLabel}>Submitted On</Text>
                  <Text style={styles.companyValue}>
                    {new Date(seller.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              )}
            </LinearGradient>
          ) : (
            // Stage 1 - show seller's account info instead of company info
            <LinearGradient
              colors={['#1e1e1e', '#161616']}
              style={styles.companyCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.companyHeader}>
                <View style={styles.companyIconContainer}>
                  <Ionicons name="person-outline" size={20} color="#a78bfa" />
                </View>
                <Text style={styles.companyCardTitle}>Account Information</Text>
              </View>

              <View style={styles.companyDetailRow}>
                <Text style={styles.companyLabel}>Name</Text>
                <Text style={styles.companyName}>{user?.name}</Text>
              </View>

              <View style={styles.companyDetailRow}>
                <Text style={styles.companyLabel}>Email</Text>
                <Text style={styles.companyValue}>{user?.email}</Text>
              </View>

              <View style={styles.companyDetailRow}>
                <Text style={styles.companyLabel}>Account Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {(profileStatus || 'PENDING').toString().toUpperCase()}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={statusInfo.action}
              onPress={handleRefresh}
              variant="primary"
              fullWidth
            />
            
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.15)']}
                style={styles.logoutGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="log-out-outline" size={20} color="#f87171" />
                <Text style={styles.logoutText}>Logout</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Help Section */}
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
            style={styles.helpSection}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="help-circle-outline" size={20} color="#a78bfa" />
            <Text style={styles.helpText}>
              Need help? Contact us at support@servicehub.com
            </Text>
          </LinearGradient>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingTop: 100,
    paddingBottom: spacing.xxl,
  },
  scrollView: {
    flex: 1,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.md,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 24,
  },
   stageBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    marginBottom: spacing.md,
  },
  stageBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a78bfa',
    letterSpacing: 0.3,
  },
  companyCard: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  companyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  companyDetailRow: {
    marginBottom: spacing.md,
  },
  companyLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  companyValue: {
    fontSize: 14,
    color: '#d1d5db',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actions: {
    width: '100%',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  logoutButton: {
    overflow: 'hidden',
    borderRadius: borderRadius.md,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    fontSize: 16,
    color: '#f87171',
    fontWeight: '600',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  helpText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    flex: 1,
  },
});