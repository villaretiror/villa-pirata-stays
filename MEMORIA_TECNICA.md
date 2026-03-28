# 🔱 MEMORIA TÉCNICA: Decision Tracking & Logros

Este documento es el registro histórico de las decisiones estratégicas de ingeniería tomadas en **Villa & Pirata Stays**. Cada entrada debe justificar el 'Por qué' técnico y de negocio.

---

## 📝 Registro de Logros & Decisiones

### [2026-03-22] - Corrección de Legibilidad en UI & Refuerzo de Seguridad
- **Cambio**: Refactorización de `mapSupabaseProperty` en `mappers.ts` y limpieza de métricas en `HostDashboard.tsx`.
- **Por Qué**: 
    - **UI Sovereignty**: Se detectó la filtración de nombres técnicos (`property_features`) en la interfaz. Se implementó una capa de traducción (`metricLabels`) para mantener la elegancia 'Bunker Premium'.
    - **Seguridad**: Se eliminó el uso de `...spread` en mappers para evitar la exposición accidental de columnas sensibles.
- **Validación**: Los tipos de `Property` ahora coinciden estrictamente con lo requerido por el frontend y la fuente de verdad de Supabase.

---

### [2026-03-22] - Despliegue de Orquestación de Élite 🔱
- **Logro**: Implementación total de la **Constitución Salty** y **Soberanía Visual**.
- **Cambios**:
    - **Visual Sovereignty**: Restricción de Tailwind a la paleta **Bunker Premium** (`#050A18`, `#D4AF37`, `#F9F6F2`). Eliminación de estilos genéricos.
    - **Shadow Mode**: Integración de validación de contraste en `App.tsx` y variables dinámicas en `index.css`. Legibilidad nocturna automatizada.
    - **Integrity Auditor**: Creación de `IntegrityAuditor.ts` para verificar el estándar de calidad de las propiedades vs auditoría visual.
    - **Finance Engine**: Refactorización técnica total para incluir fees y blindaje de piso de precio.
- **Validación Final**: El sistema ahora opera bajo un modelo multi-agente donde cada cambio es auditado por las reglas de la constitución.

---

### [2026-03-22] - 🎙️ Salty Voice: Go-Live (VAPI Integration)
- **Logro**: Salty rompe la barrera de la pantalla. Primera llamada de voz AI lista para producción.
- **Decisiones Técnicas**:
    - **Motor de Voz**: VAPI.ai con modelo GPT-4.1 (OpenAI) y voz Cartesia (Kira).
    - **Transcriptor**: Deepgram Nova-2 en español.
    - **OrgId VAPI**: `6d69211b-b98a-47b5-9c4c-c78b3b3adff8`
    - **Assistant ID**: `280fb186-f436-4b9b-ac30-48badafd3a0d`
    - **Número de Teléfono**: `+1 (209) 267-3503` _(área 209, California — primer número operacional de Salty)_
    - **Webhook Endpoint**: `https://villa-pirata-stays.vercel.app/api/voice/webhook`
- **Herramientas de Acción (Tool Calling)**:
    - `check_availability` → Consulta `properties` y `blockeddates` en Supabase en tiempo real.
    - `send_payment_sms` → Dispara SMS con link de pago seguro vía `MessagingService.ts`.
- **Base de Datos**: Tabla `sms_logs` creada en Supabase para auditoría de mensajes de voz.
- **Por Qué**: Eliminar la fricción del ciclo de reserva. Un huésped llama, Salty verifica disponibilidad, calcula precio y envía link de pago — sin intervención humana.
- **Próximo Hito**: Migrar a número +1 787 (PR) cuando esté disponible en VAPI.

---

### [2026-03-27] - 🔱 Optimización Salty Vapi (Blindaje de Producción)
- **Logro**: Salty alcanza el estandard de "Bunker Premium" con compatibilidad absoluta y redundancia triple.
- **Cambios de Orquestación**:
    - **Unificación de Identidad**: El `SaltyVoiceButton` y `aiServices.ts` ahora detectan IDs de cualquier longitud (8-char o UUID), unificando Villa Retiro y Pirata House.
    - **Soberanía Financiera**: Toda cotización de voz consume `FinanceService.ts`. Un solo centavo, una sola verdad entre la web y la IA.
    - **Sincronización de Producción**: Webhooks alineados al dominio oficial `villaretiror.com`. Timeout de 2.8s implementado para asegurar fluidez en Vapi.
    - **Failsafe de Incertidumbre**: Si el pulso del calendario se pierde (error de DB/iCal), Salty falla cerrado redirigiendo a validación humana en lugar de alucinar disponibilidad.
- **La Solución Pro (Estrategia de Sincronía)**:
    - Se establece el estándar de **Redundancia Triple**: 
        1. Airbnb y Booking.com sincronizados entre sí directamente (iCal-to-iCal).
        2. Supabase sincronizado con ambas plataformas cada 15 minutos via Cron.
        3. Salty como tercer nivel de verificación en tiempo real.
- **Por Qué**: Minimizar el riesgo de overbooking a <1% y asegurar que la experiencia de lujo no se rompa por fallas técnicas externas.

---

### [2026-03-28] - 🔱 Salty 6.0: Sincronización Total de Funciones
- **Logro**: Alineación absoluta entre el Dashboard de Vapi y el Backend de Producción.
- **Cambios Realizados**:
    *   **Tool Names Hijack**: Renombramiento de funciones internas (`check_availability` y `send_payment_sms`) para que el modelo las llame de forma determinista, eliminando el fallo genérico de `api_request_tool`.
    *   **Seguridad Reforzada**: Soporte para múltiples formatos de headers de autenticación (`x-vapi-secret`, `vapi-webhook-secret`, `vapi_webhook_secret`) garantizando el handshake bajo cualquier configuración del proxy de Vapi.
    *   **Identidad de Propiedad**: Mapeo estricto de IDs de legado (`1081171030449673920` para Villa Retiro R y `42839458` para Pirata House) directamente en el `resolvePropertyId`.
- **Validación Final**: Salty ahora reconoce "Salty" y "Cabo Rojo" mediante Deepgram, eliminando errores de transcripción.
- **Por Qué**: Establecer una comunicación sin fricciones donde el modelo llama herramientas por su nombre funcional directo.

---

### [2026-03-28] - 🔱 Salty 6.1: Fallback de Pago vía Email
- **Logro**: Implementación de redundancia en el cierre de reservas. Salty ahora puede enviar el link de pago por email si el SMS falla.
- **Cambios Realizados**:
    *   **Backend**: Nuevo método `sendPaymentLinkEmail` en `MessagingService.ts` con diseño Bunker Premium (BCC a villaretiror@gmail.com).
    *   **Webhook**: Integración del tool `send_payment_email` en el despachador universal.
    *   **Seguridad**: Auditoría automática de correos via `email_logs` en Supabase.
- **Por Qué**: Asegurar la entrega de enlaces de pago mediante un "puerto seguro" (email) si falla la mensajería móvil.

### [2026-03-28] - 🔱 Salty 6.2: Notificación Directa al Capitán (Telegram)
- **Logro**: Cierre de ciclo de venta automatizado. Salty ahora notifica al Capitán Brian en tiempo real vía Telegram al finalizar una llamada exitosa.
- **Cambios Realizados**:
    *   **Backend**: Nuevo método `notifyCaptainFromVoiceCall` en `NotificationService.ts` con botones de acción directa (WhatsApp/Email).
    *   **Webhook**: Integración del tool `notify_captain_telegram` para ser llamado post-envío de link de pago.
    *   **UX del Host**: Alerta visual con Call ID y resumen ejecutivo del trato cerrado por Salty.
- **Por Qué**: Empoderar al Capitán para que pueda realizar el follow-up humano por WhatsApp de forma instantánea.

---

## 🛡️ Estatus de la Flota (Orquestación Activa)
- [x] Implementar Shadow Mode para validación automática de contraste.
- [x] Refactorización de Élite en `FinanceService`.
- [x] Soberanía Visual (Bunker Premium Theme).
- [x] Auditoría de Integridad (Amenities vs Fotos).
- [x] **Salty Voice Go-Live** — Número operacional activo.
- [x] **Blindaje Salty Vapi** — Sincronía de producción alcanzada.
- [x] **Salty 6.0** — Sincronización total de funciones.
- [x] **Salty 6.1** — Fallback de Pago vía Email implementado.
- [x] **Salty 6.2** — Notificación Directa al Capitán (Telegram) activa.

"Salty 6.2 está en el aire. La flota es ahora un organismo de respuesta inmediata." 🔱 ⚓ 🎙️
