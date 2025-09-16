-- Remove the problematic default chart accounts data insertion
-- This will be handled through the UI when companies are created

-- Let's add some useful functions for the system

-- Function to get user's current company
CREATE OR REPLACE FUNCTION public.get_user_current_company(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID AS $$
DECLARE
    company_uuid UUID;
BEGIN
    -- First try to get company where user is admin
    SELECT id INTO company_uuid
    FROM public.companies
    WHERE user_admin_id = user_uuid
    LIMIT 1;
    
    -- If not admin of any company, get first company where user is member
    IF company_uuid IS NULL THEN
        SELECT company_id INTO company_uuid
        FROM public.company_users
        WHERE user_id = user_uuid
        LIMIT 1;
    END IF;
    
    RETURN company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create default chart accounts for a company
CREATE OR REPLACE FUNCTION public.create_default_chart_accounts(company_uuid UUID)
RETURNS void AS $$
BEGIN
    -- Insert default chart of accounts structure
    INSERT INTO public.chart_accounts (company_id, nome, tipo, codigo, parent_id) VALUES
        (company_uuid, 'Receitas', 'receita', '3.0', NULL),
        (company_uuid, 'Despesas', 'despesa', '4.0', NULL);
    
    -- Get the IDs of the parent accounts we just created
    WITH parent_accounts AS (
        SELECT id, nome FROM public.chart_accounts 
        WHERE company_id = company_uuid AND parent_id IS NULL
    )
    INSERT INTO public.chart_accounts (company_id, nome, tipo, codigo, parent_id)
    SELECT 
        company_uuid,
        subconta.nome,
        subconta.tipo,
        subconta.codigo,
        parent_accounts.id
    FROM parent_accounts,
    (VALUES 
        ('Receitas Operacionais', 'receita', '3.1'),
        ('Vendas de Produtos', 'receita', '3.1.1'),
        ('Prestação de Serviços', 'receita', '3.1.2'),
        ('Receitas Financeiras', 'receita', '3.2')
    ) AS subconta(nome, tipo, codigo)
    WHERE parent_accounts.nome = 'Receitas'
    
    UNION ALL
    
    SELECT 
        company_uuid,
        subconta.nome,
        subconta.tipo,
        subconta.codigo,
        parent_accounts.id
    FROM parent_accounts,
    (VALUES 
        ('Despesas Operacionais', 'despesa', '4.1'),
        ('Salários e Encargos', 'despesa', '4.1.1'),
        ('Aluguel', 'despesa', '4.1.2'),
        ('Fornecedores', 'despesa', '4.1.3'),
        ('Despesas Financeiras', 'despesa', '4.2')
    ) AS subconta(nome, tipo, codigo)
    WHERE parent_accounts.nome = 'Despesas';
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;