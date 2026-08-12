import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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
const calendarSyncErrors = readMigration("0012_calendar_sync_errors.sql");
const awardPoints = readMigration("0013_award_points_on_completion.sql");
const grantSummaryViews = readMigration("0014_grant_club_summary_views.sql");
const summaryBirthday = readMigration("0015_club_summary_birthday.sql");
const extendClosingHour = readMigration("0016_extend_closing_hour.sql");
const pointsPerService = readMigration("0017_points_per_service.sql");
const pointsRedemption = readMigration("0018_points_redemption.sql");

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

// --- Fase 3 (ajuste): 0012 auditoría de sincronización con Calendar ---

test("0012 crea calendar_sync_errors referenciando la reserva", () => {
  assert.ok(calendarSyncErrors.includes("create table if not exists public.calendar_sync_errors"));
  assert.match(calendarSyncErrors, /booking_id\s+uuid not null references public\.bookings/);
});

test("0012 es de solo lectura para staff, escritura solo del servidor", () => {
  assert.match(calendarSyncErrors, /alter table public\.calendar_sync_errors\s+enable row level security/);
  assert.match(calendarSyncErrors, /for select using \(public\.is_staff\(\)\)/);
  assert.ok(
    !/create policy \w*calendar_sync_errors\w*[\s\S]*?for (insert|update|delete)/i.test(calendarSyncErrors),
    "no debe haber políticas de escritura para el navegador"
  );
  assert.match(calendarSyncErrors, /grant select, insert on public\.calendar_sync_errors to service_role/);
});

test("0012 no borra nada y refresca el cache de PostgREST", () => {
  assert.ok(
    !/\bdrop table\b|\bdelete from\b|\btruncate\b/i.test(calendarSyncErrors),
    "no debe borrar datos existentes"
  );
  assert.ok(calendarSyncErrors.includes("notify pgrst, 'reload schema'"));
});

// --- Fase 4 (Puntos y niveles): 0013 otorgar puntos al completar ---

test("0013 solo otorga puntos cuando la cita pasa a 'completed' por primera vez", () => {
  assert.match(awardPoints, /new\.status = 'completed'/);
  assert.match(awardPoints, /old\.status is distinct from 'completed'/);
});

test("0013 no otorga puntos a reservas de invitado (sin cuenta)", () => {
  assert.match(awardPoints, /and new\.user_id is not null/);
});

test("0013 respeta el índice único: no duplica puntos si se corre dos veces", () => {
  assert.match(awardPoints, /on conflict \(booking_id\) where reason = 'booking_attended'/);
  assert.match(awardPoints, /do nothing/);
});

test("0013 suma la visita a profiles.visit_count en el mismo evento", () => {
  assert.match(awardPoints, /update public\.profiles\s+set visit_count = visit_count \+ 1/);
});

test("0013 registra el trigger sobre bookings después de actualizar", () => {
  assert.ok(awardPoints.includes("create trigger bookings_award_points"));
  assert.match(awardPoints, /after update on public\.bookings/);
});

test("0013 no borra nada y refresca el cache de PostgREST", () => {
  assert.ok(
    !/\bdrop table\b|\bdelete from\b|\btruncate\b/i.test(awardPoints),
    "no debe borrar datos existentes"
  );
  assert.ok(awardPoints.includes("notify pgrst, 'reload schema'"));
});

// --- Fase 4 (ajuste): 0014 permiso faltante sobre las vistas de socio ---

test("0014 concede select a authenticated sobre las vistas de socio", () => {
  assert.match(
    grantSummaryViews,
    /grant select on public\.member_points_balance, public\.club_member_summary\s*\nto authenticated/
  );
});

test("0014 no borra nada y refresca el cache de PostgREST", () => {
  assert.ok(
    !/\bdrop table\b|\bdelete from\b|\btruncate\b/i.test(grantSummaryViews),
    "no debe borrar datos existentes"
  );
  assert.ok(grantSummaryViews.includes("notify pgrst, 'reload schema'"));
});

// Prueba de regresión: este mismo bug (RLS ok, pero sin GRANT sobre la
// vista → "permission denied for view X" en el navegador) ya pasó una
// vez con las tablas base (arreglado en 0007) y volvió a pasar con las
// vistas (arreglado en 0014, silenciosamente, porque DigitalCard se
// degrada sin mostrar el error). Si en el futuro se agrega una vista
// nueva y se olvida el GRANT, esta prueba debe fallar en vez de
// descubrirse en producción.
test("toda vista declarada tiene GRANT SELECT explícito para 'authenticated'", () => {
  const migrationsDir = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));
  const allMigrationsSql = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(`${migrationsDir}${f}`, "utf8"))
    .join("\n");

  const sqlOnly = functions
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  const viewNames = [...sqlOnly.matchAll(/create or replace view\s+public\.(\w+)/g)].map(
    (m) => m[1]
  );

  assert.ok(viewNames.length > 0, "debe haber al menos una vista para probar esto");
  for (const view of viewNames) {
    const granted = new RegExp(`grant select[^;]*\\bpublic\\.${view}\\b[^;]*to[^;]*authenticated`).test(
      allMigrationsSql
    );
    assert.ok(
      granted,
      `Falta GRANT SELECT a authenticated sobre la vista ${view} (causa "permission denied for view" en el navegador)`
    );
  }
});

// --- Fase 4 (ajuste): 0015 expone el cumpleaños en club_member_summary ---

test("0015 agrega birthday a club_member_summary sin quitar columnas existentes", () => {
  assert.match(summaryBirthday, /p\.birthday/);
  // Las columnas que ya consumía el frontend (Fase 1-4) deben seguir ahí:
  // CREATE OR REPLACE VIEW puede agregar columnas, pero un olvido de
  // copiar una columna existente sería una regresión silenciosa.
  for (const column of ["p.full_name", "p.email", "p.phone", "p.visit_count", "p.referral_code"]) {
    assert.ok(summaryBirthday.includes(column), `No debe perderse la columna ${column}`);
  }
});

test("0015 no borra nada y refresca el cache de PostgREST", () => {
  assert.ok(
    !/\bdrop table\b|\bdelete from\b|\btruncate\b/i.test(summaryBirthday),
    "no debe borrar datos existentes"
  );
  assert.ok(summaryBirthday.includes("notify pgrst, 'reload schema'"));
});

// --- Fase 4 (ajuste): 0016 extiende el cierre a las 9:00 p.m. ---

test("0016 solo mueve el cierre de quien hoy cierra exactamente a las 20:00", () => {
  assert.match(extendClosingHour, /set close_time = time '21:00'/);
  assert.match(extendClosingHour, /where is_open = true and close_time = time '20:00'/);
});

test("0016 actualiza el horario por defecto de un barbero nuevo", () => {
  assert.match(extendClosingHour, /create or replace function public\.seed_default_barber_schedule/);
  assert.match(extendClosingHour, /case when d <> 0 then time '21:00' end/);
  assert.ok(
    !extendClosingHour.includes("time '20:00' end"),
    "el horario por defecto para un barbero nuevo no debe seguir cerrando a las 20:00"
  );
});

test("0016 no borra nada y refresca el cache de PostgREST", () => {
  assert.ok(
    !/\bdrop table\b|\bdelete from\b|\btruncate\b/i.test(extendClosingHour),
    "no debe borrar datos existentes"
  );
  assert.ok(extendClosingHour.includes("notify pgrst, 'reload schema'"));
});

// --- Fase 4 (ajuste): 0017 puntos según el servicio, no un monto fijo ---

test("0017 ya no otorga un monto fijo de puntos: lo calcula por servicio", () => {
  assert.ok(
    !/points_per_visit constant integer := 10/.test(pointsPerService),
    "no debe quedar el monto fijo de 10 puntos de la versión anterior"
  );
  assert.match(pointsPerService, /price_cop_snapshot \/ 2000/);
  assert.match(pointsPerService, /from public\.booking_services\s+where booking_id = new\.id/);
});

test("0017 suma los puntos de todos los servicios de la reserva (no solo el primero)", () => {
  assert.match(pointsPerService, /select coalesce\(sum\(price_cop_snapshot \/ 2000\), 0\)/);
});

test("0017 sigue otorgando solo cuando la cita pasa a 'completed' por primera vez, con cuenta", () => {
  assert.match(pointsPerService, /new\.status = 'completed'/);
  assert.match(pointsPerService, /old\.status is distinct from 'completed'/);
  assert.match(pointsPerService, /and new\.user_id is not null/);
});

test("0017 respeta el índice único: no duplica puntos si se corre dos veces", () => {
  assert.match(pointsPerService, /on conflict \(booking_id\) where reason = 'booking_attended'/);
  assert.match(pointsPerService, /do nothing/);
});

test("0017 no otorga una transacción de puntos en cero si la reserva no tiene servicios", () => {
  assert.match(pointsPerService, /if total_points > 0 then/);
});

test("0017 sigue sumando la visita a profiles.visit_count en el mismo evento", () => {
  assert.match(pointsPerService, /update public\.profiles\s+set visit_count = visit_count \+ 1/);
});

test("0017 reproduce la tabla oficial de puntos del programa", () => {
  const official: [number, number][] = [
    [20000, 10], // Corte de Cabello Sencillo
    [10000, 5], // Recorte de Barba Sencillo
    [15000, 7], // Afeitado
    [30000, 15], // Corte Premium
    [40000, 20], // Corte Premium + Barba
    [25000, 12], // Barba Premium
    [35000, 17], // Spa Facial
    [12000, 6], // Masaje Ocular
    [5000, 2], // Cejas / Lavado Capilar
    [65000, 32], // Experiencia VIP
    [75000, 37], // Experiencia VIP + Barba
    [81000, 40], // Experiencia VIP + Barba + Cejas (precio real del catálogo)
  ];
  for (const [priceCop, expectedPoints] of official) {
    assert.equal(
      Math.floor(priceCop / 2000),
      expectedPoints,
      `${priceCop} COP debe otorgar ${expectedPoints} puntos`
    );
  }
});

test("0017 no toca puntos ni visitas históricas: no borra ni actualiza filas existentes", () => {
  assert.ok(
    !/\bdrop table\b|\bdelete from\b|\btruncate\b|\bupdate public\.points_transactions\b/i.test(
      pointsPerService
    ),
    "no debe modificar transacciones de puntos ya existentes"
  );
  assert.ok(pointsPerService.includes("notify pgrst, 'reload schema'"));
});

// --- Fase 4 (ajuste): 0018 canje de servicios con puntos ---
//
// Nota sobre el alcance de estas pruebas: son pruebas ESTÁTICAS sobre
// el texto SQL de la migración (mismo estilo que el resto de este
// archivo) — no ejecutan contra una base Postgres real, porque este
// entorno no tiene una disponible. Verifican que el patrón correcto
// (bloqueo + recálculo de saldo dentro de la transacción, guardas de
// condición en el orden correcto, índices únicos) esté presente en el
// código, no el comportamiento en vivo bajo concurrencia real. Antes de
// usar el canje en producción, correr la migración en Supabase y
// probar manualmente los escenarios de doble clic / doble pestaña.

test("0018 agrega redeemed_with_points y points_redeemed a bookings, con su check de consistencia", () => {
  assert.match(pointsRedemption, /add column if not exists redeemed_with_points boolean not null default false/);
  assert.match(pointsRedemption, /add column if not exists points_redeemed integer/);
  assert.match(pointsRedemption, /add constraint bookings_points_redeemed_consistent/);
});

test("0018 agrega el motivo 'redemption_refund' al enum points_reason", () => {
  assert.match(pointsRedemption, /alter type public\.points_reason add value if not exists 'redemption_refund'/);
});

test("0018 protege con índices únicos: como mucho un canje y un reembolso por reserva", () => {
  assert.match(
    pointsRedemption,
    /points_tx_one_redemption_per_booking_idx[\s\S]*?where reason = 'reward_redemption' and booking_id is not null/
  );
  assert.match(
    pointsRedemption,
    /points_tx_one_refund_per_booking_idx[\s\S]*?where reason = 'redemption_refund' and booking_id is not null/
  );
});

test("0018 redeem_points_for_booking rechaza el canje si el costo no es positivo", () => {
  assert.match(pointsRedemption, /if p_points is null or p_points <= 0 then/);
  assert.match(pointsRedemption, /return query select false, null::integer,/);
});

test("0018 redeem_points_for_booking recalcula el saldo DENTRO de un bloqueo por usuario (protección contra doble gasto)", () => {
  const fnStart = pointsRedemption.indexOf("create or replace function public.redeem_points_for_booking");
  const fnEnd = pointsRedemption.indexOf("$$;", fnStart);
  const fnBody = pointsRedemption.slice(fnStart, fnEnd);

  assert.ok(fnBody.includes("pg_advisory_xact_lock(hashtext(p_user_id::text))"), "debe tomar un bloqueo por usuario");
  assert.ok(
    fnBody.includes("select coalesce(sum(amount), 0) into v_balance"),
    "debe recalcular el saldo real, no confiar en uno recibido"
  );

  // El orden importa: el bloqueo debe tomarse ANTES de leer el saldo,
  // si no, dos transacciones concurrentes podrían leer el mismo saldo
  // "viejo" antes de que cualquiera de las dos alcance a descontar.
  const lockIndex = fnBody.indexOf("pg_advisory_xact_lock");
  const balanceReadIndex = fnBody.indexOf("select coalesce(sum(amount), 0) into v_balance");
  assert.ok(lockIndex >= 0 && balanceReadIndex >= 0 && lockIndex < balanceReadIndex);
});

test("0018 redeem_points_for_booking rechaza el canje si el saldo (recién recalculado) no alcanza", () => {
  assert.match(pointsRedemption, /if v_balance < p_points then/);
  assert.match(pointsRedemption, /return query select false, v_balance, 'Saldo de puntos insuficiente\.';/);
});

test("0018 redeem_points_for_booking descuenta con un monto negativo y motivo 'reward_redemption'", () => {
  assert.match(
    pointsRedemption,
    /insert into public\.points_transactions \(user_id, amount, reason, description, booking_id\)\s*\n\s*values \(p_user_id, -p_points, 'reward_redemption', p_description, p_booking_id\);/
  );
});

test("0018 redeem_points_for_booking solo lo puede ejecutar el servidor (service_role), nunca el navegador", () => {
  assert.match(
    pointsRedemption,
    /revoke all on function public\.redeem_points_for_booking\(uuid, uuid, integer, text\) from public;/
  );
  assert.match(
    pointsRedemption,
    /grant execute on function public\.redeem_points_for_booking\(uuid, uuid, integer, text\) to service_role;/
  );
});

test("0018 una reserva canjeada NO otorga los puntos normales del servicio al completarse", () => {
  const fnStart = pointsRedemption.lastIndexOf("create or replace function public.award_points_on_completion");
  const fnEnd = pointsRedemption.indexOf("$$;", fnStart);
  const fnBody = pointsRedemption.slice(fnStart, fnEnd);

  assert.ok(fnBody.includes("if not new.redeemed_with_points then"), "el otorgamiento debe quedar condicionado");
  // La suma de la línea de booking_attended debe estar DENTRO de ese
  // if — no basta con que la palabra exista en algún lado del cuerpo.
  const guardIndex = fnBody.indexOf("if not new.redeemed_with_points then");
  const insertIndex = fnBody.indexOf("'booking_attended'");
  assert.ok(guardIndex >= 0 && insertIndex > guardIndex);
});

test("0018 una reserva canjeada y completada SÍ sigue sumando la visita (puntos y visitas son conceptos distintos)", () => {
  const fnStart = pointsRedemption.lastIndexOf("create or replace function public.award_points_on_completion");
  const fnEnd = pointsRedemption.indexOf("$$;", fnStart);
  const fnBody = pointsRedemption.slice(fnStart, fnEnd);

  // set visit_count = visit_count + 1 debe estar FUERA del "if not
  // new.redeemed_with_points" (que solo envuelve el otorgamiento de
  // puntos) — si quedara adentro, una cita canjeada nunca subiría de
  // nivel, lo cual el usuario pidió explícitamente que no pasara.
  const guardStart = fnBody.indexOf("if not new.redeemed_with_points then");
  const guardEnd = fnBody.indexOf("end if;", guardStart);
  const visitIncrementIndex = fnBody.indexOf("set visit_count = visit_count + 1");
  assert.ok(visitIncrementIndex > guardEnd, "el incremento de visita no debe estar dentro de la guarda de puntos");
});

test("0018 cancelar una reserva canjeada devuelve los puntos (trigger nuevo, no modifica bookings_award_points)", () => {
  assert.match(pointsRedemption, /create or replace function public\.refund_points_on_cancellation/);
  assert.match(pointsRedemption, /new\.status = 'cancelled'/);
  assert.match(pointsRedemption, /old\.status is distinct from 'cancelled'/);
  assert.match(pointsRedemption, /new\.redeemed_with_points/);
  assert.match(
    pointsRedemption,
    /values \(\s*new\.user_id,\s*new\.points_redeemed,\s*'redemption_refund',/
  );
  assert.match(pointsRedemption, /create trigger bookings_refund_points/);
  assert.match(pointsRedemption, /after update on public\.bookings/);
});

test("0018 el reembolso está protegido contra duplicarse (on conflict do nothing)", () => {
  const fnStart = pointsRedemption.indexOf("create or replace function public.refund_points_on_cancellation");
  const fnEnd = pointsRedemption.indexOf("$$;", fnStart);
  const fnBody = pointsRedemption.slice(fnStart, fnEnd);
  assert.ok(fnBody.includes("on conflict (booking_id) where reason = 'redemption_refund'"));
  assert.ok(fnBody.includes("do nothing"));
});

test("0018 no toca puntos históricos: no borra ni actualiza filas existentes de points_transactions", () => {
  assert.ok(
    !/\bdrop table\b|\bdelete from\b|\btruncate\b|\bupdate public\.points_transactions\b/i.test(
      pointsRedemption
    ),
    "no debe modificar transacciones de puntos ya existentes — solo inserta filas nuevas hacia adelante"
  );
  assert.ok(pointsRedemption.includes("notify pgrst, 'reload schema'"));
});
