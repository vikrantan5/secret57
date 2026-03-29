import { useState } from 'react';
import { uploadImageToSupabase, uploadMultipleImages, UploadResult } from '../utils/imageUpload';

/**
 * Custom hook for uploading product images to Supabase Storage
 * Bucket: product-images
 * Path structure: product-images/{seller_id}/{uuid}.jpg
 */
export const useUploadProductImage = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload a single product image
   */
  const uploadSingle = async (
    imageUri: string,
    sellerId: string
  ): Promise<UploadResult> => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await uploadImageToSupabase(
        imageUri,
        'product-images',
        sellerId,
        5 // 5MB max
      );

      if (!result.success) {
        setError(result.error || 'Upload failed');
      }

      setProgress(100);
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
   * Upload multiple product images
   */
  const uploadMultiple = async (
    imageUris: string[],
    sellerId: string
  ): Promise<string[]> => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const urls = await uploadMultipleImages(
        imageUris,
        'product-images',
        sellerId,
        5 // 5MB max per image
      );

      if (urls.length === 0 && imageUris.length > 0) {
        setError('All uploads failed');
      } else if (urls.length < imageUris.length) {
        setError(`${imageUris.length - urls.length} image(s) failed to upload`);
      }

      setProgress(100);
      return urls;
    } catch (err: any) {
      const errorMsg = err.message || 'Unexpected error during upload';
      setError(errorMsg);
      return [];
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setUploading(false);
    setProgress(0);
    setError(null);
  };

  return {
    uploadSingle,
    uploadMultiple,
    uploading,
    progress,
    error,
    resetState,
  };
};
