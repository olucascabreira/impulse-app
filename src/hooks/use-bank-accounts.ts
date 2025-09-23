import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BankAccount {
  id: string;
  company_id: string;
  bank_name?: string;
  agency?: string;
  account_number?: string;
  initial_balance: number;
  current_balance: number;
  account_type?: string;
  created_at: string;
  updated_at: string;
}

export function useBankAccounts(companyId?: string) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      fetchBankAccounts();
    }
  }, [companyId]);

  const fetchBankAccounts = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bank accounts:', error);
        toast({
          title: "Erro ao carregar contas bancárias",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setBankAccounts(data || []);
      }
    } catch (error) {
      console.error('Error in fetchBankAccounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBankAccount = async (accountData: Omit<BankAccount, 'id' | 'current_balance' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return { error: new Error('Company ID required') };

    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          ...accountData,
          company_id: companyId,
          current_balance: accountData.initial_balance,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao criar conta bancária",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setBankAccounts(prev => [data, ...prev]);
      toast({
        title: "Conta bancária criada!",
        description: "Conta bancária criada com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error creating bank account:', error);
      return { error };
    }
  };

  const updateBankAccount = async (id: string, updates: Partial<BankAccount>) => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao atualizar conta bancária",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setBankAccounts(prev => prev.map(acc => acc.id === id ? data : acc));
      toast({
        title: "Conta bancária atualizada!",
        description: "Dados da conta atualizados com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error updating bank account:', error);
      return { error };
    }
  };

  const deleteBankAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao deletar conta bancária",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setBankAccounts(prev => prev.filter(acc => acc.id !== id));
      toast({
        title: "Conta bancária deletada!",
        description: "Conta bancária removida com sucesso.",
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting bank account:', error);
      return { error };
    }
  };

  return {
    bankAccounts,
    loading,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    refreshBankAccounts: fetchBankAccounts,
  };
}