# Orbe · Registro de avances

Diario del proyecto: qué se hizo cada día, qué entró nuevo en la app y por qué. Sirve para recordar cuándo se implementó cada cosa y para contar cómo ha evolucionado Orbe.

- **Fuentes**: el historial de git (`git log`), `memory.md` y las sesiones de trabajo. Lo anterior al 18 de noviembre de 2026 no tiene registro.
- **Otros documentos**: estado técnico en `memory.md`; ideas y próximos pasos en `Mejoras_Futuro.md`.
- **Cómo mantenerlo**: al acabar cada sesión, añadir una entrada al final con la misma estructura (ver plantilla abajo).

---

## Línea de tiempo

| Fecha | Hito |
|---|---|
| 18 nov 2026 | «Mis Finanzas»: primera versión en un solo archivo HTML |
| 19 nov 2026 | Reconstruida en Next.js con shadcn/ui |
| 22 nov 2026 | Nace **Orbe**: rediseño, logo, apertura, trabajo y nóminas, gastos hormiga, Orbi, bienvenida, horario por turnos, nube con Supabase, base de datos relacional, correos propios y documentación |

### Orbe en cifras (22 nov 2026)

| | |
|---|---|
| Pantallas | 10 secciones (Inicio, Análisis, Movimientos, Presupuestos, Ahorro y metas, Gastos hormiga, Trabajo, Nóminas, Más, Ajustes) + Privacidad |
| Tablas en la base de datos | 11 (+ 3 vistas de análisis) |
| Pasos del tutorial de Orbi | 12 |
| Preguntas de la bienvenida | hasta 6 (todas opcionales) |
| Código | ~10.500 líneas de TypeScript |
| Commits | 20 |
| Comprobaciones de la base de datos | 29 (PGlite, imitando Supabase) |

---

## 18 de noviembre de 2026 · «Mis Finanzas» · `0d08746`

Primera versión: una página HTML autónoma (`public/mis-finanzas.html`) con ingresos, gastos, presupuesto, metas y ajustes, guardando en el navegador.

## 19 de noviembre de 2026 · A Next.js · `6cc9da6`, `41f62ca`

- Proyecto Next.js con shadcn/ui.
- La app se reconstruye con componentes: resumen (ticket del mes, fijos pendientes, regla 50/30/20, gasto por categoría, gráfico de 6 meses), movimientos con filtros, presupuesto, metas y ajustes (categorías, fijos, CSV/JSON, borrar datos). Misma clave de almacenamiento que la versión HTML: no se pierde nada.

## 22 de noviembre de 2026 · Nace Orbe

Un día de trabajo largo: de una app de gastos a una app de finanzas completa, con cuenta en la nube.

### Rediseño, trabajo y nóminas · `de8cb79`

- Paleta del usuario (turquesas) con referencia visual «Finora Finance»: tarjeta de saldo, accesos rápidos, barras de 7 días, actividad reciente, navegación con botón central «+».
- Nombre **Orbe** y logo (anillo luminoso con barras); apertura animada.
- **Trabajo**: jornadas, calendario, semanas, horas extra, precio por hora.
- **Nóminas**: bruto, IRPF, Seguridad Social y neto; resumen anual.
- **Gastos hormiga**: detección, proyección anual y equivalencia en horas.
- Instalable (PWA) y sin conexión. Publicada en GitHub.

### Orbi · `4c97854`

Asistente animado (robot original) con tutorial guiado de 12 pasos en burbujas, consejos según la pantalla y reacciones a lo que haces. Órbita animada en las tarjetas y saldo con conteo.

### Pulido como en IRONLOG · `4f442f1`, `1275e8e`, `05fb578`

- Cambio de tema con círculo que se expande desde el botón.
- Escritorio: barra lateral, sin títulos duplicados, importes con la tipografía buena, calendario a tamaño razonable.
- Smooth scroll con Lenis.

### Bienvenida y turnos · `6a94965`, `2f8267b`

- Formulario de bienvenida no invasivo (hoja con Orbi): nombre, cobro, sueldo, jornada, saldo, objetivo y ahorro; aplica todo (recordatorio de nómina, meta, tarjeta de ahorro del mes).
- Horario por turnos rotativos (ciclos de 1 a 4 semanas), pensado para el horario real del usuario.

### Nube · `7f2cda1` … `6d1ba6a`

- Cuenta opcional con Supabase: entrar con código por correo, sincronización, borrar cuenta, página de privacidad.
- Publicada en Vercel (https://moneycare-five.vercel.app) por el usuario; correo con Brevo (`soporte.moneycare.orbe@gmail.com`).
- Imágenes de perfil de Orbe para el correo de soporte.

### Base de datos completa · `d7d9415`, `a296bb4`

- Esquema relacional de 11 tablas con RLS, validaciones, borrado lógico, vistas de análisis y tiempo real.
- Sincronización por filas (solo lo que cambia, mezcla sin conflictos por fila, migración automática del formato antiguo).
- Correo de cada usuario en `profiles.email`.
- Probado con PGlite: 29 comprobaciones.

### Correos y esperas · `bc40adb`, `15af625`

- Correos de inicio de sesión y bienvenida con diseño propio, Orbi y saludo por nombre.
- Esqueletos de carga y spinners.
- Documentación completa del proyecto (este archivo, `memory.md`, `Mejoras_Futuro.md`, `README.md`).

### Teclado del móvil

- Al escribir en el móvil, el teclado tapaba los campos. Ahora los diálogos y la hoja de bienvenida se colocan en la zona visible encima del teclado (`components/keyboard-aware.tsx`, `visualViewport`), el campo activo se centra solo y en Android la página encoge con el teclado (`interactiveWidget: resizes-content`).

### Cuenta en la bienvenida

- Nuevo paso «¿Dónde guardamos tus datos?» en el formulario de bienvenida: crear cuenta con el correo (código verificado sin salir del formulario) o seguir sin cuenta, con aviso de que los datos quedan solo en el dispositivo y de que pueden subirse a la nube más adelante desde «Más». No aparece si ya hay sesión.

## 23 de noviembre de 2026 · Recordatorios

- **Aviso de correo enviado**: al pedir el código aparece una notificación emergente con el correo y el consejo de mirar en spam (Más y bienvenida).
- **Notificaciones push** con la app cerrada: fichar al acabar el turno, día de cobro, fijos, resumen diario (a la hora elegida y solo si no has apuntado nada) y semanal, y «Orbi te echa de menos» tras 3 días sin entrar. Tarjeta «Recordatorios» en Más con prueba y próximos avisos. Funciona sin cuenta; los avisos no llevan importes.
- Servidor: `app/api/push/cron` + `pg_cron` en Supabase; los secretos en `orbe_private.config` (archivo privado fuera de git). 11 comprobaciones nuevas en PGlite.

### Horarios sencillos, calendario de colores y menú

- **Tu semana** arriba en Trabajo: toca un día y elige Libre 🟢, Trabajo 🔴 o Cubro a alguien 🟡 con tus turnos habituales en botones, y añade una nota. Lo pasado queda fichado y lo futuro previsto.
- **Planificar la semana entera** a toques («Igual que la semana anterior»), para horarios que cambian cada semana sin patrón. El horario rotativo queda como opción secundaria.
- **Calendario de colores** (intenso = fichado, suave = previsto) con marca de nota.
- **Menú lateral** (tres rayas arriba a la derecha) con Tu dinero, Trabajo y App; la barra inferior lleva Movimientos en lugar de «Más».
- **Icono de nube**: verde con ✓ si está guardado en la nube, rojo con ! si no.
- Base de datos: `20261126000000_work_week_plans.sql` (semanas planificadas, «cubre» y notas), con sincronización de borrados de horarios.

### Personalidad: shader, cristal, isla dinámica y apertura nueva

- **Shader «Silk»** (WebGL1, sin librerías; `components/silk-shader.tsx`) de fondo en toda la app, a toda intensidad en la tarjeta del saldo y en la apertura.
- **Glassmorphism**: tarjetas, cabecera, barras, menú y diálogos translúcidos con desenfoque.
- **Isla dinámica** (`components/dynamic-island.tsx`, `lib/notify.ts`): todos los avisos salen como una píldora que se expande desde arriba; mini píldora «Guardando» al sincronizar.
- **Apertura nueva**: línea de crecimiento dorada, monedas de luz, rejilla en perspectiva, «Ahorra · Planifica · Crece» → logo → «Tu futuro, en órbita», salida en iris.
- Menos texto en Inicio y entrada escalonada de tarjetas.

### Turnos rotativos en «Tu jornada»

- La ficha ahora pregunta **Horario fijo o Turnos rotativos**. Con turnos: tus turnos tipo (Mañana, Tarde, Noche… a un toque), horas de contrato a la semana y cuándo cuentan las extras («alargo mi turno» o «paso de mis horas semanales»), con acceso directo al cuadrante.
- Las horas extra se calculan con esa regla; los turnos tipo aparecen primero al marcar un día o planificar una semana.
- «Fichar hoy» sin cuadrante abre el día en «Trabajo» para elegir el turno.
- Base de datos: `20261127000000_work_turnos.sql` (pendiente de ejecutar en Supabase).

### La cuenta, lo primero al abrir

- Al abrir la app sin sesión aparece **«¿Entras con tu cuenta?»**: «Iniciar sesión o crear cuenta» (correo + código) o «Continuar sin cuenta» (con el aviso de que los datos se quedan en el móvil).
- Antes estaba al final del formulario y solo lo veían los usuarios nuevos. Ahora sale a todo el que no tenga sesión y no haya elegido «Continuar sin cuenta» (`orbe.cuenta = local`); si ya tiene el perfil hecho, sale solo esa pregunta.

### Iniciar sesión sin bucles al copiar el código

- En el móvil, al salir a copiar el código del correo, el sistema cerraba la app y al volver empezaba de cero. Ahora el correo pendiente se guarda en el dispositivo (`lib/pending-login.ts`, caduca en 1 hora) y al volver la app abre directamente «escribe el código», sin la animación de apertura.
- Botón **Pegar** junto al código (en el formulario y en Cuenta y nube).

### Formulario de intereses y Inicio personalizado

- Nuevo paso **«¿Qué te interesa más?»** (gastos, ahorro, horas y turnos, nóminas, gastos hormiga, presupuestos; varios a la vez).
- Inicio se adapta: los accesos rápidos siguen el orden de tus intereses y la tarjeta de Trabajo solo sale si trabajas o te interesan las horas.
- El formulario vuelve a salir una vez a quien lo hizo sin intereses (clave `orbe.onboard2`). Si ya elegiste «Continuar sin cuenta», no se vuelve a preguntar por la cuenta.
- Base de datos: `20261128000000_profiles_intereses.sql` (pendiente de ejecutar).

### Campaña audiovisual «Orbe con Orbi» (carpeta `video Orbi/`)

- Seis vídeos con Orbi de protagonista: presentación oficial, tutorial, anuncio de horas extra, vertical de gastos hormiga, funcionalidades y pieza de marca, con adaptaciones 16:9, 9:16 y 1:1 (12 MP4 en total), subtítulos SRT, miniaturas, guiones y storyboards.
- Hechos con HyperFrames a partir de capturas reales de la app, el shader Silk y el SVG original de Orbi; voz local con Kokoro (em_alex) y música original «Órbita» compuesta en código.
- Todo se regenera desde `video Orbi/07_Proyectos_Editables/motor/` (ver su README). La llamada a la acción es «Pruébala gratis» + la web: la app aún no está en Google Play.

### Textos legales y derechos de autor

- Nuevas páginas **Aviso legal** (`/aviso-legal`) y **Términos de uso** (`/terminos`); **Privacidad y cookies** reescrita: responsable, proveedores (Supabase, Vercel, Brevo, servicio de notificaciones), transferencias, edad mínima de 14 años, derechos y cookies técnicas.
- Corregido un error de la política anterior: decía que sin cuenta nada sale del móvil, pero los recordatorios guardan su texto en el servidor.
- Aviso de que los cálculos (nóminas, IRPF, horas extra) son orientativos y no son asesoramiento.
- «© 2026 Jacob Meléndez. Todos los derechos reservados.» en el menú, en Más y en las páginas legales; aceptación de términos y privacidad en el paso de la cuenta.
- `LICENSE` privativo, `"license": "UNLICENSED"` en `package.json` y metadatos de autoría.
- `video Orbi/` fuera del repositorio (`.gitignore`) y del lint.

---

## Plantilla para nuevas entradas

```
## <día> de <mes> de <año> · <título corto>

### <cambio> · `<commit>`

- Qué se hizo y por qué, en lenguaje sencillo.
- Qué queda pendiente (si algo).
```
