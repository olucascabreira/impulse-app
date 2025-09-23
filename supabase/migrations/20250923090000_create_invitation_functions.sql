-- Create a secure function for inviting users
-- This function handles user invitations without requiring admin privileges on the client side

-- Create a function to invite users securely
CREATE OR REPLACE FUNCTION public.invite_user_to_company(
    user_email TEXT,
    company_id UUID,
    user_role TEXT DEFAULT 'visualizacao'
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id UUID,
    profile_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    new_user_id UUID;
    new_profile_id UUID;
    existing_profile RECORD;
BEGIN
    -- Get the current user
    current_user_id := auth.uid();
    
    -- Check if current user is admin of the company
    IF NOT public.is_user_company_admin(company_id, current_user_id) THEN
        RETURN QUERY SELECT FALSE, 'User not allowed to invite users to this company', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;
    
    -- Check if user already exists in auth.users
    SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;
    
    IF new_user_id IS NOT NULL THEN
        -- User already exists, check if they're already in the company
        IF EXISTS (SELECT 1 FROM public.company_users WHERE user_id = new_user_id AND company_id = invite_user_to_company.company_id) THEN
            RETURN QUERY SELECT FALSE, 'User is already a member of this company', new_user_id, NULL::UUID;
            RETURN;
        END IF;
        
        -- Add existing user to company
        INSERT INTO public.company_users (company_id, user_id, perfil)
        VALUES (invite_user_to_company.company_id, new_user_id, user_role::public.user_profile);
        
        -- Get or create profile for existing user
        SELECT * INTO existing_profile FROM public.profiles WHERE user_id = new_user_id;
        IF existing_profile IS NULL THEN
            INSERT INTO public.profiles (user_id, nome, perfil)
            VALUES (new_user_id, SPLIT_PART(user_email, '@', 1), user_role::public.user_profile)
            RETURNING id INTO new_profile_id;
        ELSE
            new_profile_id := existing_profile.id;
        END IF;
        
        RETURN QUERY SELECT TRUE, 'User added to company successfully', new_user_id, new_profile_id;
        RETURN;
    ELSE
        -- User doesn't exist, we'll return success but indicate they need to sign up
        RETURN QUERY SELECT TRUE, 'User invited - they need to sign up', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;
    
EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT FALSE, 'Error inviting user: ' || SQLERRM, NULL::UUID, NULL::UUID;
        RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.invite_user_to_company TO authenticated;

-- Add comment to describe the function
COMMENT ON FUNCTION public.invite_user_to_company 
IS 'Securely invite a user to a company - handles both existing and new users';

-- Create a function to create invitations in the invitations table
CREATE OR REPLACE FUNCTION public.create_company_invitation(
    user_email TEXT,
    company_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    invitation_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    new_invitation_id UUID;
BEGIN
    -- Get the current user
    current_user_id := auth.uid();
    
    -- Check if current user is admin of the company
    IF NOT public.is_user_company_admin(company_id, current_user_id) THEN
        RETURN QUERY SELECT FALSE, 'User not allowed to create invitations for this company', NULL::UUID;
        RETURN;
    END IF;
    
    -- Create the invitation
    INSERT INTO public.invitations (email, company_id, invited_by, status)
    VALUES (user_email, company_id, current_user_id, 'pending')
    RETURNING id INTO new_invitation_id;
    
    RETURN QUERY SELECT TRUE, 'Invitation created successfully', new_invitation_id;
    RETURN;
    
EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT FALSE, 'Error creating invitation: ' || SQLERRM, NULL::UUID;
        RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_company_invitation TO authenticated;

-- Add comment to describe the function
COMMENT ON FUNCTION public.create_company_invitation 
IS 'Create an invitation record for a user to join a company';