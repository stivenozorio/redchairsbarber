-- ============================================================
-- RED CLUB — Catálogo de productos (Fase 4, ajuste)
-- ============================================================
-- Primera etapa: solo el catálogo administrable desde /admin/productos
-- (nombre, categoría, precio, activo/inactivo) — igual que `services`
-- hoy, pero SIN duration_minutes (un producto no ocupa tiempo de
-- agenda) y con `id` uuid autogenerado en vez de un slug de texto (los
-- productos no vienen de un catálogo fijo en el código como
-- src/data/services.ts, así que no hace falta que el id sea legible).
--
-- A propósito NO incluye todavía: aparecer en /reservar, canjearse con
-- puntos, ni control de inventario/existencias — eso se decide y se
-- construye después, con el listado real de productos en la mano. Por
-- ahora el costo en puntos que muestra el panel (mismo piso(precio /
-- 300) que un servicio) es solo informativo.
--
-- Mismo patrón de RLS/GRANT que `services` (0001/0003/0007/0010):
-- lectura pública, escritura solo admin desde el navegador, y
-- service_role con acceso completo desde el arranque — para no repetir
-- el bug de 0007/0014/0020 (permiso olvidado para el servidor).
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text,
  price_cop    integer not null check (price_cop >= 0),
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (true);

drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products
  for insert with check (public.is_admin());

drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products
  for update using (public.is_admin()) with check (public.is_admin());

grant select on public.products to anon, authenticated;
grant insert, update on public.products to authenticated;
grant select, insert, update, delete on public.products to service_role;

notify pgrst, 'reload schema';
