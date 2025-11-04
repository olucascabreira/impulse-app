-- Migration: Create atomic transfer function
-- Description: Creates an RPC function to handle bank transfers atomically with proper validation

-- Function to perform atomic bank account transfers
CREATE OR REPLACE FUNCTION public.create_bank_transfer(
    p_company_id UUID,
    p_source_account_id UUID,
    p_destination_account_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_payment_method TEXT DEFAULT 'transferencia_bancaria',
    p_due_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_source_balance NUMERIC;
    v_destination_balance NUMERIC;
    v_source_transaction_id UUID;
    v_destination_transaction_id UUID;
    v_result JSON;
BEGIN
    -- Validate input parameters
    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'company_id é obrigatório';
    END IF;

    IF p_source_account_id IS NULL THEN
        RAISE EXCEPTION 'Conta de origem é obrigatória';
    END IF;

    IF p_destination_account_id IS NULL THEN
        RAISE EXCEPTION 'Conta de destino é obrigatória';
    END IF;

    IF p_source_account_id = p_destination_account_id THEN
        RAISE EXCEPTION 'Conta de origem e destino não podem ser iguais';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Valor deve ser maior que zero';
    END IF;

    -- Lock the accounts to prevent race conditions (in order to prevent deadlocks)
    PERFORM 1 FROM public.bank_accounts
    WHERE id IN (p_source_account_id, p_destination_account_id)
    ORDER BY id
    FOR UPDATE;

    -- Get source account balance
    SELECT current_balance INTO v_source_balance
    FROM public.bank_accounts
    WHERE id = p_source_account_id AND company_id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta de origem não encontrada';
    END IF;

    -- Get destination account balance
    SELECT current_balance INTO v_destination_balance
    FROM public.bank_accounts
    WHERE id = p_destination_account_id AND company_id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta de destino não encontrada';
    END IF;

    -- Validate sufficient funds
    IF v_source_balance < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente na conta de origem. Saldo disponível: %', v_source_balance;
    END IF;

    -- Update source account balance (debit)
    UPDATE public.bank_accounts
    SET current_balance = current_balance - p_amount,
        updated_at = NOW()
    WHERE id = p_source_account_id;

    -- Update destination account balance (credit)
    UPDATE public.bank_accounts
    SET current_balance = current_balance + p_amount,
        updated_at = NOW()
    WHERE id = p_destination_account_id;

    -- Create source transaction (saida)
    INSERT INTO public.transactions (
        company_id,
        bank_account_id,
        destination_account_id,
        transaction_type,
        description,
        amount,
        due_date,
        payment_date,
        status,
        payment_method
    )
    VALUES (
        p_company_id,
        p_source_account_id,
        p_destination_account_id,
        'saida',
        p_description,
        p_amount,
        p_due_date,
        CURRENT_DATE,
        'pago',
        p_payment_method
    )
    RETURNING id INTO v_source_transaction_id;

    -- Create destination transaction (entrada)
    INSERT INTO public.transactions (
        company_id,
        bank_account_id,
        destination_account_id,
        transaction_type,
        description,
        amount,
        due_date,
        payment_date,
        status,
        payment_method
    )
    VALUES (
        p_company_id,
        p_destination_account_id,
        p_source_account_id,
        'entrada',
        p_description,
        p_amount,
        p_due_date,
        CURRENT_DATE,
        'recebido',
        p_payment_method
    )
    RETURNING id INTO v_destination_transaction_id;

    -- Build result JSON
    v_result := json_build_object(
        'success', true,
        'source_transaction_id', v_source_transaction_id,
        'destination_transaction_id', v_destination_transaction_id,
        'source_account_new_balance', v_source_balance - p_amount,
        'destination_account_new_balance', v_destination_balance + p_amount,
        'message', 'Transferência realizada com sucesso'
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Rollback happens automatically
        RAISE EXCEPTION 'Erro ao realizar transferência: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_bank_transfer TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_bank_transfer IS 'Realiza transferência bancária atômica entre contas com validação de saldo e criação de transações';
