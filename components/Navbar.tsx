import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import SmartImage from './SmartImage';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  // STRICT WHITELIST: Only show Navbar on these root "tab" views.
  const visiblePaths = ['/', '/favorites', '/messages', '/profile', '/login'];

  if (!visiblePaths.includes(currentPath)) {
    return null;
  }

  const handleProfileClick = (e: React.MouseEvent) => {
    if (user) {
      e.preventDefault();
      setShowMenu(!showMenu);
    }
  };

  const menuItems = [
    { label: 'Mi Perfil', icon: 'account_circle', path: '/profile' },
    { label: 'Mis Estancias', icon: 'receipt_long', path: '/profile?tab=bookings' },
    { label: 'Configuración', icon: 'settings', path: '/profile' },
  ];

  const handleLogout = async () => {
    await logout();
    setShowMenu(false);
    navigate('/');
  };

  const NavItem = ({ path, icon, label, forceActive, onClick, isAvatar }: { path: string, icon: string, label: string, forceActive?: boolean, onClick?: (e: React.MouseEvent) => void, isAvatar?: boolean }) => {
    const isActive = forceActive || currentPath === path;
    return (
      <Link
        to={path}
        onClick={onClick}
        className="group flex flex-col items-center justify-center gap-1 w-16 transition-all active:scale-95"
      >
        <div className={`
          relative flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300
          ${isActive && !isAvatar
            ? 'bg-primary/10 text-primary scale-110'
            : 'bg-transparent text-gray-400 group-hover:text-gray-600'
          }
        `}>
          {isAvatar ? (
            <div className={`w-8 h-8 rounded-full border-2 transition-all overflow-hidden ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}>
              <SmartImage src={user?.avatar || ''} className="w-full h-full object-cover" />
            </div>
          ) : (
            <span className={`material-icons-round text-xl ${isActive ? 'text-primary' : 'text-current'}`}>
              {icon}
            </span>
          )}
        </div>
        <span className={`
          text-[10px] font-bold tracking-tight transition-colors duration-300 truncate w-full text-center px-1
          ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
        `}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-4 pb-[env(safe-area-inset-bottom,12px)] left-0 right-0 z-50 flex justify-center pointer-events-none animate-slide-up">
      <div className="relative flex justify-center w-full max-w-sm">
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
              className="absolute bottom-20 w-[90%] bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-2xl p-3 pointer-events-auto overflow-hidden"
            >
              <div className="p-4 mb-2 flex items-center gap-3 bg-sand/30 rounded-[1.8rem]">
                <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden">
                  <SmartImage src={user?.avatar || ''} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-black text-text-main uppercase tracking-widest">{user?.name}</p>
                  <p className="text-[10px] font-bold text-primary">Huésped VIP</p>
                </div>
              </div>

              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-black/5 rounded-[1.5rem] transition-all group"
                >
                  <span className="material-icons-round text-lg text-gray-400 group-hover:text-primary transition-colors">{item.icon}</span>
                  <span className="text-xs font-bold text-text-main">{item.label}</span>
                </Link>
              ))}

              <div className="h-px bg-gray-100 my-2 mx-4 opacity-50"></div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 rounded-[1.5rem] transition-all text-red-400 group"
              >
                <span className="material-icons-round text-lg opacity-70 group-hover:opacity-100 transition-opacity">logout</span>
                <span className="text-xs font-bold">Cerrar Sesión Segura</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="pointer-events-auto bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] rounded-[2.5rem] px-6 py-2.5 flex items-center justify-between w-[95%] m-0 list-none">
          <li><NavItem path="/" icon="explore" label="Explorar" /></li>
          <li><NavItem path="/favorites" icon="favorite" label="Favoritos" /></li>
          <li><NavItem path="/messages" icon="chat" label="Chat" /></li>
          <li>
            <NavItem
              path={user ? "#" : "/login"}
              icon={user ? "account_circle" : "person"}
              label={user ? (user.name.split(' ')[0]) : "Entrar"}
              isAvatar={!!user}
              forceActive={currentPath === '/profile' || currentPath === '/login' || showMenu}
              onClick={handleProfileClick}
            />
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
