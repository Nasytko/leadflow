"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-[130px] h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">
          <span className="flex items-center gap-2"><Sun className="h-3 w-3" />{t("light")}</span>
        </SelectItem>
        <SelectItem value="dark">
          <span className="flex items-center gap-2"><Moon className="h-3 w-3" />{t("dark")}</span>
        </SelectItem>
        <SelectItem value="system">
          <span className="flex items-center gap-2"><Monitor className="h-3 w-3" />{t("system")}</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
