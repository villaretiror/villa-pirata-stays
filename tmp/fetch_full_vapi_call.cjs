const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getFullVapiCall() {
  const { data, error } = await supabase
    .from('vapi_calls')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching vapi_calls:', error.message);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

getFullVapiCall();
