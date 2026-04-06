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

        // 2. Fetch Dynamic Knowledge (The 'Soft' facts)
        // 🔱 RAG ALGORITHM: We search the knowledge base for keys matching the user query
        const words = lower.split(' ').filter(w => w.length > 3);
        const searchTerms = words.map(w => `key.ilike.%${w}%`).join(',');

        const { data: familyKnowledge } = await client
            .from('salty_family_knowledge')
            .select('key, value')
            .or(searchTerms || 'id.neq.00000000-0000-0000-0000-000000000000') // Catch-all if no words
            .limit(10);

        if (familyKnowledge) {
            familyKnowledge.forEach(k => {
                knowledge.push(`${k.key}: ${k.value}`);
            });
        }

        return knowledge;
    }
};
