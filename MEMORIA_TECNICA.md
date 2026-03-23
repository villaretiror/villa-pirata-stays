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

## 🛡️ Estatus de la Flota (Orquestación Activa)
- [x] Implementar Shadow Mode para validación automática de contraste.
- [x] Refactorización de Élite en `FinanceService`.
- [x] Soberanía Visual (Bunker Premium Theme).
- [x] Auditoría de Integridad (Amenities vs Fotos).
- [x] **Salty Voice Go-Live** — Número `+1 (209) 267-3503` · VAPI · Cartesia · Deepgram · Tool Calling activo.

"Estrategia de Negocio Blindada y Excelencia Operativa Alcanzada. Salty ahora tiene voz." 🔱
