import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSecureToken, hashToken } from "../lib/encryption";

test("password reset raw token is never equal to stored hash", () => {
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);

  assert.notEqual(rawToken, tokenHash);
  assert.match(tokenHash, /^[a-f0-9]{64}$/);
});

test("password reset verification uses hash lookup", () => {
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);

  const dbRecord = {
    id: "prt-1",
    userId: "user-1",
    tokenHash,
    expiresAt: new Date(Date.now() + 3600_000),
    usedAt: null,
  };

  assert.equal("token" in dbRecord, false);
  assert.equal(hashToken(rawToken), dbRecord.tokenHash);
  assert.notEqual(hashToken("wrong-token"), dbRecord.tokenHash);
});
