import { AdminLogsTable } from "@/components/admin/admin-platform-sections";

export default function AdminAuditLogPage() {
  return <AdminLogsTable endpoint="/api/admin/audit-log" tKey="adminCenter.auditLog" />;
}
