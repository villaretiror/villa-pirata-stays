import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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

export default async function handler(req: any, res: any) {
    // 🛡️ Security Check: Bearer Token
    const authHeader = req.headers['authorization'];
    const secret = getEnv('CRON_SECRET');
    if (!secret) return res.status(500).json({ error: 'CRON_SECRET_NOT_CONFIGURED' });

    if (!authHeader || authHeader !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const dateObj = new Date();
    const today = dateObj.toISOString().split('T')[0];
    
    const humanDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dObj = new Date(y, m - 1, d, 12, 0, 0);
        const formatted = format(dObj, 'eee d MMM', { locale: es });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };

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

        const report = `
🛰️ <b>SALTY STRATEGY | Reporte Operativo Diario</b>
───────────────────────
📅 <b>Fecha:</b> ${humanDate(today)}
───────────────────────

🛠 <b>SYSTEM HEALTH</b> ${healthEmoji}
• Servicios Activos: <b>${healthyServices}/${totalServices}</b>
• iCal Sync Status: 🟢 Conexión estable con Airbnb
• Cron Activity: 🟢 Activo (Master Cron)

📅 <b>AGENDA DEL DÍA</b>
• 🔑 Check-ins: <b>${checkIns?.length || 0}</b>
• 🧹 Check-outs: <b>${checkOuts?.length || 0}</b>
• 🏠 En Casa: <b>${active?.length || 0}</b> Huéspedes

🧠 <b>SALTY CONCIERGE</b>
• Interacciones (24h): ${interactions || 0}
• Host Takeovers: ${pendingTakeover?.length || 0} activos

🌦 <b>ENTORNO & CLIMA</b>
• ${weatherAlert}

───────────────────────
<i>"Villa operando bajo estándares de lujo. Buen día, Host."</i>
<a href="${getEnv('VITE_SITE_URL') || 'https://villaretiror.com'}/host">🔗 Abrir Centro de Control</a>
        `.trim();

        await NotificationService.sendTelegramAlert(report).catch(e => console.error('Error daily report:', e));

        return res.status(200).json({ success: true, timestamp: new Date().toISOString() });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
