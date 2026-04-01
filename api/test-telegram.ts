import { VercelRequest, VercelResponse } from '@vercel/node';
import { NotificationService } from '../src/services/NotificationService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { bypass } = req.query;

    // 🔱 TEMPORARY BYPASS: Ensure the host can always fire this to check status
    if (bypass !== 'vrr_test_voice') {
        return res.status(401).json({ error: 'Missing logic bypass' });
    }

    try {
        console.log("🔱 INICIANDO PRUEBA DE VIDA MANUAL...");
        
        // Log environment status (Sanitized)
        const status = {
            TELEGRAM_BOT_TOKEN: !!(process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN),
            TELEGRAM_CHAT_ID: !!(process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID),
            VITE_PREFIX_TOKEN: !!process.env.VITE_TELEGRAM_BOT_TOKEN,
            VITE_PREFIX_CHAT: !!process.env.VITE_TELEGRAM_CHAT_ID,
        };
        
        console.log("🔱 ENV STATUS:", status);

        const message = `🔱 <b>Conexión Segura Confirmada</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `🚀 El búnker de Villa Retiro R ha recuperado su voz.\n` +
                        `📍 <b>Origen:</b> Disparo Manual de Prueba\n` +
                        `🛸 <b>Sistema:</b> Vercel Edge Runtime\n\n` +
                        `<i>Salty: "Si recibes esto, mi Capitán, el radar está despejado."</i>`;

        const success = await NotificationService.sendTelegramAlert(message, undefined, false);

        return res.status(200).json({ 
            success, 
            status,
            message: success ? 'Alerta enviada con éxito' : 'Fallo en el envío (revisa logs)' 
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
