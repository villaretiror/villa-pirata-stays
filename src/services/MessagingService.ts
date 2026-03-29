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
        startDate?: string;
        endDate?: string;
        guestName?: string;
    }) {
        const cleanPhone = options.to.includes('+') ? options.to : `+${options.to.replace(/\D/g, '')}`;
        const siteUrl = (process.env.VITE_SITE_URL || 'https://www.villaretiror.com').replace(/\/$/, '');
        
        // 🔱 SMART LINK EVOLUTION: Direct to Booking funnel with pre-filled data
        let payLink = '';
        if (options.propertyId) {
            const queryParams = new URLSearchParams({
                check_in: options.startDate || '',
                check_out: options.endDate || '',
                guest_name: options.guestName || '',
                source: 'salty_sms'
            }).toString();
            payLink = `\n\nLink de Pago: ${siteUrl}/booking/${options.propertyId}?${queryParams}`;
        }

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
    },

    /**
     * 📧 SEND PAYMENT LINK (Resend)
     * Fallback cuando el SMS falla o el huésped prefiere email.
     */
    async sendPaymentLinkEmail(params: {
        to: string;
        guestName?: string;
        propertyId: string;
        startDate?: string;
        endDate?: string;
        priceTotal?: number;
        currency?: string;
    }) {
        const { data: p } = await supabase
            .from('properties')
            .select('*')
            .eq('id', params.propertyId)
            .single();

        if (!p) throw new Error("Property not found for email link");

        const siteUrl = process.env.VITE_SITE_URL || 'https://www.villaretiror.com';
        
        // 🔱 SMART LINK EVOLUTION: Direct to Booking funnel with pre-filled data
        const queryParams = new URLSearchParams({
            check_in: params.startDate || '',
            check_out: params.endDate || '',
            guest_name: params.guestName || '',
            source: 'salty_voice'
        }).toString();
        
        const payLink = `${siteUrl.replace(/\/$/, '')}/booking/${params.propertyId}?${queryParams}`;
        const currency = params.currency || 'USD';
        
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 40px; overflow: hidden; background-color: #ffffff; box-shadow: 0 20px 50px rgba(0,0,0,0.1);">
                <div style="background-color: #050A18; padding: 50px 40px; text-align: center; color: #ffffff;">
                    <img src="${p.logo_url}" width="120" style="margin-bottom: 25px;" />
                    <h1 style="color: #D4AF37; font-size: 28px; margin: 0; font-weight: 300; letter-spacing: 1px;">Tu Enlace de Reserva Seguro</h1>
                    <p style="text-transform: uppercase; letter-spacing: 4px; font-size: 10px; margin-top: 15px; color: #D4AF37; opacity: 0.8;">Bunker Premium | Salty Concierge</p>
                </div>
                <div style="padding: 50px 40px; color: #2C2B29; line-height: 1.8;">
                    <p style="font-size: 16px;">Hola <strong>${params.guestName || 'Capitán'}</strong>,</p>
                    <p>Soy <strong>Salty</strong>. Tal como conversamos por teléfono, aquí tienes el acceso prioritario al portal seguro para finalizar tu estancia en <strong>${p.title}</strong>.</p>
                    
                    <div style="background-color: #F9F6F2; padding: 30px; border-radius: 25px; margin: 35px 0; border: 1px dashed #D4AF37;">
                        <h3 style="margin-top: 0; font-size: 12px; color: #050A18; text-transform: uppercase; letter-spacing: 2px;">Detalles de la Flota</h3>
                        <p style="margin: 10px 0; font-size: 14px;">📅 Fecha: ${params.startDate || 'A confirmar'} al ${params.endDate || 'A confirmar'}</p>
                        ${params.priceTotal ? `<p style="margin: 10px 0; font-size: 14px;">💰 Inversión: <strong>${params.priceTotal} ${currency}</strong></p>` : ''}
                    </div>

                    <div style="text-align: center; margin: 45px 0;">
                        <a href="${payLink}" style="background-color: #D4AF37; color: #050A18; padding: 22px 45px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 15px 30px rgba(212, 175, 55, 0.3);">💳 Confirmar y Pagar Reserva</a>
                    </div>
                    
                    <p style="font-size: 13px; color: #888; text-align: center; font-style: italic;">"La brisa de Cabo Rojo está a un clic de distancia."</p>
                </div>
                <div style="background-color: #FDFCFB; padding: 25px; text-align: center; border-top: 1px solid #f0f0f0;">
                    <p style="font-size: 11px; color: #aaa; margin: 0;">Este es un mensaje seguro enviado por Salty Concierge para Villa & Pirata Stays.</p>
                </div>
            </div>
        `;

        return this.sendEmail({
            to: params.to,
            subject: `🔱 Tu Enlace de Pago Seguro - ${p.title}`,
            html: html,
            guestName: params.guestName,
            bcc: 'villaretiror@gmail.com'
        });
    }
};
