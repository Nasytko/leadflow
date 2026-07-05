import { test } from "node:test";
import assert from "node:assert/strict";
import { getFacebookActionDisabledReason } from "../lib/connections/facebook-actions";
import { mapFacebookSyncErrorMessage } from "../lib/connections/action-errors";

const ctx = {
  connected: true,
  totalPagesCount: 2,
  totalFormsCount: 3,
  activeFormsCount: 1,
};

test("sync error: CSRF maps to session expired message", () => {
  const msg = mapFacebookSyncErrorMessage(
    { code: "CSRF_INVALID" },
    (k) => `t:${k}`
  );
  assert.equal(msg, "t:errors.sessionExpired");
});

test("sync error: falls back to API message", () => {
  const msg = mapFacebookSyncErrorMessage(
    { code: "UNKNOWN", message: "Custom error" },
    (k) => k
  );
  assert.equal(msg, "Custom error");
});

test("action disabled: import when no enabled forms", () => {
  assert.equal(
    getFacebookActionDisabledReason("importLeads", { ...ctx, activeFormsCount: 0 }),
    "noEnabledForms"
  );
});

test("action disabled: sync forms when no pages", () => {
  assert.equal(
    getFacebookActionDisabledReason("syncForms", { ...ctx, totalPagesCount: 0 }),
    "syncPagesFirst"
  );
});

test("action disabled: reconnect always allowed", () => {
  assert.equal(
    getFacebookActionDisabledReason("reconnect", { ...ctx, connected: false }),
    null
  );
});
