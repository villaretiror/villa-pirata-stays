// Deploy trigger: 2026-03-12-1400
import React, { useState, useEffect } from 'react';
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
import Message from './pages/Messages';
import Profile from './pages/Profile';
import ContractView from './pages/ContractView';
import HostProfile from './pages/HostProfile';
import SecretSpots from './pages/SecretSpots';
import Navbar from './components/Navbar';
import StayDashboard from './pages/StayDashboard';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import SaltyToast from './components/SaltyToast';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { useProperty } from './contexts/PropertyContext';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const location = useLocation();
  const { properties } = useProperty();

  const uiConfig = {
    isHost: location.pathname.startsWith('/host'),
    isAuth: location.pathname.startsWith('/login'),
    isDetails: location.pathname.startsWith('/property/'),
    isBooking: location.pathname.startsWith('/booking/'),
    isReservation: location.pathname.startsWith('/reservation/'),
    isHostProfile: location.pathname.startsWith('/host-profile/'),
  };

  const showNavbar = !uiConfig.isHost && !uiConfig.isDetails && !uiConfig.isBooking;
  const showWhatsApp = !uiConfig.isHost && !uiConfig.isAuth;

  let currentProperty: any = undefined;
  if (uiConfig.isDetails || uiConfig.isBooking) {
    const id = location.pathname.split('/').pop();
    currentProperty = properties.find(p => p.id === id);
  }
  const propertyTitle = currentProperty?.title;

  useEffect(() => {
    window.scrollTo(0, 0);

    // 🔐 TOKEN WATCHER: Refresca la sesión automáticamente antes de expirar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      if (event === 'SIGNED_OUT') {
        // Opcional: Limpiar cache local
      }
    });

    const pageTitles: Record<string, string> = {
      '/': 'Villa Retiro R & Pirata Family House | Cabo Rojo, PR',
      '/favorites': 'Mis Favoritos | Villa & Pirata Stays',
      '/messages': 'Mensajes | Villa & Pirata Stays',
      '/login': 'Acceso | Villa & Pirata Stays',
      '/profile': 'Mi Perfil | Villa & Pirata Stays',
      '/host': 'Host Dashboard | Villa & Pirata Stays',
      '/success': '¡Reserva Confirmada! | Villa & Pirata Stays',
    };

    if (uiConfig.isDetails) document.title = propertyTitle ? `${propertyTitle} | Cabo Rojo, PR` : 'Detalles | Villa & Pirata Stays';
    else if (uiConfig.isBooking) document.title = propertyTitle ? `Vivir la Experiencia: ${propertyTitle}` : 'Vivir la Experiencia | Villa & Pirata Stays';
    else if (uiConfig.isReservation) document.title = 'Confirmación | Villa & Pirata Stays';
    else if (uiConfig.isHostProfile) document.title = 'Perfil de Anfitrión | Villa & Pirata Stays';
    else document.title = pageTitles[location.pathname] || 'Villa Retiro R & Pirata Family House | Cabo Rojo, PR';

    return () => subscription.unsubscribe();
  }, [location.pathname, uiConfig.isDetails, uiConfig.isBooking, uiConfig.isReservation, propertyTitle]);

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
            <Route path="/stay/:id" element={<StayDashboard />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/messages" element={<Message />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/host-profile/:id" element={<HostProfile />} />
            <Route path="/host" element={<ProtectedRoute role="host"><HostDashboard /></ProtectedRoute>} />
            <Route path="/contrato" element={<ContractView />} />
            <Route path="/secret-spots" element={<SecretSpots />} />
          </Routes>
        </motion.main>
      </AnimatePresence>

      {showWhatsApp && <FloatingWhatsApp propertyTitle={propertyTitle} />}
      {showWhatsApp && <SaltyToast propertyTitle={propertyTitle} amenities={currentProperty?.amenities} />}
      <Footer />
      {showNavbar && <Navbar />}
    </div>
  );
};

export default App;
