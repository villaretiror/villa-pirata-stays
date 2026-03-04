import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

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

  const handleLogout = async () => {
    await logout();
    setShowMenu(false);
    navigate('/');
  };

  const NavItem = ({ path, icon, label, forceActive, onClick }: { path: string, icon: string, label: string, forceActive?: boolean, onClick?: (e: React.MouseEvent) => void }) => {
    const isActive = forceActive || currentPath === path;
    return (
      <Link
        to={path}
        onClick={onClick}
        className="group flex flex-col items-center justify-center gap-1 w-16 transition-all active:scale-95"
      >
        {/* Icon Container */}
        <div className={`
          relative flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300
          ${isActive
            ? 'bg-primary/10 text-primary scale-110'
            : 'bg-transparent text-gray-400 group-hover:text-gray-600'
          }
        `}>
          <span className={`material-icons-round text-xl ${isActive ? 'text-primary' : 'text-current'}`}>
            {icon}
          </span>
        </div>

        {/* Label */}
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
      <div className="relative flex justify-center w-full">
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 w-[90%] max-w-[200px] bg-white/95 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl p-2 pointer-events-auto"
            >
              <Link to="/profile" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors">
                <span className="material-icons-round text-lg text-gray-400">account_circle</span>
                <span className="text-sm font-bold text-text-main">Mi Perfil</span>
              </Link>
              <Link to="/profile?tab=reservations" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors">
                <span className="material-icons-round text-lg text-gray-400">receipt_long</span>
                <span className="text-sm font-bold text-text-main">Mis Reservas</span>
              </Link>
              <div className="h-px bg-gray-100 my-1 mx-2"></div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-xl transition-colors text-red-500"
              >
                <span className="material-icons-round text-lg">logout</span>
                <span className="text-sm font-bold">Cerrar Sesión</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2rem] px-6 py-2.5 flex items-center justify-between w-[95%] max-w-[380px] m-0 list-none">
          <li><NavItem path="/" icon="explore" label="Explorar" /></li>
          <li><NavItem path="/favorites" icon="favorite" label="Favoritos" /></li>
          <li><NavItem path="/messages" icon="chat" label="Chat" /></li>
          <li>
            <NavItem
              path={user ? "#" : "/login"}
              icon={user ? "account_circle" : "person"}
              label={user ? (user.name.split(' ')[0]) : "Entrar"}
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
