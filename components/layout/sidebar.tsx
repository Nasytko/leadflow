"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  BookOpen,
  Zap,
  Users,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Megaphone,
  Send,
  FileText,
  Webhook,
  Building2,
  BarChart3,
  ListTodo,
} from "lucide-react";

type NavLeaf = {
  href: string;
  key: string;
  icon?: React.ElementType;
};

type NavNode = {
  key: string;
  icon?: React.ElementType;
  href?: string;
  children?: NavLeaf[];
};

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
        children: [
          { href: "/meta/audit", key: "analyticsCampaigns", icon: BarChart3 },
        ],
      },
      { key: "logs", href: "/logs", icon: ScrollText },
    ],
  },
  {
    labelKey: "groupSystem",
    items: [
      { key: "settings", href: "/settings", icon: Settings },
    ],
  },
];

function isPathActive(pathname: string, href: string) {
  if (href === "/meta") {
    return pathname === "/meta" || pathname.startsWith("/meta/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  indent,
  collapsed,
}: {
  href: string;
  icon?: React.ElementType;
  label: string;
  isActive: boolean;
  indent?: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
        indent && !collapsed && "pl-9",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" />}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function NavGroup({
  node,
  pathname,
  t,
  collapsed,
}: {
  node: NavNode;
  pathname: string;
  t: (key: string) => string;
  collapsed: boolean;
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
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          childActive
            ? "text-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
        )}
      >
        {node.icon && <node.icon className="h-4 w-4 shrink-0 opacity-80" />}
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{t(node.key)}</span>
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
            )}
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <NavLink
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={t(child.key)}
              isActive={isPathActive(pathname, child.href)}
              indent
              collapsed={collapsed}
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

export function Sidebar() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-sm tracking-tight">{tCommon("appName")}</span>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">
              {tCommon("tagline")}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {navStructure.map((group) => (
          <div key={group.labelKey}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {t(group.labelKey)}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) =>
                item.children ? (
                  <NavGroup
                    key={item.key}
                    node={item}
                    pathname={pathname}
                    t={t}
                    collapsed={collapsed}
                  />
                ) : item.href ? (
                  <NavLink
                    key={item.key}
                    href={item.href}
                    icon={item.icon}
                    label={t(item.key)}
                    isActive={isPathActive(pathname, item.href)}
                    collapsed={collapsed}
                  />
                ) : null
              )}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {t("groupAdmin")}
              </p>
            )}
            <NavLink
              href="/admin"
              icon={Shield}
              label={t("adminCenter")}
              isActive={pathname === "/admin" || pathname.startsWith("/admin/")}
              collapsed={collapsed}
            />
            {!collapsed && (
              <div className="mt-1 space-y-0.5 pl-3">
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
            )}
          </div>
        )}
      </nav>
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-sidebar-border bg-background/95 backdrop-blur-md">
      <div className="flex overflow-x-auto px-1 py-1.5 scrollbar-none">
        {items.map((item) => {
          const isActive = isPathActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate max-w-[56px]">{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
