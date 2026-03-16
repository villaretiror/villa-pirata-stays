import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * ⚠️ GHOST COMPONENT RESOLVED — UI/UX Audit 2026-03-15
 *
 * This page previously had fully hardcoded/disconnected data:
 * - nights = 2 (hardcoded, no date state)
 * - cleaningShort = 80 (hardcoded, not from properties.fees in DB)
 * - handleConfirm → navigate('/success') via setTimeout — ZERO Supabase insert
 *
 * DECISION: Real booking flow lives in pages/Booking.tsx (fully schema-typed).
 * This component now transparently redirects to the correct flow.
 *
 * If a future "Booking Summary" page is needed post-payment, it should:
 *   - Accept a bookingId param and fetch: supabase.from('bookings').eq('id', bookingId)
 *   - Use Tables<'bookings'> from supabase_types.ts
 *   - Display: check_in, check_out, total_price, status, payment_method from the DB row
 */
const ReservationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/booking/${id}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
};

export default ReservationDetails;
