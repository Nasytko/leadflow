"use client";

import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { LogOut, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "dashboard",
  "/wiki": "wiki",
  "/facebook": "facebook",
  "/forms": "forms",
  "/telegram": "telegram",
  "/leads": "leads",
  "/logs": "logs",
  "/settings": "settings",
};

export function Header() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const pageKey = pageTitles[pathname];
  const pageTitle = pageKey ? t(pageKey) : tCommon("appName");

  async function handleLogout() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 min-w-0">
        <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            {tCommon("appName")}
          </Link>
          {pageKey && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground truncate">{pageTitle}</span>
            </>
          )}
        </div>
        <span className="sm:hidden font-semibold truncate">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border/60 ml-1">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
            )}
          >
            {initials}
          </div>
          <span className="text-sm text-muted-foreground max-w-[120px] truncate hidden lg:block">
            {session?.user?.name ?? session?.user?.email}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8">
          <LogOut className="h-4 w-4" />
          <span className="sr-only">{t("logout")}</span>
        </Button>
      </div>
    </header>
  );
}
