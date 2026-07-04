export const TELEGRAM_SETUP_STEPS = [
  "botfather",
  "token",
  "chat",
  "test",
  "complete",
] as const;

export type TelegramSetupStepId = (typeof TELEGRAM_SETUP_STEPS)[number];

export type SetupStepStatus = "completed" | "current" | "pending" | "warning" | "error";

export type TelegramSetupInput = {
  status: string;
  hasChatId: boolean;
  verified: boolean;
  lastError?: string | null;
};

export type TelegramSetupState = {
  currentStep: TelegramSetupStepId;
  isComplete: boolean;
  stepStatuses: Record<TelegramSetupStepId, SetupStepStatus>;
  stepIndex: number;
  totalSteps: number;
};

function stepIndex(id: TelegramSetupStepId): number {
  return TELEGRAM_SETUP_STEPS.indexOf(id);
}

export function resolveTelegramSetupState(input: TelegramSetupInput): TelegramSetupState {
  const stepStatuses = {} as Record<TelegramSetupStepId, SetupStepStatus>;
  for (const id of TELEGRAM_SETUP_STEPS) {
    stepStatuses[id] = "pending";
  }

  let currentStep: TelegramSetupStepId = "botfather";
  const connected = input.status === "connected";
  const hasError = input.status === "error" || !!input.lastError;

  if (input.status === "disconnected") {
    currentStep = "botfather";
  } else if (!input.hasChatId) {
    currentStep = "chat";
    stepStatuses.botfather = "completed";
    stepStatuses.token = connected ? "completed" : "current";
    if (!connected) currentStep = "token";
  } else if (!input.verified || !connected) {
    currentStep = hasError ? "test" : "test";
    stepStatuses.botfather = "completed";
    stepStatuses.token = "completed";
    stepStatuses.chat = "completed";
    if (hasError) stepStatuses.test = "error";
  } else {
    currentStep = "complete";
    for (const id of TELEGRAM_SETUP_STEPS) {
      stepStatuses[id] = "completed";
    }
  }

  if (currentStep !== "complete") {
    stepStatuses[currentStep] =
      stepStatuses[currentStep] === "error" ? "error" : "current";
    for (const id of TELEGRAM_SETUP_STEPS) {
      if (stepIndex(id) < stepIndex(currentStep) && stepStatuses[id] !== "error") {
        if (stepStatuses[id] === "pending") stepStatuses[id] = "completed";
      }
    }
    stepStatuses.botfather = stepIndex(currentStep) > 0 ? "completed" : stepStatuses.botfather;
  }

  const isComplete = connected && input.hasChatId && input.verified;

  return {
    currentStep,
    isComplete,
    stepStatuses,
    stepIndex: stepIndex(currentStep),
    totalSteps: TELEGRAM_SETUP_STEPS.length,
  };
}

/** Map raw Telegram API errors to user-facing hints (i18n keys). */
export function mapTelegramErrorHint(message: string | null | undefined): string | null {
  if (!message) return null;
  const lower = message.toLowerCase();
  if (lower.includes("bot can't send messages to the bot") || lower.includes("403")) {
    return "forbiddenBotChat";
  }
  if (lower.includes("chat not found")) {
    return "chatNotFound";
  }
  if (lower.includes("blocked")) {
    return "botBlocked";
  }
  return null;
}
