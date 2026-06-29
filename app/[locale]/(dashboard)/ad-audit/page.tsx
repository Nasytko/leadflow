import { redirect } from "next/navigation";

export default async function AdAuditRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/meta/audit`);
}
