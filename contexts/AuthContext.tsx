import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { localAuth } from '../lib/auth';

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

  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      try {
        const sessionUser = await localAuth.getSession();
        if (isMounted) {
          setUser(sessionUser);
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) setLoading(false);
      }
    };
    initSession();
    return () => { isMounted = false; };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await localAuth.signIn(email, password);
    if (result.user) setUser(result.user);
    return result;
  };

  const register = async (email: string, password: string, name: string) => {
    const result = await localAuth.signUp(email, password, name);
    // Auto-login después de registro? Opcional según UX.
    // if (result.user) setUser(result.user);
    return result;
  };

  const logout = async () => {
    await localAuth.signOut();
    setUser(null);
  };

  const updateUser = (updated: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const newUser = { ...prev, ...updated };
      // Sincronizamos con el almacenamiento a través de la librería
      localStorage.setItem('vp_current_session', JSON.stringify(newUser));
      return newUser;
    });
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
