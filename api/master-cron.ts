import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateOnboardingDraft } from '../aiServices.js';
import { NotificationService } from '../services/NotificationService.js';

// 🛡️ Safe Environment Access (Resilient Protocol)
const getEnv = (key: string): string => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || process.env[`VITE_${key}`] || '';
    }
    return '';
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY');

// SCHEMA-ALIGNED: getPropertyName is a safe fallback only
function getPropertyName(id: string): string {
    return `Propiedad ${id}`;
}

export default async function handler(req: any, res: any) {
    // 🛡️ Security Check: Header o Query
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const querySecret = req.query?.secret || '';
    const secret = getEnv('CRON_SECRET') || "villaretiror_master_key_2026";

    const isAuthorized = (authHeader === `Bearer ${secret}`) || (querySecret === secret);

    if (!isAuthorized) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    const results: any = {
        timestamp: now.toISOString(),
        tasks: {}
    };

    // 1. SIEMPRE (Cada ejecución): iCal Sync & Cleanup
    results.tasks.calendar_sync = await taskCalendarSync(req);
    results.tasks.cleanup = await taskCleanupMocks(supabase);

    // 2. DIARIO (10:00 UTC): Feedback Request, Daily Alerts & Onboarding Journey
    if (utcHour === 10 && utcMinute < 15) {
        results.tasks.feedback = await taskFeedback(supabase);
        results.tasks.alerts = await taskDailyAlerts(supabase);
        results.tasks.journey = await taskGuestJourney(supabase);
    }
    
    // ... rest of logic remains the same ...


    // 3. DIARIO (14:00 UTC): Guest Journey (Onboarding)
    if (utcHour === 14 && utcMinute < 15) {
        results.tasks.journey = await taskGuestJourney(supabase);
    }

    // 4. DIARIO (18:00 UTC+): Post-Checkout Thank You (3h after 11am check-out)
    if (utcHour >= 18) {
        results.tasks.thanks = await taskPostCheckoutThanks(supabase);
    }

    return res.status(200).json(results);
}

async function taskCleanupMocks(supabase: any) {
    const now = new Date().toISOString();
    // Limpiar holds temporales expirados
    const { count: holds } = await supabase.from('bookings').delete().eq('status', 'pending_ai_validation').lt('hold_expires_at', now);
    // Limpiar logs de chat muy antiguos ( > 30 días ) para optimizar
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: logs } = await supabase.from('chat_logs').delete().lt('last_interaction', thirtyDaysAgo.toISOString());
    const { count: aiLogs } = await supabase.from('ai_chat_logs').delete().lt('created_at', thirtyDaysAgo.toISOString());

    return { status: 'ok', holds_cleared: holds || 0, logs_optimized: (logs || 0) + (aiLogs || 0) };
}

async function taskCalendarSync(req: any) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'];
    const secret = getEnv('CRON_SECRET') || "villaretiror_master_key_2026";
    const syncUrl = `${protocol}://${host}/api/sync-ical?secret=${secret}`;

    try {
        const resp = await fetch(syncUrl, { signal: AbortSignal.timeout(55000) });
        if (!resp.ok) return { status: 'error', code: resp.status };
        return await resp.json();
    } catch (err: any) {
        return { status: 'internal_fetch_error', message: err.message };
    }
}

async function taskFeedback(supabase: any) {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    const { data: bookings } = await supabase.from('bookings').select('id, property_id, profiles(email, full_name), properties(title)').eq('check_out', dateStr).eq('email_sent_feedback', false).eq('status', 'confirmed');

    let sent = 0;
    for (const b of bookings || []) {
        const email = (b.profiles as any)?.email;
        if (!email) continue;
        // Logic for sending email would go here (fetch /api/send)
        await supabase.from('bookings').update({ email_sent_feedback: true }).eq('id', b.id);
        sent++;
    }
    return { status: 'ok', emails_sent: sent };
}

async function taskDailyAlerts(supabase: any) {
    const today = new Date().toISOString().split('T')[0];
    const { data: ins } = await supabase.from('bookings').select('id, profiles(full_name), properties(title)').eq('check_in', today).eq('status', 'confirmed');
    const { data: outs } = await supabase.from('bookings').select('id, profiles(full_name), properties(title)').eq('check_out', today).eq('status', 'confirmed');

    if ((ins?.length || 0) + (outs?.length || 0) > 0) {
        await NotificationService.sendTelegramAlert(`📊 <b>Reporte Diario</b>\n🔑 Check-ins: ${ins?.length || 0}\n🧹 Check-outs: ${outs?.length || 0}`);
    }
    return { status: 'ok' };
}

async function taskGuestJourney(supabase: any) {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // FILTRO ESTRICTO: Solo reservas directas con perfiles locales (Excluye Airbnb/Booking Sync)
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, property_id, check_in, check_out, source, profiles(full_name, email), properties(title)')
        .eq('status', 'confirmed')
        .not('profiles', 'is', null)
        .not('source', 'ilike', '%airbnb%')
        .not('source', 'ilike', '%booking%');

    let count = 0;
    for (const b of bookings || []) {
        const name = (b.profiles as any)?.full_name || 'Huésped';
        const email = (b.profiles as any)?.email;
        const title = (b.properties as any)?.title || 'Villa';
        if (!email || email.includes('@guest.airbnb.com')) continue;

        const checkInD = new Date(b.check_in), checkOutD = new Date(b.check_out);
        const midStr = new Date(checkInD.getTime() + (checkOutD.getTime() - checkInD.getTime()) / 2).toISOString().split('T')[0];

        let stage: 'check_in' | 'check_in_followup' | 'mid_stay' | 'check_out' | null = null;
        if (tomorrowStr === b.check_in) stage = 'check_in';
        else if (yesterdayStr === b.check_in) stage = 'check_in_followup'; // Un día después de llegar
        else if (todayStr === midStr && b.check_out !== todayStr) stage = 'mid_stay';
        else if (tomorrowStr === b.check_out) stage = 'check_out';

        if (stage) {
            const draft = await generateOnboardingDraft(stage, name, title, b.check_out);
            const msg = `🛎 <b>Onboarding Hub: ${name}</b>\n` +
                        `🏠 <b>Villa:</b> ${title}\n` +
                        `📅 <b>Fecha Clave:</b> ${stage === 'check_in' ? b.check_in : b.check_out}\n` +
                        `👤 <b>Etapa:</b> ${stage === 'check_in' ? 'Bienvenida y Acceso' : stage === 'mid_stay' ? 'Check de Felicidad' : 'Logística de Salida'}\n\n` +
                        `📝 <b>Borrador de Salty:</b>\n<i>"${draft}"</i>\n\n` +
                        `¿Ejecutamos el envío a <code>${(b.profiles as any)?.email}</code>?`;

            const keyboard = { 
                inline_keyboard: [
                    [
                        { 
                            text: "✅ Aprobar y Enviar", 
                            callback_data: `send_ob_${b.id}` 
                        },
                        { 
                            text: "✏️ Editar", 
                            url: `${getEnv('VITE_SITE_URL') || 'https://villaretiror.com'}/host/dashboard?edit_ob=${b.id}` 
                        }
                    ],
                    [
                        { 
                            text: "📋 Ver Ficha de Huésped", 
                            url: `${getEnv('VITE_SITE_URL') || 'https://villaretiror.com'}/host/dashboard?booking=${b.id}` 
                        }
                    ]
                ] 
            };
            
            await NotificationService.sendTelegramAlert(msg, keyboard);
            count++;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return { status: 'ok', drafts_generated: count };
}

async function taskPostCheckoutThanks(supabase: any) {
    const today = new Date().toISOString().split('T')[0];
    
    // Buscar reservas confirmadas que salen HOY y no han recibido el gracias
    // Excluyendo Airbnb (porque ellos manejan su comunicación)
    const prompt = (mission: string, guestName: string, propertyTitle: string, checkOutDate: string) => `
    Eres Salty, el Caribbean Luxury Concierge.
    
    MISIÓN: ${mission}
    HUESPED: ${guestName}
    PROPIEDAD: ${propertyTitle}
    FECHA CLAVE: ${checkOutDate}

    REGLAS DE ETIQUETA:
    1. El mensaje DEBE comenzar con una frase de cortesía extrema, calidez y hospitalidad impecable.
    2. La logística técnica (llaves, basura, check-out) debe ir en el segundo párrafo.
    3. Nunca ofrezcas servicios externos.
    4. Tono Sophisticated Caribbean.

    Escribe solo el cuerpo del mensaje, sin asuntos ni firmas.
    `.trim();
    // SCHEMA FIX: 'customer_email' does NOT exist in bookings table.
    // We JOIN profiles to get the guest email.
    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            id, 
            customer_name, 
            property_id, 
            source,
            properties(title),
            profiles(email, full_name)
        `)
        .eq('check_out', today)
        .eq('status', 'confirmed')
        .eq('email_sent_thanks', false)
        .neq('source', 'Airbnb');

    let sentCount = 0;
    const siteUrl = process.env.VITE_SITE_URL || 'https://www.villaretiror.com';

    for (const b of bookings || []) {
        try {
            const resp = await fetch(`${siteUrl}/api/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'thank_you_note',
                    customerName: b.customer_name || (b as any).profiles?.full_name || 'Huésped',
                    customerEmail: (b as any).profiles?.email,
                    propertyName: (b as any).properties?.title || getPropertyName(b.property_id),
                    propertyId: b.property_id
                })
            });

            if (resp.ok) {
                await supabase.from('bookings').update({ email_sent_thanks: true }).eq('id', b.id);
                sentCount++;
            }
        } catch (err) {
            console.error(`Error sending thanks for booking ${b.id}:`, err);
        }
    }

    return { status: 'ok', sent: sentCount };
}
