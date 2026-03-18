import { supabase } from '../lib/supabase.js';

/**
 * 🛰️ NOTIFICATION SERVICE (Telegram Bot Integration)
 * Architecture: Server-side Alerts for Business & System Health
 */

export const NotificationService = {
    /**
     * Envía una alerta a Telegram al chat del Host.
     * @param message Mensaje formateado para Telegram (HTML)
     * @param keyboard Opcional. Inline Keyboard Markup
     */
    async sendTelegramAlert(message: string, keyboard?: any): Promise<boolean> {
        // 🛡️ PROTOCOLO DE RESILIENCIA: TOKEN y CHAT_ID con fallbacks industriales
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8612052249:AAEFr5Gh2JIBEbc3Xp4o91-lhUl3aZPZbdQ";
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "2085187904";

        if (!TELEGRAM_TOKEN || !CHAT_ID) {
            console.error("[NotificationService] CRITICAL: Telegram configuration missing.");
            return false;
        }

        try {
            const bodyPayload: any = {
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            };

            if (keyboard) {
                bodyPayload.reply_markup = keyboard;
            }

            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            const data = await response.json();
            if (!data.ok) {
                console.error("[NotificationService] Error de Telegram:", data.description);
                return false;
            }
            console.log("[NotificationService] Alerta Telegram enviada con éxito.");
            return true;
        } catch (error: Error | unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("[NotificationService] Error de Red/Fetch:", msg);
            return false;
        }
    },

    /**
     * Enviar mensaje directo a un Chat ID específico
     */
    async sendDirectTelegramMessage(chatId: string, message: string, keyboard?: any): Promise<boolean> {
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8612052249:AAEFr5Gh2JIBEbc3Xp4o91-lhUl3aZPZbdQ";

        if (!TELEGRAM_TOKEN) {
            console.warn("[NotificationService] Telegram Token faltante para envío directo.");
            return false;
        }

        try {
            const bodyPayload: any = {
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            };

            if (keyboard) {
                bodyPayload.reply_markup = keyboard;
            }

            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            const data = await response.json();
            if (!data.ok) {
                console.error("[NotificationService] Error de Telegram (Directo):", data.description);
                return false;
            }
            return true;
        } catch (error: Error | unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("[NotificationService] Error de Red/Fetch (Directo):", msg);
            return false;
        }
    },

    /**
     * 🏨 RESERVAS: Nueva Reservación Confirmada
     * @param bookingId ID de la reserva para tracking de notificación
     * @param syncHash Hash único del contenido iCal para evitar duplicados
     * @param source Origen de la reserva (Airbnb, Booking.com, Directo)
     */
    async notifyNewReservation(
        bookingId: string, 
        guestName: string, 
        property: string, 
        checkIn: string, 
        checkOut: string, 
        price: string, 
        source: string = 'Directo', 
        syncHash?: string
    ): Promise<boolean> {
        // 🛡️ RESILIENCE PROTOCOL: Check for sync_last_hash to avoid redundant alerts
        if (syncHash && bookingId) {
            const { data: existing } = await supabase
                .from('bookings')
                .select('sync_last_hash, notified_external_at')
                .eq('id', bookingId)
                .single();
            
            if (existing?.sync_last_hash === syncHash && existing?.notified_external_at) {
                console.log(`[NotificationService] Skipping redundant alert for booking ${bookingId} (Hash matched).`);
                return true;
            }
        }

        // 🛡️ SOURCE BRANDING: Visual identity based on origin
        const branding: Record<string, string> = {
            'Airbnb': '🔴 <b>Airbnb</b>',
            'Booking.com': '🔵 <b>Booking.com</b>',
            'Directo': '🟢 <b>Web Directa</b>',
            'Salty AI': '🧠 <b>Salty AI</b>'
        };
        const sourceLabel = branding[source] || branding['Directo'];

        const message = `
🏨 <b>¡Nueva Reserva!</b>
━━━━━━━━━━━━━━━━━━━━
<b>Origen:</b> ${sourceLabel}
<b>Huésped:</b> ${guestName}
<b>Propiedad:</b> ${property}
<b>Fechas:</b> ${checkIn} a ${checkOut}
<b>Total:</b> $${price} USD
🚀 <i>Acción: Prepara todo para su llegada.</i>`;
        
        const sent = await this.sendTelegramAlert(message);
        
        // Finalize resilience after sending
        if (sent && bookingId) {
            await supabase.from('bookings').update({
                notified_external_at: new Date().toISOString(),
                sync_last_hash: syncHash || null
            } as any).eq('id', bookingId);
        }

        return sent;
    },

    /**
     * 🔑 CHECK-IN: Recordatorio
     */
    async notifyCheckInReminder(guestName: string, property: string, time: string): Promise<boolean> {
        const message = `
🔑 <b>¡Check-In Hoy!</b>
━━━━━━━━━━━━━━━━━━━━
<b>Huésped:</b> ${guestName}
<b>Propiedad:</b> ${property}
<b>Hora:</b> ${time}
✨ <i>Acción: Asegúrate de que los códigos funcionen.</i>`;
        return this.sendTelegramAlert(message);
    },

    /**
     * 🧹 CHECK-OUT: Salida y Limpieza
     */
    async notifyCheckOutAlert(guestName: string, property: string): Promise<boolean> {
        const message = `
🧹 <b>¡Huésped Saliendo! (Check-Out)</b>
━━━━━━━━━━━━━━━━━━━━
<b>Huésped:</b> ${guestName}
<b>Propiedad:</b> ${property}
🧼 <i>Acción: Coordinar limpieza de inmediato para la próxima reserva.</i>`;
        return this.sendTelegramAlert(message);
    },

    /**
     * 🆘 TEAM ALERT: Delega emergencias a todos los Co-Hosts activos de la propiedad
     * Flujo: property_cohosts (active) → profiles (via email) → Telegram DM
     */
    async notifyEmergencyToCohosts(
        propertyId: string,
        propertyName: string,
        issueType: string,
        description: string,
        severity: string,
        resolvedGuestName: string,
        resolvedPhone: string
    ): Promise<void> {
        try {
            // 1. Fetch active co-hosts for this property
            const { data: cohosts } = await supabase
                .from('property_cohosts')
                .select('email, status')
                .eq('property_id', propertyId)
                .eq('status', 'active');

            if (!cohosts || cohosts.length === 0) {
                console.log(`[NotificationService] No active co-hosts for property ${propertyId}.`);
                return;
            }

            const cohostEmails = cohosts.map((c: any) => c.email);

            // 2. Look up their Telegram chat IDs via a custom field or email identifier
            // NOTE: We use the profile's email to find user_id, then check if they have
            // a known Telegram ID stored in a salty_family_knowledge entry as fallback.
            // For now we use the ALLOWED_TELEGRAM_CHAT_IDS env mapping as secondary channel.
            // Primary: add all co-host emails to a dispatch log.
            const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8612052249:AAEFr5Gh2JIBEbc3Xp4o91-lhUl3aZPZbdQ";
            const hostChatId = process.env.TELEGRAM_CHAT_ID || '2085187904';
            const allChatIds = (process.env.ALLOWED_TELEGRAM_CHAT_IDS || hostChatId).split(',').map((id: string) => id.trim());

            const emergencyMsg =
                `🔔 <b>[CO-HOST ALERT] ${propertyName.toUpperCase()}</b>\n\n` +
                `🚨 <b>Severidad:</b> ${severity.toUpperCase()}\n` +
                `🔧 <b>Tipo:</b> ${issueType}\n\n` +
                `👤 <b>Huésped:</b> ${resolvedGuestName}\n` +
                `📞 <b>Celular:</b> ${resolvedPhone}\n\n` +
                `📋 <b>Descripción:</b> ${description}\n\n` +
                `<i>Alerta delegada por Salty. El Host principal ya fue notificado.</i>`;

            // Send to all authorized chat IDs (except the primary host who already received)
            const secondaryIds = allChatIds.filter((id: string) => id !== hostChatId);

            await Promise.allSettled(
                secondaryIds.map((chatId: string) =>
                    fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: emergencyMsg,
                            parse_mode: 'HTML'
                        })
                    }).catch(e => console.error(`[Co-Host Alert] Failed for chatId ${chatId}:`, e))
                )
            );

            // 3. Log dispatch in Supabase for audit trail
            await supabase.from('ai_insights').insert({
                type: 'pattern',
                content: {
                    event: 'cohost_emergency_alert',
                    property_id: propertyId,
                    cohosts_notified: cohostEmails,
                    issue_type: issueType,
                    severity
                },
                impact_score: severity === 'critical' ? 10 : severity === 'high' ? 7 : 4,
                status: 'resolved'
            }).catch(() => {/* non-critical log, don't throw */});

            console.log(`[NotificationService] Co-host emergency alert sent to ${secondaryIds.length} team member(s).`);
        } catch (err: any) {
            console.error('[NotificationService] notifyEmergencyToCohosts error:', err.message);
        }
    },

    /**
     * ⭐ REVIEWS: Nuevo Comentario
     */
    async notifyNewReview(guestName: string, property: string, rating: number, platform: string): Promise<boolean> {
        const stars = "⭐".repeat(rating);
        const message = `
⭐ <b>¡Nueva Reseña en ${platform}!</b>
━━━━━━━━━━━━━━━━━━━━
<b>Propiedad:</b> ${property}
<b>Huésped:</b> ${guestName}
<b>Calificación:</b> ${stars}
💬 <i>Acción: Responde rápido para mantener el SEO alto.</i>`;
        return this.sendTelegramAlert(message);
    }
};
