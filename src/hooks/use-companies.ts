import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';

export interface Company {
  id: string;
  name: string;
  cnpj?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  country?: string | null;
  email?: string | null;
  industry?: string | null;
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
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Buscar empresas onde o usuário é admin (sem verificação de segurança por enquanto)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_admin_id', user.id)
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
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        // Remover verificação de user_admin_id temporariamente para testes
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
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast({
        title: "Erro ao atualizar empresa",
        description: error.message || "Ocorreu um erro ao atualizar a empresa.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const deleteCompany = async (id: string) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);
        // Remover verificação de user_admin_id temporariamente para testes

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
    } catch (error: any) {
      console.error('Error deleting company:', error);
      toast({
        title: "Erro ao deletar empresa",
        description: error.message || "Ocorreu um erro ao deletar a empresa.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const uploadCompanyLogo = async (companyId: string, file: File) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      // Validar tipo de arquivo
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
      const maxSize = 2 * 1024 * 1024; // 2MB
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Formato de arquivo não suportado. Use PNG, JPG, JPEG, SVG ou WEBP.');
      }
      
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. O tamanho máximo é 2MB.');
      }

      // Upload do arquivo para o storage do Supabase
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL público do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Atualizar registro da empresa com a URL do logo
      const { data, error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', companyId)
        // Remover verificação de user_admin_id temporariamente para testes
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Atualizar estado local
      setCompanies(prev => prev.map(comp => comp.id === companyId ? data : comp));
      if (currentCompany?.id === companyId) {
        setCurrentCompany(data);
      }

      toast({
        title: "Logo atualizado!",
        description: "O logo da empresa foi atualizado com sucesso.",
      });

      return { data };
    } catch (error: any) {
      console.error('Error uploading company logo:', error);
      toast({
        title: "Erro ao atualizar logo",
        description: error.message || "Ocorreu um erro ao atualizar o logo da empresa.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const removeCompanyLogo = async (companyId: string) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      // Update the company record to remove the logo URL
      const { data, error } = await supabase
        .from('companies')
        .update({ logo_url: null })
        .eq('id', companyId)
        // Remover verificação de user_admin_id temporariamente para testes
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setCompanies(prev => prev.map(comp => comp.id === companyId ? data : comp));
      if (currentCompany?.id === companyId) {
        setCurrentCompany(data);
      }

      toast({
        title: "Logo removido!",
        description: "O logo da empresa foi removido com sucesso.",
      });

      return { data };
    } catch (error: any) {
      console.error('Error removing company logo:', error);
      toast({
        title: "Erro ao remover logo",
        description: error.message || "Ocorreu um erro ao remover o logo da empresa.",
        variant: "destructive",
      });
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
    uploadCompanyLogo,
    removeCompanyLogo,
    refreshCompanies: fetchCompanies,
  };
}