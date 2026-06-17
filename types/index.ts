export type ApiResponse<T> = {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type DashboardStats = {
  facebookConnected: boolean;
  facebookStatus: string;
  facebookLastError: string | null;
  facebookUserName: string | null;
  telegramConnected: boolean;
  telegramStatus: string;
  telegramLastError: string | null;
  metaConfigured: boolean;
  connectedPages: number;
  totalPages: number;
  activeForms: number;
  totalForms: number;
  failedFormsSync: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  totalLeads: number;
  deliveryLogsToday: number;
  failedDeliveriesToday: number;
  deliverySuccessRate: number | null;
  setupSteps: {
    facebookAccount: boolean;
    businessPortfolio: boolean;
    pagesSelected: boolean;
    formsEnabled: boolean;
    webhookVerified: boolean;
    telegram: boolean;
    testLead: boolean;
  };
  setupCompleted: number;
  setupTotal: number;
  webhookVerified: boolean;
  lastWebhookAt: string | null;
  lastWebhookStatus: string | null;
  lastWebhookError: string | null;
  failedWebhookEvents: number;
};

export type LeadField = {
  name: string;
  values: string[];
};

export type FacebookLeadData = {
  id: string;
  created_time: string;
  field_data: LeadField[];
};
