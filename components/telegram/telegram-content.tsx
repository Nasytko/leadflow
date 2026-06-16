"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";

export function TelegramContent() {
  const t = useTranslations("telegram");
  const tCommon = useTranslations("common");
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [notificationLocale, setNotificationLocale] = useState("ru");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);
    fetch("/api/telegram", { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.connected) {
          setChatId(res.data.chatId);
          setNotificationLocale(res.data.notificationLocale);
        }
      })
      .catch(() => toast.error(tCommon("error")))
      .finally(() => {
        clearTimeout(id);
        setLoading(false);
      });
  }, [tCommon]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botToken, chatId, notificationLocale }),
    });
    const data = await res.json();
    if (data.data?.connected) {
      toast.success(t("connectionSaved"));
    } else {
      toast.error(data.error?.message ?? tCommon("error"));
    }
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    const res = await fetch("/api/telegram/test", { method: "POST" });
    const data = await res.json();
    if (data.data?.sent) {
      toast.success(t("testSuccess"));
    } else {
      toast.error(t("testFailed"));
    }
    setTesting(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={Send} gradient>
        <Button variant="outline" size="sm" asChild className="rounded-xl">
          <Link href="/wiki">
            <BookOpen className="h-4 w-4 mr-2" />
            {t("openWiki")}
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Telegram Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="botToken">{t("botToken")}</Label>
            <Input
              id="botToken"
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456:ABC-DEF..."
            />
            <p className="text-xs text-muted-foreground">{t("botTokenHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatId">{t("chatId")}</Label>
            <Input
              id="chatId"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="-1001234567890"
            />
            <p className="text-xs text-muted-foreground">{t("chatIdHint")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("notificationLocale")}</Label>
            <Select value={notificationLocale} onValueChange={setNotificationLocale}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving || !botToken || !chatId}>
              {t("saveConnection")}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {t("sendTest")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("howToGetChatId")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. {t("howToStep1")}</p>
          <p>2. {t("howToStep2")}</p>
          <p>3. {t("howToStep3")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
