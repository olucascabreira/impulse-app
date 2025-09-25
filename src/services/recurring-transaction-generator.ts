import { RecurringTransaction } from '@/hooks/use-recurring-transactions';
import { Transaction } from '@/hooks/use-transactions';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPaymentMethod } from '@/utils/financial';

/**
 * Generates actual transactions from recurring transaction templates
 * This function should be called periodically to create scheduled transactions
 */
export async function generateTransactionsFromRecurring() {
  try {
    // Get all active recurring transactions
    const { data: recurringTransactions, error: recurringError } = await supabase
      .from('recurring_transactions')
      .select(`
        *,
        chart_accounts(nome),
        bank_accounts!bank_account_id(bank_name, account_number),
        contacts(name)
      `)
      .is('end_date', null) // Active recurring transactions without end date
      .or('end_date.gte.now()') // Or with end date that is future
      .gte('start_date', new Date().toISOString().split('T')[0]); // That have started

    if (recurringError) {
      console.error('Error fetching recurring transactions:', recurringError);
      return { error: recurringError };
    }

    if (!recurringTransactions || recurringTransactions.length === 0) {
      console.log('No active recurring transactions found');
      return { success: true, generated: 0 };
    }

    let generatedCount = 0;

    // Process each recurring transaction
    for (const recurring of recurringTransactions) {
      const generated = await generateSingleRecurringTransaction(recurring);
      generatedCount += generated;
    }

    return { success: true, generated: generatedCount };
  } catch (error) {
    console.error('Error generating transactions from recurring:', error);
    return { error };
  }
}

/**
 * Generates transactions for a single recurring transaction template up to the current date
 */
async function generateSingleRecurringTransaction(recurring: any) {
  let generatedCount = 0;
  
  try {
    // Determine the last generated date or use start date
    const lastGeneratedDate = recurring.last_generated_date 
      ? new Date(recurring.last_generated_date) 
      : new Date(recurring.start_date);
    
    // If the last generated date is in the future, use the start date
    const referenceDate = lastGeneratedDate > new Date() ? new Date(recurring.start_date) : lastGeneratedDate;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Normalize current date
    
    // Calculate next occurrence date based on frequency and interval
    let nextDate = getNextOccurrence(referenceDate, recurring.frequency, recurring.interval);
    
    // Generate transactions until we reach the current date
    while (nextDate <= currentDate) {
      // Check if the recurring transaction has an end date and if we've passed it
      if (recurring.end_date && nextDate > new Date(recurring.end_date)) {
        break;
      }
      
      // Check if transaction already exists for this date with the same description and amount
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('description', recurring.description)
        .eq('amount', recurring.amount)
        .eq('due_date', nextDate.toISOString().split('T')[0])
        .eq('company_id', recurring.company_id) // Only check within same company
        .limit(1)
        .single();
      
      if (!existingTransaction) {
        // Create the transaction
        const transactionToCreate = {
          company_id: recurring.company_id,
          chart_account_id: recurring.chart_account_id,
          bank_account_id: recurring.bank_account_id,
          contact_id: recurring.contact_id,
          transaction_type: recurring.transaction_type,
          description: recurring.description,
          amount: recurring.amount,
          due_date: nextDate.toISOString().split('T')[0],
          status: recurring.transaction_type === 'transferencia' ? 'pago' : 'pendente', // Default to pending, transferencias to pago
          payment_method: recurring.payment_method || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        const { data: insertedTransaction, error: transactionError } = await supabase
          .from('transactions')
          .insert([transactionToCreate])
          .select()
          .single();
        
        if (transactionError) {
          console.error(`Error creating transaction for recurring transaction ${recurring.id}:`, transactionError);
        } else {
          generatedCount++;
        }
      }
      
      // Calculate next occurrence
      nextDate = getNextOccurrence(nextDate, recurring.frequency, recurring.interval);
    }
    
    // Update the last generated date in the recurring transaction
    const { error: updateError } = await supabase
      .from('recurring_transactions')
      .update({ last_generated_date: currentDate.toISOString().split('T')[0] })
      .eq('id', recurring.id);
    
    if (updateError) {
      console.error(`Error updating last generated date for recurring transaction ${recurring.id}:`, updateError);
    }
    
    return generatedCount;
  } catch (error) {
    console.error(`Error processing recurring transaction ${recurring.id}:`, error);
    return 0;
  }
}

/**
 * Calculates the next occurrence date based on frequency and interval
 */
function getNextOccurrence(date: Date, frequency: string, interval: number): Date {
  const nextDate = new Date(date);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      break;
    case 'monthly':
      // Handle monthly with proper day preservation
      const originalDay = nextDate.getDate();
      nextDate.setMonth(nextDate.getMonth() + interval);
      // Adjust date if the month doesn't have the original day
      if (nextDate.getDate() !== originalDay && originalDay > 28) {
        // If the original day doesn't exist in the target month, set to last day of that month
        nextDate.setDate(0);
      }
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + (3 * interval));
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    default:
      // Default to monthly
      nextDate.setMonth(nextDate.getMonth() + interval);
  }
  
  // Normalize the time to beginning of day
  nextDate.setHours(0, 0, 0, 0);
  
  return nextDate;
}

/**
 * Generates transactions for a specific recurring transaction to a given date
 */
export async function generateTransactionForRecurring(recurringId: string, upToDate?: Date) {
  try {
    const { data: recurring, error: recurringError } = await supabase
      .from('recurring_transactions')
      .select(`
        *,
        chart_accounts(nome),
        bank_accounts!bank_account_id(bank_name, account_number),
        contacts(name)
      `)
      .eq('id', recurringId)
      .single();
    
    if (recurringError) {
      console.error('Error fetching recurring transaction:', recurringError);
      return { error: recurringError };
    }
    
    if (!recurring) {
      return { error: new Error('Recurring transaction not found') };
    }
    
    const result = await generateSingleRecurringTransaction(recurring);
    
    return { success: true, generated: result };
  } catch (error) {
    console.error('Error generating transaction for recurring:', error);
    return { error };
  }
}

/**
 * Function to be called periodically (e.g., via a scheduled job) to generate recurring transactions
 */
export async function processRecurringTransactions() {
  console.log('Starting recurring transaction processing...');
  
  try {
    const result = await generateTransactionsFromRecurring();
    
    if (result.error) {
      console.error('Error processing recurring transactions:', result.error);
      return { success: false, error: result.error };
    }
    
    console.log(`Successfully processed recurring transactions. Generated ${result.generated} transactions.`);
    return { success: true, generated: result.generated };
  } catch (error) {
    console.error('Unexpected error during recurring transaction processing:', error);
    return { success: false, error };
  }
}