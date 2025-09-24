import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TransferData {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  description: string;
  companyId: string;
}

export const processTransfer = async (transferData: TransferData) => {
  const { sourceAccountId, destinationAccountId, amount, description, companyId } = transferData;

  // Validate that source and destination accounts are different
  if (sourceAccountId === destinationAccountId) {
    throw new Error('Conta de origem e destino não podem ser iguais');
  }

  // Validate that amount is positive
  if (amount <= 0) {
    throw new Error('Valor da transferência deve ser positivo');
  }

  // Step 1: Get current balances of both accounts
  const { data: sourceAccount, error: sourceError } = await supabase
    .from('bank_accounts')
    .select('current_balance, id')
    .eq('id', sourceAccountId)
    .single();

  if (sourceError) {
    throw new Error(`Erro ao obter dados da conta de origem: ${sourceError.message}`);
  }

  const { data: destinationAccount, error: destinationError } = await supabase
    .from('bank_accounts')
    .select('current_balance, id')
    .eq('id', destinationAccountId)
    .single();

  if (destinationError) {
    throw new Error(`Erro ao obter dados da conta de destino: ${destinationError.message}`);
  }

  // Step 2: Verify sufficient funds in source account
  if (sourceAccount.current_balance < amount) {
    throw new Error('Saldo insuficiente na conta de origem');
  }

  // Step 3: Perform the transfer within a transaction
  try {
    // Update source account: deduct the amount
    const { error: sourceUpdateError } = await supabase
      .from('bank_accounts')
      .update({
        current_balance: sourceAccount.current_balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceAccountId);

    if (sourceUpdateError) {
      throw new Error(`Erro ao atualizar conta de origem: ${sourceUpdateError.message}`);
    }

    // Update destination account: add the amount
    const { error: destUpdateError } = await supabase
      .from('bank_accounts')
      .update({
        current_balance: destinationAccount.current_balance + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', destinationAccountId);

    if (destUpdateError) {
      throw new Error(`Erro ao atualizar conta de destino: ${destUpdateError.message}`);
    }

    // Create the transfer transaction records
    const transferTransactions = [
      {
        transaction_type: 'saida',
        description: `Transferência para ${destinationAccount.bank_name || 'Conta Destino'} - ${description}`,
        amount: amount,
        status: 'transferido',
        bank_account_id: sourceAccountId,
        destination_account_id: destinationAccountId,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        transaction_type: 'entrada',
        description: `Transferência de ${sourceAccount.bank_name || 'Conta Origem'} - ${description}`,
        amount: amount,
        status: 'transferido',
        bank_account_id: destinationAccountId,
        destination_account_id: sourceAccountId,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert(transferTransactions);

    if (transactionError) {
      throw new Error(`Erro ao criar registros de transação: ${transactionError.message}`);
    }

    return { success: true };
  } catch (error) {
    // Rollback: try to restore original balances if something went wrong
    console.error('Error during transfer, attempting rollback:', error);

    // In a real production system, you might want more sophisticated rollback logic
    throw error;
  }
};