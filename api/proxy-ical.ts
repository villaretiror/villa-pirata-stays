import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

export default async function handler(req: Request) {
    if (req.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    }

    const urlObj = new URL(req.url);
    const targetUrl = urlObj.searchParams.get('url');

    if (!targetUrl || !targetUrl.startsWith('http')) {
        return new Response(JSON.stringify({ error: 'Invalid URL parameter' }), { status: 400 });
    }

    try {
        // Intentar fetch fresco con cache-busting
        const bustCacheUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'nocache=' + Date.now();

        const response = await fetch(bustCacheUrl, {
            headers: {
                'User-Agent': 'VillaRetiro-Calendar-Sync/1.0',
            },
            // @ts-ignore: Edge runtime timeout
            signal: AbortSignal.timeout(6000) 
        });

        if (!response.ok) throw new Error(`Platform server responded with ${response.status}`);

        const text = await response.text();

        // 🛡️ ACTUALIZAR CACHE DE EMERGENCIA
        try {
            await supabase.from('ical_cache').upsert({ 
                url: targetUrl, 
                content: text, 
                updated_at: new Date().toISOString() 
            });
        } catch (cacheErr) {
            console.warn('Cache update ignored:', cacheErr);
        }

        return new Response(JSON.stringify({ contents: text }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error: any) {
        console.error('[iCal Proxy Fallback Mode]:', error.message);
        
        // 🚨 FALLBACK: Recuperar última "foto" exitosa del calendario
        try {
            const { data } = await supabase
                .from('ical_cache')
                .select('content, updated_at')
                .eq('url', targetUrl)
                .maybeSingle();

            if (data?.content) {
                return new Response(JSON.stringify({ 
                    contents: data.content, 
                    is_cached: true, 
                    cached_at: data.updated_at 
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
        } catch (dbError) {
            console.error('[Cache Retrieval Failed]:', dbError);
        }

        return new Response(JSON.stringify({ error: 'Server Down & No Cache Available' }), { 
            status: 503, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
    }
}
