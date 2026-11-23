# Orbe · Revisión de seguridad (pentest)

**Fecha:** 23 de noviembre de 2026 · **Alcance:** la web en producción (`moneycare-five.vercel.app`), la base de datos de Supabase vista desde fuera, la API del cron y todo el código del repositorio.

**Cómo se hizo:** como lo haría un atacante, con la clave pública que va dentro de la app (sin la `service_role` ni contraseñas). En producción solo pruebas de lectura o inofensivas: sin ataques de carga ni cambios en los datos de los usuarios. Las correcciones de la base de datos se probaron antes en un Postgres local (PGlite).

## Resultado

No se ha encontrado ninguna forma de leer, cambiar ni borrar los datos de otra persona. Sí había puntos débiles en los recordatorios y faltaban cabeceras de seguridad; están corregidos.

| # | Hallazgo | Riesgo | Estado |
|---|---|---|---|
| 1 | Los recordatorios aceptaban cualquier URL como servicio de notificaciones: el cron de la web enviaba peticiones a donde quisiera quien la registrase, y los avisos admitían textos de cualquier tamaño y enlaces a otras webs | Medio | Corregido: migración `20261201000000_push_hardening.sql` y filtro en `app/api/push/cron` |
| 2 | Conociendo la dirección de avisos de un usuario con cuenta, otro podía cambiar o borrar sus recordatorios (p. ej. para enviarle un aviso falso) | Medio (difícil: esa dirección es secreta) | Corregido en la misma migración |
| 3 | Sin `Content-Security-Policy` ni protección contra *clickjacking* (meter la app dentro de otra web) | Medio | Corregido: cabeceras en `next.config.ts` |
| 4 | Al pulsar una notificación se podía abrir otra web | Bajo | Corregido: `public/sw.js` solo abre páginas de Orbe |
| 5 | Exportar a CSV: una nota que empiece por `=`, `+`, `-` o `@` se ejecutaba como fórmula en Excel | Bajo | Corregido: se antepone un apóstrofo |
| 6 | `shadcn` (herramienta de desarrollo con 4 avisos moderados) estaba entre las dependencias de producción | Bajo | Movido a `devDependencies`: `npm audit --omit=dev` = 0 vulnerabilidades |

## Lo que se comprobó y está bien

- **Datos de usuarios (RLS):** las 16 tablas y las 3 vistas rechazan cualquier lectura o escritura sin sesión (`permission denied`). Con sesión, cada política exige `auth.uid() = user_id` al leer, crear, editar y borrar; las vistas usan `security_invoker`.
- **Funciones:** `delete_my_account` cerrada a anónimos; las del cron (`orbe_push_due`, `orbe_push_gone`) exigen un secreto de 64 caracteres aleatorios que no está en el repositorio; las internas no se pueden llamar desde fuera.
- **Esquema privado** (`orbe_private`, con las claves VAPID) no expuesto. GraphQL desactivado. El esquema de la API (OpenAPI) solo con clave secreta.
- **Inicio de sesión:** solo por correo con código (sin contraseñas que robar), sin usuarios anónimos ni proveedores externos, con confirmación de correo.
- **API del cron:** sin secreto → 401, secreto falso → 403, `GET` → 405.
- **Web:** HTTPS con HSTS (preload); no se publican mapas de código ni archivos internos (`.env`, `.git`, `supabase/private`, `package.json`…); sin `dangerouslySetInnerHTML`, `eval` ni HTML sin escapar; React escapa todo lo que escribe el usuario.
- **Secretos:** ninguno en el historial de git (solo se mencionan en la documentación). `.env*` y `supabase/private/` fuera del repositorio.

## Pendiente (lo tiene que hacer el titular)

1. **Ejecutar** `supabase/migrations/20261201000000_push_hardening.sql` en el SQL Editor de Supabase.
2. **Supabase › Authentication › Rate Limits:** dejar límites bajos para el envío de códigos (p. ej. 30 correos/hora) para que nadie gaste el cupo de Brevo.
3. **Opcional:** activar CAPTCHA (Turnstile) en Authentication si aparecen registros falsos.
4. **Repetir esta revisión** cada vez que se añada una tabla, una función o un proveedor nuevo.
