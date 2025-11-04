-- Migration: Add balance validation before transactions
-- Description: Validates sufficient funds before creating or updating paid transactions

-- Function to validate sufficient balance before transaction
CREATE OR REPLACE FUNCTION public.validate_sufficient_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance NUMERIC;
    required_amount NUMERIC;
BEGIN
    -- Only validate for saida (outgoing) transactions that are pago
    IF NEW.transaction_type = 'saida'
       AND NEW.status = 'pago'
       AND NEW.bank_account_id IS NOT NULL THEN

        -- Get current balance
        SELECT ba.current_balance INTO current_balance
        FROM public.bank_accounts ba
        WHERE ba.id = NEW.bank_account_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Conta bancária não encontrada';
        END IF;

        required_amount := NEW.amount;

        -- If updating, add back the old amount to get available balance
        IF TG_OP = 'UPDATE' AND OLD.status = 'pago' AND OLD.bank_account_id = NEW.bank_account_id THEN
            current_balance := current_balance + OLD.amount;
        END IF;

        -- Validate sufficient funds
        IF current_balance < required_amount THEN
            RAISE EXCEPTION 'Saldo insuficiente. Saldo disponível: %, valor necessário: %',
                current_balance, required_amount;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger to validate balance BEFORE the transaction is saved
DROP TRIGGER IF EXISTS validate_balance_before_transaction ON public.transactions;
CREATE TRIGGER validate_balance_before_transaction
    BEFORE INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_sufficient_balance();

-- Add comment
COMMENT ON FUNCTION public.validate_sufficient_balance IS 'Valida se há saldo suficiente antes de permitir transação de saída paga';
