import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import PropertyDetails from './pages/PropertyDetails';
import Booking from './pages/Booking';
import Success from './pages/Success';
import Login from './pages/Login';
import HostDashboard from './pages/HostDashboard';
import ReservationDetails from './pages/ReservationDetails';
import Favorites from './pages/Favorites';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import ProtectedRoute from './components/ProtectedRoute';
import { useProperty } from './contexts/PropertyContext';

const App: React.FC = () => {
  const location = useLocation();
  const { properties } = useProperty();

  const uiConfig = {
    isHost: location.pathname.startsWith('/host'),
    isAuth: location.pathname.startsWith('/login'),
    isDetails: location.pathname.startsWith('/property/'),
    isBooking: location.pathname.startsWith('/booking/'),
    isReservation: location.pathname.startsWith('/reservation/')
  };

  const showNavbar = !uiConfig.isHost && !uiConfig.isDetails && !uiConfig.isBooking;
  const showWhatsApp = !uiConfig.isHost && !uiConfig.isAuth;

  useEffect(() => {
    window.scrollTo(0, 0);

    const pageTitles: Record<string, string> = {
      '/': 'Villa Retiro | Inicio',
      '/favorites': 'Villa Retiro | Favoritos',
      '/messages': 'Villa Retiro | Mensajes',
      '/login': 'Villa Retiro | Acceso',
      '/profile': 'Villa Retiro | Perfil',
      '/host': 'Villa Retiro | Host Panel',
      '/success': 'Villa Retiro | ¡Éxito!',
    };

    if (uiConfig.isDetails) document.title = 'Villa Retiro | Detalles';
    else if (uiConfig.isBooking) document.title = 'Villa Retiro | Reserva';
    else if (uiConfig.isReservation) document.title = 'Villa Retiro | Confirmación';
    else document.title = pageTitles[location.pathname] || 'Villa Retiro R LLC';
  }, [location.pathname, uiConfig.isDetails, uiConfig.isBooking, uiConfig.isReservation]);

  let propertyTitle: string | undefined;
  if (uiConfig.isDetails || uiConfig.isBooking) {
    const id = location.pathname.split('/').pop();
    propertyTitle = properties.find(p => p.id === id)?.title;
  }

  return (
    <div className="font-sans text-text-main bg-sand min-h-screen overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/property/:id" element={<PropertyDetails />} />
            <Route path="/booking/:id" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
            <Route path="/success" element={<Success />} />
            <Route path="/reservation/:id" element={<ReservationDetails />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/host" element={<ProtectedRoute role="host"><HostDashboard /></ProtectedRoute>} />
          </Routes>
        </motion.main>
      </AnimatePresence>

      {showWhatsApp && <FloatingWhatsApp propertyTitle={propertyTitle} />}
      {showNavbar && <Navbar />}
    </div>
  );
};

export default App;
