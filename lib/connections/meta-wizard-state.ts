/** Meta Center onboarding wizard step keys (API `/api/meta/center`). */

export type WizardStepKey =
  | "facebookAccount"
  | "businessPortfolio"
  | "adAccountSelected"
  | "pagesSelected"
  | "formsEnabled"
  | "webhookVerified"
  | "telegram"
  | "testLead"
  | "adAuditOpened";

export type WizardStepsState = Record<WizardStepKey, boolean>;
