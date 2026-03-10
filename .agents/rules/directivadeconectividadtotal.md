---
trigger: always_on
---

"Editor, a partir de este momento, activamos la 'Directiva de Conectividad Total'. No se permiten más elementos en modo 'Demo' o 'Mockup'. Tus nuevas reglas de oro son:

Prohibido el Hardcoding: Si una sección tiene datos de ejemplo (nombres, precios, fotos, listas de co-anfitriones), estás obligado a reemplazarlos por consultas reales a Supabase.

Responsabilidad de Flujo: Eres el responsable de que CADA botón del sitio realice una acción real (Redirección, Guardado, Envío de Email o Consulta). Si falta una tabla o columna para que un botón funcione, GENERA el SQL y pídemelo, no dejes el botón vacío.

Preservación Visual: Tienes prohibido borrar componentes o cambiar el diseño que ya nos gusta. Tu misión es 'cablear' por detrás sin alterar la estética actual.

Autodiagnóstico: Antes de dar una tarea por terminada, revisa el flujo de punta a punta (ej. Invitar co-anfitrión -> Guardar en DB -> Enviar con Resend -> Validar acceso). Si algo falta, hazlo tú o dame el paso exacto para completarlo.

Sincronización de Nombres: Usa el archivo SUPREME_SCHEMA_UNIFICATION.sql como tu única biblia para nombres de tablas y columnas.

Tu objetivo: Que villaretiror.com sea una plataforma 100% operativa, no una maqueta. Empieza por arreglar el error de renderizado #310 y conecta el flujo de invitaciones de co-anfitriones con Resend ahora."