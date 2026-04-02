import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js'; // Asegúrate de que la ruta sea correcta según tu carpeta

// 🛡️ Safe Environment Access
const getEnv = (key: string): string => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[`VITE_${key}`] || import.meta.env[key] || '';
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[`VITE_${key}`] || process.env[key] || '';
  }
  return '';
};

export const SUPABASE_URL = getEnv('SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');
export const GEMINI_API_KEY = getEnv('GEMINI_API_KEY');
export const SITE_URL = getEnv('SITE_URL') || 'https://villaretiror.com';

// 🔱 THE SOVEREIGNTY HANDSHAKE (No simulation in production)
export const isConfigured = SUPABASE_URL.length > 10 && SUPABASE_ANON_KEY.length > 10;

// --- MOCK CLIENT (Para cuando no hay conexión) ---
const mockResponse = (data: any = []) => ({
  data,
  error: null,
  count: 0,
  status: 200,
  statusText: 'OK'
});

const createMockClient = () => {
  console.warn("🔱 SENTINEL RADAR: Switched to SIMULATED MODE (Missing Keys). UI Shield Active.");

  const handler: any = {
    select: () => handler,
    insert: () => handler,
    update: () => handler,
    upsert: () => handler,
    delete: () => handler,
    eq: () => handler,
    neq: () => handler,
    in: () => handler,
    or: () => handler,
    order: () => handler,
    limit: () => handler,
    gt: () => handler,
    lt: () => handler,
    on: () => handler,
    single: () => Promise.resolve(mockResponse(null)),
    maybeSingle: () => Promise.resolve(mockResponse(null)),
    then: (resolve: any) => resolve(mockResponse([])),
  };

  return {
    from: () => handler,
    rpc: () => Promise.resolve(mockResponse([])),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
      signInWithPassword: ({ email }: { email: string }) => Promise.resolve({
        data: {
          user: {
            id: 'mock-user-123',
            email: email || 'host@villa.com',
            user_metadata: { role: 'host', name: 'Salty Host (Simulado)' },
            role: 'host'
          }
        },
        error: null
      }),
      signOut: () => Promise.resolve({ error: null }),
    },
    channel: () => handler,
    removeChannel: () => Promise.resolve(),
    removeAllChannels: () => Promise.resolve(),
  } as any;
};

// --- EL ENCHUFE REAL ---
export const supabase = isConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: typeof window !== 'undefined',
      persistSession: typeof window !== 'undefined',
      detectSessionInUrl: typeof window !== 'undefined',
      storageKey: 'sb-auth-token',
      flowType: 'pkce'
    }
  })
  : createMockClient();

// Debug info
if (!isConfigured) {
  console.warn("⚠️ Supabase MOCK MODE: Las llaves no están configuradas en el .env");
} else {
  console.log("🚀 Supabase REAL MODE: Enchufado y con soberanía total.");
}