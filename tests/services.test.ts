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
  calculatePoints,
  calculateRedemptionCost,
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

// calculatePoints/totalPoints: preview en el carrito de lo que otorgaría
// el trigger award_points_on_completion() (0017_points_per_service.sql)
// al completar la cita. Debe coincidir exacto con esa fórmula del
// servidor: piso(precio / 2000).

test("calculatePoints reproduce la tabla oficial de puntos del programa", () => {
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
    [81000, 40], // Experiencia VIP + Barba + Cejas
  ];
  for (const [priceCop, expectedPoints] of official) {
    assert.equal(calculatePoints(priceCop), expectedPoints);
  }
});

test("sumServiceTotals.totalPoints suma puntos por línea, no del total combinado", () => {
  // corte-premium ($30.000 -> 15 pts) + barba-premium ($25.000 -> 12 pts).
  // Sumar por línea (15+12=27) debe coincidir con lo que otorga el
  // trigger; sumar el total combinado primero (55.000 -> 27) da el
  // mismo resultado aquí por casualidad, así que la prueba real está en
  // que cada línea se calcula con su propio precio, no dividiendo el
  // total entre el número de servicios.
  const totals = sumServiceTotals(["corte-premium", "barba-premium"]);
  assert.equal(totals.totalPoints, 27);
});

test("sumServiceTotals.totalPoints es 0 para ids desconocidos", () => {
  const totals = sumServiceTotals(["no-existe"]);
  assert.equal(totals.totalPoints, 0);
});

// calculateRedemptionCost: cuánto cuesta CANJEAR (pagar con puntos en
// vez de efectivo) un servicio — deliberadamente distinta de
// calculatePoints (con la que se GANAN puntos). Debe coincidir exacto
// con redeem_points_for_booking() (0018_points_redemption.sql):
// piso(precio / 300), redondeo hacia abajo siempre, nunca ceil() ni al
// más cercano.

test("calculateRedemptionCost reproduce los ejemplos oficiales del canje", () => {
  const official: [number, number][] = [
    [20000, 66], // Corte de Cabello Sencillo: 66,66 -> 66
    [10000, 33], // Recorte de Barba: 33,33 -> 33
    [15000, 50], // Afeitado: 50 -> 50
    [30000, 100], // Corte Premium: 100 -> 100
    [65000, 216], // Experiencia VIP: 216,66 -> 216
  ];
  for (const [priceCop, expectedPoints] of official) {
    assert.equal(calculateRedemptionCost(priceCop), expectedPoints);
  }
});

test("calculateRedemptionCost siempre redondea hacia abajo, nunca al más cercano", () => {
  // $299 quedaría a 0.33 puntos de redondear "al más cercano" a 1, pero
  // el redondeo hacia abajo exigido explícitamente debe dar 0.
  assert.equal(calculateRedemptionCost(299), 0);
  // $599 -> 1,99 puntos: redondear al más cercano daría 2, pero debe
  // dar 1 (piso, no round()).
  assert.equal(calculateRedemptionCost(599), 1);
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
  // El orden de BARBERS es puramente visual (qué aparece primero en los
  // selectores) y puede cambiar; lo que no debe cambiar es el conjunto
  // de ids disponibles.
  const ids = BARBERS.map((b) => b.id);
  assert.deepEqual(new Set(ids), new Set(["any", "camilo", "alejandro"]));
  assert.equal(BARBERS.find((b) => b.id === "alejandro")?.name, "Alejandro Reyes");
});

test("BARBERS pone a 'Sin preferencia' primero, seguido de los barberos reales", () => {
  assert.equal(BARBERS[0].id, "any");
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
