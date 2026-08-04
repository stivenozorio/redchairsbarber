-- ============================================================
-- RED CLUB — extiende el cierre de 8:00 p.m. a 9:00 p.m.
-- ============================================================
-- Antes: 10:00 a.m. – 8:00 p.m. Ahora el negocio quiere poder atender
-- al último cliente a las 8:30 p.m. y cerrar a las 9:00 p.m.
--
-- Con el cierre en 20:00, una cita que empezara justo a las 8:00 p.m.
-- en realidad NUNCA cabía (fitsWithinHours exige que start + duración
-- termine antes del cierre) — por eso ni 8:00 ni 8:30 aparecían como
-- horas disponibles de verdad, aunque el selector las mostrara.
--
-- Esta migración actualiza:
--   1. Las filas YA sembradas en barber_schedules — solo las que hoy
--      están abiertas y cierran EXACTAMENTE a las 20:00, para no pisar
--      un horario que el panel ya haya personalizado a otra hora.
--   2. seed_default_barber_schedule() (0009), para que un barbero
--      NUEVO que se agregue después también nazca cerrando a las 9pm
--      en vez del horario viejo.
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

update public.barber_schedules
set close_time = time '21:00'
where is_open = true and close_time = time '20:00';

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
    case when d <> 0 then time '21:00' end
  from generate_series(0, 6) as d
  on conflict (barber_id, day_of_week) do nothing;
  return new;
end;
$$;

notify pgrst, 'reload schema';
