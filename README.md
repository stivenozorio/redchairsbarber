# Red Chairs Barber

Sitio web premium para **Red Chairs Barber**, barbería exclusiva en Bogotá,
Colombia. *"Más que un corte, una experiencia."*

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com) — sistema de diseño (negro profundo,
  rojo oscuro, dorado)
- [React Router](https://reactrouter.com) — navegación entre páginas
- [Framer Motion](https://www.framer.com/motion) — animaciones de scroll y
  transiciones
- [React Icons](https://react-icons.github.io/react-icons)

Este es un proyecto **Vite + React Router** (SPA de cliente) — no usa
Next.js, no hay App Router ni carpeta `/app`. `src/pages/` es solo la
convención de nombres de este proyecto para los componentes de cada
ruta declarada en `src/App.tsx`.

## Estructura

```
src/
  auth/         AuthProvider, contexto de sesión y hook useAuth
  components/   Navbar, Footer, Logo, cards, Reveal, ProtectedRoute…
    club/       Componentes de RED CLUB (AuthShell, BookingCard)
    staff/      Componentes del panel administrativo y del barbero
                (BookingStatusRow, ClientProfileModal)
  data/         Contenido: servicios, precios, fidelización, testimonios…
  hooks/        useMyBookings, useStaffBookings, useUpdateBookingStatus…
  lib/          supabase (navegador), formato de fechas, clases compartidas
  pages/        Inicio, Servicios, Experiencia VIP, Fidelización, Nosotros,
                Reservar, Contacto
    club/       Login, Registro, Recuperar, Restablecer, Callback, Mi cuenta
    admin/      Panel, Reservas, Clientes, Servicios, Horarios, Barberos
    staff/      Panel del barbero (agenda del día, confirmar asistencia)
  types/        Tipos de las tablas de RED CLUB
api/            Funciones serverless (Vercel): Google Calendar + Supabase
  staff/        Endpoints del panel administrativo y del panel del barbero
  _lib/         Cliente OAuth, cliente admin de Supabase, repositorio de
                reservas, validación de token/rol, horario y catálogo vivos
supabase/
  migrations/   Esquema, funciones, RLS y datos iniciales (SQL)
scripts/        Utilidades de configuración (generador de refresh token)
tests/          Suite de pruebas (npm test)
vercel.json     Rewrite catch-all a index.html + cabeceras de caché
```

Toda la información de marca (nombre, WhatsApp, Instagram, dirección,
horarios) vive en `src/data/site.ts` — un solo lugar para actualizarla.

## Desarrollo

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build de producción en dist/
npm run lint      # oxlint
npm test          # suite de pruebas (node --test)
```

El formulario de `/reservar` llama a los endpoints de `/api` (ver abajo)
para consultar disponibilidad real y crear la cita; localmente esos
endpoints solo corren con `vercel dev` (no con `vite dev`), así que en
`npm run dev` la disponibilidad no cargará. La reserva en sí requiere
que `/api/book` cree el evento en Google Calendar exitosamente antes de
redirigir a WhatsApp — si falla, se muestra un error y no se abre
WhatsApp (evita mensajes de "reserva confirmada" cuando en realidad no
se creó ningún evento).

## Integración con Google Calendar

Las reservas se validan y se crean como eventos reales en Google
Calendar, con toda la lógica de Google ejecutándose solo en funciones
serverless de Vercel (`/api`), nunca en el navegador. **Cada barbero
tiene su propio calendario, completamente independiente** — Camilo
Torres y Alejandro Reyes no comparten agenda.

### Endpoints (`/api`)

- `GET /api/availability?date=YYYY-MM-DD&barberId=camilo|alejandro|any&services=A,B`
  — disponibilidad real para la duración total de los servicios
  seleccionados, en el calendario del barbero indicado (`any` = "sin
  preferencia": disponible si al menos uno de los dos está libre).
- `POST /api/book` — recalcula duración y valor total en el servidor a
  partir de los nombres de servicio recibidos, vuelve a validar el cupo
  (evita dobles reservas) y crea un único evento con todos los
  servicios en el calendario del barbero resuelto (`any` intenta primero
  con Camilo y luego con Alejandro).
- `POST /api/cancel` — elimina un evento por `eventId` en el calendario
  de `barberId`.
- `POST|PATCH /api/reschedule` — lee la duración del evento existente,
  valida el nuevo horario y lo mueve, sin cambiar su duración.
- `GET /api/calendar-health` — diagnóstico de solo lectura: reporta qué
  variables de entorno faltan (nunca sus valores) y, si las 5 están
  presentes, si cada calendario de barbero es válido y accesible con
  las credenciales actuales. No crea, modifica ni elimina nada — útil
  para confirmar la configuración sin depender de los logs de Vercel.
- `POST /api/staff/booking-status` — cambia el estado de una reserva.
  Lo usan el panel administrativo (`role = 'admin'`, cualquier reserva)
  y el panel del barbero (`role = 'barber'`, solo las suyas). Solo
  toca Google Calendar cuando el nuevo estado es `cancelled` (borra el
  evento para liberar el horario) — ver [Panel del barbero](#panel-del-barbero-fase-3).

`/api/availability` y `/api/book` ya no usan un horario ni un catálogo
de servicios fijos: consultan `api/_lib/scheduleRepo.ts` y
`api/_lib/catalogRepo.ts`, que leen el horario y los precios/duración
vivos de Supabase (editables desde el panel) y solo caen al horario
10am–8pm / catálogo estático del repo si Supabase no está configurado o
todavía no tiene esos datos — la reserva nunca depende de que el panel
ya se haya usado.

El propio formulario de `/reservar` hace lo mismo del lado del cliente:
`src/hooks/useServiceOverrides.ts` lee precio/duración vivos de
`services` (lectura pública por RLS) y `applyLiveOverrides` los
superpone sobre el catálogo estático — así lo que ve el cliente
mientras elige servicios ya refleja un cambio hecho en
`/admin/servicios`, no solo lo que valida el servidor al confirmar.

Toda la lógica compartida vive en `api/_lib/` (cliente OAuth2 de Google,
resolución de calendario por barbero, conversión de horarios a
`America/Bogota`, chequeo de horario de atención y de solapamiento de
eventos). La duración y el precio de cada servicio viven en
`src/data/services.ts` (`durationMinutes` por servicio — son estimados,
ajústalos a tus tiempos reales) y se usan tanto en el cliente (total en
vivo) como en el servidor (fuente de verdad para disponibilidad y el
evento creado).

Si falta alguna de las 5 variables de entorno, cualquier endpoint
responde `500` con `{ "error": "...", "missingEnvVars": ["..."] }` —
el nombre exacto de la(s) variable(s) que falta(n), no solo un mensaje
genérico.

### Variables de entorno

Copia `.env.example` a `.env` (o configúralas en Vercel → Project
Settings → Environment Variables) y completa:

| Variable | Descripción |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID del OAuth Client (app web) |
| `GOOGLE_CLIENT_SECRET` | Client Secret del mismo OAuth Client |
| `GOOGLE_REFRESH_TOKEN` | Token de larga duración (ver siguiente sección) |
| `GOOGLE_CALENDAR_ID_CAMILO` | ID del calendario de Camilo Torres |
| `GOOGLE_CALENDAR_ID_ALEJANDRO` | ID del calendario de Alejandro Reyes |

Opcionales: `GOOGLE_CALENDAR_SLOT_DURATION_MINUTES` (fallback interno si
alguna vez se pide un slot sin duración explícita, por defecto 60) y
`GOOGLE_OAUTH_REDIRECT_URI` (solo lo usa el script de abajo).

### Generar GOOGLE_REFRESH_TOKEN

```bash
node --env-file=.env scripts/get-google-refresh-token.mjs
```

El script imprime una URL de consentimiento de Google, levanta un
servidor local para recibir el redirect, y al final imprime el
`refresh_token` en la terminal para que lo copies a tu `.env` y a
Vercel. Nunca inventes ni reutilices un token de otro proyecto.

## RED CLUB (Supabase)

RED CLUB es la plataforma de membresías: cuentas de cliente, historial,
puntos, niveles, recompensas y referidos. **Fase 1** entregó cuentas,
perfiles (con avatar de Google y teléfono editable), rutas protegidas,
"Mi cuenta" con próxima cita e historial, y la persistencia de reservas.
**Fase 2** agregó el panel administrativo: gestión de reservas,
clientes, servicios, horarios y barberos. **Fase 3 (actual)** agrega el
panel del barbero, con confirmación de asistencia. El resto del modelo
de datos (puntos, recompensas, referidos, membresías) ya existe en la
base, listo para las fases siguientes sin migrar nada.

### Principio de degradación

Si las variables de Supabase no están configuradas, **el sitio público
funciona exactamente igual que antes**: las rutas del club se ocultan,
`/club` redirige al inicio y reservar sigue funcionando solo contra
Google Calendar. Supabase es una capa adicional, nunca un requisito
para reservar.

### Modelo de datos

| Tabla | Rol |
|---|---|
| `profiles` | Extiende `auth.users`. Se crea sola por trigger al registrarse; guarda nombre, teléfono, avatar y `role` (`client`/`barber`/`admin`) |
| `barbers`, `services`, `tiers` | Catálogos (lectura pública, escritura solo admin) |
| `barber_schedules` | Horario semanal por barbero (Fase 2) — reemplaza el horario fijo que antes vivía solo en el código |
| `schedule_exceptions` | Festivos y horarios especiales por fecha, globales o de un barbero (Fase 2) |
| `bookings` | **Fuente de verdad** de las reservas; `google_event_id` es la referencia cruzada. Estados: `pending`, `confirmed`, `in_progress`, `completed`, `no_show`, `cancelled` |
| `booking_services` | Servicios de cada reserva, con snapshot de nombre/precio/duración |
| `points_transactions` | **Ledger** de puntos. El saldo se deriva, nunca se guarda como número suelto |
| `rewards`, `reward_redemptions` | Catálogo y canjes (Fase 5) |
| `referrals` | Referidos, con anti-fraude por asistencia (Fase 5) |
| `memberships` | Membresía de pago (Fase 6) |
| `calendar_sync_errors` | Auditoría: cuándo falló liberar un evento de Calendar al cancelar (Fase 3) |

Niveles: **BLACK MEMBER** (0–4 visitas), **RED MEMBER** (5–14),
**GOLD MEMBER** (15–29), **LEGEND MEMBER** (30+). Se derivan de
`profiles.visit_count`, nunca se asignan a mano.

### Panel administrativo (Fase 2)

`/admin` — solo visible y accesible para perfiles con `role = 'admin'`
(gateado por `ProtectedRoute requireAdmin`, igual patrón que
`requireStaff`). No hay flujo de "hazte admin" en la interfaz a
propósito: se otorga a mano, una sola vez por persona, desde el SQL
Editor:

```sql
update public.profiles set role = 'admin' where email = 'correo@ejemplo.com';
```

Incluye:

- **Panel** — resumen del día: citas de hoy, próximas, completadas,
  canceladas, no asistieron, y la agenda del día con el estado editable
  de cada cita.
- **Reservas** — todas las reservas, filtrables por fecha, barbero y
  cliente (nombre o teléfono), con cambio de estado en línea.
- **Clientes** — buscar y editar nombre/teléfono de cualquier cliente.
- **Servicios** — precio, duración y categoría son la fuente real que
  usa una reserva nueva (no solo el catálogo estático del frontend); un
  servicio no se borra (puede tener historial), se desactiva.
- **Horarios** — horario semanal por barbero y excepciones puntuales
  (festivos, horario especial de un día). Lo consulta directamente
  `/api/availability` y `/api/book`: cambiarlo aquí cambia qué horas se
  pueden reservar de verdad.
- **Barberos** — nombre, orden y activo/inactivo (un barbero inactivo
  deja de recibir reservas nuevas sin perder su historial). Agregar un
  barbero *nuevo de verdad* no se puede hacer solo desde aquí: necesita
  su propio calendario de Google (una variable de entorno más, ver
  arriba) y no lo cubre esta fase.

**Cambiar el estado de una cita a "Completada" no otorga puntos
todavía** — el trigger `set_booking_status_timestamps` (migración 0008)
ya registra `completed_at`, y `bookings.completed_by` (migración 0011)
registra quién la confirmó. Ese es exactamente el enganche que usará la
Fase 4 para el sistema de puntos, sin tener que rediseñar nada del
panel.

El cambio de estado pasa por `POST /api/staff/booking-status` (con la
service-role key) en vez de una escritura directa desde el navegador,
porque ahí es donde se verifica que un barbero solo pueda tocar sus
propias reservas — eso RLS no lo puede expresar sin duplicar esa misma
lógica. El resto de las tablas del panel (servicios, horarios,
clientes) sí escriben directo a Supabase, protegidas por las políticas
de RLS `*_admin_insert`/`*_admin_update` de la migración 0010.

### Panel del barbero (Fase 3)

`/barbero` — visible y accesible para `role = 'barber'` **o**
`role = 'admin'` (gateado por `ProtectedRoute requireStaff`, que ya
existía desde la Fase 1). Un barbero ve únicamente su propia agenda; un
admin sin barbero vinculado ve un selector para revisar la de
cualquiera.

Para que un barbero de verdad pueda entrar y que el panel lo acote a
sus propias citas, hacen falta **dos pasos manuales por cada barbero**,
igual de únicos que el de volverte admin:

```sql
-- 1. Darle el rol de barbero a su cuenta ya registrada
update public.profiles set role = 'barber' where email = 'correo-del-barbero@ejemplo.com';

-- 2. Vincular esa cuenta a su fila en barbers (para que el panel
--    y /api/staff/booking-status sepan que ESTA cuenta es Camilo/Alejandro)
update public.barbers set user_id = (
  select id from public.profiles where email = 'correo-del-barbero@ejemplo.com'
) where id = 'camilo';
```

`supabase/verify.sql` (sección 13) muestra qué barberos ya tienen
cuenta vinculada y con el rol correcto.

El panel muestra, por reserva: nombre y teléfono del cliente, servicios
reservados, barbero, hora, duración y estado — con un botón **"Marcar
como completada"** además del selector con los 6 estados. Desde
cualquier reserva con cuenta se puede abrir la **ficha del cliente**
(nombre, correo, teléfono, nivel actual, próximas reservas e historial).

**Cómo se sincroniza cada estado con Google Calendar** (Supabase sigue
siendo la fuente oficial de datos; Calendar es la agenda que usan los
barberos):

| Estado | Google Calendar |
|---|---|
| Pendiente, Confirmada, En proceso, Completada | Sin cambios — solo seguimiento interno |
| **Cancelada** | **Se borra el evento**, para liberar el horario y que otro cliente pueda reservarlo |
| No asistió | Sin cambios — la cita ocurrió y queda como registro histórico |

Orden de operaciones al cancelar: 1) actualizar Supabase, 2) solo si
eso tuvo éxito, intentar borrar el evento de Calendar, 3) si el borrado
falla, el estado en Supabase **no se revierte** — ya es la fuente de
verdad y quien canceló ya lo espera. El fallo se registra en
`calendar_sync_errors` (no solo en los logs de Vercel, que se pierden
con el tiempo) y la persona que canceló ve un aviso en el panel
("se canceló, pero no se pudo liberar el horario — revísalo
manualmente"). `supabase/verify.sql` (sección 14) lista las
cancelaciones pendientes de corregir a mano; un futuro panel
administrativo podrá leer esa misma tabla para mostrarlas y
resolverlas sin depender del SQL Editor.

### Seguridad

- El navegador usa la **anon key**; lo que protege los datos es **Row
  Level Security**, no el secreto de la llave.
- La **service-role key** vive solo en `/api` (sin prefijo `VITE_`, para
  que Vite no pueda incluirla en el bundle).
- **Puntos, reservas y referidos se escriben solo desde el servidor.** No
  existen políticas de escritura para el cliente: si las hubiera,
  cualquiera podría asignarse LEGEND desde la consola del navegador.
- Las vistas declaran `security_invoker = true` para que respeten el RLS
  de quien consulta.

### Flujo de una reserva

```
Cliente reserva
   ↓  1. Se guarda en Supabase (status 'pending') + booking_services
   ↓  2. Se crea el evento en Google Calendar
   ↓  3. Se guarda google_event_id y pasa a 'confirmed'
```

**Si el paso 1 falla, se aborta y NO se crea el evento en Calendar**, y
el error real viaja al cliente en el campo `detail`. Una cita en la
agenda sin registro en la base no se podría mostrar en "Mi cuenta", ni
cancelar, ni contar para el club.

Si el paso 2 falla, la reserva se elimina de la base para no bloquear un
horario que en realidad está libre.

Reservar sin cuenta sigue permitido: `bookings.user_id` es nulo para
invitados.

### Instalación / actualización de la base

En Supabase → **SQL Editor**, ejecutar en orden los archivos de
`supabase/migrations/`. Son idempotentes y ninguno borra datos:

1. `0001_schema.sql` — tablas, tipos e índices
2. `0002_functions.sql` — triggers, funciones y vistas
3. `0003_rls.sql` — Row Level Security
4. `0004_seed.sql` — niveles, barberos y servicios
5. `0005_profile_and_diagnostics.sql` — avatar de Google, control del
   formulario de teléfono y la función de diagnóstico
6. `0006_fix_diagnostics_grant.sql` — corrige un permiso: si ya
   ejecutaste 0005 antes de esta versión, `service_role` se quedó sin
   poder llamar al diagnóstico (`permission denied for function
   redclub_diagnostics` en `/api/health`). Este archivo lo repara sin
   tocar nada más; si instalas desde cero con el 0005 actualizado ya no
   hace falta, pero ejecutarlo de todas formas no hace daño.
7. `0007_grant_table_privileges.sql` — corrige otro permiso: si ya
   ejecutaste 0003 antes de esta versión, ninguna tabla tenía un
   `GRANT` explícito para `anon`/`authenticated`/`service_role`. RLS
   solo filtra filas; sin el `GRANT` de tabla, Postgres responde
   `permission denied for table X` antes de mirar la política — esto
   también explica por qué "Mi cuenta" no podía leer las reservas del
   cliente. Igual que 0006, si instalas desde cero ya no hace falta,
   pero ejecutarlo no hace daño.
8. `0008_booking_status_expand.sql` — agrega los estados `in_progress` y
   `completed` (renombra el antiguo `attended`) y el trigger que sella
   `completed_at`/`cancelled_at` automáticamente.
9. `0009_schedules.sql` — crea `barber_schedules` y
   `schedule_exceptions`, y siembra el horario publicado hoy (lunes a
   sábado 10am–8pm, domingo cerrado) para los barberos ya existentes.
10. `0010_admin_rls.sql` — políticas de RLS y permisos de tabla para que
    `role = 'admin'` pueda administrar catálogos, horarios y perfiles
    desde el panel.
11. `0011_booking_confirmation.sql` — agrega `bookings.completed_by`
    (qué barbero confirmó la asistencia), para el panel del barbero.
12. `0012_calendar_sync_errors.sql` — tabla de auditoría para cuando
    cancelar actualiza Supabase pero falla al liberar el evento en
    Google Calendar.

**`0004_seed.sql` no es opcional.** `bookings.barber_id` tiene una llave
foránea contra `barbers`; con esa tabla vacía **ninguna reserva se puede
guardar**.

### Diagnóstico

- `GET /api/health` — el diagnóstico completo. Reporta variables
  faltantes, cada tabla con su número de filas, si los catálogos están
  sembrados, y verifica llaves foráneas, índices, triggers, funciones,
  vistas y RLS. Cuando algo falla devuelve `problems` y `nextSteps` con
  el archivo exacto a ejecutar. No escribe nada.
- `GET /api/calendar-health` — equivalente para Google Calendar.
- `supabase/verify.sql` — las mismas comprobaciones desde el SQL Editor,
  con resultados en tablas legibles.

## Próximas fases

- **Fase 4** — Puntos visibles, niveles automáticos y tarjeta digital.
  "Completada" (con `completed_at`/`completed_by` ya listos) es la
  puerta que otorgará visitas y puntos.
- **Fase 5** — Recompensas, canjes y referidos
- **Fase 6** — Membresía de pago y notificaciones
