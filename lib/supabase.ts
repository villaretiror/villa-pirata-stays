import { createClient } from '@supabase/supabase-js';

// Environment config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.villaretiror.com';

export const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

console.log(`[Supabase Service] Initialized in ${isConfigured ? 'PRODUCTION' : 'DEMO/MOCK'} mode`);
if (!isConfigured) {
  console.warn("Supabase keys missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.");
}


// Mock factory para evitar repetición
const mockResponse = (data: any = []) => ({
  data,
  error: null,
  count: 0,
  status: 200,
  statusText: 'OK'
});

const createMockClient = () => {
  const handler: any = {
    select: () => handler,
    insert: () => handler,
    update: () => handler,
    upsert: () => handler,
    delete: () => handler,
    eq: () => handler,
    neq: () => handler,
    gt: () => handler,
    gte: () => handler,
    lt: () => handler,
    lte: () => handler,
    in: () => handler,
    is: () => handler,
    filter: () => handler,
    match: () => handler,
    order: () => handler,
    limit: () => handler,
    range: () => handler,
    abortSignal: () => handler, // Soporte para abortSignal en mock
    single: () => Promise.resolve(mockResponse(null)),
    maybeSingle: () => Promise.resolve(mockResponse(null)),
    then: (resolve: any) => resolve(mockResponse()),
    on: () => ({ subscribe: (fn: any) => fn?.('SUBSCRIBED') }),
    subscribe: (fn: any) => fn?.('SUBSCRIBED'),
  };

  return {
    from: () => handler,
    channel: () => handler,
    removeChannel: () => { },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithOAuth: () => Promise.resolve({ data: null, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Configuración de servidor pendiente. Por favor intente más tarde.' } }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Configuración de servidor pendiente. Por favor intente más tarde.' } }),
      signOut: () => Promise.resolve({ error: null }),
      updateUser: (d: any) => Promise.resolve({ data: { user: { ...d } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    }
  } as any;
};

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
  : createMockClient();

// Info para depuración (segura)
if (!isConfigured) {
  console.log("Supabase URL present:", !!SUPABASE_URL);
  console.log("Supabase Key present:", !!SUPABASE_ANON_KEY);
  if (SUPABASE_URL) console.log("URL start:", SUPABASE_URL.substring(0, 10));
}