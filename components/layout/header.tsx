"use client";

import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const t = useTranslations("nav");
  const { data: session } = useSession();
  const router = useRouter();

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
    <header className="sticky top-0 z-40 flex h-12 items-center justify-end gap-1 border-b border-border/60 bg-background/90 px-5 sm:px-8 backdrop-blur-sm">
      <LanguageSwitcher />
      <ThemeToggle />
      <div className="hidden md:flex items-center gap-2.5 pl-3 ml-2 border-l border-border/60">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full bg-foreground/[0.06] text-[11px] font-medium text-foreground/80"
          )}
        >
          {initials}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="h-8 w-8 text-muted-foreground"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.5} />
        <span className="sr-only">{t("logout")}</span>
      </Button>
    </header>
  );
}
