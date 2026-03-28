const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase
    .rpc('list_tables_hack'); // If a RPC exists to list tables for non-superusers? Probably not.

  // Let's just try to query all common tables for logs
  const tablesToTry = ['sms_logs', 'email_logs', 'vapi_logs', 'logs', 'system_logs', 'failed_sms'];
  
  for (const table of tablesToTry) {
    const { data: results, error: err } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (err) {
      console.log(`Table ${table} error or not found: ${err.message}`);
    } else {
      console.log(`Table ${table} found with ${results.length} rows.`);
      if (results.length > 0) {
        console.log(JSON.stringify(results[0], null, 2));
      }
    }
  }
}

listTables();
