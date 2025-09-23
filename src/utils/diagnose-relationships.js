#!/usr/bin/env node

// Diagnostic script to check for multiple relationships between transactions and bank_accounts
// Run this to identify the exact nature of the relationship ambiguity

import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ohfwpvptkokcdomiqucx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.error('Set it with a valid service key to run this diagnostic');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnoseRelationships() {
  console.log('🔍 Diagnosing relationships between transactions and bank_accounts...\n');
  
  try {
    // 1. Check foreign key constraints
    console.log('1. Checking foreign key constraints...');
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('get_foreign_keys_info', {
        source_table: 'transactions',
        target_table: 'bank_accounts'
      });
    
    if (constraintsError && constraintsError.message.includes('function "get_foreign_keys_info" does not exist')) {
      // Fallback to manual check
      console.log('   Using fallback method to check constraints...');
      
      // Check if we can query the information schema directly
      const { data: fkInfo, error: fkError } = await supabase
        .from('information_schema.table_constraints')
        .select(\`
          constraint_name,
          constraint_type
        \`)
        .eq('table_name', 'transactions')
        .eq('constraint_type', 'FOREIGN KEY');
      
      if (fkError) {
        console.error('❌ Error checking foreign keys:', fkError.message);
      } else {
        console.log(\`   Found \${fkInfo?.length || 0} foreign key constraints on transactions table\`);
        if (fkInfo) {
          fkInfo.forEach(constraint => {
            console.log(\`   - \${constraint.constraint_name} (\${constraint.constraint_type})\`);
          });
        }
      }
    } else if (constraintsError) {
      console.error('❌ Error calling RPC function:', constraintsError.message);
    } else {
      console.log(\`   Found \${constraints?.length || 0} relationships:\`);
      constraints?.forEach(rel => {
        console.log(\`   - \${rel.constraint_name}: \${rel.column_name} → \${rel.foreign_table}.\${rel.foreign_column}\`);
      });
    }
    
    // 2. Check columns that reference bank_accounts
    console.log('\n2. Checking columns that reference bank_accounts...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'transactions')
      .ilike('column_name', '%account%')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError.message);
    } else {
      console.log(\`   Found \${columns?.length || 0} account-related columns:\`);
      columns?.forEach(col => {
        console.log(\`   - \${col.column_name} (\${col.data_type}, \${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})\`);
      });
    }
    
    // 3. Test simple query without embedding
    console.log('\n3. Testing simple transaction query...');
    const { data: simpleData, error: simpleError } = await supabase
      .from('transactions')
      .select('id, description, amount, transaction_type')
      .limit(3);
    
    if (simpleError) {
      console.error('❌ Error in simple query:', simpleError.message);
    } else {
      console.log(\`   ✅ Simple query works, found \${simpleData?.length || 0} records\`);
    }
    
    // 4. Test query with specific relationship specification
    console.log('\n4. Testing query with explicit relationship specification...');
    try {
      const { data: explicitData, error: explicitError } = await supabase
        .from('transactions')
        .select(\`
          id,
          description,
          amount,
          transaction_type,
          bank_accounts!transactions_bank_account_id_fkey(bank_name, account_number)
        \`)
        .limit(1);
      
      if (explicitError) {
        console.log('   ❌ Explicit relationship query failed:', explicitError.message);
        console.log('   This confirms there are multiple relationships causing ambiguity');
      } else {
        console.log('   ✅ Explicit relationship query works');
      }
    } catch (embedError) {
      console.log('   ❌ Embedding test failed - confirms multiple relationships');
      console.log('   Error:', embedError.message);
    }
    
    console.log('\n✅ Diagnosis complete!');
    console.log('\n🔧 To fix this issue:');
    console.log('1. Identify which foreign key constraint is correct for bank_account_id');
    console.log('2. Drop incorrect foreign key constraints');
    console.log('3. Or update your queries to specify the exact relationship');
    
  } catch (error) {
    console.error('💥 Unexpected error during diagnosis:', error.message);
  }
}

// Run the diagnosis
diagnoseRelationships();