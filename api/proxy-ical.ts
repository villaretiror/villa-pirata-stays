export const config = {
    runtime: 'edge', // Edge runtime constraint
};

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const urlObj = new URL(req.url);
        const targetUrl = urlObj.searchParams.get('url');

        if (!targetUrl || !targetUrl.startsWith('http')) {
            return new Response(JSON.stringify({ error: 'Invalid URL parameter' }), { status: 400 });
        }

        // Bypass proxy cache and fetch directly
        const bustCacheUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'nocache=' + Date.now();

        const response = await fetch(bustCacheUrl, {
            headers: {
                'User-Agent': 'VillaRetiro-Calendar-Sync/1.0',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`Platform server responded with ${response.status}`);
        }

        const text = await response.text();

        // Return the RAW iCal to the frontend without CORS block
        return new Response(JSON.stringify({ contents: text }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error: Error | unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[iCal Proxy Error]:', msg);
        return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
