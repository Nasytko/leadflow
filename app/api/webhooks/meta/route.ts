import { NextResponse } from "next/server";
import {
  verifyMetaWebhook,
  handleMetaWebhook,
  logWebhookVerification,
  logWebhookSignatureFailure,
} from "@/services/webhook.service";
import { rateLimitByIp } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { writeSystemLog } from "@/lib/system-log";
import {
  isWebhookSignatureRequired,
  verifyMetaWebhookSignature,
} from "@/lib/meta-webhook-signature";
import { getWebhookAppSecret } from "@/lib/webhook-app-secret";

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = await rateLimitByIp(ip, 30, 60);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
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

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-hub-signature-256");

  if (isWebhookSignatureRequired()) {
    const appSecret = await getWebhookAppSecret();
    if (!appSecret) {
      await writeSystemLog({
        level: "error",
        source: "webhook",
        action: "signature.misconfigured",
        message: "Webhook signature required but META_APP_SECRET is not configured",
        metadata: { ipAddress: ip },
      });
      return NextResponse.json(
        { error: "Webhook signature verification not configured" },
        { status: 503 }
      );
    }

    const valid = verifyMetaWebhookSignature(
      rawBody,
      signatureHeader,
      appSecret
    );

    if (!valid) {
      await logWebhookSignatureFailure({
        sourceIp: ip,
        userAgent,
        reason: signatureHeader ? "invalid_signature" : "missing_signature",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const payload = JSON.parse(rawBody) as {
      object: string;
      entry: Array<{
        id: string;
        time: number;
        changes: Array<{
          field: string;
          value: {
            leadgen_id: string;
            page_id: string;
            form_id: string;
            created_time: number;
          };
        }>;
      }>;
    };
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
