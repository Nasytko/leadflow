#!/usr/bin/env tsx
import {
  getMetaAppIdForOAuth,
  getMetaAppSecretForOAuth,
  getValidMetaLoginConfigId,
  isSaasDeployment,
} from "../lib/meta-platform-credentials";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

const prevMode = process.env.DEPLOYMENT_MODE;
const prevAppId = process.env.META_APP_ID;
const prevSecret = process.env.META_APP_SECRET;
const prevConfig = process.env.META_LOGIN_CONFIG_ID;

process.env.META_APP_ID = "1543348640634245";
process.env.META_APP_SECRET = "env-secret-value";
process.env.META_LOGIN_CONFIG_ID = "1045043297861606";

// --- valid login config ---
assert(
  getValidMetaLoginConfigId({ dbRawValue: "1045043297861606" }).valid === true,
  "valid login config id accepted"
);

// --- email rejected ---
const emailRes = getValidMetaLoginConfigId({ dbRawValue: "paulnasytko@gmail.com" });
assert(emailRes.value === "1045043297861606", "email config id rejected, env used");
assert(emailRes.ignoredLegacyValue === "paulnasytko@gmail.com", "email stored as ignored legacy");

// --- SaaS env overrides DB secret ---
process.env.DEPLOYMENT_MODE = "saas";
const saasSecret = getMetaAppSecretForOAuth("encrypted-db-secret");
assert(saasSecret.value === "env-secret-value", "SaaS env overrides DB secret");
assert(saasSecret.dbIgnoredInSaas === true, "DB secret flagged as ignored in SaaS");
assert(saasSecret.source === "env", "active source is env in SaaS");

// --- SaaS env overrides DB app id ---
const saasAppId = getMetaAppIdForOAuth("1543348640634245");
assert(saasAppId.source === "env", "SaaS app id from env");
assert(saasAppId.dbIgnoredInSaas === true, "DB app id ignored in SaaS");

// --- SaaS login config from env only ---
const saasConfig = getValidMetaLoginConfigId({
  dbRawValue: "paulnasytko@gmail.com",
});
assert(saasConfig.source === "env", "SaaS login config source env");
assert(saasConfig.value === "1045043297861606", "SaaS uses env config id");

// --- self_hosted DB can override ---
process.env.DEPLOYMENT_MODE = "self_hosted";
const selfSecret = getMetaAppSecretForOAuth(undefined);
assert(selfSecret.source === "env", "self_hosted falls back to env without DB");

process.env.DEPLOYMENT_MODE = prevMode ?? "saas";
if (prevAppId !== undefined) process.env.META_APP_ID = prevAppId;
else delete process.env.META_APP_ID;
if (prevSecret !== undefined) process.env.META_APP_SECRET = prevSecret;
else delete process.env.META_APP_SECRET;
if (prevConfig !== undefined) process.env.META_LOGIN_CONFIG_ID = prevConfig;
else delete process.env.META_LOGIN_CONFIG_ID;

console.log("\nAll meta credentials self-checks passed.");
