-- Remove all existing policies for companies table
DROP POLICY IF EXISTS "Company admins can manage their companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies they are members of" ON public.companies;

-- Create a security definer function to check company membership
CREATE OR REPLACE FUNCTION public.user_can_access_company(company_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin of the company
  IF EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = company_uuid AND user_admin_id = user_uuid
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is a member of the company
  IF EXISTS (
    SELECT 1 FROM public.company_users 
    WHERE company_id = company_uuid AND user_id = user_uuid
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create corrected policies using the security definer function
CREATE POLICY "Users can manage companies where they are admin"
ON public.companies 
FOR ALL 
USING (user_admin_id = auth.uid());

CREATE POLICY "Users can view companies they have access to"
ON public.companies 
FOR SELECT 
USING (public.user_can_access_company(id, auth.uid()));