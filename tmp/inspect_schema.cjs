const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
   // List all columns from sms_logs
   const { data, error } = await supabase.from('sms_logs').select('count', { count: 'exact' });
   console.log('sms_logs count:', data, error);
}

inspectSchema();
