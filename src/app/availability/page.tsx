import { AvailabilityClient } from "./availability-client";
import { getAppData } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const data = await getAppData();

  return (
    <AvailabilityClient
      slots={data.availabilitySlots}
      viewerCoachName={data.viewer.coachName}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
