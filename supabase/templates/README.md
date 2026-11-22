# Correos de Orbe (Supabase Auth)

Plantillas con la marca de Orbe para los correos de inicio de sesión. Hechas para clientes de correo (Gmail, Outlook, Apple Mail): tablas, estilos en línea, texto de vista previa oculto, imágenes alojadas en la web (`public/email/`).

| Archivo | Pestaña en Supabase | Asunto | Cuándo se envía |
|---|---|---|---|
| `magic-link.html` | Magic Link | `{{ .Token }} es tu código para entrar en Orbe` | Al pedir un código con una cuenta que ya existe |
| `confirm-signup.html` | Confirm signup | `¡Bienvenido a Orbe! Tu código: {{ .Token }}` | La primera vez que alguien entra con su correo |

Variables que usan: `{{ .Token }}` (código), `{{ .ConfirmationURL }}` (botón «Entrar en Orbe»), `{{ .Email }}` y `{{ .Data.nombre }}` (nombre del perfil; la app lo guarda en `user_metadata.nombre` al entrar y al cambiarlo, y lo envía al registrarse si ya lo había escrito en la bienvenida).

## Subirlas a Supabase

1. Supabase → **Authentication → Emails**.
2. Pestaña **Magic Link**: pega el asunto de la tabla en **Subject**; en **Body** pulsa **Source**, borra todo y pega el contenido de `magic-link.html`. **Save changes**.
3. Lo mismo en **Confirm signup** con `confirm-signup.html`.

Editar las plantillas solo es posible con SMTP propio (ya configurado con Brevo).

## Ver cómo quedan

Abre el `.html` en el navegador: se ven las variables sin rellenar. Para una vista real, pide un código desde la app.

## Envío (SMTP)

- Brevo: `smtp-relay.brevo.com`, puerto `587`; usuario = «Login» de Brevo (`…@smtp-brevo.com`); contraseña = clave SMTP (`xsmtpsib-…`, no la API `xkeysib-…`). El error `535 5.7.8 Authentication failed` en los logs de Auth significa usuario o clave mal copiados.
- Remitente: `soporte.moneycare.orbe@gmail.com` (verificado en Brevo → Senders). Al ser un Gmail, Brevo lo envía como `…@brevosend.com` y Gmail no muestra la foto de perfil: hace falta un dominio propio autenticado en Brevo (SPF, DKIM, DMARC).
- Límite del plan gratuito de Brevo: 300 correos al día (compartidos con IRONLOG).
- Si cambia el dominio de la web, cambiar `https://moneycare-five.vercel.app` en las dos plantillas (imágenes y enlaces del pie).
