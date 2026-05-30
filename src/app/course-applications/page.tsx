import { CourseApplicationsClient } from "./course-applications-client";
import { getCourseApplicationsPageData } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export default async function CourseApplicationsPage() {
  const data = await getCourseApplicationsPageData();

  return (
    <CourseApplicationsClient
      applications={data.courseApplications}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
