import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  register: (email: string, password: string, name: string) => Promise<{ user: User | null; error: string | null }>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sincronización con tabla 'profiles'
  const syncProfile = async (sbUser: any) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No existe, crearlo
        await supabase.from('profiles').insert([
          {
            id: sbUser.id,
            email: sbUser.email,
            name: sbUser.user_metadata?.name || sbUser.email?.split('@')[0],
            role: sbUser.user_metadata?.role || 'guest',
            avatar: sbUser.user_metadata?.avatar || '',
            registered_at: new Date().toISOString()
          }
        ]);
      }
    } catch (e) {
      console.error("Error syncing profile:", e);
    }
  };

  useEffect(() => {
    // 1. Verificar sesión inicial
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        await syncProfile(session.user);
      }
      setLoading(false);
    };

    initSession();

    // 2. Escuchar cambios de estado (Login/Logout/Password Changes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      if (session?.user) {
        const mapped = mapSupabaseUser(session.user);
        setUser(mapped);
        if (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION') {
          await syncProfile(session.user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Mapper para convertir User de Supabase a nuestro tipo User de tipos.ts
  const mapSupabaseUser = (sbUser: any): User => ({
    id: sbUser.id,
    email: sbUser.email || '',
    name: sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Viajero',
    role: sbUser.user_metadata?.role || 'guest',
    avatar: sbUser.user_metadata?.avatar || '',
    verificationStatus: sbUser.email_confirmed_at ? 'verified' : 'unverified',
    registeredAt: sbUser.created_at,
  });

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    const mappedUser = mapSupabaseUser(data.user);
    setUser(mappedUser);
    await syncProfile(data.user);
    return { user: mappedUser, error: null };
  };

  const register = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'guest' // Por defecto todos son guests vía registro público
        }
      }
    });

    if (error) return { user: null, error: error.message };
    const mappedUser = data.user ? mapSupabaseUser(data.user) : null;
    return { user: mappedUser, error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = async (updated: Partial<User>) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { ...updated }
    });
    if (!error && data.user) {
      setUser(mapSupabaseUser(data.user));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
