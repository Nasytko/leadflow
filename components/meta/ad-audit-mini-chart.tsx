"use client";

import { cn } from "@/lib/utils";

type Point = { date: string; value: number };

export function AdAuditMiniChart({
  title,
  data,
  valueSuffix = "",
  formatValue,
  emptyLabel,
  color = "#1877F2",
}: {
  title: string;
  data: Point[];
  valueSuffix?: string;
  formatValue?: (v: number) => string;
  emptyLabel: string;
  color?: string;
}) {
  const points = data.filter((d) => d.date);
  if (points.length < 2) {
    return (
      <div className="rounded-2xl border p-4 h-40 flex items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 0.0001);
  const fmt = formatValue ?? ((v: number) => `${v.toFixed(1)}${valueSuffix}`);

  return (
    <div className="rounded-2xl border p-4">
      <p className="text-sm font-medium mb-3">{title}</p>
      <div className="flex items-end gap-1 h-28">
        {points.map((p) => {
          const h = Math.max(4, (p.value / max) * 100);
          return (
            <div
              key={p.date}
              className="flex-1 min-w-0 group relative flex flex-col justify-end"
              title={`${p.date}: ${fmt(p.value)}`}
            >
              <div
                className={cn("w-full rounded-t transition-all")}
                style={{ height: `${h}%`, backgroundColor: color, opacity: 0.85 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
        <span>{points[0]?.date.slice(5)}</span>
        <span>{points[points.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}
