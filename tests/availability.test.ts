import { test } from "node:test";
import assert from "node:assert/strict";
import { isRangeFree, rangesOverlap, type BusyInterval } from "../api/_lib/availability.js";

test("rangesOverlap detecta solapamiento pero no rangos contiguos", () => {
  assert.equal(rangesOverlap(0, 100, 50, 150), true, "se cruzan");
  assert.equal(rangesOverlap(0, 100, 100, 200), false, "se tocan, no se cruzan");
  assert.equal(rangesOverlap(0, 100, 200, 300), false, "separados");
});

test("isRangeFree bloquea un horario ocupado", () => {
  const busy: BusyInterval[] = [{ id: "evt1", start: 1000, end: 2000 }];
  assert.equal(isRangeFree(busy, new Date(500).toISOString(), new Date(999).toISOString()), true);
  assert.equal(isRangeFree(busy, new Date(1500).toISOString(), new Date(2500).toISOString()), false);
});

test("isRangeFree ignora el propio evento al reprogramar", () => {
  const busy: BusyInterval[] = [{ id: "evt1", start: 1000, end: 2000 }];
  assert.equal(
    isRangeFree(busy, new Date(1500).toISOString(), new Date(2500).toISOString(), "evt1"),
    true,
    "una reserva no debe bloquearse a sí misma"
  );
});
