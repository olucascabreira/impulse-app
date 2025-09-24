-- Add photo_url column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN public.profiles.photo_url IS 'URL to the user''s profile picture stored in Supabase storage';