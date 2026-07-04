import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveFacebookSetupState } from "../lib/connections/facebook-setup-state";

test("facebook setup: not connected starts at connect", () => {
  const s = resolveFacebookSetupState({
    connected: false,
    businessesCount: 0,
    connectedPagesCount: 0,
    totalPagesCount: 0,
    activeFormsCount: 0,
    webhookVerified: false,
  });
  assert.equal(s.currentStep, "connect");
  assert.equal(s.isComplete, false);
});

test("facebook setup: connected without pages goes to pages", () => {
  const s = resolveFacebookSetupState({
    connected: true,
    businessesCount: 1,
    connectedPagesCount: 0,
    totalPagesCount: 2,
    activeFormsCount: 0,
    webhookVerified: false,
  });
  assert.equal(s.currentStep, "pages");
});

test("facebook setup: pages without forms goes to forms", () => {
  const s = resolveFacebookSetupState({
    connected: true,
    businessesCount: 1,
    connectedPagesCount: 2,
    totalPagesCount: 2,
    activeFormsCount: 0,
    webhookVerified: false,
  });
  assert.equal(s.currentStep, "forms");
});

test("facebook setup: forms without webhook goes to webhook", () => {
  const s = resolveFacebookSetupState({
    connected: true,
    businessesCount: 1,
    connectedPagesCount: 2,
    totalPagesCount: 2,
    activeFormsCount: 3,
    webhookVerified: false,
  });
  assert.equal(s.currentStep, "webhook");
});

test("facebook setup: all ready is complete", () => {
  const s = resolveFacebookSetupState({
    connected: true,
    businessesCount: 1,
    connectedPagesCount: 2,
    totalPagesCount: 2,
    activeFormsCount: 3,
    webhookVerified: true,
  });
  assert.equal(s.currentStep, "complete");
  assert.equal(s.isComplete, true);
});
