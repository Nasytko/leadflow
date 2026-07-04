"use client";

import { MetaHelpTip } from "@/components/meta-center/meta-help-tip";

export function ConnectionPageShell({
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
    <div className="mx-auto max-w-[1080px] space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="type-display">{title}</h1>
          {helpKey && <MetaHelpTip tipKey={helpKey} />}
        </div>
        {description && (
          <p className="type-body text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
