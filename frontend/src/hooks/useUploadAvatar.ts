import { useState } from 'react';
import { uploadImageToSupabase, UploadResult } from '../utils/imageUpload';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Custom hook for uploading user avatars to Supabase Storage
 * Bucket: user-avatars
 * Path structure: user-avatars/{user_id}/avatar.jpg
 */
export const useUploadAvatar = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Request permissions and pick avatar image
   */
  const pickAvatar = async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload your avatar.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // Square avatar
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      return result.assets[0].uri;
    } catch (err) {
      console.error('[Avatar Picker] Error:', err);
      return null;
    }
  };

  /**
   * Upload avatar image
   */
  const uploadAvatar = async (
    imageUri: string,
    userId: string
  ): Promise<UploadResult> => {
    setUploading(true);
    setError(null);

    try {
      // Always use same filename for user's avatar (allows easy replacement)
      const timestamp = Date.now();
      const fileName = `avatar-${timestamp}.jpg`;
      
      const result = await uploadImageToSupabase(
        imageUri,
        'user-avatars',
        userId,
        2 // 2MB max for avatars
      );

      if (!result.success) {
        setError(result.error || 'Upload failed');
      }

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Unexpected error during upload';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setUploading(false);
    }
  };

  /**
   * Pick and upload avatar in one action
   */
  const pickAndUploadAvatar = async (
    userId: string
  ): Promise<UploadResult> => {
    const imageUri = await pickAvatar();
    
    if (!imageUri) {
      return { success: false, error: 'No image selected' };
    }

    return uploadAvatar(imageUri, userId);
  };

  const resetState = () => {
    setUploading(false);
    setError(null);
  };

  return {
    pickAvatar,
    uploadAvatar,
    pickAndUploadAvatar,
    uploading,
    error,
    resetState,
  };
};
