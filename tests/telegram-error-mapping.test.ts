import test from "node:test";
import assert from "node:assert/strict";
import { mapTelegramDiagnostic } from "../lib/connections/telegram-diagnostics";

test("telegram diagnostics: maps token invalid", () => {
  assert.deepEqual(mapTelegramDiagnostic("401 Unauthorized: invalid token"), { kind: "token_invalid" });
});

test("telegram diagnostics: maps chat not found", () => {
  assert.deepEqual(mapTelegramDiagnostic("400 Bad Request: chat not found"), { kind: "chat_not_found" });
});

test("telegram diagnostics: maps forbidden", () => {
  assert.deepEqual(mapTelegramDiagnostic("403 Forbidden: bot was blocked by the user"), { kind: "forbidden" });
  assert.deepEqual(mapTelegramDiagnostic("403 Forbidden: bot can't send messages to the bot"), { kind: "forbidden" });
});

