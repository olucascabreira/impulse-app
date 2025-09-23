-- Fix security linter warnings

-- Update all functions to have proper search_path settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$;

CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
    -- For entrada transactions, 'recebido' means money received
    IF NEW.transaction_type = 'entrada' AND NEW.status = 'recebido' AND (OLD IS NULL OR OLD.status != 'recebido') AND NEW.bank_account_id IS NOT NULL THEN
        UPDATE public.bank_accounts 
        SET current_balance = current_balance + NEW.amount
        WHERE id = NEW.bank_account_id;
    END IF;
    
    -- For saida transactions, 'pago' means money paid
    IF NEW.transaction_type = 'saida' AND NEW.status = 'pago' AND (OLD IS NULL OR OLD.status != 'pago') AND NEW.bank_account_id IS NOT NULL THEN
        UPDATE public.bank_accounts 
        SET current_balance = current_balance - NEW.amount
        WHERE id = NEW.bank_account_id;
    END IF;
    
    -- Revert balance when entrada transaction is no longer received
    IF OLD IS NOT NULL AND OLD.transaction_type = 'entrada' AND OLD.status = 'recebido' AND NEW.status != 'recebido' AND NEW.bank_account_id IS NOT NULL THEN
        UPDATE public.bank_accounts 
        SET current_balance = current_balance - OLD.amount
        WHERE id = NEW.bank_account_id;
    END IF;
    
    -- Revert balance when saida transaction is no longer paid
    IF OLD IS NOT NULL AND OLD.transaction_type = 'saida' AND OLD.status = 'pago' AND NEW.status != 'pago' AND NEW.bank_account_id IS NOT NULL THEN
        UPDATE public.bank_accounts 
        SET current_balance = current_balance + OLD.amount
        WHERE id = NEW.bank_account_id;
    END IF;
    
    RETURN NEW;
END;
$;