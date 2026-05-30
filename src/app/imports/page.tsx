import { ImportsClient } from "./imports-client";
import { getImportsPageData } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const data = await getImportsPageData();

  return <ImportsClient mode={data.mode} viewerName={data.viewer.fullName} viewerRole={data.viewer.role} />;
}
