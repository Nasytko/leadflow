"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function ConnectionHelpTip({ tipKey }: { tipKey: string }) {
  const t = useTranslations("connections.shared.help");
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex text-muted-foreground hover:text-foreground"
            aria-label="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">{t(tipKey)}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
