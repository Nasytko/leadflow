import { redirect } from "next/navigation";

export default async function FacebookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/meta/connect`);
}
