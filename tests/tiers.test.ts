import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TIER_CARD_CLASS,
  TIER_FALLBACK,
  TIER_TEXT_CLASS,
  TIER_THRESHOLDS,
  visitsToNextTier,
} from "../src/data/tiers.js";

test("TIER_FALLBACK tiene estilos definidos", () => {
  assert.ok(TIER_CARD_CLASS[TIER_FALLBACK]);
  assert.ok(TIER_TEXT_CLASS[TIER_FALLBACK]);
});

test("todos los niveles sembrados tienen estilo de tarjeta y de texto", () => {
  for (const { id } of TIER_THRESHOLDS) {
    assert.ok(TIER_CARD_CLASS[id], `Falta TIER_CARD_CLASS para ${id}`);
    assert.ok(TIER_TEXT_CLASS[id], `Falta TIER_TEXT_CLASS para ${id}`);
  }
});

test("visitsToNextTier calcula cuántas visitas faltan", () => {
  assert.equal(visitsToNextTier(0), 5);
  assert.equal(visitsToNextTier(4), 1);
  assert.equal(visitsToNextTier(5), 10);
  assert.equal(visitsToNextTier(14), 1);
  assert.equal(visitsToNextTier(29), 1);
});

test("visitsToNextTier devuelve null en el nivel más alto (LEGEND no tiene techo)", () => {
  assert.equal(visitsToNextTier(30), null);
  assert.equal(visitsToNextTier(999), null);
});
