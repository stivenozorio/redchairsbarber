-- ============================================================
-- RED CLUB — agrega birthday a club_member_summary
-- ============================================================
-- profiles.birthday ya existe desde 0001_schema.sql (siempre estuvo
-- pensado para el bonus 'birthday_bonus' del enum points_reason), pero
-- nunca se expuso en club_member_summary. Sin esto, el panel del
-- barbero/administrativo no puede ver el cumpleaños de un cliente
-- desde la ficha (ClientProfileModal), que es justamente lo que hace
-- falta para saber a quién darle su premio de cumpleaños.
--
-- CREATE OR REPLACE VIEW solo agrega la columna al final; no cambia ni
-- quita ninguna de las que ya se consultan, así que es seguro de
-- re-ejecutar y no rompe nada que ya la use.
-- ============================================================

create or replace view public.club_member_summary
with (security_invoker = true) as
  select
    p.id as user_id,
    p.full_name,
    p.email,
    p.phone,
    p.birthday,
    p.visit_count,
    p.referral_code,
    coalesce(b.balance, 0)::integer as points_balance,
    public.tier_for_visits(p.visit_count) as tier_id,
    t.name as tier_name,
    t.min_visits as tier_min_visits,
    t.max_visits as tier_max_visits
  from public.profiles p
  left join public.member_points_balance b on b.user_id = p.id
  left join public.tiers t on t.id = public.tier_for_visits(p.visit_count);

notify pgrst, 'reload schema';
