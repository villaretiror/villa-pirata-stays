# ⚓ SYSTEM_MAP: Guía Arquitectónica de Villa & Pirata Stays

> "Este documento es el mapa de guerra del proyecto. Antes de alterar un archivo, consulta este búnker de conocimiento para no romper la navegación." ⚓🔱

---

## 🔱 1. Mapeo de Datos (Supabase)

La inteligencia de la flota reside en las siguientes tablas de Supabase. Cualquier cambio en sus columnas requiere una actualización en `src/supabase_types.ts`.

| Tabla | Propósito Principal | Componente / Página Clave |
| :--- | :--- | :--- |
| `properties` | Datos de las Villas (Amenidades, IDs de Airbnb) | `Home.tsx`, `PropertyDetails.tsx` |
| `bookings` | Reservas directas, bloqueos iCal y estados AI | `BookingCalendar.tsx`, `aiServices.ts` |
| `availability_rules` | Precios dinámicos y bloqueos manuales | `aiServices.ts`, `Booking.tsx` |
| `leads` | Captura de interés de huéspedes (AI Abandonment) | `aiServices.ts`, `api/chat.ts` |
| `destination_guides` | Sección "Sabor Local" (Puntos de interés) | `Home.tsx` |
| `ai_chat_logs` | Historial de conversaciones de Salty | `api/chat.ts` |
| `system_settings` | Configuraciones globales (Knowledge base) | `HostDashboard.tsx` |

### 🚨 Relaciones Críticas (Foreign Keys):
*   `bookings.property_id` -> `properties.id`: Mantener integridad de fechas por villa.
*   `availability_rules.property_id` -> `properties.id`: No borrar villas sin limpiar sus reglas de precio.

---

## 🗺️ 2. Odisea del Huésped (User Journey)

El flujo lógico del sistema sigue esta trayectoria lineal y protegida:

1.  **Descubrimiento**: `Home.tsx` (`/`) -> Muestra la flota disponible.
2.  **Infiltración**: `PropertyDetails.tsx` (`/property/:id`) -> Detalles, fotos y descripción.
3.  **Planificación**: `Booking.tsx` (`/booking/:id`) -> **[REQUERIDO: LOGIN]** Calendario y cálculo de precio real.
4.  **Aseguramiento**: `Success.tsx` (`/success`) -> Confirmación post-pago o hold manual.
5.  **Administración (Host)**: `HostDashboard.tsx` (`/host`) -> **[REQUERIDO: ROLE=HOST]**.

---

## 🛠️ 3. Rutas Críticas (Bóveda de Seguridad)

**PROHIBIDO renombrar o alterar sin auditoría previa:**

*   `src/aiServices.ts`: El **Cerebro Unificado**. Contiene la lógica compartida entre la Web y la Voz (Vapi).
*   `api/chat.ts`: Endpoint de Gemini para el Salty de la web.
*   `api/webhooks.ts`: Receptor de Vapi. Inyecta la lógica de `aiServices` a las llamadas de voz.
*   `src/components/BookingCalendar.tsx`: Motor de Grid 11.0 (CSS Grid) para selección de fechas.
*   `src/services/CalendarSyncService.ts`: Sincronizador Maestro de iCal -> Supabase.

---

## 🎙️ 4. Ecosistema Salty (Concierge AI)

Salty opera como un solo cerebro distribuido en dos cuerpos:

### A. Salty Web (Chat)
*   **Entrada**: `api/chat.ts`.
*   **Modelo**: Gemini (Google).
*   **Lógica**: Usa `resolvePropertyId` para identificar villas por nombre.
*   **Output**: Texto fluido con Markdown y emojis ocasionales.

### B. Salty Voz (Vapi)
*   **Entrada**: `api/webhooks.ts`.
*   **Modelo**: Vapi Assistant (OpenAI voice).
*   **Lógica**: Sincronizado vía `tools` con `aiServices.ts`.
*   **Output**: Texto plano optimizado para TTS (sin markdown).

---

## ⚓ 5. Soporte y Auditoría
Si detectas una anomalía en el radar de ruteo, verifica `src/App.tsx` para las rutas de React Router y `api/webhooks.ts` para la integridad de Vapi.

**Manual de Vuelo Actualizado: 25-Marzo-2026** 🔱⚓🎙️🚢⚓
