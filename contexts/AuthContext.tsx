import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const initialFetchRef = useRef(false);

  // Singleton approach refinement: Singleton to map and persist users
  const mapSupabaseUser = (sbUser: any, dbProfile: any = null): User => ({
    id: sbUser.id,
    email: sbUser.email || '',
    name: dbProfile?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Viajero',
    role: sbUser.email === 'villaretiror@gmail.com' ? 'host' : (dbProfile?.role || sbUser.user_metadata?.role || 'guest'),
    avatar: dbProfile?.avatar_url || sbUser.user_metadata?.avatar || '',
    phone: dbProfile?.phone || sbUser.user_metadata?.phone || '',
    emergencyContact: dbProfile?.emergency_contact || sbUser.user_metadata?.emergencyContact || '',
    verificationStatus: sbUser.email_confirmed_at ? 'verified' : 'unverified',
    registeredAt: sbUser.created_at,
  });

  const getExtendedProfile = async (id: string): Promise<any> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn("AuthContext: Profile fetch error:", error.message);
        return null;
      }
      return profile;
    } catch (err) {
      console.error("AuthContext: Critical profile fetch error:", err);
      return null;
    }
  };

  useEffect(() => {
    // Audit: This ensures we have a singleton-like listener.
    let isSubscribed = true;

    // 30s Safety fallback in case of connection drop
    const safetyTimeout = setTimeout(() => {
      if (isSubscribed && loading) {
        console.warn("AuthContext: Bootstrap SAFETY TIMEOUT (30s). Reclaiming UI thread.");
        setLoading(false);
      }
    }, 30000);

    const checkInitialSession = async () => {
      if (initialFetchRef.current) return;
      initialFetchRef.current = true;

      try {
        console.log("AuthContext: Bootstrapping session...");
        const { data: { session } } = await supabase.auth.getSession();
        if (isSubscribed) {
          if (session?.user) {
            console.time(`ProfileFetch-${session.user.id}`);
            const profile = await getExtendedProfile(session.user.id);
            console.timeEnd(`ProfileFetch-${session.user.id}`);
            setUser(mapSupabaseUser(session.user, profile));
          } else {
            console.log("AuthContext: No active session found.");
            setUser(null);
          }
        }
      } catch (err) {
        console.error("AuthContext: Bootstrap session error:", err);
      } finally {
        if (isSubscribed) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    };

    checkInitialSession();

    // Audit: Unified listener to avoid race conditions. 
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log(`Auth Strategy [Audit]: Event type: ${event} for ${session?.user?.email || 'Guest'}`);

      if (!isSubscribed) return;

      if (session?.user) {
        // Force loading if we are fetching a profile
        setLoading(true);
        const profile = await getExtendedProfile(session.user.id);
        if (isSubscribed) {
          setUser(mapSupabaseUser(session.user, profile));
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      } else {
        if (isSubscribed) {
          setUser(null);
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const login = async (email: string, password: string) => {
    // 30s absolute timeout for Auth strategy
    const authTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Error de conexión, reintente")), 30000)
    );

    try {
      const loginRequest = supabase.auth.signInWithPassword({ email, password });
      const response: any = await Promise.race([loginRequest, authTimeout]);
      const { data, error } = response;

      if (error) throw error;

      const profile = await getExtendedProfile(data.user.id);
      const mappedUser = mapSupabaseUser(data.user, profile);
      setUser(mappedUser);
      return { user: mappedUser, error: null };
    } catch (err: any) {
      console.error("AuthStrategy FAIL:", err.message);
      return { user: null, error: err.message || "Error al iniciar sesión" };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'guest' } }
    });

    if (error) return { user: null, error: error.message };
    const mappedUser = data.user ? mapSupabaseUser(data.user) : null;
    return { user: mappedUser, error: null };
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updated: Partial<User>) => {
    const { data, error } = await supabase.auth.updateUser({ data: { ...updated } });
    if (!error && data.user) {
      await supabase.from('profiles').upsert({
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
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
