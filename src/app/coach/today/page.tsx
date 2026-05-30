import { getCoachTodayPageData } from "@/lib/data-source";
import { CoachTodayClient } from "./coach-today-client";

export const dynamic = "force-dynamic";

export default async function CoachTodayPage() {
  const data = await getCoachTodayPageData();

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
