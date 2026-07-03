import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeMetaWebhookSignature,
  verifyMetaWebhookSignature,
} from "../lib/meta-webhook-signature";

const secret = "test-meta-app-secret";
const body = JSON.stringify({ object: "page", entry: [] });

test("accepts valid X-Hub-Signature-256", () => {
  const signature = `sha256=${computeMetaWebhookSignature(body, secret)}`;
  assert.equal(verifyMetaWebhookSignature(body, signature, secret), true);
});

test("rejects invalid signature", () => {
  assert.equal(
    verifyMetaWebhookSignature(body, "sha256=deadbeef", secret),
    false
  );
});

test("rejects missing signature header", () => {
  assert.equal(verifyMetaWebhookSignature(body, null, secret), false);
});

test("rejects signature without sha256= prefix", () => {
  const hex = computeMetaWebhookSignature(body, secret);
  assert.equal(verifyMetaWebhookSignature(body, hex, secret), false);
});
