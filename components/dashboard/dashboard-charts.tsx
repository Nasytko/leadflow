"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#5e6ad2", "#8b95f5", "#a3a3a3", "#d4d4d4", "#737373", "#525252"];
const PRIMARY = "#5e6ad2";

export function DashboardLineChart({
  data,
  className,
  height = 240,
}: {
  data: Array<{ date: string; value: number }>;
  className?: string;
  height?: number;
}) {
  const { path, areaPath, max } = useMemo(() => {
    if (!data.length) return { path: "", areaPath: "", max: 1 };
    const values = data.map((d) => d.value);
    const maxVal = Math.max(...values, 1);
    const w = 100;
    const h = 100;
    const pts = data.map((d, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * w;
      const y = h - (d.value / maxVal) * (h - 10) - 5;
      return { x, y };
    });
    const smooth = pts.reduce((acc, p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = arr[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
    }, "");
    const area = `${smooth} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
    return { path: smooth, areaPath: area, max: maxVal };
  }, [data]);

  if (!data.length) {
    return (
      <div
        className={cn("flex items-center justify-center type-caption", className)}
        style={{ height }}
      >
        —
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="lbLineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY} stopOpacity="0.12" />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lbLineFill)" />
        <path
          d={path}
          fill="none"
          stroke={PRIMARY}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between type-label px-0.5">
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
    return <p className={cn("type-caption text-center py-8", className)}>—</p>;
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
    <div className={cn("flex flex-col items-center gap-10 sm:flex-row sm:gap-12", className)}>
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            className="text-border/80"
            strokeWidth="2"
          />
          {segments.map((s) => (
            <circle
              key={s.name}
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${s.dash} ${100 - s.dash}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-medium tracking-tight tabular-nums">{total}</span>
          <span className="type-label mt-0.5">leads</span>
        </div>
      </div>
      <ul className="w-full flex-1 space-y-3">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="type-body truncate">{s.name}</span>
            </span>
            <span className="type-caption tabular-nums shrink-0">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
