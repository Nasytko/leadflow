"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { OrvixLogo } from "@/components/brand/orvix-logo";
import {
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  BookOpen,
  Users,
  Megaphone,
  Send,
  Webhook,
  BarChart3,
  Activity,
  ListTodo,
} from "lucide-react";
import { useTranslations } from "next-intl";

type NavItem = { href: string; key: string; icon: React.ElementType };

const navStructure: Array<{ labelKey: string; items: NavItem[] }> = [
  {
    labelKey: "groupOverview",
    items: [
      { href: "/dashboard", key: "missionControl", icon: LayoutDashboard },
      { href: "/wiki", key: "wiki", icon: BookOpen },
    ],
  },
  {
    labelKey: "groupConnections",
    items: [
      { href: "/connections/facebook", key: "facebook", icon: Megaphone },
      { href: "/connections/telegram", key: "telegram", icon: Send },
      { href: "/connections/webhook", key: "webhookApi", icon: Webhook },
    ],
  },
  {
    labelKey: "groupData",
    items: [
      { href: "/leads", key: "leads", icon: Users },
      { href: "/activity", key: "activity", icon: ScrollText },
      { href: "/analytics", key: "analytics", icon: BarChart3 },
    ],
  },
  {
    labelKey: "groupWorkspace",
    items: [
      { href: "/settings", key: "settings", icon: Settings },
      { href: "/health", key: "health", icon: Activity },
    ],
  },
];

function isPathActive(pathname: string, href: string, key: string) {
  if (key === "facebook") {
    return pathname.startsWith("/connections/facebook");
  }
  if (key === "telegram") {
    return pathname.startsWith("/connections/telegram");
  }
  if (key === "webhookApi") {
    return pathname.startsWith("/connections/webhook");
  }
  if (key === "missionControl") {
    return pathname === "/dashboard";
  }
  if (key === "health") {
    return pathname.startsWith("/health");
  }
  if (key === "analytics") {
    return pathname.startsWith("/analytics");
  }
  if (key === "activity") {
    return pathname.startsWith("/activity") || pathname.startsWith("/logs");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  indent,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors min-h-[44px] lg:min-h-0",
        indent && "ml-2",
        isActive
          ? "nav-item-active"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <Icon
        className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-primary" : "opacity-55")}
        strokeWidth={1.5}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

const mobileFlat = [
  { href: "/dashboard", key: "missionControl", icon: LayoutDashboard },
  { href: "/connections/facebook", key: "facebook", icon: Megaphone },
  { href: "/leads", key: "leads", icon: Users },
  { href: "/connections/telegram", key: "telegram", icon: Send },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

function SidebarUser() {
  const { data: session } = useSession();
  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="mx-3 mb-4 mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/50 px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {session?.user?.name ?? session?.user?.email}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {session?.user?.name ? session.user.email : null}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;

  return (
    <aside className="hidden lg:flex w-[252px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" className="flex items-center" aria-label={tCommon("appName")}>
          <OrvixLogo variant="logo" className="h-8 w-auto" priority />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-6 space-y-8">
        {navStructure.map((group) => (
          <div key={group.labelKey}>
            <p className="mb-3 px-3 type-label">{t(group.labelKey)}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.key}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.key)}
                  isActive={isPathActive(pathname, item.href, item.key)}
                />
              ))}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div>
            <p className="mb-3 px-3 type-label">{t("groupAdmin")}</p>
            <NavLink
              href="/admin"
              icon={Shield}
              label={t("adminCenter")}
              isActive={pathname === "/admin" || pathname.startsWith("/admin/")}
            />
            <div className="mt-1 space-y-1">
              <NavLink
                href="/admin/queue"
                icon={ListTodo}
                label={t("adminQueue")}
                isActive={isPathActive(pathname, "/admin/queue", "adminQueue")}
                indent
              />
              <NavLink
                href="/admin/logs"
                icon={ScrollText}
                label={t("adminSystemLogs")}
                isActive={isPathActive(pathname, "/admin/logs", "adminSystemLogs")}
                indent
              />
              <NavLink
                href="/admin/audit-log"
                icon={ScrollText}
                label={t("adminAuditLog")}
                isActive={isPathActive(pathname, "/admin/audit-log", "adminAuditLog")}
                indent
              />
            </div>
          </div>
        )}
      </nav>

      <SidebarUser />
    </aside>
  );
}

export function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const items = isAdmin
    ? [...mobileFlat, { href: "/admin", key: "adminCenter", icon: Shield }]
    : mobileFlat;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="flex px-2 py-2">
        {items.map((item) => {
          const isActive = isPathActive(pathname, item.href, item.key);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition-colors min-h-[44px] justify-center",
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="truncate max-w-[56px]">{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
