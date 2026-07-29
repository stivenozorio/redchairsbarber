import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSlotRange,
  buildDayRange,
  fitsBusinessHours,
  durationMinutesBetween,
  assertValidDate,
  InvalidScheduleInputError,
} from "../api/_lib/schedule.js";

test("buildSlotRange usa el offset fijo de Bogotá", () => {
  const { startISO, endISO } = buildSlotRange("2026-08-10", "10:00 am", 90);
  assert.equal(startISO, "2026-08-10T10:00:00-05:00");
  assert.equal(endISO, "2026-08-10T11:30:00-05:00");
});

test("buildSlotRange interpreta correctamente am/pm y mediodía", () => {
  assert.equal(buildSlotRange("2026-08-10", "12:00 pm", 30).startISO, "2026-08-10T12:00:00-05:00");
  assert.equal(buildSlotRange("2026-08-10", "12:00 am", 30).startISO, "2026-08-10T00:00:00-05:00");
  assert.equal(buildSlotRange("2026-08-10", "8:00 pm", 60).startISO, "2026-08-10T20:00:00-05:00");
});

test("buildDayRange cubre el día completo", () => {
  const range = buildDayRange("2026-08-10");
  assert.equal(range.startISO, "2026-08-10T00:00:00-05:00");
  assert.equal(range.endISO, "2026-08-11T00:00:00-05:00");
});

test("fitsBusinessHours respeta apertura y cierre", () => {
  assert.equal(fitsBusinessHours("10:00 am", 60), true, "abre a las 10");
  assert.equal(fitsBusinessHours("9:00 am", 30), false, "antes de abrir");
  assert.equal(fitsBusinessHours("7:00 pm", 60), true, "termina justo al cierre");
  assert.equal(fitsBusinessHours("7:30 pm", 60), false, "se pasa del cierre");
  assert.equal(fitsBusinessHours("8:00 pm", 30), false, "empieza al cierre");
});

test("durationMinutesBetween calcula la duración de un evento existente", () => {
  assert.equal(
    durationMinutesBetween("2026-08-10T10:00:00-05:00", "2026-08-10T11:30:00-05:00"),
    90
  );
});

test("assertValidDate rechaza fechas inválidas", () => {
  assert.doesNotThrow(() => assertValidDate("2026-08-10"));
  assert.throws(() => assertValidDate("10/08/2026"), InvalidScheduleInputError);
  assert.throws(() => assertValidDate("no-es-fecha"), InvalidScheduleInputError);
});
