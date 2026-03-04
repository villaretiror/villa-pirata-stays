import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // STRICT WHITELIST: Only show Navbar on these root "tab" views.
  const visiblePaths = ['/', '/favorites', '/messages', '/profile'];
  
  if (!visiblePaths.includes(currentPath)) {
    return null;
  }

  const NavItem = ({ path, icon, label }: { path: string, icon: string, label: string }) => {
    const isActive = currentPath === path;
    return (
      <Link 
        to={path}
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
          text-[10px] font-bold tracking-wide transition-colors duration-300
          ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
        `}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-5 left-0 right-0 z-50 flex justify-center pointer-events-none animate-slide-up">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2rem] px-6 py-2.5 flex items-center justify-between w-[90%] max-w-[360px]">
        <NavItem path="/" icon="explore" label="Explorar" />
        <NavItem path="/favorites" icon="favorite" label="Favoritos" />
        <NavItem path="/messages" icon="chat" label="Chat" />
        <NavItem path="/profile" icon="person" label="Perfil" />
      </div>
    </nav>
  );
};

export default Navbar;
