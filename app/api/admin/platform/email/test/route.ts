import { z } from "zod";
import {
  requireAdmin,
  checkRateLimit,
  apiSuccess,
  apiError,
  requireCsrf,
} from "@/lib/api-helpers";
import { testPlatformEmail } from "@/services/admin/admin-email.service";
import { logAdminAction } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  to: z.string().email(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;
  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Valid email required");

  try {
    const result = await testPlatformEmail(parsed.data.to);
    await logAdminAction({
      adminUserId: auth.session.user.id,
      action: "email_test_sent",
      metadata: { to: parsed.data.to },
      request,
    });
    return apiSuccess(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    await prisma.platformEmailSettings.updateMany({
      where: { id: "platform" },
      data: { lastError: message, lastErrorAt: new Date() },
    });
    await logAdminAction({
      adminUserId: auth.session.user.id,
      action: "email_test_failed",
      metadata: { error: message },
      request,
    });
    return apiError("SEND_FAILED", message, 500);
  }
}
