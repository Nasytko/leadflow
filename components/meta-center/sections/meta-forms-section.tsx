"use client";

import { useTranslations } from "next-intl";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { FormsContent } from "@/components/forms/forms-content";

export function MetaFormsSection() {
  const t = useTranslations("metaCenter.forms");

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="leadForm">
      <FormsContent embedded />
    </MetaSectionShell>
  );
}
