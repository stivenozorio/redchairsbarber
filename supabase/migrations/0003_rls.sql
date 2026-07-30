-- ============================================================
-- RED CLUB — Fase 1: Row Level Security
-- ============================================================
-- Principio: el navegador (anon key) solo puede LEER lo suyo.
-- Puntos, reservas, referidos y canjes se ESCRIBEN únicamente desde
-- las funciones serverless con la service-role key, que se salta RLS.
-- Si el navegador pudiera escribir puntos, cualquiera se asignaría
-- LEGEND desde la consola del navegador.
-- ============================================================

-- ------------------------------------------------------------
-- Permisos base de tabla (además de RLS)
-- ------------------------------------------------------------
-- RLS decide QUÉ FILAS puede ver/editar cada rol, pero Postgres exige
-- primero un GRANT de tabla: sin él, la consulta falla con "permission
-- denied for table X" antes de que la política de RLS se evalúe
-- siquiera. Se declaran explícitamente en vez de asumir que el
-- proyecto de Supabase ya los concedió por defecto.

grant usage on schema public to anon, authenticated, service_role;

-- El servidor (service_role) hace todas las escrituras: perfiles,
-- reservas, servicios de reserva, puntos, canjes, referidos, etc.
-- service_role tiene bypassrls, pero igual necesita el permiso de tabla.
grant select, insert, update, delete on
  public.profiles,
  public.barbers,
  public.services,
  public.tiers,
  public.bookings,
  public.booking_services,
  public.points_transactions,
  public.rewards,
  public.reward_redemptions,
  public.referrals,
  public.memberships
to service_role;

-- Catálogos: lectura pública, tal como ya lo permiten las políticas
-- "for select using (true)" / "using (active or is_staff())".
grant select on
  public.barbers,
  public.services,
  public.tiers,
  public.rewards
to anon, authenticated;

-- El resto de tablas: solo un usuario con sesión puede llegar a tener
-- filas visibles (las políticas comparan contra auth.uid()); anon
-- nunca necesita el permiso porque auth.uid() es null sin sesión.
grant select on
  public.bookings,
  public.booking_services,
  public.points_transactions,
  public.reward_redemptions,
  public.referrals,
  public.memberships
to authenticated;

-- El cliente puede leer y editar su propio perfil (RLS restringe la fila).
grant select, update on public.profiles to authenticated;

alter table public.profiles            enable row level security;
alter table public.barbers             enable row level security;
alter table public.services            enable row level security;
alter table public.tiers               enable row level security;
alter table public.bookings            enable row level security;
alter table public.booking_services    enable row level security;
alter table public.points_transactions enable row level security;
alter table public.rewards             enable row level security;
alter table public.reward_redemptions  enable row level security;
alter table public.referrals           enable row level security;
alter table public.memberships         enable row level security;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id or public.is_staff());

-- El cliente puede editar su perfil, pero NO su rol, sus visitas ni su
-- código de referido: eso lo controla el servidor. Se protege con un
-- trigger porque RLS no puede restringir columnas por sí solo.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- La service-role key no tiene auth.uid(), así que el servidor
  -- conserva la capacidad de ajustar estos campos.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  new.role          := old.role;
  new.visit_count   := old.visit_count;
  new.referral_code := old.referral_code;
  new.referred_by   := old.referred_by;
  new.id            := old.id;
  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ------------------------------------------------------------
-- Catálogos: lectura pública (son datos de marketing)
-- ------------------------------------------------------------

drop policy if exists barbers_select_all on public.barbers;
create policy barbers_select_all on public.barbers
  for select using (true);

drop policy if exists services_select_all on public.services;
create policy services_select_all on public.services
  for select using (true);

drop policy if exists tiers_select_all on public.tiers;
create policy tiers_select_all on public.tiers
  for select using (true);

drop policy if exists rewards_select_active on public.rewards;
create policy rewards_select_active on public.rewards
  for select using (active or public.is_staff());

-- ------------------------------------------------------------
-- bookings
-- ------------------------------------------------------------
-- Sin políticas de INSERT/UPDATE/DELETE para el cliente: las reservas
-- se crean y modifican exclusivamente desde /api, que valida
-- disponibilidad y sincroniza con Google Calendar. Una reserva creada
-- directamente desde el navegador no tendría evento en el calendario.

drop policy if exists bookings_select_own on public.bookings;
create policy bookings_select_own on public.bookings
  for select using (auth.uid() = user_id or public.is_staff());

drop policy if exists booking_services_select_own on public.booking_services;
create policy booking_services_select_own on public.booking_services
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_services.booking_id
        and b.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- points_transactions — solo lectura, jamás escritura desde el cliente
-- ------------------------------------------------------------

drop policy if exists points_select_own on public.points_transactions;
create policy points_select_own on public.points_transactions
  for select using (auth.uid() = user_id or public.is_staff());

-- ------------------------------------------------------------
-- reward_redemptions / referrals / memberships
-- ------------------------------------------------------------

drop policy if exists redemptions_select_own on public.reward_redemptions;
create policy redemptions_select_own on public.reward_redemptions
  for select using (auth.uid() = user_id or public.is_staff());

drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own on public.referrals
  for select using (
    auth.uid() = referrer_id or auth.uid() = referred_id or public.is_staff()
  );

drop policy if exists memberships_select_own on public.memberships;
create policy memberships_select_own on public.memberships
  for select using (auth.uid() = user_id or public.is_staff());
