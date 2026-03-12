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

        /**
         * BYPASS TÉCNICO V1 STABLE
         * Cambiamos de v1beta a v1 para asegurar el mapeo del modelo Flash.
         * Usamos el full resource identifier: models/gemini-1.5-flash
         */
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: lastMessage }] }]
                })
            }
        );

        const data = await response.json();

        // LOG CRÍTICO PARA DEBUGGING
        console.log('GOOGLE_RESPONSE_RAW (v1):', JSON.stringify(data));

        if (data.error) {
            console.error('GOOGLE_API_ERROR_OBJECT:', data.error);
            return new Response(JSON.stringify({
                error: data.error.message,
                code: data.error.code,
                status: data.error.status
            }), { status: 200 });
        }

        if (!data.candidates || !data.candidates[0]) {
            return new Response(JSON.stringify({ error: 'No se recibieron candidatos.', raw: data }), { status: 200 });
        }

        const text = data.candidates[0].content.parts[0].text;
        return new Response(text);
    } catch (error: any) {
        console.error('SERVER_FATAL_ERROR:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
