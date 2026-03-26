import { supabase } from '../services/supabase';
import * as FileSystem from 'expo-file-system';

/**
 * Centralized image upload utility for Supabase Storage
 * Handles proper file conversion for React Native
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
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
  };
  return mimeTypes[extension || ''] || 'image/jpeg';
};

/**
 * Validate file size (max 5MB)
 */
const validateFileSize = async (uri: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && 'size' in fileInfo) {
      const sizeInMB = fileInfo.size / (1024 * 1024);
      return sizeInMB <= 5;
    }
    return true; // If we can't get size, allow upload
  } catch (error) {
    console.warn('Could not validate file size:', error);
    return true;
  }
};

/**
 * Upload image to Supabase Storage
 * @param imageUri - Local file URI from image picker
 * @param bucketName - Supabase storage bucket name
 * @param folderPath - Optional folder path within bucket (e.g., 'seller-123')
 * @returns UploadResult with public URL if successful
 */
export const uploadImageToSupabase = async (
  imageUri: string,
  bucketName: string,
  folderPath?: string
): Promise<UploadResult> => {
  try {
    // Validate file size
    const isValidSize = await validateFileSize(imageUri);
    if (!isValidSize) {
      return { 
        success: false, 
        error: 'Image size must be less than 5MB' 
      };
    }

    // Get MIME type
    const mimeType = getMimeType(imageUri);
    
    // Create unique filename
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

    // Convert image URI to base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to array buffer for upload
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, byteArray, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return { 
        success: false, 
        error: uploadError.message 
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return { 
        success: false, 
        error: 'Failed to get public URL' 
      };
    }

    console.log('Image uploaded successfully:', urlData.publicUrl);
    return { 
      success: true, 
      url: urlData.publicUrl 
    };
  } catch (error: any) {
    console.error('Error uploading image:', error);
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
 * @returns Array of public URLs for successfully uploaded images
 */
export const uploadMultipleImages = async (
  imageUris: string[],
  bucketName: string,
  folderPath?: string
): Promise<string[]> => {
  const uploadedUrls: string[] = [];

  for (const imageUri of imageUris) {
    const result = await uploadImageToSupabase(imageUri, bucketName, folderPath);
    if (result.success && result.url) {
      uploadedUrls.push(result.url);
    } else {
      console.warn(`Failed to upload image: ${imageUri}`, result.error);
    }
  }

  return uploadedUrls;
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
    // Extract file path from public URL
    const urlParts = imageUrl.split(`/${bucketName}/`);
    if (urlParts.length < 2) {
      console.error('Invalid image URL format');
      return false;
    }

    const filePath = urlParts[1];

    // Delete from storage
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteImageFromSupabase:', error);
    return false;
  }
};
