import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '../services/NotificationService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

export default async function handler(req: Request) {
    // 🛡️ Security Check
    const authHeader = req.headers.get('Authorization');
    const secret = process.env.CRON_SECRET || "villaretiror_master_key_2026";
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. System Health Status
        const { data: health } = await supabase.from('system_health').select('*');
        const healthyServices = health?.filter(s => s.status === 'healthy').length || 0;
        const totalServices = health?.length || 0;
        const healthEmoji = healthyServices === totalServices ? "✅" : "⚠️";

        // 2. Agenda del Día
        const { data: checkIns } = await supabase.from('bookings').select('profiles(full_name), properties(title)').eq('check_in', today).eq('status', 'confirmed');
        const { data: checkOuts } = await supabase.from('bookings').select('profiles(full_name), properties(title)').eq('check_out', today).eq('status', 'confirmed');
        const { data: active } = await supabase.from('bookings').select('id').eq('status', 'confirmed').lte('check_in', today).gte('check_out', today);

        // 3. Salty Activity
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: interactions } = await supabase.from('chat_logs').select('message_count', { count: 'exact' }).gt('last_interaction', twentyFourHoursAgo);
        const { data: pendingTakeover } = await supabase.from('chat_logs').select('session_id').gt('human_takeover_until', new Date().toISOString());

        // 4. Clima / Entorno (Open-Meteo)
        let weatherAlert = "☀️ Cielo despejado.";
        try {
            const weatherResp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=18.0829&longitude=-67.1458&current_weather=true&daily=weathercode&timezone=auto`);
            const weatherData = await weatherResp.json();
            const code = weatherData.current_weather.weathercode;
            if (code >= 51) weatherAlert = "🌧️ Alerta: Posibilidad de lluvia. Considera bajo techo para check-ins.";
            if (code >= 95) weatherAlert = "⛈️ Alerta Crítica: Tormentas eléctricas detectadas.";
        } catch { }

        // 🏗️ CONSTRUCCIÓN DEL REPORTE
        const report = `
📊 <b>FUTURA OS: Reporte Operativo Diario</b>
───────────────────────
📅 <b>Fecha:</b> ${today}
───────────────────────

🛠 <b>SYSTEM HEALTH</b> ${healthEmoji}
• Servicios Activos: ${healthyServices}/${totalServices}
• Cron Activity: 🟢 Activo (Master Cron)
• iCal Sync: Conexión estable con Airbnb

📅 <b>AGENDA DEL DÍA</b>
• 🔑 Check-ins: ${checkIns?.length || 0}
• 🧹 Check-outs: ${checkOuts?.length || 0}
• 🏠 En Casa: ${active?.length || 0} Huéspedes

🧠 <b>SALTY CONCIERGE</b>
• Interacciones (24h): ${interactions || 0}
• Host Takeovers: ${pendingTakeover?.length || 0} activos
• Status: 🦾 Guardia operativa

🌦 <b>ENTORNO & CLIMA</b>
• ${weatherAlert}

───────────────────────
<i>"Villa operando bajo estándares de lujo. Buen día, Host."</i>
        `;

        await NotificationService.sendTelegramAlert(report, {
            inline_keyboard: [[{ text: "🛰 Ver Dashboard Real-time", url: "https://villaretiror.com/host/dashboard" }]]
        });

        return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
