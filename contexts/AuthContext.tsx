import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { localAuth } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      const sessionUser = await localAuth.getSession();
      setUser(sessionUser);
      setLoading(false);
    };
    initSession();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await localAuth.signIn(email, password);
    if (result.user) {
      setUser(result.user);
    }
    return result;
  };

  const logout = async () => {
    await localAuth.signOut();
    setUser(null);
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updated };
      setUser(newUser);
      localStorage.setItem('vp_current_session', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
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
