import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AppFooter } from "@/components/layout/footer";
import { CsrfProvider } from "@/components/providers/csrf-provider";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
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
    select: { status: true, locale: true },
  });

  if (!user) redirect("/ru/login");

  if (user.status === "pending_email_verification") {
    redirect(`/${user.locale}/verify-email`);
  }
  if (user.status === "pending_approval") {
    redirect(`/${user.locale}/pending-approval`);
  }
  if (user.status === "blocked") {
    redirect(`/${user.locale}/login?error=account_blocked`);
  }

  return (
    <CsrfProvider>
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pb-16 lg:pb-0 min-h-screen">
        <Header />
        <main className="flex-1 app-shell-bg px-6 py-10 sm:px-8 lg:px-12 lg:py-14 overflow-x-hidden">{children}</main>
        <AppFooter />
      </div>
      <MobileNav />
    </div>
    </CsrfProvider>
  );
}
