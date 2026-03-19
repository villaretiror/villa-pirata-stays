import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../../services/CalendarSyncService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: any, res: any) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed', status: 405 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Missing Supabase credentials', status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    try {
        console.log('[API/CALENDAR/IMPORT] manual trigger from Dashboard...');
        const syncResult = await CalendarSyncService.syncAll(supabase);
        return res.status(200).json({ 
            success: true, 
            totalNewBlocksAdded: syncResult.total, 
            details: syncResult.details 
        });
    } catch (err: any) {
        console.error('[API/CALENDAR/IMPORT] critical failure:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
