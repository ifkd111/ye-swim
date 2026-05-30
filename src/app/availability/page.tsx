import { AvailabilityClient } from "./availability-client";
import { getAvailabilityPageData } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const data = await getAvailabilityPageData();

  return (
    <AvailabilityClient
      slots={data.availabilitySlots}
      viewerCoachName={data.viewer.coachName}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
