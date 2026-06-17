import { FB_OAUTH_SCOPES } from "@/services/facebook-auth.service";

export const FACEBOOK_DIAGNOSES = [
  "fully_connected",
  "connected_profile_only",
  "missing_pages_show_list",
  "missing_business_assets",
  "no_pages_available",
  "token_invalid",
  "disconnected",
] as const;

export type FacebookDiagnosis = (typeof FACEBOOK_DIAGNOSES)[number];

export const FACEBOOK_UI_STATUSES = [
  "disconnected",
  "profile_connected",
  "permissions_missing",
  "pages_missing",
  "fully_connected",
  "error",
] as const;

export type FacebookUiStatus = (typeof FACEBOOK_UI_STATUSES)[number];

export type GranularScope = { scope: string; target_ids?: string[] };

export type DiagnosisInput = {
  hasToken: boolean;
  connectionStatus: string;
  grantedScopes: string[];
  granularScopes?: GranularScope[];
  pagesCount: number;
  hasLoginConfigId: boolean;
  profilePresent?: boolean;
};

const PAGE_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "leads_retrieval",
  "pages_manage_ads",
] as const;

export function computeFacebookDiagnosis(input: DiagnosisInput): FacebookDiagnosis {
  const {
    hasToken,
    connectionStatus,
    grantedScopes,
    pagesCount,
    hasLoginConfigId,
    profilePresent,
  } = input;

  if (!hasToken || connectionStatus === "disconnected") {
    return "disconnected";
  }

  if (
    connectionStatus === "invalid" ||
    connectionStatus === "expired" ||
    !profilePresent
  ) {
    return "token_invalid";
  }

  if (pagesCount > 0) {
    return "fully_connected";
  }

  const scopeSet = new Set(grantedScopes.map((s) => s.toLowerCase()));

  if (!scopeSet.has("pages_show_list")) {
    return "missing_pages_show_list";
  }

  if (!hasLoginConfigId || !scopeSet.has("business_management")) {
    return "missing_business_assets";
  }

  const hasGranularPages = (input.granularScopes ?? []).some(
    (g) =>
      PAGE_SCOPES.includes(g.scope as (typeof PAGE_SCOPES)[number]) &&
      (g.target_ids?.length ?? 0) > 0
  );

  if (!hasGranularPages && pagesCount === 0) {
    return "no_pages_available";
  }

  return "connected_profile_only";
}

export function mapDiagnosisToUiStatus(
  diagnosis: FacebookDiagnosis,
  connectionStatus: string
): FacebookUiStatus {
  if (diagnosis === "fully_connected") return "fully_connected";
  if (diagnosis === "disconnected") return "disconnected";
  if (diagnosis === "token_invalid" || connectionStatus === "error") {
    return "error";
  }
  if (
    diagnosis === "missing_pages_show_list" ||
    diagnosis === "missing_business_assets"
  ) {
    return "permissions_missing";
  }
  if (
    diagnosis === "no_pages_available" ||
    diagnosis === "connected_profile_only"
  ) {
    return "pages_missing";
  }
  if (connectionStatus === "pending_pages") return "pages_missing";
  if (connectionStatus === "connected") return "fully_connected";
  return "profile_connected";
}

export function facebookUiStatusBadgeVariant(
  uiStatus: FacebookUiStatus
): "success" | "destructive" | "secondary" | "warning" {
  if (uiStatus === "fully_connected") return "success";
  if (uiStatus === "error") return "destructive";
  if (uiStatus === "permissions_missing" || uiStatus === "pages_missing") {
    return "warning";
  }
  if (uiStatus === "profile_connected") return "warning";
  return "secondary";
}

export function getMissingScopes(grantedScopes: string[]): string[] {
  const granted = new Set(grantedScopes.map((s) => s.toLowerCase()));
  return FB_OAUTH_SCOPES.filter((s) => !granted.has(s.toLowerCase()));
}

export type WizardSteps = {
  facebookAccount: boolean;
  businessPortfolio: boolean;
  pagesSelected: boolean;
  formsEnabled: boolean;
  webhookVerified: boolean;
  telegram: boolean;
  testLead: boolean;
};

export function buildWizardSteps(input: {
  hasFacebookProfile: boolean;
  businessesCount: number;
  connectedPagesCount: number;
  activeFormsCount: number;
  telegramConnected: boolean;
  webhookVerified: boolean;
  leadsCount?: number;
}): WizardSteps {
  return {
    facebookAccount: input.hasFacebookProfile,
    businessPortfolio: input.businessesCount > 0,
    pagesSelected: input.connectedPagesCount > 0,
    formsEnabled: input.activeFormsCount > 0,
    webhookVerified: input.webhookVerified,
    telegram: input.telegramConnected,
    testLead:
      (input.leadsCount ?? 0) > 0 ||
      (input.webhookVerified && input.activeFormsCount > 0),
  };
}
