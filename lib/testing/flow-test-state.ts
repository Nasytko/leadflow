export type FlowNodeId = "facebook" | "orvix" | "processing" | "telegram";
export type FlowNodeState = "pending" | "success" | "failed";

export function resolveFlowTestState(input: {
  facebookLeadEventAt?: string | null;
  orvixLeadAt?: string | null;
  webhookLastError?: string | null;
  telegramTest?: "unknown" | "ok" | "fail";
}): Record<FlowNodeId, FlowNodeState> {
  const facebook: FlowNodeState = input.facebookLeadEventAt ? "success" : "pending";
  const orvix: FlowNodeState = input.orvixLeadAt ? "success" : "pending";
  const processing: FlowNodeState =
    input.webhookLastError ? "failed" : input.facebookLeadEventAt ? "success" : "pending";
  const telegram: FlowNodeState =
    input.telegramTest === "ok" ? "success" : input.telegramTest === "fail" ? "failed" : "pending";

  return { facebook, orvix, processing, telegram };
}

