"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Send,
} from "lucide-react";
import { ConnectionPageShell } from "@/components/features/connections/connection-page-shell";
import { SetupStepper } from "@/components/features/connections/setup-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import {
  TELEGRAM_SETUP_STEPS,
  resolveTelegramSetupState,
  mapTelegramErrorHint,
  type TelegramSetupStepId,
} from "@/lib/connections/telegram-setup-state";
import { useTelegramActions, type TelegramConnectionStatus } from "@/hooks/use-telegram-actions";
import { TelegramIntelligenceDashboard } from "@/components/features/telegram/telegram-intelligence-dashboard";
import { useLocale } from "next-intl";

type TelegramStatus = TelegramConnectionStatus;

export function TelegramSetupFlow() {
  const t = useTranslations("connections.telegram");
  const tTelegram = useTranslations("telegram");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step") as TelegramSetupStepId | null;

  const [connStatus, setConnStatus] = useState<TelegramStatus | null>(null);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [notificationLocale, setNotificationLocale] = useState("ru");
  const [manualStepIndex, setManualStepIndex] = useState<number | null>(null);
  const [forceSetup, setForceSetup] = useState(false);

  const applyStatus = useCallback((status: TelegramStatus) => {
    setConnStatus(status);
    if (status.chatId) setChatId(status.chatId);
    if (status.notificationLocale) setNotificationLocale(status.notificationLocale);
  }, []);

  const { loading, saving, testing, loadStatus, saveConnection, sendTest } =
    useTelegramActions(applyStatus);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const setupInput = connStatus
    ? {
        status: connStatus.status,
        hasChatId: !!connStatus.chatId,
        verified: !!connStatus.verified,
        lastError: connStatus.lastError,
      }
    : null;

  const setupState = setupInput ? resolveTelegramSetupState(setupInput) : null;

  const resolvedIndex =
    stepParam && TELEGRAM_SETUP_STEPS.includes(stepParam)
      ? TELEGRAM_SETUP_STEPS.indexOf(stepParam)
      : (setupState?.stepIndex ?? 0);

  const activeIndex = manualStepIndex ?? resolvedIndex;
  const activeStepId = TELEGRAM_SETUP_STEPS[activeIndex] ?? "botfather";

  const stepItems =
    setupState?.stepStatuses
      ? TELEGRAM_SETUP_STEPS.map((id) => ({
          id,
          label: t(`steps.${id}`),
          status: setupState.stepStatuses[id],
        }))
      : [];

  const errorHintKey = mapTelegramErrorHint(connStatus?.lastError);

  async function handleSave() {
    const result = await saveConnection({ botToken, chatId, notificationLocale });
    if (result.ok) {
      setManualStepIndex(TELEGRAM_SETUP_STEPS.indexOf("test"));
    } else {
      await loadStatus();
    }
  }

  async function handleTest() {
    const result = await sendTest();
    if (result.ok) {
      setManualStepIndex(TELEGRAM_SETUP_STEPS.indexOf("complete"));
    }
  }

  const showSummary = setupState?.isComplete && connStatus?.connected && !forceSetup;

  if (loading && !connStatus) {
    return (
      <ConnectionPageShell title={t("title")} description={t("description")}>
        <Skeleton className="h-56 w-full rounded-lg" />
      </ConnectionPageShell>
    );
  }

  return (
    <ConnectionPageShell title={t("title")} description={t("description")} helpKey="telegram">
      {showSummary && connStatus ? (
        <TelegramIntelligenceDashboard
          status={connStatus}
          onSendTest={handleTest}
          testing={testing}
          onUpdateToken={() => {
            setForceSetup(true);
            setManualStepIndex(TELEGRAM_SETUP_STEPS.indexOf("token"));
          }}
          onUpdateChat={() => {
            setForceSetup(true);
            setManualStepIndex(TELEGRAM_SETUP_STEPS.indexOf("chat"));
          }}
        />
      ) : (
        <div className="space-y-8">
          <div className="hidden md:block">
            <SetupStepper
              steps={stepItems}
              activeIndex={activeIndex}
              totalLabel={t("stepProgress", {
                current: activeIndex + 1,
                total: TELEGRAM_SETUP_STEPS.length,
              })}
              onStepClick={(i) => setManualStepIndex(i)}
            />
          </div>
          <div className="md:hidden">
            <SetupStepper
              compact
              steps={stepItems}
              activeIndex={activeIndex}
              totalLabel={t("stepProgress", {
                current: activeIndex + 1,
                total: TELEGRAM_SETUP_STEPS.length,
              })}
            />
          </div>

          <div className="surface px-6 py-8 sm:px-8 min-h-[200px] space-y-6">
            {activeStepId === "botfather" && (
              <div className="space-y-4">
                <p className="type-body text-muted-foreground">{t("stepsDesc.botfather")}</p>
                <ol className="type-body text-muted-foreground list-decimal pl-5 space-y-2">
                  <li>{tTelegram("howToStep1")}</li>
                  <li>{tTelegram("howToStep2")}</li>
                  <li>{tTelegram("howToStep3")}</li>
                </ol>
                <Button variant="outline" className="min-h-11" asChild>
                  <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">
                    @BotFather
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            )}

            {activeStepId === "token" && (
              <div className="space-y-4 max-w-lg">
                <p className="type-body text-muted-foreground">{t("stepsDesc.token")}</p>
                <div className="space-y-2">
                  <Label htmlFor="botToken">{tTelegram("botToken")}</Label>
                  <Input
                    id="botToken"
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456:ABC-DEF..."
                    className="min-h-11"
                  />
                  <p className="type-caption text-muted-foreground">{tTelegram("botTokenHint")}</p>
                </div>
                <div className="space-y-2">
                  <Label>{tTelegram("notificationLocale")}</Label>
                  <Select value={notificationLocale} onValueChange={setNotificationLocale}>
                    <SelectTrigger className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {activeStepId === "chat" && (
              <div className="space-y-4 max-w-lg">
                <p className="type-body text-muted-foreground">{t("stepsDesc.chat")}</p>
                <div className="space-y-2">
                  <Label htmlFor="chatId">{tTelegram("chatId")}</Label>
                  <Input
                    id="chatId"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="-1001234567890"
                    className="min-h-11"
                  />
                  <p className="type-caption text-muted-foreground">{tTelegram("chatIdHint")}</p>
                </div>
                <Button
                  className="min-h-11 w-full sm:w-auto"
                  disabled={saving || !botToken || !chatId}
                  onClick={() => void handleSave()}
                >
                  {tTelegram("saveConnection")}
                </Button>
              </div>
            )}

            {activeStepId === "test" && (
              <div className="space-y-4">
                <p className="type-body text-muted-foreground">{t("stepsDesc.test")}</p>
                {connStatus?.lastError && (
                  <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="type-body text-destructive">{connStatus.lastError}</p>
                    </div>
                    {errorHintKey && (
                      <p className="type-caption text-muted-foreground pl-6 whitespace-pre-line">
                        {t(`errors.${errorHintKey}`)}
                      </p>
                    )}
                  </div>
                )}
                <Button
                  className="min-h-11"
                  disabled={testing || connStatus?.status !== "connected"}
                  onClick={() => void handleTest()}
                >
                  {tTelegram("sendTest")}
                </Button>
                {connStatus?.status !== "connected" && (
                  <p className="type-caption text-muted-foreground">{t("saveBeforeTest")}</p>
                )}
              </div>
            )}

            {activeStepId === "complete" && (
              <div className="text-center space-y-4 py-8">
                <StatusBadge status="ok" label={t("steps.complete")} />
                <p className="type-body text-muted-foreground">{t("completeDesc")}</p>
                <Button asChild className="min-h-11">
                  <Link href="/dashboard">{t("goMissionControl")}</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="flex md:hidden justify-between gap-3">
            <Button
              variant="outline"
              className="min-h-11 flex-1"
              disabled={activeIndex <= 0}
              onClick={() => setManualStepIndex(Math.max(0, activeIndex - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("back")}
            </Button>
            <Button
              className="min-h-11 flex-1"
              disabled={activeIndex >= TELEGRAM_SETUP_STEPS.length - 1}
              onClick={() =>
                setManualStepIndex(Math.min(TELEGRAM_SETUP_STEPS.length - 1, activeIndex + 1))
              }
            >
              {t("next")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </ConnectionPageShell>
  );
}
