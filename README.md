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
`npm run dev` el formulario cae automáticamente al flujo por WhatsApp si
las llamadas a `/api` fallan — no rompe la experiencia sin backend.

## Integración con Google Calendar

Las reservas se validan y se crean como eventos reales en un Google
Calendar, con toda la lógica de Google ejecutándose solo en funciones
serverless de Vercel (`/api`), nunca en el navegador.

### Endpoints (`/api`)

- `GET /api/availability?date=YYYY-MM-DD` — disponibilidad real de cada
  franja horaria de `src/data/booking.ts` ese día.
- `POST /api/book` — vuelve a validar el cupo (evita dobles reservas) y
  crea el evento en el calendario.
- `POST /api/cancel` — elimina un evento por `eventId`.
- `POST|PATCH /api/reschedule` — valida el nuevo horario y mueve el
  evento existente.

Toda la lógica compartida vive en `api/_lib/` (cliente OAuth2 de Google,
conversión de horarios a `America/Bogota`, y el chequeo de solapamiento
de eventos).

### Variables de entorno

Copia `.env.example` a `.env` (o configúralas en Vercel → Project
Settings → Environment Variables) y completa:

| Variable | Descripción |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID del OAuth Client (app web) |
| `GOOGLE_CLIENT_SECRET` | Client Secret del mismo OAuth Client |
| `GOOGLE_REFRESH_TOKEN` | Token de larga duración (ver siguiente sección) |
| `GOOGLE_CALENDAR_ID` | ID del calendario de `redchairsb@gmail.com` |

Opcionales: `GOOGLE_CALENDAR_SLOT_DURATION_MINUTES` (duración de cada
cita, por defecto 60) y `GOOGLE_OAUTH_REDIRECT_URI` (solo lo usa el
script de abajo).

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
