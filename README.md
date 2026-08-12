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
- `POST /api/staff/block-slot` — bloquea un horario de un barbero para
  un cliente presencial — ver [Bloquear horarios](#bloquear-horarios-para-clientes-presenciales-fase-4).

`/api/availability` y `/api/book` ya no usan un horario ni un catálogo
de servicios fijos: consultan `api/_lib/scheduleRepo.ts` y
`api/_lib/catalogRepo.ts`, que leen el horario y los precios/duración
vivos de Supabase (editables desde el panel) y solo caen al horario
10am–8pm / catálogo estático del repo si Supabase no está configurado o
todavía no tiene esos datos — la reserva nunca depende de que el panel
ya se haya usado.

El propio formulario de `/reservar` hace lo mismo del lado del cliente:
`src/hooks/useServiceOverrides.ts` lee nombre/precio/duración vivos de
`services` (lectura pública por RLS) y `applyLiveOverrides` los
superpone sobre el catálogo estático — así lo que ve el cliente
mientras elige servicios ya refleja un cambio hecho en
`/admin/servicios` (incluido renombrar un servicio), no solo lo que
valida el servidor al confirmar.

**Los servicios se emparejan por `id`, no por nombre.** El id es la
llave estable (`bookings`/`booking_services` ya lo usaban así desde la
Fase 1); el nombre es solo texto para mostrar y se puede renombrar
libremente desde el panel sin romper una reserva en curso ni el
historial. `sumServiceTotals`/`getServicesByIds` en
`src/data/services.ts` son la única función de emparejamiento, la
comparten cliente y servidor.

Toda la lógica compartida vive en `api/_lib/` (cliente OAuth2 de Google,
resolución de calendario por barbero, conversión de horarios a
`America/Bogota`, chequeo de horario de atención y de solapamiento de
eventos). La duración y el precio de cada servicio viven en
`src/data/services.ts` (`durationMinutes` por servicio — son estimados,
ajústalos a tus tiempos reales) y se usan tanto en el cliente (total en
vivo) como en el servidor (fuente de verdad para disponibilidad y el
evento creado).

**`TIME_SLOTS` (`src/data/booking.ts`) ofrece horas cada 30 minutos, no
cada hora.** Antes solo eran horas en punto: si un servicio duraba 30
minutos (p. ej. un corte de barba), el cupo que dejaba libre nunca se
podía volver a reservar porque la media hora ni siquiera existía como
opción — la siguiente hora disponible saltaba directo a la próxima en
punto, perdiendo 30 minutos reales de agenda por cada cita corta. Es un
único array generado (`generateTimeSlots`), así que el mismo cambio de
granularidad aplica a la vez en `/reservar`, el reagendado desde "Mi
cuenta", el bloqueo de horarios del barbero, y `/api/availability`.

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
clientes, servicios, horarios y barberos. **Fase 3** agregó el panel
del barbero, con confirmación de asistencia. **Fase 4 (actual)** activa
puntos y niveles automáticos: al completar una cita se otorgan puntos y
se suma la visita, y "Mi cuenta" muestra una tarjeta digital con el
nivel y el progreso. El resto del modelo de datos (recompensas,
referidos, membresías) ya existe en la base, listo para las fases
siguientes sin migrar nada.

### Principio de degradación

Si las variables de Supabase no están configuradas, **el sitio público
funciona exactamente igual que antes**: las rutas del club se ocultan
y `/club` redirige al inicio.

**Excepción deliberada: `/reservar` sí depende de Supabase.** Hasta un
ajuste posterior de la Fase 4, reservar sin cuenta funcionaba a
propósito (ver el historial de este archivo). Eso cambió: **reservar
ahora exige cuenta** (ver "Reservar exige cuenta" más abajo), así que
si Supabase no está configurado, nadie puede iniciar sesión ni
registrarse y por lo tanto tampoco puede reservar. Es una consecuencia
aceptada del cambio, no un descuido — sin Supabase no existe el
concepto de "cuenta" del que depende la regla.

### Reservar exige cuenta (Fase 4, ajuste)

Antes, cualquiera podía reservar sin registrarse ("invitado"). Se quitó
esa opción a propósito: sin una cuenta que relacione los intentos de
una misma persona, distintas reservas de quien no tenía sesión no
tenían forma de reconocerse entre sí (nada quedaba guardado en el
navegador que las relacionara), lo que producía reservas duplicadas
para el mismo horario.

Se aplica en dos capas, no solo una:

- **Frontend** — `/reservar` está envuelta en `<ProtectedRoute
  redirectTo="/club/registro" />` (`App.tsx`). Quien no tiene sesión
  nunca llega a ver el formulario: se le redirige directo a **crear
  cuenta** (no a iniciar sesión — se asume que quien no tiene sesión
  probablemente tampoco tiene cuenta que iniciar). `ProtectedRoute`
  ahora acepta un `redirectTo` opcional (por defecto `/club/entrar`,
  el de siempre) precisamente para este caso.
- **Servidor** — `api/book.ts` rechaza la reserva si
  `getUserIdFromRequest()` no resuelve un usuario válido, sin importar
  qué haya dejado pasar (o no) el navegador. Es la capa que de verdad
  importa: la del frontend es solo una mejor experiencia, nunca la
  única barrera — mismo principio que ya se seguía para el saldo de
  puntos del canje.

**Vuelta al origen después de registrarse.** `ProtectedRoute` guarda la
ruta de origen en `location.state.from`, igual que ya hacía para
`/club/entrar`. `Register.tsx` ahora también lo respeta (antes solo lo
hacía `Login.tsx`): si alguien llega a `/club/registro` redirigido
desde `/reservar` y se registra con correo/contraseña, vuelve
automáticamente a `/reservar` en vez de quedar en "Mi cuenta". Esto
**no** se replicó en el camino de Google OAuth (`AuthCallback.tsx`) ni
en el de confirmación por correo: ambos redirigen siempre a `/club`,
porque la navegación completa hacia Google (o el clic en el enlace del
correo, en otro momento y quizás otro dispositivo) pierde el
`location.state` de React Router — conservar el destino ahí requeriría
persistirlo aparte (p. ej. `localStorage`), que se dejó fuera a
propósito por ser una pieza nueva de estado para un beneficio menor
(un clic de más para volver a `/reservar` manualmente).

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

### Puntos y niveles automáticos (Fase 4)

Marcar una cita como **"Completada"** desde el panel del barbero o el
administrativo (`POST /api/staff/booking-status`) dispara el trigger
`bookings_award_points`, que corre en el mismo cambio de estado y cuya
función (`award_points_on_completion()`) se definió en la migración
0013 y se corrigió en la **0017** (ver abajo):

1. Otorga puntos en `points_transactions` (motivo `booking_attended`)
   **según el servicio realizado**, no un monto fijo — ver fórmula
   abajo.
2. Suma 1 a `profiles.visit_count`, de donde `tier_for_visits` ya
   deriva el nivel automáticamente (sin lógica nueva: es la misma
   función y la misma vista `club_member_summary` de la Fase 1).

**Puntos por servicio (migración 0017).** Hasta la 0013, toda cita
completada otorgaba siempre 10 puntos fijos sin importar el servicio.
La 0017 lo corrigió: ahora cada línea de `booking_services` de la
reserva otorga `piso(price_cop_snapshot / 2000)` puntos, y si la
reserva combina varios servicios (ej. Corte + Afeitado por separado),
se suman los puntos de cada línea. Esta fórmula reproduce exacta la
tabla oficial del programa:

| Servicio | Precio | Puntos |
|---|---|---|
| Cejas / Lavado Capilar | $5.000 | 2 |
| Recorte de Barba Sencillo / Relajación Facial / Descanso Visual | $10.000 | 5 |
| Masaje Ocular | $12.000 | 6 |
| Afeitado / Mascarilla Express | $15.000 | 7 |
| Corte de Cabello Sencillo | $20.000 | 10 |
| Barba Premium / Corte + Cejas | $25.000 | 12 |
| Corte Premium / Corte + Barba | $30.000 | 15 |
| Spa Facial / Corte Plus + Cejas / Corte + Barba + Cejas | $35.000 | 17 |
| Corte Premium + Barba / Corte Plus + Barba | $40.000 | 20 |
| Experiencia VIP | $65.000 | 32 |
| Experiencia VIP + Barba | $75.000 | 37 |
| Experiencia VIP + Barba + Cejas | $81.000 | 40 |

Reglas explícitas:

- **Solo cuentas con perfil ganan puntos.** Una reserva de invitado
  (`user_id` nulo) no otorga nada — no hay cuenta a la cual dárselo.
- **Una vez por reserva.** El índice único
  `points_tx_one_per_booking_idx` (Fase 1) impide que otorgar puntos dos
  veces por la misma cita sea posible aunque el trigger se dispare de
  nuevo; el `ON CONFLICT ... DO NOTHING` del trigger lo respeta.
- **Sin reversa automática.** Si una cita se corrige de "Completada" a
  otro estado después, esta versión **no resta** los puntos ni la
  visita — es una decisión a propósito, no un olvido. Un ajuste manual
  usaría el motivo `manual_adjustment` que ya existe en el enum, en un
  panel futuro.
- **Los puntos ya otorgados no se tocan.** La 0017 solo cambia el
  cálculo hacia adelante: no modifica ni recalcula ninguna fila
  existente de `points_transactions` ni `profiles.visit_count`. El
  saldo histórico de cada cliente queda exactamente igual que antes de
  correr esa migración.
- Para cambiar la fórmula de puntos, editar el `select ... into
  total_points` dentro de `award_points_on_completion()` (migración
  0017) y volver a ejecutar el archivo — es idempotente.

**Vista previa de puntos al reservar.** La pantalla `/reservar` (ver
`src/pages/Booking.tsx`) es a la vez el "carrito" y el apartado de
reservas del sitio — no existen como pantallas separadas — así que ahí
mismo se muestra, junto al precio de cada servicio en el checkbox, cuántos
puntos otorgaría (`calculatePoints()` en `src/data/services.ts`, que
replica exacto `piso(precio / 2000)`), y el resumen de abajo suma el
total para los servicios elegidos. Es solo informativo: el otorgamiento
real sigue pasando únicamente en la base de datos, cuando la cita se
marca "Completada" con una cuenta vinculada — por eso el resumen aclara
"Los puntos se acreditan a tu cuenta RED CLUB al completar la cita."

**Página pública `/puntos` (Tabla de Puntos).** `src/pages/PointsTable.tsx`
muestra, agrupado por categoría igual que `/servicios`, una tabla con
el precio y los puntos RED CLUB de cada servicio del catálogo (misma
`calculatePoints()`, así que nunca se desincroniza de lo que otorga el
trigger ni de la vista previa de `/reservar`), con un botón "Reservar
cita" al final como llamado a la acción. Está enlazada desde
`/fidelizacion` ("Ver cuántos puntos otorga cada servicio"); no se
agregó al menú principal (`NAV_LINKS` en `src/data/site.ts`) para no
sobrecargarlo — se puede agregar ahí si se quiere más visibilidad.

### Canje de servicios con puntos (Fase 4, ajuste)

Migración `0018_points_redemption.sql`. Un cliente con cuenta y
suficientes puntos puede pagar **un servicio** con puntos en vez de
efectivo, directamente desde `/reservar`.

**Tasa de canje: 1 punto = $300 COP**, `piso(precio / 300)` —
deliberadamente distinta de la tasa con la que se GANAN puntos
(`piso(precio / 2000)`, la de arriba). `calculateRedemptionCost()` en
`src/data/services.ts` es la fórmula del lado del cliente (vista
previa); `redeem_points_for_booking()` en la base es la autoritativa —
deben coincidir siempre.

**Por qué el canje es de UN solo servicio por reserva.**
`booking_services` nunca tuvo (ni necesita) un concepto de "método de
pago por línea" — el precio siempre ha sido de la reserva completa.
Soportar canjes parciales de una reserva con varios servicios
requeriría una columna nueva ahí y prorratear el otorgamiento/reembolso
de puntos por línea, sin que ningún caso de uso real lo pidiera. Si un
cliente quiere canjear un servicio y pagar otro en efectivo, son dos
reservas separadas. Por eso, si se seleccionan 2+ servicios en
`/reservar`, la opción de canje simplemente no aparece (con una nota
explicando por qué).

**Columnas nuevas en `bookings`:** `redeemed_with_points` (boolean) y
`points_redeemed` (integer, null si no fue canje) — un `check`
mantiene la consistencia entre ambas. El **precio original** del
servicio se sigue guardando tal cual en `total_price_cop`: el canje no
lo pone en cero, solo cambia cómo se pagó.

**Protección contra doble gasto.** El descuento nunca se calcula en el
navegador ni se confía en lo que mande — pasa por
`redeem_points_for_booking()` (función de Postgres, `EXECUTE` revocado
de `public`, solo `service_role` puede llamarla), que:
1. Toma un `pg_advisory_xact_lock` por usuario (serializa cualquier
   llamada concurrente del mismo cliente — un doble clic en "Canjear"
   hace que la segunda petición espere a la primera).
2. Recalcula el saldo real (`sum(points_transactions.amount)`) DENTRO
   de ese bloqueo.
3. Si alcanza, inserta la fila negativa (motivo `reward_redemption`,
   ligada al `booking_id`); si no, no inserta nada y devuelve el
   motivo.

`api/book.ts` la llama justo después de crear la fila en `bookings`
(reserva en `pending`) y ANTES de tocar Google Calendar. Si el canje
falla, se descarta la reserva completa (`discardBooking`, el mismo
mecanismo que ya existía para cuando fallaba Calendar) y se responde
409 — así nunca queda una reserva marcada como "canjeada" sin que el
descuento real haya ocurrido.

**Una reserva canjeada, al completarse:**
- **NO** otorga los puntos normales del servicio (se agregó
  `and not new.redeemed_with_points` a la condición dentro de
  `award_points_on_completion()` — un cambio de una línea, el resto de
  la función es idéntico a la 0017).
- **SÍ** sigue sumando la visita (`profiles.visit_count`) y por lo
  tanto sigue contando para el nivel (BLACK/RED/GOLD/LEGEND) — puntos y
  visitas son conceptos distintos.

**Cancelar una reserva canjeada devuelve los puntos.** Trigger nuevo
`refund_points_on_cancellation()` (`AFTER UPDATE on bookings`,
independiente de `bookings_award_points`): se dispara cuando el estado
pasa a `cancelled` por primera vez en una reserva con
`redeemed_with_points = true`, e inserta una fila positiva (motivo
`redemption_refund`, nuevo valor en el enum `points_reason`). Como es
un trigger de base de datos, cubre los dos caminos de cancelación por
igual (`/api/cancel.ts`, autoservicio del cliente, y
`/api/staff/booking-status.ts`, panel admin/barbero) sin duplicar
lógica en ninguno de los dos archivos de TypeScript. Ambos
otorgamientos (canje y reembolso) están además protegidos por un
índice único por `booking_id` — como mucho una vez cada uno, nunca se
borra ni se modifica una transacción ya existente.

**WhatsApp.** El mensaje de confirmación agrega la línea `CANJEÓ CON
PUNTOS: N puntos` al final cuando corresponde (`Booking.tsx`), y el
evento de Google Calendar también queda con esa nota en su descripción
— para que el barbero sepa de un vistazo que no debe cobrar en
efectivo.

**"Mi cuenta"** muestra el movimiento del canje en un historial nuevo,
de solo lectura (`PointsHistory.tsx` + `usePointsHistory.ts`, lee
`points_transactions` directo — RLS ya limita a las propias filas del
socio), y las tarjetas de reserva (`BookingCard.tsx`) y el panel
administrativo/del barbero (`BookingStatusRow.tsx`,
`BarberProfileModal.tsx`) muestran una insignia "Canjeado con N
puntos" cuando aplica.

**Límite de estas pruebas.** La suite de tests (`redclub-schema.test.ts`,
sección "0018") verifica el TEXTO del SQL de la migración — que el
bloqueo, el recálculo de saldo, las guardas de condición y los índices
únicos estén presentes y en el orden correcto — no el comportamiento en
vivo contra una base Postgres real (este entorno no tiene una
disponible). Antes de dar por buena la protección contra doble gasto en
producción, correr la migración y probar manualmente el escenario de
doble clic / dos pestañas con el mismo usuario.

**Si el trigger corrió (`visit_count`/`points_transactions` ya están
correctos en la base) pero la tarjeta digital no aparece en "Mi
cuenta"**, casi seguro falta `0014_grant_club_summary_views.sql`: RLS
con `security_invoker = true` respeta las políticas de las tablas de
abajo, pero la vista en sí necesita su propio `GRANT SELECT` — sin él,
el navegador recibe `permission denied for view club_member_summary` y
`DigitalCard` se degrada en silencio (no muestra ningún error).
`supabase/verify.sql` lo confirma en la sección de permisos de las
vistas de socio.

**Tarjeta digital** — `src/components/club/DigitalCard.tsx`, visible en
"Mi cuenta" arriba de los datos del socio. Muestra nombre, nivel,
puntos y cuántas visitas faltan para el siguiente nivel
(`visitsToNextTier` en `src/data/tiers.ts`), leyendo `useMemberSummary`
(la misma vista `club_member_summary`). Es solo visual — sin código QR
en esta fase — y no se renderiza si Supabase no está configurado o el
socio todavía no tiene resumen, siguiendo el mismo principio de
degradación del resto del sitio.

### Cumpleaños del socio (Fase 4, ajuste)

`profiles.birthday` existía desde la Fase 1 (pensado para el motivo
`birthday_bonus` del enum `points_reason`), pero nunca se pedía ni se
mostraba en ningún lado. La migración `0015_club_summary_birthday.sql`
lo agrega a `club_member_summary`; el dato en sí se captura en tres
lugares:

- **"Mi cuenta"** (`ProfileCard.tsx`) — el socio lo edita junto a su
  teléfono.
- **Panel administrativo → Clientes** (`Clients.tsx`) — un admin puede
  cargarlo a mano para un cliente que no lo haya puesto.
- **Ficha del cliente** (`ClientProfileModal.tsx`, se abre desde una
  reserva en el panel administrativo o del barbero) — de solo lectura,
  para saber a quién darle el premio de cumpleaños en el momento.

Esta fase solo agrega el campo. **El canje del premio en sí (otorgar
puntos automáticamente el día del cumpleaños) queda para la Fase 5**
("Recompensas, canjes y referidos") — el motivo `birthday_bonus` ya
existe en la base para cuando se construya. Mientras tanto,
`supabase/verify.sql` (sección 16) lista quién cumple años este mes
para dar el premio a mano.

### "Ver perfil" de clientes y barberos (Fase 4, ajuste)

Desde el panel administrativo, tanto `/admin/clientes` como
`/admin/barberos` tienen un botón **"Ver perfil"** por fila:

- **Clientes** — abre `ClientProfileModal.tsx` (el mismo componente que
  ya se usaba al abrir un cliente desde una reserva): nivel, visitas,
  **puntos** (badge nuevo en este ajuste — antes el modal no los
  mostraba, solo la lista de `/admin/clientes` lo hacía) y el historial
  completo de reservas (próximas y pasadas), vía `useMyBookings`.
- **Barberos** — abre `BarberProfileModal.tsx` (nuevo,
  `src/components/admin/`), con el historial de citas que se le
  asignaron (hasta las últimas 200, más recientes primero) y un resumen
  rápido de completadas/canceladas/no-asistió. Usa el hook nuevo
  `useBarberBookingHistory.ts` — mismo patrón de dos consultas que
  `useMyBookings.ts`, pero filtrando por `barber_id` en vez de
  `user_id`, y excluyendo los bloqueos de horario (`source = 'blocked'`,
  ver bloqueo de horas más arriba) porque no son citas reales de un
  cliente. Un barbero no tiene puntos ni nivel — eso es propio de una
  cuenta de cliente — así que ese modal no los muestra.

### Bloquear horarios para clientes presenciales (Fase 4, ajuste)

Un barbero (o un admin, eligiendo el barbero) puede bloquear un
horario específico desde `/barbero` (`BlockSlotForm.tsx`, arriba de la
agenda) para reservarlo a un cliente que llega sin cita — ese horario
deja de ofrecerse en `/reservar` de inmediato.

**Por qué no es una tabla nueva:** `/api/availability` decide qué horas
están libres consultando **solo Google Calendar** (nunca Supabase), así
que un bloqueo tiene que existir como un evento real en el calendario
del barbero para que de verdad deje de ofrecerse — una fila en Supabase
sola no alcanzaría. La forma más simple de lograrlo, sin duplicar toda
la lógica de conflictos/horario de `/api/book`, fue reutilizar
`bookings` con `source = 'blocked'`: mismo flujo de siempre (evento en
Calendar + fila en `bookings`), sin servicios ni cuenta asociada, con
`customer_name = 'Bloqueado (uso interno)'`.

- `POST /api/staff/block-slot` — recibe `{barberId, date, time,
  durationMinutes, note}`. Un barbero solo puede bloquear su propia
  agenda (mismo criterio que `booking-status.ts`); un admin, la de
  cualquiera. Valida horario de atención y que el barbero esté
  realmente libre, igual que una reserva normal.
- **Desbloquear no necesita un endpoint nuevo:** un bloqueo es una
  reserva más, así que cambiar su estado a `cancelled` con el
  `/api/staff/booking-status` que ya existe libera el horario en
  Calendar automáticamente. `BookingStatusRow.tsx` muestra los bloqueos
  con una fila simplificada (badge "Bloqueado" en vez del selector de
  estado) y un botón único "Desbloquear".
- Los bloqueos se excluyen de los conteos del panel ("Agenda del
  día", "Pendientes", etc. en `BarberPanel.tsx`/`Dashboard.tsx`): no son
  citas reales.
- `supabase/verify.sql` (sección 17) lista los bloqueos activos.

### Bloquear un día completo (Fase 4, ajuste)

Distinto del bloqueo de una hora puntual: un barbero (o un admin,
eligiendo el barbero) puede marcar que **no va a trabajar un día
entero** desde `/barbero` (`DayOffForm.tsx`, junto al bloqueo de
horarios). Ese día deja de ofrecer horas en `/reservar` de inmediato,
para cualquier servicio.

**Por qué esta sí es solo una fila en Supabase, sin tocar Calendar:**
a diferencia de la disponibilidad por horas (que depende de Google
Calendar), el horario de un día completo ya se resuelve consultando
`schedule_exceptions` — la misma tabla que usa el panel administrativo
en `/admin/horarios` para festivos y horarios especiales (Fase 2). Un
día bloqueado por un barbero es exactamente ese mismo tipo de
excepción (`is_closed = true`), solo que creada por el barbero para su
propia agenda en vez de por un admin.

- `POST /api/staff/day-off` — recibe `{barberId, date, note}`. Mismo
  criterio de autorización que el resto de `/api/staff/*`: un barbero
  solo puede bloquear su propia agenda; un admin, la de cualquiera.
- `DELETE /api/staff/day-off` — quita el bloqueo (vuelve al horario
  semanal normal). Solo borra excepciones que esta misma función haya
  creado (`is_closed = true`); no toca un horario especial que un admin
  haya configurado a mano desde `/admin/horarios`.
- **A propósito no cancela citas que ya existan ese día** — mismo
  comportamiento que ya tenían las excepciones del panel administrativo.
  El formulario se lo advierte al barbero antes de confirmar
  (`window.confirm`); si ya tiene citas agendadas, debe cancelarlas o
  reprogramarlas aparte.
- `DayOffForm.tsx` también lista los próximos días ya bloqueados de ese
  barbero, con un botón para quitar el bloqueo.

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
  Cada fila muestra también su **nivel y puntos de RED CLUB** (Fase 4,
  ajuste), leídos de `club_member_summary` en una segunda consulta
  aparte de `profiles` — informativa, no bloqueante: si falla, la lista
  de clientes se sigue mostrando, solo sin el badge de puntos.
- **Servicios** — precio, duración y categoría son la fuente real que
  usa una reserva nueva (no solo el catálogo estático del frontend); un
  servicio no se borra (puede tener historial), se desactiva.
- **Horarios** — horario semanal por barbero y excepciones puntuales
  (festivos, horario especial de un día). Lo consulta directamente
  `/api/availability` y `/api/book`: cambiarlo aquí cambia qué horas se
  pueden reservar de verdad. Este es el lugar correcto para ajustar el
  horario de un barbero puntual sin tocar código — la migración 0016
  solo existía porque hacía falta corregir el dato ya sembrado y el
  horario por defecto de un barbero nuevo, ambos a la vez.

**Horario publicado hoy: 10:00 a.m. – 9:00 p.m., último cliente a las
8:30 p.m. (Fase 4, ajuste).** Antes cerraba a las 8:00 p.m., pero con
el cierre en `20:00` una cita que empezara justo ahí en realidad
**nunca cabía** — `fitsWithinHours` exige que `inicio + duración`
termine antes del cierre, así que ni las 8:00 ni las 8:30 quedaban
disponibles de verdad aunque el selector las mostrara (ver también la
Fase 4 de horas cada 30 minutos, arriba). `0016_extend_closing_hour.sql`
mueve el cierre a `21:00` tanto en los horarios ya sembrados como en el
horario por defecto de un barbero nuevo.
- **Barberos** — nombre, orden y activo/inactivo (un barbero inactivo
  deja de recibir reservas nuevas sin perder su historial). Agregar un
  barbero *nuevo de verdad* no se puede hacer solo desde aquí: necesita
  su propio calendario de Google (una variable de entorno más, ver
  arriba) y no lo cubre esta fase.

  **El campo "Orden" de esta pantalla solo ordena esta misma lista**,
  no el selector de barbero que ve el cliente en `/reservar` ni el del
  panel del barbero — esos usan el orden fijo en `BARBERS`
  (`src/data/booking.ts`), no `barbers.sort_order`. Para cambiar el
  orden en que aparecen en toda la web (no solo aquí), hay que editar
  ese archivo. Tampoco cambia a quién se le asigna una reserva "Sin
  preferencia": eso sigue el orden fijo `requestedCandidates` en
  `api/book.ts` (hoy intenta primero con Camilo).

**Cambiar el estado de una cita a "Completada" ya otorga puntos y suma
la visita** (Fase 4, migración 0013) — el trigger
`set_booking_status_timestamps` (migración 0008) sella `completed_at`,
`bookings.completed_by` (migración 0011) registra quién la confirmó, y
`bookings_award_points` (migración 0013) usa ese mismo cambio de estado
como enganche para el ledger de puntos. Ver
["Puntos y niveles automáticos"](#puntos-y-niveles-automáticos-fase-4)
arriba.

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

El panel muestra, por reserva: nombre del cliente, servicios
reservados, barbero, hora, duración y estado — con un botón **"Marcar
como completada"** además del selector con los 6 estados. Desde
cualquier reserva con cuenta se puede abrir la **ficha del cliente**
(nombre, correo, nivel actual, próximas reservas e historial). El
teléfono **no se muestra en este panel** — ver
["Privacidad del teléfono frente al barbero"](#privacidad-del-teléfono-frente-al-barbero-fase-4-ajuste)
más abajo.

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

### Privacidad del teléfono frente al barbero (Fase 4, ajuste)

Un barbero (que puede ser temporal) ya no ve el número de teléfono del
cliente en ningún panel — solo su nombre, el corte a realizar y la
fecha/hora. Un **administrador sigue viendo el teléfono normalmente**
en todos lados (panel, ficha del cliente, `/admin/clientes`).

Cómo funciona:

- `useStaffBookings.ts` (la agenda de `/barbero` y `/admin`) solo pide
  la columna `customer_phone` a Supabase cuando quien pregunta es
  admin (`isAdmin` de `useAuth()`); para un barbero, ni siquiera viaja
  al navegador.
- `ClientProfileModal.tsx` ("Ver cliente") hace lo mismo con
  `club_member_summary.phone`: la consulta explícita de columnas omite
  `phone` para un barbero.
- `BookingStatusRow.tsx`/`ClientProfileModal.tsx` además ocultan el
  valor en pantalla con `{isAdmin && ...}`, por si en algún momento la
  columna sí llegara al navegador.
- Buscar por teléfono en la agenda (`Buscar cliente`) sigue funcionando
  para un barbero — el filtro compara contra la columna en el servidor
  (PostgREST), no requiere haberla pedido de vuelta, así que nunca
  expone el valor.

**Límite honesto de esta protección:** es de aplicación (la interfaz no
lo pide ni lo muestra), no de base de datos. La política de RLS
`bookings_select_own`/`profiles_select_own` sigue permitiendo a
cualquier `is_staff()` (barbero o admin) leer la fila completa,
incluida `customer_phone`/`phone` — así que alguien con las
herramientas de desarrollador del navegador y conocimiento técnico
podría igual pedirle esa columna a Supabase directamente con su propia
sesión. Cerrar eso del todo requeriría una vista con
`security definer` que enmascare la columna a nivel de base de datos
(distinto del patrón `security_invoker = true` que usa el resto del
proyecto) — es una pieza más grande y con más riesgo de hacerla mal, así
que no se construyó todavía; se puede hacer si hace falta ese nivel de
garantía.

### Cambiar contraseña desde "Mi cuenta" (Fase 4, ajuste)

`ChangePasswordForm.tsx`, debajo de "Cerrar sesión" en el perfil.
`updatePassword()` ya existía en `AuthProvider` (lo usaba
`/club/restablecer` tras un enlace de recuperación); esto solo le
agrega una entrada dentro de la sesión normal, sin pasar por el correo.

Solo aparece para cuentas que se registraron con **correo y
contraseña** (`user.app_metadata.provider === "email"`) — quien entra
con Google no tiene una contraseña propia en el sitio, así que el
botón no se muestra para esas cuentas.

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
- **El teléfono del cliente oculto para un barbero es una protección de
  aplicación, no de RLS** — ver
  ["Privacidad del teléfono frente al barbero"](#privacidad-del-teléfono-frente-al-barbero-fase-4-ajuste).

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

### Reagendar y cancelar desde "Mi cuenta" (Fase 4, ajuste)

Antes, reagendar/cancelar solo existía justo después de reservar en
`/reservar` (recordado en el navegador vía `localStorage`, sin sesión).
Ahora `BookingCard.tsx` — la misma tarjeta que muestra "Próxima
reserva" y "Otras citas programadas" en "Mi cuenta" — también tiene
esos botones, para cualquier cita en estado **Pendiente** o
**Confirmada** (no tiene sentido ofrecerlos para una cita ya
completada, cancelada, sin asistencia, o que el barbero ya marcó "en
proceso"). Usan los mismos `POST /api/cancel` / `POST /api/reschedule`
de siempre.

**Ajuste de seguridad que vino con esto:** ninguno de los dos
endpoints verificaba antes quién hacía la petición — solo pedían el
`eventId` de Google Calendar, así que en teoría cualquiera que lo
conociera podía cancelar o mover la cita de otra cuenta. Ahora, antes
de tocar Calendar, se busca la reserva en Supabase por su
`google_event_id` (`getBookingByEventId` en `bookingsRepo.ts`) y:

- Si la cita **tiene cuenta** (`user_id` no nulo), se exige un token de
  sesión que coincida con ese `user_id` — si no, `403`.
- Si la cita **es de invitado** (`user_id` nulo), sigue sin pedir
  sesión, exactamente como antes.
- Si el estado ya es `completed`/`cancelled`/`no_show`/`in_progress`
  (`LOCKED_BOOKING_STATUSES` en `bookingsRepo.ts`), se rechaza con
  `409` sin importar quién pregunte.
- Si Supabase no está configurado, o la cita no tiene fila asociada
  (base sin migrar), no hay nada que verificar y se comporta igual que
  antes de este ajuste — la reserva sigue funcionando solo contra
  Calendar.

Esto también significaba que `/reservar` debía empezar a mandar el
token de sesión en sus propias llamadas a cancelar/reprogramar (antes
no lo hacía nunca, porque ese flujo nació pensado solo para invitados):
sin ese cambio, un cliente con sesión activa que reserva desde
`/reservar` se hubiera quedado sin poder cancelar su propia cita recién
creada.

### ¿Se puede cancelar desde Google Calendar y que se refleje en el sitio?

**Hoy no, y es intencional por ahora:** la sincronización es de un solo
sentido — el sitio escribe en Calendar (crear/cancelar/reprogramar),
pero nada escucha cambios hechos directamente en Calendar. Si alguien
borra un evento a mano desde la app de Google Calendar, esa cita queda
"viva" en Supabase (sigue en estado `confirmed`) y seguiría contando
el horario como ocupado.

Es técnicamente posible agregarlo, con dos enfoques y una decisión de
producto real detrás:

- **Google Calendar Push Notifications (tiempo real):** Google llama a
  un webhook propio cada vez que algo cambia en el calendario. Más
  inmediato, pero el canal de notificación expira cada ~7 días y hay
  que renovarlo con un cron, además de un endpoint público nuevo que
  valide que la notificación viene de verdad de Google.
- **Sondeo periódico (más simple):** una tarea programada (cron de
  Vercel) que cada tanto compara los eventos del calendario contra las
  reservas `confirmed` en Supabase y cancela en la base las que ya no
  existan en Calendar. Menos inmediato (depende de cada cuánto corra),
  pero mucho más simple de mantener.

No está construido todavía porque implica infraestructura nueva
(webhook o cron) que vale la pena decidir a propósito, no como efecto
secundario de otro cambio.

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
13. `0013_award_points_on_completion.sql` — trigger que otorga puntos y
    suma la visita cuando una cita con cuenta pasa a "Completada".
14. `0014_grant_club_summary_views.sql` — corrige un permiso: las vistas
    `member_points_balance`/`club_member_summary` nunca tuvieron un
    `GRANT SELECT` explícito para `authenticated` (mismo bug que 0007,
    pero en una vista en vez de una tabla). Sin este archivo, el
    trigger de la Fase 4 otorga los puntos correctamente en la base,
    pero la tarjeta digital de "Mi cuenta" no muestra nada porque el
    navegador recibe `permission denied for view club_member_summary`.
15. `0015_club_summary_birthday.sql` — agrega `birthday` a
    `club_member_summary` para poder mostrarlo en la ficha del cliente.
16. `0016_extend_closing_hour.sql` — mueve el cierre de 8:00 p.m. a
    9:00 p.m. (último cliente a las 8:30 p.m.) en `barber_schedules` y
    en el horario por defecto de un barbero nuevo.
17. `0017_points_per_service.sql` — corrige `award_points_on_completion()`
    para que otorgue puntos según el servicio realizado (`piso(precio /
    2000)`, sumado por cada línea de `booking_services`) en vez del monto
    fijo de 10 puntos de la 0013. No toca puntos ni visitas ya otorgados.
18. `0018_points_redemption.sql` — agrega el canje de UN servicio con
    puntos (`piso(precio / 300)`, 1 punto = $300 COP): columnas
    `bookings.redeemed_with_points`/`points_redeemed`, la función
    atómica `redeem_points_for_booking()` (bloqueo por usuario +
    recálculo de saldo, protegida contra doble gasto), el trigger nuevo
    `refund_points_on_cancellation()` (devuelve los puntos si se
    cancela una reserva canjeada), y un ajuste de una línea en
    `award_points_on_completion()` para que una reserva canjeada no
    otorgue además los puntos normales del servicio (pero sí siga
    sumando la visita). No toca ningún punto ni visita ya otorgados.

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

- **Fase 5** — Recompensas, canjes y referidos
- **Fase 6** — Membresía de pago y notificaciones
