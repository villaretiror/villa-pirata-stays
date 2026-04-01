import { createClient } from '@supabase/supabase-js';
// 🛡️ Safe Environment Access
const getEnv = (key) => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || process.env[`VITE_${key}`] || '';
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        return import.meta.env[`VITE_${key}`] || import.meta.env[key] || '';
    }
    return '';
};
const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');
export const SITE_URL = getEnv('SITE_URL') || 'https://villaretiror.com';
export const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
// --- MOCK CLIENT (Para cuando no hay conexión) ---
const mockResponse = (data = []) => ({
    data,
    error: null,
    count: 0,
    status: 200,
    statusText: 'OK'
});
const createMockClient = () => {
    const handler = {
        select: () => handler,
        insert: () => handler,
        update: () => handler,
        upsert: () => handler,
        delete: () => handler,
        eq: () => handler,
        or: () => handler,
        order: () => handler,
        limit: () => handler,
        single: () => Promise.resolve(mockResponse(null)),
        maybeSingle: () => Promise.resolve(mockResponse(null)),
        then: (resolve) => resolve(mockResponse([])),
    };
    return {
        from: () => handler,
        auth: {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
            signOut: () => Promise.resolve({ error: null }),
        },
        channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => { } }) }) }),
        removeChannel: () => Promise.resolve(),
        removeAllChannels: () => Promise.resolve(),
    };
};
// --- EL ENCHUFE REAL ---
// Aquí pasamos <Database> para que todo el proyecto sepa qué tablas existen
export const supabase = isConfigured
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storageKey: 'sb-auth-token',
            flowType: 'pkce'
        }
    })
    : createMockClient();
// Debug info
if (!isConfigured) {
    console.warn("⚠️ Supabase MOCK MODE: Las llaves no están configuradas en el .env");
}
else {
    console.log("🚀 Supabase REAL MODE: Enchufado y con tipos sincronizados");
}
//# sourceMappingURL=supabase.js.map