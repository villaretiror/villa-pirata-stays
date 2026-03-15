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
                title: "Villa Retiro R - Modern Tropical Retreat",
                description: "Sincronizado: Disfruta de una villa boutique con piscina privada de agua salada, energía solar garantizada 24/7 y cisterna industrial.",
                amenities: ["Piscina Salada", "Internet Fibra/Cable (65 Mbps)", "Paneles Solares", "BBQ de Gas", "AC Split", "Cisterna"],
                photos: [
                    "https://a0.muscache.com/im/pictures/miso/Hosting-1081171030449673920/original/95730c30-f345-41de-bf0d-1d9562c775e4.jpeg",
                    "https://a0.muscache.com/im/pictures/hosting/Hosting-1081171030449673920/original/ced4098c-c522-4c05-b0d8-1ea532d338c0.jpeg"
                ],
                house_rules: "Apagar luces y A/C al salir. Check-in 3:00 PM."
            };
        }

        return {
            title: "Pirata Family House - Boquerón",
            description: "Designer Villa cerca del Poblado y Playa Buyé. Confort total y diseño funcional.",
            amenities: ["WiFi Alta Velocidad (65 Mbps)", "Sistema Solar", "Ducha Exterior", "Hamacas"],
            photos: [
                "https://a0.muscache.com/im/pictures/miso/Hosting-42839458/original/05f8a5b2-ef01-4470-a8f1-5f73fcba3301.jpeg",
                "https://a0.muscache.com/im/pictures/hosting/Hosting-42839458/original/a26d55e6-2784-45f1-81a3-6b73cf753a97.jpeg"
            ],
            house_rules: "Se requiere fósforo/encendedor para la estufa. Check-in 3:00 PM."
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
