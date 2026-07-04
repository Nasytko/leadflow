export const FACEBOOK_SETUP_STEPS = [
  "connect",
  "business",
  "pages",
  "forms",
  "webhook",
  "complete",
] as const;

export type FacebookSetupStepId = (typeof FACEBOOK_SETUP_STEPS)[number];

export type SetupStepStatus = "completed" | "current" | "pending" | "warning" | "error";

export type FacebookSetupInput = {
  connected: boolean;
  businessesCount: number;
  connectedPagesCount: number;
  totalPagesCount: number;
  activeFormsCount: number;
  webhookVerified: boolean;
  hasConnectionError?: boolean;
  pagesAccessMissing?: boolean;
};

export type FacebookSetupState = {
  currentStep: FacebookSetupStepId;
  isComplete: boolean;
  stepStatuses: Record<FacebookSetupStepId, SetupStepStatus>;
  stepIndex: number;
  totalSteps: number;
};

function stepIndex(id: FacebookSetupStepId): number {
  return FACEBOOK_SETUP_STEPS.indexOf(id);
}

export function resolveFacebookSetupState(input: FacebookSetupInput): FacebookSetupState {
  const stepStatuses = {} as Record<FacebookSetupStepId, SetupStepStatus>;
  for (const id of FACEBOOK_SETUP_STEPS) {
    stepStatuses[id] = "pending";
  }

  let currentStep: FacebookSetupStepId = "connect";

  if (!input.connected) {
    currentStep = "connect";
    if (input.hasConnectionError) stepStatuses.connect = "error";
  } else if (input.pagesAccessMissing || (input.businessesCount === 0 && input.totalPagesCount === 0)) {
    currentStep = "business";
    stepStatuses.connect = "completed";
    if (input.pagesAccessMissing) stepStatuses.business = "warning";
  } else if (input.connectedPagesCount === 0) {
    currentStep = "pages";
    stepStatuses.connect = "completed";
    stepStatuses.business = input.businessesCount > 0 ? "completed" : "warning";
  } else if (input.activeFormsCount === 0) {
    currentStep = "forms";
    stepStatuses.connect = "completed";
    stepStatuses.business = "completed";
    stepStatuses.pages = "completed";
  } else if (!input.webhookVerified) {
    currentStep = "webhook";
    stepStatuses.connect = "completed";
    stepStatuses.business = "completed";
    stepStatuses.pages = "completed";
    stepStatuses.forms = "completed";
  } else {
    currentStep = "complete";
    for (const id of FACEBOOK_SETUP_STEPS) {
      stepStatuses[id] = "completed";
    }
  }

  if (currentStep !== "complete") {
    stepStatuses[currentStep] = stepStatuses[currentStep] === "error" ? "error" : "current";
    for (const id of FACEBOOK_SETUP_STEPS) {
      if (stepIndex(id) < stepIndex(currentStep) && stepStatuses[id] !== "error") {
        stepStatuses[id] = "completed";
      }
    }
  }

  const isComplete =
    input.connected &&
    input.connectedPagesCount > 0 &&
    input.activeFormsCount > 0 &&
    input.webhookVerified;

  return {
    currentStep,
    isComplete,
    stepStatuses,
    stepIndex: stepIndex(currentStep),
    totalSteps: FACEBOOK_SETUP_STEPS.length,
  };
}
