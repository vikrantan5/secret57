import { useState } from 'react';
import { uploadImageToSupabase, generateSignedUrl, UploadResult } from '../utils/imageUpload';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

/**
 * Custom hook for uploading seller verification documents to Supabase Storage
 * Bucket: seller-documents (PRIVATE)
 * Path structure: seller-documents/{seller_id}/{uuid}.pdf|jpg
 * 
 * Note: This bucket is private, so we use signed URLs for viewing
 */
export const useUploadSellerDocuments = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Pick document or image for verification
   */
  const pickDocument = async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permissions to upload documents.');
        return null;
      }

      // For now, use image picker (can be extended to DocumentPicker for PDFs)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      return result.assets[0].uri;
    } catch (err) {
      console.error('[Document Picker] Error:', err);
      return null;
    }
  };

  /**
   * Upload seller verification document
   */
  const uploadDocument = async (
    documentUri: string,
    sellerId: string
  ): Promise<UploadResult> => {
    setUploading(true);
    setError(null);

    try {
      const result = await uploadImageToSupabase(
        documentUri,
        'seller-documents',
        sellerId,
        10 // 10MB max for documents
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
   * Pick and upload document in one action
   */
  const pickAndUploadDocument = async (
    sellerId: string
  ): Promise<UploadResult> => {
    const documentUri = await pickDocument();
    
    if (!documentUri) {
      return { success: false, error: 'No document selected' };
    }

    return uploadDocument(documentUri, sellerId);
  };

  /**
   * Get signed URL for viewing private document
   * @param filePath - Path to file in storage (e.g., \"seller-123/doc-xyz.jpg\")
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   */
  const getSignedUrl = async (
    filePath: string,
    expiresIn: number = 3600
  ): Promise<string | null> => {
    try {
      const url = await generateSignedUrl('seller-documents', filePath, expiresIn);
      return url;
    } catch (err) {
      console.error('[Signed URL] Error:', err);
      return null;
    }
  };

  const resetState = () => {
    setUploading(false);
    setError(null);
  };

  return {
    pickDocument,
    uploadDocument,
    pickAndUploadDocument,
    getSignedUrl,
    uploading,
    error,
    resetState,
  };
};
