import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { colors, spacing, typography } from '../src/constants/theme';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthStore();

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        if (isAuthenticated) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/auth/role-selection');
        }
      }, 1500);
    }
  }, [loading, isAuthenticated]);

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
