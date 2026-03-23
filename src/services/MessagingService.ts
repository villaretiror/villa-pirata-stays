import { Resend } from 'resend';
import { supabase } from '../lib/supabase.js';
import { NotificationService } from './NotificationService.js';
import twilio from 'twilio';

const resend = new Resend(process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY);

export const MessagingService = {
    /**
     * 📧 SEND EMAIL (Resend)
     * Abstrae la lógica de plantillas y envío.
     */
    async sendEmail(options: {
        to: string | string[];
        subject: string;
        html: string;
        from?: string;
        replyTo?: string;
        bcc?: string | string[];
        bookingId?: string;
        guestName?: string;
    }) {
        try {
            const { data, error } = await resend.emails.send({
                from: options.from || 'Villa Retiro <reservas@villaretiror.com>',
                to: options.to,
                subject: options.subject,
                html: options.html,
                bcc: options.bcc,
                reply_to: options.replyTo || 'reservas@villaretiror.com'
            });

            if (error) throw error;

            if (data?.id) {
                await supabase.from('email_logs').insert({
                    resend_id: data.id,
                    booking_id: options.bookingId || null,
                    guest_name: options.guestName || 'Cliente',
                    guest_email: Array.isArray(options.to) ? options.to[0] : options.to,
                    subject: options.subject,
                    status: 'sent'
                });
            }

            return { success: true, id: data?.id };
        } catch (err: any) {
            console.error('[MessagingService] Email Error:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * 📲 TELEGRAM (Proxy to NotificationService to keep split)
     */
    async sendTelegramAlert(message: string, keyboard?: any, silent = false) {
        return NotificationService.sendTelegramAlert(message, keyboard, silent);
    },

    /**
     * 🔱 SALTY MESSENGER: Orchestrate Reservation Emails
     */
    async sendReservationConfirmation(params: {
        propertyId: string;
        guestName: string;
        guestEmail: string;
        checkIn: string;
        checkOut: string;
        total: string;
        bookingId: string;
        isReturning?: boolean;
    }) {
        // Fetch property details for the email
        const { data: p } = await supabase
            .from('properties')
            .select('*')
            .eq('id', params.propertyId)
            .single();

        if (!p) throw new Error("Property not found for messaging");

        const mapsUrl = `https://www.google.com/maps?q=${p.location_coords || '18.07065,-67.16544'}`;
        const wazeUrl = `https://waze.com/ul?ll=${p.location_coords || '18.07065,-67.16544'}&navigate=yes`;
        
        const welcomeHeader = params.isReturning 
            ? `¡Bienvenido de vuelta, es un honor tenerte en casa otra vez!` 
            : `Tu experiencia Caribe Chic en ${p.title} comienza ahora.`;

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 40px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #FDFCFB; padding: 50px 40px; text-align: center; border-bottom: 2px dashed #f0f0f0;">
                    <img src="${p.logo_url}" width="140" style="margin-bottom: 25px;" />
                    <h1 style="color: #2C2B29; font-size: 32px; margin: 0;">¡Hola, ${params.guestName}!</h1>
                    <p style="color: #FF7F3F; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; font-size: 11px;">${welcomeHeader}</p>
                </div>
                <div style="padding: 40px; color: #4A4A4A; line-height: 1.8;">
                    <p style="font-size: 17px;">Soy <strong>Salty</strong>, tu concierge digital. La brisa de Cabo Rojo ya te espera.</p>
                    <div style="background-color: #2C2B29; color: #ffffff; padding: 35px; border-radius: 25px; margin: 30px 0;">
                        <h3 style="color: #FF7F3F; margin-top: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Criterio de Acceso</h3>
                        <p style="margin: 15px 0; font-size: 12px; color: #FF7F3F; font-weight: bold; text-transform: uppercase;">
                            Los códigos de acceso se revelarán 24 horas antes de tu check-in.
                        </p>
                    </div>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${process.env.VITE_SITE_URL || 'https://www.villaretiror.com'}/stay/${params.propertyId}" style="background-color: #2C2B29; color: #ffffff; padding: 20px 40px; border-radius: 18px; text-decoration: none; font-weight: bold;">🔑 Gestionar Mi Estancia</a>
                    </div>
                </div>
            </div>
        `;

        // 1. Send Email
        await this.sendEmail({
            to: params.guestEmail,
            subject: `🏝️ ¡Confirmado! Tu refugio en ${p.title} está listo`,
            html: html,
            bookingId: params.bookingId,
            guestName: params.guestName
        });

        // 2. Notify Telegram
        await NotificationService.notifyNewReservation(
            params.bookingId, 
            params.guestName, 
            p.title, 
            params.checkIn, 
            params.checkOut, 
            params.total, 
            'Web Directa'
        );
    },

    /**
     * 📲 SEND SMS (VAPI / Twilio Bridge)
     * Envía notificaciones críticas y enlaces de pago directamente al móvil.
     */
    async sendSms(options: {
        to: string;
        content: string;
        propertyId?: string;
        bookingId?: string;
    }) {
        const cleanPhone = options.to.includes('+') ? options.to : `+${options.to.replace(/\D/g, '')}`;
        const siteUrl = process.env.VITE_SITE_URL || 'https://www.villaretiror.com';
        
        // Link dinámico de pago si se provee propertyId
        const payLink = options.propertyId 
            ? `\n\nLink de Pago: ${siteUrl}/stay/${options.propertyId}${options.bookingId ? `?booking_id=${options.bookingId}` : ''}`
            : '';

        const fullMessage = `${options.content}${payLink}\n\n🔱 Salty Concierge`;

        try {
            console.log(`[MessagingService] Sending real SMS to ${cleanPhone}...`);

            const client = twilio(
                process.env.TWILIO_ACCOUNT_SID || process.env.VITE_TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN || process.env.VITE_TWILIO_AUTH_TOKEN
            );

            const message = await client.messages.create({
                body: fullMessage,
                to: cleanPhone,
                from: process.env.TWILIO_PHONE_NUMBER || process.env.VITE_TWILIO_PHONE_NUMBER || '+15075788506'
            });

            // Logger de Auditoría en Supabase
            await supabase.from('sms_logs').insert({
                phone: cleanPhone,
                content: fullMessage,
                property_id: options.propertyId || null,
                booking_id: options.bookingId || null,
                status: 'sent',
                resend_id: message.sid // Reutilizando para el SID de Twilio
            });

            return { success: true, sid: message.sid };
        } catch (err: any) {
            console.error('[MessagingService] SMS Error:', err.message);
            return { success: false, error: err.message };
        }
    }
};
