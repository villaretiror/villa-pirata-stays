import React from 'react';
import { render } from '@react-email/render';
import { CohostInvitationTemplate } from '../src/components/emails/CohostInvitationTemplate.js';

async function testRender() {
    try {
        console.log("🚀 Probando RENDER de CohostInvitationTemplate...");
        
        const html = await render(React.createElement(CohostInvitationTemplate, {
            propertyName: "Pirata Family House",
            logoUrl: "https://plpnydhgvqoqwrvuzvzq.supabase.co/storage/v1/object/public/villas/pirata_family_logo.png",
            accentColor: "#004E64",
            inviteUrl: "https://www.villaretiror.com/login?invite=true&token=test"
        }));

        console.log("✅ RENDER SUCCESS! HTML length:", html.length);
        process.exit(0);
    } catch (err) {
        console.error("❌ RENDER FAILED:", err);
        process.exit(1);
    }
}

testRender();
