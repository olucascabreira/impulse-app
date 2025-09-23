import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Transaction {
  id: string;
  company_id: string;
  chart_account_id?: string;
  bank_account_id?: string;
  contact_id?: string;
  transaction_type: 'entrada' | 'saida' | 'transferencia';
  description: string;
  amount: number;
  due_date?: string;
  payment_date?: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'transferido';
  payment_method?: string;
  created_at: string;
  updated_at: string;
  // For transfers, we might need a destination account
  destination_account_id?: string;
  // Relations
  chart_accounts?: { nome: string };
  bank_accounts?: { bank_name?: string; account_number?: string };
  contacts?: { name: string };
  destination_account?: { bank_name?: string; account_number?: string };
}

export function useTransactions(companyId?: string, startDate?: Date, endDate?: Date) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      fetchTransactions();
    }
  }, [companyId, startDate, endDate]);

  const fetchTransactions = async () => {
    if (!companyId) return;

    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          chart_accounts(nome),
          bank_accounts!bank_account_id(bank_name, account_number),
          contacts(name)
        `)
        .eq('company_id', companyId);
        
      // Add date range filtering if provided
      if (startDate && endDate) {
        // Format dates to ISO string for comparison
        const startISO = startDate.toISOString();
        const endISO = new Date(endDate);
        endISO.setDate(endDate.getDate() + 1); // Include the end date
        const endISOStr = endISO.toISOString();
        
        query = query.gte('created_at', startISO).lt('created_at', endISOStr);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        toast({
          title: "Erro ao carregar lançamentos",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setTransactions((data as Transaction[]) || []);
      }
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch transactions for a specific date range (used for charts)
  const fetchTransactionsForRange = async (start: Date, end: Date) => {
    if (!companyId) return [];

    try {
      const endWithDay = new Date(end);
      endWithDay.setDate(end.getDate() + 1); // Include the end date
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          chart_accounts(nome),
          bank_accounts!bank_account_id(bank_name, account_number),
          contacts(name)
        `)
        .eq('company_id', companyId)
        .gte('created_at', start.toISOString())
        .lt('created_at', endWithDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions for range:', error);
        toast({
          title: "Erro ao carregar lançamentos",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
      
      return (data as Transaction[]) || [];
    } catch (error) {
      console.error('Error in fetchTransactionsForRange:', error);
      return [];
    }
  };

  const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'chart_accounts' | 'bank_accounts' | 'contacts' | 'destination_account'>) => {
    if (!companyId) return { error: new Error('Company ID required') };

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          company_id: companyId,
        })
        .select(`
          *,
          chart_accounts(nome),
          bank_accounts!bank_account_id(bank_name, account_number),
          contacts(name)
        `)
        .single();

      if (error) {
        toast({
          title: "Erro ao criar lançamento",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setTransactions(prev => [data as Transaction, ...prev]);
      toast({
        title: "Lançamento criado!",
        description: "Lançamento financeiro criado com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return { error };
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          chart_accounts(nome),
          bank_accounts!bank_account_id(bank_name, account_number),
          contacts(name)
        `)
        .single();

      if (error) {
        toast({
          title: "Erro ao atualizar lançamento",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setTransactions(prev => prev.map(trans => trans.id === id ? data as Transaction : trans));
      toast({
        title: "Lançamento atualizado!",
        description: "Dados do lançamento atualizados com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return { error };
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao deletar lançamento",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setTransactions(prev => prev.filter(trans => trans.id !== id));
      toast({
        title: "Lançamento deletado!",
        description: "Lançamento removido com sucesso.",
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return { error };
    }
  };

  const markAsPaid = async (id: string, paymentDate: string = new Date().toISOString().split('T')[0]) => {
    return updateTransaction(id, { 
      status: 'pago', 
      payment_date: paymentDate 
    });
  };

  return {
    transactions,
    loading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    markAsPaid,
    refreshTransactions: fetchTransactions,
  };
}