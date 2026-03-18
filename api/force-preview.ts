import { createClient } from '@supabase/supabase-js';
import { CalendarSyncService } from '../services/CalendarSyncService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: any, res: any) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const result = await CalendarSyncService.syncAll(supabase);
    return res.status(200).json(result);
}
