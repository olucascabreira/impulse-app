import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChartAccount {
  id: string;
  company_id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  codigo?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  // Relations
  children?: ChartAccount[];
  parent?: ChartAccount;
}

export function useChartAccounts(companyId?: string) {
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      fetchChartAccounts();
    }
  }, [companyId]);

  const fetchChartAccounts = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('chart_accounts')
        .select('*')
        .eq('company_id', companyId)
        .order('codigo', { ascending: true });

      if (error) {
        console.error('Error fetching chart accounts:', error);
        toast({
          title: "Erro ao carregar plano de contas",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setChartAccounts((data as ChartAccount[]) || []);
      }
    } catch (error) {
      console.error('Error in fetchChartAccounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChartAccount = async (accountData: Omit<ChartAccount, 'id' | 'created_at' | 'updated_at' | 'children' | 'parent'>) => {
    if (!companyId) return { error: new Error('Company ID required') };

    try {
      // Certifique-se de que o company_id está correto no objeto de dados
      const insertData = {
        ...accountData,
        company_id: companyId,
      };

      const { data, error } = await supabase
        .from('chart_accounts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        toast({
          title: "Erro ao criar conta",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // Atualize o estado local
      setChartAccounts(prev => {
        const updatedAccounts = [...prev, data as ChartAccount];
        return updatedAccounts.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      });
      
      toast({
        title: "Conta criada!",
        description: "Conta do plano de contas criada com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error creating chart account:', error);
      toast({
        title: "Erro ao criar conta",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return { error };
    }
  };

  const updateChartAccount = async (id: string, updates: Partial<ChartAccount>) => {
    try {
      const { data, error } = await supabase
        .from('chart_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao atualizar conta",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setChartAccounts(prev => prev.map(acc => acc.id === id ? data as ChartAccount : acc));
      toast({
        title: "Conta atualizada!",
        description: "Conta atualizada com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error updating chart account:', error);
      return { error };
    }
  };

  const deleteChartAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chart_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao deletar conta",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setChartAccounts(prev => prev.filter(acc => acc.id !== id));
      toast({
        title: "Conta deletada!",
        description: "Conta removida com sucesso.",
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting chart account:', error);
      return { error };
    }
  };

  const getRevenueAccounts = () => chartAccounts.filter(acc => acc.tipo === 'receita');
  const getExpenseAccounts = () => chartAccounts.filter(acc => acc.tipo === 'despesa');
  const getParentAccounts = () => chartAccounts.filter(acc => !acc.parent_id);
  const getChildAccounts = (parentId: string) => chartAccounts.filter(acc => acc.parent_id === parentId);

  return {
    chartAccounts,
    loading,
    createChartAccount,
    updateChartAccount,
    deleteChartAccount,
    getRevenueAccounts,
    getExpenseAccounts,
    getParentAccounts,
    getChildAccounts,
    refreshChartAccounts: fetchChartAccounts,
  };
}