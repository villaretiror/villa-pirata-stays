# 🩺 Reporte de Diagnóstico: Motor de Reservas y Sincronía (Deep Audit)

**Rol:** Full-stack Engineer & Algorithmic Specialist  
**Misión:** Radiografía exhaustiva de la lógica de fechas, calendarios y sincronización cruzada (Zero-Trust/iCal) en Villa Retiro R.  

Tras sumergirme en las entrañas del sistema (`BookingCalendar.tsx`, `useAvailability.ts`, `CalendarSyncService.ts` y las funciones Cron), el veredicto es claro: la estructura base es sólida y vanguardista, pero **existen vulnerabilidades críticas de Huso Horario (Timezone)** que pueden provocar "Desfases de 1 día" dependiendo de dónde se encuentre el usuario y cómo mande los datos el sistema externo (Airbnb/Booking.com).

A continuación, la radiografía detallada.

---

## 🚨 1. Lista de Bugs Identificados (Clasificación)

### 🔴 CRÍTICO: "El Huésped Viajero en el Tiempo" (Timezone Shift en Frontend)
*   **Contexto:** En tu archivo `useAvailability.ts`, la función `isRangeAvailable` hace esto para comparar si el usuario escoge fechas válidas:  
    `const sStr = start.toISOString().split('T')[0];`
*   **El Bug:** El objeto `Date` del calendario almacena la fecha a las `00:00:00` en la *hora local del dispositivo del usuario*. Al llamar a `.toISOString()`, JavaScript fuerza la conversión a formato UTC (Londres). 
*   **El Letal Resultado:** Si un turista en España (UTC+1 o +2) intenta reservar en Villa Retiro R para el `25 de Abril`, su objeto de fecha es `25 de Abril 00:00:00 (Hora Madrid)`. Al aplicarle `toISOString()`, JavaScript resta las horas y lo convierte a `24 de Abril 22:00:00 UTC`. ¡El validador de código leerá "24 de Abril" y buscará conflictos en el día erróneo! Si el 24 estaba ocupado, bloqueará su reserva del 25.

### 🔴 CRÍTICO: "Destrucción Ciega del Reloj iCal" (Cálculo Inexacto en Backend)
*   **Contexto:** En `CalendarSyncService.ts`, al analizar el archivo `.ics` de Airbnb o Booking, usas una expresión regular drástica:  
    `const startRaw = dtStart.replace(/T.*/, '').trim();`
*   **El Bug:** La mayoría de plataformas como Airbnb envían "Eventos de Día Completo" (`DTSTART;VALUE=DATE:20260401`), el cual el código procesa perfecto. Sin embargo, VRBO, Houfy o Booking.com a veces envían la fecha con la hora base en UTC (ej: `DTSTART:20260402T020000Z`).
*   **El Letal Resultado:** Al simplemente cortar lo que está después de la `T`, el sistema registrará `20260402` ignorando que a las `02:00:00 Z` (UTC) en realidad es el `1 de Abril a las 22:00` en Puerto Rico. La propiedad se mostrará como ocupada un día después del real.

### 🟡 MEDIANO: "La Ventana Fantasma" (El lag de iCal)
*   **Contexto:** El motor `api/cron/sync-ical.ts` tiene la lógica *Atomic Vision*, bloqueando inteligentemente sin borrar historiales.
*   **El Bug:** Ese script debe ejecutarse mediante una tarea programada (Ej: GitHub Actions, Vercel Cron). Si el Cron corre cada 1 o 2 horas, existe un "lag" o *Ghost Window*. 
*   **Riesgo de Overbooking:** Alguien descubre la villa en Airbnb y la alquila a las 2:15 PM. Otro huésped entra a tu web directa a las 2:20 PM. Como el Cron no ha corrido, tu UI lo muestra libre. El cliente web paga con tarjeta (mediante el nuevo Serverless Payment) ¡y genera un overbooking confirmado real!

### 🟢 COSMÉTICO/UX: "Inconsistencia de UX de iOS y Check-outs"
*   **Contexto:** `BookingCalendar.tsx` maneja fenomenal el "turnover" (permite que un día sea Checkout para María y Check-in para Pedro porque evalúa rangos excluyentes en `requestedRange`). 
*   **Fricción UX:** Al no limitar a *click simple inteligente* en móviles, Safari en iOS puede requerir "doble-taps" incómodos. Aunque el calendario no se cierra de golpe, la interacción en pantallas estrechas requiere precisión para arrastrar el selector de "Rango".

---

## 🗺️ 2. Fallas Absolutas de Lógica de Fechas (Resumen Técnico)
*   **"Timezone Agnostic Formatting":** El Frontend no está congelando el tiempo en *"AST (Atlantic Standard Time)"* antes de enviarlo a comparar. Aunque la UI visual tiene un mini label `Sincronía AST`, la variable de código en RAM está expuesta a la zona horaria física de la tarjeta de red del celular o computadora del cliente.
*   **"Off-by-One" por .ISOString:** El método para convertir una fecha de vuelta a `Y-M-D` debe ejecutarse a través de `date-fns` mediante `format(date, 'yyyy-MM-dd')` o funciones que usen `getUTCFullYear()` tras inyectar la calibración, NUNCA con `.toISOString()`.

---

## 🛠️ 3. Hoja de Ruta de Reparación (Prioridad Quirúrgica)

Para estabilizar este núcleo y que Villa Retiro R sea "Enterprise-Ready" y no caiga en juicios por rescisión de contratos por cruces de fechas:

1.  **Fase 1: Aplicar Inmunidad de Huso Horario al Frontend (Urgente):**
    *   Editar `useAvailability.ts` y cambiar todos los usos de `date.toISOString().split('T')[0]` por lógica local blindada como `format(date, 'yyyy-MM-dd')` (ya tienes `date-fns` instalado).
    *   Esto garantizará que un cliente en Londres no "vea" ni reserve los días corridos un cuadro hacia atrás en la matriz de memoria.

2.  **Fase 2: Construir un `ICal Date Resolver` en el backend (Crítico):**
    *   Revisar `CalendarSyncService.ts`. Si detecta una "T", en lugar de cortar, debería pasar esa cadena completa de ISO a una fecha real de Javascript y formatear `Y-M-D` tomando la zona horaria del Caribe `-04:00` (hora local de PR, no UTC) para saber qué día natural le corresponde.

3.  **Fase 3: Destruir a la Bestia "Ventana Fantasma" (El Cierre del Círculo Zero-Trust):**
    *   Tenemos tu pasarela de Stripe (¡la que creamos hoy!) con backend directo. En `/api/create-payment-intent.ts`, JUSTO ANTES de decirle a Stripe que procese la carta, debemos ejecutar allí mismo un "Ping Dinámico de iCal" rápido u obtener un `isRangeAvailable` del backend (que no hemos creado, usamos la validación local). 
    *   Esto actúa como un Segurata de Discoteca: "Antes de cobrarte los $1,500, dame 200 milisegundos para verificar que Airbnb no lo acaba de vender".

---

**Capitán, el motor requiere calibración de tiempo. ¿Por dónde ordenas comenzar la operación? ¿Aseguramos primero el Huso Horario del Frontend (Fase 1) o protegemos el "Fantasma de Overbooking" en el backend (Fase 3)?**
