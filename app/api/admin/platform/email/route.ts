import { z } from "zod";
import {
  requireAdmin,
  checkRateLimit,
  apiSuccess,
  apiError,
  requireCsrf,
} from "@/lib/api-helpers";
import {
  getPlatformEmailSettings,
  updatePlatformEmailSettings,
  getEmailStats,
} from "@/services/admin/admin-email.service";
import { logAdminAction } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;

  const [settings, stats] = await Promise.all([
    getPlatformEmailSettings(),
    getEmailStats(),
  ]);

  return apiSuccess({ settings, stats });
}

const patchSchema = z.object({
  provider: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpSecure: z.boolean().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional().or(z.literal("")),
  replyToEmail: z.string().email().optional().or(z.literal("")),
  enabled: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;
  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid input");

  await updatePlatformEmailSettings(parsed.data);
  await logAdminAction({
    adminUserId: auth.session.user.id,
    action: "email_settings_updated",
    request,
  });

  const settings = await getPlatformEmailSettings();
  return apiSuccess({ settings });
}
