/**
 * 🛰️ NOTIFICATION SERVICE (Telegram Bot Integration)
 * Architecture: Server-side Alerts for Business & System Health
 */

export const NotificationService = {
    /**
     * Envía una alerta a Telegram al chat del Host.
     * @param message Mensaje formateado para Telegram (HTML)
     */
    async sendTelegramAlert(message: string): Promise<boolean> {
        // En un entorno de producción, el TOKEN y el CHAT_ID vendrían de variables de entorno
        const TELEGRAM_TOKEN = "8612052249:AAEFr5Gh2JIBEbc3Xp4o91-lhUl3aZPZbdQ";

        // ID Real del Host capturado desde Telegram
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "2085187904";

        if (!TELEGRAM_TOKEN || !CHAT_ID) {
            console.warn("[NotificationService] Telegram Token o Chat ID faltante.");
            return false;
        }

        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            const data = await response.json();
            if (!data.ok) {
                console.error("[NotificationService] Error de Telegram:", data.description);
                return false;
            }
            console.log("[NotificationService] Alerta Telegram enviada con éxito.");
            return true;
        } catch (error: any) {
            console.error("[NotificationService] Error de Red/Fetch:", error.message);
            return false;
        }
    }
};
