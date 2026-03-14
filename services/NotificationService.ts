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
        // En un entorno de producción, el TOKEN y el CHAT_ID vendrían de variables de entorno
        const TELEGRAM_TOKEN = "8612052249:AAEFr5Gh2JIBEbc3Xp4o91-lhUl3aZPZbdQ";

        // ID Real del Host capturado desde Telegram
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "2085187904";

        if (!TELEGRAM_TOKEN || !CHAT_ID) {
            console.warn("[NotificationService] Telegram Token o Chat ID faltante.");
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
     */
    async notifyNewReservation(guestName: string, property: string, checkIn: string, checkOut: string, price: string): Promise<boolean> {
        const message = `
🏨 <b>¡Nueva Reserva Confirmada!</b>
━━━━━━━━━━━━━━━━━━━━
<b>Huésped:</b> ${guestName}
<b>Propiedad:</b> ${property}
<b>Fechas:</b> ${checkIn} a ${checkOut}
<b>Total:</b> $${price} USD
🚀 <i>Acción: Prepara todo para su llegada.</i>`;
        return this.sendTelegramAlert(message);
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
