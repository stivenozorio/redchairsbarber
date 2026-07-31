-- ============================================================
-- RED CLUB — Fase 2 (Panel administrativo): estados de cita
-- ============================================================
-- El panel administrativo maneja 6 estados: Pendiente, Confirmada,
-- En proceso, Completada, Cancelada, No asistió. El esquema original
-- (0001) solo tenía 5 ('attended' en vez de 'in_progress'+'completed').
-- Esta migración amplía el enum sin tocar filas existentes.
--
-- IMPORTANTE: cuando una cita pasa a 'completed' es, a futuro, el
-- momento que otorgará puntos (Fase 3). Esta migración NO implementa
-- puntos — solo deja el estado y el timestamp correctos para que la
-- Fase 3 tenga de dónde enganchar sin rediseñar nada.
--
-- Seguro de ejecutar varias veces.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Nuevo valor del enum
-- ------------------------------------------------------------
-- ADD VALUE no se puede usar en la misma transacción en la que se
-- consulta el valor nuevo, pero sí se puede declarar sola en su propio
-- statement — por eso va primero y separada del resto.

alter type public.booking_status add value if not exists 'in_progress' after 'confirmed';

-- ------------------------------------------------------------
-- 2. Renombrar 'attended' -> 'completed'
-- ------------------------------------------------------------
-- RENAME VALUE falla si 'attended' ya no existe (por ejemplo, en una
-- base recién creada con el 0001 ya actualizado), así que se protege
-- con una comprobación primero.

do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'booking_status' and e.enumlabel = 'attended'
  ) then
    alter type public.booking_status rename value 'attended' to 'completed';
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. attended_at -> completed_at
-- ------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'attended_at'
  ) then
    alter table public.bookings rename column attended_at to completed_at;
  end if;
end $$;

-- ------------------------------------------------------------
-- 4. Registrar automáticamente cuándo se completó/canceló una cita
-- ------------------------------------------------------------
-- El panel administrativo solo cambia `status`; este trigger se
-- encarga de sellar el momento exacto, para que la Fase 3 (puntos)
-- pueda usar completed_at sin que el panel tenga que saber nada de eso.

create or replace function public.set_booking_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  end if;
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_set_status_timestamps on public.bookings;
create trigger bookings_set_status_timestamps
  before update on public.bookings
  for each row execute function public.set_booking_status_timestamps();

notify pgrst, 'reload schema';
