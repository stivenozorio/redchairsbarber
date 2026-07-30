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
  data/         Contenido: servicios, precios, fidelización, testimonios…
  hooks/        useMyBookings…
  lib/          supabase (navegador), formato de fechas, clases compartidas
  pages/        Inicio, Servicios, Experiencia VIP, Fidelización, Nosotros,
                Reservar, Contacto
    club/       Login, Registro, Recuperar, Restablecer, Callback, Mi cuenta
  types/        Tipos de las tablas de RED CLUB
api/            Funciones serverless (Vercel): Google Calendar + Supabase
  _lib/         Cliente OAuth, cliente admin de Supabase, repositorio de
                reservas, validación de token, horarios
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
puntos, niveles, recompensas y referidos. **Fase 1 (actual)** entrega
cuentas, perfiles (con avatar de Google y teléfono editable), rutas
protegidas, "Mi cuenta" con próxima cita e historial, y la persistencia
de reservas. El resto del modelo de datos ya existe en la base, listo
para las fases siguientes sin migrar nada.

### Principio de degradación

Si las variables de Supabase no están configuradas, **el sitio público
funciona exactamente igual que antes**: las rutas del club se ocultan,
`/club` redirige al inicio y reservar sigue funcionando solo contra
Google Calendar. Supabase es una capa adicional, nunca un requisito
para reservar.

### Modelo de datos

| Tabla | Rol |
|---|---|
| `profiles` | Extiende `auth.users`. Se crea sola por trigger al registrarse; guarda nombre, teléfono y avatar |
| `barbers`, `services`, `tiers` | Catálogos (lectura pública) |
| `bookings` | **Fuente de verdad** de las reservas; `google_event_id` es la referencia cruzada |
| `booking_services` | Servicios de cada reserva, con snapshot de nombre/precio/duración |
| `points_transactions` | **Ledger** de puntos. El saldo se deriva, nunca se guarda como número suelto |
| `rewards`, `reward_redemptions` | Catálogo y canjes (Fase 5) |
| `referrals` | Referidos, con anti-fraude por asistencia (Fase 5) |
| `memberships` | Membresía de pago (Fase 6) |

Niveles: **BLACK MEMBER** (0–4 visitas), **RED MEMBER** (5–14),
**GOLD MEMBER** (15–29), **LEGEND MEMBER** (30+). Se derivan de
`profiles.visit_count`, nunca se asignan a mano.

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

- **Fase 2** — Perfil editable y dashboard de RED CLUB
- **Fase 3** — Panel del barbero y confirmación de asistencia (única
  puerta que otorga puntos)
- **Fase 4** — Puntos visibles, niveles automáticos, tarjeta digital
- **Fase 5** — Recompensas, canjes y referidos
- **Fase 6** — Membresía de pago y notificaciones
