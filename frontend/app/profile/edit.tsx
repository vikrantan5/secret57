import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { userData, fetchUserProfile, updateUserProfile, uploadAvatar, loading } = useUserStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // ✅ FIX: Fetch user profile on mount and populate fields
  useEffect(() => {
    if (user?.id) {
      fetchUserProfile(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    // Populate from authStore.user first (already loaded)
    if (user) {
      setGender(user.gender || '');
      setDateOfBirth(user.date_of_birth || '');
      setAvatarUri(user.avatar_url || null);
    }
    
    // Then update with fresh data from userStore if available
    if (userData) {
      setGender(userData.gender || '');
      setDateOfBirth(userData.date_of_birth || '');
      setAvatarUri(userData.avatar_url || null);
    }
  }, [user, userData]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant permission to access your photos');
        return;
      }

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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      if (avatarUri && !avatarUri.startsWith('http')) {
        const uploadResult = await uploadAvatar(user.id, avatarUri);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error);
        }
      }

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
      {/* Premium Header */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4C1D95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Premium Avatar Section */}
        <View style={styles.avatarSection}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} activeOpacity={0.9}>
              {avatarUri ? (
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                    style={styles.avatarOverlay}
                  />
                </View>
              ) : (
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarText}>
                    {name ? name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </LinearGradient>
              )}
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.cameraIcon}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.avatarHint}>Tap to change profile photo</Text>
        </View>

        {/* Premium Form */}
        <View style={styles.form}>
          {/* Name Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.labelIcon}
              >
                <Ionicons name="person-outline" size={12} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.label}>Full Name *</Text>
            </View>
            <LinearGradient
              colors={['#FFFFFF', '#F9FAFB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inputContainer}
            >
              <Ionicons name="person-outline" size={18} color="#8B5CF6" />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
              />
            </LinearGradient>
          </View>

          {/* Email Field (Read-only) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.labelIcon}
              >
                <Ionicons name="mail-outline" size={12} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.label}>Email Address</Text>
            </View>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.inputContainer, styles.inputDisabled]}
            >
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                value={email}
                editable={false}
                placeholderTextColor="#9CA3AF"
              />
            </LinearGradient>
            <View style={styles.hintContainer}>
              <Ionicons name="information-circle-outline" size={12} color="#9CA3AF" />
              <Text style={styles.hint}>Email cannot be changed</Text>
            </View>
          </View>

          {/* Phone Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.labelIcon}
              >
                <Ionicons name="call-outline" size={12} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.label}>Phone Number</Text>
            </View>
            <LinearGradient
              colors={['#FFFFFF', '#F9FAFB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inputContainer}
            >
              <Ionicons name="call-outline" size={18} color="#F59E0B" />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </LinearGradient>
          </View>

          {/* Gender Selection */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <LinearGradient
                colors={['#EC4899', '#DB2777']}
                style={styles.labelIcon}
              >
                <Ionicons name="transgender-outline" size={12} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.label}>Gender</Text>
            </View>
            <View style={styles.genderContainer}>
              {(['male', 'female', 'other'] as const).map((option) => {
                const isSelected = gender === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.genderOption, isSelected && styles.genderOptionActive]}
                    onPress={() => {
                      setGender(option);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isSelected ? ['#8B5CF6', '#7C3AED'] : ['#FFFFFF', '#F9FAFB']}
                      style={styles.genderGradient}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          isSelected && styles.genderTextActive,
                        ]}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date of Birth Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.labelIcon}
              >
                <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.label}>Date of Birth</Text>
            </View>
            <LinearGradient
              colors={['#FFFFFF', '#F9FAFB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inputContainer}
            >
              <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </LinearGradient>
            <View style={styles.hintContainer}>
              <Ionicons name="information-circle-outline" size={12} color="#9CA3AF" />
              <Text style={styles.hint}>Format: YYYY-MM-DD (e.g., 1990-01-15)</Text>
            </View>
          </View>
        </View>

        {/* Premium Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, (loading || uploading) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading || uploading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveGradient}
            >
              {loading || uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarWrapper: {
    position: 'relative',
    borderRadius: 70,
    overflow: 'hidden',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: spacing.md,
  },
  form: {
    paddingHorizontal: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  labelIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: spacing.sm,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: '#1F2937',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderOption: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  genderOptionActive: {
    borderWidth: 0,
  },
  genderGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  saveButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});