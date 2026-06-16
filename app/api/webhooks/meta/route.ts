import { NextResponse } from "next/server";
import {
  verifyMetaWebhook,
  handleMetaWebhook,
  logWebhookVerification,
} from "@/services/webhook.service";
import { rateLimitByIp } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { writeSystemLog } from "@/lib/system-log";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;

  const result = await verifyMetaWebhook(mode, token, challenge);

  await logWebhookVerification({
    mode,
    token,
    challenge,
    success: !!result,
    ipAddress: ip,
    userAgent,
    errorMessage: result ? undefined : "Verification failed",
  });

  if (result) {
    return new NextResponse(result, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const limit = await rateLimitByIp(ip, 1000, 60);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const payload = await request.json();
    await handleMetaWebhook(payload, { sourceIp: ip, userAgent });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    console.error("Webhook error:", message);
    await writeSystemLog({
      level: "error",
      source: "webhook",
      action: "handler.failed",
      message,
      metadata: { ipAddress: ip },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
