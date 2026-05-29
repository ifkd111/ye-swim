"use client";

import { Check, Loader2, MapPin, UserRound } from "lucide-react";
import { useState, useTransition } from "react";
import { markAttendance } from "@/app/coach/actions";
import { Button } from "@/components/ui";
import { makeLocalId } from "@/lib/forms";
import type { Schedule } from "@/lib/types";

export function AttendanceCard({
  schedule,
  onLocalComplete
}: {
  schedule: Schedule;
  onLocalComplete?: (schedule: Schedule) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState(schedule.attended);
  const [message, setMessage] = useState("");

  function confirm() {
    if (checked || isPending) return;
    startTransition(async () => {
      const result = await markAttendance(schedule.id);
      if (result.ok) {
        setChecked(true);
        onLocalComplete?.({
          ...schedule,
          attended: true,
          lessonStatus: "completed"
        });
      }
      setMessage(result.message || `本地记录 ${makeLocalId("ok")}`);
    });
  }

  return (
    <article className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-line transition duration-200 hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-500">
            {schedule.lessonDate} · {schedule.weekday}
          </div>
          <div className="mt-1 text-3xl font-black text-ink">{schedule.lessonTime}</div>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-3 text-sm font-extrabold text-slate-700">
          <input
            className="size-5 accent-pool-600"
            type="checkbox"
            checked={checked}
            disabled={checked || isPending}
            onChange={confirm}
          />
          出勤
        </label>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <UserRound size={16} />
          <span className="font-medium text-ink">{schedule.memberName}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span>{schedule.campus}</span>
          <span className="text-slate-300">/</span>
          <span>{schedule.coach}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={checked ? "text-sm font-medium text-emerald-700" : "text-sm text-slate-500"}>
          {checked ? "已完成消课" : "待勾选"}
        </span>
        <Button
          className="h-10 rounded-2xl"
          disabled={checked || isPending}
          onClick={confirm}
          variant={checked ? "secondary" : "primary"}
        >
          {isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
          {checked ? "已出勤" : "确认"}
        </Button>
      </div>
      {message ? <p className="mt-3 text-xs leading-5 text-slate-500">{message}</p> : null}
    </article>
  );
}
