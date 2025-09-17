import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  contact_type: 'cliente' | 'fornecedor';
  email?: string;
  phone?: string;
  document?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export function useContacts(companyId?: string) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      fetchContacts();
    }
  }, [companyId]);

  const fetchContacts = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching contacts:', error);
        toast({
          title: "Erro ao carregar contatos",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setContacts((data as Contact[]) || []);
      }
    } catch (error) {
      console.error('Error in fetchContacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createContact = async (contactData: Omit<Contact, 'id' | 'created_at' | 'updated_at'>) => {
    if (!companyId) return { error: new Error('Company ID required') };

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          ...contactData,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao criar contato",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setContacts(prev => [...prev, data as Contact].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: "Contato criado!",
        description: "Contato criado com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error creating contact:', error);
      return { error };
    }
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao atualizar contato",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setContacts(prev => prev.map(cont => cont.id === id ? data as Contact : cont).sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: "Contato atualizado!",
        description: "Contato atualizado com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error updating contact:', error);
      return { error };
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao deletar contato",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setContacts(prev => prev.filter(cont => cont.id !== id));
      toast({
        title: "Contato deletado!",
        description: "Contato removido com sucesso.",
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting contact:', error);
      return { error };
    }
  };

  const getClientContacts = () => contacts.filter(c => c.contact_type === 'cliente');
  const getSupplierContacts = () => contacts.filter(c => c.contact_type === 'fornecedor');

  return {
    contacts,
    loading,
    createContact,
    updateContact,
    deleteContact,
    getClientContacts,
    getSupplierContacts,
    refreshContacts: fetchContacts,
  };
}