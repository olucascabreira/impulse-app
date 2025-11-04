-- Migration: Create comprehensive balance update triggers
-- Description: Automatically updates bank account balances when transactions are created, updated, or deleted

-- Function to update balance on transaction INSERT
CREATE OR REPLACE FUNCTION public.update_bank_balance_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only update balance if transaction is paid/received and has a bank account
    IF NEW.bank_account_id IS NOT NULL AND (NEW.status IN ('pago', 'recebido')) THEN
        IF NEW.transaction_type = 'entrada' THEN
            -- Credit the account
            UPDATE public.bank_accounts
            SET current_balance = current_balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.bank_account_id;
        ELSIF NEW.transaction_type = 'saida' THEN
            -- Debit the account
            UPDATE public.bank_accounts
            SET current_balance = current_balance - NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.bank_account_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Function to update balance on transaction UPDATE
CREATE OR REPLACE FUNCTION public.update_bank_balance_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_was_paid BOOLEAN;
    new_is_paid BOOLEAN;
BEGIN
    old_was_paid := (OLD.status IN ('pago', 'recebido'));
    new_is_paid := (NEW.status IN ('pago', 'recebido'));

    -- Case 1: Status changed from paid to unpaid
    IF old_was_paid AND NOT new_is_paid AND OLD.bank_account_id IS NOT NULL THEN
        IF OLD.transaction_type = 'entrada' THEN
            -- Revert credit
            UPDATE public.bank_accounts
            SET current_balance = current_balance - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.bank_account_id;
        ELSIF OLD.transaction_type = 'saida' THEN
            -- Revert debit
            UPDATE public.bank_accounts
            SET current_balance = current_balance + OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.bank_account_id;
        END IF;
    END IF;

    -- Case 2: Status changed from unpaid to paid
    IF NOT old_was_paid AND new_is_paid AND NEW.bank_account_id IS NOT NULL THEN
        IF NEW.transaction_type = 'entrada' THEN
            -- Apply credit
            UPDATE public.bank_accounts
            SET current_balance = current_balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.bank_account_id;
        ELSIF NEW.transaction_type = 'saida' THEN
            -- Apply debit
            UPDATE public.bank_accounts
            SET current_balance = current_balance - NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.bank_account_id;
        END IF;
    END IF;

    -- Case 3: Amount changed while paid (adjust difference)
    IF old_was_paid AND new_is_paid AND (OLD.amount != NEW.amount) THEN
        IF OLD.bank_account_id = NEW.bank_account_id AND OLD.bank_account_id IS NOT NULL THEN
            -- Same account, adjust difference
            IF NEW.transaction_type = 'entrada' THEN
                UPDATE public.bank_accounts
                SET current_balance = current_balance - OLD.amount + NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.bank_account_id;
            ELSIF NEW.transaction_type = 'saida' THEN
                UPDATE public.bank_accounts
                SET current_balance = current_balance + OLD.amount - NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.bank_account_id;
            END IF;
        ELSE
            -- Different accounts, revert old and apply new
            IF OLD.bank_account_id IS NOT NULL THEN
                IF OLD.transaction_type = 'entrada' THEN
                    UPDATE public.bank_accounts
                    SET current_balance = current_balance - OLD.amount,
                        updated_at = NOW()
                    WHERE id = OLD.bank_account_id;
                ELSIF OLD.transaction_type = 'saida' THEN
                    UPDATE public.bank_accounts
                    SET current_balance = current_balance + OLD.amount,
                        updated_at = NOW()
                    WHERE id = OLD.bank_account_id;
                END IF;
            END IF;

            IF NEW.bank_account_id IS NOT NULL THEN
                IF NEW.transaction_type = 'entrada' THEN
                    UPDATE public.bank_accounts
                    SET current_balance = current_balance + NEW.amount,
                        updated_at = NOW()
                    WHERE id = NEW.bank_account_id;
                ELSIF NEW.transaction_type = 'saida' THEN
                    UPDATE public.bank_accounts
                    SET current_balance = current_balance - NEW.amount,
                        updated_at = NOW()
                    WHERE id = NEW.bank_account_id;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Case 4: Bank account changed while paid
    IF old_was_paid AND new_is_paid AND (OLD.bank_account_id IS DISTINCT FROM NEW.bank_account_id) AND (OLD.amount = NEW.amount) THEN
        -- Revert from old account
        IF OLD.bank_account_id IS NOT NULL THEN
            IF OLD.transaction_type = 'entrada' THEN
                UPDATE public.bank_accounts
                SET current_balance = current_balance - OLD.amount,
                    updated_at = NOW()
                WHERE id = OLD.bank_account_id;
            ELSIF OLD.transaction_type = 'saida' THEN
                UPDATE public.bank_accounts
                SET current_balance = current_balance + OLD.amount,
                    updated_at = NOW()
                WHERE id = OLD.bank_account_id;
            END IF;
        END IF;

        -- Apply to new account
        IF NEW.bank_account_id IS NOT NULL THEN
            IF NEW.transaction_type = 'entrada' THEN
                UPDATE public.bank_accounts
                SET current_balance = current_balance + NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.bank_account_id;
            ELSIF NEW.transaction_type = 'saida' THEN
                UPDATE public.bank_accounts
                SET current_balance = current_balance - NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.bank_account_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Function to update balance on transaction DELETE (already exists but let's ensure it's complete)
CREATE OR REPLACE FUNCTION public.update_bank_balance_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Revert balance if transaction was paid and had a bank account
    IF OLD.bank_account_id IS NOT NULL AND (OLD.status IN ('pago', 'recebido')) THEN
        IF OLD.transaction_type = 'entrada' THEN
            -- Revert credit
            UPDATE public.bank_accounts
            SET current_balance = current_balance - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.bank_account_id;
        ELSIF OLD.transaction_type = 'saida' THEN
            -- Revert debit
            UPDATE public.bank_accounts
            SET current_balance = current_balance + OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.bank_account_id;
        END IF;
    END IF;

    RETURN OLD;
END;
$$;

-- Create or replace triggers
DROP TRIGGER IF EXISTS update_bank_balance_on_transaction_insert ON public.transactions;
CREATE TRIGGER update_bank_balance_on_transaction_insert
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_balance_on_insert();

DROP TRIGGER IF EXISTS update_bank_balance_on_transaction_update ON public.transactions;
CREATE TRIGGER update_bank_balance_on_transaction_update
    AFTER UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_balance_on_update();

DROP TRIGGER IF EXISTS update_bank_balance_on_transaction_delete ON public.transactions;
CREATE TRIGGER update_bank_balance_on_transaction_delete
    AFTER DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_balance_on_delete();

-- Add comments
COMMENT ON FUNCTION public.update_bank_balance_on_insert IS 'Atualiza saldo da conta bancária quando transação é inserida';
COMMENT ON FUNCTION public.update_bank_balance_on_update IS 'Atualiza saldo da conta bancária quando transação é modificada';
COMMENT ON FUNCTION public.update_bank_balance_on_delete IS 'Atualiza saldo da conta bancária quando transação é deletada';
