# Orbe · Control financiero (MoneyCare)

Aplicación web instalable para llevar las finanzas personales desde el móvil, en español (España). Pensada para quien cobra una nómina que varía con el IRPF y las horas extra, y quiere controlar en qué gasta, cuánto ahorra y cuántas horas trabaja.

Producción: https://moneycare-five.vercel.app/

## Funciones

- **Inicio**: saldo total con conteo animado, botones de ingreso y gasto, accesos rápidos (fichar, nóminas, hormiga, ahorro), gasto de los últimos 7 días comparado con el mes pasado, resumen de horas de la semana, objetivo de ahorro del mes, consejo personalizado y actividad reciente.
- **Movimientos**: ingresos y gastos con categorías, buscador y filtros por tipo, categoría y mes.
- **Análisis**: ticket del mes, regla 50/30/20, gasto por categoría y comparativa de los últimos 6 meses.
- **Presupuestos**: límite mensual por categoría con avisos al acercarse o pasarse.
- **Gastos hormiga**: detección automática (gastos pequeños que no son necesidad, umbral configurable, marca manual), proyección anual, equivalencia en horas de trabajo, en qué se van y qué día de la semana se gasta más.
- **Ahorro y metas**: huchas con objetivo y fecha, aportaciones y retiradas con historial.
- **Trabajo**: jornadas con entrada, salida y pausa (turnos partidos y nocturnos, vacaciones, festivos, bajas), calendario del mes, totales por semana y mes, horas extra automáticas o manuales, valor de las extras y bruto estimado.
- **Horario por turnos**: ciclos de 1 a 4 semanas (p. ej. una semana de jueves a domingo y la siguiente de viernes a domingo); fichar con el turno del día y «Rellenar con mi horario».
- **Nóminas**: bruto, IRPF, Seguridad Social y neto (calculado), resumen anual con IRPF efectivo y gráfico del neto por mes; se apuntan como ingreso automáticamente.
- **Gastos fijos**: recurrentes mensuales que se apuntan con un toque.
- **Orbi**: asistente animado (robot original) que hace el tutorial de bienvenida, flota en la app, da consejos según la pantalla y los datos y reacciona a lo que haces.
- **Formulario de bienvenida**: nombre, forma de cobro, sueldo, día de cobro, jornada, saldo actual, objetivo y ahorro mensual; todo opcional y aplicado al momento.
- **Cuenta opcional** (Supabase): sin muro de registro. Con cuenta, entrar con código por correo y sincronización por filas entre dispositivos, en tiempo real.
- **Instalable y sin conexión** (PWA), con apertura animada, modo claro/oscuro con transición circular, smooth scroll, esqueletos de carga y diseño adaptado a móvil, tablet y escritorio (barra lateral).
- **Copias**: exportar e importar CSV (Excel en español) y copia completa en JSON.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (base-ui) · Lenis · next-themes · Supabase (Auth + Postgres con RLS + Realtime) · Brevo (SMTP) · Vercel.

## Puesta en marcha

1. Instala las dependencias: `npm install`
2. (Opcional) Crea `.env.local` con las claves de Supabase. Sin el archivo se usan las del proyecto por defecto (`lib/supabase.ts`); la clave publishable es pública por diseño.

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
   NEXT_PUBLIC_CONTACT_EMAIL=soporte@…   # opcional: correo de la página de Privacidad
   ```

3. Base de datos: ejecuta en el SQL Editor de Supabase, en orden, los archivos de `supabase/migrations/` (ver [`supabase/README.md`](supabase/README.md)).
4. Correos: pega las plantillas de `supabase/templates/` (ver [`supabase/templates/README.md`](supabase/templates/README.md)).
5. Arranca el servidor: `npm run dev` → http://localhost:3000

Comprobaciones: `npm run lint`, `npm run typecheck`, `npm run build`.

## Despliegue

Vercel está conectado al repositorio de GitHub: cada `git push` despliega solo. Se suben las dos ramas, `main` y `claude/deploy-finanzas-github-vercel-o8097c` (la rama por defecto del repositorio).

## Hoja de ruta

La lista completa, con prioridad y esfuerzo, está en [`Mejoras_Futuro.md`](Mejoras_Futuro.md). Lo más destacado:

- **Dominio propio** para los correos (remitente con foto y sin `brevosend.com`).
- **Orbi con IA**: preguntas en lenguaje natural sobre tus finanzas.
- **Subir la nómina en PDF** y leer bruto, IRPF y neto automáticamente.
- **Recordatorios** (fichar, apuntar la nómina, gastos fijos) con notificaciones.
- **Tests automáticos y CI** antes de cada despliegue.

## Documentación interna

- [`memory.md`](memory.md): estado del proyecto, decisiones tomadas y cómo retomarlo.
- [`avances.md`](avances.md): diario del proyecto, con lo que se hizo cada día.
- [`Mejoras_Futuro.md`](Mejoras_Futuro.md): todas las mejoras posibles, ordenadas por áreas y prioridad.
- [`supabase/README.md`](supabase/README.md): base de datos, seguridad y sincronización.
- [`supabase/templates/README.md`](supabase/templates/README.md): correos de inicio de sesión.
- [`AGENTS.md`](AGENTS.md): instrucciones para asistentes.
