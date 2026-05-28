import { getAppData } from "@/lib/data-source";
import { MembersClient } from "./members-client";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const data = await getAppData();

  return <MembersClient dataMode={data.mode} initialMembers={data.members} />;
}
