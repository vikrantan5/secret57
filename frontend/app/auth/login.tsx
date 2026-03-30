import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role as 'customer' | 'seller' | 'admin') || 'customer';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password, role);
    setLoading(false);

    if (result.success) {
      // Routing is now handled by login function in authStore
      // No need to manually redirect here
    } else {
      Alert.alert('Login Failed', result.error || 'An error occurred');
    }
  };

  const roleConfig = {
    customer: {
      color: '#60A5FA',
      icon: 'cart' as const,
      title: 'Customer Login',
      subtitle: 'Welcome back! Login to continue shopping',
    },
    seller: {
      color: '#8B5CF6',
      icon: 'storefront' as const,
      title: 'Seller Login',
      subtitle: 'Manage your store and grow your business',
    },
    admin: {
      color: colors.primaryDark,
      icon: 'shield-checkmark' as const,
      title: 'Admin Login',
      subtitle: 'Access your admin dashboard',
    },
  };

  const config = roleConfig[role];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Gradient */}
          <LinearGradient
            colors={[config.color, config.color + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.white} />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={config.icon}
                  size={48}
                  color={colors.white}
                />
              </View>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>{config.subtitle}</Text>
            </View>
          </LinearGradient>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <View style={[styles.formCard, shadows.lg]}>
              <Text style={styles.formTitle}>Sign In</Text>

              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail"
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon="lock-closed"
              />

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: config.color }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              <Button
                title="Login"
                onPress={handleLogin}
                loading={loading}
                fullWidth
                style={{ backgroundColor: config.color }}
              />

              {role !== 'admin' && (
                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>Don't have an account? </Text>
                  <TouchableOpacity
                    onPress={() => router.push(`/auth/register?role=${role}`)}
                  >
                    <Text style={[styles.registerLink, { color: config.color }]}>
                      Register Now
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              {role === 'customer' && (
                <>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.featureText}>Wide variety of products & services</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.featureText}>Secure payment options</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.featureText}>Fast delivery & booking</Text>
                  </View>
                </>
              )}
              {role === 'seller' && (
                <>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.featureText}>Reach thousands of customers</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.featureText}>Easy store management</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.featureText}>Quick payouts</Text>
                  </View>
                </>
              )}
              {role === 'admin' && (
                <>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.featureText}>Complete platform control</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.featureText}>Advanced analytics</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.featureText}>User management</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.white,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body,
    color: colors.white,
    opacity: 0.95,
    textAlign: 'center',
  },
  formContainer: {
    marginTop: -spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.body,
    fontWeight: '600',
  },
  featuresContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
});
