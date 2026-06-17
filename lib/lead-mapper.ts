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

export function extractLeadAttribution(
  leadData: {
    campaign_id?: string;
    campaign_name?: string;
    adset_id?: string;
    adset_name?: string;
    ad_id?: string;
    ad_name?: string;
    field_data?: Array<{ name: string; values: string[] }>;
  },
  fields: Record<string, string>
) {
  const fromFields = extractAdFields(fields);
  return {
    campaignId: leadData.campaign_id ?? null,
    campaignName: leadData.campaign_name ?? fromFields.campaignName,
    adsetId: leadData.adset_id ?? null,
    adsetName: leadData.adset_name ?? fromFields.adsetName,
    adId: leadData.ad_id ?? null,
    adName: leadData.ad_name ?? fromFields.adName,
  };
}

export function mapLeadPublic(lead: LeadWithRelations & {
  processedBy?: { id: string; name: string | null; email: string } | null;
}) {
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
    campaignId: lead.campaignId,
    campaignName: lead.campaignName,
    adsetId: lead.adsetId,
    adsetName: lead.adsetName,
    adId: lead.adId,
    adName: lead.adName,
    processedAt: lead.processedAt,
    processedBy: lead.processedBy
      ? {
          id: lead.processedBy.id,
          name: lead.processedBy.name,
          email: lead.processedBy.email,
        }
      : null,
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
