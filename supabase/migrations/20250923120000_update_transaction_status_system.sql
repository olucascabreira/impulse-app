-- Update transaction status validation to be more specific by transaction type
-- This migration updates the status validation to be more context-aware

-- First, we need to update existing data to match the new status system
-- For entrada transactions, 'pago' should become 'recebido'
UPDATE public.transactions 
SET status = 'recebido' 
WHERE transaction_type = 'entrada' AND status = 'pago';

-- For saida transactions, 'recebido' should become 'pago' (though this shouldn't exist in practice)
UPDATE public.transactions 
SET status = 'pago' 
WHERE transaction_type = 'saida' AND status = 'recebido';

-- Update the status constraint to be more specific
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Add a new constraint that validates status based on transaction type
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (
  (transaction_type = 'entrada' AND status IN ('pendente', 'recebido', 'atrasado', 'cancelado')) OR
  (transaction_type = 'saida' AND status IN ('programado', 'pago', 'atrasado', 'cancelado')) OR
  (transaction_type = 'transferencia' AND status IN ('pendente', 'pago', 'atrasado', 'cancelado'))
);

-- Update the bank account balance function to handle the new status system
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

-- Update the delete trigger function to handle the new status system
CREATE OR REPLACE FUNCTION public.update_bank_account_balance_on_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
    -- Revert bank account balance when a received entrada transaction is deleted
    IF OLD.transaction_type = 'entrada' AND OLD.status = 'recebido' AND OLD.bank_account_id IS NOT NULL THEN
        UPDATE public.bank_accounts 
        SET current_balance = current_balance - OLD.amount
        WHERE id = OLD.bank_account_id;
    END IF;
    
    -- Revert bank account balance when a paid saida transaction is deleted
    IF OLD.transaction_type = 'saida' AND OLD.status = 'pago' AND OLD.bank_account_id IS NOT NULL THEN
        UPDATE public.bank_accounts 
        SET current_balance = current_balance + OLD.amount
        WHERE id = OLD.bank_account_id;
    END IF;
    
    RETURN OLD;
END;
$;

-- Recreate the triggers to ensure they use the updated functions
DROP TRIGGER IF EXISTS update_bank_balance_on_transaction_update ON public.transactions;
DROP TRIGGER IF EXISTS update_bank_balance_on_transaction_insert ON public.transactions;
DROP TRIGGER IF EXISTS update_bank_balance_on_transaction_delete ON public.transactions;

CREATE TRIGGER update_bank_balance_on_transaction_update
    AFTER UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_account_balance();

CREATE TRIGGER update_bank_balance_on_transaction_insert
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_account_balance();

CREATE TRIGGER update_bank_balance_on_transaction_delete
    AFTER DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_account_balance_on_delete();