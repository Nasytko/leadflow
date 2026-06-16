import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getLeadgenForms } from "@/services/facebook.service";
import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const forms = await prisma.facebookForm.findMany({
    where: { page: { userId: authResult.session.user.id } },
    include: { page: { select: { pageName: true, pageId: true } } },
    orderBy: { formName: "asc" },
  });

  return apiSuccess({
    forms: forms.map((f) => ({
      id: f.id,
      formId: f.formId,
      formName: f.formName,
      enabled: f.enabled,
      status: f.status,
      createdAt: f.createdAt,
      pageName: f.page.pageName,
      pageId: f.page.pageId,
    })),
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const pages = await prisma.facebookPage.findMany({
    where: { userId: authResult.session.user.id, connected: true },
  });

  let synced = 0;

  for (const page of pages) {
    const pageToken = decrypt(page.pageAccessTokenEncrypted);
    const { data: forms } = await getLeadgenForms(page.pageId, pageToken);

    for (const form of forms) {
      await prisma.facebookForm.upsert({
        where: {
          pageId_formId: { pageId: page.id, formId: form.id },
        },
        create: {
          pageId: page.id,
          formId: form.id,
          formName: form.name,
          status: form.status,
          enabled: false,
        },
        update: {
          formName: form.name,
          status: form.status,
        },
      });
      synced++;
    }
  }

  return apiSuccess({ synced });
}
