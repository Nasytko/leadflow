import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/ru/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, locale: true },
  });

  if (!user?.isAdmin) {
    redirect(`/${user?.locale ?? "ru"}/dashboard`);
  }

  return <AdminShell>{children}</AdminShell>;
}
