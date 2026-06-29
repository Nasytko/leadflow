"use client";

import { MetaCenterNav } from "@/components/meta-center/meta-center-nav";
import { MetaHelpTip } from "@/components/meta-center/meta-help-tip";

export function MetaSectionShell({
  title,
  description,
  helpKey,
  children,
}: {
  title: string;
  description?: string;
  helpKey?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {helpKey && <MetaHelpTip tipKey={helpKey} />}
        </div>
        {description && (
          <p className="text-muted-foreground mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      <MetaCenterNav />
      {children}
    </div>
  );
}
