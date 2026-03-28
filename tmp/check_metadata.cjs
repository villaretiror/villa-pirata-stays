const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProperties() {
  const { data, error } = await supabase
    .from('properties')
    .select('id, title');

  if (error) {
    console.error('Error fetching properties:', error.message);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkProperties();
