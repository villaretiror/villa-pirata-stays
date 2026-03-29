import { supabase } from '../lib/supabase.js';

/**
 * 🛰️ NOTIFICATION SERVICE (Telegram Bot Integration)
 * Architecture: Server-side Alerts for Business & System Health
 */

export const NotificationService = {
    /**
     * Envía una alerta a Telegram al chat del Host.
     */
    async sendTelegramAlert(message: string, keyboard?: any, silent: boolean = false): Promise<boolean> {
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID        = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_TOKEN || !CHAT_ID) {
            console.error("[NotificationService] CRITICAL: Telegram configuration missing.");
            return false;
        }

        try {
            const bodyPayload: any = {
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                disable_notification: silent
            };

            if (keyboard) {
                bodyPayload.reply_markup = keyboard;
                // 📡 DEBUGGING: Log outbound URLs to catch BUTTON_URL_INVALID
                if (keyboard.inline_keyboard) {
                    const urls = keyboard.inline_keyboard.flat().map((b: any) => b?.url).filter(Boolean);
                    if (urls.length > 0) {
                        console.log("[NotificationService] Outbound Telegram URLs:", urls);
                    }
                }
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
    async sendDirectTelegramMessage(chatId: string, message: string, keyboard?: any, silent: boolean = false): Promise<boolean> {
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

        if (!TELEGRAM_TOKEN) {
            console.warn("[NotificationService] Telegram Token faltante para envío directo.");
            return false;
        }

        try {
            const bodyPayload: any = {
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                disable_notification: silent
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

        const branding: Record<string, string> = {
            'Airbnb': '🔴 <b>Airbnb</b>',
            'Booking.com': '🔵 <b>Booking.com</b>',
            'Directo': '🟢 <b>Web Directa</b>',
            'Salty AI': '🧠 <b>Salty AI</b>'
        };
        const sourceLabel = branding[source] || branding['Directo'];

        const message = `
💰 <b>¡Nueva Reserva Confirmada!</b>
━━━━━━━━━━━━━━━━━━━━
<b>Origen:</b> ${sourceLabel}
<b>Huésped:</b> 👤 ${guestName}
<b>Propiedad:</b> 🏠 ${property}
<b>Fechas:</b> 📅 ${checkIn} a ${checkOut}
<b>Total:</b> 💵 $${price} USD

🚀 <i>Salty: Registrado en calendario y base de datos.</i>`;
        
        // 💰 Reservas son High Urgency -> Loud
        const sent = await this.sendTelegramAlert(message, {
            inline_keyboard: [[{ text: "✅ Enterado", callback_data: `ack_booking_${bookingId}` }]]
        }, false);
        
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
🔵 <b>Logística: Check-In Hoy</b>
━━━━━━━━━━━━━━━━━━━━
<b>Huésped:</b> 👤 ${guestName}
<b>Propiedad:</b> 🏠 ${property}
<b>Hora:</b> ⏰ ${time}

✨ <i>Salty: Códigos de acceso verificados y activos.</i>`;
        return this.sendTelegramAlert(message, {
            inline_keyboard: [[{ text: "✅ Enterado", callback_data: `ack_ci` }]]
        }, false);
    },

    /**
     * 🧹 CHECK-OUT: Salida y Limpieza
     */
    async notifyCheckOutAlert(guestName: string, property: string): Promise<boolean> {
        const message = `
🔵 <b>Logística: Check-Out (Salida)</b>
━━━━━━━━━━━━━━━━━━━━
<b>Huésped:</b> 👤 ${guestName}
<b>Propiedad:</b> 🏠 ${property}

🧼 <i>Salty: Coordinando limpieza para el próximo huésped.</i>`;
        return this.sendTelegramAlert(message, {
            inline_keyboard: [[{ text: "✅ Enterado", callback_data: `ack_co` }]]
        }, false);
    },

    /**
     * 🆘 TEAM ALERT: Delega emergencias
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
            const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
            const hostChatId     = process.env.TELEGRAM_CHAT_ID;
            const allChatIds     = (process.env.ALLOWED_TELEGRAM_CHAT_IDS || hostChatId || "").split(',').map((id: string) => id.trim()).filter(Boolean);

            const emergencyMsg =
                `🔴 <b>[CO-HOST ALERT] ${propertyName.toUpperCase()}</b>\n\n` +
                `🚨 <b>Severidad:</b> ${severity.toUpperCase()}\n` +
                `🔧 <b>Tipo:</b> ${issueType}\n\n` +
                `👤 <b>Huésped:</b> ${resolvedGuestName}\n` +
                `📞 <b>Celular:</b> ${resolvedPhone}\n\n` +
                `📋 <b>Descripción:</b> ${description}\n\n` +
                `<i>Alerta delegada por Salty. El Host principal ya fue notificado.</i>`;

            const secondaryIds = allChatIds.filter((id: string) => id !== hostChatId);

            await Promise.allSettled(
                secondaryIds.map((chatId: string) =>
                    fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: emergencyMsg,
                            parse_mode: 'HTML',
                            disable_notification: false // Emergencias son LOUD
                        })
                    }).catch(e => console.error(`[Co-Host Alert] Failed for chatId ${chatId}:`, e))
                )
            );

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
            }).catch(() => {});

        } catch (err: any) {
            console.error('[NotificationService] notifyEmergencyToCohosts error:', err.message);
        }
    },

    /**
     * 🤝 CO-HOSTS: Nueva Invitación Enviada
     */
    async notifyCohostInvitation(email: string, property: string): Promise<boolean> {
        const message = `
🟡 <b>Nueva Invitación de Co-host</b>
━━━━━━━━━━━━━━━━━━━━
<b>Email:</b> ${email}
<b>Propiedad:</b> ${property}
📬 <i>Estatus: Pendiente de aceptación.</i>`;
        return this.sendTelegramAlert(message);
    },

    /**
     * 📝 CO-HOST ACTION: Edición de Propiedad
     */
    async notifyCohostAction(cohostEmail: string, propertyName: string, action: string): Promise<boolean> {
        const message = `
⚪ <b>Acción de Co-host</b>
━━━━━━━━━━━━━━━━━━━━
<b>Anfitrión:</b> ${cohostEmail}
<b>Propiedad:</b> ${propertyName}
<b>Acción:</b> ${action}
✅ <i>Cambio reflejado en Supabase.</i>`;
        return this.sendTelegramAlert(message, undefined, true); // Acciones rutinarias son SILENT
    },

    /**
     * ⭐ REVIEWS: Nuevo Comentario
     */
    async notifyNewReview(guestName: string, property: string, rating: number, platform: string): Promise<boolean> {
        const stars = "⭐".repeat(rating);
        const message = `
🟢 <b>Reputación: Nueva Reseña (${platform})</b>
━━━━━━━━━━━━━━━━━━━━
<b>Propiedad:</b> 🏠 ${property}
<b>Huésped:</b> 👤 ${guestName}
<b>Calificación:</b> ${stars}

💬 <i>Salty: Mejora el SEO respondiendo en el Dashboard.</i>`;
        return this.sendTelegramAlert(message, {
            inline_keyboard: [[{ text: "✅ Enterado", callback_data: "ack_review" }]]
        }, false);
    },

    /**
     * 👥 LEADS: Nuevo Interés en Propiedad
     */
    async notifyNewLead(guestName: string, property: string, checkIn: string, checkOut: string, phone: string): Promise<boolean> {
        const message = `
🟠 <b>Salty: Nuevo Lead Interesado</b>
━━━━━━━━━━━━━━━━━━━━
<b>Huésped:</b> 👤 ${guestName}
<b>Propiedad:</b> 🏠 ${property}
<b>Fechas:</b> 📅 ${checkIn} al ${checkOut}
<b>Teléfono:</b> 📞 ${phone}

🛎️ <i>Estatus: En fase de cotización/intento de reserva.</i>`;
        return this.sendTelegramAlert(message, {
            inline_keyboard: [[{ text: "✅ Enterado", callback_data: "ack_lead" }]]
        }, false);
    },

    /**
     * 💰 ATH MÓVIL: Comprobante Recibido
     */
    async notifyPaymentProof(guestName: string, property: string, proofUrl: string): Promise<boolean> {
        const message = `
🟠 <b>Acción Requerida: Pago ATH Móvil</b>
━━━━━━━━━━━━━━━━━━━━
<b>Huésped:</b> 👤 ${guestName}
<b>Propiedad:</b> 🏠 ${property}
<b>Comprobante:</b> <a href="${proofUrl}">Ver Imagen 🖼️</a>

🔎 <i>Acción: Valida en ATH Móvil y aprueba en el Dashboard.</i>`;
        return this.sendTelegramAlert(message, {
            inline_keyboard: [[{ text: "✅ Enterado", callback_data: "ack_payment" }]]
        }, false);
    },

    /**
     * 🛰️ SYSTEM: Alerta de Error Crítico
     */
    async notifySystemError(context: string, error: string): Promise<boolean> {
        const message = `
🔴 <b>SYSTEM ERROR DETECTED</b>
━━━━━━━━━━━━━━━━━━━━
<b>Contexto:</b> ${context}
<b>Error:</b> <code>${error.slice(0, 100)}</code>
🛠 <i>Acción: Revisa los logs de Vercel de inmediato.</i>`;
        return this.sendTelegramAlert(message, undefined, false); // Errores técnicos son LOUD
    },

    /**
     * 👥 LEADS: Notificar Expiración
     */
    async notifyLeadExpired(guestName: string, property: string, dates: string): Promise<boolean> {
        const message = `
⚪ <b>Lead Expirado (Sin Pago)</b>
━━━━━━━━━━━━━━━━━━━━
<b>Huésped:</b> ${guestName}
<b>Propiedad:</b> ${property}
<b>Fechas:</b> ${dates}
🏷️ <i>Acción: Las fechas han sido liberadas en el calendario.</i>`;
        return this.sendTelegramAlert(message, undefined, true); // Expiraciones son SILENT
    },

    /**
     * 🆘 EMERGENCIA: Nueva Alerta Directa
     */
    async notifyNewEmergency(property: string, guest: string, issue: string, severity: string): Promise<boolean> {
        const icon = severity === 'critical' ? '🚨' : '🆘';
        const message = `
🔴 🚨 <b>EMERGENCIA CRÍTICA: ${severity.toUpperCase()}</b>
━━━━━━━━━━━━━━━━━━━━
<b>Propiedad:</b> 🏠 ${property}
<b>Huésped:</b> 👤 ${guest}
<b>Problema:</b> 📢 ${issue}

🔱 <i>Orden del Jefe: Intervención inmediata requerida.</i>`;
        return this.sendTelegramAlert(message, {
            inline_keyboard: [[{ text: "✅ Enterado", callback_data: "ack_emergency" }]]
        }, false);
    },

    /**
     * 🏠 HOME HEALTH: Reporte Matutino
     */
    async notifyHomeHealth(stats: {
        syncStatus: string,
        syncDetails: string,
        purgedItems: number,
        activeLeadsCount: number,
        secret: string
    }): Promise<boolean> {
        const siteUrl = process.env.VITE_SITE_URL || 'https://www.villaretiror.com';
        const message = `
⚪ 🏠 <b>ESTADO DE LA CASA - VILLA RETIRO R</b>
━━━━━━━━━━━━━━━━━━━━
📅 <b>Sincronización:</b> ${stats.syncStatus}
${stats.syncDetails}

🧹 <b>Limpieza:</b> ${stats.purgedItems} elementos purgados y liberados.

👥 <b>Leads Activos:</b> ${stats.activeLeadsCount} personas hablando con Salty ahora.

✨ <i>El metrónomo de tu negocio late al ritmo correcto.</i>`;

        const baseUrl = siteUrl.replace(/\/$/, '');
        const safeSecret = encodeURIComponent(stats.secret || '');
        
        const row1 = [
            { text: "🚀 Ver Dashboard", url: `${baseUrl}/host` }
        ];

        if (stats.secret) {
            row1.push({ text: "🔄 Forzar Sync", url: `${baseUrl}/api/master-cron?task=sync&secret=${safeSecret}` });
        }

        const keyboard = {
            inline_keyboard: [
                row1,
                [{ text: "✅ Recibido", callback_data: "ack_health" }]
            ]
        };

        return this.sendTelegramAlert(message, keyboard, true); // Reportes diarios son SILENT
    },

    /**
     * 📧 EMAIL: Notificar Rebote (Bounce)
     */
    async notifyEmailBounce(guestEmail: string, subject: string, reason: string): Promise<boolean> {
        const message = `
🔴 ⚠️ <b>BLOQUEO DE EMAIL (BOUNCE)</b>
━━━━━━━━━━━━━━━━━━━━
<b>Destinatario:</b> <code>${guestEmail}</code>
<b>Asunto:</b> ${subject}
<b>Razón:</b> <i>${reason}</i>

❌ <i>Acción: Contacta al huésped vía WhatsApp de inmediato.</i>`;
        return this.sendTelegramAlert(message, {
            inline_keyboard: [[{ text: "✅ Enterado", callback_data: "ack_bounce" }]]
        }, false); // Bounces son LOUD
    },
    /**
     * 🔱 CAPTAIN ALERT: Notificación Directa desde Salty Voice (Vapi)
     */
    async notifyCaptainFromVoiceCall(params: {
        guestName: string;
        property: string;
        phone: string;
        email: string;
        checkIn: string;
        checkOut: string;
        total: string;
        callId?: string;
    }): Promise<boolean> {
        const message = `
🔱 <b>¡Salty acaba de cerrar un trato!</b> 🎙️
━━━━━━━━━━━━━━━━━━━━
👤 <b>Huésped:</b> ${params.guestName}
🏠 <b>Propiedad:</b> ${params.property}
📅 <b>Estancia:</b> ${params.checkIn} al ${params.checkOut}
💵 <b>Inversión:</b> $${params.total} USD
━━━━━━━━━━━━━━━━━━━━
📞 <b>Teléfono:</b> <code>${params.phone}</code>
📧 <b>Email:</b> <code>${params.email || 'No provisto'}</code>
━━━━━━━━━━━━━━━━━━━━
🆔 <b>Call ID:</b> <code>${params.callId || 'N/A'}</code>

🚀 <i>Salty: "Le dije que lo contactarías por WhatsApp. Es momento de abordar."</i>`;

        // 🧼 MILITARY-GRADE DATA SANITIZATION FOR TELEGRAM BUTTONS
        const email = (params.email || '').trim().toLowerCase();
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const phoneDigits = (params.phone || '').replace(/\D/g, '');
        const phoneOk = phoneDigits.length >= 10;
        
        const row1 = [];
        if (phoneOk) {
            row1.push({ text: "📲 WhatsApp", url: `https://wa.me/${phoneDigits}` });
        }
        
        if (emailOk) {
            row1.push({ text: "📧 Email", url: `mailto:${email}` });
        }

        return this.sendTelegramAlert(message, {
            inline_keyboard: [
                row1,
                [{ text: "✅ Enterado Mi Capitán", callback_data: `ack_vapi_${params.callId || 'new'}` }]
            ]
        }, false); // Alertas del Capitán son LOUD
    },

    /**
     * 📅 SYNC SUMMARY: Reporte de Sincronización Masiva
     */
    async notifySyncSummary(totalImported: number, details: string): Promise<boolean> {
        if (totalImported === 0 && !details.includes('❌')) return true; // No molestar si no hay cambios y no hay errores

        const message = `
🔄 <b>Salty: Resumen de Sincronización</b>
━━━━━━━━━━━━━━━━━━━━
${details.slice(0, 3000)} ${details.length > 3000 ? '...' : ''}

<b>Total Nuevos Bloqueos:</b> +${totalImported} 🔱
━━━━━━━━━━━━━━━━━━━━
✨ <i>Tu calendario ahora está perfectamente alineado.</i>`;

        return this.sendTelegramAlert(message, undefined, true); // Resumen silencioso
    }
};
