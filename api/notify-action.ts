import { NotificationService } from '../services/NotificationService.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { type, guestName, property, checkIn, checkOut, phone, proofUrl } = req.body;

    try {
        let sent = false;
        if (type === 'new_lead') {
            sent = await NotificationService.notifyNewLead(guestName, property, checkIn, checkOut, phone);
        } else if (type === 'payment_proof') {
            sent = await NotificationService.notifyPaymentProof(guestName, property, proofUrl);
        }

        return res.status(200).json({ status: 'ok', sent });
    } catch (error: any) {
        console.error("Error in notify-action:", error);
        return res.status(500).json({ error: error.message });
    }
}
