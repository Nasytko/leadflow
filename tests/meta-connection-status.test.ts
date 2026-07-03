import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveMetaConnectionStatus,
  resolveTokenStatus,
} from "../lib/meta/meta-connection-status";

test("resolveMetaConnectionStatus returns not_connected when disconnected", () => {
  const result = resolveMetaConnectionStatus({
    hasConnection: false,
    connectionStatus: "disconnected",
  });
  assert.equal(result.status, "not_connected");
  assert.equal(result.severity, "unknown");
});

test("resolveMetaConnectionStatus returns connected for fully_connected", () => {
  const result = resolveMetaConnectionStatus({
    hasConnection: true,
    connectionStatus: "connected",
    uiStatus: "fully_connected",
  });
  assert.equal(result.status, "connected");
  assert.equal(result.severity, "ok");
});

test("resolveMetaConnectionStatus returns needs_reconnect for pending_pages", () => {
  const result = resolveMetaConnectionStatus({
    hasConnection: true,
    connectionStatus: "pending_pages",
    uiStatus: "pages_missing",
  });
  assert.equal(result.status, "needs_reconnect");
  assert.equal(result.severity, "warning");
});

test("resolveMetaConnectionStatus returns expired when token date passed", () => {
  const result = resolveMetaConnectionStatus({
    hasConnection: true,
    connectionStatus: "connected",
    uiStatus: "fully_connected",
    tokenExpiresAt: new Date(Date.now() - 60_000),
  });
  assert.equal(result.status, "expired");
});

test("resolveTokenStatus warns when token expires within 14 days", () => {
  const result = resolveTokenStatus({
    tokenExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  });
  assert.equal(result.status, "needs_reconnect");
  assert.equal(result.severity, "warning");
});

test("resolveTokenStatus returns valid for distant expiry", () => {
  const result = resolveTokenStatus({
    tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  });
  assert.equal(result.status, "connected");
  assert.equal(result.severity, "ok");
});
