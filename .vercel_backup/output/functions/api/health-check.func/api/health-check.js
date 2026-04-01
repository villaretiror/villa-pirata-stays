import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
/**
 * 🛰️ SYSTEM HEALTH CHECK (Server-Side)
 * Valida la conectividad con Supabase y el estado de los servicios.
 * Usado por el SystemHealthIndicator del Dashboard.
 */
export default async function handler(req, res) {
    const startTime = Date.now();
    const results = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: []
    };
    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            throw new Error('Supabase configuration missing');
        }
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        // 1. Check DB Connectivity
        const dbStart = Date.now();
        const { error: dbError } = await supabase.from('properties').select('id').limit(1);
        const dbLatency = Date.now() - dbStart;
        results.services.push({
            name: 'Supabase_DB',
            status: dbError ? 'error' : 'healthy',
            latency: dbLatency,
            details: dbError?.message || 'Stable'
        });
        // 2. Fetch recent sync logs
        const { data: recentSyncs } = await supabase
            .from('cron_heartbeats')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        results.sync_history = recentSyncs;
        // 3. Update system_health table (Proactive Maintenance)
        if (!dbError) {
            await supabase.from('system_health').upsert([
                {
                    service_name: 'Supabase_DB',
                    status: 'healthy',
                    last_check: new Date().toISOString(),
                    latency_ms: dbLatency,
                    metadata: { provider: 'Supabase/Postgres' }
                }
            ], { onConflict: 'service_name' });
        }
        results.total_latency = Date.now() - startTime;
        return res.status(200).json(results);
    }
    catch (err) {
        console.error('[Health Check Failure]:', err.message);
        return res.status(500).json({
            status: 'error',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
}
//# sourceMappingURL=health-check.js.map