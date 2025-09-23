-- Simplify transaction status system
-- This migration updates the status validation to use a simpler system:
-- Entrada/Saída: Pendente, Pago, Atrasado
-- Transferência: Transferido

-- Update existing data to match the new status system
-- Convert 'recebido' to 'pago' for entrada transactions
UPDATE public.transactions 
SET status = 'pago' 
WHERE transaction_type = 'entrada' AND status = 'recebido';

-- Convert 'programado' to 'pendente' for saida transactions
UPDATE public.transactions 
SET status = 'pendente' 
WHERE transaction_type = 'saida' AND status = 'programado';

-- Update the status constraint to use the simplified system
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Add new constraint with simplified status system
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (
  (transaction_type IN ('entrada', 'saida') AND status IN ('pendente', 'pago', 'atrasado')) OR
  (transaction_type = 'transferencia' AND status = 'transferido')
);

-- Update the bank account balance function for the new status system
CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- For entrada transactions, 'pago' means money received
    IF NEW.transaction_type = 'entrada' AND NEW.status = 'pago' AND (OLD IS NULL OR OLD.status != 'pago') AND NEW.bank_account_id IS NOT NULL THEN
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
    
    -- For transfer transactions, 'transferido' means money transferred
    -- We need to handle both source and destination accounts
    IF NEW.transaction_type = 'transferencia' AND NEW.status = 'transferido' AND (OLD IS NULL OR OLD.status != 'transferido') THEN
        -- Subtract from source account
        IF NEW.bank_account_id IS NOT NULL THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.bank_account_id;
        END IF;
        
        -- Add to destination account
        IF NEW.destination_account_id IS NOT NULL THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.destination_account_id;
        END IF;
    END IF;
    
    -- Revert balance when entrada transaction is no longer paid
    IF OLD IS NOT NULL AND OLD.transaction_type = 'entrada' AND OLD.status = 'pago' AND NEW.status != 'pago' AND NEW.bank_account_id IS NOT NULL THEN
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
    
    -- Revert balance when transfer transaction is no longer transferido
    IF OLD IS NOT NULL AND OLD.transaction_type = 'transferencia' AND OLD.status = 'transferido' AND NEW.status != 'transferido' THEN
        -- Add back to source account
        IF NEW.bank_account_id IS NOT NULL THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance + OLD.amount
            WHERE id = NEW.bank_account_id;
        END IF;
        
        -- Subtract from destination account
        IF NEW.destination_account_id IS NOT NULL THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance - OLD.amount
            WHERE id = NEW.destination_account_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update the delete trigger function for the new status system
CREATE OR REPLACE FUNCTION public.update_bank_account_balance_on_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Revert bank account balance when a paid entrada transaction is deleted
    IF OLD.transaction_type = 'entrada' AND OLD.status = 'pago' AND OLD.bank_account_id IS NOT NULL THEN
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
    
    -- Revert bank account balance when a transferido transfer transaction is deleted
    IF OLD.transaction_type = 'transferencia' AND OLD.status = 'transferido' THEN
        -- Add back to source account
        IF OLD.bank_account_id IS NOT NULL THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.bank_account_id;
        END IF;
        
        -- Subtract from destination account
        IF OLD.destination_account_id IS NOT NULL THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.destination_account_id;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$;

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