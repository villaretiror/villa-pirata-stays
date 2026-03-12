export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1].content;

        // Sanitización de la API Key (Remover comillas accidentales de Vercel)
        const rawKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
        const apiKey = rawKey.replace(/["']/g, '').trim();

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Falta la API Key en las variables de entorno.' }), { status: 500 });
        }

        // LLAMADA PURA AL ENDPOINT VIA FETCH (BYPASS SDK)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: lastMessage }] }]
                })
            }
        );

        const data = await response.json();

        // LOG CRÍTICO PARA DEBUGGING EN VERCEL
        console.log('GOOGLE_RESPONSE_RAW:', JSON.stringify(data));

        if (data.error) {
            console.error('GOOGLE_API_ERROR_OBJECT:', data.error);
            return new Response(JSON.stringify({
                error: data.error.message,
                code: data.error.code,
                status: data.error.status
            }), { status: 200 }); // Devolvemos 200 para ver el JSON de error en el chat si es posible
        }

        if (!data.candidates || !data.candidates[0]) {
            return new Response(JSON.stringify({ error: 'No se recibieron candidatos de respuesta.', raw: data }), { status: 200 });
        }

        const text = data.candidates[0].content.parts[0].text;

        // Retornamos texto plano para el frontend
        return new Response(text);
    } catch (error: any) {
        console.error('SERVER_FATAL_ERROR:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
