import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.storage.from('properties').list();
  if (error) {
    console.error("Error listing files:", error);
    return;
  }
  const imgFiles = data.filter(f => f.name.startsWith('IMG_'));
  const allFiles = data.filter(f => f.name !== '.emptyFolderPlaceholder');
  console.log(`Found ${imgFiles.length} IMG_ files remaining.`);
  console.log(`Total active files in 'properties': ${allFiles.length}`);
}

check();
