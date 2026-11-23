# Orbe (MoneyCare) — memoria de proyecto y traspaso

Este documento sirve para que una persona o asistente pueda retomar Orbe sin depender de conversaciones anteriores. Resume el estado del código, las decisiones tomadas y lo que queda pendiente. Manténlo actualizado al completar cambios importantes.

**Hoja de ruta completa**: `Mejoras_Futuro.md`. Aquí solo queda lo que ya existe, lo decidido y lo pendiente inmediato.

**Diario del proyecto**: `avances.md` (qué se hizo cada día). Al cerrar una sesión, añadir allí una entrada además de actualizar este archivo.

## Límites de este registro

- El historial de git empieza en `0d08746` (2026-11-18, «Añadir web Mis Finanzas»): una versión HTML de un solo archivo (`public/mis-finanzas.html`), que después se reconstruyó en Next.js (`41f62ca`, 2026-11-19). Lo anterior no tiene registro.
- Lo que no esté en el código, en `git log` o aquí no se puede reconstruir: no inferirlo.

## Producto

Orbe es una app de finanzas personales en español (España, euros) para móvil, tablet y escritorio. Nombre en la web: **Orbe · Control financiero**; el dominio de Vercel y el correo de soporte usan **MoneyCare** (`moneycare-five.vercel.app`, `soporte.moneycare.orbe@gmail.com`).

- Usuario de referencia: cobra una nómina de 830–930 € netos que varía con el IRPF y las horas extra, y trabaja por turnos rotativos (una semana de jueves a domingo, la siguiente de viernes a domingo).
- Identidad visual (paleta del usuario): `#E5F9F8`, `#1F2B2D`, `#23717B`, `#0D8A9E`, `#12B2C1`, con un dorado de acento `#F2B84B` inspirado en la referencia «Finora Finance» (tarjeta de saldo grande, barras por día, actividad reciente, navegación inferior con botón central). Ingresos `#0B8FA3` y gastos `#B87A12` (claro) / `#139FAE` y `#BD8420` (oscuro), validados para daltonismo y contraste con el validador de la skill `dataviz`. Todos los colores son tokens en `app/globals.css` (`:root` y `.dark`): cambiar ahí, no clase a clase.
- Tipografías: Sora (`font-heading`, títulos e importes), Inter (texto), Instrument Serif cursiva (consejos), Geist Mono (`font-mono`, el «ticket del mes»).
- Marca: logo «anillo luminoso con barras» (`components/finanzas/logo.tsx`, `public/icons/`, `app/icon.svg`); motivo de órbita animada en las tarjetas principales (`OrbitDeco`).
- **Orbi**: mascota original (robot de casco blanco y visor oscuro con anillo cian, inspirado en una imagen de referencia del usuario, sin copiarla). Tiene caras (idle, happy, wave, think, wow), parpadeo y propulsor.

## Repositorio y despliegue

- GitHub (**público**): https://github.com/jacobmelendezjm-tech/Control-Financiero. Rama por defecto: `claude/deploy-finanzas-github-vercel-o8097c`; también existe `main`. **Se suben las dos** en cada cambio (`git push origin main` y `git push origin main:claude/deploy-finanzas-github-vercel-o8097c`).
- Vercel: https://moneycare-five.vercel.app/ — creado por el usuario y conectado al repositorio; cada push despliega solo (comprobado el 2026-11-22). No hay sesión de Vercel en este equipo ni CLI con sesión: lo del panel lo hace el usuario. La conexión de Vercel de Claude existe pero necesita que el usuario autorice el equipo `jacob14-416e`.
- Para comprobar un despliegue desde fuera: Next 16 sirve los JS en `/_next/static/immutable/chunks/`.
- Flujo: cambiar código → `npm run lint`, `npx tsc --noEmit`, `npm run build` → commit → push a las dos ramas → Vercel despliega.

## Stack, ejecución e instrucciones

- Next.js 16.4.5 (App Router, Turbopack), React 19.3, TypeScript, Tailwind CSS 4, shadcn/ui sobre `@base-ui/react`.
- `@supabase/supabase-js`, `next-themes`, `lenis`, `lucide-react`, `sonner`.
- Dependencias: `npm install`. Local: `npm run dev` (http://localhost:3000). Scripts: `lint`, `typecheck`, `build`, `start`, `format`.
- `AGENTS.md` tiene las instrucciones del proyecto (`CLAUDE.md` solo lo referencia). Para cambios de Next.js, leer la documentación de la versión instalada en `node_modules/next/dist/docs/` (esta versión tiene cambios: p. ej. archivos en `/_next/static/immutable/`).
- `next.config.ts`: cabeceras de seguridad básicas y `sw.js` sin caché.
- En este equipo, los comandos de Bash con heredocs muy largos a veces fallan («unexpected EOF»): escribir el archivo con el editor y ejecutarlo después.

## Supabase

- Proyecto `vocggmajzqagykrojwkx` (https://vocggmajzqagykrojwkx.supabase.co), región Europa.
- Claves: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (no se sube) y **por defecto en `lib/supabase.ts`** (la publishable es pública; así Vercel funciona sin variables). Nunca usar la `service_role`.
- Migraciones (`supabase/migrations/`, a mano en el SQL Editor, idempotentes y en transacción; el aviso de «operaciones destructivas» es por los `drop … if exists` y no borra datos; si Supabase ofrece «Run and enable RLS», se puede aceptar):
  1. `20261122000000_orbe_finance_data.sql` — tabla antigua `finance_data` (un JSON por usuario) y `delete_my_account()`. **Aplicada** (comprobado el 2026-11-22).
  2. `20261123000000_orbe_schema.sql` — esquema relacional completo. **Aplicada** (comprobado el 2026-11-22).
  3. `20261124000000_profiles_email.sql` — `profiles.email` mantenido por triggers. **Aplicada** (comprobado el 2026-11-22).
- Modelo, seguridad, vistas y algoritmo de sincronización: `supabase/README.md`. Resumen: 11 tablas con clave `(user_id, id)`, importes en céntimos, borrado lógico (`deleted_at`), `updated_at` por trigger, RLS en todas, perfil y `work_settings` automáticos al registrarse, vistas `v_resumen_mensual`, `v_gasto_por_categoria`, `v_horas_mensuales`, Realtime activado.
- Probado en local con PGlite imitando Supabase (23 comprobaciones del esquema + 6 del correo): RLS, validaciones, `updated_at` no falsificable, vistas (incluido turno nocturno), borrado de cuenta en cascada, idempotencia.
- Auth:
  - Correo sin contraseña: `signInWithOtp` (código de **8 cifras**, la app acepta 6–10) o enlace (PKCE, mismo navegador).
  - URL Configuration: Site URL `https://moneycare-five.vercel.app`; Redirect URLs `https://moneycare-five.vercel.app/**` y `http://localhost:3000/**`.
  - SMTP: **Brevo** (`smtp-relay.brevo.com:587`), remitente `soporte.moneycare.orbe@gmail.com`, nombre «Orbe». Brevo reescribe el remitente a `…@12847146.brevosend.com` por ser un Gmail: por eso Gmail no muestra la foto de perfil. Solución: dominio propio verificado en Brevo. Plan gratuito de Brevo: 300 correos al día compartidos con IRONLOG.
  - Plantillas: `supabase/templates/` (ver su README). Usan `{{ .Data.nombre }}`: la app guarda el nombre del perfil en `user_metadata.nombre`.

## Estructura

### Rutas (`app/`)

- `page.tsx` → `FinanzasApp` (toda la app es una página; las secciones van por `#hash` para que el botón atrás funcione): `#inicio`, `#resumen` (Análisis), `#movimientos`, `#presupuesto`, `#metas`, `#hormiga`, `#trabajo`, `#nominas`, `#mas`, `#ajustes`. `#nuevo-gasto` abre el formulario (acceso directo del manifiesto).
- `privacidad/page.tsx`: privacidad (RGPD), con contacto de soporte.
- `layout.tsx` (fuentes, metadatos, `ThemeProvider`, `SmoothScroll`, `Toaster`), `loading.tsx` (esqueleto), `manifest.ts`, `icon.svg`, `apple-icon.png`, `globals.css`.

### Datos y lógica (`lib/`, `hooks/`)

- `lib/finance.ts`: tipos (`FinanceData`, `Tx`, `Category`, `Settings`, `Perfil`, `WorkCfg`, `Schedule`, `Shift`, `Payslip`, `Aporte`…), formato de dinero y fechas, categorías por defecto, `loadAll` (normaliza y migra datos viejos), cálculos (mes, 50/30/20, presupuestos, proyección, gastos hormiga), CSV y datos de ejemplo (`buildDemo`).
- `lib/work.ts`: jornadas (minutos, extras por día, semanas, calendario), horario por turnos (`planFor`, `weekTarget`), nóminas (`payslipYear`, `SS_RATE` 6,48 %), `netPerHour`.
- `lib/orbi.ts`: `orbiSay()` (evento `orbi:say`) y los consejos según pantalla, datos y objetivo.
- `lib/cloud-rows.ts`: traducción `FinanceData` ⇄ filas de las tablas (`toRows`, `fromRows`, `canonical`). La ida y vuelta es idéntica (probado con los datos de ejemplo).
- `lib/supabase.ts`, `lib/scroll.ts` (scroll vía Lenis, pausa con diálogos), `lib/theme-transition.ts` (copiado de IRONLOG).
- `hooks/use-finance.ts`: datos en `localStorage` (clave `mis-finanzas.v1`, la misma desde la versión HTML), modo ejemplo, `update`, `replace`, `wipe`.
- `hooks/use-cloud.ts`: sesión y sincronización por filas (ver `supabase/README.md`); estado en `orbe.sync.v2`.
- `hooks/use-pwa.ts`: registro del service worker (solo en producción) e instalación.

### Componentes (`components/finanzas/`)

- `finanzas-app.tsx`: armazón (cabecera, barra lateral en escritorio ≥1024 px, barra inferior en móvil/tablet, menú «+», diálogos) y todas las acciones sobre los datos.
- Pantallas: `home-view.tsx`, `views.tsx` (Análisis, Movimientos, Presupuestos, Metas, Ajustes; heredadas de la primera versión), `hormiga-view.tsx`, `work-view.tsx` (Jornadas y Nóminas), `more-view.tsx`.
- Formularios: `dialogs.tsx` (movimiento, meta, aportación, fijo, categoría, confirmación), `work-dialogs.tsx` (jornada, nómina, jornada habitual), `schedule-dialog.tsx` (horario por turnos), `onboarding.tsx` (bienvenida).
- Orbi: `orbi.tsx` (dibujo), `orbi-guide.tsx` (`OrbiBuddy` flotante y `OrbiTour`), `splash.tsx` (apertura), `logo.tsx`.
- Otros: `account-card.tsx` (cuenta, conflicto), `app-skeleton.tsx`, `kit.tsx` (iconos de categoría, `MiniBars`, `Meter`, `Stat`, `OrbitDeco`, `useCountUp`), `theme-toggle.tsx`.
- `public/sw.js` (versión `orbe-v2`: páginas red primero, estáticos caché primero), `public/icons/`, `public/email/` (imágenes de los correos), `marca/` (imágenes de perfil del correo de soporte).

## Decisiones y preferencias del usuario

- **Principio rector (2026-11-23)**: gestionar dinero y horarios de forma sencilla y rápida; poco texto, pocos pasos, todo a toques. Antes de añadir una función, pensar cómo hacerla en un toque.
- Estética (2026-11-23): shader «Silk» de 21st.dev con la paleta turquesa de la app (#0F1A1C, #23717B, #12B2C1, #E5F9F8); glassmorphism; isla dinámica para todos los avisos (`toast` de `@/lib/notify`, ya no sonner); apertura futurista sobre ahorro y crecimiento.
- Calendario: verde = libre, rojo = trabajo, amarillo = cubro a alguien; notas por día.
- Navegación: menú lateral con tres rayas arriba a la derecha; estado de la nube como icono (verde ✓ / rojo !).

- Idioma: español de España, tono cercano; el usuario prefiere que se tome la iniciativa («lánzate», «tú sabes más»).
- Cuenta **opcional** y app **local primero**: sin registro obligatorio; con cuenta, sincroniza. Pensada para que la use más gente.
- Moneda: euros. Nómina variable por IRPF; horas extra importantes.
- Cosas que se copian de IRONLOG cuando el usuario dice «como en las demás apps»: cambio de tema con círculo (View Transitions), smooth scroll con Lenis, documentación (`README`, `memory`, `avances`, `Mejoras_Futuro`, `AGENTS`).
- Orbi debe parecerse al robot de su imagen pero ser un diseño propio.
- Correos bonitos, personalizados y en español; el código del correo en el asunto.
- Horas extra con horario por turnos: un día trabajado fuera del horario cuenta entero como extra (decisión de Claude, pendiente de confirmar por el usuario).

## Recordatorios (desde el 2026-11-23)

- Web Push: `lib/reminders.ts` (agenda y clave pública VAPID), `hooks/use-reminders.ts`, `components/finanzas/reminders-card.tsx` (en Más), `public/sw.js` (eventos `push` y `notificationclick`), `app/api/push/cron/route.ts`.
- Base de datos: `20261125000000_push_reminders.sql` + `supabase/private/push_setup.sql` (claves VAPID, secreto del cron y `pg_cron`; **no está en git**, guardarlo bien: sin él no se pueden regenerar las suscripciones existentes).
- Solo en la app publicada (el service worker no se registra en desarrollo). iPhone: solo instalada.

## Estado actual / siguiente paso

- **Pendiente del usuario**:
  - Ejecutar `20261126000000_work_week_plans.sql` (semanas planificadas, «cubro a alguien» y notas del calendario).
  - Pegar en Supabase las plantillas nuevas de `supabase/templates/` (Magic Link y Confirm signup, con sus asuntos).
  - Probar la sincronización por filas con su cuenta real en dos dispositivos (no se pudo probar desde aquí: el código llega a su correo).
- Valorar dominio propio para el remitente de correo.
- El aviso de `npm audit` (moderado) viene de dependencias de desarrollo; no se ha forzado `audit fix`.

## Guía rápida para futuras sesiones

1. Leer este archivo, `avances.md` y `supabase/README.md`.
2. `npm install` y `npm run dev`. Para ver la app como nuevo: borrar `localStorage` y `sessionStorage` del sitio (las claves `orbe.*` controlan apertura, tutorial, bienvenida y Orbi).
3. Cambios de datos: tocar a la vez `lib/finance.ts` (tipo y `loadAll`), `lib/cloud-rows.ts` (filas) y, si hace falta, una migración nueva en `supabase/migrations/` (nunca editar una ya aplicada).
4. Comprobar con `npm run lint`, `npx tsc --noEmit` y `npm run build`, y probar en el navegador a 390 px y a 1440 px.
5. Commit en español con la línea de coautoría, push a las dos ramas y añadir una entrada en `avances.md`.
