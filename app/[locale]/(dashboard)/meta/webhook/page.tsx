import { redirect } from "next/navigation";

function buildQuery(searchParams: Record<string, string | string[] | undefined>) {
  const q = new URLSearchParams();
  if (typeof searchParams.step === "string") q.set("step", searchParams.step);
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

export default async function MetaWebhookRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  redirect(`/${locale}/connections/webhook${buildQuery(sp)}`);
}
