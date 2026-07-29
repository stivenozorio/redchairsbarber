-- ============================================================
-- RED CLUB — Fase 1: datos iniciales
-- ============================================================
-- Idempotente: se puede volver a ejecutar sin duplicar nada.
-- Los ids coinciden con los de src/data/*.ts para que el código
-- actual y la base hablen el mismo idioma.
-- ============================================================

-- ------------------------------------------------------------
-- Niveles RED CLUB
-- ------------------------------------------------------------

insert into public.tiers (id, name, min_visits, max_visits, sort_order, color, glow, benefits) values
  ('black',  'BLACK MEMBER',   0,  4,    1, '#2a2a2e', 'rgba(255,255,255,0.15)',
    '["Bienvenida exclusiva","Perfil de cliente","Noticias y novedades"]'::jsonb),
  ('red',    'RED MEMBER',     5,  14,   2, '#9c1218', 'rgba(156,18,24,0.45)',
    '["Todo lo de BLACK MEMBER","Café Premium en cada visita","Prioridad en reservas","Promociones exclusivas","Sorpresa de cumpleaños"]'::jsonb),
  ('gold',   'GOLD MEMBER',    15, 29,   3, '#c9a961', 'rgba(201,169,97,0.45)',
    '["Todo lo de RED MEMBER","Invitaciones VIP","Acceso anticipado a promociones","Regalos exclusivos","Experiencias especiales"]'::jsonb),
  ('legend', 'LEGEND MEMBER',  30, null, 4, '#f4f1ea', 'rgba(244,241,234,0.4)',
    '["Todo lo de GOLD MEMBER","Eventos privados","Máxima prioridad en reservas","Beneficios exclusivos","Reconocimiento como cliente LEGEND"]'::jsonb)
on conflict (id) do update set
  name       = excluded.name,
  min_visits = excluded.min_visits,
  max_visits = excluded.max_visits,
  sort_order = excluded.sort_order,
  color      = excluded.color,
  glow       = excluded.glow,
  benefits   = excluded.benefits;

-- ------------------------------------------------------------
-- Barberos
-- ------------------------------------------------------------

insert into public.barbers (id, name, active, sort_order) values
  ('camilo',    'Camilo Torres',   true, 1),
  ('alejandro', 'Alejandro Reyes', true, 2)
on conflict (id) do update set
  name       = excluded.name,
  active     = excluded.active,
  sort_order = excluded.sort_order;

-- ------------------------------------------------------------
-- Servicios
-- ------------------------------------------------------------
-- Espejo de src/data/services.ts. Hoy el servidor sigue calculando
-- precio y duración desde ese archivo; esta tabla queda lista para que
-- el catálogo se administre desde la base en una fase posterior.

insert into public.services (id, name, category, price_cop, duration_minutes, sort_order) values
  ('corte-sencillo',            'Corte de Cabello Sencillo',       'clasicos',  20000,  30,  1),
  ('recorte-barba-sencillo',    'Recorte de Barba Sencillo',       'clasicos',  10000,  20,  2),
  ('afeitado',                  'Afeitados',                       'clasicos',  15000,  30,  3),
  ('corte-premium',             'Corte Premium',                   'premium',   30000,  40,  4),
  ('corte-premium-barba',       'Corte Premium + Barba',           'premium',   40000,  60,  5),
  ('barba-premium',             'Barba Premium',                   'premium',   25000,  30,  6),
  ('spa-facial',                'Spa Facial',                      'faciales',  35000,  45,  7),
  ('mascarilla-express',        'Mascarilla Express',              'faciales',  15000,  20,  8),
  ('masaje-ocular',             'Masaje Ocular',                   'faciales',  12000,  15,  9),
  ('combo-corte-cejas',         'Corte + Cejas',                   'combos',    25000,  35, 10),
  ('combo-corte-plus-cejas',    'Corte Plus + Cejas',              'combos',    35000,  45, 11),
  ('combo-corte-barba',         'Corte + Barba',                   'combos',    30000,  50, 12),
  ('combo-corte-plus-barba',    'Corte Plus + Barba',              'combos',    40000,  60, 13),
  ('combo-corte-barba-cejas',   'Corte + Barba + Cejas',           'combos',    35000,  65, 14),
  ('cejas',                     'Cejas',                           'extras',     5000,  10, 15),
  ('lavado-capilar',            'Lavado Capilar',                  'extras',     5000,  15, 16),
  ('upgrade-renovacion-facial', 'Renovación Facial',               'upgrade',   10000,  15, 17),
  ('upgrade-descanso-visual',   'Descanso Visual',                 'upgrade',   10000,  15, 18),
  ('vip',                       'Experiencia VIP',                 'vip',       65000,  90, 19),
  ('vip-barba',                 'Experiencia VIP + Barba',         'vip',       75000, 105, 20),
  ('vip-barba-cejas',           'Experiencia VIP + Barba + Cejas', 'vip',       81000, 120, 21)
on conflict (id) do update set
  name             = excluded.name,
  category         = excluded.category,
  price_cop        = excluded.price_cop,
  duration_minutes = excluded.duration_minutes,
  sort_order       = excluded.sort_order;
