-- ============================================================
-- RED CLUB — Fase 1: funciones, triggers y vistas
-- ============================================================

-- ------------------------------------------------------------
-- updated_at automático
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Código de referido único
-- ------------------------------------------------------------
-- Alfabeto sin caracteres ambiguos (0/O, 1/I) porque el código se
-- dicta y se escribe a mano en el mostrador.

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
begin
  loop
    candidate := 'RC';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = candidate);
  end loop;
  return candidate;
end;
$$;

-- ------------------------------------------------------------
-- Crear perfil automáticamente al registrarse
-- ------------------------------------------------------------
-- Se dispara tanto para registro con correo como con Google. Los
-- metadatos que manda Supabase varían según el proveedor, por eso se
-- revisan varias llaves posibles para el nombre.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, referral_code)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    public.generate_referral_code()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- ¿El usuario actual es staff?
-- ------------------------------------------------------------
-- SECURITY DEFINER a propósito: si esta consulta pasara por las
-- políticas RLS de profiles, se produciría una recursión infinita al
-- usarla dentro de esas mismas políticas.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('barber', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- Nivel a partir de las visitas
-- ------------------------------------------------------------

create or replace function public.tier_for_visits(visits integer)
returns text
language sql
stable
as $$
  select t.id
  from public.tiers t
  where visits >= t.min_visits
    and (t.max_visits is null or visits <= t.max_visits)
  order by t.min_visits desc
  limit 1;
$$;

-- ------------------------------------------------------------
-- Vistas
-- ------------------------------------------------------------
-- security_invoker = true hace que las vistas respeten las políticas
-- RLS del usuario que consulta, en vez de las del dueño de la vista.
-- Sin esto, un cliente podría ver el saldo de puntos de otro.

create or replace view public.member_points_balance
with (security_invoker = true) as
  select
    p.id as user_id,
    coalesce(sum(pt.amount), 0)::integer as balance
  from public.profiles p
  left join public.points_transactions pt on pt.user_id = p.id
  group by p.id;

-- Resumen consolidado del socio: lo que consumirá el dashboard de
-- RED CLUB. En Fase 1 la interfaz solo usa nombre/correo/teléfono;
-- puntos y nivel ya vienen calculados para las fases siguientes.
create or replace view public.club_member_summary
with (security_invoker = true) as
  select
    p.id as user_id,
    p.full_name,
    p.email,
    p.phone,
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
