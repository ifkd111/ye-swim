import { getAppData } from "@/lib/data-source";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getAppData();

  return (
    <DashboardClient
      dataMode={data.mode}
      initialAttendance={data.attendanceLogs}
      initialMembers={data.members}
      initialSchedules={data.schedules}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
