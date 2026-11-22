# Base de datos de Orbe (Supabase · PostgreSQL)

La app funciona primero en el dispositivo (localStorage) y, si el usuario inicia sesión,
sincroniza fila a fila con estas tablas.

## Migraciones

Ejecutar en orden en **Supabase → SQL Editor** (todas se pueden repetir sin romper nada):

| Archivo | Qué hace |
|---|---|
| `20261122000000_orbe_finance_data.sql` | Formato antiguo (un documento JSON por usuario) y `delete_my_account()`. Se mantiene solo para migrar. |
| `20261123000000_orbe_schema.sql` | Esquema relacional completo (lo que usa la app). |
| `20261124000000_profiles_email.sql` | Guarda el correo de cada usuario en `profiles.email` (copia automática de `auth.users`). |

## Tablas

Todas tienen `user_id` (→ `auth.users`, borrado en cascada), `created_at` y `updated_at`
(los pone la base de datos). Los importes van en **céntimos** (`bigint`).

| Tabla | Clave | Contenido |
|---|---|---|
| `profiles` | `user_id` | Correo (`email`, lo mantiene la base de datos y la app no puede cambiarlo), nombre, saldo inicial, umbral de gastos hormiga y respuestas del formulario de bienvenida (cobro, sueldo aproximado, día de cobro, objetivo, ahorro mensual). Se crea sola al registrarse. |
| `categories` | `user_id, id` | Categorías de gasto (`g`) o ingreso (`i`), grupo necesidad/deseo, orden y presupuesto mensual. |
| `recurring` | `user_id, id` | Gastos e ingresos fijos mensuales (día del mes, activo). |
| `transactions` | `user_id, id` | Movimientos: fecha, tipo, importe, categoría, nota, origen (fijo o nómina) y marca manual de gasto hormiga. |
| `goals` | `user_id, id` | Metas de ahorro: objetivo, ahorrado y mes límite. |
| `goal_contributions` | `user_id, id` | Historial de aportaciones (negativas = retiradas). |
| `work_settings` | `user_id` | Jornada: horas al día/semana, horario y precio por hora normal y extra. Se crea sola al registrarse. |
| `work_schedules` | `user_id` | Horario por turnos: lunes de la semana 1 (`ancla`) y número de semanas del ciclo. |
| `work_schedule_days` | `user_id, semana, dia` | Turno de cada día del ciclo (0 = lunes … 6 = domingo). |
| `shifts` | `user_id, id` | Jornadas registradas: trabajo, vacaciones, festivo, baja o libre; horas, pausa y extras manuales. |
| `payslips` | `user_id, id` | Nóminas: mes, fecha de cobro, bruto, IRPF, Seguridad Social, otros, neto, extras y movimiento asociado. |

Borrado: las tablas con `deleted_at` usan **borrado lógico** (así el borrado llega a los
demás dispositivos). Nadie puede hacer `DELETE` salvo en `work_schedule_days`, que se rehace entera.

## Seguridad

- **RLS en todas las tablas**: cada usuario solo puede leer, crear y editar sus filas.
- `anon` no tiene acceso a nada.
- `updated_at` lo fija un trigger: el cliente no puede falsearlo.
- `delete_my_account()` (RPC) borra la cuenta y, en cascada, todos sus datos (RGPD).

## Vistas de análisis

Respetan la seguridad de quien consulta (`security_invoker`):

- `v_resumen_mensual`: ingresos, gastos, balance y nº de movimientos por mes.
- `v_gasto_por_categoria`: gasto por categoría y mes, con su presupuesto.
- `v_horas_mensuales`: días trabajados, minutos (incluidos turnos de noche), extras manuales, vacaciones y bajas por mes.

## Sincronización (cliente: `hooks/use-cloud.ts`)

1. Al iniciar sesión se descargan todas las filas. Si las tablas están vacías y existe el
   documento antiguo de `finance_data`, se migra automáticamente.
2. El dispositivo guarda la **base** (última versión de cada fila igual a la nube) y un **cursor**
   (mayor `updated_at` visto).
3. Bajar: filas con `updated_at > cursor`. Si esa fila no se cambió en el dispositivo, se aplica.
4. Subir: lo que difiere de la base (upsert por lotes; los borrados ponen `deleted_at`).
5. **Tiempo real**: los cambios en otro dispositivo disparan una sincronización al momento.
