import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 🔱 KNOWLEDGE ENGINE (Salty's Librarian)
 * Handles dynamic RAG (Data Retrieval) and FAQ resolution.
 * ELIMINATES: Long if/else intent routers in code.
 */
export const KnowledgeEngine = {
    /**
     * Retrieves specific data for a property and a query context.
     * Combines hard metadata with dynamic knowledge entries.
     */
    async discover(propertyId: string, query: string, client: SupabaseClient): Promise<string[]> {
        const lower = query.toLowerCase();
        const knowledge: string[] = [];

        // 1. Fetch Property Metadata (The 'Hard' facts)
        const { data: prop } = await client
            .from('properties')
            .select(`
                title, 
                address, 
                category, 
                bedrooms, 
                beds, 
                baths, 
                fees, 
                "calendarSync"
            `)
            .eq('id', propertyId)
            .maybeSingle();

        if (prop) {
            knowledge.push(`Propiedad: ${prop.title}`);
            knowledge.push(`Distribución: ${prop.bedrooms} cuartos, ${prop.beds} camas, ${prop.baths} baños.`);
            knowledge.push(`Dirección: ${prop.address}`);
            if (prop.fees) knowledge.push(`Tarifas/Tasas: ${JSON.stringify(prop.fees)}`);
        }

        // 2. Fetch Dynamic Knowledge Base (Family & Villa Specific)
        const words = lower.split(' ').filter(w => w.length > 3);
        const searchTerms = words.map(w => `key.ilike.%${w}%`).join(',');

        const [familyKnowledgeRes, settingsRes] = await Promise.all([
            client
                .from('salty_family_knowledge')
                .select('key, value')
                .or(searchTerms || 'id.neq.00000000-0000-0000-0000-000000000000')
                .limit(10),
            client
                .from('system_settings')
                .select('key, value')
                .in('key', ['villa_knowledge', 'secret_spots'])
        ]);

        // A. Process Family Knowledge
        if (familyKnowledgeRes.data) {
            familyKnowledgeRes.data.forEach(k => {
                knowledge.push(`${k.key}: ${k.value}`);
            });
        }

        // B. Process System Settings (Deep Villa Knowledge)
        if (settingsRes.data) {
            settingsRes.data.forEach(setting => {
                if (setting.key === 'villa_knowledge' && typeof setting.value === 'object' && setting.value !== null) {
                    const vk = setting.value as any;
                    // Intelligently extract relevant sections based on query
                    if (lower.includes('regla') || lower.includes('politica') || lower.includes('check')) {
                        if (vk.policies) knowledge.push(`Políticas: ${JSON.stringify(vk.policies)}`);
                    }
                    if (lower.includes('distancia') || lower.includes('llegar') || lower.includes('donde')) {
                        if (vk.location) knowledge.push(`Ubicación: ${JSON.stringify(vk.location)}`);
                    }
                    if (lower.includes('comida') || lower.includes('comer') || lower.includes('truco')) {
                        if (vk.survival_tips) knowledge.push(`Tips de Supervivencia: ${JSON.stringify(vk.survival_tips)}`);
                    }
                    if (lower.includes('amenidad') || lower.includes('piscina') || lower.includes('wifi')) {
                        if (vk.amenities) knowledge.push(`Amenidades: ${JSON.stringify(vk.amenities)}`);
                    }
                }
                if (setting.key === 'secret_spots' && lower.includes('spot') || lower.includes('lugar') || lower.includes('recomend')) {
                    knowledge.push(`Lugares Secretos: ${JSON.stringify(setting.value)}`);
                }
            });
        }

        return knowledge;
    }
};
