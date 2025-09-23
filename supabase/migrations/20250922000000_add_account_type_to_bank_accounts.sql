-- SQL script to add account_type column to bank_accounts table
-- Run this in your Supabase SQL editor if the column is missing

-- Add account_type column to bank_accounts table
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS account_type TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN public.bank_accounts.account_type 
IS 'Type of bank account (checking, savings, credit_card, investment, reserve, other)';

-- Add constraint to validate account_type values
ALTER TABLE public.bank_accounts 
ADD CONSTRAINT valid_account_type 
CHECK (
  account_type IS NULL OR 
  account_type IN ('checking', 'savings', 'credit_card', 'investment', 'reserve', 'other')
);