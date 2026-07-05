import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTelegramHealth } from "../lib/connections/telegram-health";

test("telegram health: disconnected is zero", () => {
  const h = computeTelegramHealth({
    connected: false,
    hasChatId: false,
    verified: false,
    hasError: false,
  });
  assert.equal(h.score, 0);
  assert.equal(h.status, "critical");
});

test("telegram health: connected but not verified", () => {
  const h = computeTelegramHealth({
    connected: true,
    hasChatId: true,
    verified: false,
    hasError: false,
  });
  assert.ok(h.score < 80);
  assert.ok(h.checks.some((c) => c.id === "test"));
});

test("telegram health: fully ready", () => {
  const h = computeTelegramHealth({
    connected: true,
    hasChatId: true,
    verified: true,
    hasError: false,
  });
  assert.equal(h.status, "healthy");
  assert.equal(h.score, 100);
});
