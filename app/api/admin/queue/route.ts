import { requireAdmin, checkRateLimit, apiSuccess, requireCsrf } from "@/lib/api-helpers";
import {
  getQueueHealth,
  retryFailedJobs,
  retryFailedJob,
} from "@/services/admin/admin-platform-health.service";
import { logAdminAction } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;
  return apiSuccess(await getQueueHealth());
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;
  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const jobId = typeof body.jobId === "string" ? body.jobId : null;

  if (jobId) {
    await retryFailedJob(jobId);
    await logAdminAction({
      adminUserId: auth.session.user.id,
      action: "queue_job_retry",
      resource: jobId,
      request,
    });
    return apiSuccess({ retried: 1 });
  }

  const result = await retryFailedJobs();
  await logAdminAction({
    adminUserId: auth.session.user.id,
    action: "queue_retry_all",
    metadata: result,
    request,
  });
  return apiSuccess(result);
}
