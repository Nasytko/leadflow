export type ApiErrorPayload = {
  code?: string;
  message?: string;
};

export type FacebookActionContext = {
  connected: boolean;
  tokenInvalid?: boolean;
  facebookBroken?: boolean;
  totalPagesCount: number;
  totalFormsCount: number;
  activeFormsCount: number;
};

export type FacebookActionId =
  | "refresh"
  | "syncPages"
  | "syncForms"
  | "importLeads"
  | "syncAdAccounts"
  | "testLead"
  | "reconnect"
  | "disconnect";

export {
  mapConnectionApiError,
  mapFacebookSyncErrorMessage,
} from "./action-errors";

export { getFacebookActionDisabledReason } from "./facebook-actions";
