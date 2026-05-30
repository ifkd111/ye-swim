"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { approveBookingRequestAction, rejectBookingRequestAction } from "@/app/booking-requests/actions";
import { compareValues, SortButton, type SortDir } from "@/components/data-table";
import { AppShell } from "@/components/site-shell";
import { Badge, Button, EmptyState, Panel } from "@/components/ui";
import type { BookingRequest, UserRole } from "@/lib/types";

function statusLabel(status: BookingRequest["status"]) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  return "待审批";
}

function statusTone(status: BookingRequest["status"]) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function BookingRequestsClient({
  requests,
  viewerName,
  viewerRole
}: {
  requests: BookingRequest[];
  viewerName: string | null;
  viewerRole: UserRole | null;
}) {
  const [view, setView] = useState<"pending" | "all">("pending");
  const [toast, setToast] = useState("");
  const [sortKey, setSortKey] = useState<"member" | "date" | "time" | "campus" | "coach" | "status" | "note">("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isPending, startTransition] = useTransition();
  const filtered = useMemo(() => {
    const pick = {
      member: (request: BookingRequest) => request.memberName,
      date: (request: BookingRequest) => request.slotDate,
      time: (request: BookingRequest) => request.slotTime,
      campus: (request: BookingRequest) => request.campus,
      coach: (request: BookingRequest) => request.coach,
      status: (request: BookingRequest) => statusLabel(request.status),
      note: (request: BookingRequest) => request.note ?? ""
    };
    const scoped = view === "pending" ? requests.filter((item) => item.status === "pending") : requests;
    return [...scoped].sort((a, b) => compareValues(pick[sortKey](a), pick[sortKey](b), sortDir));
  }, [requests, sortDir, sortKey, view]);

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
      title="预约审批"
      subtitle="学员提交预约后先进入这里，管理员通过后才生成正式排课并推给教练。"
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

      <Panel action={<span className="text-sm font-bold text-slate-500">{filtered.length} 条</span>} title="预约申请">
        {filtered.length ? (
          <div className="soft-scrollbar overflow-x-auto">
            <table className="min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3"><SortButton active={sortKey === "member"} dir={sortDir} label="学员" onClick={() => sortBy("member")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "date"} dir={sortDir} label="日期" onClick={() => sortBy("date")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "time"} dir={sortDir} label="时间" onClick={() => sortBy("time")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "campus"} dir={sortDir} label="校区" onClick={() => sortBy("campus")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "coach"} dir={sortDir} label="教练" onClick={() => sortBy("coach")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "status"} dir={sortDir} label="状态" onClick={() => sortBy("status")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "note"} dir={sortDir} label="备注" onClick={() => sortBy("note")} /></th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((request) => (
                  <tr key={request.id} className="bg-white transition hover:bg-pool-50/45">
                    <td className="px-4 py-3 font-semibold text-ink">{request.memberName}</td>
                    <td className="px-4 py-3 text-slate-600">{request.slotDate}</td>
                    <td className="px-4 py-3 text-slate-600">{request.slotTime}</td>
                    <td className="px-4 py-3 text-slate-600">{request.campus}</td>
                    <td className="px-4 py-3 text-slate-600">{request.coach}</td>
                    <td className="px-4 py-3"><Badge className={statusTone(request.status)}>{statusLabel(request.status)}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{request.note ?? "-"}</td>
                    <td className="px-4 py-3">
                      {request.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button className="h-9 rounded-xl px-3" disabled={isPending} onClick={() => run(() => approveBookingRequestAction(request.id))} type="button">
                            <Check size={15} />
                            通过
                          </Button>
                          <Button className="h-9 rounded-xl px-3 text-red-600 hover:bg-red-50" disabled={isPending} onClick={() => run(() => rejectBookingRequestAction(request.id))} type="button" variant="secondary">
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
          <EmptyState title="没有待处理预约" detail="学员从已发布的教练空余时间中提交申请后，会出现在这里。" />
        )}
      </Panel>
    </AppShell>
  );
}
