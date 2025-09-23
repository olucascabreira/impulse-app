-- Migration to fix multiple relationships between transactions and bank_accounts
-- This migration removes the ambiguous foreign key constraint that causes embedding issues

-- 1. First, check if the problematic constraint exists
-- (We'll drop it if it exists to resolve the ambiguity)
DO $$
BEGIN
    -- Check if the constraint exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'transactions' 
        AND table_schema = 'public'
        AND constraint_name = 'transactions_bank_account_id_fkey'
    ) THEN
        -- Drop the constraint to remove ambiguity
        ALTER TABLE public.transactions 
        DROP CONSTRAINT IF EXISTS transactions_bank_account_id_fkey;
    END IF;
    
    -- Also check for destination_account_id constraint
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'transactions' 
        AND table_schema = 'public'
        AND constraint_name = 'transactions_destination_account_id_fkey'
    ) THEN
        -- Drop the constraint to remove ambiguity
        ALTER TABLE public.transactions 
        DROP CONSTRAINT IF EXISTS transactions_destination_account_id_fkey;
    END IF;
END $$;

-- 2. Recreate the constraints with explicit names to avoid ambiguity
-- Add foreign key constraint for bank_account_id
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_bank_account_id_fk
FOREIGN KEY (bank_account_id) 
REFERENCES public.bank_accounts(id) 
ON DELETE SET NULL;

-- Add foreign key constraint for destination_account_id
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_destination_account_id_fk
FOREIGN KEY (destination_account_id) 
REFERENCES public.bank_accounts(id) 
ON DELETE SET NULL;

-- 3. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account_id 
ON public.transactions(bank_account_id);

CREATE INDEX IF NOT EXISTS idx_transactions_destination_account_id 
ON public.transactions(destination_account_id);

-- 4. Add comments to describe the columns
COMMENT ON COLUMN public.transactions.bank_account_id 
IS 'Source bank account for transactions';

COMMENT ON COLUMN public.transactions.destination_account_id 
IS 'Destination bank account for transfer transactions';

-- 5. Verify the constraints were added correctly
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
    tc.table_name = 'transactions' 
    AND tc.table_schema = 'public'
    AND ccu.table_name = 'bank_accounts'
ORDER BY 
    tc.constraint_name;