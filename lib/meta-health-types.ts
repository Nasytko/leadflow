import type { HealthLevel } from "@/lib/dashboard-health";

export type MetaOverallStatus = "healthy" | "needs_attention" | "critical";

export type MetaHealthCheck = {
  id: string;
  status: HealthLevel;
  titleKey: string;
  meaningKey: string;
  actionKey: string;
  detail?: string | null;
  lastCheckedAt: string;
  fixHref?: string;
  fixLabelKey?: string;
  critical?: boolean;
};

export type MetaHealthSection = {
  id: string;
  titleKey: string;
  status: HealthLevel;
  checks: MetaHealthCheck[];
  summary?: string | null;
};

export type MetaHealthAction = {
  id: string;
  labelKey: string;
  href?: string;
  apiAction?: string;
  variant?: "default" | "outline";
};

export type MetaHealthAdminDetails = {
  appId?: string | null;
  loginConfigId?: string | null;
  webhookVerifyTokenConfigured?: boolean;
  oauthUrl?: string | null;
  redirectUri?: string | null;
  webhookUrl?: string | null;
  recentSystemLogs?: Array<{
    id: string;
    level: string;
    action: string;
    message: string;
    createdAt: string;
  }>;
  graphResponses?: Record<string, unknown>;
};

export type MetaHealthReport = {
  overallStatus: MetaOverallStatus;
  overallTitleKey: string;
  overallDescriptionKey: string;
  checkedAt: string;
  isAdmin: boolean;
  showAdminDetails: boolean;
  sections: MetaHealthSection[];
  actions: MetaHealthAction[];
  deployment: {
    status: HealthLevel;
    checks: MetaHealthCheck[];
  };
  admin?: MetaHealthAdminDetails | null;
  selfTestDurationMs?: number;
};
