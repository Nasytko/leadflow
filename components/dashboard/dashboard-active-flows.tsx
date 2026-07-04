"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Megaphone, Send, ArrowRight, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";

type FlowItem = {
  id: string;
  from: string;
  to: string;
  active: boolean;
  href: string;
  icon: React.ElementType;
  toIcon: React.ElementType;
};

export function DashboardActiveFlows({
  facebookConnected,
  telegramConnected,
  webhookVerified,
}: {
  facebookConnected: boolean;
  telegramConnected: boolean;
  webhookVerified: boolean;
}) {
  const t = useTranslations("dashboard");

  const flows: FlowItem[] = [
    {
      id: "fb-tg",
      from: t("flowFacebook"),
      to: t("flowTelegram"),
      active: facebookConnected && telegramConnected,
      href: "/connections/telegram",
      icon: Megaphone,
      toIcon: Send,
    },
    {
      id: "webhook",
      from: t("flowWebhook"),
      to: t("flowOrvix"),
      active: webhookVerified,
      href: "/connections/webhook",
      icon: Webhook,
      toIcon: ArrowRight,
    },
  ];

  return (
    <ul className="space-y-3">
      {flows.map((flow) => (
        <li key={flow.id}>
          <Link
            href={flow.href}
            className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/50 px-4 py-3.5 transition-colors hover:border-primary/25 hover:bg-primary/[0.03] min-h-[52px]"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <flow.icon className="h-4 w-4 shrink-0 text-primary/70" strokeWidth={1.5} />
              <span className="type-body truncate">{flow.from}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              <flow.toIcon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <span className="type-body truncate text-muted-foreground">{flow.to}</span>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                flow.active
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  flow.active ? "bg-emerald-500" : "bg-muted-foreground/40"
                )}
              />
              {flow.active ? t("pipelineActive") : t("pipelineSetup")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
