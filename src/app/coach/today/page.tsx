import { getAppData } from "@/lib/data-source";
import { CoachTodayClient } from "./coach-today-client";

export const dynamic = "force-dynamic";

export default async function CoachTodayPage() {
  const data = await getAppData();

  return (
    <CoachTodayClient
      dataMode={data.mode}
      initialAttendance={data.attendanceLogs}
      initialSchedules={data.schedules}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
