import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

/**
 * 🛰️ EXTERNAL SYNC SERVICE (SALTY AGENT)
 * Handles data extraction from platforms like Airbnb via secure API.
 */
export const ExternalSyncService = {
    /**
     * 🕵️ Scrape Airbnb Data
     * Now calls the Edge API with Gemini parsing.
     */
    async fetchListingData(propertyId: string) {
        const response = await fetch('/api/sync/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Error al sincronizar con Airbnb");
        }
        
        const data = await response.json();
        return data.external;
    },

    /**
     * ⚖️ Compare and Preview Sync
     */
    async previewSync(propertyId: string) {
        const response = await fetch('/api/sync/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Error al obtener previsualización");
        }

        return await response.json();
    },

    /**
     * 🚀 Apply Changes (Actual DB update)
     */
    async commitSync(villaId: string, data: any) {
        const { error } = await supabase.from('properties').update({
            description: data.description,
            amenities: data.amenities,
            // house_rules: data.house_rules // Opcional
        }).eq('id', villaId);

        if (error) throw error;

        await supabase.from('salty_memories').insert({
            learned_text: `Sincronización automática completada desde Airbnb para la propiedad ${villaId}. Se actualizaron descripción y amenidades.`,
            property_id: villaId
        });

        return { success: true };
    }
};

