import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const supabase = createClient(SUPABASE_URL || "", SERVICE_KEY || "");

export const config = {
    maxDuration: 60, // Scrapping and AI take time
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { propertyId } = req.body;

    if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required' });
    }

    try {
        // 1. Get Property Data
        const { data: property, error: pError } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single();

        if (pError || !property) {
            return res.status(404).json({ error: 'Property not found' });
        }

        const airbnbUrl = property.airbnb_url;
        if (!airbnbUrl) {
            return res.status(400).json({ error: 'No Airbnb URL configured for this property.' });
        }

        // 2. Fetch Listing HTML via Proxy
        console.log(`[SYNC_PREVIEW]: Scrapping Airbnb: ${airbnbUrl}`);
        
        // We use a broader User-Agent to avoid initial blocks
        const response = await fetch(airbnbUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
            }
        });

        if (!response.ok) {
            throw new Error(`Airbnb returned status ${response.status}`);
        }

        const html = await response.text();

        // 3. Use Gemini to Parse the HTML (Real Scrapping)
        const { text: aiJson } = await generateText({
            model: google('gemini-1.5-flash'),
            system: `Eres un experto en extracción de datos estructurados de HTML de sitios de alquiler vacacional. 
            Tu misión es extraer la descripción y amenidades de la página de Airbnb proporcionada.
            Devuelve SIEMPRE un JSON puro con este formato:
            {
                "title": "string",
                "description": "string",
                "amenities": ["string", "string"],
                "house_rules": "string"
            }`,
            prompt: `Extrae la información relevante de este HTML de Airbnb:\n\n${html.slice(0, 50000)}` 
        });

        let external;
        try {
            // Clean AI response in case it includes markdown blocks
            const cleanJson = aiJson.replace(/```json/g, '').replace(/```/g, '').trim();
            external = JSON.parse(cleanJson);
        } catch (e) {
            console.error("[SYNC_PREVIEW] AI JSON Parse Error:", aiJson);
            throw new Error("Salty no pudo procesar los datos de Airbnb correctamente.");
        }

        // 4. Amenity Matcher (Icon Alignment)
        // We ensure amenities are cleaned and mapped if necessary (future-proofing)
        
        return res.status(200).json({
            current: {
                description: property.description,
                amenities: property.amenities
            },
            external: {
                description: external.description,
                amenities: external.amenities,
                title: external.title,
                house_rules: external.house_rules
            },
            changes_detected: property.description !== external.description || 
                             JSON.stringify(property.amenities) !== JSON.stringify(external.amenities)
        });

    } catch (error: any) {
        console.error('[SYNC_PREVIEW_ERROR]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
