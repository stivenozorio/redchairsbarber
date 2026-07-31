-- ============================================================
-- RED CLUB — Fase 2 (Panel administrativo): horarios dinámicos
-- ============================================================
-- Hasta ahora el horario de atención era una constante fija en el
-- código (api/_lib/schedule.ts: 10:00 a.m.–8:00 p.m., igual todos los
-- días, igual para los dos barberos). Estas tablas permiten un horario
-- semanal por barbero, más excepciones puntuales (festivos, horario
-- especial). api/_lib/scheduleRepo.ts las consulta; si no hay datos
-- (antes de ejecutar el seed de abajo), el código sigue usando el
-- horario fijo histórico como respaldo — nada se rompe en el camino.
--
-- Seguro de ejecutar varias veces.
-- ============================================================

-- ------------------------------------------------------------
-- Horario semanal por barbero
-- ------------------------------------------------------------
-- day_of_week: 0 = domingo … 6 = sábado (igual que Date.getDay() en
-- JavaScript y extract(dow from date) en Postgres — mismo número en
-- el navegador, el servidor y la base).
--
-- Se espera EXACTAMENTE una fila por (barbero, día): el panel siempre
-- opera sobre las 7 filas de cada barbero (crea las que falten,
-- actualiza is_open/horas), nunca borra un día suelto. "Cerrado ese
-- día" es is_open = false, no la ausencia de la fila.

create table if not exists public.barber_schedules (
  id           uuid primary key default gen_random_uuid(),
  barber_id    text not null references public.barbers (id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6),
  is_open      boolean not null default true,
  open_time    time,
  close_time   time,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (barber_id, day_of_week),
  constraint barber_schedules_hours_valid check (
    (is_open = false) or (open_time is not null and close_time is not null and close_time > open_time)
  )
);

create index if not exists barber_schedules_barber_idx on public.barber_schedules (barber_id);

drop trigger if exists barber_schedules_set_updated_at on public.barber_schedules;
create trigger barber_schedules_set_updated_at
  before update on public.barber_schedules
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Excepciones puntuales (festivos, horario especial de un día)
-- ------------------------------------------------------------
-- barber_id null = aplica a todos los barberos (festivo de toda la
-- barbería); con barber_id específico, gana sobre la excepción global
-- de esa misma fecha (ver scheduleRepo.ts).

create table if not exists public.schedule_exceptions (
  id          uuid primary key default gen_random_uuid(),
  barber_id   text references public.barbers (id) on delete cascade,
  date        date not null,
  is_closed   boolean not null default true,
  open_time   time,
  close_time  time,
  note        text,
  created_at  timestamptz not null default now(),

  constraint schedule_exceptions_hours_valid check (
    is_closed or (open_time is not null and close_time is not null and close_time > open_time)
  )
);

-- Único índice en vez de UNIQUE(barber_id, date): barber_id puede ser
-- null y en Postgres NULL nunca es igual a NULL en una restricción
-- UNIQUE normal, así que se usan dos índices parciales.
create unique index if not exists schedule_exceptions_barber_date_key
  on public.schedule_exceptions (barber_id, date) where barber_id is not null;
create unique index if not exists schedule_exceptions_global_date_key
  on public.schedule_exceptions (date) where barber_id is null;

create index if not exists schedule_exceptions_date_idx on public.schedule_exceptions (date);

-- ------------------------------------------------------------
-- Horario por defecto para barberos nuevos
-- ------------------------------------------------------------
-- Si se agrega un barbero desde el panel, este trigger le crea sus 7
-- filas automáticamente (mismo horario publicado hoy: lunes a sábado
-- 10 a 8, domingo cerrado) para que nunca quede sin horario.

create or replace function public.seed_default_barber_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.barber_schedules (barber_id, day_of_week, is_open, open_time, close_time)
  select
    new.id,
    d,
    d <> 0,
    case when d <> 0 then time '10:00' end,
    case when d <> 0 then time '20:00' end
  from generate_series(0, 6) as d
  on conflict (barber_id, day_of_week) do nothing;
  return new;
end;
$$;

drop trigger if exists barbers_seed_default_schedule on public.barbers;
create trigger barbers_seed_default_schedule
  after insert on public.barbers
  for each row execute function public.seed_default_barber_schedule();

-- ------------------------------------------------------------
-- Seed para los barberos ya existentes
-- ------------------------------------------------------------

insert into public.barber_schedules (barber_id, day_of_week, is_open, open_time, close_time)
select
  b.id,
  d,
  d <> 0,
  case when d <> 0 then time '10:00' end,
  case when d <> 0 then time '20:00' end
from public.barbers b
cross join generate_series(0, 6) as d
on conflict (barber_id, day_of_week) do nothing;

notify pgrst, 'reload schema';
