const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllFiles() {
    console.log("🔍 Listing all files in 'villas' bucket...");
    const { data: rootFiles, error: rootError } = await supabase.storage.from('villas').list('', { limit: 100 });
    if (rootError) throw rootError;
    
    console.log("Root files:", rootFiles.map(f => f.name));
    
    for (const folder of rootFiles.filter(f => !f.id)) {
        const { data: subFiles } = await supabase.storage.from('villas').list(folder.name);
        console.log(`Folder [${folder.name}]:`, subFiles.map(f => f.name));
    }
}

listAllFiles().catch(err => console.error("!!! ERROR:", err.message));
