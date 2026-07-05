import { redirect } from "next/navigation";

export default async function LogsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/activity`);
}
