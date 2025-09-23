-- Fix the relationship between company_users and profiles
-- This migration establishes the proper foreign key relationship between company_users and profiles tables

-- First, verify if the constraint already exists
-- If it does, we'll drop it and recreate it to ensure it's correct
ALTER TABLE public.company_users 
DROP CONSTRAINT IF EXISTS company_users_user_id_fkey;

-- Add foreign key constraint from company_users.user_id to profiles.user_id
-- This establishes the relationship between company_users and profiles
ALTER TABLE public.company_users 
ADD CONSTRAINT company_users_user_id_fkey
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Also ensure the company_id foreign key constraint exists
ALTER TABLE public.company_users 
DROP CONSTRAINT IF EXISTS company_users_company_id_fkey;

ALTER TABLE public.company_users 
ADD CONSTRAINT company_users_company_id_fkey
FOREIGN KEY (company_id) 
REFERENCES public.companies(id) 
ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_company_users_user_id 
ON public.company_users(user_id);

CREATE INDEX IF NOT EXISTS idx_company_users_company_id 
ON public.company_users(company_id);

-- Add unique constraint to prevent duplicate user-company combinations
ALTER TABLE public.company_users 
DROP CONSTRAINT IF EXISTS company_users_user_company_unique;

ALTER TABLE public.company_users 
ADD CONSTRAINT company_users_user_company_unique 
UNIQUE (user_id, company_id);

-- Add comments to describe the relationships
COMMENT ON COLUMN public.company_users.user_id 
IS 'Reference to profiles.user_id - Links company users to their profiles';

COMMENT ON COLUMN public.company_users.company_id 
IS 'Reference to companies.id - Links users to companies';

COMMENT ON CONSTRAINT company_users_user_id_fkey ON public.company_users 
IS 'Foreign key constraint linking company_users to profiles';

COMMENT ON CONSTRAINT company_users_company_id_fkey ON public.company_users 
IS 'Foreign key constraint linking company_users to companies';

-- Verify the constraints were added correctly
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.table_name = 'company_users' 
    AND tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY 
    tc.constraint_name;