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
  telegramConnected: boolean;
  metaConfigured: boolean;
  connectedPages: number;
  totalPages: number;
  activeForms: number;
  totalForms: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  totalLeads: number;
  deliveryLogsToday: number;
  failedDeliveriesToday: number;
  deliverySuccessRate: number | null;
  setupSteps: {
    metaApp: boolean;
    facebookOAuth: boolean;
    pagesSelected: boolean;
    formsEnabled: boolean;
    telegram: boolean;
  };
  setupCompleted: number;
  setupTotal: number;
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
