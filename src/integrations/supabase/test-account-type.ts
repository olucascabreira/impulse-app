// Test file to verify that account_type field is recognized
import type { Tables } from '@/integrations/supabase/types';

// This should not produce any TypeScript errors
const testBankAccount: Tables<'bank_accounts'> = {
  id: 'test-id',
  company_id: 'test-company-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  bank_name: 'Test Bank',
  agency: '1234',
  account_number: '56789',
  initial_balance: 1000,
  current_balance: 1000,
  account_type: 'checking' // This field should now be recognized
};

console.log('TypeScript compilation successful! account_type field is properly recognized.');
console.log('Test bank account:', testBankAccount);