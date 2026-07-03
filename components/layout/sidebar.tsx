"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  ChevronDown,
  ChevronRight,
  Megaphone,
  Send,
  FileText,
  Webhook,
  Building2,
  BarChart3,
  ListTodo,
} from "lucide-react";

type NavLeaf = { href: string; key: string; icon?: React.ElementType };
type NavNode = { key: string; icon?: React.ElementType; href?: string; children?: NavLeaf[] };

const navStructure: Array<{ labelKey: string; items: NavNode[] }> = [
  {
    labelKey: "groupOverview",
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { key: "wiki", href: "/wiki", icon: BookOpen },
    ],
  },
  {
    labelKey: "groupIntegrations",
    items: [
      {
        key: "metaPlatform",
        icon: Megaphone,
        children: [
          { href: "/meta/connect", key: "metaAccounts", icon: Building2 },
          { href: "/meta/pages", key: "metaPages", icon: FileText },
          { href: "/meta/forms", key: "metaForms", icon: FileText },
          { href: "/meta/ad-accounts", key: "metaAdAccounts", icon: BarChart3 },
          { href: "/meta/webhook", key: "metaWebhook", icon: Webhook },
        ],
      },
      {
        key: "telegramGroup",
        icon: Send,
        children: [
          { href: "/meta/telegram", key: "telegramBots", icon: Send },
          { href: "/meta/telegram/messages", key: "telegramTemplates", icon: FileText },
        ],
      },
    ],
  },
  {
    labelKey: "groupData",
    items: [
      { key: "leads", href: "/leads", icon: Users },
      {
        key: "analytics",
        icon: BarChart3,
        children: [{ href: "/meta/audit", key: "analyticsCampaigns", icon: BarChart3 }],
      },
      { key: "logs", href: "/logs", icon: ScrollText },
    ],
  },
  {
    labelKey: "groupSystem",
    items: [{ key: "settings", href: "/settings", icon: Settings }],
  },
];

function isPathActive(pathname: string, href: string) {
  if (href === "/meta") return pathname === "/meta" || pathname.startsWith("/meta/");
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
  icon?: React.ElementType;
  label: string;
  isActive: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors",
        indent && "pl-7",
        isActive
          ? "nav-item-active"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 opacity-60" strokeWidth={1.5} />}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavGroup({
  node,
  pathname,
  t,
}: {
  node: NavNode;
  pathname: string;
  t: (key: string) => string;
}) {
  const childActive = node.children?.some((c) => isPathActive(pathname, c.href)) ?? false;
  const [open, setOpen] = useState(childActive);

  if (node.href && !node.children) {
    return (
      <NavLink
        href={node.href}
        icon={node.icon}
        label={t(node.key)}
        isActive={isPathActive(pathname, node.href)}
      />
    );
  }
  if (!node.children) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors",
          childActive ? "text-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
        )}
      >
        {node.icon && <node.icon className="h-4 w-4 shrink-0 opacity-60" strokeWidth={1.5} />}
        <span className="flex-1 truncate text-left">{t(node.key)}</span>
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0 opacity-40" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
        )}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <NavLink
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={t(child.key)}
              isActive={isPathActive(pathname, child.href)}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

const mobileFlat = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/meta", key: "metaCenter", icon: Megaphone },
  { href: "/leads", key: "leads", icon: Users },
  { href: "/logs", key: "logs", icon: ScrollText },
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
    <div className="border-t border-sidebar-border px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-[10px] font-medium text-foreground/70">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">
            {session?.user?.name ?? session?.user?.email}
          </p>
          {session?.user?.name && (
            <p className="truncate text-[11px] text-muted-foreground">{session?.user?.email}</p>
          )}
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
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center px-5">
        <Link href="/dashboard" className="flex items-center" aria-label={tCommon("appName")}>
          <OrvixLogo variant="logo" className="h-7 w-auto" priority />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-7">
        {navStructure.map((group) => (
          <div key={group.labelKey}>
            <p className="mb-2 px-2.5 type-label">{t(group.labelKey)}</p>
            <div className="space-y-0.5">
              {group.items.map((item) =>
                item.children ? (
                  <NavGroup key={item.key} node={item} pathname={pathname} t={t} />
                ) : item.href ? (
                  <NavLink
                    key={item.key}
                    href={item.href}
                    icon={item.icon}
                    label={t(item.key)}
                    isActive={isPathActive(pathname, item.href)}
                  />
                ) : null
              )}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div>
            <p className="mb-2 px-2.5 type-label">{t("groupAdmin")}</p>
            <NavLink
              href="/admin"
              icon={Shield}
              label={t("adminCenter")}
              isActive={pathname === "/admin" || pathname.startsWith("/admin/")}
            />
            <div className="mt-0.5 space-y-0.5">
              <NavLink
                href="/admin/queue"
                icon={ListTodo}
                label={t("adminQueue")}
                isActive={isPathActive(pathname, "/admin/queue")}
                indent
              />
              <NavLink
                href="/admin/logs"
                icon={ScrollText}
                label={t("adminSystemLogs")}
                isActive={isPathActive(pathname, "/admin/logs")}
                indent
              />
              <NavLink
                href="/admin/audit-log"
                icon={ScrollText}
                label={t("adminAuditLog")}
                isActive={isPathActive(pathname, "/admin/audit-log")}
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="flex px-2 py-2">
        {items.map((item) => {
          const isActive = isPathActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-[10px] transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
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
