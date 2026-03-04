import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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

  // Determine if we should show FloatingWhatsApp
  const isHostView = location.pathname.startsWith('/host');
  const isMessagesView = location.pathname.startsWith('/messages');
  const isProfileView = location.pathname.startsWith('/profile');
  const isDetailsView = location.pathname.startsWith('/property/');
  const isBookingView = location.pathname.startsWith('/booking/');

  // Get property title for WhatsApp if on details/booking
  let propertyTitle: string | undefined;
  if (isDetailsView || isBookingView) {
    const id = location.pathname.split('/').pop();
    const property = properties.find(p => p.id === id);
    propertyTitle = property?.title;
  }

  return (
    <div className="font-sans text-text-main bg-sand min-h-screen">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/property/:id" element={<PropertyDetails />} />
        <Route 
          path="/booking/:id" 
          element={
            <ProtectedRoute>
              <Booking />
            </ProtectedRoute>
          } 
        />
        <Route path="/success" element={<Success />} />
        <Route path="/reservation/:id" element={<ReservationDetails />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/host" 
          element={
            <ProtectedRoute role="host">
              <HostDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>

      {/* Floating Utilities */}
      {!isHostView && !isMessagesView && !isProfileView && (
        <FloatingWhatsApp propertyTitle={propertyTitle} />
      )}

      {/* Persistent Navigation */}
      <Navbar />
    </div>
  );
};

export default App;
