import { redirect } from "next/navigation";

export default async function MetaHealthRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/health`);
}
