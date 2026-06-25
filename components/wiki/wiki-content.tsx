"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Search,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  Facebook,
  Send,
  FileText,
  Zap,
  Server,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WikiSection = {
  id: string;
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
  items: string[];
  tipKey?: string;
  warningKey?: string;
  link?: { href: string; labelKey: string };
};

const WIKI_SECTIONS: WikiSection[] = [
  {
    id: "overview",
    icon: BookOpen,
    titleKey: "sectionOverviewTitle",
    descKey: "sectionOverviewDesc",
    items: ["sectionOverviewItem1", "sectionOverviewItem2", "sectionOverviewItem3", "sectionOverviewItem4"],
  },
  {
    id: "quick-start",
    icon: Zap,
    titleKey: "sectionQuickStartTitle",
    descKey: "sectionQuickStartDesc",
    items: [
      "sectionQuickStartItem1",
      "sectionQuickStartItem2",
      "sectionQuickStartItem3",
      "sectionQuickStartItem4",
      "sectionQuickStartItem5",
    ],
    link: { href: "/facebook", labelKey: "goToFacebook" },
  },
  {
    id: "meta-app",
    icon: Zap,
    titleKey: "sectionMetaTitle",
    descKey: "sectionMetaDesc",
    items: [
      "sectionMetaItem1",
      "sectionMetaItem2",
      "sectionMetaItem3",
      "sectionMetaItem4",
      "sectionMetaItem5",
      "sectionMetaItem6",
      "sectionMetaItem7",
    ],
    tipKey: "sectionMetaTip",
    link: { href: "/facebook", labelKey: "goToFacebook" },
  },
  {
    id: "facebook-oauth",
    icon: Facebook,
    titleKey: "sectionOAuthTitle",
    descKey: "sectionOAuthDesc",
    items: [
      "sectionOAuthItem1",
      "sectionOAuthItem2",
      "sectionOAuthItem3",
      "sectionOAuthItem4",
    ],
    tipKey: "sectionOAuthTip",
  },
  {
    id: "webhooks",
    icon: Server,
    titleKey: "sectionWebhooksTitle",
    descKey: "sectionWebhooksDesc",
    items: [
      "sectionWebhooksItem1",
      "sectionWebhooksItem2",
      "sectionWebhooksItem3",
      "sectionWebhooksItem4",
      "sectionWebhooksItem5",
    ],
    warningKey: "sectionWebhooksWarning",
    tipKey: "sectionWebhooksTip",
  },
  {
    id: "telegram",
    icon: Send,
    titleKey: "sectionTelegramTitle",
    descKey: "sectionTelegramDesc",
    items: [
      "sectionTelegramItem1",
      "sectionTelegramItem2",
      "sectionTelegramItem3",
      "sectionTelegramItem4",
      "sectionTelegramItem5",
    ],
    link: { href: "/telegram", labelKey: "goToTelegram" },
  },
  {
    id: "forms",
    icon: FileText,
    titleKey: "sectionFormsTitle",
    descKey: "sectionFormsDesc",
    items: [
      "sectionFormsItem1",
      "sectionFormsItem2",
      "sectionFormsItem3",
      "sectionFormsItem4",
    ],
    link: { href: "/forms", labelKey: "goToForms" },
  },
  {
    id: "leads-flow",
    icon: Zap,
    titleKey: "sectionLeadsTitle",
    descKey: "sectionLeadsDesc",
    items: [
      "sectionLeadsItem1",
      "sectionLeadsItem2",
      "sectionLeadsItem3",
      "sectionLeadsItem4",
      "sectionLeadsItem5",
    ],
    link: { href: "/leads", labelKey: "goToLeads" },
  },
  {
    id: "production",
    icon: Server,
    titleKey: "sectionProductionTitle",
    descKey: "sectionProductionDesc",
    items: [
      "sectionProductionItem1",
      "sectionProductionItem2",
      "sectionProductionItem3",
      "sectionProductionItem4",
    ],
    warningKey: "sectionProductionWarning",
  },
  {
    id: "troubleshooting",
    icon: HelpCircle,
    titleKey: "sectionTroubleshootTitle",
    descKey: "sectionTroubleshootDesc",
    items: [
      "sectionTroubleshootItem1",
      "sectionTroubleshootItem2",
      "sectionTroubleshootItem3",
      "sectionTroubleshootItem4",
      "sectionTroubleshootItem5",
      "sectionTroubleshootItem6",
    ],
  },
];

const GLOSSARY = [
  { termKey: "glossaryAppId", defKey: "glossaryAppIdDef" },
  { termKey: "glossaryAppSecret", defKey: "glossaryAppSecretDef" },
  { termKey: "glossaryWebhookToken", defKey: "glossaryWebhookTokenDef" },
  { termKey: "glossaryLeadgen", defKey: "glossaryLeadgenDef" },
  { termKey: "glossaryChatId", defKey: "glossaryChatIdDef" },
];

export function WikiContent() {
  const t = useTranslations("wiki");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(WIKI_SECTIONS[0].id);

  const filteredSections = useMemo(() => {
    if (!search.trim()) return WIKI_SECTIONS;
    const q = search.toLowerCase();
    return WIKI_SECTIONS.filter((section) => {
      const title = t(section.titleKey).toLowerCase();
      const desc = t(section.descKey).toLowerCase();
      const items = section.items.map((k) => t(k).toLowerCase()).join(" ");
      return title.includes(q) || desc.includes(q) || items.includes(q);
    });
  }, [search, t]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        icon={BookOpen}
        gradient
      >
        <a
          href="https://developers.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          developers.facebook.com
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-10 h-11 rounded-xl bg-card"
        />
      </div>

      <div className="flex gap-8">
        {/* TOC sidebar */}
        <aside className="hidden xl:block w-56 shrink-0">
          <div className="sticky top-20 space-y-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("toc")}
            </p>
            {WIKI_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setActiveId(section.id);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  activeId === section.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <ChevronRight className="h-3 w-3 shrink-0" />
                <span className="truncate">{t(section.titleKey)}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => document.getElementById("glossary")?.scrollIntoView({ behavior: "smooth" })}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-3 w-3 shrink-0" />
              {t("glossaryTitle")}
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {filteredSections.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
              {t("noResults")}
            </div>
          ) : (
            filteredSections.map((section, index) => {
              const Icon = section.icon;
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 rounded-2xl border bg-card overflow-hidden"
                >
                  <div className="flex items-start gap-4 border-b border-border/50 bg-muted/30 px-6 py-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {index + 1}
                        </Badge>
                        <h2 className="text-lg font-semibold">{t(section.titleKey)}</h2>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{t(section.descKey)}</p>
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    <ol className="space-y-3">
                      {section.items.map((itemKey, i) => (
                        <li key={itemKey} className="flex gap-3 text-sm leading-relaxed">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {i + 1}
                          </span>
                          <span className="pt-0.5 text-muted-foreground">{t(itemKey)}</span>
                        </li>
                      ))}
                    </ol>

                    {section.tipKey && (
                      <div className="flex gap-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                        {t(section.tipKey)}
                      </div>
                    )}

                    {section.warningKey && (
                      <div className="flex gap-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        {t(section.warningKey)}
                      </div>
                    )}

                    {section.link && (
                      <Button variant="outline" size="sm" asChild className="rounded-xl">
                        <Link href={section.link.href}>
                          {t(section.link.labelKey)}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </section>
              );
            })
          )}

          {/* Glossary */}
          <section id="glossary" className="scroll-mt-24 rounded-2xl border bg-card overflow-hidden">
            <div className="border-b border-border/50 bg-muted/30 px-6 py-5">
              <h2 className="text-lg font-semibold">{t("glossaryTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("glossaryDesc")}</p>
            </div>
            <div className="divide-y divide-border/50">
              {GLOSSARY.map(({ termKey, defKey }) => (
                <div key={termKey} className="px-6 py-4">
                  <dt className="font-medium text-sm">{t(termKey)}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground leading-relaxed">{t(defKey)}</dd>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
