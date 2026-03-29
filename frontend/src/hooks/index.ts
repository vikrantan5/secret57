/**
 * Supabase Storage Upload Hooks
 * 
 * Custom hooks for uploading files to different Supabase Storage buckets
 * with proper error handling, retry logic, and progress tracking.
 */

export { useUploadProductImage } from './useUploadProductImage';
export { useUploadServiceImage } from './useUploadServiceImage';
export { useUploadAvatar } from './useUploadAvatar';
export { useUploadCompanyLogo } from './useUploadCompanyLogo';
export { useUploadSellerDocuments } from './useUploadSellerDocuments';

/**
 * Usage Examples:
 * 
 * // Product images
 * import { useUploadProductImage } from '@/hooks';
 * const { uploadMultiple, uploading, error } = useUploadProductImage();
 * const urls = await uploadMultiple(imageUris, sellerId);
 * 
 * // Service images
 * import { useUploadServiceImage } from '@/hooks';
 * const { uploadMultiple, uploading } = useUploadServiceImage();
 * 
 * // User avatar
 * import { useUploadAvatar } from '@/hooks';
 * const { pickAndUploadAvatar, uploading } = useUploadAvatar();
 * const result = await pickAndUploadAvatar(userId);
 * 
 * // Company logo
 * import { useUploadCompanyLogo } from '@/hooks';
 * const { pickAndUploadLogo } = useUploadCompanyLogo();
 * 
 * // Seller documents (private)
 * import { useUploadSellerDocuments } from '@/hooks';
 * const { pickAndUploadDocument, getSignedUrl } = useUploadSellerDocuments();
 */
