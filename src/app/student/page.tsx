import { StudentClient } from "./student-client";
import { getStudentPageData } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const data = await getStudentPageData();

  return (
    <StudentClient
      attendanceLogs={data.attendanceLogs}
      bookingRequests={data.bookingRequests}
      courseApplications={data.courseApplications}
      member={data.member}
      products={data.products}
      schedules={data.schedules}
      slots={data.availabilitySlots}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
