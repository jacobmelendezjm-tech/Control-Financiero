# Orbe · Mejoras para el futuro

Hoja de ruta completa: todo lo que se puede mejorar o añadir a Orbe, ordenado por áreas. Es un catálogo de opciones, **no una lista de tareas aprobadas**: cada punto se decide antes de empezarlo.

- Estado actual del código, decisiones tomadas y pendientes inmediatos: `memory.md`.
- Última revisión: 22 de noviembre de 2026.

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

## 10. Monetización (si se quiere)

- Freemium sin anuncios: todo lo actual gratis; «Orbe Pro» con Orbi IA, lectura de nóminas PDF e informes (L · 💶 Stripe).
- Lista de espera antes de cobrar (S).

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
