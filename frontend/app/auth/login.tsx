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
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

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
      // Routing is handled by login function
    } else {
      Alert.alert('Login Failed', result.error || 'An error occurred');
    }
  };

  const roleConfig = {
    customer: {
      gradient: ['#60A5FA', '#3B82F6'],
      darkGradient: ['#1e3a5f', '#1e3a5f'],
      icon: 'person-circle' as const,
      title: 'Customer Login',
      subtitle: 'Welcome back! Login to continue shopping',
      features: [
        'Wide variety of products & services',
        'Secure payment options',
        'Fast delivery & booking',
        '24/7 Customer support',
      ],
    },
    seller: {
      gradient: ['#A78BFA', '#7C3AED'],
      darkGradient: ['#4c1d95', '#4c1d95'],
      icon: 'storefront' as const,
      title: 'Seller Login',
      subtitle: 'Manage your store and grow your business',
      features: [
        'Reach thousands of customers',
        'Easy store management',
        'Quick payouts',
        'Real-time analytics',
      ],
    },
    admin: {
      gradient: ['#F59E0B', '#D97706'],
      darkGradient: ['#92400e', '#92400e'],
      icon: 'shield-checkmark' as const,
      title: 'Admin Login',
      subtitle: 'Access your admin dashboard',
      features: [
        'Complete platform control',
        'Advanced analytics',
        'User management',
        'System monitoring',
      ],
    },
  };

  const config = roleConfig[role];

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
              colors={config.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                    style={styles.iconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons
                      name={config.icon}
                      size={48}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                  <Text style={styles.title}>{config.title}</Text>
                  <Text style={styles.subtitle}>{config.subtitle}</Text>
                </View>
              </BlurView>
            </LinearGradient>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.formCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.formHeader}>
                  <LinearGradient
                    colors={config.gradient}
                    style={styles.formIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="log-in-outline" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.formTitle}>Sign In</Text>
                </View>

                <Input
                  label="Email Address"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                />

                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  leftIcon="lock-closed-outline"
                />

                <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
                  <LinearGradient
                    colors={['rgba(168, 85, 247, 0.1)', 'rgba(139, 92, 246, 0.1)']}
                    style={styles.forgotGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.forgotPasswordText, { color: config.gradient[0] }]}>
                      Forgot Password?
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={config.gradient}
                    style={styles.loginGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                        <Text style={styles.loginButtonText}>Login</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {role !== 'admin' && (
                  <View style={styles.registerContainer}>
                    <Text style={styles.registerText}>Don't have an account? </Text>
                    <TouchableOpacity
                      onPress={() => router.push(`/auth/register?role=${role}`)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['rgba(168, 85, 247, 0.2)', 'rgba(139, 92, 246, 0.2)']}
                        style={styles.registerLinkGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={[styles.registerLink, { color: config.gradient[0] }]}>
                          Create Account
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </LinearGradient>

              {/* Features */}
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.featuresContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.featuresTitle}>Why join us?</Text>
                {config.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <LinearGradient
                      colors={config.gradient}
                      style={styles.featureCheck}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </LinearGradient>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Secure Login • Protected by SSL
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  headerBlur: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
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
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
  },
  formContainer: {
    marginTop: -spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(32, 31, 31, 0.08)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderRadius: borderRadius.md,
  },
  forgotGradient: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loginButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  registerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  registerLinkGradient: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  featuresContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 13,
    color: '#d1d5db',
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
});