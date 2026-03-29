# 🔱 SECURITY MANIFEST: Villa & Pirata Stays (Protocolo Antigravity 6.0)

Este documento detalla la arquitectura de seguridad, integridad de datos y protocolos de resiliencia implementados para blindar la operación de **Villa & Pirata Stays**.

---

## 🔒 1. Arquitectura de Seguridad RLS (Supabase)

La base de datos utiliza **Row Level Security (RLS)** para garantizar que ningún usuario acceda a información fuera de su competencia.

### 📋 Tabla: `bookings` (Reservas)
*   **Aislamiento de Huésped:** `(auth.uid() = user_id)`. Los huéspedes solo ven sus propias reservas.
*   **Acceso Propietario (Host):** `(auth.jwt() ->> 'email') = 'villaretiror@gmail.com'`. Acceso total administrativo.
*   **Acceso Multi-Propiedad:** Validación mediante sub-query en `properties` (email del dueño) y `property_cohosts` (status active).
*   **Inserción Anónima:** Permitida para el flujo de reserva inicial (Vapi -> Checkout), pero protegida por validación de fecha/disponibilidad en el backend.

### 💰 Tabla: `earnings` (Finanzas)
*   **Restricción Total:** `(auth.jwt() ->> 'email') = 'villaretiror@gmail.com'`. Solo el Administrador Maestro puede consultar las métricas financieras globales.

### 🏠 Tabla: `properties` (Propiedades)
*   **Lectura:** Pública para visualización en el catálogo.
*   **Escritura:** `Admin Maestro Full Access`. Solo `villaretiror@gmail.com` puede modificar precios o descripciones.

### 🔗 Tabla: `synced_blocks` (Caché iCal)
*   **Soberanía de Fuente:** Los registros están indexados por `source` (Airbnb/Booking). El sistema impide que un error en una plataforma borre los bloqueos de la otra.

---

## 🛠️ 2. Blindaje de Funciones RPC (Server-Side)

Las funciones críticas se ejecutan como `SECURITY DEFINER` pero incluyen validación de identidad interna.

### `get_host_dashboard_bundle(target_email)`
*   **Verificación de Token:** Valida que el email en el JWT del llamante coincida con `target_email` o sea el admin maestro.
*   **Protección:** Evita que un huésped invoque el dashboard de administración inyectando un email ajeno.

### `get_secure_property_details(p_booking_id)`
*   **Acceso Condicional:** Verifica que `auth.uid()` sea el dueño del `booking_id`.
*   **Revelado Temporal:** Los códigos de acceso y WiFi solo se revelan si la reserva está pagada y faltan menos de 24 horas para el check-in.

---

## 🔄 3. Protocolo de Sincronía (iCal Shield)

El motor de sincronización (`api/cron/sync-ical.ts`) protege la disponibilidad contra fallos externos.

*   **Shield Fail-Safe (Bunker 6.0):** Si un feed iCal devuelve 0 bloques, el sistema **congela** los datos existentes en lugar de borrarlos. Esto previene aperturas accidentales del calendario durante caídas de la API de Airbnb/Booking.
*   **CRON_SECRET Integrity:** Todos los endpoints de cron requieren el header `x-cron-secret` para ser invocados, evitando disparos no autorizados.
*   **Purgado Histórico:** Eliminación automática de bloques con `check_out < now() - 30 days` para mantener el performance de búsqueda.

---

## 📡 4. Notificaciones & Telegram Shield

El `NotificationService.ts` implementa una capa de protección contra ráfagas de tráfico.

*   **Sequential Message Queue:** Todas las alertas de Telegram se serializan en una cola global para respetar el límite de 1 m/s.
*   **Retry con Backoff:** Si Telegram responde con un error `429 (Too Many Requests)`, el sistema aplica un retardo incremental (1s, 2s, 4s...) hasta 5 reintentos.
*   **Audit Log:** Las alertas fallidas tras 5 reintentos se guardan en `system_logs` para auditoría inmediata.

---

## 🔑 5. Variables de Entorno Críticas

El sistema depende de las siguientes variables configuradas en Vercel/Supabase (valores cifrados):

| Variable | Servicio | Función |
| :--- | :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Bypass de RLS para procesos internos (Cron). |
| `CRON_SECRET` | Backend | Protección de endpoints de sincronización. |
| `TELEGRAM_BOT_TOKEN` | Telegram | Envío de alertas al Capitán Brian. |
| `TELEGRAM_CHAT_ID` | Telegram | Canal de supervisión de Salty. |
| `RESEND_API_KEY` | Resend | Envío de correos de confirmación y pago. |
| `TWILIO_ACCOUNT_SID/TOKEN` | Twilio | Envío de Smart Links por SMS. |
| `VAPI_KEY` | Vapi (Voice) | Interacción por voz con Salty Concierge. |

---

**AUDITOR JEFE:** Antigravity AI (Google DeepMind Team)  
**FECHA DE FIRMA:** 29 de Marzo, 2026  
**PROTOCOLO:** Bunker 6.0 Ready 🔱⚓🛡️
