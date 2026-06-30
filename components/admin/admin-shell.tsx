"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  HeartPulse,
  Users,
  Megaphone,
  Mail,
  Send,
  Layers,
  ScrollText,
  Shield,
  Database,
  Flag,
  CreditCard,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

const NAV = [
  { href: "/admin", icon: LayoutDashboard, key: "overview", exact: true },
  { href: "/admin/health", icon: HeartPulse, key: "health" },
  { href: "/admin/users", icon: Users, key: "users" },
  { href: "/admin/platform/meta", icon: Megaphone, key: "meta" },
  { href: "/admin/platform/email", icon: Mail, key: "email" },
  { href: "/admin/platform/telegram", icon: Send, key: "telegram" },
  { href: "/admin/queue", icon: Layers, key: "queue" },
  { href: "/admin/logs", icon: ScrollText, key: "logs" },
  { href: "/admin/audit-log", icon: ScrollText, key: "auditLog" },
  { href: "/admin/security", icon: Shield, key: "security" },
  { href: "/admin/backups", icon: Database, key: "backups" },
  { href: "/admin/feature-flags", icon: Flag, key: "featureFlags" },
  { href: "/admin/billing", icon: CreditCard, key: "billing", disabled: true },
] as const;

export function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const t = useTranslations("adminCenter");
  const pathname = usePathname();
  const [status, setStatus] = useState<"healthy" | "attention" | "critical">("healthy");
  const [env, setEnv] = useState("—");

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch("/api/admin/dashboard");
        const data = await res.json();
        if (data.data?.platformStatus) setStatus(data.data.platformStatus);
        if (data.data?.environment) setEnv(data.data.environment);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const statusBadge =
    status === "healthy"
      ? { label: t("statusHealthy"), variant: "success" as const }
      : status === "attention"
      ? { label: t("statusAttention"), variant: "warning" as const }
      : { label: t("statusCritical"), variant: "destructive" as const };

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r bg-muted/20 p-3 gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 py-2">
          {t("title")}
        </p>
        {NAV.map((item) => {
          const isActive =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          if ("disabled" in item && item.disabled) {
            return (
              <div
                key={item.key}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground opacity-50"
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`nav.${item.key}`)}
                <Badge variant="secondary" className="ml-auto text-[9px]">
                  Soon
                </Badge>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </aside>

      <div className="flex-1 min-w-0">
        <div className="border-b bg-background/80 backdrop-blur px-4 py-3 flex flex-wrap items-center gap-3 justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-semibold">{title ?? t("title")}</h1>
            <p className="text-xs text-muted-foreground">
              {t("env")}: {env} · {t("deployment")}: {process.env.NEXT_PUBLIC_DEPLOYMENT_MODE ?? "saas"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/health">
                <Stethoscope className="h-3.5 w-3.5 mr-1" />
                {t("runDiagnostics")}
              </Link>
            </Button>
          </div>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export function AdminKpi({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string | number;
  variant?: "default" | "success" | "warning" | "destructive";
}) {
  const colors = {
    default: "",
    success: "text-emerald-600",
    warning: "text-amber-600",
    destructive: "text-destructive",
  };
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", colors[variant])}>{value}</p>
    </div>
  );
}

export function StatusDot({ status }: { status: "ok" | "warning" | "error" | "unknown" }) {
  const color =
    status === "ok"
      ? "bg-emerald-500"
      : status === "warning"
      ? "bg-amber-500"
      : status === "error"
      ? "bg-red-500"
      : "bg-muted-foreground";
  return <span className={cn("inline-block h-2 w-2 rounded-full", color)} />;
}
