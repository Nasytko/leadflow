import type { FacebookActionContext, FacebookActionId } from "./facebook-sync-errors";

export type { FacebookActionContext, FacebookActionId };

export function getFacebookActionDisabledReason(
  action: FacebookActionId,
  ctx: FacebookActionContext
): string | null {
  if (action === "reconnect") return null;

  if (!ctx.connected || ctx.facebookBroken || ctx.tokenInvalid) {
    if (action === "disconnect") return null;
    return "notConnected";
  }

  if (action === "importLeads") {
    if (ctx.activeFormsCount === 0) {
      return ctx.totalFormsCount === 0 ? "noFormsSynced" : "noEnabledForms";
    }
  }

  if (action === "syncForms" && ctx.totalPagesCount === 0) {
    return "syncPagesFirst";
  }

  if (action === "testLead" && ctx.activeFormsCount === 0) {
    return ctx.totalFormsCount === 0 ? "noFormsSynced" : "noEnabledForms";
  }

  return null;
}
