import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '../services/NotificationService.js';

export const config = {
    runtime: 'edge',
};

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
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
                last_notification_sent,
                profiles (full_name),
                properties (title)
            `)
            .eq('check_in', today)
            .eq('status', 'confirmed');

        if (errCheckIn) throw errCheckIn;

        // Find bookings checking out today
        const { data: checkOuts, error: errCheckOut } = await supabase
            .from('bookings')
            .select(`
                id,
                property_id,
                check_out,
                last_notification_sent,
                profiles (full_name),
                properties (title)
            `)
            .eq('check_out', today)
            .eq('status', 'confirmed');

        if (errCheckOut) throw errCheckOut;

        const allAlerts = [
            ...(checkIns || []).map(b => ({ ...b, type: 'checkin' })),
            ...(checkOuts || []).map(b => ({ ...b, type: 'checkout' }))
        ];

        let processedCount = 0;

        for (let i = 0; i < allAlerts.length; i++) {
            const booking = allAlerts[i];

            try {
                // Rate Limiter: Process sequentially, pause every 5 alerts to respect Telegram limits
                if (i > 0 && i % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                const lastSentDate = booking.last_notification_sent ? String(booking.last_notification_sent).split('T')[0] : null;
                if (lastSentDate === today) continue; // Idempotency check

                const guestName = (booking.profiles as { full_name?: string })?.full_name || 'Huésped';
                const propertyTitle = (booking.properties as { title?: string })?.title || 'Villa';

                let success = false;
                if (booking.type === 'checkin') {
                    success = await NotificationService.notifyCheckInReminder(guestName, propertyTitle, '15:00 (Check-In)');
                } else {
                    success = await NotificationService.notifyCheckOutAlert(guestName, propertyTitle);
                }

                if (success) {
                    const { error: updateErr } = await supabase
                        .from('bookings')
                        .update({ last_notification_sent: new Date().toISOString() })
                        .eq('id', booking.id);

                    if (updateErr) {
                        console.error(`[DB Update Error] Booking ID ${booking.id}: ${updateErr.message}`);
                    } else {
                        processedCount++;
                    }
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[Alert Error] Booking ID ${booking.id}: ${msg}`);
                // Silent failure for single item to allow batch to continue
            }
        }

        return new Response(JSON.stringify({
            success: true,
            processedCount,
            totalAlertsAnalyzed: allAlerts.length
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: Error | unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Daily Alerts Cron Error]:', msg);
        return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
