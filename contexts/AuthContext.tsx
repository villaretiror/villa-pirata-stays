import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { Tables } from '../supabase_types';

type ProfileRow = Tables<'profiles'>;

interface AuthContextType {
  user: (User & { total_bookings?: number; is_returning_guest?: boolean }) | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  register: (email: string, password: string, name: string) => Promise<{ user: User | null; error: string | null }>;
  logout: (navigate?: (path: string) => void) => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialFetchRef = useRef(false);

  // Singleton approach refinement: Singleton to map and persist users
  const mapSupabaseUser = useCallback((sbUser: any, dbProfile: ProfileRow | null = null, extraData: any = {}): User & { total_bookings?: number; is_returning_guest?: boolean } => ({
    id: sbUser.id,
    email: sbUser.email || '',
    name: dbProfile?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Viajero',
    role: (sbUser.email?.toLowerCase() === 'villaretiror@gmail.com') ? 'host' : ((dbProfile?.role as 'guest' | 'host' | 'admin') || sbUser.user_metadata?.role || 'guest'),
    avatar: dbProfile?.avatar_url || sbUser.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbProfile?.full_name || sbUser.user_metadata?.name || 'User')}&background=FF7F3F&color=fff`,
    phone: dbProfile?.phone || sbUser.user_metadata?.phone || '',
    emergencyContact: dbProfile?.emergency_contact || sbUser.user_metadata?.emergencyContact || '',
    bio: dbProfile?.bio || '',
    verificationStatus: sbUser.email_confirmed_at ? 'verified' : 'unverified',
    registeredAt: sbUser.created_at,
    given_concessions: (dbProfile?.given_concessions as any[]) || [],
    total_bookings: extraData.total_bookings || 0,
    is_returning_guest: (extraData.total_bookings || 0) > 0
  }), []);

  const updateUserState = useCallback((newUser: (User & { total_bookings?: number; is_returning_guest?: boolean }) | null) => {
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

  const getExtendedProfile = useCallback(async (id: string): Promise<{ profile: ProfileRow | null, extra: any }> => {
    try {
      const [profileRes, bookingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', id)
      ]);

      return {
        profile: profileRes.data as ProfileRow,
        extra: { total_bookings: bookingsRes.count || 0 }
      };
    } catch (err) {
      console.error("AuthContext: Critical profile fetch error:", err);
      return { profile: null, extra: { total_bookings: 0 } };
    }
  }, []);

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
            const { profile, extra } = await getExtendedProfile(session.user.id);
            if (isSubscribed) {
              updateUserState(mapSupabaseUser(session.user, profile, extra));
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
              const { profile, extra } = await getExtendedProfile(session.user.id);
              
              // 🕵️ AUDIT LOG: Secure Host Event Tracking
              if (event === 'SIGNED_IN' && session.user.email === 'villaretiror@gmail.com') {
                supabase.from('auth_logs').insert({
                  user_id: session.user.id,
                  email: session.user.email,
                  event_type: 'login',
                  user_agent: navigator.userAgent
                }).then();
              }

              if (isSubscribed) {
                updateUserState(mapSupabaseUser(session.user, profile, extra));
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

      const { profile, extra } = await getExtendedProfile(data.user.id);
      const mappedUser = mapSupabaseUser(data.user, profile, extra);
      setUser(mappedUser);
      return { user: mappedUser, error: null };
    } catch (err: any) {
      console.error("AuthStrategy FAIL:", err.message);
      return { user: null, error: err.message || "Error al iniciar sesión" };
    }
  }, [getExtendedProfile, mapSupabaseUser]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'guest' } }
    });

    if (error) return { user: null, error: error.message };

    // 🏗️ INDUSTRIAL ATOMIC REGISTRATION (Trigger-based)
    // Client-side profiles upsert removed in favor of Supabase Database Trigger
    
    const mappedUser = data.user ? mapSupabaseUser(data.user) : null;
    return { user: mappedUser, error: null };
  }, [mapSupabaseUser]);

  const logout = useCallback(async (navigate?: (path: string) => void) => {
    setLoading(true);
    try {
      console.log("AuthContext: Initiating logout...");
      await supabase.auth.signOut();
      localStorage.clear();
      setUser(null);
      if (navigate) navigate('/');
      else window.location.href = '/';
    } catch (err: any) {
      console.error("AuthContext: Logout failed:", err.message);
      // Even if it fails, clear local state and redirect
      setUser(null);
      if (navigate) navigate('/');
      else window.location.href = '/';
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (updated: Partial<User>) => {
    const { data, error } = await supabase.auth.updateUser({ data: { ...updated } });
    if (!error && data.user) {
      const profileUpdate: Partial<ProfileRow> = {};
      if (updated.name) profileUpdate.full_name = updated.name;
      if (updated.phone) profileUpdate.phone = updated.phone;
      if (updated.bio !== undefined) profileUpdate.bio = updated.bio;
      if (updated.avatar) profileUpdate.avatar_url = updated.avatar;
      if (updated.emergencyContact) profileUpdate.emergency_contact = updated.emergencyContact;

      await supabase.from('profiles').upsert({
        id: data.user.id,
        ...profileUpdate,
        updated_at: new Date().toISOString()
      });
      
      const { profile, extra } = await getExtendedProfile(data.user.id);
      setUser(mapSupabaseUser(data.user, profile, extra));
    }
    if (error) throw error;
  }, [mapSupabaseUser, getExtendedProfile]);

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
