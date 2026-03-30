import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[colors.primaryVeryLight, colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🛍️</Text>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>ServiceHub</Text>
              <View style={styles.underline} />
            </View>
          </View>
          
          <Text style={styles.subtitle}>Marketplace & Services</Text>
          
          <ActivityIndicator
            size="large"
            color={colors.white}
            style={styles.loader}
          />
          
          <Text style={styles.tagline}>Your one-stop solution for everything</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    fontSize: 40,
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
  underline: {
    width: 60,
    height: 4,
    backgroundColor: colors.white,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.white,
    opacity: 0.95,
    marginBottom: spacing.xxl,
    letterSpacing: 0.5,
  },
  loader: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  tagline: {
    ...typography.bodySmall,
    color: colors.white,
    opacity: 0.8,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
