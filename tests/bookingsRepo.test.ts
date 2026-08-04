import { test } from "node:test";
import assert from "node:assert/strict";
import { LOCKED_BOOKING_STATUSES } from "../api/_lib/bookingsRepo.js";

test("LOCKED_BOOKING_STATUSES bloquea exactamente los estados que ya no se pueden tocar", () => {
  assert.deepEqual(
    [...LOCKED_BOOKING_STATUSES].sort(),
    ["cancelled", "completed", "in_progress", "no_show"].sort()
  );
});

test("LOCKED_BOOKING_STATUSES no incluye los estados en los que sí se puede cancelar/reprogramar", () => {
  // pending/confirmed son justamente los que BookingCard.tsx (Mi cuenta)
  // deja reagendar o cancelar — si alguno apareciera aquí por error, el
  // cliente perdería la posibilidad de tocar una cita que sí puede tocar.
  assert.ok(!LOCKED_BOOKING_STATUSES.includes("pending"));
  assert.ok(!LOCKED_BOOKING_STATUSES.includes("confirmed"));
});
