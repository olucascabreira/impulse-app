-- Fix infinite recursion in companies RLS policies
DROP POLICY IF EXISTS "Company admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own companies" ON public.companies;

-- Create corrected policies for companies table
CREATE POLICY "Company admins can manage their companies"
ON public.companies 
FOR ALL 
USING (user_admin_id = auth.uid());

CREATE POLICY "Users can view companies they are members of"
ON public.companies 
FOR SELECT 
USING (
  user_admin_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.company_users 
    WHERE company_users.company_id = companies.id 
    AND company_users.user_id = auth.uid()
  )
);