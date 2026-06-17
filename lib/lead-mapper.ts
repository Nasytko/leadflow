import type { Lead, FacebookForm, FacebookPage, FacebookBusiness } from "@prisma/client";

type LeadWithRelations = Lead & {
  form?: (FacebookForm & {
    page?: (FacebookPage & { business?: FacebookBusiness | null }) | null;
  }) | null;
};

export function extractAdFields(fields: Record<string, string>) {
  const lower = Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k.toLowerCase(), v])
  );
  return {
    campaignName:
      lower.campaign_name ?? lower.campaign ?? lower["название кампании"] ?? null,
    adsetName: lower.adset_name ?? lower.adset ?? lower["группа объявлений"] ?? null,
    adName: lower.ad_name ?? lower.ad ?? lower["объявление"] ?? null,
  };
}

export function mapLeadPublic(lead: LeadWithRelations) {
  const page = lead.form?.page;
  const business = page?.business;

  return {
    id: lead.id,
    leadgenId: lead.leadgenId,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    status: lead.status,
    crmStatus: lead.crmStatus,
    telegramStatus: lead.telegramStatus,
    source: lead.source,
    managerNote: lead.managerNote,
    campaignName: lead.campaignName,
    adsetName: lead.adsetName,
    adName: lead.adName,
    createdTime: lead.createdTime,
    importedAt: lead.importedAt,
    formName: lead.form?.formName ?? null,
    formId: lead.formId,
    pageName: page?.pageName ?? null,
    pageId: page?.pageId ?? null,
    businessName: business?.name ?? null,
    businessId: business?.businessId ?? null,
    fieldData: lead.fieldData,
    rawData: lead.rawData,
  };
}
