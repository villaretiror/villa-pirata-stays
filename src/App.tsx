// Deploy trigger: 2026-03-12-1400
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

// 🚀 Performance Optimization: Lazy Loading routes to reduce initial bundle size (from 1MB+ to 100KB chunks)
const Home = lazy(() => import('./pages/Home'));
const PropertyDetails = lazy(() => import('./pages/PropertyDetails'));
const Booking = lazy(() => import('./pages/Booking'));
const Success = lazy(() => import('./pages/Success'));
const Login = lazy(() => import('./pages/Login'));
const HostDashboard = lazy(() => import('./pages/HostDashboard'));
const ReservationDetails = lazy(() => import('./pages/ReservationDetails'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Message = lazy(() => import('./pages/Messages'));
const Profile = lazy(() => import('./pages/Profile'));
const ContractView = lazy(() => import('./pages/ContractView'));
const HostProfile = lazy(() => import('./pages/HostProfile'));
const SecretSpots = lazy(() => import('./pages/SecretSpots'));
const StayDashboard = lazy(() => import('./pages/StayDashboard'));

// Static Components (Keep for fast initial UI)
import Navbar from './components/Navbar';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import SaltyToast from './components/SaltyToast';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { useProperty } from './contexts/PropertyContext';
import { supabase } from './lib/supabase';
import CustomCursor from './components/CustomCursor';

// ⏳ Shell Loading Component for Suspense (Elite Branding)
const PageLoader = () => (
  <div className="fixed inset-0 bg-[#fdfcfb] flex flex-col items-center justify-center z-[9999]">
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center"
    >
      <div className="relative mb-6">
        <span className="font-serif italic font-black text-5xl tracking-tighter text-[#1a1a1a]">VRR</span>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '140%' }}
          transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute -bottom-1 -left-[20%] h-[2px] bg-[#BBA27E]"
        />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a]"
          />
        ))}
      </div>
    </motion.div>
  </div>
);

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
    console.log(`[App] Navigating to: ${location.pathname}`);
    window.scrollTo(0, 0);

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

    return () => {
      // Cleanup logic if needed
    };
  }, [location.pathname, propertyTitle]);

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
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </motion.main>
      </AnimatePresence>

      {showWhatsApp && <FloatingWhatsApp propertyTitle={propertyTitle} />}
      {showWhatsApp && <SaltyToast propertyId={currentProperty?.id} propertyTitle={propertyTitle} amenities={currentProperty?.amenities} />}
      <Footer />
      {showNavbar && <Navbar />}
      <CustomCursor />
    </div>
  );
};

export default App;
