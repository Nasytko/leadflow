#!/usr/bin/env tsx
/**
 * Pre-deploy env validation. Run on production host before/after deploy.
 * Does not print secret values.
 */
import { getDeploymentMode } from "../lib/deployment";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

function present(name: string): boolean {
  const v = process.env[name]?.trim();
  return !!v && !v.startsWith("your-");
}

const mode = getDeploymentMode();
assert(mode === "saas" || mode === "self_hosted", `DEPLOYMENT_MODE=${mode}`);

assert(present("DATABASE_URL"), "DATABASE_URL set");
assert(present("REDIS_URL"), "REDIS_URL set");
assert(present("NEXTAUTH_URL"), "NEXTAUTH_URL set");
assert(present("NEXTAUTH_SECRET"), "NEXTAUTH_SECRET set");
assert(present("ENCRYPTION_KEY"), "ENCRYPTION_KEY set");

const encKey = process.env.ENCRYPTION_KEY?.trim() ?? "";
assert(encKey.length === 64 && /^[0-9a-f]+$/i.test(encKey), "ENCRYPTION_KEY is 64 hex chars");

assert(present("META_APP_ID"), "META_APP_ID set");
assert(present("META_APP_SECRET"), "META_APP_SECRET set");
assert(present("FACEBOOK_REDIRECT_URI"), "FACEBOOK_REDIRECT_URI set");
assert(present("META_WEBHOOK_VERIFY_TOKEN"), "META_WEBHOOK_VERIFY_TOKEN set");

if (mode === "saas") {
  const configId = process.env.META_LOGIN_CONFIG_ID ?? process.env.FACEBOOK_LOGIN_CONFIG_ID ?? "";
  assert(/^\d{5,20}$/.test(configId.trim()), "META_LOGIN_CONFIG_ID is numeric 5–20 digits");
  assert(!configId.includes("@"), "META_LOGIN_CONFIG_ID is not an email");
}

if (process.env.NODE_ENV === "production") {
  assert(
    process.env.META_WEBHOOK_SIGNATURE_REQUIRED?.toLowerCase() !== "false",
    "META_WEBHOOK_SIGNATURE_REQUIRED is not disabled in production"
  );
}

console.log("\nProduction readiness checks passed.");
