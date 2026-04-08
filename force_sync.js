
const { createClient } = require('@supabase/supabase-js');
const { CalendarSyncService } = require('./src/services/CalendarSyncService');
const dotenv = require('dotenv');
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials (SERVICE_ROLE_KEY required for bypass RLS)");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runForceSync() {
    console.log("🔱 INICIANDO SINCRONIZACIÓN DE EMERGENCIA...");
    const result = await CalendarSyncService.syncAll(supabase);
    console.log("-----------------------------------------");
    console.log("RESULTADO:", result.details);
    console.log("TOTAL INSERTADOS:", result.total);
    console.log("🔱 PROCESO COMPLETADO.");
}

runForceSync();
