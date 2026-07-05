import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveFacebookNextSteps } from "../lib/connections/facebook-next-steps";

const ready = {
  connected: true,
  totalPagesCount: 2,
  connectedPagesCount: 2,
  totalFormsCount: 3,
  activeFormsCount: 2,
  webhookVerified: true,
  telegramConnected: true,
};

test("next steps: not connected suggests connect", () => {
  const r = resolveFacebookNextSteps({ ...ready, connected: false });
  assert.equal(r.steps[0]?.id, "connect");
  assert.equal(r.allSet, false);
});

test("next steps: no pages suggests sync pages", () => {
  const r = resolveFacebookNextSteps({
    ...ready,
    totalPagesCount: 0,
    connectedPagesCount: 0,
  });
  assert.ok(r.steps.some((s) => s.id === "syncPages"));
});

test("next steps: no enabled forms suggests enable", () => {
  const r = resolveFacebookNextSteps({
    ...ready,
    activeFormsCount: 0,
    totalFormsCount: 2,
  });
  assert.ok(r.steps.some((s) => s.id === "enableForms"));
});

test("next steps: webhook missing when forms enabled", () => {
  const r = resolveFacebookNextSteps({ ...ready, webhookVerified: false });
  assert.ok(r.steps.some((s) => s.id === "verifyWebhook"));
});

test("next steps: all ready", () => {
  const r = resolveFacebookNextSteps(ready);
  assert.equal(r.allSet, true);
  assert.equal(r.steps.length, 0);
});
