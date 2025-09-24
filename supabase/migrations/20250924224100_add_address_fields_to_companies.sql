---
-- Add address-related fields to companies table

-- Add street field
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS street TEXT;

-- Add number field
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS number TEXT;

-- Add neighborhood field
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Add complement field
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS complement TEXT;

-- Add city field (already defined in interface but not in schema)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city TEXT;

-- Add state field (already defined in interface but not in schema)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state TEXT;

-- Add zipcode field (already defined in interface but not in schema)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS zipcode TEXT;

-- Update the trigger to ensure the updated_at column is properly set
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the trigger exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at') THEN
        CREATE TRIGGER update_companies_updated_at
            BEFORE UPDATE ON public.companies
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
