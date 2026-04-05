import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import dotenv from 'dotenv';
import { CohostInvitationTemplate } from '../src/components/emails/CohostInvitationTemplate';

dotenv.config();

async function debugFunction() {
    console.log("🔱 INICIANDO SIMULADOR DE API...");
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    const resendKey = process.env.VITE_RESEND_API_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ Faltan llaves de Supabase en .env");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendKey);

    const v_propertyId = '42839458'; // Pirata
    const customerEmail = 'israelrojasvelazquez1@gmail.com';
    const inviteUrl = "https://www.villaretiror.com/login?invite=true&token=debug&property=42839458";

    try {
        console.log("🔍 Buscando propiedad...");
        const { data: p } = await supabase
            .from('properties')
            .select('*')
            .eq('id', v_propertyId)
            .single();

        if (!p) throw new Error("Propiedad no encontrada");

        console.log("🎨 Intentando RENDER de CohostInvitationTemplate...");
        const html = await render(React.createElement(CohostInvitationTemplate, {
            propertyName: p.name || 'Pirata Family House',
            logoUrl: 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/pirata_family_logo.png',
            accentColor: '#2C2B29',
            inviteUrl
        }));

        console.log("✅ Render Exitoso. Largo HTML:", html.length);
        
        console.log("📧 Intentando ENVÍO vía Resend...");
        const { data, error } = await resend.emails.send({
            from: 'Salty <reservas@villaretiror.com>',
            to: customerEmail,
            subject: 'Prueba de Invitación (Debug)',
            html
        });

        if (error) {
            console.error("❌ ERROR DE RESEND:", error);
        } else {
            console.log("🎉 ÉXITO TOTAL:", data);
        }

    } catch (err: any) {
        console.error("💥 CRASH DETECTADO:", err.message);
        console.error(err.stack);
    }
}

debugFunction();
