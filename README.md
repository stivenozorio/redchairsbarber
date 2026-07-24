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
  components/   Navbar, Footer, Logo, cards, Reveal…
  data/         Contenido: servicios, precios, fidelización, testimonios…
  pages/        Inicio, Servicios, Experiencia VIP, Fidelización, Nosotros,
                Reservar, Contacto
api/            Funciones serverless (Vercel) para la integración con
                Google Calendar — availability, book, cancel, reschedule
scripts/        Utilidades de configuración (generador de refresh token)
vercel.json     Rewrite catch-all a index.html — necesario para que las
                rutas de React Router (ej. /reservar) no den 404 al
                navegar directo o recargar la página en producción
```

Toda la información de marca (nombre, WhatsApp, Instagram, dirección,
horarios) vive en `src/data/site.ts` — un solo lugar para actualizarla.

## Desarrollo

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # build de producción en dist/
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

## Próximas integraciones

El sitio está preparado para conectar, sin rediseñar la base:

- Inicio de sesión de clientes y panel privado
- Historial de citas y seguimiento del programa de fidelización
- WooCommerce / tienda en línea
