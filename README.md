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
  components/   Navbar, Footer, Logo (marca recreada en SVG), cards, Reveal…
  data/         Contenido: servicios, precios, fidelización, testimonios…
  pages/        Inicio, Servicios, Experiencia VIP, Fidelización, Nosotros,
                Reservar, Contacto
```

Toda la información de marca (nombre, WhatsApp, Instagram, dirección,
horarios) vive en `src/data/site.ts` — un solo lugar para actualizarla.

## Desarrollo

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # build de producción en dist/
```

## Próximas integraciones

El sitio está preparado para conectar, sin rediseñar la base:

- Inicio de sesión de clientes y panel privado
- Sistema de reservas en tiempo real (hoy el formulario de `/reservar`
  envía la solicitud por WhatsApp)
- Historial de citas y seguimiento del programa de fidelización
- WooCommerce / tienda en línea
