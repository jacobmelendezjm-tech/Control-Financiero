# Orbe · Mejoras para el futuro

Hoja de ruta completa: todo lo que se puede mejorar o añadir a Orbe, ordenado por áreas. Es un catálogo de opciones, **no una lista de tareas aprobadas**: cada punto se decide antes de empezarlo.

- Estado actual del código, decisiones tomadas y pendientes inmediatos: `memory.md`.
- Última revisión: 23 de noviembre de 2026.

## Cómo leer este documento

**Prioridad**

| | Significa |
|---|---|
| **P0** | Pendiente que bloquea algo que ya está publicado. Hacerlo ya. |
| **P1** | Gran impacto para usuarios o para la presentación. Próximo paso. |
| **P2** | Mejora clara, sin urgencia. |
| **P3** | Idea a largo plazo o experimental. |

**Esfuerzo** (una persona): **S** = horas · **M** = 1–3 días · **L** = 1–2 semanas · **XL** = un mes o más.

**Coste**: 🆓 gratis · 💶 tiene coste fijo o por uso.

Respetar siempre las decisiones del usuario: cuenta opcional y app local primero, español de España, sin anuncios, Orbi como personalidad de la app.

---

## Las 10 que más valen la pena

| # | Mejora | Por qué | Prioridad · esfuerzo |
|---|---|---|---|
| 1 | Dominio propio y remitente verificado | Correos con foto, sin `brevosend.com`, menos spam | P1 · S · 💶 ~10 €/año |
| 2 | Recordatorios con notificaciones (fichar, nómina, fijos) | Que la app se use cada día | P1 · M · 🆓 |
| 3 | Subir la nómina en PDF y leerla sola | Lo más tedioso de apuntar | P1 · L · 🆓/💶 |
| 4 | Tests automáticos y CI | Sincronización y cálculos sin romperse | P1 · M · 🆓 |
| 5 | Orbi con IA (preguntas en lenguaje natural) | «¿Cuánto llevo en cafés este año?» | P2 · L · 💶 |
| 6 | Deudas y préstamos (p. ej. Klarna) | Objetivo «pagar deudas» del formulario | P2 · M · 🆓 |
| 7 | Simulador de IRPF y de la renta | Entender por qué cambia la nómina | P2 · M · 🆓 |
| 8 | Exportar horas y nóminas en PDF | Reclamar horas extra a la empresa | P2 · M · 🆓 |
| 9 | Fotos de tickets | Justificantes y notas rápidas | P2 · M · 🆓 |
| 10 | Panel de administración | Ver uso y usuarios sin entrar en Supabase | P3 · L · 🆓 |

---

## 1. Pendientes inmediatos (deuda conocida)

| Mejora | Detalle | Prioridad · esfuerzo |
|---|---|---|
| Pegar las plantillas de correo nuevas | `supabase/templates/` (ver su README) | P0 · S |
| Probar la sincronización real en dos dispositivos | Desde aquí no se puede: el código llega al correo del usuario | P0 · S |
| Confirmar regla de extras con horario por turnos | Hoy un día fuera del horario cuenta entero como extra | P1 · S |
| Código de 6 cifras | Supabase envía 8; se cambia en Authentication → Providers → Email → Email OTP Length | P2 · S |
| Borrar la tabla antigua `finance_data` | Cuando todos los usuarios hayan migrado a las tablas nuevas | P3 · S |
| `npm audit` | Avisos moderados en dependencias de desarrollo | P3 · S |

## 2. App nativa (iOS y Android)

Decidido el 23 nov 2026: se deja para más adelante. Orden recomendado:

1. **Google Play con PWABuilder** (P2 · S · 💶 25 $ una vez): empaquetar la web (TWA) desde pwabuilder.com. Falta `/.well-known/assetlinks.json`, capturas y textos de la ficha. Las actualizaciones de la web llegan solas.
2. **APK de descarga directa** (P3 · S · 🆓): el mismo paquete compartido como archivo, para pruebas.
3. **App Store** (P3 · L · 💶 99 $/año): Capacitor con funciones nativas (widgets, Face ID) para que Apple no la rechace; necesita Mac o compilación en la nube.

- **Capacitor** sobre la web actual (M): icono en las tiendas, notificaciones fiables en iPhone, widgets.
- Widget de saldo y de «fichar hoy» en la pantalla de inicio (L).
- Desbloqueo con huella o Face ID para abrir la app (M).

## 3. Web y PWA

- Notificaciones push (Web Push con VAPID + Supabase Edge Function): recordar fichar al empezar el turno, apuntar la nómina el día de cobro, fijos pendientes (M · 🆓).
- Accesos directos del manifiesto para «Fichar hoy» y «Añadir ingreso» (S).
- Modo sin conexión más completo: precargar todas las secciones (S).
- Compartir un gasto desde otra app (Web Share Target) (M).

## 4. Movimientos y categorías

- Importar extractos del banco (CSV/Norma 43) con reglas de categorización automáticas (M).
- Conexión bancaria (PSD2 / agregadores como GoCardless) (XL · 💶).
- Etiquetas además de categorías; dividir un gasto entre categorías (M).
- Iconos y colores de categoría elegibles (S).
- Fotos de tickets con almacenamiento en Supabase Storage (M).
- Gastos compartidos (piso, pareja) y «quién debe a quién» (L).

## 5. Gastos hormiga y presupuestos

- Retos semanales («una semana sin vending») con Orbi celebrándolo (M).
- Alertas de presupuesto al 80 % y 100 % con notificación (S, tras push).
- Detección de suscripciones que suben de precio o se repiten (M).

## 6. Ahorro, metas y deudas

- Aportaciones automáticas a metas el día de cobro (S).
- Módulo de **deudas**: préstamos, plazos, intereses, método bola de nieve/avalancha (M).
- Fondo de emergencia guiado (meses cubiertos según gastos reales) (S).
- Gráfico del historial de aportaciones (ya se guarda en `goal_contributions`) (S).

## 7. Trabajo y nóminas

- Leer la nómina en PDF (bruto, IRPF, SS, neto, extras) con extracción de texto o IA (L).
- Simulador de IRPF y estimación de la renta anual (M).
- Exportar horas del mes en PDF para la empresa (M).
- Fichar con un toque desde la notificación y avisar si se olvidó fichar (M, tras push).
- Convenio: plus de nocturnidad, festivos y domingos con su precio (M).
- Varios trabajos a la vez (L).

## 8. Orbi

- Orbi con IA (Claude): preguntas sobre los datos del usuario, con límites de coste; como función premium (L · 💶).
- Más reacciones y animaciones (celebración al cumplir el objetivo de ahorro del mes) (S).
- Resumen semanal de Orbi (en la app o por correo) (M).

## 9. Cuenta, datos y sincronización

- Ver y cerrar sesiones abiertas en otros dispositivos (M).
- Historial de cambios para deshacer (la base ya guarda `updated_at` y borrado lógico) (M).
- Cifrado de extremo a extremo opcional (XL).
- Exportar todos los datos en un clic desde la cuenta (RGPD, portabilidad) (S).

## 10. Versión monetizable: «Orbe Pro»

Modelo **freemium sin anuncios**: todo lo que Orbe hace hoy sigue gratis para siempre (así lo prometen los Términos de uso) y se cobra solo por funciones nuevas que cuestan dinero mantener o ahorran mucho tiempo. Nada de publicidad ni de vender datos: es lo que diferencia a Orbe.

### Qué sería gratis y qué Pro

| Gratis (lo de hoy) | Orbe Pro |
|---|---|
| Movimientos, categorías, análisis, presupuestos | **Orbi con IA**: preguntas en lenguaje natural («¿cuánto gasté en comida este trimestre?») y consejos según tus datos |
| Gastos hormiga, ahorro y metas | **Nómina en PDF o foto**: se lee sola y rellena bruto, IRPF, Seguridad Social y neto |
| Trabajo, turnos rotativos, fichar, horas extra | **Informe de horas extra en PDF** con el detalle por día y semana, listo para reclamarlas |
| Nóminas a mano, gastos fijos | **Informes mensuales y anuales** en PDF y resumen para la declaración de la renta |
| Cuenta y nube, recordatorios, copias | **Hogar compartido**: gastos en común con pareja o compañeros de piso, quién debe a quién |
| Modo oscuro, instalable | Previsión de saldo a fin de mes, metas avanzadas, temas y trajes para Orbi |

### Precio orientativo

- **Mensual** 2,99 € · **Anual** 24,99 € (≈ 2 meses gratis) · prueba gratuita de 7 días.
- Opción de pago único «de por vida» para los primeros usuarios (ayuda a financiar el arranque).
- Pro necesita cuenta (la suscripción va ligada al usuario de Supabase).

### Cómo se cobraría

- **Web (PWA):** Stripe Checkout + portal de cliente para cancelar o cambiar de plan. Comisión ≈ 1,5 % + 0,25 € por pago en Europa. Alternativa más sencilla con IVA incluido: un *merchant of record* (Paddle, Lemon Squeezy), que cobra más (~5 %) pero gestiona impuestos y facturas por ti.
- **Google Play (app nativa):** el contenido digital comprado dentro de la app debe pasar por la facturación de Google Play (15 % en suscripciones). En el Espacio Económico Europeo hay programas de facturación alternativa; revisar las condiciones vigentes antes de publicar.
- Un mismo usuario Pro lo es en web y en móvil, compre donde compre.

### Parte técnica (L–XL)

- Tabla `subscriptions` en Supabase (usuario, plan, estado, renovación, origen web/Play) con RLS de solo lectura para el usuario.
- Webhooks de Stripe y Google Play en una función del servidor (`app/api/...` o Edge Function) que actualiza la tabla. La clave de servicio y las claves de Stripe viven solo en variables de entorno de Vercel o Supabase, nunca en el cliente ni en el repositorio.
- Hook `usePro()` que lee el estado y muestra la pantalla «Hazte Pro» con Orbi; las funciones Pro se comprueban también en el servidor (sobre todo la IA y la lectura de PDF, que cuestan dinero por uso).
- Periodo de gracia si falla un cobro, y la app nunca bloquea ni borra los datos gratuitos al dejar Pro.
- Límite de uso de la IA por mes para controlar el coste (💶 por consulta al proveedor de IA).
- Migración nueva, `toRows`/`fromRows` sin cambios (la suscripción no forma parte de los datos sincronizados).

### Parte legal y fiscal (antes de cobrar el primer euro)

- **Darse de alta** en Hacienda (modelo 036/037) y como autónomo en la Seguridad Social si los ingresos son habituales; consultar con un gestor (💶).
- **Aviso legal** con NIF y domicilio (LSSI art. 10).
- **Condiciones de contratación**: precio con IVA, renovación automática, cómo cancelar (tan fácil como contratar) y **derecho de desistimiento de 14 días**; para contenido digital, pedir consentimiento expreso para empezar ya y perderlo.
- **IVA**: 21 % en España; a consumidores de otros países de la UE, el de su país mediante la ventanilla única (OSS), salvo que uses un *merchant of record*. Factura por cada cobro.
- **Privacidad**: añadir Stripe (y el proveedor de IA, si se usa) como encargados; si la IA lee datos financieros o nóminas, explicarlo claramente y no usarlos para entrenar modelos.
- Revisión de todos los textos por un abogado antes de lanzar.

### Plan por fases

1. **Validar** (S): pantalla «Orbe Pro, próximamente» con lista de espera por correo y una encuesta de qué función pagarían. Sin cobrar nada.
2. **Primera función Pro** (L): la que más pida la lista (probablemente nómina en PDF o informe de horas extra), con pago en web vía Stripe y prueba gratis.
3. **Lanzamiento** (M): precios definitivos, textos legales de contratación, alta fiscal, anuncio a la lista de espera y vídeos de la campaña adaptados.
4. **Móvil** (L): cobro dentro de la app nativa con Google Play Billing, sincronizado con la misma tabla.
5. **Medir** (S): conversión de gratis a Pro, bajas al mes y coste de IA por usuario; ajustar precio y funciones.

## 11. Calidad, seguridad y operación

- Tests: Vitest para `lib/` (cálculos, `toRows`/`fromRows`), Playwright para los flujos principales y las pruebas de la base de datos con PGlite en CI (M).
- GitHub Actions: lint, tipos, build y tests en cada push (S).
- Sentry u otro registro de errores (S · 🆓 plan gratis).
- Captcha en el envío de códigos (Supabase lo soporta) para evitar abuso (S).
- Revisar la página de privacidad con un profesional antes de crecer (S · 💶).
- Repositorio público: confirmar que no se suben datos ni claves (ya se cumple) o hacerlo privado (S).

## 12. Rendimiento

- Dividir `finanzas-app.tsx` (1.200 líneas) en módulos y cargar diálogos bajo demanda (M).
- Lighthouse en móvil y ajustar lo que salga (S).
- Paginación del historial de movimientos cuando haya años de datos (S).

## 13. Marca, portada y marketing

- Portada pública que explique Orbe antes de entrar en la app (M).
- Dominio propio (`orbe.app`, `moneycare.es`…) y nombre definitivo (S · 💶).
- Imagen al compartir (Open Graph) con Orbi (S).

## 14. Panel de administración

- Página interna con número de usuarios, actividad y errores, protegida por rol (L).
