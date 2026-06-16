"use client";

import { useEffect, useState } from "react";
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
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";
import { Users, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  createdTime: string;
  formName?: string;
  fieldData?: Record<string, string>;
  rawData?: object;
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

export function LeadsContent() {
  const t = useTranslations("leads");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const limit = 20;

  async function loadLeads() {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(status && { status }),
    });
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    if (data.data) {
      setLeads(data.data.items);
      setTotal(data.data.total);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadLeads();
  }, [page, search, status]);

  async function openLead(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}`);
    const data = await res.json();
    if (data.data?.lead) setSelectedLead(data.data.lead);
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
    if (s === "delivered") return "success";
    if (s === "delivery_failed") return "destructive";
    if (s === "new") return "warning";
    return "secondary";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={Users} gradient>
        <Badge variant="secondary">{total} {t("totalLabel")}</Badge>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 rounded-xl"
          />
        </div>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterByStatus")}</SelectItem>
            <SelectItem value="new">{t("statusNew")}</SelectItem>
            <SelectItem value="delivered">{t("statusDelivered")}</SelectItem>
            <SelectItem value="delivery_failed">{t("statusFailed")}</SelectItem>
            <SelectItem value="imported">{t("statusImported")}</SelectItem>
          </SelectContent>
        </Select>
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
                    <th className="p-4 text-left">{t("form")}</th>
                    <th className="p-4 text-left">{t("name")}</th>
                    <th className="p-4 text-left">{t("phone")}</th>
                    <th className="p-4 text-left">{t("email")}</th>
                    <th className="p-4 text-left">{t("date")}</th>
                    <th className="p-4 text-left">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b cursor-pointer hover:bg-muted/50"
                      onClick={() => openLead(lead.id)}
                    >
                      <td className="p-4">{lead.formName ?? "—"}</td>
                      <td className="p-4 font-medium">{lead.name ?? "—"}</td>
                      <td className="p-4">{lead.phone ?? "—"}</td>
                      <td className="p-4">{lead.email ?? "—"}</td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(lead.createdTime, locale)}
                      </td>
                      <td className="p-4">
                        <Badge variant={statusVariant(lead.status)}>
                          {statusLabel(lead.status)}
                        </Badge>
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

              <div>
                <h3 className="font-medium mb-2">{t("rawJson")}</h3>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedLead.rawData, null, 2)}
                </pre>
              </div>

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
