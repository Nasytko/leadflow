import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pb-16 lg:pb-0">
        <Header />
        <main className="flex-1 app-mesh-bg p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
