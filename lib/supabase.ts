import { createClient } from '@supabase/supabase-js';

// Las llaves se deben configurar en un archivo .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

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
    select: () => Promise.resolve(mockResponse()),
    insert: (d: any) => Promise.resolve(mockResponse(d)),
    update: (d: any) => Promise.resolve(mockResponse(d)),
    delete: () => Promise.resolve(mockResponse()),
    eq: () => handler,
    single: () => Promise.resolve(mockResponse(null)),
    match: () => handler,
    order: () => handler,
    limit: () => handler,
    range: () => handler,
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
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Demo mode: Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Demo mode: Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    }
  } as any;
};

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createMockClient();