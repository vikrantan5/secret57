import { useState } from 'react';
import { uploadImageToSupabase, UploadResult } from '../utils/imageUpload';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Custom hook for uploading company logos to Supabase Storage
 * Bucket: company-logos
 * Path structure: company-logos/{seller_id}/logo.jpg
 */
export const useUploadCompanyLogo = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Request permissions and pick logo image
   */
  const pickLogo = async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload your logo.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // Square logo
        quality: 0.9,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      return result.assets[0].uri;
    } catch (err) {
      console.error('[Logo Picker] Error:', err);
      return null;
    }
  };

  /**
   * Upload company logo
   */
  const uploadLogo = async (
    imageUri: string,
    sellerId: string
  ): Promise<UploadResult> => {
    setUploading(true);
    setError(null);

    try {
      const result = await uploadImageToSupabase(
        imageUri,
        'company-logos',
        sellerId,
        2 // 2MB max for logos
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
   * Pick and upload logo in one action
   */
  const pickAndUploadLogo = async (
    sellerId: string
  ): Promise<UploadResult> => {
    const imageUri = await pickLogo();
    
    if (!imageUri) {
      return { success: false, error: 'No image selected' };
    }

    return uploadLogo(imageUri, sellerId);
  };

  const resetState = () => {
    setUploading(false);
    setError(null);
  };

  return {
    pickLogo,
    uploadLogo,
    pickAndUploadLogo,
    uploading,
    error,
    resetState,
  };
};
