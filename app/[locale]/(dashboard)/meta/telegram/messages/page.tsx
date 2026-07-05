import { redirect } from "next/navigation";

export default async function MetaTelegramMessagesRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/connections/telegram`);
}
