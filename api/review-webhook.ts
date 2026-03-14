import { NotificationService } from '../services/NotificationService.js';

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const body = await req.json();

        const { guestName, propertyTitle, rating, platform } = body;

        if (!guestName || !propertyTitle || !rating || !platform) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        const success = await NotificationService.notifyNewReview(
            guestName,
            propertyTitle,
            Number(rating),
            platform
        );

        if (!success) {
            throw new Error('Failed to send Telegram notification');
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Review Webhook Error]:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
