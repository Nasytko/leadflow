"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type AdAccount = { id: string; name: string; metaAdAccountId: string; currency: string | null };

type AuditData = {
  summary: {
    spend: number;
    leads: number;
    cpl: number | null;
    ctr: number;
    cpm: number;
    cpc: number;
    impressions: number;
    reach: number;
    clicks: number;
  };
  campaigns: Array<{
    name: string;
    metaCampaignId: string;
    spend: number;
    leads: number;
    cpl: number | null;
    ctr: number;
  }>;
  ads: Array<{
    metaAdId: string;
    spend: number;
    leads: number;
    cpl: number | null;
    ctr: number;
  }>;
  warnings: Array<{ code: string; severity: string; message: string }>;
};

function buildRecommendations(
  warnings: AuditData["warnings"],
  t: (key: string) => string
): string[] {
  const codes = new Set(warnings.map((w) => w.message));
  const items: string[] = [];
  if (codes.has("spend_without_leads")) items.push(t("recommendations.spendWithoutLeads"));
  if (codes.has("high_cpl")) items.push(t("recommendations.highCpl"));
  if (codes.has("low_ctr")) items.push(t("recommendations.lowCtr"));
  if (codes.has("leads_without_forms")) items.push(t("recommendations.leadsWithoutForms"));
  if (codes.has("webhook_not_connected")) items.push(t("recommendations.webhookNotConnected"));
  if (codes.has("telegram_not_connected")) items.push(t("recommendations.telegramNotConnected"));
  if (items.length === 0 && warnings.length === 0) {
    items.push(t("recommendations.allGood"));
  }
  if (items.length === 0) {
    items.push(t("recommendations.reviewCampaigns"));
  }
  return items.slice(0, 5);
}

export function AdAuditContent({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations("metaAds");
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [period, setPeriod] = useState("last_7d");
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const loadAccounts = useCallback(async () => {
    const res = await apiFetch("/api/meta/ad-accounts");
    const data = await res.json();
    const list = (data.data?.accounts ?? []) as AdAccount[];
    setAccounts(list);
    const fromUrl = searchParams.get("adAccountId");
    if (fromUrl && list.some((a) => a.id === fromUrl)) {
      setSelectedId(fromUrl);
    } else if (list[0]) {
      setSelectedId(list[0].id);
    }
    setLoading(false);
  }, [searchParams]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function runAudit() {
    if (!selectedId) {
      toast.error(t("selectAdAccount"));
      return;
    }
    setRunning(true);
    try {
      const res = await apiFetch(
        `/api/meta/ad-audit?adAccountId=${selectedId}&period=${period}`
      );
      const data = await res.json();
      if (data.data) {
        setAudit(data.data);
      } else {
        toast.error(data.error?.message ?? t("auditFailed"));
      }
    } catch {
      toast.error(t("auditFailed"));
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">{t("loading")}</p>;
  }

  const recommendations = audit
    ? buildRecommendations(audit.warnings, t)
    : [];

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-6xl space-y-6"}>
      {!embedded && (
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-[#1877F2]" />
          {t("auditTitle")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("auditSubtitle")}</p>
      </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("auditFilters")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder={t("selectAdAccount")} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7d">{t("period7d")}</SelectItem>
              <SelectItem value="last_30d">{t("period30d")}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => void runAudit()} disabled={running || !selectedId}>
            <RefreshCw className={cn("h-4 w-4 mr-2", running && "animate-spin")} />
            {t("runAudit")}
          </Button>
        </CardContent>
      </Card>

      {audit?.warnings && audit.warnings.length > 0 && (
        <div className="space-y-2">
          {audit.warnings.map((w) => (
            <div
              key={w.code}
              className={cn(
                "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
                w.severity === "error"
                  ? "border-destructive/40 bg-destructive/10"
                  : "border-amber-500/40 bg-amber-500/10"
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t(`warnings.${w.message}` as "warnings.high_cpl")}</span>
            </div>
          ))}
        </div>
      )}

      {audit && (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            {[
              { label: t("kpiSpend"), value: audit.summary.spend.toFixed(2) },
              { label: t("kpiLeads"), value: String(audit.summary.leads) },
              {
                label: t("kpiCpl"),
                value: audit.summary.cpl != null ? audit.summary.cpl.toFixed(2) : "—",
              },
              { label: t("kpiCtr"), value: `${audit.summary.ctr.toFixed(2)}%` },
              { label: t("kpiCpm"), value: audit.summary.cpm.toFixed(2) },
              { label: t("kpiCpc"), value: audit.summary.cpc.toFixed(2) },
              { label: t("kpiImpressions"), value: String(audit.summary.impressions) },
              { label: t("kpiClicks"), value: String(audit.summary.clicks) },
              { label: t("kpiReach"), value: String(audit.summary.reach) },
            ].map((kpi) => (
              <Card key={kpi.label} className="rounded-2xl">
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t("campaignsTable")}</CardTitle>
              <CardDescription>{t("campaignsTableDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">{t("colName")}</th>
                    <th className="py-2 pr-4">{t("kpiSpend")}</th>
                    <th className="py-2 pr-4">{t("kpiLeads")}</th>
                    <th className="py-2 pr-4">{t("kpiCpl")}</th>
                    <th className="py-2">{t("kpiCtr")}</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.campaigns.map((c) => (
                    <tr key={c.metaCampaignId} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{c.name}</td>
                      <td className="py-2 pr-4">{c.spend.toFixed(2)}</td>
                      <td className="py-2 pr-4">{c.leads}</td>
                      <td className="py-2 pr-4">
                        {c.cpl != null ? c.cpl.toFixed(2) : "—"}
                      </td>
                      <td className="py-2">{c.ctr.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t("adsTable")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">{t("colAdId")}</th>
                    <th className="py-2 pr-4">{t("kpiSpend")}</th>
                    <th className="py-2 pr-4">{t("kpiLeads")}</th>
                    <th className="py-2 pr-4">{t("kpiCpl")}</th>
                    <th className="py-2">{t("kpiCtr")}</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.ads.slice(0, 50).map((a) => (
                    <tr key={a.metaAdId} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs">{a.metaAdId}</td>
                      <td className="py-2 pr-4">{a.spend.toFixed(2)}</td>
                      <td className="py-2 pr-4">{a.leads}</td>
                      <td className="py-2 pr-4">
                        {a.cpl != null ? a.cpl.toFixed(2) : "—"}
                      </td>
                      <td className="py-2">
                        <Badge variant={a.ctr < 0.5 ? "warning" : "secondary"}>
                          {a.ctr.toFixed(2)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {recommendations.length > 0 && (
            <Card className="rounded-2xl border-[#1877F2]/20">
              <CardHeader>
                <CardTitle>{t("recommendationsTitle")}</CardTitle>
                <CardDescription>{t("recommendationsSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {recommendations.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#1877F2] font-bold">{i + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
