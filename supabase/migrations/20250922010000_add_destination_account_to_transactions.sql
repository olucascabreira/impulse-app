-- Migration to add destination_account_id column to transactions table for transfer functionality
-- This migration adds support for transfer transactions between bank accounts

-- 1. Add destination_account_id column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS destination_account_id UUID;

-- 2. Add foreign key constraint for destination_account_id referencing bank_accounts
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_destination_account_id_fkey
FOREIGN KEY (destination_account_id) 
REFERENCES public.bank_accounts(id) 
ON DELETE SET NULL;

-- 3. Add comment to describe the column
COMMENT ON COLUMN public.transactions.destination_account_id 
IS 'Destination bank account for transfer transactions';

-- 4. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_destination_account_id 
ON public.transactions(destination_account_id);

-- 5. Update existing transactions to ensure data consistency
-- (No need to update existing records as they will have NULL for destination_account_id by default)