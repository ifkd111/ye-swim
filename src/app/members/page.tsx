import { getMembersPageData } from "@/lib/data-source";
import { MembersClient } from "./members-client";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const data = await getMembersPageData();

  return <MembersClient dataMode={data.mode} initialMembers={data.members} viewerName={data.viewer.fullName} viewerRole={data.viewer.role} />;
}
