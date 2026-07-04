import { redirect } from "next/navigation";

export default async function TelegramRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/connections/telegram`);
}
