import { supabase } from '../services/supabase';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Centralized image upload utility for Supabase Storage
 * Handles proper file conversion for React Native
 * UPDATED: Enhanced error handling and blob conversion
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string; // File path in storage
}

/**
 * Get MIME type from file extension
 */
const getMimeType = (uri: string): string => {
  const extension = uri.split('.').pop()?.toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    pdf: 'application/pdf',
  };
  return mimeTypes[extension || ''] || 'image/jpeg';
};

/**
 * Validate file size with configurable max size
 */
const validateFileSize = async (uri: string, maxSizeMB: number = 5): Promise<{ valid: boolean; actualSize?: number }> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && 'size' in fileInfo) {
      const sizeInMB = fileInfo.size / (1024 * 1024);
      return { 
        valid: sizeInMB <= maxSizeMB, 
        actualSize: sizeInMB 
      };
    }
    return { valid: true }; // If we can't get size, allow upload
  } catch (error) {
    console.warn('Could not validate file size:', error);
    return { valid: true };
  }
};
/**
 * Convert base64 to Uint8Array for upload
 * React Native compatible version
 */
const base64ToUint8Array = (base64: string): Uint8Array => {
  try {
    // Remove any data URL prefix if present
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Uint8Array(byteNumbers);
  } catch (error) {
    console.error('[Base64 Conversion] Error:', error);
    throw new Error('Failed to convert base64 to byte array');
  }
};

/**
 * Convert image URI to blob for React Native
 */
const uriToBlob = async (uri: string): Promise<Blob> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('[URI to Blob] Error:', error);
    throw error;
  }
};
/**
 * Upload image to Supabase Storage
 * @param imageUri - Local file URI from image picker
 * @param bucketName - Supabase storage bucket name
 * @param folderPath - Optional folder path within bucket (e.g., 'seller-123')
 * @param maxSizeMB - Maximum file size in MB (default: 5)
 * @returns UploadResult with public URL if successful
 */
export const uploadImageToSupabase = async (
  imageUri: string,
  bucketName: string,
  folderPath?: string,
  maxSizeMB: number = 5
): Promise<UploadResult> => {
  try {
    console.log(`[Upload] Starting upload to ${bucketName}/${folderPath || ''}`);
    console.log(`[Upload] Image URI:`, imageUri);
    
    // Validate file size
    const sizeValidation = await validateFileSize(imageUri, maxSizeMB);
    if (!sizeValidation.valid) {
      const errorMsg = `File size (${sizeValidation.actualSize?.toFixed(2)}MB) exceeds maximum allowed size of ${maxSizeMB}MB`;
      console.error(`[Upload] ${errorMsg}`);
      return { 
        success: false, 
        error: errorMsg
      };
    }

    // Get MIME type
    const mimeType = getMimeType(imageUri);
    console.log(`[Upload] File type: ${mimeType}`);
    
    // Create unique filename with UUID-like structure
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

    console.log(`[Upload] File path: ${filePath}`);

    // Method 1: Try using fetch (most compatible with React Native)
    let uploadData: any = null;
    let uploadMethod = '';
    
    try {
      console.log('[Upload] Method 1: Using fetch blob...');
      const blob = await uriToBlob(imageUri);
      console.log(`[Upload] Blob created, size: ${(blob.size / 1024).toFixed(2)}KB`);
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false,
        });

      if (!error) {
        uploadData = data;
        uploadMethod = 'fetch-blob';
        console.log('[Upload] Upload successful via fetch blob');
      } else {
        throw error;
      }
    } catch (blobError) {
      console.warn('[Upload] Fetch blob method failed:', blobError);
      
      // Method 2: Fallback to base64 conversion
      try {
        console.log('[Upload] Method 2: Using base64 conversion...');
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64',
        });

        const byteArray = base64ToUint8Array(base64);
        console.log(`[Upload] Byte array created, size: ${(byteArray.length / 1024).toFixed(2)}KB`);

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, byteArray, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false,
          });

        if (!error) {
          uploadData = data;
          uploadMethod = 'base64';
          console.log('[Upload] Upload successful via base64');
        } else {
          throw error;
        }
      } catch (base64Error) {
        console.error('[Upload] Both upload methods failed');
        console.error('[Upload] Blob error:', blobError);
        console.error('[Upload] Base64 error:', base64Error);
        
        return { 
          success: false, 
          error: `Upload failed: ${base64Error.message || 'Unknown error'}`
        };
      }
    }

    if (!uploadData) {
      return { 
        success: false, 
        error: 'Upload failed - no data returned'
      };
    }

    console.log(`[Upload] File uploaded successfully using ${uploadMethod} method`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error('[Upload] Failed to generate public URL');
      return { 
        success: false, 
        error: 'Failed to get public URL' 
      };
    }

    console.log('[Upload] Public URL generated:', urlData.publicUrl);
    
    return { 
      success: true, 
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error: any) {
    console.error('[Upload] Unexpected error:', error);
    console.error('[Upload] Error stack:', error.stack);
    return { 
      success: false, 
      error: error.message || 'Failed to upload image' 
    };
  }
};

/**
 * Upload multiple images to Supabase Storage
 * @param imageUris - Array of local file URIs
 * @param bucketName - Supabase storage bucket name
 * @param folderPath - Optional folder path within bucket
 * @param maxSizeMB - Maximum file size in MB per image
 * @returns Array of public URLs for successfully uploaded images
 */
export const uploadMultipleImages = async (
  imageUris: string[],
  bucketName: string,
  folderPath?: string,
  maxSizeMB: number = 5
): Promise<string[]> => {
  console.log(`[Upload Multiple] Starting upload of ${imageUris.length} images`);
  const uploadedUrls: string[] = [];

  for (let i = 0; i < imageUris.length; i++) {
    const imageUri = imageUris[i];
    console.log(`[Upload Multiple] Processing image ${i + 1}/${imageUris.length}`);
    
    const result = await uploadImageToSupabase(imageUri, bucketName, folderPath, maxSizeMB);
    
    if (result.success && result.url) {
      uploadedUrls.push(result.url);
      console.log(`[Upload Multiple] ✓ Image ${i + 1} uploaded successfully`);
    } else {
      console.warn(`[Upload Multiple] ✗ Failed to upload image ${i + 1}:`, result.error);
    }
  }

  console.log(`[Upload Multiple] Completed: ${uploadedUrls.length}/${imageUris.length} images uploaded`);
  return uploadedUrls;
};

/**
 * Generate signed URL for private files (e.g., seller documents)
 * @param bucketName - Supabase storage bucket name
 * @param filePath - Path to file in storage
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL or null if failed
 */
export const generateSignedUrl = async (
  bucketName: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> => {
  try {
    console.log(`[Signed URL] Generating for ${bucketName}/${filePath}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('[Signed URL] Error:', error);
      return null;
    }

    if (!data?.signedUrl) {
      console.error('[Signed URL] No signed URL returned');
      return null;
    }

    console.log('[Signed URL] Generated successfully');
    return data.signedUrl;
  } catch (error) {
    console.error('[Signed URL] Unexpected error:', error);
    return null;
  }
};

/**
 * Delete image from Supabase Storage
 * @param imageUrl - Public URL of the image
 * @param bucketName - Supabase storage bucket name
 */
export const deleteImageFromSupabase = async (
  imageUrl: string,
  bucketName: string
): Promise<boolean> => {
  try {
    console.log(`[Delete] Removing file from ${bucketName}`);
    
    // Extract file path from public URL
    const urlParts = imageUrl.split(`/${bucketName}/`);
    if (urlParts.length < 2) {
      console.error('[Delete] Invalid image URL format');
      return false;
    }

    const filePath = urlParts[1];
    console.log(`[Delete] File path: ${filePath}`);

    // Delete from storage
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('[Delete] Error:', error);
      return false;
    }

    console.log('[Delete] File deleted successfully');
    return true;
  } catch (error) {
    console.error('[Delete] Unexpected error:', error);
    return false;
  }
};

/**
 * Delete multiple images from Supabase Storage
 * @param imageUrls - Array of public URLs
 * @param bucketName - Supabase storage bucket name
 */
export const deleteMultipleImages = async (
  imageUrls: string[],
  bucketName: string
): Promise<{ success: number; failed: number }> => {
  console.log(`[Delete Multiple] Removing ${imageUrls.length} files`);
  let success = 0;
  let failed = 0;

  for (const url of imageUrls) {
    const result = await deleteImageFromSupabase(url, bucketName);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`[Delete Multiple] Completed: ${success} deleted, ${failed} failed`);
  return { success, failed };
};