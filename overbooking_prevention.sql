-- VALIDACIÓN DE RESERVAS: PREVENIR OVERBOOKING
-- Copia y pega esto en el SQL Editor de Supabase

-- 1. Función para verificar disponibilidad de fechas
CREATE OR REPLACE FUNCTION public.check_booking_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si hay alguna reserva confirmada que se solape con las nuevas fechas
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE property_id = NEW.property_id
    AND status = 'confirmed'
    AND (
      (NEW.check_in >= check_in AND NEW.check_in < check_out) -- Fecha de inicio dentro de otra reserva
      OR (NEW.check_out > check_in AND NEW.check_out <= check_out) -- Fecha de fin dentro de otra reserva
      OR (NEW.check_in <= check_in AND NEW.check_out >= check_out) -- La nueva reserva envuelve a una existente
    )
  ) THEN
    RAISE EXCEPTION 'Las fechas seleccionadas ya están ocupadas por otra reserva.';
  END IF;

  -- 2. Verificar contra fechas bloqueadas manualmente por el Host
  IF EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = NEW.property_id
    AND (
      NEW.check_in::text = ANY(blocked_dates)
      OR NEW.check_out::text = ANY(blocked_dates)
    )
  ) THEN
    RAISE EXCEPTION 'Una de las fechas seleccionadas ha sido bloqueada manualmente por el anfitrión.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger para ejecutar la validación antes de insertar una reserva
DROP TRIGGER IF EXISTS tr_check_booking_availability ON public.bookings;
CREATE TRIGGER tr_check_booking_availability
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE PROCEDURE public.check_booking_availability();
