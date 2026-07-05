export type FacebookNextStepId =
  | "connect"
  | "syncPages"
  | "syncForms"
  | "enableForms"
  | "verifyWebhook"
  | "connectTelegram"
  | "importLeads";

export type FacebookNextStep = {
  id: FacebookNextStepId;
  messageKey: string;
  href: string;
};

export type FacebookNextStepsInput = {
  connected: boolean;
  totalPagesCount: number;
  connectedPagesCount: number;
  totalFormsCount: number;
  activeFormsCount: number;
  webhookVerified: boolean;
  telegramConnected: boolean;
};

export type FacebookNextStepsResult = {
  steps: FacebookNextStep[];
  allSet: boolean;
};

const STEP_DEFS: Record<
  FacebookNextStepId,
  { messageKey: string; href: string; order: number }
> = {
  connect: { messageKey: "connect", href: "/connections/facebook?step=connect", order: 1 },
  syncPages: { messageKey: "syncPages", href: "/connections/facebook", order: 2 },
  syncForms: { messageKey: "syncForms", href: "/connections/facebook", order: 3 },
  enableForms: { messageKey: "enableForms", href: "/connections/facebook", order: 4 },
  verifyWebhook: {
    messageKey: "verifyWebhook",
    href: "/connections/facebook?step=webhook",
    order: 5,
  },
  connectTelegram: { messageKey: "connectTelegram", href: "/connections/telegram", order: 6 },
  importLeads: { messageKey: "importLeads", href: "/connections/facebook#import-leads", order: 7 },
};

export function resolveFacebookNextSteps(
  input: FacebookNextStepsInput
): FacebookNextStepsResult {
  const pending: FacebookNextStep[] = [];

  if (!input.connected) {
    pending.push({ id: "connect", ...pick("connect") });
    return { steps: pending, allSet: false };
  }

  if (input.totalPagesCount === 0) {
    pending.push({ id: "syncPages", ...pick("syncPages") });
  } else if (input.connectedPagesCount === 0) {
    pending.push({ id: "syncPages", ...pick("syncPages") });
  }

  if (input.totalFormsCount === 0) {
    pending.push({ id: "syncForms", ...pick("syncForms") });
  } else if (input.activeFormsCount === 0) {
    pending.push({ id: "enableForms", ...pick("enableForms") });
  }

  if (!input.webhookVerified && input.activeFormsCount > 0) {
    pending.push({ id: "verifyWebhook", ...pick("verifyWebhook") });
  }

  if (!input.telegramConnected) {
    pending.push({ id: "connectTelegram", ...pick("connectTelegram") });
  }

  if (input.activeFormsCount > 0 && input.webhookVerified) {
    pending.push({ id: "importLeads", ...pick("importLeads") });
  }

  const allSet =
    input.connected &&
    input.connectedPagesCount > 0 &&
    input.activeFormsCount > 0 &&
    input.webhookVerified &&
    input.telegramConnected;

  if (allSet) {
    return { steps: [], allSet: true };
  }

  pending.sort((a, b) => STEP_DEFS[a.id].order - STEP_DEFS[b.id].order);

  return { steps: pending.slice(0, 3), allSet: false };
}

function pick(id: FacebookNextStepId): { messageKey: string; href: string } {
  const def = STEP_DEFS[id];
  return { messageKey: def.messageKey, href: def.href };
}
