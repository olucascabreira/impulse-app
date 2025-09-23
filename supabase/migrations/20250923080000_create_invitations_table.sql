-- Create invitations table for user invitations
-- This migration creates the missing invitations table that the application expects

-- Create the invitations table
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'cancelled')),
    token UUID DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);

-- Enable Row Level Security
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for invitations table
-- Company admins can view invitations for their companies
CREATE POLICY "Company admins can view invitations"
ON public.invitations
FOR SELECT
USING (
    public.is_user_company_admin(company_id, auth.uid())
);

-- Company admins can create invitations for their companies
CREATE POLICY "Company admins can create invitations"
ON public.invitations
FOR INSERT
WITH CHECK (
    public.is_user_company_admin(company_id, auth.uid())
);

-- Company admins can update invitations for their companies
CREATE POLICY "Company admins can update invitations"
ON public.invitations
FOR UPDATE
USING (
    public.is_user_company_admin(company_id, auth.uid())
);

-- Company admins can delete invitations for their companies
CREATE POLICY "Company admins can delete invitations"
ON public.invitations
FOR DELETE
USING (
    public.is_user_company_admin(company_id, auth.uid())
);

-- Add trigger for updated_at
CREATE TRIGGER update_invitations_updated_at 
BEFORE UPDATE ON public.invitations
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to describe the table
COMMENT ON TABLE public.invitations 
IS 'User invitations for companies - tracks email invitations sent to users';

-- Verify the table was created correctly
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'invitations'
ORDER BY 
    ordinal_position;