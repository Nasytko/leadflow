import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getIntegrationSettingsPublic,
  saveIntegrationSettings,
  validateMetaCredentials,
} from "@/services/integration-settings.service";
import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  metaAppId: z.string().min(1),
  metaAppSecret: z.string().optional(),
  metaWebhookVerifyToken: z.string().optional(),
});

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const settings = await getIntegrationSettingsPublic(authResult.session.user.id);
  return apiSuccess({ settings });
}

export async function PATCH(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", "Invalid input");
  }

  try {
    await saveIntegrationSettings(authResult.session.user.id, parsed.data);

    await createAuditLog({
      userId: authResult.session.user.id,
      action: "integrations.save",
      ipAddress: getClientIp(request),
    });

    const settings = await getIntegrationSettingsPublic(authResult.session.user.id);
    return apiSuccess({ settings });
  } catch (error) {
    if (error instanceof Error && error.message === "META_APP_SECRET_REQUIRED") {
      return apiError("VALIDATION", "App Secret is required");
    }
    const message = error instanceof Error ? error.message : "Save failed";
    return apiError("SAVE_FAILED", message, 500);
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", "App ID required for test");
  }

  let appSecret = parsed.data.metaAppSecret;
  let appId = parsed.data.metaAppId;

  if (!appSecret) {
    const { getMetaCredentials } = await import(
      "@/services/integration-settings.service"
    );
    const creds = await getMetaCredentials(authResult.session.user.id);
    if (!creds?.appSecret) {
      return apiError("VALIDATION", "App Secret required");
    }
    appSecret = creds.appSecret;
    if (!appId) appId = creds.appId;
  }

  const result = await validateMetaCredentials(appId, appSecret);

  if (!result.valid) {
    return apiError("INVALID_CREDENTIALS", result.error ?? "Invalid", 400);
  }

  return apiSuccess({ valid: true, appName: result.appName });
}
