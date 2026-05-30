import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { SkeletonRows } from "@/components/data-table";

export default function MembersLoading() {
  return (
    <div className="space-y-5 bg-[#060c1a] p-5 text-slate-100">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <Skeleton baseColor="#131e33" highlightColor="#1a2842" height={44} />
        <Skeleton baseColor="#131e33" highlightColor="#1a2842" height={44} width={240} />
        <Skeleton baseColor="#131e33" highlightColor="#1a2842" height={44} width={160} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#0c1525]">
        <table className="min-w-[1040px] text-left text-sm">
          <tbody>
            <SkeletonRows columns={9} rows={8} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
