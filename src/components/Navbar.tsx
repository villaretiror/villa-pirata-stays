import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import SmartImage from './SmartImage';
import { Compass, Heart, MessageCircle, LayoutDashboard, User as UserIcon, Settings, Receipt, LogOut } from 'lucide-react';

const menuItems = [
  { label: 'Mi Perfil', icon: UserIcon, path: '/profile' },
  { label: 'Mis Estancias', icon: Receipt, path: '/profile?tab=bookings' },
  { label: 'Configuración', icon: Settings, path: '/profile' },
];

interface NavItemProps {
  path: string;
  icon: React.ElementType;
  label: string;
  currentPath: string;
  forceActive?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  isAvatar?: boolean;
  userAvatar?: string;
}

const NavItem = ({ path, icon: Icon, label, currentPath, forceActive, onClick, isAvatar, userAvatar }: NavItemProps) => {
  const isActive = forceActive || currentPath === path;
  return (
    <Link
      to={path}
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center gap-1 w-[72px] transition-all active:scale-95"
    >
      <div className={`
        relative flex items-center justify-center w-12 h-9 rounded-full z-10 transition-all duration-300
        ${isActive && !isAvatar
          ? 'text-primary'
          : 'text-text-light group-hover:text-secondary'
        }
      `}>
        {isActive && !isAvatar && (
          <motion.div
            layoutId="navPill"
            className="absolute inset-0 bg-primary/10 rounded-full"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}

        {isAvatar ? (
          <div className={`p-2.5 rounded-2xl transition-all duration-500 relative ${isActive ? 'bg-primary text-secondary shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
            <SmartImage src={userAvatar || ''} className="w-full h-full object-cover" />
          </div>
        ) : (
          <Icon strokeWidth={1.5} className="w-5 h-5 relative z-10" />
        )}
      </div>
      <span className={`
        text-[7px] font-black uppercase tracking-[0.25em] transition-colors duration-300 w-full text-center px-0.5
        ${isActive ? 'text-primary' : 'text-text-light group-hover:text-secondary'}
      `}>
        {label}
      </span>
    </Link>
  );
};

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

  return (
    <nav className="fixed bottom-6 pb-[env(safe-area-inset-bottom,20px)] left-0 right-0 z-50 flex justify-center pointer-events-none animate-slide-up">
      <div className="relative flex justify-center w-full max-w-sm">
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
              className="absolute bottom-24 w-[90%] bg-secondary/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl p-3 pointer-events-auto overflow-hidden text-white"
            >
              <div className="p-4 mb-2 flex items-center gap-3 bg-sand/30 rounded-[1.8rem]">
                <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden">
                  <SmartImage src={user?.avatar || ''} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-black text-secondary uppercase tracking-widest">{user?.name}</p>
                  <p className="text-[10px] font-bold text-primary">
                    {user?.email === 'villaretiror@gmail.com' ? 'Master Host' : 'Huésped VIP'}
                  </p>
                </div>
              </div>

              {/* MODO ADMIN DUAL: Persistent link if admin or host */}
              {(user?.email?.toLowerCase() === 'villaretiror@gmail.com' || user?.role === 'host' || user?.role === 'admin') && (
                <Link
                  to="/host"
                  onClick={() => {
                    localStorage.setItem('host_mode_preferred', 'true');
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 px-5 py-3.5 bg-primary/10 hover:bg-primary/20 rounded-[1.5rem] transition-all group mb-1 border border-primary/20"
                >
                  <LayoutDashboard strokeWidth={1.5} className="w-5 h-5 text-primary" />
                  <span className="text-xs font-bold text-primary tracking-wide">Panel de Host (Admin)</span>
                </Link>
              )}

              {menuItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 rounded-[1.5rem] transition-all group"
                  >
                    <ItemIcon strokeWidth={1.5} className="w-5 h-5 text-text-light group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">{item.label}</span>
                  </Link>
                );
              })}

              <div className="h-px bg-gray-100 my-2 mx-4 opacity-50"></div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 rounded-[1.5rem] transition-all text-red-500 group"
              >
                <LogOut strokeWidth={1.5} className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs font-medium">Cerrar Sesión Segura</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="pointer-events-auto bg-secondary/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2.5rem] px-6 py-2.5 flex items-center justify-between w-[95%] m-0 list-none border border-white/10">
          <li><NavItem path="/" icon={Compass} label="Explorar" currentPath={currentPath} /></li>
          <li><NavItem path="/favorites" icon={Heart} label="Favoritos" currentPath={currentPath} /></li>
          <li><NavItem path="/messages" icon={MessageCircle} label="Chat" currentPath={currentPath} /></li>
          {(user?.role === 'host' || user?.role === 'admin' || user?.email?.toLowerCase() === 'villaretiror@gmail.com') && (
            <li><NavItem path="/host" icon={LayoutDashboard} label="Panel" currentPath={currentPath} /></li>
          )}
          <li>
            <NavItem
              path={user ? "#" : "/login"}
              icon={UserIcon}
              label={user ? (user.name?.split(' ')[0] || "Perfil") : "Entrar"}
              currentPath={currentPath}
              isAvatar={!!user}
              userAvatar={user?.avatar}
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
