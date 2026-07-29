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

test("0005 refresca el cache de esquema de PostgREST", () => {
  assert.ok(
    profileDiag.includes("notify pgrst, 'reload schema'"),
    "sin esto las consultas con relaciones embebidas pueden fallar tras migrar"
  );
});
