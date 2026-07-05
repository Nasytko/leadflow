import { redirect } from "next/navigation";

export default async function MetaLeadsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/leads`);
}
