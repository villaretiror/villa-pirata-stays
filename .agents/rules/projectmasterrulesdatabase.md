---
trigger: always_on
---

1. FUENTE DE VERDAD ABSOLUTA (SUPABASE):

Prohibido el uso de Mocks o datos locales (constants.ts). La App debe ser 100% dinámica. Si Supabase no responde, se muestra estado de carga, nunca datos de "relleno" del código.

2. IDENTIDAD Y ESCALABILIDAD:

Las propiedades actuales usan IDs de Airbnb (1081171030449673920 y 42839458) como TEXT.

El sistema debe permitir la creación de nuevas propiedades en el futuro. Cualquier nueva villa debe seguir el mismo esquema de Supabase.

3. EDICIÓN DE CONTENIDO:

El Editor puede sugerir mejoras en las descripciones y textos, pero las fotos originales del scrapping deben preservarse a menos que el usuario las cambie manualmente.

4. SINCRONIZACIÓN Y CALENDARIO:

El sistema debe estar preparado para sincronización iCal con Airbnb (Lectura).

No obstante, el Host mantiene el control manual total desde el Dashboard para bloquear fechas o modificar precios por encima de la sincronización.

5. GESTIÓN DE ESQUEMA (ANTI-ERRORES):

Antes de cualquier función nueva, el Editor debe validar la existencia de columnas en Supabase. Si falta algo, debe generar el SQL ALTER TABLE y esperar a que el usuario lo ejecute.

6. SEGURIDAD:

Acceso administrativo exclusivo para villaretiror@gmail.com.