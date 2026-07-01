"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#1D4ED8",
  "#64748B",
];

export function DashboardLineChart({
  data,
  className,
  height = 200,
}: {
  data: Array<{ date: string; value: number }>;
  className?: string;
  height?: number;
}) {
  const { path, areaPath, points, max } = useMemo(() => {
    if (!data.length) return { path: "", areaPath: "", points: [], max: 1 };
    const values = data.map((d) => d.value);
    const maxVal = Math.max(...values, 1);
    const w = 100;
    const h = 100;
    const pts = data.map((d, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * w;
      const y = h - (d.value / maxVal) * (h - 8) - 4;
      return { x, y, ...d };
    });
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const area = `${line} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
    return { path: line, areaPath: area, points: pts, max: maxVal };
  }, [data]);

  if (!data.length) {
    return (
      <div className={cn("flex items-center justify-center text-sm text-muted-foreground", className)} style={{ height }}>
        —
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lineFill)" />
        <path d={path} fill="none" stroke="#2563EB" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground px-1">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
      <p className="sr-only">Max: {max}</p>
    </div>
  );
}

export function DashboardDonutChart({
  data,
  className,
}: {
  data: Array<{ name: string; count: number; pct: number }>;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) {
    return <p className={cn("text-sm text-muted-foreground text-center py-8", className)}>—</p>;
  }

  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = d.count / total;
    const dash = pct * 100;
    const seg = { ...d, dash, offset, color: CHART_COLORS[i % CHART_COLORS.length] };
    offset += dash;
    return seg;
  });

  return (
    <div className={cn("flex flex-col sm:flex-row items-center gap-6", className)}>
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
          {segments.map((s) => (
            <circle
              key={s.name}
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke={s.color}
              strokeWidth="3"
              strokeDasharray={`${s.dash} ${100 - s.dash}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{total}</span>
          <span className="text-[10px] text-muted-foreground">leads</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-sm w-full">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="truncate">{s.name}</span>
            </span>
            <span className="text-muted-foreground shrink-0">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
