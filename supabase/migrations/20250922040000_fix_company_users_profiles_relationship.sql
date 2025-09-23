-- Migration to establish proper relationship between company_users and profiles
-- This migration fixes the PGRST200 error by ensuring proper foreign key constraints

-- 1. Add foreign key constraint from company_users.user_id to profiles.user_id
-- This establishes the relationship between company_users and profiles
ALTER TABLE public.company_users 
ADD CONSTRAINT company_users_user_id_fkey
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- 2. Add foreign key constraint from company_users.company_id to companies.id
-- This ensures company_users are properly linked to companies
ALTER TABLE public.company_users 
ADD CONSTRAINT company_users_company_id_fkey
FOREIGN KEY (company_id) 
REFERENCES public.companies(id) 
ON DELETE CASCADE;

-- 3. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_company_users_user_id 
ON public.company_users(user_id);

CREATE INDEX IF NOT EXISTS idx_company_users_company_id 
ON public.company_users(company_id);

-- 4. Add unique constraint to prevent duplicate user-company combinations
ALTER TABLE public.company_users 
ADD CONSTRAINT company_users_user_company_unique 
UNIQUE (user_id, company_id);

-- 5. Add comments to describe the relationships
COMMENT ON COLUMN public.company_users.user_id 
IS 'Reference to profiles.user_id - Links company users to their profiles';

COMMENT ON COLUMN public.company_users.company_id 
IS 'Reference to companies.id - Links users to companies';

COMMENT ON CONSTRAINT company_users_user_id_fkey ON public.company_users 
IS 'Foreign key constraint linking company_users to profiles';

COMMENT ON CONSTRAINT company_users_company_id_fkey ON public.company_users 
IS 'Foreign key constraint linking company_users to companies';

-- 6. Verify the constraints were added correctly
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