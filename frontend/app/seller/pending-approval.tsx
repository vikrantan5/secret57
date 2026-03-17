import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';
import {Button} from '../../src/components/ui/Button';

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
        color: colors.error,
        title: 'Application Rejected',
        message: seller.rejection_reason || 'Your application was rejected. Please contact support for more information.',
        action: 'Contact Support',
      };
    }
    
    return {
      icon: 'time' as const,
      color: colors.warning,
      title: 'Pending Approval',
      message: 'Your seller account is under review. We will notify you once your account is approved. This usually takes 1-2 business days.',
      action: 'Refresh Status',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={[styles.iconContainer, { backgroundColor: statusInfo.color + '20' }]}>
          <Ionicons name={statusInfo.icon} size={80} color={statusInfo.color} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{statusInfo.title}</Text>
        
        {/* Message */}
        <Text style={styles.message}>{statusInfo.message}</Text>

        {/* Company Info */}
        {seller && (
          <View style={styles.companyCard}>
            <Text style={styles.companyLabel}>Company Name</Text>
            <Text style={styles.companyName}>{seller.company_name}</Text>
            
            <Text style={styles.companyLabel} style={{ marginTop: spacing.md }}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {seller.status.toUpperCase()}
              </Text>
            </View>
          </View>
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
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <Text style={styles.helpText}>
          Need help? Contact us at support@servicehub.com
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  companyCard: {
    width: '100%',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  companyLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  companyName: {
    ...typography.h4,
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  logoutButton: {
    marginTop: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  helpText: {
    ...typography.bodySmall,
    color: colors.textLight,
    textAlign: 'center',
  },
});