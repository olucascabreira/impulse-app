-- Fix security linter warnings

-- Update all functions to have proper search_path settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update bank account balance when transaction is paid
    IF NEW.status = 'pago' AND (OLD IS NULL OR OLD.status != 'pago') AND NEW.bank_account_id IS NOT NULL THEN
        IF NEW.transaction_type = 'entrada' THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.bank_account_id;
        ELSE
            UPDATE public.bank_accounts 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.bank_account_id;
        END IF;
    END IF;
    
    -- Revert balance if transaction is cancelled or unpaid
    IF OLD IS NOT NULL AND OLD.status = 'pago' AND NEW.status != 'pago' AND NEW.bank_account_id IS NOT NULL THEN
        IF NEW.transaction_type = 'entrada' THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.bank_account_id;
        ELSE
            UPDATE public.bank_accounts 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.bank_account_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;