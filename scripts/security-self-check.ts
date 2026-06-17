/**
 * Security helpers self-check (no test runner required).
 * Run: npx tsx scripts/security-self-check.ts
 */
import {
  computeMetaWebhookSignature,
  verifyMetaWebhookSignature,
} from "../lib/meta-webhook-signature";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

const secret = "test-app-secret";
const body = JSON.stringify({ object: "page", entry: [] });
const signature = `sha256=${computeMetaWebhookSignature(body, secret)}`;

assert(
  verifyMetaWebhookSignature(body, signature, secret),
  "valid webhook signature accepted"
);
assert(
  !verifyMetaWebhookSignature(body, "sha256=deadbeef", secret),
  "invalid webhook signature rejected"
);
assert(
  !verifyMetaWebhookSignature(body, null, secret),
  "missing webhook signature rejected"
);

console.log("\nAll security self-checks passed.");
