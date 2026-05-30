import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { SkeletonRows } from "@/components/data-table";

export default function ImportsLoading() {
  return (
    <div className="space-y-5 bg-[#060c1a] p-5 text-slate-100">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton baseColor="#131e33" highlightColor="#1a2842" height={92} key={index} />
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#0c1525]">
        <table className="min-w-[880px] text-left text-sm">
          <tbody>
            <SkeletonRows columns={5} rows={6} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
