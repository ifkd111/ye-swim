import { getSchedulePageData } from "@/lib/data-source";
import { ScheduleClient } from "./schedule-client";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const data = await getSchedulePageData();

  return (
    <ScheduleClient
      dataMode={data.mode}
      initialAttendance={data.attendanceLogs}
      initialMembers={data.members}
      initialSchedules={data.schedules}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
