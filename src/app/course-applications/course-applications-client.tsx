"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { approveCourseApplicationAction, rejectCourseApplicationAction } from "@/app/course-applications/actions";
import { compareValues, SortButton, type SortDir } from "@/components/data-table";
import { AppShell } from "@/components/site-shell";
import { Badge, Button, EmptyState, Panel } from "@/components/ui";
import type { CourseApplication, UserRole } from "@/lib/types";

function statusLabel(status: CourseApplication["status"]) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  return "待审批";
}

function statusTone(status: CourseApplication["status"]) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function CourseApplicationsClient({
  applications,
  viewerName,
  viewerRole
}: {
  applications: CourseApplication[];
  viewerName: string | null;
  viewerRole: UserRole | null;
}) {
  const [view, setView] = useState<"pending" | "all">("pending");
  const [toast, setToast] = useState("");
  const [sortKey, setSortKey] = useState<"member" | "product" | "status" | "note">("member");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isPending, startTransition] = useTransition();
  const filtered = useMemo(() => {
    const pick = {
      member: (application: CourseApplication) => application.memberName,
      product: (application: CourseApplication) => application.productName,
      status: (application: CourseApplication) => statusLabel(application.status),
      note: (application: CourseApplication) => application.note ?? ""
    };
    const scoped = view === "pending" ? applications.filter((item) => item.status === "pending") : applications;
    return [...scoped].sort((a, b) => compareValues(pick[sortKey](a), pick[sortKey](b), sortDir));
  }, [applications, sortDir, sortKey, view]);

  function sortBy(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setToast(result.message);
      if (result.ok) window.location.reload();
    });
  }

  return (
    <AppShell
      title="课程申请"
      subtitle="学员申请课程或续费后，管理员通过时会更新学员卡项、课时和到期日期。"
      viewerName={viewerName}
      viewerRole={viewerRole}
    >
      <div className="mb-5 flex gap-2">
        {(["pending", "all"] as const).map((item) => (
          <button
            className={`h-12 rounded-2xl border px-4 text-sm font-extrabold transition ${view === item ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-pool-50"}`}
            key={item}
            onClick={() => setView(item)}
            type="button"
          >
            {item === "pending" ? "待审批" : "全部"}
          </button>
        ))}
      </div>

      {toast ? <div className="mb-4 rounded-3xl border border-pool-100 bg-pool-50 px-4 py-3 text-sm font-bold text-pool-700">{toast}</div> : null}

      <Panel action={<span className="text-sm font-bold text-slate-500">{filtered.length} 条</span>} title="课程申请">
        {filtered.length ? (
          <div className="soft-scrollbar overflow-x-auto">
            <table className="min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3"><SortButton active={sortKey === "member"} dir={sortDir} label="学员" onClick={() => sortBy("member")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "product"} dir={sortDir} label="申请课程" onClick={() => sortBy("product")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "status"} dir={sortDir} label="状态" onClick={() => sortBy("status")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "note"} dir={sortDir} label="备注" onClick={() => sortBy("note")} /></th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((app) => (
                  <tr key={app.id} className="bg-white transition hover:bg-pool-50/45">
                    <td className="px-4 py-3 font-semibold text-ink">{app.memberName}</td>
                    <td className="px-4 py-3 text-slate-600">{app.productName}</td>
                    <td className="px-4 py-3"><Badge className={statusTone(app.status)}>{statusLabel(app.status)}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{app.note ?? "-"}</td>
                    <td className="px-4 py-3">
                      {app.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button className="h-9 rounded-xl px-3" disabled={isPending} onClick={() => run(() => approveCourseApplicationAction(app.id))} type="button">
                            <Check size={15} />
                            通过
                          </Button>
                          <Button className="h-9 rounded-xl px-3 text-red-600 hover:bg-red-50" disabled={isPending} onClick={() => run(() => rejectCourseApplicationAction(app.id))} type="button" variant="secondary">
                            <X size={15} />
                            拒绝
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-400">已处理</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="没有待处理课程申请" detail="学员在学员端提交课程申请后，会出现在这里。" />
        )}
      </Panel>
    </AppShell>
  );
}
