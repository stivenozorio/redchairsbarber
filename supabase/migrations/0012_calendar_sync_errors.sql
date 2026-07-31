-- ============================================================
-- RED CLUB — Fase 3: auditoría de sincronización con Google Calendar
-- ============================================================
-- Cuando cancelar una reserva actualiza Supabase correctamente pero
-- falla al borrar el evento en Google Calendar (Calendar caído, token
-- vencido, etc.), ese fallo se registra AQUÍ — no solo en los logs de
-- Vercel, que se pueden perder con el tiempo. Esto le da a un futuro
-- panel administrativo de dónde leer qué reservas quedaron
-- desincronizadas (canceladas en Supabase, pero el horario sigue
-- ocupado en el calendario del barbero) para corregirlas a mano.
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

create table if not exists public.calendar_sync_errors (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings (id) on delete cascade,

  -- Snapshot del momento del error: si más adelante se reintenta y se
  -- limpia google_event_id en bookings, este registro conserva con qué
  -- evento y calendario se intentó sincronizar.
  google_event_id text,
  barber_id       text references public.barbers (id) on delete set null,

  -- Hoy solo existe 'delete_event' (cancelar). Se deja como texto libre
  -- en vez de un enum para no repetir el problema de "agregar un valor
  -- nuevo exige una migración" cuando aparezcan más acciones de
  -- sincronización (reprogramar, crear) en fases futuras.
  action          text not null default 'delete_event',
  error_message   text not null,

  resolved        boolean not null default false,
  resolved_at     timestamptz,
  resolved_by     uuid references public.profiles (id) on delete set null,

  created_at      timestamptz not null default now()
);

create index if not exists calendar_sync_errors_booking_idx on public.calendar_sync_errors (booking_id);

-- Para que un futuro panel pueda listar "lo pendiente por corregir"
-- sin escanear toda la tabla.
create index if not exists calendar_sync_errors_unresolved_idx
  on public.calendar_sync_errors (created_at) where not resolved;

alter table public.calendar_sync_errors enable row level security;

-- Solo lectura para staff (admin/barbero): es información operativa
-- interna, nunca del cliente. La escritura es exclusivamente del
-- servidor (service_role), que registra el error en el momento en que
-- ocurre — no hay política de insert/update para el navegador.
drop policy if exists calendar_sync_errors_select_staff on public.calendar_sync_errors;
create policy calendar_sync_errors_select_staff on public.calendar_sync_errors
  for select using (public.is_staff());

grant select on public.calendar_sync_errors to authenticated;
grant select, insert on public.calendar_sync_errors to service_role;

notify pgrst, 'reload schema';
