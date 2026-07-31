import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function readMigration(file: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../supabase/migrations/${file}`, import.meta.url)),
    "utf8"
  );
}

const schema = readMigration("0001_schema.sql");
const functions = readMigration("0002_functions.sql");
const rls = readMigration("0003_rls.sql");
const seed = readMigration("0004_seed.sql");
const profileDiag = readMigration("0005_profile_and_diagnostics.sql");
const diagnosticsGrantFix = readMigration("0006_fix_diagnostics_grant.sql");
const tablePrivilegesFix = readMigration("0007_grant_table_privileges.sql");
const statusExpand = readMigration("0008_booking_status_expand.sql");
const schedules = readMigration("0009_schedules.sql");
const adminRls = readMigration("0010_admin_rls.sql");
const bookingConfirmation = readMigration("0011_booking_confirmation.sql");

test("existen todas las tablas del modelo RED CLUB", () => {
  const expected = [
    "profiles",
    "barbers",
    "services",
    "tiers",
    "bookings",
    "booking_services",
    "points_transactions",
    "rewards",
    "reward_redemptions",
    "referrals",
    "memberships",
  ];
  for (const table of expected) {
    assert.ok(
      schema.includes(`create table if not exists public.${table}`),
      `Falta la tabla ${table}`
    );
  }
});

test("los puntos usan un ledger, no una columna de saldo", () => {
  assert.ok(schema.includes("create table if not exists public.points_transactions"));
  assert.ok(
    !/alter table public\.profiles[\s\S]*add column points\b/.test(schema),
    "profiles no debe tener una columna 'points'"
  );
  assert.ok(
    functions.includes("member_points_balance"),
    "el saldo debe derivarse en una vista"
  );
});

test("una reserva no puede otorgar puntos por asistencia dos veces", () => {
  assert.ok(schema.includes("points_tx_one_per_booking_idx"));
  assert.ok(schema.includes("where reason = 'booking_attended'"));
});

test("las reservas guardan la referencia al evento de Google Calendar", () => {
  assert.ok(schema.includes("google_event_id"));
  assert.ok(schema.includes("bookings_google_event_idx"), "debe ser único cuando existe");
});

test("las reservas de invitados están permitidas (user_id nullable)", () => {
  assert.ok(
    /user_id\s+uuid references public\.profiles \(id\) on delete set null/.test(schema),
    "user_id no debe ser NOT NULL: reservar sin cuenta debe seguir funcionando"
  );
});

test("RLS está activo en todas las tablas sensibles", () => {
  const mustHaveRls = [
    "profiles",
    "bookings",
    "booking_services",
    "points_transactions",
    "reward_redemptions",
    "referrals",
    "memberships",
  ];
  for (const table of mustHaveRls) {
    assert.ok(
      rls.includes(`alter table public.${table}               enable row level security`) ||
        rls.includes(`alter table public.${table}            enable row level security`) ||
        rls.includes(`alter table public.${table} enable row level security`) ||
        new RegExp(`alter table public\\.${table}\\s+enable row level security`).test(rls),
      `Falta habilitar RLS en ${table}`
    );
  }
});

test("el cliente no puede escribir puntos desde el navegador", () => {
  // Solo debe existir una política de SELECT sobre el ledger.
  assert.ok(rls.includes("create policy points_select_own"));
  assert.ok(
    !/create policy .*points.* for (insert|update|delete)/i.test(rls),
    "no debe haber políticas de escritura de puntos para el cliente"
  );
});

test("las vistas respetan RLS del usuario que consulta", () => {
  // Se ignoran los comentarios para no contar menciones en prosa.
  const sqlOnly = functions
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

  const views = [...sqlOnly.matchAll(/create or replace view\s+(\S+)\s*\n\s*with \(([^)]*)\)/g)];
  const declaredViews = (sqlOnly.match(/create or replace view/g) ?? []).length;

  assert.ok(declaredViews > 0, "debe haber al menos una vista");
  assert.equal(
    views.length,
    declaredViews,
    "toda vista debe declarar security_invoker o filtraría datos de otros socios"
  );
  for (const [, name, options] of views) {
    assert.match(
      options,
      /security_invoker\s*=\s*true/,
      `La vista ${name} debe declarar security_invoker = true`
    );
  }
});

test("el perfil se crea automáticamente al registrarse", () => {
  assert.ok(functions.includes("handle_new_user"));
  assert.ok(functions.includes("on_auth_user_created"));
  assert.ok(functions.includes("generate_referral_code"));
});

test("los niveles RED CLUB coinciden con lo definido para el club", () => {
  const expected: [string, string, string][] = [
    ["black", "BLACK MEMBER", "0,  4"],
    ["red", "RED MEMBER", "5,  14"],
    ["gold", "GOLD MEMBER", "15, 29"],
    ["legend", "LEGEND MEMBER", "30, null"],
  ];
  for (const [id, name] of expected) {
    assert.ok(seed.includes(`'${id}'`), `Falta el nivel ${id}`);
    assert.ok(seed.includes(name), `Falta el nombre ${name}`);
  }
  // LEGEND no tiene tope superior.
  assert.ok(/\('legend',\s*'LEGEND MEMBER',\s*30,\s*null/.test(seed));
});

test("los barberos sembrados coinciden con los del código", () => {
  assert.ok(seed.includes("'camilo'"));
  assert.ok(seed.includes("'alejandro'"));
  assert.ok(seed.includes("Alejandro Reyes"));
});

// --- 0005: perfil enriquecido y diagnóstico ---

test("0005 agrega avatar y control del formulario de teléfono", () => {
  assert.match(profileDiag, /add column if not exists avatar_url/);
  assert.match(profileDiag, /add column if not exists phone_prompt_dismissed/);
});

test("0005 es seguro de re-ejecutar y no borra datos", () => {
  assert.ok(
    !/\bdrop table\b|\bdelete from\b|\btruncate\b/i.test(profileDiag),
    "la migración no debe borrar datos existentes"
  );
  assert.ok(profileDiag.includes("on conflict (id) do nothing"));
});

test("0005 repara perfiles faltantes sin tocar los existentes", () => {
  assert.match(profileDiag, /where not exists \(select 1 from public\.profiles/);
});

test("el trigger captura el avatar que entrega Google", () => {
  assert.ok(profileDiag.includes("'avatar_url'"));
  assert.ok(profileDiag.includes("'picture'"), "Google usa 'picture' en algunos flujos");
});

test("la función de diagnóstico existe y no es pública", () => {
  assert.ok(profileDiag.includes("create or replace function public.redclub_diagnostics"));
  assert.match(profileDiag, /revoke all on function public\.redclub_diagnostics\(\) from/);
});

test("service_role conserva el permiso para llamar al diagnóstico tras el revoke", () => {
  // "revoke ... from public" también quita el EXECUTE implícito que
  // service_role heredaba de PUBLIC (no es superusuario en Supabase).
  // Sin este grant explícito, /api/health falla con
  // "permission denied for function redclub_diagnostics".
  assert.match(
    profileDiag,
    /grant execute on function public\.redclub_diagnostics\(\) to service_role/
  );
});

test("0006 repara el permiso para bases donde ya se aplicó 0005 sin el grant", () => {
  assert.match(
    diagnosticsGrantFix,
    /grant execute on function public\.redclub_diagnostics\(\) to service_role/
  );
  assert.ok(
    !/\bdrop\b|\bdelete from\b|\btruncate\b/i.test(diagnosticsGrantFix),
    "la migración de corrección no debe borrar nada"
  );
});

// --- 0003 / 0007: permisos de tabla (RLS no basta sin GRANT) ---

test("0003 concede permisos de tabla a service_role para todas las tablas", () => {
  const allTables = [
    "profiles",
    "barbers",
    "services",
    "tiers",
    "bookings",
    "booking_services",
    "points_transactions",
    "rewards",
    "reward_redemptions",
    "referrals",
    "memberships",
  ];
  assert.match(rls, /grant select, insert, update, delete on[\s\S]*?to service_role/);
  for (const table of allTables) {
    assert.ok(
      new RegExp(`public\\.${table}\\b`).test(rls),
      `Falta conceder permisos de tabla sobre ${table}`
    );
  }
});

test("0003 concede select a authenticated/anon consistente con las políticas RLS", () => {
  assert.match(rls, /grant select on[\s\S]*?to anon, authenticated/);
  assert.match(rls, /grant select on[\s\S]*?to authenticated/);
  assert.match(rls, /grant select, update on public\.profiles to authenticated/);
});

test("0007 repara los permisos de tabla para bases donde ya se aplicó 0003 sin ellos", () => {
  assert.match(tablePrivilegesFix, /grant select, insert, update, delete on[\s\S]*?to service_role/);
  assert.match(tablePrivilegesFix, /grant select, update on public\.profiles to authenticated/);
  assert.ok(
    !/\bdrop\b|\bdelete from\b|\btruncate\b/i.test(tablePrivilegesFix),
    "la migración de corrección no debe borrar nada"
  );
});

test("0005 refresca el cache de esquema de PostgREST", () => {
  assert.ok(
    profileDiag.includes("notify pgrst, 'reload schema'"),
    "sin esto las consultas con relaciones embebidas pueden fallar tras migrar"
  );
});

// --- Fase 2 (Panel administrativo): 0008 estados de cita ---

test("0008 agrega 'in_progress' y renombra 'attended' a 'completed'", () => {
  assert.match(statusExpand, /add value if not exists 'in_progress'/);
  assert.match(statusExpand, /rename value 'attended' to 'completed'/);
});

test("0008 renombra attended_at a completed_at sin perder la columna", () => {
  assert.match(statusExpand, /rename column attended_at to completed_at/);
});

test("0008 sella completed_at/cancelled_at automáticamente al cambiar de estado", () => {
  assert.ok(statusExpand.includes("create or replace function public.set_booking_status_timestamps"));
  assert.match(statusExpand, /new\.status = 'completed'[\s\S]*?new\.completed_at := now\(\)/);
  assert.match(statusExpand, /new\.status = 'cancelled'[\s\S]*?new\.cancelled_at := now\(\)/);
});

test("0008 es seguro de re-ejecutar y no borra reservas", () => {
  assert.ok(
    !/\bdrop table\b|\bdelete from\b|\btruncate\b/i.test(statusExpand),
    "no debe borrar reservas existentes"
  );
});

// --- Fase 2: 0009 horarios dinámicos ---

test("0009 crea horario semanal y excepciones por barbero", () => {
  assert.ok(schedules.includes("create table if not exists public.barber_schedules"));
  assert.ok(schedules.includes("create table if not exists public.schedule_exceptions"));
  assert.match(schedules, /day_of_week\s+smallint not null check \(day_of_week between 0 and 6\)/);
});

test("0009 exige horas cuando el día está abierto, no cuando está cerrado", () => {
  assert.match(schedules, /barber_schedules_hours_valid check/);
  assert.match(schedules, /is_open = false\) or \(open_time is not null/);
});

test("0009 siembra el horario publicado hoy (lunes a sábado 10-8, domingo cerrado) para los barberos existentes", () => {
  assert.match(schedules, /time '10:00'/);
  assert.match(schedules, /time '20:00'/);
  assert.match(schedules, /d <> 0/);
});

test("0009 auto-siembra el horario de un barbero nuevo con un trigger", () => {
  assert.ok(schedules.includes("create or replace function public.seed_default_barber_schedule"));
  assert.ok(schedules.includes("after insert on public.barbers"));
});

// --- Fase 2: 0010 RLS y permisos del panel administrativo ---

test("0010 habilita RLS y lectura pública en las tablas de horario", () => {
  assert.match(adminRls, /alter table public\.barber_schedules\s+enable row level security/);
  assert.match(adminRls, /alter table public\.schedule_exceptions\s+enable row level security/);
  assert.ok(adminRls.includes("barber_schedules_select_all"));
  assert.ok(adminRls.includes("schedule_exceptions_select_all"));
});

test("0010 solo admin puede escribir catálogos, horarios y otros perfiles", () => {
  const adminGated = [
    "barber_schedules_admin_insert",
    "barber_schedules_admin_update",
    "schedule_exceptions_admin_insert",
    "schedule_exceptions_admin_update",
    "schedule_exceptions_admin_delete",
    "services_admin_insert",
    "services_admin_update",
    "barbers_admin_insert",
    "barbers_admin_update",
    "profiles_update_admin",
  ];
  // Cada política de escritura debe condicionarse a is_admin(), no a
  // is_staff() (el panel del barbero es una fase futura y separada).
  for (const policy of adminGated) {
    const block = adminRls.match(new RegExp(`create policy ${policy}[\\s\\S]*?;`));
    assert.ok(block, `Falta la política ${policy}`);
    assert.match(block![0], /public\.is_admin\(\)/, `${policy} debería condicionarse a is_admin()`);
  }
});

test("0010 concede los permisos de tabla que las políticas de arriba necesitan", () => {
  assert.match(adminRls, /grant insert, update on public\.services to authenticated/);
  assert.match(adminRls, /grant insert, update on public\.barbers to authenticated/);
  assert.match(adminRls, /grant insert, update on public\.barber_schedules to authenticated/);
  assert.match(adminRls, /grant insert, update, delete on public\.schedule_exceptions to authenticated/);
});

test("0010 no le da a nadie permiso de escritura directa sobre bookings", () => {
  // El cambio de estado de una cita pasa por /api/staff/booking-status
  // (service role): ahí es donde se verifica que un barbero solo pueda
  // tocar sus propias reservas, algo que RLS no puede expresar por sí
  // solo sin duplicar esa misma lógica en una política.
  assert.ok(
    !/create policy \w*bookings\w*\s+on public\.bookings\s+for (insert|update|delete)/i.test(adminRls),
    "no debe haber políticas de escritura sobre bookings para el navegador"
  );
});

// --- Fase 3 (Panel del barbero): 0011 confirmación de asistencia ---

test("0011 agrega completed_by sin tocar datos existentes", () => {
  assert.match(bookingConfirmation, /add column if not exists completed_by uuid references public\.profiles/);
  assert.ok(
    !/\bdrop table\b|\bdelete from\b|\btruncate\b/i.test(bookingConfirmation),
    "no debe borrar reservas existentes"
  );
});

test("0011 refresca el cache de esquema de PostgREST", () => {
  assert.ok(bookingConfirmation.includes("notify pgrst, 'reload schema'"));
});
