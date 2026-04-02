import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env vars
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
  console.log('Fetching files in properties/ bucket...');
  const { data, error } = await supabase.storage.from('properties').list();
  
  if (error) {
    console.error("Error listing files:", error);
    return;
  }
  
  const toDelete = data.filter(f => f.name.startsWith('IMG_')).map(f => f.name);
  
  console.log(`Found ${toDelete.length} files to delete (starting with IMG_).`);
  
  if (toDelete.length > 0) {
    const { error: delError } = await supabase.storage.from('properties').remove(toDelete);
    if (delError) {
      console.error("Error deleting files:", delError);
    } else {
      console.log("Deleted successfully.");
    }
  }
}

clean();
