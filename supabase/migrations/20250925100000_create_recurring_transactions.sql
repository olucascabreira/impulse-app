-- Recurring transactions table
-- Note: Using VARCHAR with CHECK constraint instead of enum to avoid dependency issues
CREATE TABLE public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    chart_account_id UUID REFERENCES public.chart_accounts(id),
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    contact_id UUID REFERENCES public.contacts(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('entrada', 'saida', 'transferencia')),
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'transferido', 'cancelado')),
    payment_method VARCHAR(50),
    recurrence_type VARCHAR(10) DEFAULT 'fixed' CHECK (recurrence_type IN ('fixed', 'variable')),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    interval INTEGER DEFAULT 1, -- How often to repeat (e.g., every 2 weeks, every 3 months)
    start_date DATE NOT NULL,
    end_date DATE, -- Optional end date for the recurrence
    occurrences INTEGER, -- Optional number of occurrences
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_generated_date DATE -- Track when the last transaction was generated
);

-- Enable Row Level Security
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for recurring_transactions (based on company access)
CREATE POLICY "Users can access company recurring transactions" ON public.recurring_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE company_id = recurring_transactions.company_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.companies 
            WHERE id = recurring_transactions.company_id AND user_admin_id = auth.uid()
        )
    );

-- Trigger to update updated_at
CREATE TRIGGER update_recurring_transactions_updated_at 
    BEFORE UPDATE ON public.recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create an index for better performance when querying recurring transactions
CREATE INDEX idx_recurring_transactions_company_id ON public.recurring_transactions(company_id);
CREATE INDEX idx_recurring_transactions_frequency ON public.recurring_transactions(frequency);
-- Note: Removed the problematic index with non-immutable function in predicate
-- For active recurring transactions, consider using a materialized view or application-level filtering