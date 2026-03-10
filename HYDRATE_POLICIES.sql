-- ============================================================
-- HYDRATE POLICIES: Villa Retiro R & Pirata Family House
-- Inyecta los datos técnicos (WiFi, Horarios, Reglas) en la nueva columna JSONB 'policies'
-- ============================================================

-- 1. Hidratar Villa Retiro R (1081171030449673920)
UPDATE public.properties SET policies = jsonb_build_object(
  'checkInTime', '4:00 PM',
  'checkOutTime', '11:00 AM',
  'maxGuests', 8,
  'wifiName', 'VillaRetiro_Starlink_Premium',
  'wifiPass', 'Tropical2024!',
  'accessCode', '4829 #',
  'cancellationPolicy', 'firm',
  'houseRules', ARRAY['No fumar en interiores', 'No fiestas ni eventos masivos', 'Horas de silencio: 10:00 PM – 8:00 AM', 'Máximo 8 huéspedes', 'Mascotas permitidas con fee adicional']
) 
WHERE id = '1081171030449673920';

-- 2. Hidratar Pirata Family House (42839458)
UPDATE public.properties SET policies = jsonb_build_object(
  'checkInTime', '4:00 PM',
  'checkOutTime', '11:00 AM',
  'maxGuests', 6,
  'wifiName', 'PirataHouse_WiFi',
  'wifiPass', 'Pirata2024!',
  'accessCode', '1776 #',
  'cancellationPolicy', 'firm',
  'houseRules', ARRAY['No fumar en interiores', 'No fiestas ni eventos masivos', 'Horas de silencio: 10:00 PM – 8:00 AM', 'Máximo 6 huéspedes', 'Mascotas permitidas con fee adicional']
) 
WHERE id = '42839458';

-- VERIFICACIÓN ✅: Las políticas ahora son dinámicas y residen en la base de datos.
