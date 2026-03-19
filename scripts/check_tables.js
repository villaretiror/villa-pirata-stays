import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_tables_info');
  if (error) {
    // If RPC fails, try a raw query
    const { data: rawData, error: rawError } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
    if (rawError) {
      console.error(rawError);
    } else {
      console.log(JSON.stringify(rawData, null, 2));
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
