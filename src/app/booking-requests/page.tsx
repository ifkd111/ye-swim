import { BookingRequestsClient } from "./booking-requests-client";
import { getBookingRequestsPageData } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export default async function BookingRequestsPage() {
  const data = await getBookingRequestsPageData();

  return (
    <BookingRequestsClient
      requests={data.bookingRequests}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
