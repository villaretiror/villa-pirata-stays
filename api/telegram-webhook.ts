import { NotificationService } from '../services/NotificationService.js';
import { supabase } from '../lib/supabase.js';

export const config = {
    runtime: 'edge', // Using Edge Runtime for faster response
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const update = await req.json();

        // Check if it's a message containing text
        if (!update.message || !update.message.text) {
            return new Response('OK - No message to process', { status: 200 });
        }

        const chatId = update.message.chat.id.toString();
        const text = update.message.text.trim();

        // Validar Chat ID (Seguridad)
        // El principal va a ser process.env.TELEGRAM_CHAT_ID (Padre e Hijo en el mismo grupo, o múltiples)
        const allowedIdsStr = process.env.ALLOWED_TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || '2085187904';
        const allowedIds = allowedIdsStr.split(',').map(id => id.trim());

        if (!allowedIds.includes(chatId)) {
            console.warn(`[Telegram Webhook] Mensaje recibido de Chat ID no autorizado: ${chatId}`);
            // Send a warning to the unauthorized user just in case
            await NotificationService.sendDirectTelegramMessage(chatId, "⚠️ *Acceso Denegado*\nEste bot es privado y exclusivo para el equipo administrativo de Villa & Pirata Stays.");
            return new Response('Unauthorized Access', { status: 200 }); // Retornar 200 para que Telegram no reintente
        }

        // Procesar Comando /status
        if (text.startsWith('/status')) {
            await handleStatusCommand(chatId);
        }
        // Si hubiera más comandos, agregarlos aquí.
        else {
            // Ignorar mensajes que no sean comandos para no spamear
        }

        return new Response('OK', { status: 200 });
    } catch (error: any) {
        console.error("[Telegram Webhook] Error interno:", error.message);
        return new Response('Internal Server Error', { status: 500 }); // Podría ser 200 para evitar reintentos, depende
    }
}

async function handleStatusCommand(chatId: string) {
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Obtener Reservas Actuales (Checkins/Checkouts/Activas de Hoy)
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('property_id, check_in, check_out, status')
            .eq('status', 'confirmed')
            .or(`check_in.eq.${today},check_out.eq.${today},and(check_in.lte.${today},check_out.gte.${today})`);

        let checkIns = 0;
        let checkOuts = 0;
        let occupied = 0;

        if (!bookingsError && bookings) {
            for (const b of bookings) {
                if (b.check_in === today) checkIns++;
                if (b.check_out === today) checkOuts++;
                if (b.check_in <= today && b.check_out >= today) occupied++;
            }
        }

        // 2. Obtener Alertas Activas (System Health)
        const { data: health, error: healthError } = await supabase
            .from('system_health')
            .select('status, service')
            .neq('status', 'healthy');

        const pendingAlerts = health ? health.length : 0;
        const alertDetails = pendingAlerts > 0 ? health!.map((h: any) => `• ${h.service}: ${h.status}`).join('\n') : "Ninguna.";

        // 3. Formatear y Enviar Respuesta
        const message = `
📊 <b>Resumen Diario de Villas</b>
📅 ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

🏠 <b>Villas Ocupadas:</b> ${occupied}
🔑 <b>Check-Ins Hoy:</b> ${checkIns}
🧹 <b>Check-Outs Hoy:</b> ${checkOuts}

⚠️ <b>Alertas de Sistema:</b> ${pendingAlerts}
${pendingAlerts > 0 ? alertDetails : '✅ Todo funcionando en orden.'}
`;

        await NotificationService.sendDirectTelegramMessage(chatId, message);
    } catch (err: any) {
        console.error("Error processando comando /status", err);
        await NotificationService.sendDirectTelegramMessage(chatId, "❌ Error obteniendo el reporte de Supabase.");
    }
}
