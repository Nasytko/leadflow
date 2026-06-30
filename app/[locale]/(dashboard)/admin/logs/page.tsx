import { AdminLogsTable } from "@/components/admin/admin-platform-sections";

export default function AdminLogsPage() {
  return <AdminLogsTable endpoint="/api/admin/logs" tKey="adminCenter.logs" />;
}
