import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFacebookHealth } from "../lib/connections/facebook-health";

const perfect = {
  connected: true,
  tokenInvalid: false,
  tokenExpired: false,
  connectedPagesCount: 2,
  totalPagesCount: 2,
  activeFormsCount: 3,
  webhookVerified: true,
  formsWithoutLeads: 0,
  pagesWithWebhookIssues: 0,
};

test("facebook health: perfect connection scores high", () => {
  const h = computeFacebookHealth(perfect);
  assert.ok(h.score >= 90);
  assert.equal(h.status, "healthy");
  assert.ok(h.checks.some((c) => c.id === "token" && c.status === "ok"));
  assert.ok(h.checks.some((c) => c.id === "webhook" && c.status === "ok"));
});

test("facebook health: expired token lowers score", () => {
  const h = computeFacebookHealth({ ...perfect, tokenExpired: true, tokenInvalid: true });
  assert.ok(h.score < 70);
  assert.equal(h.checks.find((c) => c.id === "token")?.status, "error");
});

test("facebook health: no active forms is warning", () => {
  const h = computeFacebookHealth({ ...perfect, activeFormsCount: 0 });
  assert.ok(h.checks.find((c) => c.id === "forms")?.status === "warning");
  assert.ok(h.score < 100);
});

test("facebook health: webhook missing is critical factor", () => {
  const h = computeFacebookHealth({ ...perfect, webhookVerified: false });
  assert.equal(h.checks.find((c) => c.id === "webhook")?.status, "error");
  assert.ok(h.score <= 85);
});

test("facebook health: not connected is zero", () => {
  const h = computeFacebookHealth({ ...perfect, connected: false });
  assert.equal(h.score, 0);
  assert.equal(h.status, "critical");
});
