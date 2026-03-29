import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { userData, updateUserProfile, uploadAvatar, loading } = useUserStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userData) {
      setGender((userData as any).gender || '');
      setDateOfBirth((userData as any).date_of_birth || '');
      setAvatarUri((userData as any).avatar_url || null);
    }
  }, [userData]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!user?.id) return;

    setUploading(true);

    try {
      // Upload avatar if changed
      if (avatarUri && !avatarUri.startsWith('http')) {
        const uploadResult = await uploadAvatar(user.id, avatarUri);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error);
        }
      }

      // Update profile
      const updates: any = {
        name: name.trim(),
        phone: phone.trim(),
      };

      if (gender) updates.gender = gender;
      if (dateOfBirth) updates.date_of_birth = dateOfBirth;

      const result = await updateUserProfile(user.id, updates);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={20} color={colors.surface} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.textLight} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.textLight}
              />
            </View>
          </View>

          {/* Email (Read-only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <Ionicons name="mail-outline" size={20} color={colors.textLight} />
              <TextInput
                style={styles.input}
                value={email}
                editable={false}
                placeholderTextColor={colors.textLight}
              />
            </View>
            <Text style={styles.hint}>Email cannot be changed</Text>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={colors.textLight} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              {(['male', 'female', 'other'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderOption,
                    gender === option && styles.genderOptionActive,
                  ]}
                  onPress={() => {
                    setGender(option);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === option && styles.genderTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date of Birth */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color={colors.textLight} />
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textLight}
              />
            </View>
            <Text style={styles.hint}>Format: YYYY-MM-DD (e.g., 1990-01-15)</Text>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, (loading || uploading) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading || uploading}
          >
            {loading || uploading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '700',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  form: {
    paddingHorizontal: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  inputDisabled: {
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderOption: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  genderTextActive: {
    color: colors.surface,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
});