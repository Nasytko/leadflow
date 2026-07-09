import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const localeSegment = ":locale(ru|en)";

/** Legacy LeadFlow / Meta Center paths → canonical ORVIX routes (query string preserved). */
const legacyRedirects = [
  { source: `/${localeSegment}/meta`, destination: `/${localeSegment}/dashboard` },
  { source: `/${localeSegment}/meta/connect`, destination: `/${localeSegment}/connections/facebook` },
  { source: `/${localeSegment}/meta/telegram`, destination: `/${localeSegment}/connections/telegram` },
  { source: `/${localeSegment}/meta/telegram/messages`, destination: `/${localeSegment}/connections/telegram` },
  { source: `/${localeSegment}/meta/webhook`, destination: `/${localeSegment}/connections/webhook` },
  { source: `/${localeSegment}/meta/leads`, destination: `/${localeSegment}/leads` },
  { source: `/${localeSegment}/meta/audit`, destination: `/${localeSegment}/analytics` },
  { source: `/${localeSegment}/meta/health`, destination: `/${localeSegment}/health` },
  { source: `/${localeSegment}/meta/diagnostics`, destination: `/${localeSegment}/health` },
  { source: `/${localeSegment}/meta/forms`, destination: `/${localeSegment}/connections/facebook` },
  { source: `/${localeSegment}/meta/pages`, destination: `/${localeSegment}/connections/facebook` },
  { source: `/${localeSegment}/meta/businesses`, destination: `/${localeSegment}/connections/facebook` },
  { source: `/${localeSegment}/meta/ad-accounts`, destination: `/${localeSegment}/connections/facebook` },
  { source: `/${localeSegment}/facebook`, destination: `/${localeSegment}/connections/facebook` },
  { source: `/${localeSegment}/facebook/health`, destination: `/${localeSegment}/health` },
  { source: `/${localeSegment}/telegram`, destination: `/${localeSegment}/connections/telegram` },
  { source: `/${localeSegment}/forms`, destination: `/${localeSegment}/connections/facebook` },
  { source: `/${localeSegment}/logs`, destination: `/${localeSegment}/activity` },
  { source: `/${localeSegment}/ad-audit`, destination: `/${localeSegment}/analytics` },
].map((r) => ({ ...r, permanent: true }));

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return legacyRedirects;
  },
};

export default withNextIntl(nextConfig);
