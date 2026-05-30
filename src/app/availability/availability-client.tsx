"use client";

import { CalendarPlus, CheckCircle2, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  closeAvailabilitySlotAction,
  createAvailabilitySlotAction,
  deleteAvailabilitySlotAction,
  publishAvailabilitySlotAction,
  updateAvailabilitySlotAction
} from "@/app/availability/actions";
import { Field, inputClass, Modal, textareaClass } from "@/components/modal";
import { compareValues, SortButton, type SortDir } from "@/components/data-table";
import { AppShell } from "@/components/site-shell";
import { Badge, Button, EmptyState, Panel } from "@/components/ui";
import type { CoachAvailabilitySlot, UserRole } from "@/lib/types";

function statusLabel(status: CoachAvailabilitySlot["status"]) {
  if (status === "published") return "已发布";
  if (status === "closed") return "已关闭";
  return "草稿";
}

function statusTone(status: CoachAvailabilitySlot["status"]) {
  if (status === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "closed") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function AvailabilityClient({
  slots,
  viewerRole,
  viewerName,
  viewerCoachName
}: {
  slots: CoachAvailabilitySlot[];
  viewerRole: UserRole | null;
  viewerName: string | null;
  viewerCoachName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CoachAvailabilitySlot | null>(null);
  const [toast, setToast] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "time" | "campus" | "coach" | "capacity" | "order" | "status">("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isPending, startTransition] = useTransition();
  const isCoach = viewerRole === "coach";
  const isAdmin = viewerRole === "admin" || viewerRole === "frontdesk";
  const visibleSlots = useMemo(() => {
    const pick = {
      date: (slot: CoachAvailabilitySlot) => slot.slotDate,
      time: (slot: CoachAvailabilitySlot) => slot.slotTime,
      campus: (slot: CoachAvailabilitySlot) => slot.campus,
      coach: (slot: CoachAvailabilitySlot) => slot.coach,
      capacity: (slot: CoachAvailabilitySlot) => slot.capacity,
      order: (slot: CoachAvailabilitySlot) => slot.publishOrder,
      status: (slot: CoachAvailabilitySlot) => statusLabel(slot.status)
    };
    const scoped = isCoach && viewerCoachName ? slots.filter((slot) => slot.coach === viewerCoachName) : slots;
    return [...scoped].sort((a, b) => compareValues(pick[sortKey](a), pick[sortKey](b), sortDir));
  }, [isCoach, slots, sortDir, sortKey, viewerCoachName]);

  function sortBy(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = editing ? await updateAvailabilitySlotAction(editing.id, form) : await createAvailabilitySlotAction(form);
      setToast(result.message);
      if (result.ok) {
        setOpen(false);
        setEditing(null);
        window.location.reload();
      }
    });
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
      title="空余时间"
      subtitle={isCoach ? "提交你的空余时间。管理员发布后，学员才能申请预约。" : "老板决定哪些教练时间对学员开放，并通过排序和容量控制课程分配。"}
      viewerName={viewerName}
      viewerRole={viewerRole}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="rounded-3xl border border-pool-100 bg-pool-50 px-5 py-4 text-sm font-semibold leading-6 text-pool-800">
          教练提交的是内部空余时间；只有管理员发布的时间才会出现在学员端。
        </div>
        <Button className="h-13" disabled={isPending} onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus size={18} />
          新增空余时间
        </Button>
      </div>

      {toast ? <div className="mb-4 rounded-3xl border border-pool-100 bg-pool-50 px-4 py-3 text-sm font-bold text-pool-700">{toast}</div> : null}

      <Panel action={<span className="text-sm font-bold text-slate-500">{visibleSlots.length} 条</span>} title="教练空余时间">
        {visibleSlots.length ? (
          <div className="soft-scrollbar overflow-x-auto">
            <table className="min-w-[1040px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3"><SortButton active={sortKey === "date"} dir={sortDir} label="日期" onClick={() => sortBy("date")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "time"} dir={sortDir} label="时间" onClick={() => sortBy("time")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "campus"} dir={sortDir} label="校区" onClick={() => sortBy("campus")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "coach"} dir={sortDir} label="教练" onClick={() => sortBy("coach")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "capacity"} dir={sortDir} label="容量" onClick={() => sortBy("capacity")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "order"} dir={sortDir} label="排序" onClick={() => sortBy("order")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "status"} dir={sortDir} label="状态" onClick={() => sortBy("status")} /></th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleSlots.map((slot) => (
                  <tr key={slot.id} className="bg-white transition hover:bg-pool-50/45">
                    <td className="px-4 py-3 font-semibold text-ink">{slot.slotDate}</td>
                    <td className="px-4 py-3 text-slate-600">{slot.slotTime}</td>
                    <td className="px-4 py-3 text-slate-600">{slot.campus}</td>
                    <td className="px-4 py-3 text-slate-600">{slot.coach}</td>
                    <td className="px-4 py-3 text-slate-600">{slot.capacity}</td>
                    <td className="px-4 py-3 text-slate-600">{slot.publishOrder}</td>
                    <td className="px-4 py-3"><Badge className={statusTone(slot.status)}>{statusLabel(slot.status)}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button className="h-9 rounded-xl px-3" disabled={isPending} onClick={() => { setEditing(slot); setOpen(true); }} type="button" variant="secondary">
                          <Pencil size={15} />
                          编辑
                        </Button>
                        {isAdmin && slot.status !== "published" ? (
                          <Button className="h-9 rounded-xl px-3" disabled={isPending} onClick={() => run(() => publishAvailabilitySlotAction(slot.id))} type="button">
                            <CheckCircle2 size={15} />
                            发布
                          </Button>
                        ) : null}
                        {isAdmin && slot.status === "published" ? (
                          <Button className="h-9 rounded-xl px-3" disabled={isPending} onClick={() => run(() => closeAvailabilitySlotAction(slot.id))} type="button" variant="secondary">
                            <EyeOff size={15} />
                            关闭
                          </Button>
                        ) : null}
                        <Button className="h-9 rounded-xl px-3 text-red-600 hover:bg-red-50" disabled={isPending} onClick={() => run(() => deleteAvailabilitySlotAction(slot.id))} type="button" variant="secondary">
                          <Trash2 size={15} />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="还没有空余时间" detail="教练可以提交草稿，管理员发布后会进入学员可预约列表。" />
        )}
      </Panel>

      <Modal className="max-w-3xl" onClose={() => { setOpen(false); setEditing(null); }} open={open} title={editing ? "编辑空余时间" : "新增空余时间"}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Field label="日期">
            <input className={inputClass} defaultValue={editing?.slotDate ?? ""} name="slotDate" required type="date" />
          </Field>
          <Field label="时间">
            <input className={inputClass} defaultValue={editing?.slotTime ?? ""} name="slotTime" required placeholder="例如 16:00-17:00" />
          </Field>
          <Field label="校区">
            <input className={inputClass} defaultValue={editing?.campus ?? ""} name="campus" required placeholder="例如 古北" />
          </Field>
          <Field hint={isCoach ? "教练账号会自动使用自己的教练名称" : "管理员可决定把名额给哪位教练"} label="教练">
            <input className={inputClass} defaultValue={editing?.coach ?? viewerCoachName ?? ""} disabled={isCoach} name="coach" required placeholder="例如 古北教练" />
          </Field>
          <Field label="容量">
            <input className={inputClass} defaultValue={editing?.capacity ?? 1} min={1} name="capacity" required type="number" />
          </Field>
          <Field hint="数字越小，在学员端越靠前" label="发布排序">
            <input className={inputClass} defaultValue={editing?.publishOrder ?? 100} disabled={!isAdmin} name="publishOrder" type="number" />
          </Field>
          {isAdmin ? (
            <Field label="状态">
              <select className={inputClass} defaultValue={editing?.status ?? "draft"} name="status">
                <option value="draft">草稿</option>
                <option value="published">发布给学员</option>
                <option value="closed">关闭</option>
              </select>
            </Field>
          ) : null}
          <div className="sm:col-span-2">
            <Field label="备注">
              <textarea className={textareaClass} defaultValue={editing?.notes ?? ""} name="notes" placeholder="内部备注，学员端不展示" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="secondary">取消</Button>
            <Button disabled={isPending} type="submit">
              <CalendarPlus size={18} />
              {isPending ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
