import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';

const { width, height } = Dimensions.get('window');

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { seller, fetchSellerProfile } = useSellerStore();

  useEffect(() => {
    if (user?.id) {
      fetchSellerProfile(user.id);
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/role-selection');
  };

  const getStatusInfo = () => {
    if (seller?.status === 'rejected') {
      return {
        icon: 'close-circle' as const,
        color: '#ef4444',
        gradientColors: ['#ef4444', '#dc2626'],
        title: 'Application Rejected',
        message: seller.rejection_reason || 'Your application was rejected. Please contact support for more information.',
        action: 'Contact Support',
      };
    }
    
    return {
      icon: 'hourglass-outline' as const,
      color: '#f59e0b',
      gradientColors: ['#f59e0b', '#d97706'],
      title: 'Pending Approval',
      message: 'Your seller account is under review. We will notify you once your account is approved. This usually takes 1-2 business days.',
      action: 'Refresh Status',
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

        <View style={styles.content}>
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
          
          {/* Message */}
          <Text style={styles.message}>{statusInfo.message}</Text>

          {/* Company Info Card */}
          {seller && (
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
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={statusInfo.action}
              onPress={() => user?.id && fetchSellerProfile(user.id)}
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
        </View>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingTop: 100,
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