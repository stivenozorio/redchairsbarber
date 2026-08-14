import { test } from "node:test";
import assert from "node:assert/strict";
import { shiftDateStr } from "../src/lib/format.js";

// shiftDateStr: botones "día anterior/siguiente" del panel del
// barbero. Debe seguir dando la fecha correcta en hora de Bogotá sin
// importar en qué zona horaria esté la máquina/navegador que corre
// esto — por eso ancla a mediodía UTC-05:00 antes de sumar/restar, en
// vez de usar new Date(str) + setDate() directo (que interpretaría la
// fecha en la zona horaria LOCAL del navegador, no en la de Bogotá).

test("shiftDateStr resta un día", () => {
  assert.equal(shiftDateStr("2026-08-14", -1), "2026-08-13");
});

test("shiftDateStr suma un día", () => {
  assert.equal(shiftDateStr("2026-08-14", 1), "2026-08-15");
});

test("shiftDateStr con 0 días devuelve la misma fecha", () => {
  assert.equal(shiftDateStr("2026-08-14", 0), "2026-08-14");
});

test("shiftDateStr cruza el fin de mes correctamente", () => {
  assert.equal(shiftDateStr("2026-08-31", 1), "2026-09-01");
  assert.equal(shiftDateStr("2026-09-01", -1), "2026-08-31");
});

test("shiftDateStr cruza el fin de año correctamente", () => {
  assert.equal(shiftDateStr("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDateStr("2027-01-01", -1), "2026-12-31");
});

test("shiftDateStr respeta el 29 de febrero en año bisiesto", () => {
  assert.equal(shiftDateStr("2028-02-28", 1), "2028-02-29");
  assert.equal(shiftDateStr("2028-03-01", -1), "2028-02-29");
});

test("shiftDateStr suma varios días de una vez (no solo de a uno)", () => {
  assert.equal(shiftDateStr("2026-08-14", 7), "2026-08-21");
  assert.equal(shiftDateStr("2026-08-14", -7), "2026-08-07");
});
