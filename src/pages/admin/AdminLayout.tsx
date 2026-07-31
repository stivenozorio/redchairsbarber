import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/admin", label: "Panel", end: true },
  { to: "/admin/reservas", label: "Reservas" },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/servicios", label: "Servicios" },
  { to: "/admin/horarios", label: "Horarios" },
  { to: "/admin/barberos", label: "Barberos" },
];

export default function AdminLayout() {
  return (
    <div className="min-h-[100svh] bg-obsidian pt-28">
      <div className="container-lux pb-24">
        <p className="eyebrow justify-start before:hidden">Red Club</p>
        <h1 className="heading-xl mt-4">Panel administrativo</h1>

        <nav className="mt-10 flex flex-wrap gap-2 border-b border-gold/10 pb-2">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `rounded-sm px-4 py-2 text-xs uppercase tracking-widest2 transition-colors ${
                  isActive ? "bg-gold text-obsidian" : "text-bone/70 hover:text-gold"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
