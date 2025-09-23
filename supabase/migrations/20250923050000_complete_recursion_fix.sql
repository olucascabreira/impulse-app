-- Complete fix for infinite recursion in all RLS policies
-- This migration completely restructures all RLS policies to eliminate any possibility of recursion

-- First, disable RLS temporarily to avoid conflicts during policy updates
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Company admins can manage their companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies they have access to" ON public.companies;

DROP POLICY IF EXISTS "Users can view company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can manage memberships" ON public.company_users;

DROP POLICY IF EXISTS "Users can view chart accounts from their company" ON public.chart_accounts;
DROP POLICY IF EXISTS "Admins and financeiro can manage chart accounts" ON public.chart_accounts;

DROP POLICY IF EXISTS "Users can view bank accounts from their company" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins and financeiro can manage bank accounts" ON public.bank_accounts;

DROP POLICY IF EXISTS "Users can view transactions from their company" ON public.transactions;
DROP POLICY IF EXISTS "Admins and financeiro can manage transactions" ON public.transactions;

DROP POLICY IF EXISTS "Users can view contacts from their company" ON public.contacts;
DROP POLICY IF EXISTS "Admins and financeiro can manage contacts" ON public.contacts;

-- Ensure proper foreign key relationships exist
-- First, verify if the constraints already exist
-- If they do, we'll drop them and recreate them to ensure they're correct
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

-- Recreate security definer functions with improved logic
-- Function to check if user has access to a company (without recursion)
CREATE OR REPLACE FUNCTION public.check_user_company_access(company_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  -- Direct check without subqueries that could cause recursion
  RETURN (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_uuid AND user_admin_id = user_uuid) OR
    EXISTS (SELECT 1 FROM public.company_users WHERE company_id = company_uuid AND user_id = user_uuid)
  );
END;
$;

-- Function to get company IDs where user is admin
CREATE OR REPLACE FUNCTION public.get_admin_company_ids(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE(company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT id FROM public.companies WHERE user_admin_id = user_uuid;
END;
$;

-- Function to get company IDs where user is member
CREATE OR REPLACE FUNCTION public.get_member_company_ids(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE(company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT company_id FROM public.company_users WHERE user_id = user_uuid;
END;
$;

-- Function to check if user is admin of a company
CREATE OR REPLACE FUNCTION public.is_user_company_admin(company_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.companies WHERE id = company_uuid AND user_admin_id = user_uuid);
END;
$;

-- Function to check if user is member of a company
CREATE OR REPLACE FUNCTION public.is_user_company_member(company_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.company_users WHERE company_id = company_uuid AND user_id = user_uuid);
END;
$;

-- Create simplified policies without any subqueries that could cause recursion
-- Companies policies
CREATE POLICY "Company admins can manage their companies"
ON public.companies 
FOR ALL 
USING (user_admin_id = auth.uid())
WITH CHECK (user_admin_id = auth.uid());

CREATE POLICY "Users can view companies they have access to"
ON public.companies 
FOR SELECT 
USING (public.check_user_company_access(id, auth.uid()));

-- Company users policies
CREATE POLICY "Users can view company memberships"
ON public.company_users
FOR SELECT
USING (
    user_id = auth.uid() OR
    public.is_user_company_admin(company_id, auth.uid())
);

CREATE POLICY "Company admins can manage memberships"
ON public.company_users
FOR ALL
USING (
    public.is_user_company_admin(company_id, auth.uid())
);

-- Chart accounts policies
CREATE POLICY "Users can view chart accounts from their company"
ON public.chart_accounts
FOR SELECT
USING (
    public.check_user_company_access(company_id, auth.uid())
);

CREATE POLICY "Admins and financeiro can manage chart accounts"
ON public.chart_accounts
FOR ALL
USING (
    public.is_user_company_admin(company_id, auth.uid())
);

-- Bank accounts policies
CREATE POLICY "Users can view bank accounts from their company"
ON public.bank_accounts
FOR SELECT
USING (
    public.check_user_company_access(company_id, auth.uid())
);

CREATE POLICY "Admins and financeiro can manage bank accounts"
ON public.bank_accounts
FOR ALL
USING (
    public.is_user_company_admin(company_id, auth.uid())
);

-- Transactions policies
CREATE POLICY "Users can view transactions from their company"
ON public.transactions
FOR SELECT
USING (
    public.check_user_company_access(company_id, auth.uid())
);

CREATE POLICY "Admins and financeiro can manage transactions"
ON public.transactions
FOR ALL
USING (
    public.is_user_company_admin(company_id, auth.uid())
);

-- Contacts policies
CREATE POLICY "Users can view contacts from their company"
ON public.contacts
FOR SELECT
USING (
    public.check_user_company_access(company_id, auth.uid())
);

CREATE POLICY "Admins and financeiro can manage contacts"
ON public.contacts
FOR ALL
USING (
    public.is_user_company_admin(company_id, auth.uid())
);

-- Re-enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;