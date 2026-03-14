import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '../services/NotificationService.js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const today = new Date().toISOString().split('T')[0];

        // Find bookings checking in today
        const { data: checkIns, error: errCheckIn } = await supabase
            .from('bookings')
            .select(`
                id,
                property_id,
                check_in,
                profiles (full_name),
                properties (title)
            `)
            .eq('check_in', today)
            .eq('status', 'confirmed');

        if (errCheckIn) throw errCheckIn;

        for (const booking of checkIns || []) {
            const guestName = (booking.profiles as any)?.full_name || 'Huésped';
            const propertyTitle = (booking.properties as any)?.title || 'Villa';
            await NotificationService.notifyCheckInReminder(guestName, propertyTitle, '15:00 (Check-In)');
        }

        // Find bookings checking out today
        const { data: checkOuts, error: errCheckOut } = await supabase
            .from('bookings')
            .select(`
                id,
                property_id,
                check_out,
                profiles (full_name),
                properties (title)
            `)
            .eq('check_out', today)
            .eq('status', 'confirmed');

        if (errCheckOut) throw errCheckOut;

        for (const booking of checkOuts || []) {
            const guestName = (booking.profiles as any)?.full_name || 'Huésped';
            const propertyTitle = (booking.properties as any)?.title || 'Villa';
            await NotificationService.notifyCheckOutAlert(guestName, propertyTitle);
        }

        return new Response(JSON.stringify({
            success: true,
            checkInsProcessed: checkIns?.length || 0,
            checkOutsProcessed: checkOuts?.length || 0
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Daily Alerts Cron Error]:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
