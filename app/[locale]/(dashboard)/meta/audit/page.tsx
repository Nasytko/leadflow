import { redirect } from "next/navigation";

export default async function MetaAuditRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/analytics`);
}
