-- Create storage buckets for company logos and user profile pictures

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

-- Create policies for company-logos bucket
CREATE POLICY "Users can upload company logos" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Users can update company logos" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'company-logos');

CREATE POLICY "Users can delete company logos" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'company-logos');

CREATE POLICY "Anyone can read company logos" 
ON storage.objects FOR SELECT TO anon, authenticated 
USING (bucket_id = 'company-logos');

-- Create policies for user-profile-pictures bucket
CREATE POLICY "Users can upload their profile pictures" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'user-profile-pictures');

CREATE POLICY "Users can update their profile pictures" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'user-profile-pictures');

CREATE POLICY "Users can delete their profile pictures" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'user-profile-pictures');

CREATE POLICY "Anyone can read user profile pictures" 
ON storage.objects FOR SELECT TO anon, authenticated 
USING (bucket_id = 'user-profile-pictures');