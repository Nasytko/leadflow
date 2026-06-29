"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";
import { Users, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/client-api";

type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  crmStatus?: string;
  telegramStatus?: string;
  source?: string;
  createdTime: string;
  formName?: string | null;
  pageName?: string | null;
  businessName?: string | null;
  campaignName?: string | null;
  fieldData?: Record<string, string>;
  rawData?: object;
  managerNote?: string | null;
  adsetName?: string | null;
  adName?: string | null;
  processedAt?: string | null;
  processedBy?: { id: string; name: string | null; email: string } | null;
};

type LeadDetail = Lead & {
  deliveryLogs?: Array<{
    id: string;
    status: string;
    type: string;
    createdAt: string;
    errorMessage?: string;
  }>;
};

export function LeadsContent({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations("leads");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [formId, setFormId] = useState("");
  const [pageId, setPageId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [telegramStatus, setTelegramStatus] = useState("");
  const [formOptions, setFormOptions] = useState<Array<{ id: string; name: string; pageId?: string }>>([]);
  const [pageOptions, setPageOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [managerNote, setManagerNote] = useState("");
  const limit = 20;

  useEffect(() => {
    void (async () => {
      const [formsRes, statusRes] = await Promise.all([
        fetch("/api/forms"),
        fetch("/api/facebook/status"),
      ]);
      const formsData = await formsRes.json();
      const statusData = await statusRes.json();
      const forms = (formsData.data?.forms ?? []) as Array<{ id: string; formName: string }>;
      setFormOptions(forms.map((f) => ({ id: f.id, name: f.formName })));
      const pages = (statusData.data?.pages ?? []) as Array<{ id: string; pageName: string }>;
      setPageOptions(pages.map((p) => ({ id: p.id, name: p.pageName })));
    })();
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(status && { crmStatus: status }),
      ...(formId && { formId }),
      ...(pageId && { pageId }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(telegramStatus && { telegramStatus }),
    });
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    if (data.data) {
      setLeads(data.data.items);
      setTotal(data.data.total);
    }
    setLoading(false);
  }, [page, search, status, formId, pageId, dateFrom, dateTo, telegramStatus]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  async function openLead(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}`);
    const data = await res.json();
    if (data.data?.lead) {
      setSelectedLead(data.data.lead);
      setManagerNote(data.data.lead.managerNote ?? "");
    }
  }

  async function saveManagerNote(leadId: string) {
    const res = await apiFetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerNote }),
    });
    if (res.ok) {
      toast.success(tCommon("success"));
      void openLead(leadId);
      void loadLeads();
    } else {
      toast.error(tCommon("error"));
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "1000",
        ...(search && { search }),
        ...(status && { crmStatus: status }),
        ...(formId && { formId }),
        ...(pageId && { pageId }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(telegramStatus && { telegramStatus }),
      });
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      const items = (data.data?.items ?? []) as Lead[];
      const header = [
        t("date"), t("name"), t("phone"), t("email"), t("page"), t("form"),
        t("campaign"), "Ad Set", t("ad"), t("status"), t("telegramStatus"), t("managerNote"),
      ];
      const rows = items.map((lead) => [
        lead.createdTime,
        lead.name ?? "",
        lead.phone ?? "",
        lead.email ?? "",
        lead.pageName ?? "",
        lead.formName ?? "",
        lead.campaignName ?? "",
        lead.adsetName ?? "",
        lead.adName ?? "",
        lead.crmStatus ?? lead.status,
        lead.telegramStatus ?? "",
        lead.managerNote ?? "",
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function leadAction(leadId: string, action: string) {
    const res = await apiFetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data?.lead) setSelectedLead(data.data.lead);
      loadLeads();
      toast.success(tCommon("success"));
    } else {
      toast.error(tCommon("error"));
    }
  }

  function crmLabel(s: string) {
    const map: Record<string, string> = {
      new: t("crmStatusNew"),
      in_progress: t("crmStatusInProgress"),
      contacted: t("crmStatusContacted"),
      qualified: t("crmStatusQualified"),
      converted: t("crmStatusConverted"),
      rejected: t("crmStatusRejected"),
      duplicate: t("crmStatusDuplicate"),
      processed: t("crmStatusProcessed"),
    };
    return map[s] ?? s;
  }

  function telegramLabel(s: string) {
    const map: Record<string, string> = {
      sent: t("telegramSent"),
      failed: t("telegramFailed"),
      not_sent: t("telegramNotSent"),
      pending: t("telegramNotSent"),
    };
    return map[s] ?? s;
  }

  function statusLabel(s: string) {
    const map: Record<string, string> = {
      new: t("statusNew"),
      delivered: t("statusDelivered"),
      delivery_failed: t("statusFailed"),
      imported: t("statusImported"),
    };
    return map[s] ?? s;
  }

  function statusVariant(s: string): "success" | "destructive" | "warning" | "secondary" {
    if (s === "delivered" || s === "processed" || s === "converted" || s === "sent") return "success";
    if (s === "delivery_failed" || s === "failed" || s === "rejected") return "destructive";
    if (s === "new" || s === "in_progress" || s === "contacted" || s === "qualified") return "warning";
    return "secondary";
  }

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-7xl space-y-6"}>
      {!embedded && (
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={Users} gradient>
        <Badge variant="secondary">{total} {t("totalLabel")}</Badge>
      </PageHeader>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 rounded-xl"
            />
          </div>
          <Select value={formId || "all"} onValueChange={(v) => { setFormId(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("filterByForm")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterByForm")}</SelectItem>
              {formOptions.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pageId || "all"} onValueChange={(v) => { setPageId(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("filterByPage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterByPage")}</SelectItem>
              {pageOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterByStatus")}</SelectItem>
              <SelectItem value="new">{t("crmStatusNew")}</SelectItem>
              <SelectItem value="in_progress">{t("crmStatusInProgress")}</SelectItem>
              <SelectItem value="contacted">{t("crmStatusContacted")}</SelectItem>
              <SelectItem value="qualified">{t("crmStatusQualified")}</SelectItem>
              <SelectItem value="converted">{t("crmStatusConverted")}</SelectItem>
              <SelectItem value="rejected">{t("crmStatusRejected")}</SelectItem>
              <SelectItem value="duplicate">{t("crmStatusDuplicate")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={telegramStatus || "all"} onValueChange={(v) => { setTelegramStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("filterByTelegram")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterByTelegram")}</SelectItem>
              <SelectItem value="sent">{t("telegramSent")}</SelectItem>
              <SelectItem value="failed">{t("telegramFailed")}</SelectItem>
              <SelectItem value="not_sent">{t("telegramNotSent")}</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-[150px]" />
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-[150px]" />
          <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {t("exportCsv")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6">{tCommon("loading")}</p>
          ) : leads.length === 0 ? (
            <p className="p-6 text-muted-foreground">{t("noLeads")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left">{t("date")}</th>
                    <th className="p-4 text-left">{t("name")}</th>
                    <th className="p-4 text-left">{t("phone")}</th>
                    <th className="p-4 text-left">{t("email")}</th>
                    <th className="p-4 text-left">{t("page")}</th>
                    <th className="p-4 text-left">{t("form")}</th>
                    <th className="p-4 text-left">{t("campaign")}</th>
                    <th className="p-4 text-left">{t("status")}</th>
                    <th className="p-4 text-left">{t("telegramStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b cursor-pointer hover:bg-muted/50"
                      onClick={() => openLead(lead.id)}
                    >
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {formatDate(lead.createdTime, locale)}
                      </td>
                      <td className="p-4 font-medium">{lead.name ?? "—"}</td>
                      <td className="p-4">{lead.phone ?? "—"}</td>
                      <td className="p-4">{lead.email ?? "—"}</td>
                      <td className="p-4">{lead.pageName ?? "—"}</td>
                      <td className="p-4">{lead.formName ?? "—"}</td>
                      <td className="p-4">{lead.campaignName ?? "—"}</td>
                      <td className="p-4">
                        <Badge variant={statusVariant(lead.crmStatus ?? lead.status)}>
                          {crmLabel(lead.crmStatus ?? lead.status)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {lead.telegramStatus && (
                          <Badge variant="secondary" className="text-[10px]">
                            {telegramLabel(lead.telegramStatus)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tCommon("page")} {page} {tCommon("of")} {Math.ceil(total / limit)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {tCommon("back")}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(page + 1)}>
              {tCommon("next")}
            </Button>
          </div>
        </div>
      )}

      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("details")}</SheetTitle>
          </SheetHeader>
          {selectedLead && (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => leadAction(selectedLead.id, "set_in_progress")}>
                  {t("actionInProgress")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => leadAction(selectedLead.id, "set_contacted")}>
                  {t("actionContacted")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => leadAction(selectedLead.id, "set_qualified")}>
                  {t("actionQualified")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => leadAction(selectedLead.id, "set_converted")}>
                  {t("actionConverted")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => leadAction(selectedLead.id, "set_rejected")}>
                  {t("actionReject")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => leadAction(selectedLead.id, "set_new")}>
                  {t("actionBackToNew")}
                </Button>
                <Button size="sm" onClick={() => leadAction(selectedLead.id, "set_processed")}>
                  {t("actionProcessed")}
                </Button>
                <Button size="sm" onClick={() => leadAction(selectedLead.id, "resend_telegram")}>
                  {t("actionResendTelegram")}
                </Button>
              </div>

              <div>
                <h3 className="font-medium mb-2">{t("managerNote")}</h3>
                <Textarea
                  value={managerNote}
                  onChange={(e) => setManagerNote(e.target.value)}
                  rows={3}
                  className="mb-2"
                />
                <Button size="sm" variant="outline" onClick={() => void saveManagerNote(selectedLead.id)}>
                  {t("saveNote")}
                </Button>
              </div>

              {(selectedLead.pageName || selectedLead.businessName) && (
                <div className="text-sm space-y-1">
                  {selectedLead.pageName && <p>{t("page")}: {selectedLead.pageName}</p>}
                  {selectedLead.businessName && <p>{t("business")}: {selectedLead.businessName}</p>}
                  {selectedLead.campaignName && <p>{t("campaign")}: {selectedLead.campaignName}</p>}
                  {selectedLead.adsetName && <p>{t("adset")}: {selectedLead.adsetName}</p>}
                  {selectedLead.adName && <p>{t("ad")}: {selectedLead.adName}</p>}
                </div>
              )}

              {selectedLead.processedAt && (
                <p className="text-sm text-muted-foreground">
                  {t("processedAt")}: {formatDate(selectedLead.processedAt, locale)}
                  {selectedLead.processedBy?.name || selectedLead.processedBy?.email
                    ? ` · ${selectedLead.processedBy.name ?? selectedLead.processedBy.email}`
                    : ""}
                </p>
              )}

              <div>
                <h3 className="font-medium mb-2">{t("allFields")}</h3>
                <div className="space-y-1 text-sm">
                  {Object.entries((selectedLead.fieldData as Record<string, string>) ?? {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b py-1">
                      <span className="text-muted-foreground">{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <details className="text-sm">
                <summary className="font-medium cursor-pointer mb-2">{t("rawJson")}</summary>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto mt-2">
                  {JSON.stringify(selectedLead.rawData, null, 2)}
                </pre>
              </details>

              <div>
                <h3 className="font-medium mb-2">{t("deliveryHistory")}</h3>
                {selectedLead.deliveryLogs?.length ? (
                  <div className="space-y-2">
                    {selectedLead.deliveryLogs.map((log) => (
                      <div key={log.id} className="flex justify-between text-sm border-b py-2">
                        <span>{log.type}</span>
                        <Badge variant={statusVariant(log.status === "success" ? "delivered" : log.status === "failed" ? "delivery_failed" : "new")}>
                          {log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
