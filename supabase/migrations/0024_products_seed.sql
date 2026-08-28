-- ============================================================
-- RED CLUB — Productos: puntos editables, descripción, y el
-- catálogo real (Fase 4, ajuste)
-- ============================================================
-- A diferencia de un servicio (donde el costo en puntos SIEMPRE se
-- calcula solo, piso(precio / 300), redondeando a favor del cliente),
-- el dueño pidió explícitamente que los productos redondeen A FAVOR DE
-- LA BARBERÍA (techo, no piso) — así que en vez de forzar la misma
-- fórmula, `points_cost` queda como un campo propio, editable desde el
-- panel: el admin lo ve sugerido (techo(precio / 300)) al crear un
-- producto nuevo, pero puede ajustarlo a mano si hace falta. No
-- reutiliza calculateRedemptionCost() de services.ts a propósito: esa
-- función debe seguir siendo piso() siempre, para servicios.
--
-- `description` guarda el texto de marketing ("Resultado:", "Ideal
-- para:") que si trajo el catálogo real — services no lo necesitaba
-- (esa copia vive en src/data/services.ts, en código), pero products
-- no tiene un archivo estático equivalente todavía.
--
-- `products_name_key` (unique) existe para que el INSERT del catálogo
-- real de abajo sea seguro de correr más de una vez (on conflict do
-- nothing) sin duplicar productos.
--
-- Seguro de ejecutar varias veces. No borra ni pisa nada ya cargado a
-- mano (el INSERT solo agrega los que falten, por nombre).
-- ============================================================

alter table public.products
  add column if not exists description text,
  add column if not exists points_cost integer not null default 0;

do $$ begin
  alter table public.products
    add constraint products_points_cost_valid check (points_cost >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_name_key unique (name);
exception when duplicate_object then null; end $$;

insert into public.products (name, category, price_cop, points_cost, description, sort_order) values
  ('Shampoo CMS Hombre', 'Cuidado del cabello', 35000, 117,
   'Cabello limpio, fuerte y con una apariencia más saludable. Ideal para complementar la rutina de cuidado capilar y mantener el cabello limpio y cuidado después de cada visita a la barbería.',
   10),

  ('Agiva Polvo Texturizante Negro', 'Volumen y textura', 35000, 117,
   'Más volumen, textura y acabado mate. Ideal para darle cuerpo y definición al cabello sin dejar sensación grasosa. Perfecto para cortes modernos y texturizados.',
   20),
  ('Agiva Polvo Texturizante Rojo', 'Volumen y textura', 35000, 117,
   'Volumen, textura marcada y mayor fijación. Ideal para crear peinados con más presencia, definición y control durante el día.',
   21),

  ('Ossion Roja', 'Fijación y styling', 30000, 100,
   'Fijación fuerte y máximo control. Ideal para peinados definidos y estilos que necesitan mantenerse en su lugar durante el día.',
   30),
  ('Ossion Azul', 'Fijación y styling', 30000, 100,
   'Definición, control y movimiento. Ideal para mantener el cabello organizado y darle forma sin perder flexibilidad.',
   31),
  ('Ossion Verde', 'Fijación y styling', 30000, 100,
   'Textura, definición y acabado mate. Perfecta para estilos naturales y texturizados, con control sin exceso de brillo.',
   32),

  ('Minoxidil + Gotero Aplicador', 'Rutina capilar', 35000, 117,
   'Ideal para incorporar a una rutina de cuidado capilar. Incluye gotero aplicador para facilitar su aplicación.',
   40),
  ('Derma Roller', 'Rutina capilar', 18000, 60,
   'Herramienta para complementar una rutina de cuidado personal y capilar.',
   41),

  ('Combo Styling', 'Combos', 59000, 197,
   'Incluye 1 Agiva Polvo Texturizante (Negro o Rojo) + 1 Ossion (Roja, Azul o Verde). Volumen, textura, definición y fijación para mantener el corte y el peinado con estilo en casa. Precio individual: $65.000.',
   50),
  ('Kit Rutina Capilar', 'Combos', 48000, 160,
   'Incluye 1 Minoxidil + 1 Gotero Aplicador + 1 Derma Roller. Una rutina práctica de cuidado capilar para usar desde casa. Precio individual: $53.000.',
   51),
  ('Combo Cuidado + Styling', 'Combos', 65000, 217,
   'Incluye 1 Shampoo CMS Hombre + 1 Agiva Polvo Texturizante (Negro o Rojo). Limpieza, cuidado, volumen y textura en una sola rutina para mantener el cabello y el estilo después de visitar la barbería. Precio individual: $70.000.',
   52),
  ('Combo Red Chairs Completo', 'Combos', 89000, 297,
   'Incluye 1 Shampoo CMS Hombre + 1 Agiva Polvo Texturizante (Negro o Rojo) + 1 Ossion (Roja, Azul o Verde). El kit completo para limpiar, cuidar, dar volumen, textura y fijación al cabello desde casa. Precio individual: $100.000.',
   53)
on conflict (name) do nothing;

notify pgrst, 'reload schema';
