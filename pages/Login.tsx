import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        if (!name.trim()) throw new Error("Por favor ingresa tu nombre.");
        const { user, error } = await register(email, password, name);
        if (error) throw new Error(error);
        if (user) {
          navigate(user.role === 'host' ? '/host' : '/profile');
        }
      } else {
        const { user, error } = await login(email, password);
        if (error) throw new Error(error);
        if (user) {
          navigate(user.role === 'host' ? '/host' : '/profile');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setTimeout(async () => {
      const googleEmail = "usuario.demo@gmail.com";
      const { user } = await login(googleEmail, "google-pass");
      if (user) navigate(user.role === 'host' ? '/host' : '/profile');
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-orange-400 to-secondary z-20"></div>

      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-float p-8 border border-white/50 relative z-10 animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-text-light hover:text-primary mb-6">
          <span className="material-icons mr-1 text-sm">arrow_back</span> Volver
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white transform -rotate-3">
            <span className="material-icons text-[32px]">{isRegistering ? 'person_add' : 'cottage'}</span>
          </div>
          <h1 className="text-2xl font-serif text-text-main mb-1">{isRegistering ? 'Crear Cuenta' : 'Bienvenido'}</h1>
          <p className="text-text-light text-xs">
            {isRegistering ? 'Regístrate para gestionar tus estancias' : 'Accede a tu cuenta de Villa & Pirata'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 text-[11px] p-3 rounded-xl mb-4 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="animate-fade-in">
              <label className="block text-[10px] font-bold text-text-light uppercase tracking-wider mb-1 ml-1">Nombre</label>
              <input
                className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-sand/30 focus:ring-2 focus:ring-primary/10 text-sm"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Juan del Pueblo"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-text-light uppercase tracking-wider mb-1 ml-1">Email</label>
            <input
              className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-sand/30 focus:ring-2 focus:ring-primary/10 text-sm"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-light uppercase tracking-wider mb-1 ml-1">Contraseña</label>
            <input
              className="block w-full px-4 py-3 border border-gray-200 rounded-xl bg-sand/30 focus:ring-2 focus:ring-primary/10 text-sm"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2"
          >
            {loading ? 'Cargando...' : (isRegistering ? 'REGISTRARSE' : 'INICIAR SESIÓN')}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-gray-400">
            <span className="px-2 bg-white/80">O</span>
          </div>
        </div>

        <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-200 text-text-main font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-colors flex justify-center items-center gap-2 mb-6 text-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>

        <p className="text-center text-[11px] text-text-light">
          {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <button onClick={() => setIsRegistering(!isRegistering)} className="font-bold text-primary ml-1 hover:underline">
            {isRegistering ? 'Inicia Sesión' : 'Regístrate'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;