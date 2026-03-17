import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role as 'customer' | 'seller') || 'customer';
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(name, email, password, phone, role);
    setLoading(false);

    if (result.success) {
      if (role === 'seller') {
        Alert.alert(
          'Registration Successful',
          'Your seller account has been created and is pending approval. You will be notified once approved.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/auth/role-selection'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Registration Successful',
          'Your account has been created. Please login to continue.',
          [
            {
              text: 'OK',
              onPress: () => router.replace(`/auth/login?role=${role}`),
            },
          ]
        );
      }
    } else {
      Alert.alert('Registration Failed', result.error || 'An error occurred');
    }
  };

  const roleColor = role === 'customer' ? colors.customer : colors.seller;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: roleColor + '15' }]}>
              <Ionicons
                name={role === 'customer' ? 'cart' : 'storefront'}
                size={40}
                color={roleColor}
              />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Register as {role === 'customer' ? 'Customer' : 'Seller'}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              leftIcon="person"
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
            />

            <Input
              label="Phone"
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon="call"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon="lock-closed"
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon="lock-closed"
            />

            {role === 'seller' && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={styles.infoText}>
                  Seller accounts require admin approval before you can start selling.
                </Text>
              </View>
            )}

            <Button
              title="Register"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              style={{ backgroundColor: roleColor, marginTop: spacing.md }}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push(`/auth/login?role=${role}`)}
              >
                <Text style={[styles.loginLink, { color: roleColor }]}>
                  Login
                </Text>
              </TouchableOpacity>
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.info,
    flex: 1,
    marginLeft: spacing.sm,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.body,
    fontWeight: '600',
  },
});
