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

  // Función para obtener el perfil extendido desde la tabla pública
  const getExtendedProfile = async (id: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    return profile;
  };

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await getExtendedProfile(session.user.id);
        setUser(mapSupabaseUser(session.user, profile));
      }
      setLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      if (session?.user) {
        const profile = await getExtendedProfile(session.user.id);
        setUser(mapSupabaseUser(session.user, profile));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Mapper mejorado que prioriza los datos de la tabla 'profiles'
  const mapSupabaseUser = (sbUser: any, dbProfile: any = null): User => ({
    id: sbUser.id,
    email: sbUser.email || '',
    name: dbProfile?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Viajero',
    role: dbProfile?.role || sbUser.user_metadata?.role || 'guest',
    avatar: dbProfile?.avatar_url || sbUser.user_metadata?.avatar || '',
    phone: dbProfile?.phone || sbUser.user_metadata?.phone || '',
    emergencyContact: dbProfile?.emergency_contact || sbUser.user_metadata?.emergencyContact || '',
    verificationStatus: sbUser.email_confirmed_at ? 'verified' : 'unverified',
    registeredAt: sbUser.created_at,
  });

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    const profile = await getExtendedProfile(data.user.id);
    const mappedUser = mapSupabaseUser(data.user, profile);
    setUser(mappedUser);
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
    // 1. Actualizar Supabase Auth Metadata (para consistencia rápida)
    const { data, error } = await supabase.auth.updateUser({
      data: { ...updated }
    });

    // 2. Sincronizar con tabla 'profiles' (Esquema SQL nuevo)
    if (!error && data.user) {
      await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: updated.name,
          phone: updated.phone,
          avatar_url: updated.avatar,
          emergency_contact: updated.emergencyContact
        });

      const profile = await getExtendedProfile(data.user.id);
      setUser(mapSupabaseUser(data.user, profile));
    }

    if (error) throw error;
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
