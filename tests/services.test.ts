import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ALL_BOOKABLE_SERVICES,
  sumServiceTotals,
  parsePriceToNumber,
  formatPriceNumber,
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

test("sumServiceTotals suma duración y precio de varios servicios", () => {
  const totals = sumServiceTotals(["Corte Premium", "Barba Premium"]);
  assert.equal(totals.totalPrice, 55000);
  assert.equal(totals.totalMinutes, 70);
  assert.equal(totals.services.length, 2);
});

test("sumServiceTotals ignora servicios desconocidos", () => {
  const totals = sumServiceTotals(["No existe"]);
  assert.equal(totals.totalPrice, 0);
  assert.equal(totals.totalMinutes, 0);
});

test("todos los servicios tienen id único y no vacío", () => {
  const ids = ALL_BOOKABLE_SERVICES.map((s) => s.id);
  assert.ok(ids.every(Boolean), "ningún id puede estar vacío");
  assert.equal(new Set(ids).size, ids.length, "los ids deben ser únicos");
});

test("los nombres de servicio son únicos (se usan como clave en la reserva)", () => {
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

test("los horarios cubren la jornada publicada", () => {
  assert.equal(TIME_SLOTS[0], "10:00 am");
  assert.equal(TIME_SLOTS[TIME_SLOTS.length - 1], "8:00 pm");
});
