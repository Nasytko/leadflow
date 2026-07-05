"use client";

import { ConnectionHelpTip } from "@/components/features/shared/connection-help-tip";

export function ConnectionPageShell({
  title,
  description,
  helpKey,
  children,
}: {
  title: string;
  description: string;
  helpKey?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="type-display">{title}</h1>
          {helpKey ? <ConnectionHelpTip tipKey={helpKey} /> : null}
        </div>
        <p className="type-body text-muted-foreground max-w-2xl">{description}</p>
      </header>
      {children}
    </div>
  );
}
