"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { LeadsChartDay } from "@/lib/dashboard-analytics";

const PRIMARY = "#6C5CE7";

export function LeadFlowChart({
  data,
  className,
  height = 280,
}: {
  data: LeadsChartDay[];
  className?: string;
  height?: number;
}) {
  const t = useTranslations("dashboard.chart");
  const locale = useLocale();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { path, areaPath, points, max } = useMemo(() => {
    if (!data.length) return { path: "", areaPath: "", points: [] as { x: number; y: number }[], max: 1 };
    const maxVal = Math.max(...data.map((d) => d.total), 1);
    const w = 100;
    const h = 100;
    const pts = data.map((d, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * w;
      const y = h - (d.total / maxVal) * (h - 10) - 5;
      return { x, y };
    });
    const smooth = pts.reduce((acc, p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = arr[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
    }, "");
    const area = `${smooth} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
    return { path: smooth, areaPath: area, points: pts, max: maxVal };
  }, [data]);

  const active = hoverIndex != null ? data[hoverIndex] : data[data.length - 1];

  if (!data.length) {
    return (
      <div className={cn("flex items-center justify-center type-caption text-muted-foreground", className)} style={{ height }}>
        —
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      {active && (
        <div className="mb-4 rounded-xl border bg-muted/30 px-4 py-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="type-caption text-muted-foreground">{t("tooltipTime")}</p>
            <p className="type-body font-medium">
              {new Date(active.date).toLocaleDateString(locale, { month: "short", day: "numeric" })}
            </p>
          </div>
          <div>
            <p className="type-caption text-muted-foreground">{t("tooltipTotal")}</p>
            <p className="type-body font-medium tabular-nums">{active.total}</p>
          </div>
          <div>
            <p className="type-caption text-muted-foreground">{t("tooltipSource")}</p>
            <p className="type-body text-sm">
              {t("sourceMix", {
                facebook: active.facebook,
                webhook: active.webhook,
                import: active.import,
              })}
            </p>
          </div>
          <div>
            <p className="type-caption text-muted-foreground">{t("tooltipDelivery")}</p>
            <p className="type-body text-sm">
              {t("deliveryMix", { delivered: active.delivered, failed: active.failed })}
            </p>
          </div>
          {(active.topForm || active.topCampaign) && (
            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-x-6 gap-y-1 type-caption text-muted-foreground">
              {active.topForm && (
                <span>
                  {t("tooltipForm")}: <span className="text-foreground">{active.topForm}</span>
                </span>
              )}
              {active.topCampaign && (
                <span>
                  {t("tooltipCampaign")}: <span className="text-foreground">{active.topCampaign}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="relative" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full cursor-crosshair"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="leadFlowFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity="0.16" />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#leadFlowFill)" />
          <path
            d={path}
            fill="none"
            stroke={PRIMARY}
            strokeWidth="1.75"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <rect
              key={data[i].date}
              x={i === 0 ? 0 : (points[i - 1].x + p.x) / 2}
              y={0}
              width={
                i === 0
                  ? data.length === 1
                    ? 100
                    : (p.x + points[1]?.x) / 2
                  : i === points.length - 1
                  ? 100 - (points[i - 1].x + p.x) / 2
                  : (points[i + 1].x - points[i - 1].x) / 2
              }
              height={100}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
          {hoverIndex != null && points[hoverIndex] && (
            <>
              <line
                x1={points[hoverIndex].x}
                y1={0}
                x2={points[hoverIndex].x}
                y2={100}
                stroke={PRIMARY}
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
                opacity={0.4}
              />
              <circle
                cx={points[hoverIndex].x}
                cy={points[hoverIndex].y}
                r="2.5"
                fill={PRIMARY}
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between type-caption text-muted-foreground px-0.5">
          <span>{data[0]?.date.slice(5)}</span>
          <span>{data[data.length - 1]?.date.slice(5)}</span>
        </div>
      </div>
      <p className="sr-only">Max: {max}</p>
    </div>
  );
}
