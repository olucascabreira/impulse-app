-- Update company_users RLS policies to fix INSERT operations
-- This migration ensures company admins can properly add users to their companies

-- Drop existing policies
DROP POLICY IF EXISTS "Company admins can add memberships" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can update memberships" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can remove memberships" ON public.company_users;

-- Create updated policies for company_users
-- For INSERT - company admins can add new memberships
CREATE POLICY "Company admins can add memberships"
ON public.company_users
FOR INSERT
WITH CHECK (
    public.is_user_company_admin(company_id, auth.uid())
);

-- For UPDATE - company admins can update memberships
CREATE POLICY "Company admins can update memberships"
ON public.company_users
FOR UPDATE
USING (
    public.is_user_company_admin(company_id, auth.uid())
);

-- For DELETE - company admins can remove memberships
CREATE POLICY "Company admins can remove memberships"
ON public.company_users
FOR DELETE
USING (
    public.is_user_company_admin(company_id, auth.uid())
);

-- Verify the policies were added correctly
SELECT 
    polname AS policy_name,
    polcmd AS command_type,
    CASE 
        WHEN polcmd = 'r' THEN 'SELECT'
        WHEN polcmd = 'a' THEN 'INSERT'
        WHEN polcmd = 'w' THEN 'UPDATE'
        WHEN polcmd = 'd' THEN 'DELETE'
        ELSE 'ALL'
    END AS operation
FROM 
    pg_policy 
WHERE 
    polrelid = 'public.company_users'::regclass
ORDER BY 
    polname;