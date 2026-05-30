import { CourseApplicationsClient } from "./course-applications-client";
import { getAppData } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export default async function CourseApplicationsPage() {
  const data = await getAppData();

  return (
    <CourseApplicationsClient
      applications={data.courseApplications}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
