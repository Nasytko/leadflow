#!/usr/bin/env tsx
/**
 * Clears legacy integration_settings Meta platform overrides in SaaS mode.
 * Safe: does not touch facebook_connections, pages, forms, or leads.
 */
import { cleanupLegacyMetaSettingsInDb, isSaasDeployment } from "../lib/meta-platform-credentials";
import { getDeploymentMode } from "../lib/deployment";

async function main() {
  console.log(`DEPLOYMENT_MODE=${getDeploymentMode()}`);

  if (!isSaasDeployment()) {
    console.log(
      "Skipped: not SaaS mode (set DEPLOYMENT_MODE=saas or remove SHOW_ADVANCED_META_SETTINGS)."
    );
    process.exit(0);
  }

  const result = await cleanupLegacyMetaSettingsInDb();
  console.log("Legacy Meta settings cleanup complete:");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
