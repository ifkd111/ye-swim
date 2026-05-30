import { ImportsClient } from "./imports-client";
import { getAppData } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const data = await getAppData();

  return <ImportsClient mode={data.mode} viewerName={data.viewer.fullName} viewerRole={data.viewer.role} />;
}
