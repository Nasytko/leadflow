"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Plug,
  Building2,
  Megaphone,
  Layers,
  FileText,
  Users,
  BarChart3,
  Webhook,
  Send,
  Stethoscope,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/meta", icon: LayoutGrid, key: "overview", exact: true },
  { href: "/meta/connect", icon: Plug, key: "connect" },
  { href: "/meta/businesses", icon: Building2, key: "businesses" },
  { href: "/meta/ad-accounts", icon: Megaphone, key: "adAccounts" },
  { href: "/meta/pages", icon: Layers, key: "pages" },
  { href: "/meta/forms", icon: FileText, key: "forms" },
  { href: "/meta/leads", icon: Users, key: "leads" },
  { href: "/meta/audit", icon: BarChart3, key: "audit" },
  { href: "/meta/webhook", icon: Webhook, key: "webhook" },
  { href: "/meta/telegram", icon: Send, key: "telegram" },
  { href: "/meta/health", icon: Stethoscope, key: "health" },
] as const;

export function MetaCenterNav() {
  const t = useTranslations("metaCenter.nav");
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1.5 pb-4 border-b border-border/60 mb-6">
      {NAV_ITEMS.map((item) => {
        const isActive =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              isActive
                ? "bg-[#1877F2] text-white shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
