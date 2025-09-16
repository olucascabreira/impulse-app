-- Criar enum para perfis de usuário
CREATE TYPE public.user_profile AS ENUM ('admin', 'financeiro', 'visualizacao');

-- Criar enum para tipos de conta
CREATE TYPE public.account_type AS ENUM ('receita', 'despesa');

-- Criar enum para tipos de lançamento
CREATE TYPE public.transaction_type AS ENUM ('entrada', 'saida');

-- Criar enum para status de lançamentos
CREATE TYPE public.transaction_status AS ENUM ('pendente', 'pago', 'recebido', 'cancelado');

-- Criar enum para tipos de contato
CREATE TYPE public.contact_type AS ENUM ('cliente', 'fornecedor');

-- Tabela de perfis de usuário (vinculada ao auth.users do Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    perfil user_profile NOT NULL DEFAULT 'visualizacao',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Tabela de empresas
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    user_admin_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de usuários da empresa (relacionamento many-to-many)
CREATE TABLE public.company_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    perfil user_profile NOT NULL DEFAULT 'visualizacao',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, user_id)
);

-- Plano de contas
CREATE TABLE public.chart_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    tipo account_type NOT NULL,
    parent_id UUID REFERENCES public.chart_accounts(id),
    codigo VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contas bancárias
CREATE TABLE public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    banco VARCHAR(100),
    agencia VARCHAR(20),
    numero_conta VARCHAR(20),
    saldo_inicial NUMERIC(12,2) DEFAULT 0,
    saldo_atual NUMERIC(12,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contatos (clientes e fornecedores)
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    tipo contact_type NOT NULL,
    email VARCHAR(150),
    telefone VARCHAR(50),
    cpf_cnpj VARCHAR(20),
    endereco TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lançamentos financeiros
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    chart_account_id UUID NOT NULL REFERENCES public.chart_accounts(id),
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    contact_id UUID REFERENCES public.contacts(id),
    tipo transaction_type NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status transaction_status DEFAULT 'pendente',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies para companies
CREATE POLICY "Users can view companies they belong to" ON public.companies
    FOR SELECT USING (
        auth.uid() = user_admin_id OR 
        EXISTS (SELECT 1 FROM public.company_users WHERE company_id = companies.id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage their companies" ON public.companies
    FOR ALL USING (auth.uid() = user_admin_id);

-- RLS Policies para company_users
CREATE POLICY "Users can view company relationships" ON public.company_users
    FOR SELECT USING (
        user_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_admin_id = auth.uid())
    );

CREATE POLICY "Company admins can manage users" ON public.company_users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_admin_id = auth.uid())
    );

-- RLS Policies para demais tabelas (baseadas na empresa)
CREATE POLICY "Users can access company chart accounts" ON public.chart_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE company_id = chart_accounts.company_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.companies 
            WHERE id = chart_accounts.company_id AND user_admin_id = auth.uid()
        )
    );

CREATE POLICY "Users can access company bank accounts" ON public.bank_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE company_id = bank_accounts.company_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.companies 
            WHERE id = bank_accounts.company_id AND user_admin_id = auth.uid()
        )
    );

CREATE POLICY "Users can access company contacts" ON public.contacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE company_id = contacts.company_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.companies 
            WHERE id = contacts.company_id AND user_admin_id = auth.uid()
        )
    );

CREATE POLICY "Users can access company transactions" ON public.transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE company_id = transactions.company_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.companies 
            WHERE id = transactions.company_id AND user_admin_id = auth.uid()
        )
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Adicionar triggers para todas as tabelas
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chart_accounts_updated_at BEFORE UPDATE ON public.chart_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, nome, perfil)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'admin'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Inserir dados iniciais do plano de contas padrão
INSERT INTO public.chart_accounts (id, company_id, nome, tipo, codigo) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Receitas', 'receita', '3.0'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Receitas Operacionais', 'receita', '3.1'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Vendas de Produtos', 'receita', '3.1.1'),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Prestação de Serviços', 'receita', '3.1.2'),
    ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Despesas', 'despesa', '4.0'),
    ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'Despesas Operacionais', 'despesa', '4.1'),
    ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'Salários e Encargos', 'despesa', '4.1.1'),
    ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'Aluguel', 'despesa', '4.1.2'),
    ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'Fornecedores', 'despesa', '4.1.3')
ON CONFLICT (id) DO NOTHING;