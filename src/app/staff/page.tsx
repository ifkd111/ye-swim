import { StaffClient } from "./staff-client";
import { getStaffPageData } from "@/lib/data-source";
import { listStaffAccounts } from "@/lib/supabase/staff-admin";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { accounts, hasAdminRuntime } = await listStaffAccounts();
  const data = await getStaffPageData();

  return (
    <StaffClient
      hasAdminRuntime={hasAdminRuntime}
      initialAccounts={accounts}
      members={data.members}
      viewerName={data.viewer.fullName}
      viewerRole={data.viewer.role}
    />
  );
}
