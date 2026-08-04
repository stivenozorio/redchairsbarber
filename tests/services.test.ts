import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ALL_BOOKABLE_SERVICES,
  sumServiceTotals,
  parsePriceToNumber,
  formatPriceNumber,
  applyLiveOverrides,
} from "../src/data/services.js";
import { BARBERS, TIME_SLOTS } from "../src/data/booking.js";

test("parsePriceToNumber entiende los formatos de precio", () => {
  assert.equal(parsePriceToNumber("$30.000"), 30000);
  assert.equal(parsePriceToNumber("+$10.000"), 10000);
  assert.equal(parsePriceToNumber(""), 0);
});

test("formatPriceNumber usa el formato colombiano", () => {
  assert.equal(formatPriceNumber(45000), "$45.000");
});

test("sumServiceTotals suma duración y precio de varios servicios (por id)", () => {
  const totals = sumServiceTotals(["corte-premium", "barba-premium"]);
  assert.equal(totals.totalPrice, 55000);
  assert.equal(totals.totalMinutes, 70);
  assert.equal(totals.services.length, 2);
});

test("sumServiceTotals ignora ids desconocidos", () => {
  const totals = sumServiceTotals(["no-existe"]);
  assert.equal(totals.totalPrice, 0);
  assert.equal(totals.totalMinutes, 0);
});

test("sumServiceTotals empareja por id, no por nombre (sobrevive a un renombre)", () => {
  // Si un servicio se renombra en el catálogo (p. ej. desde el panel
  // administrativo), seguir emparejando por nombre haría que la reserva
  // ya no lo reconociera. Por eso el id es la llave estable.
  const catalog = ALL_BOOKABLE_SERVICES.map((s) =>
    s.id === "corte-premium" ? { ...s, name: "Corte Premium Renombrado" } : s
  );
  const totals = sumServiceTotals(["corte-premium"], catalog);
  assert.equal(totals.services.length, 1);
  assert.equal(totals.services[0].name, "Corte Premium Renombrado");
});

test("todos los servicios tienen id único y no vacío", () => {
  const ids = ALL_BOOKABLE_SERVICES.map((s) => s.id);
  assert.ok(ids.every(Boolean), "ningún id puede estar vacío");
  assert.equal(new Set(ids).size, ids.length, "los ids deben ser únicos");
});

test("los nombres de servicio son únicos (evita confundir dos servicios iguales en el selector)", () => {
  // El id es la llave de emparejamiento (sobrevive a un renombre); esto
  // solo cuida que la lista que ve el cliente no muestre dos entradas
  // con el mismo nombre.
  const names = ALL_BOOKABLE_SERVICES.map((s) => s.name);
  assert.equal(new Set(names).size, names.length);
});

// Esta prueba protege contra la fuga más silenciosa del proyecto: que
// el catálogo del código y el de la base de datos se desincronicen.
test("los ids de servicios coinciden con el seed de Supabase", () => {
  const seedPath = fileURLToPath(new URL("../supabase/migrations/0004_seed.sql", import.meta.url));
  const sql = readFileSync(seedPath, "utf8");

  const seedIds = new Set(
    [...sql.matchAll(/^\s*\('([a-z0-9-]+)',\s*'/gm)].map((match) => match[1])
  );

  for (const service of ALL_BOOKABLE_SERVICES) {
    assert.ok(
      seedIds.has(service.id),
      `El servicio "${service.name}" (id: ${service.id}) no está en 0004_seed.sql`
    );
  }
});

test("los barberos coinciden con los calendarios configurables", () => {
  const ids = BARBERS.map((b) => b.id);
  assert.deepEqual(ids, ["any", "camilo", "alejandro"]);
  assert.equal(BARBERS.find((b) => b.id === "alejandro")?.name, "Alejandro Reyes");
});

test("las horas candidatas cubren la jornada publicada hoy (10am-8pm)", () => {
  // TIME_SLOTS es el universo de horas que ofrece el selector; el horario
  // real (fijo hoy, dinámico por barbero desde el panel administrativo) lo
  // decide el servidor marcando como no disponibles las que no aplican, así
  // que el rango se deja más amplio que la jornada publicada a propósito.
  assert.ok(TIME_SLOTS.includes("10:00 am"), "debe incluir la apertura publicada");
  assert.ok(TIME_SLOTS.includes("8:00 pm"), "debe incluir el cierre publicado");
  assert.equal(new Set(TIME_SLOTS).size, TIME_SLOTS.length, "no debe haber horas repetidas");
});

test("las horas candidatas están cada 30 minutos, no cada hora", () => {
  // Varios servicios duran menos de una hora (p. ej. un corte de barba
  // de 20-30 min). Si solo se ofrecieran horas en punto, el cupo que
  // deja libre una cita corta nunca se podría volver a reservar — se
  // perdería media hora de agenda por cada cita corta.
  assert.ok(TIME_SLOTS.includes("7:30 pm"), "debe ofrecer horas a la media hora");
  assert.ok(TIME_SLOTS.includes("12:30 pm"), "el cruce del mediodía debe seguir en formato 12 horas");
  assert.equal(TIME_SLOTS[0], "7:00 am");
  assert.equal(TIME_SLOTS[TIME_SLOTS.length - 1], "10:00 pm");
});

test("applyLiveOverrides superpone nombre/precio/duración sin tocar el id", () => {
  const target = ALL_BOOKABLE_SERVICES[0];
  const overridden = applyLiveOverrides(ALL_BOOKABLE_SERVICES, {
    [target.id]: { name: "Nombre Nuevo", price: "$999.000", durationMinutes: 999 },
  });

  const result = overridden.find((s) => s.id === target.id);
  assert.equal(result?.id, target.id, "el id nunca cambia: es la llave estable");
  assert.equal(result?.name, "Nombre Nuevo");
  assert.equal(result?.price, "$999.000");
  assert.equal(result?.durationMinutes, 999);

  const untouched = overridden.find((s) => s.id !== target.id);
  const original = ALL_BOOKABLE_SERVICES.find((s) => s.id === untouched?.id);
  assert.deepEqual(untouched, original, "un servicio sin override debe quedar igual");
});

test("applyLiveOverrides devuelve el catálogo tal cual cuando no hay overrides (null)", () => {
  assert.equal(applyLiveOverrides(ALL_BOOKABLE_SERVICES, null), ALL_BOOKABLE_SERVICES);
});
