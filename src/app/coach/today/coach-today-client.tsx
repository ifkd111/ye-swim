"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/site-shell";
import { EmptyState, Panel } from "@/components/ui";
import { storageKeys, useRecords } from "@/hooks/use-local-records";
import type { DataMode } from "@/lib/data-source";
import { makeLocalId } from "@/lib/forms";
import type { AttendanceLog, Schedule } from "@/lib/types";
import { AttendanceCard } from "./attendance-card";

export function CoachTodayClient({
  initialSchedules,
  initialAttendance,
  dataMode
}: {
  initialSchedules: Schedule[];
  initialAttendance: AttendanceLog[];
  dataMode: DataMode;
}) {
  const persist = dataMode === "demo";
  const { records: schedules, setRecords: setSchedules } = useRecords(storageKeys.schedules, initialSchedules, persist);
  const { records: logs, setRecords: setLogs } = useRecords(storageKeys.attendance, initialAttendance, persist);

  const pending = useMemo(
    () => schedules.filter((schedule) => schedule.lessonStatus === "pending").slice(0, 24),
    [schedules]
  );

  function complete(schedule: Schedule) {
    if (dataMode === "supabase") {
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

    if (logs.some((log) => log.sourceScheduleId === schedule.id)) return;

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
        source: "coach_mobile",
        sourceNote: "教练手机页勾选"
      },
      ...current
    ]);
  }

  return (
    <AppShell
      title="教练今日课程"
      subtitle={dataMode === "supabase" ? "已连接 Supabase：勾选后写入真实消课日志。" : "手机端优先，只保留查看课程和勾选出勤。"}
    >
      <div className="mx-auto max-w-2xl">
        <Panel title={`待出勤 · ${pending.length}`}>
          {pending.length ? (
            <div className="grid gap-3 p-3">
              {pending.map((schedule) => (
                <AttendanceCard key={schedule.id} onLocalComplete={complete} schedule={schedule} />
              ))}
            </div>
          ) : (
            <EmptyState title="今天没有待出勤课程" detail="可以到排课页添加新课程，或重置演示数据。" />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
