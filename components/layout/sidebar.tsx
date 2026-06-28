"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Facebook,
  FileText,
  Send,
  Users,
  ScrollText,
  Settings,
  Shield,
  BarChart3,
  Megaphone,
  BookOpen,
  Zap,
} from "lucide-react";

const navGroups = [
  {
    labelKey: "groupOverview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
      { href: "/wiki", icon: BookOpen, key: "wiki" },
    ],
  },
  {
    labelKey: "groupIntegrations",
    items: [
      { href: "/facebook", icon: Facebook, key: "facebook" },
      { href: "/ad-audit", icon: BarChart3, key: "adAudit" },
      { href: "/forms", icon: FileText, key: "forms" },
      { href: "/telegram", icon: Send, key: "telegram" },
    ],
  },
  {
    labelKey: "groupData",
    items: [
      { href: "/leads", icon: Users, key: "leads" },
      { href: "/logs", icon: ScrollText, key: "logs" },
    ],
  },
  {
    labelKey: "groupSystem",
    items: [{ href: "/settings", icon: Settings, key: "settings" }],
  },
] as const;

type NavItem = (typeof navGroups)[number]["items"][number];

const allNavItems: NavItem[] = navGroups.flatMap((g) => [...g.items]);
const adminNavItem = { href: "/admin/users", icon: Shield, key: "admin" } as const;

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  compact,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl text-sm font-medium transition-all",
        compact ? "flex-col gap-1 px-2 py-1.5 text-[10px]" : "px-3 py-2.5",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <Icon className={cn("shrink-0", compact ? "h-5 w-5" : "h-4 w-4")} />
      <span className={cn(compact && "truncate max-w-[56px]")}>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;

  return (
    <aside className="hidden lg:flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight">{tCommon("appName")}</span>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{tCommon("tagline")}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {t(group.labelKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={t(item.key)}
                    isActive={isActive}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {t("groupAdmin")}
            </p>
            <div className="space-y-0.5">
              <NavLink
                key={adminNavItem.href}
                href={adminNavItem.href}
                icon={adminNavItem.icon}
                label={t(adminNavItem.key)}
                isActive={
                  pathname === adminNavItem.href ||
                  pathname.startsWith(`${adminNavItem.href}/`)
                }
              />
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <Link
          href="/wiki"
          className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm transition-colors hover:bg-primary/10"
        >
          <BookOpen className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-xs">{t("wikiHint")}</p>
            <p className="text-[10px] text-muted-foreground truncate">{t("wikiHintDesc")}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const mobileItems = allNavItems.filter((item) => item.key !== "wiki");
  const items = isAdmin ? [...mobileItems, adminNavItem] : mobileItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-sidebar-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="flex overflow-x-auto px-1 py-1.5 scrollbar-none">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={t(item.key)}
              isActive={isActive}
              compact
            />
          );
        })}
      </div>
    </nav>
  );
}
