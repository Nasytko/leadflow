import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveTelegramSetupState,
  mapTelegramErrorHint,
} from "../lib/connections/telegram-setup-state";

test("telegram setup: disconnected starts at botfather", () => {
  const s = resolveTelegramSetupState({
    status: "disconnected",
    hasChatId: false,
    verified: false,
  });
  assert.equal(s.currentStep, "botfather");
  assert.equal(s.isComplete, false);
});

test("telegram setup: connected without verified goes to test", () => {
  const s = resolveTelegramSetupState({
    status: "connected",
    hasChatId: true,
    verified: false,
  });
  assert.equal(s.currentStep, "test");
});

test("telegram setup: fully connected is complete", () => {
  const s = resolveTelegramSetupState({
    status: "connected",
    hasChatId: true,
    verified: true,
  });
  assert.equal(s.currentStep, "complete");
  assert.equal(s.isComplete, true);
});

test("mapTelegramErrorHint detects bot chat mistake", () => {
  assert.equal(
    mapTelegramErrorHint("Forbidden: the bot can't send messages to the bot"),
    "forbiddenBotChat"
  );
});
