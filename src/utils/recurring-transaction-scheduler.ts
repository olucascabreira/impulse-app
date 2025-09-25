/**
 * Utility script to handle scheduled generation of recurring transactions
 * This can be run periodically via a cron job or serverless function
 */

import { processRecurringTransactions } from '@/services/recurring-transaction-generator';

/**
 * Runs the recurring transaction generation process
 * This function can be called by a scheduler (like Node-cron) or serverless function
 */
export async function runRecurringTransactionScheduler() {
  console.log(`[${new Date().toISOString()}] Starting recurring transaction scheduler...`);
  
  try {
    const result = await processRecurringTransactions();
    
    if (result.success) {
      console.log(`[${new Date().toISOString()}] Recurring transaction scheduler completed successfully. Generated ${result.generated} transactions.`);
    } else {
      console.error(`[${new Date().toISOString()}] Recurring transaction scheduler failed:`, result.error);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error in recurring transaction scheduler:`, error);
  }
}

// If running this file directly, execute the scheduler
if (typeof require !== 'undefined' && require.main === module) {
  runRecurringTransactionScheduler();
}