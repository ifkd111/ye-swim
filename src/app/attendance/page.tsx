import { getAppData } from "@/lib/data-source";
import { AttendanceClient } from "./attendance-client";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const data = await getAppData();

  return <AttendanceClient dataMode={data.mode} initialLogs={data.attendanceLogs} viewerName={data.viewer.fullName} viewerRole={data.viewer.role} />;
}
