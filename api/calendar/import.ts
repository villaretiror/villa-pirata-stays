import ical from 'node-ical';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// URL de ejemplo, idealmente configuradas en DB o variables
const ICAL_URLS: Record<string, string> = {
    '1': process.env.AIRBNB_ICAL_VILLA_1 || 'https://www.airbnb.com/calendar/ical/...', // Villa Retiro (Placeholder)
    '2': process.env.AIRBNB_ICAL_VILLA_2 || 'https://www.airbnb.com/calendar/ical/...' // Pirata (Placeholder)
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
        let importedCount = 0;

        for (const [propertyId, url] of Object.entries(ICAL_URLS)) {
            if (!url || url.includes('...')) {
                console.log(`Saltando importación para la propiedad ${propertyId}: URL de iCal faltante`);
                continue;
            }

            console.log(`Importando calendario para propiedad ${propertyId} desde ${url}`);
            let events;
            try {
                events = await ical.async.fromURL(url);
            } catch (err: any) {
                console.error(`Error bajando iCal property ${propertyId}:`, err.message);
                continue;
            }

            for (const event of Object.values(events)) {
                if (event && event.type === 'VEVENT') {
                    const ev = event as any;
                    const startDate = ev.start as Date;
                    const endDate = ev.end as Date;

                    if (!startDate || !endDate) continue;

                    // Formatear a YYYY-MM-DD
                    const checkIn = startDate.toISOString().split('T')[0];
                    const checkOut = endDate.toISOString().split('T')[0];

                    // Usar el UID del evento como external_id para evitar duplicados si existe schema,
                    // de lo contrario usamos upsert por propiedad y fechas.

                    // Por simplicidad en inserción ciega (ideal on_conflict si hay unique constraint)
                    // Validar si existe primero
                    const { data: existing } = await supabase
                        .from('bookings')
                        .select('id')
                        .eq('property_id', propertyId)
                        .eq('check_in', checkIn)
                        .eq('check_out', checkOut);

                    if (!existing || existing.length === 0) {
                        await supabase.from('bookings').insert({
                            property_id: propertyId,
                            status: 'external_block',
                            check_in: checkIn,
                            check_out: checkOut,
                            guests: 1, // Default por bloqueo
                            total_price: 0
                        });
                        importedCount++;
                    }
                }
            }
        }

        return res.status(200).json({ success: true, newBlocksAdded: importedCount });
    } catch (error: any) {
        console.error('IMPORT CALENDAR ERROR:', error);
        return res.status(500).json({ error: 'Failed to sync calendar external feeds' });
    }
}
