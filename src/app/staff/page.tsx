import { StaffClient } from "./staff-client";
import { listStaffAccounts } from "@/lib/supabase/staff-admin";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { accounts, hasAdminRuntime } = await listStaffAccounts();

  return <StaffClient hasAdminRuntime={hasAdminRuntime} initialAccounts={accounts} />;
}
