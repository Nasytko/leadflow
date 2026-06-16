import { NextResponse } from "next/server";
import { verifyMetaWebhook, handleMetaWebhook } from "@/services/webhook.service";
import { rateLimitByIp } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const result = await verifyMetaWebhook(mode, token, challenge);
  if (result) {
    return new NextResponse(result, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = await rateLimitByIp(ip, 1000, 60);
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const payload = await request.json();
    await handleMetaWebhook(payload);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ success: true });
  }
}
