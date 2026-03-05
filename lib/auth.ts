import { User } from '../types';

const USERS_KEY = 'vp_users_db';
const CURRENT_USER_KEY = 'vp_current_session';

export const localAuth = {
  // Registrar usuario (Siempre como Guest por seguridad)
  signUp: async (email: string, password: string, name: string): Promise<{ user: User | null; error: string | null }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const normalizedEmail = email.toLowerCase();
        const formattedName = name ? name.charAt(0).toUpperCase() + name.slice(1) : normalizedEmail.split('@')[0];

        if (users.find((u: any) => u.email === normalizedEmail)) {
          resolve({ user: null, error: 'Este correo ya está registrado.' });
          return;
        }

        const newUser: User = {
          id: `user-${Date.now()}`,
          email: normalizedEmail,
          name: formattedName,
          role: 'guest',
          verificationStatus: 'verified',
          registeredAt: new Date().toISOString()
        };

        users.push({ ...newUser, password });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        resolve({ user: newUser, error: null });
      }, 800);
    });
  },

  // Iniciar Sesión - Detección invisible de Host
  signIn: async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const normalizedEmail = email.toLowerCase();

        // 1. LLAVE MAESTRA: Si es este correo/pass, entra como Host automáticamente
        if (normalizedEmail === 'admin@villaretiro.com' && password === 'admin') {
          const adminUser: User = {
            id: 'da63919e-e092-482a-9e2c-3adminmaster',
            email: 'admin@villaretiro.com',
            name: 'Carlos (Host)',
            role: 'host',
            verificationStatus: 'verified',
            avatar: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&q=80&w=200',
            registeredAt: new Date('2024-01-01').toISOString()
          };
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(adminUser));
          resolve({ user: adminUser, error: null });
          return;
        }

        // 2. Usuarios Normales
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const foundUser = users.find((u: any) => u.email === normalizedEmail && u.password === password);

        if (foundUser) {
          const { password, ...safeUser } = foundUser;
          // Forzar rol guest si no es la cuenta maestra
          const userWithRole: User = { ...(safeUser as User), role: 'guest' };
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithRole));
          resolve({ user: userWithRole, error: null });
        } else {
          resolve({ user: null, error: 'Credenciales inválidas.' });
        }
      }, 800);
    });
  },

  signOut: async () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    return Promise.resolve();
  },

  // 2. Sesión Robusta
  getSession: async (): Promise<User | null> => {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
  },

  getAllLeads: (): User[] => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return users
      .filter((u: any) => u.role === 'guest' || !u.role)
      .map(({ password, ...u }: any) => u);
  }
};