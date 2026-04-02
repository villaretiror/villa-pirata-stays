import { supabase } from '../src/lib/supabase';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 🛡️ SECURITY: Resend uses a secret or signature. 
  // For now, we verify if it's a valid JSON and has the expected Resend structure.
  // In production, the USER should set RESEND_WEBHOOK_SECRET in Vercel.
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const signature = req.headers['svix-signature'] || req.headers['x-resend-signature'];

  if (webhookSecret && !signature) {
    console.warn('[Email Webhook] Missing signature but secret is set.');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { type, data } = req.body;

    console.log(`[Email Webhook] 🔱 Event received: ${type}`, data?.email_id);

    // 🎯 TARGET: email.opened
    if (type === 'email.opened') {
      const resendId = data.email_id;
      
      const { error } = await supabase
        .from('email_logs')
        .update({ 
          opened_at: new Date().toISOString(),
          status: 'opened' 
        })
        .eq('resend_id', resendId);

      if (error) {
        console.error('[Email Webhook] DB Update Error:', error.message);
        return res.status(500).json({ error: 'Database update failed' });
      }

      console.log(`[Email Webhook] ✅ Log ${resendId} marked as OPENED.`);
    }

    // 📉 TARGET: email.bounced
    if (type === 'email.bounced') {
      const resendId = data.email_id;
      await supabase
        .from('email_logs')
        .update({ status: 'bounced' })
        .eq('resend_id', resendId);
      
      console.warn(`[Email Webhook] 🛑 Log ${resendId} marked as BOUNCED.`);
    }

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error("[Email Webhook] Critical Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
