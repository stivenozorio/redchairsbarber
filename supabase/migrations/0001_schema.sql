-- ============================================================
-- RED CLUB — Fase 1: esquema base
-- ============================================================
-- Este archivo crea TODAS las tablas del modelo de datos de RED CLUB,
-- incluidas las que todavía no se usan en la interfaz (puntos,
-- recompensas, referidos, membresías). La idea es no tener que migrar
-- datos existentes más adelante: la estructura ya queda lista.
--
-- Ejecutar en Supabase → SQL Editor, en orden: 0001, 0002, 0003, 0004.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tipos
-- ------------------------------------------------------------

do $$ begin
  create type user_role as enum ('client', 'barber', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  -- pending: creada, aún sin confirmar en el calendario
  -- confirmed: creada y sincronizada con Google Calendar
  -- in_progress: el cliente está siendo atendido ahora mismo
  -- completed: la cita se cumplió (el momento que otorgará puntos en Fase 3)
  -- no_show: el cliente no llegó
  -- cancelled: cancelada por el cliente o el panel administrativo
  create type booking_status as enum
    ('pending', 'confirmed', 'in_progress', 'completed', 'no_show', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type points_reason as enum (
    'booking_attended',
    'referral_bonus',
    'referral_welcome',
    'reward_redemption',
    'birthday_bonus',
    'promotion',
    'manual_adjustment',
    'no_show_penalty',
    'expiration'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type referral_status as enum ('pending', 'completed', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type redemption_status as enum ('pending', 'fulfilled', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type membership_status as enum ('active', 'past_due', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- profiles — extiende auth.users
-- ------------------------------------------------------------
-- El id es el mismo de auth.users. Se crea automáticamente por
-- trigger (ver 0002) cuando alguien se registra, sin importar si fue
-- con correo o con Google.

create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text,
  full_name      text,
  phone          text,
  birthday       date,
  role           user_role not null default 'client',

  -- Código propio para invitar a otros. Se genera por trigger.
  referral_code  text unique,
  -- Quién invitó a este cliente (se llena en Fase 5).
  referred_by    uuid references public.profiles (id) on delete set null,

  -- Denormalizado a propósito: contar visitas en cada consulta sería
  -- caro. Lo actualiza el servidor cuando una reserva pasa a
  -- 'completed' (Fase 3). El nivel se deriva de este número.
  visit_count    integer not null default 0 check (visit_count >= 0),

  marketing_opt_in boolean not null default true,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists profiles_referral_code_idx on public.profiles (referral_code);
create index if not exists profiles_referred_by_idx  on public.profiles (referred_by);
create index if not exists profiles_phone_idx        on public.profiles (phone);

-- ------------------------------------------------------------
-- barbers — catálogo
-- ------------------------------------------------------------
-- El id coincide con el usado hoy en src/data/booking.ts ('camilo',
-- 'alejandro') para que el código actual siga funcionando sin cambios.
-- user_id queda listo para cuando cada barbero tenga su cuenta y su
-- propio panel (Fase 3).

create table if not exists public.barbers (
  id           text primary key,
  name         text not null,
  active       boolean not null default true,
  sort_order   integer not null default 0,
  user_id      uuid unique references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- services — catálogo
-- ------------------------------------------------------------
-- Hoy la fuente de verdad sigue siendo src/data/services.ts (el
-- servidor recalcula precio y duración desde ahí). Esta tabla existe
-- para que en una fase posterior el catálogo se administre desde la
-- base sin rehacer nada. Ver nota sobre snapshots en booking_services.

create table if not exists public.services (
  id               text primary key,
  name             text not null,
  category         text,
  price_cop        integer not null check (price_cop >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  active           boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ------------------------------------------------------------
-- tiers — niveles RED CLUB
-- ------------------------------------------------------------
-- max_visits null = sin tope (LEGEND MEMBER).

create table if not exists public.tiers (
  id          text primary key,
  name        text not null,
  min_visits  integer not null check (min_visits >= 0),
  max_visits  integer,
  sort_order  integer not null,
  color       text,
  glow        text,
  benefits    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  constraint tiers_range_valid check (max_visits is null or max_visits >= min_visits)
);

-- ------------------------------------------------------------
-- bookings — FUENTE DE VERDAD de las reservas
-- ------------------------------------------------------------
-- Google Calendar deja de ser la base de datos y pasa a ser la agenda
-- operativa de los barberos. google_event_id es solo la referencia
-- cruzada.
--
-- user_id es NULL a propósito: reservar sin cuenta debe seguir
-- funcionando. customer_name/phone se guardan siempre, lo que permite
-- reconciliar reservas de invitados con una cuenta creada después.

create table if not exists public.bookings (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references public.profiles (id) on delete set null,
  barber_id               text not null references public.barbers (id),
  status                  booking_status not null default 'pending',

  starts_at               timestamptz not null,
  ends_at                 timestamptz not null,

  -- Congelados al momento de reservar: si mañana sube el precio, el
  -- historial del cliente no debe cambiar retroactivamente.
  total_price_cop         integer not null default 0 check (total_price_cop >= 0),
  total_duration_minutes  integer not null check (total_duration_minutes > 0),

  customer_name           text not null,
  customer_phone          text not null,
  notes                   text,

  google_event_id         text,
  google_calendar_synced  boolean not null default false,

  source                  text not null default 'web',

  -- Se registra solo cuando el estado pasa a 'completed'/'cancelled'
  -- (ver trigger set_booking_status_timestamps en 0008).
  completed_at            timestamptz,
  cancelled_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint bookings_time_valid check (ends_at > starts_at)
);

create index if not exists bookings_user_idx        on public.bookings (user_id, starts_at desc);
create index if not exists bookings_barber_time_idx on public.bookings (barber_id, starts_at);
create index if not exists bookings_status_idx      on public.bookings (status);
create index if not exists bookings_phone_idx       on public.bookings (customer_phone);
create unique index if not exists bookings_google_event_idx
  on public.bookings (google_event_id) where google_event_id is not null;

-- ------------------------------------------------------------
-- booking_services — servicios de cada reserva
-- ------------------------------------------------------------
-- Guarda un snapshot de nombre/precio/duración. service_id puede
-- quedar en null si el servicio se elimina del catálogo: el historial
-- del cliente debe sobrevivir a eso.

create table if not exists public.booking_services (
  id                        uuid primary key default gen_random_uuid(),
  booking_id                uuid not null references public.bookings (id) on delete cascade,
  service_id                text references public.services (id) on delete set null,
  name_snapshot             text not null,
  price_cop_snapshot        integer not null check (price_cop_snapshot >= 0),
  duration_minutes_snapshot integer not null check (duration_minutes_snapshot > 0),
  position                  integer not null default 0
);

create index if not exists booking_services_booking_idx on public.booking_services (booking_id);

-- ------------------------------------------------------------
-- points_transactions — LEDGER de puntos
-- ------------------------------------------------------------
-- Append-only. El saldo NUNCA se guarda como número suelto: se deriva
-- sumando estas filas (ver vista en 0002). Esto da auditoría,
-- reversiones y caducidad sin rediseñar nada.
-- amount positivo = otorga, negativo = descuenta.

create table if not exists public.points_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  amount        integer not null check (amount <> 0),
  reason        points_reason not null,
  description   text,

  booking_id    uuid references public.bookings (id) on delete set null,
  referral_id   uuid,
  redemption_id uuid,

  -- Para caducidad de puntos, si se decide aplicarla.
  expires_at    timestamptz,
  -- Qué usuario del staff lo registró (null = automático del sistema).
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists points_tx_user_idx    on public.points_transactions (user_id, created_at desc);
create index if not exists points_tx_booking_idx on public.points_transactions (booking_id);

-- Una reserva solo puede otorgar puntos por asistencia una vez.
-- Blindaje a nivel de base de datos contra doble otorgamiento.
create unique index if not exists points_tx_one_per_booking_idx
  on public.points_transactions (booking_id)
  where reason = 'booking_attended' and booking_id is not null;

-- ------------------------------------------------------------
-- rewards / reward_redemptions — Fase 5
-- ------------------------------------------------------------

create table if not exists public.rewards (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  points_cost  integer not null check (points_cost > 0),
  active       boolean not null default true,
  stock        integer,
  image_url    text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.reward_redemptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  reward_id    uuid not null references public.rewards (id),
  points_spent integer not null check (points_spent > 0),
  status       redemption_status not null default 'pending',
  code         text unique,
  fulfilled_at timestamptz,
  fulfilled_by uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists redemptions_user_idx on public.reward_redemptions (user_id, created_at desc);

-- ------------------------------------------------------------
-- referrals — Fase 5
-- ------------------------------------------------------------
-- Un cliente solo puede ser referido una vez (unique en referred_id).
-- Pasa a 'completed' solo cuando el invitado ASISTE a su primera cita,
-- no cuando se registra: sin eso el sistema se abusa con correos falsos.

create table if not exists public.referrals (
  id                    uuid primary key default gen_random_uuid(),
  referrer_id           uuid not null references public.profiles (id) on delete cascade,
  referred_id           uuid not null unique references public.profiles (id) on delete cascade,
  code_used             text,
  status                referral_status not null default 'pending',
  qualifying_booking_id uuid references public.bookings (id) on delete set null,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  constraint referrals_no_self check (referrer_id <> referred_id)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

-- ------------------------------------------------------------
-- memberships — Fase 6 (membresía de pago, si se decide)
-- ------------------------------------------------------------

create table if not exists public.memberships (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  plan         text not null,
  status       membership_status not null default 'active',
  started_at   timestamptz not null default now(),
  expires_at   timestamptz,
  external_ref text,
  created_at   timestamptz not null default now()
);

create index if not exists memberships_user_idx on public.memberships (user_id, status);

-- Claves foráneas diferidas del ledger (las tablas ya existen aquí).
do $$ begin
  alter table public.points_transactions
    add constraint points_tx_referral_fk
    foreign key (referral_id) references public.referrals (id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.points_transactions
    add constraint points_tx_redemption_fk
    foreign key (redemption_id) references public.reward_redemptions (id) on delete set null;
exception when duplicate_object then null; end $$;
