const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
  const { data, error } = await supabase.from('sms_logs').select('*').limit(0);
  if (error) {
     console.log('Error querying sms_logs:', error.message);
  } else {
     console.log('sms_logs exists.');
  }
}

listAllTables();
