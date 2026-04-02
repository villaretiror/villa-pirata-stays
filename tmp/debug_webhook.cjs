const fetch = require('node-fetch');

// 🔱 PROTOCOLO DE INSPECCIÓN RADICAL
async function checkWebhook() {
    const token = '7275336151:AAEU63X-09QId3vD5pBeQ7Gatv415mFvL6Y'; // Tu Token del Búnker
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        const data = await response.json();
        console.log("🔱 [RADAR TELEGRAM] Estado del Puente:");
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("🚨 Fallo de conexión con el radar:", e.message);
    }
}

checkWebhook();
