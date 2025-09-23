-- Add trigger for handling bank account balance when transactions are deleted
-- This migration ensures that when a paid/received transaction is deleted, the bank account balance is adjusted

-- Function to update bank account balance when transaction is deleted
CREATE OR REPLACE FUNCTION public.update_bank_account_balance_on_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
    -- Revert bank account balance when a paid transaction is deleted
    IF OLD.status = 'pago' AND OLD.bank_account_id IS NOT NULL THEN
        IF OLD.transaction_type = 'entrada' THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.bank_account_id;
        ELSE
            UPDATE public.bank_accounts 
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.bank_account_id;
        END IF;
    END IF;
    
    -- Revert bank account balance when a received transaction is deleted
    IF OLD.status = 'recebido' AND OLD.bank_account_id IS NOT NULL THEN
        IF OLD.transaction_type = 'entrada' THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.bank_account_id;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$;

-- Trigger for bank balance updates on transaction deletion
DROP TRIGGER IF EXISTS update_bank_balance_on_transaction_delete ON public.transactions;

CREATE TRIGGER update_bank_balance_on_transaction_delete
    AFTER DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_account_balance_on_delete();