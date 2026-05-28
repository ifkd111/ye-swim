"use client";

import { CalendarPlus, CheckCircle2, RotateCcw, Search } from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  completeScheduleAction,
  createScheduleAction,
  deleteScheduleAction,
  updateScheduleAction
} from "@/app/schedule/actions";
import { SchedulesTable } from "@/components/data-table";
import { Field, inputClass, Modal } from "@/components/modal";
import { AppShell } from "@/components/site-shell";
import { Button, Panel } from "@/components/ui";
import { useRecords, storageKeys } from "@/hooks/use-local-records";
import { makeLocalId } from "@/lib/forms";
import type { DataMode } from "@/lib/data-source";
import type { AttendanceLog, Member, Schedule } from "@/lib/types";

export function ScheduleClient({
  initialSchedules,
  initialMembers,
  initialAttendance,
  dataMode
}: {
  initialSchedules: Schedule[];
  initialMembers: Member[];
  initialAttendance: AttendanceLog[];
  dataMode: DataMode;
}) {
  const persist = dataMode === "demo";
  const { records: schedules, setRecords: setSchedules, reset } = useRecords(storageKeys.schedules, initialSchedules, persist);
  const { records: members } = useRecords(storageKeys.members, initialMembers, persist);
  const { records: logs, setRecords: setLogs } = useRecords(storageKeys.attendance, initialAttendance, persist);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"待出勤" | "已完成" | "全部">("待出勤");
  const [open, setOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredSchedules = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return schedules.filter((schedule) => {
      const matchesView =
        view === "全部" ||
        (view === "待出勤" && schedule.lessonStatus === "pending") ||
        (view === "已完成" && schedule.lessonStatus === "completed");
      const text = [schedule.lessonDate, schedule.lessonTime, schedule.campus, schedule.coach, schedule.memberName]
        .join(" ")
        .toLowerCase();
      return matchesView && (!normalized || text.includes(normalized));
    });
  }, [query, schedules, view]);

  function completeSchedule(schedule: Schedule) {
    if (schedule.lessonStatus === "completed") return;

    if (dataMode === "supabase") {
      startTransition(async () => {
        const result = await completeScheduleAction(schedule.id);
        setToast(result.message);
        if (result.ok) window.location.reload();
      });
      return;
    }

    setSchedules((current) =>
      current.map((item) =>
        item.id === schedule.id
          ? {
              ...item,
              attended: true,
              lessonStatus: "completed"
            }
          : item
      )
    );

    const alreadyLogged = logs.some((log) => log.sourceScheduleId === schedule.id);
    if (!alreadyLogged) {
      setLogs((current) => [
        {
          id: makeLocalId("attendance"),
          attendanceDate: schedule.lessonDate,
          memberId: schedule.memberId,
          memberName: schedule.memberName,
          coach: schedule.coach,
          campus: schedule.campus,
          lessonsDeducted: 1,
          sourceScheduleId: schedule.id,
          source: "local_checkin",
          sourceNote: "排课页手动勾选"
        },
        ...current
      ]);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const memberId = String(form.get("memberId") ?? "");
    const member = members.find((item) => item.id === memberId);
    if (!member) return;

    const date = String(form.get("lessonDate") ?? "");
    const schedule: Schedule = {
      id: editingSchedule?.id ?? makeLocalId("schedule"),
      lessonDate: date,
      lessonTime: String(form.get("lessonTime") ?? "17:00"),
      weekday: new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${date}T00:00:00`)),
      campus: String(form.get("campus") ?? "").trim() || member.campus || "未填",
      coach: String(form.get("coach") ?? "").trim() || member.coach || "未分配",
      memberId: member.id,
      memberName: member.chineseName,
      attended: false,
      lessonStatus: editingSchedule?.lessonStatus ?? "pending",
      source: editingSchedule?.source ?? "local_form",
      sourceRow: editingSchedule?.sourceRow ?? null
    };

    if (dataMode === "supabase") {
      startTransition(async () => {
        const result = editingSchedule
          ? await updateScheduleAction(editingSchedule.id, form)
          : await createScheduleAction(form);
        setToast(result.message);
        if (result.ok) {
          setOpen(false);
          setEditingSchedule(null);
          window.location.reload();
        }
      });
      return;
    }

    setSchedules((current) =>
      editingSchedule ? current.map((item) => (item.id === editingSchedule.id ? schedule : item)) : [schedule, ...current]
    );
    setOpen(false);
    setEditingSchedule(null);
    event.currentTarget.reset();
  }

  function editSchedule(schedule: Schedule) {
    setEditingSchedule(schedule);
    setOpen(true);
  }

  function deleteSchedule(schedule: Schedule) {
    const confirmed = window.confirm(`确认删除 ${schedule.lessonDate} ${schedule.lessonTime} 的「${schedule.memberName}」课程？`);
    if (!confirmed) return;

    if (dataMode === "supabase") {
      startTransition(async () => {
        const result = await deleteScheduleAction(schedule.id);
        setToast(result.message);
        if (result.ok) window.location.reload();
      });
      return;
    }

    setSchedules((current) => current.filter((item) => item.id !== schedule.id));
  }

  function openCreate() {
    setEditingSchedule(null);
    setOpen(true);
  }

  return (
    <AppShell
      title="排课表"
      subtitle={dataMode === "supabase" ? "已连接 Supabase：排课编辑、删除、出勤扣课都会写入数据库。" : "演示模式：排课编辑、删除、出勤扣课保存在浏览器本地。"}
    >
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-13 w-full rounded-3xl border border-slate-200 bg-white py-4 pl-11 pr-4 text-sm font-bold text-ink shadow-line outline-none transition focus:border-pool-500 focus:ring-4 focus:ring-pool-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索日期、校区、教练、学员"
            value={query}
          />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          {(["待出勤", "已完成", "全部"] as const).map((item) => (
            <button
              className={`h-13 shrink-0 rounded-3xl border px-4 text-sm font-extrabold transition ${
                view === item
                  ? "border-ink bg-ink text-white shadow-soft"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-pool-50"
              }`}
              key={item}
              onClick={() => setView(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button className="h-13 flex-1 lg:flex-none" onClick={openCreate}>
            <CalendarPlus size={18} />
            添加排课
          </Button>
          <Button className="h-13 px-3" disabled={dataMode === "supabase"} onClick={reset} title="重置排课演示数据" type="button" variant="secondary">
            <RotateCcw size={18} />
          </Button>
        </div>
      </div>
      {toast ? <div className="mb-4 rounded-3xl border border-pool-100 bg-pool-50 px-4 py-3 text-sm font-bold text-pool-700">{toast}</div> : null}

      <Panel
        action={<span className="text-sm font-bold text-slate-500">{filteredSchedules.length} 条</span>}
        title="课程列表"
      >
        <SchedulesTable
          onComplete={completeSchedule}
          onDelete={deleteSchedule}
          onEdit={editSchedule}
          schedules={filteredSchedules.slice(0, 220)}
        />
      </Panel>

      <Modal
        onClose={() => {
          setOpen(false);
          setEditingSchedule(null);
        }}
        open={open}
        title={editingSchedule ? "编辑排课" : "添加排课"}
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Field label="学员">
            <select className={inputClass} defaultValue={editingSchedule?.memberId ?? ""} name="memberId" required>
              <option value="">选择学员</option>
              {members.slice(0, 300).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.chineseName} · {member.campus ?? "未填"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="日期">
            <input className={inputClass} defaultValue={editingSchedule?.lessonDate ?? ""} name="lessonDate" required type="date" />
          </Field>
          <Field label="时间">
            <input className={inputClass} defaultValue={editingSchedule?.lessonTime ?? "17:00"} name="lessonTime" required type="time" />
          </Field>
          <Field label="校区">
            <input className={inputClass} defaultValue={editingSchedule?.campus ?? ""} name="campus" placeholder="默认使用学员校区" />
          </Field>
          <Field label="教练">
            <input className={inputClass} defaultValue={editingSchedule?.coach ?? ""} name="coach" placeholder="默认使用学员教练" />
          </Field>
          <div className="rounded-3xl bg-pool-50 p-4 text-sm font-bold leading-6 text-pool-700 sm:col-span-2">
            <CheckCircle2 className="mb-2" size={20} />
            新排课默认是待出勤。勾选后会写入本地消课日志，重复勾选不会重复生成。
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="secondary">
              取消
            </Button>
            <Button disabled={isPending} type="submit">{isPending ? "保存中..." : "保存排课"}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
