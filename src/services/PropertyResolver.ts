import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 🔱 PROPERTY RESOLVER (Sovereign Navigator)
 * Translates human inputs (names, slugs, aliases) into verified DB IDs.
 * ELIMINATES: Hardcoded property IDs in code.
 */
export const PropertyResolver = {
    /**
     * Resolves a property ID based on a string input using DB-First logic.
     */
    async resolveId(input: string, client: SupabaseClient): Promise<string | null> {
        let cleanInput = String(input).trim();
        if (!cleanInput) return null;

        // 1. Direct UUID/Id format check
        if (cleanInput.length >= 8 && (!isNaN(Number(cleanInput)) || cleanInput.includes('-'))) {
             // Validate it exists
             const { data: directMatch } = await client.from('properties').select('id').eq('id', cleanInput).maybeSingle();
             if (directMatch) return String(directMatch.id);
        }

        const lower = cleanInput.toLowerCase();

        // 🔱 NATIVE ALIAS RESOLVER (Internal DB Lookup)
        const { data: prop } = await client.from('properties')
            .select('id')
            .or(`title.ilike.%${lower}%,subtitle.ilike.%${lower}%`)
            .limit(1)
            .maybeSingle();

        if (prop) return String(prop.id);

        // 2. Fuzzy Clean & Catch-all (Regionalism tolerance)
        const fillers = ['la', 'mi', 'una', 'esta', 'cerca', 'de', 'el', 'casa'];
        let fuzzy = lower;
        fillers.forEach(f => fuzzy = fuzzy.replace(f, ''));
        fuzzy = fuzzy.trim();

        const { data: fuzzyProp } = await client.from('properties')
            .select('id')
            .ilike('title', `%${fuzzy || lower}%`)
            .maybeSingle();

        return fuzzyProp ? String(fuzzyProp.id) : null;
    }
};
