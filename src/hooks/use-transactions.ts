import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseISO, isBefore } from 'date-fns';

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
  status: 'pendente' | 'pago' | 'recebido' | 'atrasado' | 'cancelado' | 'transferido';
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
          contacts(name),
          destination_account:bank_accounts!destination_account_id(bank_name, account_number)
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

    // For transfer transactions, we need to handle them differently to update account balances
    if (transactionData.transaction_type === 'transferencia' && 
        transactionData.bank_account_id && 
        transactionData.destination_account_id) {
      return createTransferTransaction(transactionData);
    }

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

  // Special function to handle transfer transactions with account balance updates
  const createTransferTransaction = async (transactionData: Omit<Transaction, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'chart_accounts' | 'bank_accounts' | 'contacts' | 'destination_account'>) => {
    if (!companyId) return { error: new Error('Company ID required') };
    if (!transactionData.bank_account_id || !transactionData.destination_account_id) {
      return { error: new Error('Contas de origem e destino são obrigatórias para transferências') };
    }
    if (!transactionData.amount) {
      return { error: new Error('Valor é obrigatório para transferências') };
    }

    try {
      // Get source and destination account information
      const { data: sourceAccount, error: sourceError } = await supabase
        .from('bank_accounts')
        .select('id, current_balance')
        .eq('id', transactionData.bank_account_id)
        .single();

      if (sourceError) {
        return { error: new Error(`Erro ao obter conta de origem: ${sourceError.message}`) };
      }

      const { data: destinationAccount, error: destinationError } = await supabase
        .from('bank_accounts')
        .select('id, current_balance')
        .eq('id', transactionData.destination_account_id)
        .single();

      if (destinationError) {
        return { error: new Error(`Erro ao obter conta de destino: ${destinationError.message}`) };
      }

      // Validate sufficient funds
      if (sourceAccount.current_balance < transactionData.amount) {
        return { error: new Error('Saldo insuficiente na conta de origem') };
      }

      // Update account balances
      const { error: sourceUpdateError } = await supabase
        .from('bank_accounts')
        .update({
          current_balance: sourceAccount.current_balance - transactionData.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionData.bank_account_id);

      if (sourceUpdateError) {
        return { error: new Error(`Erro ao atualizar conta de origem: ${sourceUpdateError.message}`) };
      }

      const { error: destUpdateError } = await supabase
        .from('bank_accounts')
        .update({
          current_balance: destinationAccount.current_balance + transactionData.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionData.destination_account_id);

      if (destUpdateError) {
        // Rollback the source account update if destination update fails
        await supabase
          .from('bank_accounts')
          .update({ current_balance: sourceAccount.current_balance })
          .eq('id', transactionData.bank_account_id);
          
        return { error: new Error(`Erro ao atualizar conta de destino: ${destUpdateError.message}`) };
      }

      // Create the transfer transaction record for the source account (saida)
      const sourceTransaction = {
        ...transactionData,
        transaction_type: 'saida',
        status: 'pago', // Use 'pago' instead of 'transferido' for debit transaction
        destination_account_id: transactionData.destination_account_id,
        company_id: companyId,
      };

      const { data: sourceTxData, error: sourceTxError } = await supabase
        .from('transactions')
        .insert(sourceTransaction)
        .select(`
          *,
          chart_accounts(nome),
          bank_accounts!bank_account_id(bank_name, account_number),
          contacts(name)
        `)
        .single();

      if (sourceTxError) {
        // Rollback the account updates if transaction insertion fails
        await supabase
          .from('bank_accounts')
          .update({
            current_balance: sourceAccount.current_balance,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionData.bank_account_id);

        await supabase
          .from('bank_accounts')
          .update({
            current_balance: destinationAccount.current_balance,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionData.destination_account_id);

        return { error: new Error(`Erro ao criar transação de saída: ${sourceTxError.message}`) };
      }

      // Create the transfer transaction record for the destination account (entrada)
      const destinationTransaction = {
        ...transactionData,
        transaction_type: 'entrada',
        status: 'pago', // Use 'pago' instead of 'transferido' for credit transaction
        bank_account_id: transactionData.destination_account_id,
        destination_account_id: transactionData.bank_account_id,
        company_id: companyId,
      };

      const { data: destTxData, error: destTxError } = await supabase
        .from('transactions')
        .insert(destinationTransaction)
        .select(`
          *,
          chart_accounts(nome),
          bank_accounts!bank_account_id(bank_name, account_number),
          contacts(name)
        `)
        .single();

      if (destTxError) {
        // Rollback the source transaction and account updates if destination transaction insertion fails
        await supabase
          .from('transactions')
          .delete()
          .eq('id', sourceTxData.id);

        await supabase
          .from('bank_accounts')
          .update({
            current_balance: sourceAccount.current_balance,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionData.bank_account_id);

        await supabase
          .from('bank_accounts')
          .update({
            current_balance: destinationAccount.current_balance,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionData.destination_account_id);

        return { error: new Error(`Erro ao criar transação de entrada: ${destTxError.message}`) };
      }

      // Update local state with both transactions
      setTransactions(prev => [sourceTxData as Transaction, destTxData as Transaction, ...prev]);
      
      toast({
        title: "Transferência realizada!",
        description: `Transferência de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactionData.amount)} realizada com sucesso.`,
      });

      return { success: true, sourceData: sourceTxData, destinationData: destTxData };
    } catch (error) {
      console.error('Error creating transfer transaction:', error);
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

  const markAsPaid = async (id: string, transactionType: 'entrada' | 'saida' | 'transferencia', paymentDate: string = new Date().toISOString().split('T')[0]) => {
    // Use appropriate status based on transaction type
    const status = transactionType === 'entrada' ? 'recebido' : 'pago';

    return updateTransaction(id, {
      status,
      payment_date: paymentDate
    });
  };

  // Automatically update overdue transactions
  const updateOverdueTransactions = async () => {
    if (!companyId) return;

    const now = new Date();
    const overdueTransactions = transactions.filter(transaction => {
      if (!transaction.due_date) return false;
      if (transaction.status === 'pago' || transaction.status === 'recebido' || transaction.status === 'cancelado') return false;

      const dueDate = parseISO(transaction.due_date);
      return isBefore(dueDate, now) && transaction.status === 'pendente';
    });

    // Update each overdue transaction
    for (const transaction of overdueTransactions) {
      try {
        await supabase
          .from('transactions')
          .update({ status: 'atrasado' })
          .eq('id', transaction.id);

        // Update local state
        setTransactions(prev =>
          prev.map(t => t.id === transaction.id ? { ...t, status: 'atrasado' as const } : t)
        );
      } catch (error) {
        console.error('Error updating overdue transaction:', error);
      }
    }
  };

  // Run overdue check when transactions change
  useEffect(() => {
    if (!loading && transactions.length > 0) {
      updateOverdueTransactions();
    }
  }, [transactions.length, loading]);

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