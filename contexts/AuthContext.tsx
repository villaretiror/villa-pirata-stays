import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  register: (email: string, password: string, name: string) => Promise<{ user: User | null; error: string | null }>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
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
    role: (sbUser.email?.toLowerCase() === 'villaretiror@gmail.com') ? 'host' : (dbProfile?.role || sbUser.user_metadata?.role || 'guest'),
    avatar: dbProfile?.avatar_url || sbUser.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbProfile?.full_name || sbUser.user_metadata?.name || 'User')}&background=FF7F3F&color=fff`,
    phone: dbProfile?.phone || sbUser.user_metadata?.phone || '',
    emergencyContact: dbProfile?.emergency_contact || sbUser.user_metadata?.emergencyContact || '',
    bio: dbProfile?.bio || '',
    verificationStatus: sbUser.email_confirmed_at ? 'verified' : 'unverified',
    registeredAt: sbUser.created_at,
  });

  const updateUserState = useCallback((newUser: User | null) => {
    setUser(prev => {
      if (!prev && !newUser) return null;
      if (!prev || !newUser) return newUser;
      // Simple stability check
      if (prev.id === newUser.id && prev.role === newUser.role && prev.email === newUser.email && prev.avatar === newUser.avatar && prev.name === newUser.name) {
        return prev;
      }
      return newUser;
    });
  }, []);

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
    let isSubscribed = true;
    let authListener: { unsubscribe: () => void } | null = null;

    // 30s Safety fallback in case of connection drop
    const safetyTimeout = setTimeout(() => {
      if (isSubscribed && loading) {
        console.warn("AuthContext: Bootstrap SAFETY TIMEOUT (30s). Reclaiming UI thread.");
        setLoading(false);
      }
    }, 30000);

    const initializeAuth = async () => {
      if (initialFetchRef.current) return;
      initialFetchRef.current = true;

      try {
        console.log("AuthContext: Initializing Session check...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (isSubscribed) {
          if (session?.user) {
            console.log(`AuthContext: Valid session for ${session.user.email}. Fetching profile...`);
            const isAdmin = session.user.email?.toLowerCase() === 'villaretiror@gmail.com';
            const profile = await getExtendedProfile(session.user.id);
            if (isSubscribed) {
              updateUserState(mapSupabaseUser(session.user, profile));
            }
          } else {
            console.log("AuthContext: No initial session.");
            updateUserState(null);
          }
        }
      } catch (err: any) {
        console.error("AuthContext: Initialization Error:", err.message);
      } finally {
        if (isSubscribed) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }

      // After initial check, set up listener
      if (isSubscribed) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
          console.log(`Auth Strategy [Audit]: Event type: ${event} for ${session?.user?.email || 'Guest'}`);

          if (!isSubscribed) return;

          if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            if (session?.user) {
              const profile = await getExtendedProfile(session.user.id);
              if (isSubscribed) {
                updateUserState(mapSupabaseUser(session.user, profile));
                setLoading(false);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            if (isSubscribed) {
              updateUserState(null);
              setLoading(false);
            }
          }
        });
        authListener = subscription;
      }
    };

    initializeAuth();

    return () => {
      isSubscribed = false;
      clearTimeout(safetyTimeout);
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
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
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'guest' } }
    });

    if (error) return { user: null, error: error.message };
    const mappedUser = data.user ? mapSupabaseUser(data.user) : null;
    return { user: mappedUser, error: null };
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      console.log("AuthContext: Initiating logout...");
      await supabase.auth.signOut();
      localStorage.clear();
      setUser(null);
      window.location.href = '/';
    } catch (err: any) {
      console.error("AuthContext: Logout failed:", err.message);
      // Even if it fails, clear local state and redirect
      setUser(null);
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (updated: Partial<User>) => {
    const { data, error } = await supabase.auth.updateUser({ data: { ...updated } });
    if (!error && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: updated.name,
        phone: updated.phone,
        bio: updated.bio,
        avatar_url: updated.avatar,
        emergency_contact: updated.emergencyContact
      });
      const profile = await getExtendedProfile(data.user.id);
      setUser(mapSupabaseUser(data.user, profile));
    }
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/profile?reset=true`,
      });
      return { error: error ? error.message : null };
    } catch (err: any) {
      return { error: err.message || "Error al solicitar recuperación" };
    }
  }, []);

  const value = React.useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    resetPassword
  }), [user, loading, login, register, logout, updateUser, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
