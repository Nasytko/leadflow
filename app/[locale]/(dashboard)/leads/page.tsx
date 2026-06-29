import { redirect } from "next/navigation";

export default async function LeadsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/meta/leads`);
}
