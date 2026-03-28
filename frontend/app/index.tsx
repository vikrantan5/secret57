import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useSellerStore } from '../src/store/sellerStore';
import { colors, spacing, typography } from '../src/constants/theme';

export default function SplashScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuthStore();
  const { fetchSellerProfile, seller } = useSellerStore();

  useEffect(() => {
     const checkUserStatus = async () => {
      if (!loading && isAuthenticated && user) {
        // If user is a seller, check if they have completed company setup
        if (user.role === 'seller') {
          await fetchSellerProfile(user.id);
        }

        // Navigate based on user status
      setTimeout(() => {
          if (user.role === 'admin') {
           // Admin goes to admin dashboard
           router.replace('/admin/dashboard');
         } else if (user.role === 'seller') {
            if (!seller) {
              // Seller hasn't completed company setup
              router.replace('/seller/company-setup');
            } else if (seller.status === 'pending' || seller.status === 'rejected') {
              // Seller is waiting for approval
              router.replace('/seller/pending-approval');
            } else if (seller.status === 'approved') {
              // Approved seller goes to dashboard
              router.replace('/seller/dashboard');
            }
          } else {
            // Customer goes to home
          router.replace('/(tabs)/home');
           }
        }, 1500);
      } else if (!loading && !isAuthenticated) {
        setTimeout(() => {
          router.replace('/auth/role-selection');
        
      }, 1500);
    }
 };

    checkUserStatus();
  }, [loading, isAuthenticated, user, seller]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>🛍️</Text>
        <Text style={styles.title}>ServiceHub</Text>
        <Text style={styles.subtitle}>Marketplace & Services</Text>
        
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.surface,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
    marginBottom: spacing.xxl,
  },
  loader: {
    marginTop: spacing.xl,
  },
});
