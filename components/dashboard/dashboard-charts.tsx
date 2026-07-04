"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#6C5CE7", "#A78BFA", "#94A3B8", "#CBD5E1", "#64748B", "#475569"];
const PRIMARY = "#6C5CE7";
const SECONDARY = "#34D399";

export function DashboardLineChart({
  data,
  className,
  height = 240,
  secondaryData,
}: {
  data: Array<{ date: string; value: number }>;
  className?: string;
  height?: number;
  secondaryData?: Array<{ date: string; value: number }>;
}) {
  const { path, areaPath, secondaryPath, max } = useMemo(() => {
    if (!data.length) return { path: "", areaPath: "", secondaryPath: "", max: 1 };
    const values = [
      ...data.map((d) => d.value),
      ...(secondaryData?.map((d) => d.value) ?? []),
    ];
    const maxVal = Math.max(...values, 1);
    const w = 100;
    const h = 100;

    const buildPath = (series: Array<{ date: string; value: number }>) => {
      const pts = series.map((d, i) => {
        const x = series.length === 1 ? 50 : (i / (series.length - 1)) * w;
        const y = h - (d.value / maxVal) * (h - 10) - 5;
        return { x, y };
      });
      return pts.reduce((acc, p, i, arr) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = arr[i - 1];
        const cpx = (prev.x + p.x) / 2;
        return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
      }, "");
    };

    const pts = data.map((d, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * w;
      const y = h - (d.value / maxVal) * (h - 10) - 5;
      return { x, y };
    });
    const smooth = buildPath(data);
    const area = `${smooth} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
    const sec =
      secondaryData && secondaryData.length > 0 ? buildPath(secondaryData) : "";

    return { path: smooth, areaPath: area, secondaryPath: sec, max: maxVal };
  }, [data, secondaryData]);

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
          <linearGradient id="orvixLineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY} stopOpacity="0.14" />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#orvixLineFill)" />
        {secondaryPath && (
          <path
            d={secondaryPath}
            fill="none"
            stroke={SECONDARY}
            strokeWidth="1.25"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            opacity={0.85}
          />
        )}
        <path
          d={path}
          fill="none"
          stroke={PRIMARY}
          strokeWidth="1.75"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between type-caption px-0.5">
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
  centerLabel,
}: {
  data: Array<{ name: string; count: number; pct: number }>;
  className?: string;
  centerLabel?: string;
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
    <div className={cn("flex flex-col items-center gap-8 sm:flex-row sm:gap-10", className)}>
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth="2.5"
          />
          {segments.map((s) => (
            <circle
              key={s.name}
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${s.dash} ${100 - s.dash}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{total}</span>
          <span className="type-caption mt-0.5">{centerLabel ?? "leads"}</span>
        </div>
      </div>
      <ul className="w-full flex-1 space-y-3">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="type-body truncate">{s.name}</span>
            </span>
            <span className="type-caption tabular-nums shrink-0 font-medium">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
