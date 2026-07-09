import test from "node:test";
import assert from "node:assert/strict";
import { resolveFlowTestState } from "../lib/testing/flow-test-state";

test("flow state: all pending initially", () => {
  const r = resolveFlowTestState({ telegramTest: "unknown" });
  assert.deepEqual(r, { facebook: "pending", orvix: "pending", processing: "pending", telegram: "pending" });
});

test("flow state: processing fails when webhook error exists", () => {
  const r = resolveFlowTestState({
    facebookLeadEventAt: new Date().toISOString(),
    webhookLastError: "invalid signature",
    telegramTest: "unknown",
  });
  assert.equal(r.processing, "failed");
});

test("flow state: telegram reflects test result", () => {
  const r1 = resolveFlowTestState({ telegramTest: "ok" });
  const r2 = resolveFlowTestState({ telegramTest: "fail" });
  assert.equal(r1.telegram, "success");
  assert.equal(r2.telegram, "failed");
});

