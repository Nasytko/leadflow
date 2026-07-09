import test from "node:test";
import assert from "node:assert/strict";
import { resolveWebhookStatus } from "../lib/connections/webhook-status";

test("webhook status: missing token is not_configured", () => {
  const r = resolveWebhookStatus({ hasVerifyToken: false, verified: false });
  assert.equal(r.level, "not_configured");
});

test("webhook status: verified but no events is warning", () => {
  const r = resolveWebhookStatus({ hasVerifyToken: true, verified: true, lastLeadgenAt: null });
  assert.equal(r.level, "warning");
});

test("webhook status: last error is error", () => {
  const r = resolveWebhookStatus({ hasVerifyToken: true, verified: true, lastError: "boom" });
  assert.equal(r.level, "error");
});

test("webhook status: ready when verified and has event", () => {
  const r = resolveWebhookStatus({ hasVerifyToken: true, verified: true, lastLeadgenAt: new Date().toISOString() });
  assert.equal(r.level, "ready");
});

