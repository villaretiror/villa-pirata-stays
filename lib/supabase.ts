import { createClient } from '@supabase/supabase-js';

// ¡IMPORTANTE! Reemplaza estas variables con las de tu proyecto de Supabase
// Las encuentras en Settings -> API
const SUPABASE_URL: string = 'https://TU_PROYECTO.supabase.co'; 
const SUPABASE_ANON_KEY: string = 'TU_CLAVE_PUBLICA_ANON';

// Check if credentials are still placeholders
// Using negation of OR to avoid TypeScript narrowing 'SUPABASE_URL' to 'never' in the second condition
const isConfigured = !(SUPABASE_URL === 'https://TU_PROYECTO.supabase.co' || SUPABASE_URL.includes('TU_PROYECTO'));

// Return real client if configured, otherwise return a robust mock client for the UI to function
export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : {
      from: (table: string) => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: (data: any) => Promise.resolve({ data: [data], error: null }),
        update: (data: any) => Promise.resolve({ data: [data], error: null }),
        delete: () => Promise.resolve({ data: [], error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({ 
            select: () => Promise.resolve({ data: [], error: null }),
            delete: () => Promise.resolve({ data: [], error: null }),
            update: () => Promise.resolve({ data: [], error: null })
        })
      }),
      channel: () => ({
        on: () => ({ subscribe: (fn: any) => fn && fn('SUBSCRIBED') }),
        subscribe: (fn: any) => fn && fn('SUBSCRIBED')
      }),
      removeChannel: () => {},
    } as any;