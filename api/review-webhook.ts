import { NotificationService } from '../services/NotificationService.js';

export const config = {
    runtime: 'edge', // Edge runtime constraint
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.WEBHOOK_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const body = await req.json();

        // Safely extract values without "any"
        const guestName = String(body.guestName || 'Huésped Anónimo');
        const propertyTitle = String(body.propertyTitle || 'Villa Retiro');

        // Robust formatting for rating (stars)
        let rating = Number(body.rating);
        if (isNaN(rating) || rating < 1) rating = 1;
        if (rating > 5) rating = 5;

        const platform = String(body.platform || 'Airbnb');

        const success = await NotificationService.notifyNewReview(
            guestName,
            propertyTitle,
            rating,
            platform
        );

        if (!success) {
            throw new Error('Failed to send Telegram notification');
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: Error | unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Review Webhook Error]:', msg);
        return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
