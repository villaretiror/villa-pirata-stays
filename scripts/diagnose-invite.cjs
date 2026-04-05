const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testResendInvitation() {
    const propertyId = '42839458'; // Pirata
    const propertyName = 'Pirata Family House';
    const email = 'lapbrian@gmail.com'; // My test email
    const token = 'test-token-' + Date.now();

    console.log(`🚀 Simulando REENVÍO de invitación para: ${email}...`);

    // In local dev, we might not have a real JWT for villaretiror@gmail.com, 
    // so we'll use the SHARED_SECRET if available, or just mock the call to the API if possible.
    // However, I can't call 'api/send' from here easily because it's a serverless function.
    // I will mock the LOGIC within this script.

    const { Resend } = require('resend');
    const resend = new Resend(process.env.VITE_RESEND_API_KEY);

    try {
        // --- This is the logic from api/send.ts ---
        const p = {
            name: propertyName,
            logo: 'https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/pirata_family_logo.png',
            accentColor: '#004E64'
        };

        const siteUrl = 'https://www.villaretiror.com';
        const inviteUrl = `${siteUrl}/login?invite=true&token=${token}&property=${propertyId}`;
        
        console.log(`[Test] Invite URL: ${inviteUrl}`);

        // We need to render the template. 
        // Since I'm in a logic script, I'll just check if the components can be imported/rendered.
        // Wait, it's easier to just call the API if it's deployed.
        
        // I'll check if the API returns 200 or 500 when called with the secret.
        const response = await fetch('https://villa-pirata-stays.vercel.app/api/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.VITE_RESEND_API_KEY}` // Using the secret
            },
            body: JSON.stringify({
                type: 'cohost_invitation',
                customerEmail: email,
                email: email,
                propertyName: propertyName,
                propertyId: propertyId,
                token
            })
        });

        const result = await response.json();
        console.log("Response:", response.status, result);
        if (!response.ok) {
            console.error("❌ API ERROR:", result.error);
        } else {
            console.log("✅ API SUCCESS! Email should be in logs.");
        }

    } catch (err) {
        console.error("Test Error:", err.message);
    }
}

testResendInvitation();
