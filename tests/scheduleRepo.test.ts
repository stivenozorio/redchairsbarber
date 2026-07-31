import { test } from "node:test";
import assert from "node:assert/strict";
import { getEffectiveHours } from "../api/_lib/scheduleRepo.js";
import { FALLBACK_CLOSE_MINUTES, FALLBACK_OPEN_MINUTES } from "../api/_lib/schedule.js";

// Sin SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (el caso de esta suite),
// getEffectiveHours debe caer al horario fijo histórico en vez de
// bloquear la reserva — el mismo principio de degradación que el resto
// de RED CLUB.

test("getEffectiveHours cae al horario fijo cuando Supabase no está configurado", async () => {
  const hours = await getEffectiveHours("camilo", "2026-08-10");
  assert.deepEqual(hours, { openMinutes: FALLBACK_OPEN_MINUTES, closeMinutes: FALLBACK_CLOSE_MINUTES });
});

test("getEffectiveHours no lanza para ningún barbero conocido", async () => {
  await assert.doesNotReject(() => getEffectiveHours("alejandro", "2026-12-25"));
});
