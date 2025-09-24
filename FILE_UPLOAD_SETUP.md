# File Upload Setup Guide

This guide explains how to set up file upload functionality for company logos and user profile pictures in the Impulse App.

## Overview

The application supports uploading:
1. Company logos (stored in `company-logos` bucket)
2. User profile pictures (stored in `user-profile-pictures` bucket)

Files are stored in Supabase Storage with public access URLs.

## Automatic Setup

The application will automatically:
1. Create storage buckets if they don't exist
2. Upload files with proper validation
3. Generate public URLs for display
4. Handle errors gracefully

## Manual Setup (if needed)

If automatic bucket creation fails, you can manually set up the buckets:

### 1. Create Buckets

Run the following SQL in the Supabase SQL Editor:

```sql
-- Create company-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos', 
  'company-logos', 
  true, 
  2097152, -- 2MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create user-profile-pictures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-profile-pictures', 
  'user-profile-pictures', 
  true, 
  2097152, -- 2MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
```

### 2. Set Up Storage Policies

The application requires the following policies for each bucket:

#### For company-logos:
- Authenticated users can upload company logos
- Authenticated users can update company logos  
- Authenticated users can delete company logos
- Anyone (authenticated or anonymous) can read company logos

#### For user-profile-pictures:
- Authenticated users can upload their profile pictures
- Authenticated users can update their profile pictures
- Authenticated users can delete their profile pictures
- Anyone can read user profile pictures

## Technical Details

### File Validation
- Supported formats: PNG, JPG, JPEG, SVG, WEBP
- Maximum file size: 2MB
- Client-side validation before upload

### Storage Organization
- Company logos: `company-logos/{company_id}/logo.{ext}`
- User profile pictures: `user-profile-pictures/{user_id}/profile.{ext}`

### Database Columns
- Companies table: `logo_url` column (TEXT, nullable)
- Profiles table: `photo_url` column (TEXT, nullable)

### Error Handling
- Automatic retry on bucket creation failure
- Graceful degradation if storage is unavailable
- User-friendly error messages

## Troubleshooting

### Common Issues

1. **Bucket not found error**
   - Solution: Run the manual bucket setup SQL script
   - Check that the bucket names match exactly

2. **Permission denied error**
   - Solution: Verify storage policies are correctly set up
   - Ensure authenticated users have proper permissions

3. **File too large error**
   - Solution: Compress the image or choose a smaller file
   - Maximum size is 2MB

4. **Unsupported file type error**
   - Solution: Convert to a supported format (PNG, JPG, JPEG, SVG, WEBP)

### Debugging Steps

1. Check browser console for detailed error messages
2. Verify file size and format meet requirements
3. Confirm user is authenticated
4. Check Supabase Storage dashboard for bucket existence
5. Review storage policies in Supabase dashboard

## Security Considerations

- All uploaded files are publicly accessible via generated URLs
- File type validation prevents malicious uploads
- Size limits prevent abuse
- Bucket policies restrict who can upload/update/delete files
- Files are stored securely in Supabase Storage

## Maintenance

Regular maintenance tasks:
1. Monitor storage usage
2. Review and rotate access tokens if needed
3. Update file type restrictions as needed
4. Adjust size limits based on usage patterns