import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '../src/services/NotificationService';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { token, email } = req.body;

    if (!token || !email) {
        return res.status(400).json({ error: 'Faltan credenciales (token o email).' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
        console.error('[accept-invite] Missing Supabase keys');
        return res.status(500).json({ error: 'Configuration Error' });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    try {
        // 1. Validar el token y el email en la tabla property_cohosts
        const { data: cohost, error: lookupError } = await supabase
            .from('property_cohosts')
            .select('*')
            .eq('invitation_token', token)
            .eq('email', email.toLowerCase())
            .eq('status', 'pending')
            .single();

        if (lookupError || !cohost) {
            return res.status(404).json({ error: 'Invitación no encontrada, inválida o ya aceptada.' });
        }

        // 2. Activar el acceso limpiando el token y cambiando el status
        const { error: updateError } = await supabase
            .from('property_cohosts')
            .update({ 
                status: 'active',
                invitation_token: null // Security: clear token after validation
            })
            .eq('id', cohost.id);

        if (updateError) {
            throw updateError;
        }

        // 3. Notificar al host principal (Telegram) que el co-host aceptó
        try {
            const { data: prop } = await supabase.from('properties').select('title').eq('id', cohost.property_id).single();
            await NotificationService.sendDirectTelegramMessage(
                process.env.TELEGRAM_CHAT_ID || '', 
                `👥 <b>¡Nuevo Miembro del Equipo!</b>\n\nEl usuario <b>${email}</b> ha aceptado la invitación de Co-Anfitrión para <b>${prop?.title || 'la propiedad'}</b> y ahora tiene acceso al Dashboard operativo.`
            );
        } catch (e) {
            console.error('Error notifying host of new co-host:', e);
        }

        return res.status(200).json({ status: 'success', message: 'Acceso de Co-anfitrión activado correctamente.' });

    } catch (error: any) {
        console.error('[accept-invite] Error:', error.message);
        return res.status(500).json({ error: 'Error interno de validación' });
    }
}
