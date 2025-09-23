-- Complete financial system schema
-- Base tables first

-- Companies table
CREATE TABLE public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    user_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    perfil VARCHAR(50) NOT NULL CHECK (perfil IN ('admin', 'financeiro', 'visualizacao')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Company users junction table
CREATE TABLE public.company_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, user_id)
);

-- Chart of accounts table
CREATE TABLE public.chart_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    codigo VARCHAR(20),
    parent_id UUID REFERENCES public.chart_accounts(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bank accounts table
CREATE TABLE public.bank_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_name VARCHAR(100),
    agency VARCHAR(20),
    account_number VARCHAR(20),
    initial_balance NUMERIC(12,2) DEFAULT 0,
    current_balance NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contacts table (customers and suppliers)
CREATE TABLE public.contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('cliente', 'fornecedor')),
    email VARCHAR(150),
    phone VARCHAR(50),
    document VARCHAR(20), -- CPF/CNPJ
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Financial transactions table
CREATE TABLE public.transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    chart_account_id UUID REFERENCES public.chart_accounts(id),
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    contact_id UUID REFERENCES public.contacts(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('entrada', 'saida')),
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    due_date DATE,
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'recebido', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_companies_user_admin_id ON public.companies(user_admin_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX idx_chart_accounts_company_id ON public.chart_accounts(company_id);
CREATE INDEX idx_bank_accounts_company_id ON public.bank_accounts(company_id);
CREATE INDEX idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_due_date ON public.transactions(due_date);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_type ON public.contacts(contact_type);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for companies
CREATE POLICY "Users can view their own companies" ON public.companies
FOR SELECT USING (
    user_admin_id = auth.uid() OR
    id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
);

CREATE POLICY "Company admins can manage companies" ON public.companies
FOR ALL USING (user_admin_id = auth.uid());

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS policies for company_users
CREATE POLICY "Users can view company memberships" ON public.company_users
FOR SELECT USING (
    user_id = auth.uid() OR
    company_id IN (SELECT id FROM public.companies WHERE user_admin_id = auth.uid())
);

CREATE POLICY "Company admins can manage memberships" ON public.company_users
FOR ALL USING (
    company_id IN (SELECT id FROM public.companies WHERE user_admin_id = auth.uid())
);

-- RLS policies for chart_accounts
CREATE POLICY "Users can view chart accounts from their company" ON public.chart_accounts
FOR SELECT USING (
    company_id IN (
        SELECT id FROM public.companies WHERE user_admin_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins and financeiro can manage chart accounts" ON public.chart_accounts
FOR ALL USING (
    company_id IN (SELECT id FROM public.companies WHERE user_admin_id = auth.uid())
);

-- RLS policies for bank_accounts
CREATE POLICY "Users can view bank accounts from their company" ON public.bank_accounts
FOR SELECT USING (
    company_id IN (
        SELECT id FROM public.companies WHERE user_admin_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins and financeiro can manage bank accounts" ON public.bank_accounts
FOR ALL USING (
    company_id IN (SELECT id FROM public.companies WHERE user_admin_id = auth.uid())
);

-- RLS policies for transactions
CREATE POLICY "Users can view transactions from their company" ON public.transactions
FOR SELECT USING (
    company_id IN (
        SELECT id FROM public.companies WHERE user_admin_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins and financeiro can manage transactions" ON public.transactions
FOR ALL USING (
    company_id IN (SELECT id FROM public.companies WHERE user_admin_id = auth.uid())
);

-- RLS policies for contacts
CREATE POLICY "Users can view contacts from their company" ON public.contacts
FOR SELECT USING (
    company_id IN (
        SELECT id FROM public.companies WHERE user_admin_id = auth.uid()
        UNION
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins and financeiro can manage contacts" ON public.contacts
FOR ALL USING (
    company_id IN (SELECT id FROM public.companies WHERE user_admin_id = auth.uid())
);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chart_accounts_updated_at
    BEFORE UPDATE ON public.chart_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update bank account balance
CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS TRIGGER AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for bank balance updates
CREATE TRIGGER update_bank_balance_on_transaction_update
    AFTER UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_account_balance();

CREATE TRIGGER update_bank_balance_on_transaction_insert
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_account_balance();

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_current_company(user_uuid uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
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
$;

CREATE OR REPLACE FUNCTION public.create_default_chart_accounts(company_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
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
$;