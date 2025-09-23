#!/usr/bin/env node

// Simple diagnostic script to check if destination_account_id column exists
// Run this to verify the database schema

import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ohfwpvptkokcdomiqucx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZndwdnB0a29rY2RvbWlxdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNTgzNTAsImV4cCI6MjA3MzYzNDM1MH0.503-rrxjIGL8bI6_DFJrzs8iGxGa7AGR0iH2WK6zEDI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseTransactionsTable() {
  console.log('🔍 Diagnosing transactions table structure...\n');
  
  try {
    // 1. Check if destination_account_id column exists
    console.log('1. Checking for destination_account_id column...');
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'transactions')
      .eq('column_name', 'destination_account_id');
    
    if (columnError) {
      console.error('❌ Error checking columns:', columnError.message);
      return;
    }
    
    const hasDestinationAccountColumn = columns && columns.length > 0;
    console.log(hasDestinationAccountColumn 
      ? '✅ destination_account_id column exists' 
      : '❌ destination_account_id column does NOT exist');
    
    // 2. Get all columns in transactions table
    console.log('\n2. Getting all columns in transactions table...');
    const { data: allColumns, error: allColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'transactions')
      .order('ordinal_position');
    
    if (allColumnsError) {
      console.error('❌ Error getting all columns:', allColumnsError.message);
      return;
    }
    
    console.log(`📋 Found ${allColumns.length} columns:`);
    allColumns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
    });
    
    // 3. Try a simple query to test if the table works
    console.log('\n3. Testing simple query...');
    const { data: testData, error: testError } = await supabase
      .from('transactions')
      .select('id, description')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error in simple query:', testError.message);
      return;
    }
    
    console.log(testData && testData.length > 0 
      ? `✅ Simple query works, found ${testData.length} record(s)` 
      : '✅ Simple query works, but no records found');
    
    // 4. Try query with destination_account_id if it exists
    if (hasDestinationAccountColumn) {
      console.log('\n4. Testing query with destination_account_id...');
      const { data: destData, error: destError } = await supabase
        .from('transactions')
        .select('id, description, destination_account_id')
        .limit(1);
      
      if (destError) {
        console.error('❌ Error querying with destination_account_id:', destError.message);
        console.log('💡 This suggests the column exists but there might be a permission or constraint issue');
      } else {
        console.log('✅ Query with destination_account_id works');
      }
    }
    
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('💥 Unexpected error during diagnosis:', error.message);
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('1. Check your database connection credentials');
    console.log('2. Verify you have the necessary permissions');
    console.log('3. Check if the transactions table exists');
  }
}

// Run the diagnosis
diagnoseTransactionsTable();
