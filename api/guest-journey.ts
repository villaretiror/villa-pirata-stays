import { createClient } from '@supabase/supabase-js';
import { generateOnboardingDraft } from '../aiServices.js';
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
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // 1. Fetch direct bookings only (exclude platform imports)
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                id,
                property_id,
                check_in,
                check_out,
                profiles (full_name, email),
                properties (title)
            `)
            .eq('status', 'confirmed')
            // Filtrar las reservas de los bloques externos de Airbnb/Booking
            // Si no tenemos payment_method explícito, evitamos las que su status sea external_block
            // ya lo filtramos con eq('status', 'confirmed')
            .neq('payment_method', 'airbnb_sync') // placeholder si existe
            .not('profiles', 'is', null);

        if (error) throw error;

        let processedMid = 0;
        let processedOut = 0;

        for (const booking of bookings || []) {
            const guestName = (booking.profiles as any)?.full_name || 'Huésped';
            const guestEmail = (booking.profiles as any)?.email;
            const propertyTitle = (booking.properties as any)?.title || 'Villa';

            if (!guestEmail || guestEmail.includes('@guest.airbnb.com')) continue; // Filtro de seguridad Airbnb (Vía Directa Only)

            const checkInD = new Date(booking.check_in);
            const checkOutD = new Date(booking.check_out);
            const midDateStr = new Date(checkInD.getTime() + (checkOutD.getTime() - checkInD.getTime()) / 2).toISOString().split('T')[0];

            let stage: 'mid_stay' | 'check_out' | null = null;
            let displayStage = "";

            if (todayStr === midDateStr && booking.check_out !== todayStr) {
                stage = 'mid_stay';
                displayStage = "Día Medio";
            } else if (tomorrowStr === booking.check_out) {
                stage = 'check_out';
                displayStage = "Checkout Mañana";
            }

            if (stage) {
                const draft = await generateOnboardingDraft(stage, guestName, propertyTitle, booking.check_out);

                const messageText = `
🛎 <b>Salty: Revisión de Onboarding</b>
───────────────────────
📅 <b>Etapa:</b> ${displayStage}
🏠 <b>Propiedad:</b> <code>${propertyTitle}</code>
👤 <b>Huésped:</b> ${guestName}
📧 <b>Email:</b> <code>${guestEmail}</code>
───────────────────────

<b>PREVISUALIZACIÓN DEL MENSAJE:</b>
<i>"${draft}"</i>

───────────────────────
¿Autorizas el envío de este borrador vía <b>Resend</b>?`;

                // Botón de Telegram
                const keyboard = {
                    inline_keyboard: [
                        [{ text: "✅ Aprobar y Enviar", callback_data: `send_ob_${booking.id}` }],
                        [{ text: "✏️ Editar en Dashboard", url: `${process.env.VITE_SITE_URL || 'https://villaretiror.com'}/host/dashboard` }]
                    ]
                };

                await NotificationService.sendTelegramAlert(messageText, keyboard);

                if (stage === 'mid_stay') processedMid++;
                if (stage === 'check_out') processedOut++;

                // Sleep 2s to respect rate limits
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        return new Response(JSON.stringify({
            success: true,
            processedMidStay: processedMid,
            processedCheckOuts: processedOut
        }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: Error | unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Guest Journey Cron Error]:', msg);
        return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
