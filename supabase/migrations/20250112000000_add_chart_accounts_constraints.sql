-- Migration: Add constraints and validations to chart_accounts
-- Description: Adds unique constraint for codigo, validates hierarchy depth, and prevents tipo changes with transactions

-- 1. Add unique constraint for codigo within same company (allow NULL for multiple accounts without codigo)
CREATE UNIQUE INDEX chart_accounts_company_codigo_unique
ON public.chart_accounts (company_id, codigo)
WHERE codigo IS NOT NULL;

-- 2. Add descricao column if it doesn't exist
ALTER TABLE public.chart_accounts
ADD COLUMN IF NOT EXISTS descricao TEXT;

-- 3. Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE public.account_status AS ENUM ('ativo', 'inativo');
    END IF;
END $$;

ALTER TABLE public.chart_accounts
ADD COLUMN IF NOT EXISTS status account_status DEFAULT 'ativo';

-- 4. Update tipo enum to include all account types
DO $$
BEGIN
    -- Drop the old enum and recreate with all types
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chart_account_type') THEN
        ALTER TABLE public.chart_accounts ALTER COLUMN tipo TYPE TEXT;
        DROP TYPE IF EXISTS public.chart_account_type CASCADE;
    END IF;

    CREATE TYPE public.chart_account_type AS ENUM ('ativo', 'passivo', 'patrimonio_liquido', 'receita', 'despesa');

    ALTER TABLE public.chart_accounts
    ALTER COLUMN tipo TYPE chart_account_type USING tipo::chart_account_type;
END $$;

-- 5. Function to validate hierarchy depth (max 4 levels: 0, 1, 2, 3)
CREATE OR REPLACE FUNCTION public.validate_chart_account_hierarchy_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    depth INTEGER := 0;
    current_parent_id UUID;
    max_depth INTEGER := 3; -- 0-indexed, so 3 means 4 levels
BEGIN
    -- Only check if there is a parent
    IF NEW.parent_id IS NOT NULL THEN
        current_parent_id := NEW.parent_id;

        -- Traverse up the hierarchy
        WHILE current_parent_id IS NOT NULL AND depth <= max_depth LOOP
            depth := depth + 1;

            -- Prevent infinite loops by checking depth limit
            IF depth > max_depth THEN
                RAISE EXCEPTION 'Hierarquia não pode ter mais de 4 níveis';
            END IF;

            -- Get the next parent
            SELECT parent_id INTO current_parent_id
            FROM public.chart_accounts
            WHERE id = current_parent_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- 6. Function to prevent cycles in hierarchy
CREATE OR REPLACE FUNCTION public.prevent_chart_account_hierarchy_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_id UUID;
    visited UUID[];
BEGIN
    -- Only check if there is a parent
    IF NEW.parent_id IS NOT NULL THEN
        current_id := NEW.parent_id;
        visited := ARRAY[NEW.id];

        -- Traverse up to check for cycles
        WHILE current_id IS NOT NULL LOOP
            -- Check if we've seen this ID before (cycle detected)
            IF current_id = ANY(visited) THEN
                RAISE EXCEPTION 'Esta alteração criaria um ciclo na hierarquia';
            END IF;

            visited := visited || current_id;

            -- Prevent infinite loops
            IF array_length(visited, 1) > 100 THEN
                RAISE EXCEPTION 'Hierarquia muito profunda detectada';
            END IF;

            -- Get the next parent
            SELECT parent_id INTO current_id
            FROM public.chart_accounts
            WHERE id = current_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- 7. Function to prevent tipo change when transactions exist
CREATE OR REPLACE FUNCTION public.prevent_chart_account_tipo_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    transaction_count INTEGER;
BEGIN
    -- Only check on UPDATE and if tipo is changing
    IF TG_OP = 'UPDATE' AND OLD.tipo IS DISTINCT FROM NEW.tipo THEN
        -- Check if there are any transactions using this account
        SELECT COUNT(*) INTO transaction_count
        FROM public.transactions
        WHERE chart_account_id = NEW.id;

        IF transaction_count > 0 THEN
            RAISE EXCEPTION 'Não é possível mudar o tipo de uma conta que possui transações associadas';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 8. Create triggers
DROP TRIGGER IF EXISTS validate_chart_account_depth ON public.chart_accounts;
CREATE TRIGGER validate_chart_account_depth
    BEFORE INSERT OR UPDATE OF parent_id ON public.chart_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_chart_account_hierarchy_depth();

DROP TRIGGER IF EXISTS prevent_chart_account_cycle ON public.chart_accounts;
CREATE TRIGGER prevent_chart_account_cycle
    BEFORE INSERT OR UPDATE OF parent_id ON public.chart_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_chart_account_hierarchy_cycle();

DROP TRIGGER IF EXISTS prevent_chart_account_tipo_change_trigger ON public.chart_accounts;
CREATE TRIGGER prevent_chart_account_tipo_change_trigger
    BEFORE UPDATE OF tipo ON public.chart_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_chart_account_tipo_change();

-- 9. Add comment to document the constraints
COMMENT ON TABLE public.chart_accounts IS 'Plano de contas com hierarquia limitada a 4 níveis e código único por empresa';
COMMENT ON COLUMN public.chart_accounts.codigo IS 'Código único da conta dentro da empresa (formato: 1, 1.1, 1.1.1, 1.1.1.1)';
COMMENT ON COLUMN public.chart_accounts.parent_id IS 'Referência à conta pai na hierarquia (máximo 4 níveis)';
