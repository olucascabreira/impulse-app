-- Add missing tables for complete financial system

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

-- Add indexes for better performance
CREATE INDEX idx_bank_accounts_company_id ON public.bank_accounts(company_id);
CREATE INDEX idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_due_date ON public.transactions(due_date);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_type ON public.contacts(contact_type);

-- Enable RLS on all tables
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

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
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.company_users cu ON p.user_id = cu.user_id
        WHERE p.user_id = auth.uid() 
        AND cu.company_id = bank_accounts.company_id
        AND p.perfil IN ('admin', 'financeiro')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = bank_accounts.company_id 
        AND c.user_admin_id = auth.uid()
    )
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
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.company_users cu ON p.user_id = cu.user_id
        WHERE p.user_id = auth.uid() 
        AND cu.company_id = transactions.company_id
        AND p.perfil IN ('admin', 'financeiro')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = transactions.company_id 
        AND c.user_admin_id = auth.uid()
    )
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
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.company_users cu ON p.user_id = cu.user_id
        WHERE p.user_id = auth.uid() 
        AND cu.company_id = contacts.company_id
        AND p.perfil IN ('admin', 'financeiro')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = contacts.company_id 
        AND c.user_admin_id = auth.uid()
    )
);

-- Trigger functions for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
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
RETURNS TRIGGER AS $$
BEGIN
    -- Update bank account balance when transaction is paid
    IF NEW.status = 'pago' AND OLD.status != 'pago' AND NEW.bank_account_id IS NOT NULL THEN
        IF NEW.transaction_type = 'entrada' THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.bank_account_id;
        ELSE
            UPDATE public.bank_accounts 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.bank_account_id;
        END IF;
    END IF;
    
    -- Revert balance if transaction is cancelled or unpaid
    IF OLD.status = 'pago' AND NEW.status != 'pago' AND NEW.bank_account_id IS NOT NULL THEN
        IF NEW.transaction_type = 'entrada' THEN
            UPDATE public.bank_accounts 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.bank_account_id;
        ELSE
            UPDATE public.bank_accounts 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.bank_account_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update bank account balance
CREATE TRIGGER update_bank_balance_on_transaction
    AFTER UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_account_balance();