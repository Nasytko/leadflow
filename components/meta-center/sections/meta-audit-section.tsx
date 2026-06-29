"use client";

import { useTranslations } from "next-intl";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { AdAuditContent } from "@/components/meta/ad-audit-content";

export function MetaAuditSection() {
  const t = useTranslations("metaCenter.audit");

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="audit">
      <AdAuditContent embedded />
    </MetaSectionShell>
  );
}
