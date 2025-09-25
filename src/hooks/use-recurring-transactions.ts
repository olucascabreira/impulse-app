import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Transaction } from './use-transactions';

export interface RecurringTransaction {
  id: string;
  company_id: string;
  chart_account_id?: string;
  bank_account_id?: string;
  contact_id?: string;
  transaction_type: 'entrada' | 'saida' | 'transferencia';
  description: string;
  amount: number;
  status?: 'pendente' | 'pago' | 'atrasado' | 'transferido';
  payment_method?: string;
  recurrence_type: 'fixed' | 'variable';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number; // How often to repeat (e.g., every 2 weeks, every 3 months)
  start_date: string; // ISO date string
  end_date?: string; // Optional end date for the recurrence
  occurrences?: number; // Optional number of occurrences
  created_at: string;
  updated_at: string;
  last_generated_date?: string; // Track when the last transaction was generated
  // Relations
  chart_accounts?: { nome: string };
  bank_accounts?: { bank_name?: string; account_number?: string };
  contacts?: { name: string };
}

export interface GenerateTransactionFromRecurring {
  recurringTransaction: RecurringTransaction;
  occurrence: number;
  dueDate: string;
}

export function useRecurringTransactions(companyId?: string) {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      fetchRecurringTransactions();
    }
  }, [companyId]);

  const fetchRecurringTransactions = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select(`
          *,
          chart_accounts(nome),
          bank_accounts!bank_account_id(bank_name, account_number),
          contacts(name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recurring transactions:', error);
        toast({
          title: "Erro ao carregar transações recorrentes",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setRecurringTransactions((data as RecurringTransaction[]) || []);
      }
    } catch (error) {
      console.error('Error in fetchRecurringTransactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRecurringTransaction = async (recurringTransactionData: Omit<RecurringTransaction, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'chart_accounts' | 'bank_accounts' | 'contacts'>) => {
    if (!companyId) return { error: new Error('Company ID required') };

    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert({
          ...recurringTransactionData,
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
          title: "Erro ao criar transação recorrente",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setRecurringTransactions(prev => [data as RecurringTransaction, ...prev]);
      toast({
        title: "Transação recorrente criada!",
        description: "Transação recorrente criada com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      toast({
        title: "Erro ao criar transação recorrente",
        description: "Ocorreu um erro ao criar a transação recorrente.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const updateRecurringTransaction = async (id: string, updates: Partial<RecurringTransaction>) => {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
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
          title: "Erro ao atualizar transação recorrente",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setRecurringTransactions(prev => prev.map(trans => trans.id === id ? data as RecurringTransaction : trans));
      toast({
        title: "Transação recorrente atualizada!",
        description: "Dados da transação recorrente atualizados com sucesso.",
      });

      return { data };
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      return { error };
    }
  };

  const deleteRecurringTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao deletar transação recorrente",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      setRecurringTransactions(prev => prev.filter(trans => trans.id !== id));
      toast({
        title: "Transação recorrente deletada!",
        description: "Transação recorrente removida com sucesso.",
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      return { error };
    }
  };

  // Function to generate actual transactions from a recurring transaction template
  const generateTransactionsFromRecurring = async (
    recurringTransaction: RecurringTransaction,
    startDate?: Date,
    endDate?: Date
  ): Promise<Transaction[]> => {
    try {
      const start = startDate || new Date(recurringTransaction.start_date);
      const end = endDate || new Date(recurringTransaction.end_date || '2099-12-31');
      const generatedTransactions: Transaction[] = [];

      // Calculate next occurrence date based on frequency and interval
      let currentDate = new Date(start);
      let occurrenceCount = 0;
      
      // Limit to prevent infinite loops
      const maxOccurrences = recurringTransaction.occurrences || 100;
      
      while (currentDate <= end && occurrenceCount < maxOccurrences) {
        // Create a transaction for this occurrence
        const newTransaction: Omit<Transaction, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'chart_accounts' | 'bank_accounts' | 'contacts' | 'destination_account'> = {
          transaction_type: recurringTransaction.transaction_type,
          description: recurringTransaction.description,
          amount: recurringTransaction.amount,
          due_date: currentDate.toISOString().split('T')[0],
          status: recurringTransaction.status || 'pendente',
          payment_method: recurringTransaction.payment_method,
          chart_account_id: recurringTransaction.chart_account_id,
          bank_account_id: recurringTransaction.bank_account_id,
          contact_id: recurringTransaction.contact_id,
        };

        // Add to the list of generated transactions
        generatedTransactions.push({
          ...newTransaction,
          id: `temp-${Date.now()}-${occurrenceCount}`, // Temporary ID for UI
          company_id: recurringTransaction.company_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          destination_account_id: undefined, // Will be filled for transfers
        } as Transaction);

        // Calculate next occurrence based on frequency
        switch (recurringTransaction.frequency) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + recurringTransaction.interval);
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + (7 * recurringTransaction.interval));
            break;
          case 'monthly':
            // Handle monthly with proper day preservation
            const originalDay = currentDate.getDate();
            currentDate.setMonth(currentDate.getMonth() + recurringTransaction.interval);
            // Adjust date if the month doesn't have the original day
            if (currentDate.getDate() !== originalDay) {
              currentDate.setDate(0); // Last day of previous month
            }
            break;
          case 'quarterly':
            currentDate.setMonth(currentDate.getMonth() + (3 * recurringTransaction.interval));
            break;
          case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + recurringTransaction.interval);
            break;
          default:
            // Default to monthly
            currentDate.setMonth(currentDate.getMonth() + recurringTransaction.interval);
        }
        
        occurrenceCount++;
      }

      return generatedTransactions;
    } catch (error) {
      console.error('Error generating transactions from recurring:', error);
      return [];
    }
  };

  return {
    recurringTransactions,
    loading,
    createRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    generateTransactionsFromRecurring,
    refreshRecurringTransactions: fetchRecurringTransactions,
  };
}