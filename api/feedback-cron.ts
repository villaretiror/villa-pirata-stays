import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

export default async function handler(req: Request) {
    // 1. Obtener fecha de ayer (YYYY-MM-DD)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    try {
        // 2. Buscar reservas que hicieron check-out ayer y no tienen feedback enviado
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                id,
                property_id,
                check_out,
                email_sent_feedback,
                profiles (email, full_name),
                properties (title)
            `)
            .eq('check_out', dateStr)
            .eq('email_sent_feedback', false)
            .eq('status', 'confirmed');

        if (error) throw error;

        const results = [];

        for (const booking of bookings || []) {
            const customerEmail = (booking.profiles as any)?.email;
            const customerName = (booking.profiles as any)?.full_name || 'Huésped';
            const propertyName = (booking.properties as any)?.title || 'nuestra villa';

            if (!customerEmail) continue;

            // 3. Disparar email vía Resend (usando nuestro endpoint interno)
            await fetch(`${process.env.VITE_SITE_URL || 'https://villaretiror.com'}/api/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'review_request',
                    to: [customerEmail],
                    customerName,
                    customerEmail,
                    propertyName,
                    propertyId: booking.property_id
                })
            });

            // 4. Marcar como enviado para no repetir
            await supabase
                .from('bookings')
                .update({ email_sent_feedback: true })
                .eq('id', booking.id);

            results.push({ id: booking.id, email: customerEmail });
        }

        return new Response(JSON.stringify({ status: 'done', processed: results.length }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
