"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/client-api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Shield, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  pagesCount: number;
  formsCount: number;
  leadsCount: number;
};

export function AdminUsersContent() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.error) {
        toast.error(data.error.message ?? tCommon("error"));
        return;
      }
      setUsers(data.data.users ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function doAction(userId: string, action: string) {
    setRefreshing(true);
    try {
      const res = await apiFetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error.message ?? tCommon("error"));
      } else {
        toast.success(tCommon("success"));
        await load();
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function createInvite() {
    setRefreshing(true);
    try {
      const res = await apiFetch("/api/admin/invites", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error.message ?? tCommon("error"));
        return;
      }
      const code = data.data?.code;
      if (code) {
        await navigator.clipboard.writeText(code);
        toast.success(t("inviteCreated", { code }));
      } else {
        toast.success(tCommon("success"));
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={Shield} gradient>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void createInvite()} disabled={refreshing}>
            {t("createInvite")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          {t("refresh")}
          </Button>
        </div>
      </PageHeader>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("usersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left">{t("email")}</th>
                    <th className="p-4 text-left">{t("status")}</th>
                    <th className="p-4 text-left">{t("usage")}</th>
                    <th className="p-4 text-left">{tCommon("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="p-4">
                        <div className="font-medium">{u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.name ?? "—"}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={u.status === "active" ? "success" : u.status === "blocked" ? "destructive" : "warning"}>
                            {u.status}
                          </Badge>
                          {u.isAdmin && <Badge variant="secondary">admin</Badge>}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        pages: {u.pagesCount} · forms: {u.formsCount} · leads: {u.leadsCount}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {u.status === "pending_approval" && (
                            <Button size="sm" onClick={() => void doAction(u.id, "approve")} disabled={refreshing}>
                              {t("approve")}
                            </Button>
                          )}
                          {u.status !== "blocked" ? (
                            <Button size="sm" variant="destructive" onClick={() => void doAction(u.id, "block")} disabled={refreshing}>
                              {t("block")}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => void doAction(u.id, "unblock")} disabled={refreshing}>
                              {t("unblock")}
                            </Button>
                          )}
                          {!u.isAdmin ? (
                            <Button size="sm" variant="outline" onClick={() => void doAction(u.id, "make_admin")} disabled={refreshing}>
                              {t("makeAdmin")}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => void doAction(u.id, "remove_admin")} disabled={refreshing}>
                              {t("removeAdmin")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

