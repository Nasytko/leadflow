import { redirect } from "next/navigation";

export default async function MetaPagesRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/connections/facebook`);
}
