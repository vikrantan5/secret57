"# Supabase Storage Buckets Setup

## Required Storage Buckets

You need to create the following storage buckets in your Supabase dashboard:

### 1. Go to Supabase Dashboard
Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets

### 2. Create Buckets

Run these commands in Supabase Dashboard > Storage > Create Bucket:

#### Bucket 1: product-images (PUBLIC)
- Name: `product-images`
- Public bucket: ✅ YES
- Allowed MIME types: `image/*`
- File size limit: 5MB

#### Bucket 2: service-images (PUBLIC)
- Name: `service-images`
- Public bucket: ✅ YES
- Allowed MIME types: `image/*`
- File size limit: 5MB

#### Bucket 3: company-logos (PUBLIC)
- Name: `company-logos`
- Public bucket: ✅ YES
- Allowed MIME types: `image/*`
- File size limit: 2MB

#### Bucket 4: seller-documents (PRIVATE)
- Name: `seller-documents`
- Public bucket: ❌ NO (Private)
- Allowed MIME types: `image/*,application/pdf`
- File size limit: 10MB

#### Bucket 5: user-avatars (PUBLIC)
- Name: `user-avatars`
- Public bucket: ✅ YES
- Allowed MIME types: `image/*`
- File size limit: 1MB

### 3. Configure Storage Policies

For each PUBLIC bucket, add this policy:

```sql
-- Allow public read access
CREATE POLICY \"Public Access\"
ON storage.objects FOR SELECT
USING ( bucket_id = 'BUCKET_NAME_HERE' );

-- Allow authenticated users to upload
CREATE POLICY \"Authenticated users can upload\"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'BUCKET_NAME_HERE' );

-- Allow users to update their own files
CREATE POLICY \"Users can update own files\"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'BUCKET_NAME_HERE' )
WITH CHECK ( bucket_id = 'BUCKET_NAME_HERE' );
```

Replace `BUCKET_NAME_HERE` with the actual bucket name (product-images, service-images, etc.)

### 4. For Private Bucket (seller-documents)

```sql
-- Only seller can access their own documents
CREATE POLICY \"Sellers can access own documents\"
ON storage.objects FOR SELECT
TO authenticated
USING ( 
  bucket_id = 'seller-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Sellers can upload their own documents
CREATE POLICY \"Sellers can upload documents\"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'seller-documents' );
```

### 5. Verify Setup

Test by uploading a test image through the app's image picker functionality.

## Troubleshooting

If uploads fail:
1. Check bucket names match exactly
2. Verify bucket is public (for product/service images)
3. Check file size limits
4. Verify MIME types are allowed
5. Check storage policies are active

## Usage in App

The app uses these buckets for:
- **product-images**: Product photos uploaded by sellers
- **service-images**: Service photos uploaded by sellers
- **company-logos**: Seller company logos
- **seller-documents**: Business verification documents (private)
- **user-avatars**: User profile pictures

All upload functions are already implemented in the respective stores:
- `useSellerStore.uploadCompanyLogo()`
- `useSellerStore.uploadVerificationDocument()`
- Product/Service image uploads will use similar patterns
"