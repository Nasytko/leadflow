"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export type IntegrationStatusLevel = "ready" | "warning" | "error" | "not_configured";

export type IntegrationCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string | null;
  fixHref?: string | null;
};

function toStatusLevel(level: IntegrationStatusLevel): "ok" | "warning" | "error" | "unknown" {
  if (level === "ready") return "ok";
  if (level === "warning") return "warning";
  if (level === "error") return "error";
  return "unknown";
}

export function IntegrationStatusCard({
  title,
  statusLabel,
  statusLevel,
  checks,
  className,
}: {
  title: string;
  statusLabel: string;
  statusLevel: IntegrationStatusLevel;
  checks: IntegrationCheck[];
  className?: string;
}) {
  const primaryFixHref = useMemo(() => {
    const firstFail = checks.find((c) => !c.ok && c.fixHref);
    return firstFail?.fixHref ?? null;
  }, [checks]);

  return (
    <section className={cn("rounded-2xl border bg-card px-5 py-5 shadow-sm", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="type-title">{title}</h2>
          <p className="type-caption text-muted-foreground mt-1">{statusLabel}</p>
        </div>
        <StatusBadge status={toStatusLevel(statusLevel)} label={statusLabel} />
      </header>

      <ul className="mt-4 space-y-2">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("type-body", c.ok ? "text-foreground" : "text-foreground")}>
                {c.ok ? "✓ " : "○ "}
                {c.label}
              </p>
              {c.detail ? (
                <p className="type-caption text-muted-foreground mt-1 line-clamp-2">{c.detail}</p>
              ) : null}
            </div>
            {!c.ok && c.fixHref ? (
              <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
                <Link href={c.fixHref}>Fix now</Link>
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {primaryFixHref ? (
        <div className="mt-4">
          <Button asChild className="min-h-11">
            <Link href={primaryFixHref}>Fix now</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

