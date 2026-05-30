import { StudentClient } from "./student-client";
import { getAppData } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const data = await getAppData();
  const member = data.members.find((item) => item.id === data.viewer.memberId) ?? null;
  const schedules = data.schedules.filter((item) => item.memberId === data.viewer.memberId);
  const attendanceLogs = data.attendanceLogs.filter((item) => item.memberId === data.viewer.memberId);
  const bookingRequests = data.bookingRequests.filter((item) => item.memberId === data.viewer.memberId);
  const courseApplications = data.courseApplications.filter((item) => item.memberId === data.viewer.memberId);

  return (
    <StudentClient
      attendanceLogs={attendanceLogs}
      bookingRequests={bookingRequests}
      courseApplications={courseApplications}
      member={member}
      products={data.products}
      schedules={schedules}
      slots={data.availabilitySlots}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
