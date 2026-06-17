import crypto from "crypto";
import { isProduction } from "@/lib/env";

const SIGNATURE_PREFIX = "sha256=";

export function isWebhookSignatureRequired(): boolean {
  const env = process.env.META_WEBHOOK_SIGNATURE_REQUIRED?.toLowerCase();
  if (env === "true") return true;
  if (env === "false") return false;
  return isProduction();
}

export function computeMetaWebhookSignature(
  rawBody: string,
  appSecret: string
): string {
  return crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
}

export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith(SIGNATURE_PREFIX)) return false;
  const received = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const expected = computeMetaWebhookSignature(rawBody, appSecret);
  if (received.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(received, "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    return false;
  }
}
