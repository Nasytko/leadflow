export type AdAuditPeriodId =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_30d"
  | "this_month"
  | "last_month"
  | "all_time"
  | "custom";

export type ResolvedAdAuditPeriod = {
  id: AdAuditPeriodId;
  since: string;
  until: string;
  metaPreset?: string;
  labelKey: string;
  /** Previous period of equal length for comparison */
  previousSince: string;
  previousUntil: string;
  previousMetaPreset?: string;
};

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function daysBetween(since: string, until: string): number {
  const a = new Date(since);
  const b = new Date(until);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

function previousRange(since: string, until: string): {
  previousSince: string;
  previousUntil: string;
} {
  const len = daysBetween(since, until);
  const prevUntil = addDays(new Date(since), -1);
  const prevSince = addDays(prevUntil, -(len - 1));
  return { previousSince: fmt(prevSince), previousUntil: fmt(prevUntil) };
}

export function resolveAdAuditPeriod(
  periodId: string,
  custom?: { dateFrom?: string; dateTo?: string }
): ResolvedAdAuditPeriod {
  const now = new Date();
  const today = startOfDay(now);

  if (periodId === "custom" && custom?.dateFrom && custom?.dateTo) {
    const since = custom.dateFrom.slice(0, 10);
    const until = custom.dateTo.slice(0, 10);
    const prev = previousRange(since, until);
    return {
      id: "custom",
      since,
      until,
      labelKey: "periodCustom",
      ...prev,
    };
  }

  switch (periodId as AdAuditPeriodId) {
    case "today": {
      const since = fmt(today);
      const until = fmt(today);
      const yesterday = addDays(today, -1);
      return {
        id: "today",
        since,
        until,
        metaPreset: "today",
        labelKey: "periodToday",
        previousSince: fmt(yesterday),
        previousUntil: fmt(yesterday),
        previousMetaPreset: "yesterday",
      };
    }
    case "yesterday": {
      const y = addDays(today, -1);
      const since = fmt(y);
      const until = fmt(y);
      const dayBefore = addDays(y, -1);
      return {
        id: "yesterday",
        since,
        until,
        metaPreset: "yesterday",
        labelKey: "periodYesterday",
        previousSince: fmt(dayBefore),
        previousUntil: fmt(dayBefore),
      };
    }
    case "last_30d": {
      const since = fmt(addDays(today, -29));
      const until = fmt(today);
      const prev = previousRange(since, until);
      return {
        id: "last_30d",
        since,
        until,
        metaPreset: "last_30d",
        labelKey: "period30d",
        ...prev,
      };
    }
    case "this_month": {
      const since = fmt(startOfMonth(today));
      const until = fmt(today);
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        id: "this_month",
        since,
        until,
        metaPreset: "this_month",
        labelKey: "periodThisMonth",
        previousSince: fmt(prevMonth),
        previousUntil: fmt(endOfMonth(prevMonth)),
        previousMetaPreset: "last_month",
      };
    }
    case "last_month": {
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const since = fmt(prevMonth);
      const until = fmt(endOfMonth(prevMonth));
      const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      return {
        id: "last_month",
        since,
        until,
        metaPreset: "last_month",
        labelKey: "periodLastMonth",
        previousSince: fmt(twoMonthsAgo),
        previousUntil: fmt(endOfMonth(twoMonthsAgo)),
      };
    }
    case "all_time":
      return {
        id: "all_time",
        since: fmt(addDays(today, -365)),
        until: fmt(today),
        metaPreset: "maximum",
        labelKey: "periodAllTime",
        previousSince: fmt(addDays(today, -730)),
        previousUntil: fmt(addDays(today, -366)),
      };
    case "last_7d":
    default: {
      const since = fmt(addDays(today, -6));
      const until = fmt(today);
      const prev = previousRange(since, until);
      return {
        id: "last_7d",
        since,
        until,
        metaPreset: "last_7d",
        labelKey: "period7d",
        ...prev,
      };
    }
  }
}

export function buildInsightsTimeQuery(period: ResolvedAdAuditPeriod): string {
  if (period.metaPreset) {
    return `&date_preset=${period.metaPreset}`;
  }
  return `&time_range={"since":"${period.since}","until":"${period.until}"}`;
}

export function formatPeriodRangeLabel(
  since: string,
  until: string,
  locale: string
): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const loc = locale.startsWith("en") ? "en-US" : "ru-RU";
  const from = new Date(since).toLocaleDateString(loc, opts);
  const to = new Date(until).toLocaleDateString(loc, opts);
  if (since === until) return from;
  return `${from} – ${to}`;
}
