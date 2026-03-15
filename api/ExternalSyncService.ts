import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

/**
 * 🛰️ EXTERNAL SYNC SERVICE (SALTY AGENT)
 * Handles data extraction from platforms like Airbnb.
 */
export const ExternalSyncService = {
    /**
     * 🕵️ Scrape Airbnb Data (Mocked for current env)
     * In production, this would use a headless browser or a service like Apify.
     */
    async fetchListingData(airbnbUrl: string) {
        console.log(`[EXTERNAL_SYNC]: Fetching data from ${airbnbUrl}`);
        
        // Simulating 2 seconds of extraction
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Logic handle for different properties (demonstration)
        const isVillaRetiro = airbnbUrl.includes('1081171030449673920') || airbnbUrl.toLowerCase().includes('retiro');
        
        if (isVillaRetiro) {
            return {
                title: "Villa Retiro R - Luxury Saman Oasis",
                description: "Actualización desde Airbnb: Hemos renovado el área de la piscina y añadido paneles solares para una estancia 100% eco-friendly.",
                amenities: ["Piscina Salada", "Starlink", "Paneles Solares", "BBQ de Gas", "AC en todo"],
                photos: ["https://lh3.googleusercontent.com/v1...", "https://lh3.googleusercontent.com/v2..."],
                house_rules: "Strictly no parties. Check-in after 4PM."
            };
        }

        return {
            title: "Pirata Family House - Boquerón",
            description: "Cerca de todo. Nueva decoración en la terraza.",
            amenities: ["Cercanía al Poblado", "Ducha Exterior", "Wifi", "Hamacas"],
            photos: ["https://lh3.googleusercontent.com/p1..."],
            house_rules: "Quiet hours 10PM-8AM."
        };
    },

    /**
     * ⚖️ Compare and Preview Sync
     */
    async previewSync(villaId: string) {
        const { data: current } = await supabase.from('properties').select('*').eq('id', villaId).single();
        if (!current || !current.airbnb_url) throw new Error("No hay URL de Airbnb configurada.");

        const external = await this.fetchListingData(current.airbnb_url);

        return {
            current: {
                description: current.description,
                amenities: current.amenities
            },
            external: {
                description: external.description,
                amenities: external.amenities
            },
            changes_detected: current.description !== external.description
        };
    },

    /**
     * 🚀 Apply Changes (Actual DB update)
     */
    async commitSync(villaId: string, data: any) {
        const { error } = await supabase.from('properties').update({
            description: data.description,
            amenities: data.amenities,
            // photos: data.photos // Opcional
        }).eq('id', villaId);

        if (error) throw error;

        await supabase.from('salty_memories').insert({
            learned_text: `Sincronización automática completada desde Airbnb para la propiedad ${villaId}.`,
            property_id: villaId
        });

        return { success: true };
    }
};
