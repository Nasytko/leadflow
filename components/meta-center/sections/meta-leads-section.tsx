"use client";

import { useTranslations } from "next-intl";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { LeadsContent } from "@/components/leads/leads-content";

export function MetaLeadsSection() {
  const t = useTranslations("metaCenter.leads");

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="leads">
      <LeadsContent embedded />
    </MetaSectionShell>
  );
}
