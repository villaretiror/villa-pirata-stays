
import { NotificationService } from './services/NotificationService.js';

async function test() {
    console.log("🚀 Iniciando Prueba de Fuego...");
    const success = await NotificationService.sendTelegramAlert(
        "🛎️ <b>SISTEMA OPERACIONAL</b>\n\n" +
        "El Bot de Villa Retiro & Pirata Stays ha sido configurado con éxito.\n" +
        "Esperando señales de vida y nuevas reservas. 🌴"
    );

    if (success) {
        console.log("✅ Mensaje enviado con éxito. Si no lo recibiste, verifica que el CHAT_ID sea correcto.");
    } else {
        console.log("❌ Fallo en el envío. Verifica el TOKEN y el CHAT_ID.");
    }
}

test();
