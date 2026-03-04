import { User } from '../types';

const USERS_KEY = 'vp_users_db';
const CURRENT_USER_KEY = 'vp_current_session';

export const localAuth = {
  // Registrar usuario (Siempre como Guest por seguridad)
  signUp: async (email: string, password: string, name: string): Promise<{ user: User | null; error: string | null }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        
        if (users.find((u: any) => u.email === email)) {
          resolve({ user: null, error: 'Este correo ya está registrado.' });
          return;
        }

        const newUser: User = {
          id: `user-${Date.now()}`,
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          role: 'guest',
          verificationStatus: 'verified'
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
                id: 'admin-master',
                email: 'admin@villaretiro.com',
                name: 'Carlos (Host)',
                role: 'host',
                verificationStatus: 'verified',
                avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBEaokxH_ZWfMSA9DkAdNOrBrxi3UAC3m1h9TooqLj_sa6fh4ew_1GEq7EphFx7x52GRb0fdetzbcryLWpbnyFYxSBzPLbBL-ctobQpVyWXI4fufFaA6VVmEXXgBi65bCeU8mYihp1bgC2wXd1U6WzIhuUMplMFT1T8oQoNDb1ck7gYn6RXJ2v22QrDSbhg5zWWZ2MKrbczk4vtv5UgNP5oeK6EnQkGZ1doa_qAMIXcsXL0LLblW6GaPei8CMcSd50buW6udF5Uexg'
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

  getSession: async (): Promise<User | null> => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  getAllLeads: (): User[] => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return users
      .filter((u: any) => u.role === 'guest' || !u.role)
      .map(({ password, ...u }: any) => u);
  }
};