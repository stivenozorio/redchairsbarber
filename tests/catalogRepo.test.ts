import { test } from "node:test";
import assert from "node:assert/strict";
import { getActiveBarberIds, getActiveBarbers, getActiveServicesCatalog } from "../api/_lib/catalogRepo.js";
import { ALL_BOOKABLE_SERVICES } from "../src/data/services.js";

// Igual que scheduleRepo: sin Supabase configurado, el catálogo vivo debe
// caer al catálogo estático embebido, para que reservar nunca dependa de
// que la base esté disponible.

test("getActiveServicesCatalog cae al catálogo estático sin Supabase", async () => {
  const catalog = await getActiveServicesCatalog();
  assert.equal(catalog, ALL_BOOKABLE_SERVICES);
});

test("getActiveBarbers cae a los barberos estáticos (sin 'any') sin Supabase", async () => {
  const barbers = await getActiveBarbers();
  assert.deepEqual(
    barbers.map((b) => b.id).sort(),
    ["alejandro", "camilo"]
  );
});

test("getActiveBarberIds devuelve solo ids de barbero válidos", async () => {
  const ids = await getActiveBarberIds();
  assert.deepEqual(ids.slice().sort(), ["alejandro", "camilo"]);
});
