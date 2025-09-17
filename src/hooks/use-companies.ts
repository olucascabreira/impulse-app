import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  user_admin_id: string;
  created_at: string;
  updated_at: string;
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching companies:', error);
        toast({
          title: "Erro ao carregar empresas",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setCompanies(data || []);
        if (data && data.length > 0 && !currentCompany) {
          setCurrentCompany(data[0]);
        }
      }
    } catch (error) {
      console.error('Error in fetchCompanies:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData: { name: string; cnpj?: string }) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          ...companyData,
          user_admin_id: user.id,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao criar empresa",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setCompanies(prev => [data, ...prev]);
      if (!currentCompany) {
        setCurrentCompany(data);
      }

      // Create default chart accounts for the new company
      try {
        await supabase.rpc('create_default_chart_accounts', { 
          company_uuid: data.id 
        });
      } catch (chartError) {
        console.error('Error creating default chart accounts:', chartError);
      }

      toast({
        title: "Empresa criada!",
        description: "Empresa criada com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error creating company:', error);
      return { error };
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao atualizar empresa",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setCompanies(prev => prev.map(comp => comp.id === id ? data : comp));
      if (currentCompany?.id === id) {
        setCurrentCompany(data);
      }

      toast({
        title: "Empresa atualizada!",
        description: "Dados da empresa atualizados com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error updating company:', error);
      return { error };
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao deletar empresa",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setCompanies(prev => prev.filter(comp => comp.id !== id));
      if (currentCompany?.id === id) {
        const remaining = companies.filter(comp => comp.id !== id);
        setCurrentCompany(remaining.length > 0 ? remaining[0] : null);
      }

      toast({
        title: "Empresa deletada!",
        description: "Empresa removida com sucesso.",
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting company:', error);
      return { error };
    }
  };

  return {
    companies,
    currentCompany,
    setCurrentCompany,
    loading,
    createCompany,
    updateCompany,
    deleteCompany,
    refreshCompanies: fetchCompanies,
  };
}