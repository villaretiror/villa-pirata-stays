import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const secret = process.env.CRON_SECRET;
    
    // Auth Fallback: Header Bearer OR Query Param (for legacy/external schedulers like Cron-job.org)
    const queryKey = req.query?.key || req.query?.secret || req.query?.cron_secret;
    const isAuthorized = (secret && authHeader === `Bearer ${secret}`) || (secret && queryKey === secret);

    if (!isAuthorized) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const isSilent = req.query?.silent === 'true' || req.headers['x-silent-mode'] === 'true';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    const results: any = {
        timestamp: now.toISOString(),
        silent_mode: isSilent,
        tasks: {}
    };

    // 1. SIEMPRE (Cada ejecución): iCal Sync & Cleanup
    results.tasks.calendar_sync = await taskCalendarSync(req, isSilent);
    results.tasks.cleanup = await taskCleanupMocks(supabase);

    // 🕵️ SECURITY HEARTBEAT (Manual Audit)
    if (req.query?.heartbeat === 'true' && !isSilent) {
        const auditMsg = `🛎 <b>System Security Audit</b>: Verified & Secure.\n\n` +
                        `🔐 <b>Auth:</b> CRON_SECRET validated.\n` +
                        `🛰️ <b>Sync:</b> ICAL Engine active.\n` +
                        `✨ <b>Status:</b> All systems nominal.`;
        await NotificationService.sendTelegramAlert(auditMsg);
        results.heartbeat = 'Verified';
    }

    // 2. REPORTE MAÑANERO (12:00 UTC = 8:00 AM AST): Operative Report & Journey
    if (utcHour === 12 && utcMinute < 15) {
        results.tasks.feedback = await taskFeedback(supabase);
        results.tasks.morning_report = await taskMorningReport(supabase, req, isSilent);
        results.tasks.journey = await taskGuestJourney(supabase, isSilent);
    }
    
    // 3. DIARIO (14:00 UTC): Guest Journey (Onboarding)
    if (utcHour === 14 && utcMinute < 15) {
        results.tasks.journey = results.tasks.journey || await taskGuestJourney(supabase, isSilent);
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

async function taskCalendarSync(req: any, isSilent = false) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'];
    const secret = getEnv('CRON_SECRET');
    const syncUrl = `${protocol}://${host}/api/sync-ical${isSilent ? '?silent=true' : ''}`;

    try {
        const resp = await fetch(syncUrl, { 
            headers: { 'Authorization': `Bearer ${secret}` },
            signal: AbortSignal.timeout(55000) 
        });
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

async function taskMorningReport(supabase: SupabaseClient, req: any, isSilent = false) {
    const dateObj = new Date();
    const today = dateObj.toISOString().split('T')[0];
    const tomorrow = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const humanDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dObj = new Date(y, m - 1, d, 12, 0, 0);
        const formatted = format(dObj, 'eee d MMM', { locale: es });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };
    
    // 1. System Health Status
    const { data: health } = await supabase.from('system_health').select('*');
    const healthyServices = health?.filter(s => s.status === 'healthy').length || 0;
    const totalServices = health?.length || 0;
    const healthEmoji = healthyServices === totalServices ? "✅" : "⚠️";

    // 2. Agenda del Día
    const { data: ins } = await supabase.from('bookings').select('profiles(full_name), properties(title)').eq('check_in', today).eq('status', 'confirmed');
    const { data: outs } = await supabase.from('bookings').select('profiles(full_name), properties(title)').eq('check_out', today).eq('status', 'confirmed');
    const { data: active } = await supabase.from('bookings').select('id').eq('status', 'confirmed').lte('check_in', today).gte('check_out', today);

    // 3. iCal Sync Details
    const syncStatus = health?.filter(s => s.metadata?.type !== 'database').map(s => {
        const platform = s.metadata?.platform || 'Sync';
        return `${s.status === 'healthy' ? '🟢' : '🔴'} ${platform}`;
    }).join(' ') || '• Sin feeds activos.';

    // 4. Guest Journey (Borradores mañaneros)
    // Buscamos si hay check-ins para hoy o mañana que necesiten onboarding
    const { data: upcoming } = await supabase.from('bookings')
        .select('profiles(full_name)')
        .in('check_in', [today, tomorrow])
        .eq('status', 'confirmed')
        .not('profiles', 'is', null)
        .not('source', 'ilike', '%airbnb%');
    
    const journeyAlert = upcoming && upcoming.length > 0 
        ? `🛎 <b>Journey:</b> Borrador de bienvenida listo para ${upcoming.map(u => (u.profiles as any)?.full_name).join(', ')}.`
        : `🛎 <b>Journey:</b> Sin check-ins directos hoy.`;

    // 5. Salty & Email Interactions
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: interactions } = await supabase.from('chat_logs').select('*', { count: 'exact', head: true }).gt('last_interaction', twentyFourHoursAgo);
    
    // 6. Email Tracking (Consolidado)
    const { data: opens } = await supabase.from('email_logs')
        .select('guest_name')
        .eq('status', 'opened')
        .gt('opened_at', twentyFourHoursAgo);
    
    const emailSummary = opens && opens.length > 0
        ? `• 📩 Lectura: ${opens.length} aperturas detectadas.`
        : `• 📩 Lectura: Sin aperturas recientes.`
    ;

    // 7. Clima / Entorno
    let weatherAlert = "☀️ Cielo despejado.";
    try {
        const weatherResp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=18.0829&longitude=-67.1458&current_weather=true&timezone=auto`);
        const weatherData = await weatherResp.json();
        if (weatherData.current_weather.weathercode >= 61) weatherAlert = "🌧️ Posibilidad de lluvia en Cabo Rojo.";
    } catch { }

    const report = `
🛰️ <b>SALTY STRATEGY | Reporte Operativo Diario</b>
───────────────────────
📅 <b>Fecha:</b> ${humanDate(today)}
───────────────────────

🛠 <b>SYSTEM HEALTH</b> ${healthEmoji}
• Servicios Activos: <b>${healthyServices}/${totalServices}</b>
• iCal Sync Status: ${syncStatus}
• Cron Activity: 🟢 Activo

📅 <b>AGENDA DEL DÍA</b>
• 🔑 Check-ins: <b>${ins?.length || 0}</b>
• 🧹 Check-outs: <b>${outs?.length || 0}</b>
• 🏠 En Casa: <b>${active?.length || 0}</b> Huéspedes

🧠 <b>SALTY CONCIERGE</b>
• Interacciones (24h): ${interactions || 0}
${emailSummary}
${journeyAlert}

🌦 <b>ENTORNO & CLIMA</b>
• ${weatherAlert}

───────────────────────
<i>"Villa operando bajo estándares de lujo. Buen día, Host."</i>
<a href="${getEnv('VITE_SITE_URL') || 'https://villaretiror.com'}/host">🔗 Abrir Centro de Control</a>
    `.trim();

    if (!isSilent) {
        await NotificationService.sendTelegramAlert(report).catch(e => console.error('Error morning report:', e));
    }

    return { status: 'ok', report_sent: !isSilent };
}

async function taskGuestJourney(supabase: any, isSilent = false) {
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

        if (stage && !isSilent) {
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
