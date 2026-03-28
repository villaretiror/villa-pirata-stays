const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function globalSearch() {
  const tables = ['sms_logs', 'vapi_calls', 'leads', 'email_logs'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(50);
    if (data && data.length > 0) {
      console.log(`--- Records from ${table} ---`);
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

globalSearch();
