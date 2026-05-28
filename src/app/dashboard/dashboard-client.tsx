"use client";

import Link from "next/link";
import { ArrowRight, CalendarPlus, ClipboardCheck, Plus, Smartphone } from "lucide-react";
import { SchedulesTable } from "@/components/data-table";
import { AppShell } from "@/components/site-shell";
import { ButtonLink, Panel, StatCard } from "@/components/ui";
import { storageKeys, useRecords } from "@/hooks/use-local-records";
import type { DataMode } from "@/lib/data-source";
import type { AttendanceLog, Member, Schedule } from "@/lib/types";

export function DashboardClient({
  initialMembers,
  initialSchedules,
  initialAttendance,
  dataMode
}: {
  initialMembers: Member[];
  initialSchedules: Schedule[];
  initialAttendance: AttendanceLog[];
  dataMode: DataMode;
}) {
  const persist = dataMode === "demo";
  const { records: members } = useRecords(storageKeys.members, initialMembers, persist);
  const { records: schedules } = useRecords(storageKeys.schedules, initialSchedules, persist);
  const { records: attendance } = useRecords(storageKeys.attendance, initialAttendance, persist);
  const pending = schedules.filter((schedule) => schedule.lessonStatus === "pending").slice(0, 10);
  const riskMembers = members.filter((member) => member.status !== "正常").slice(0, 6);
  const stats = [
    { label: "学员", value: String(members.length), detail: "可添加和搜索" },
    { label: "待出勤", value: String(schedules.filter((item) => item.lessonStatus === "pending").length), detail: "教练手机可勾选" },
    { label: "消课日志", value: String(attendance.length), detail: "防重复记录" },
    { label: "欠课学员", value: String(members.filter((member) => member.status === "欠课").length), detail: "允许负课时" }
  ];

  return (
    <AppShell
      title="运营概览"
      subtitle={dataMode === "supabase" ? "已连接 Supabase，后台数据来自数据库。" : "演示模式：新增和勾选会保存在浏览器本地。"}
    >
      <section className="mb-6 overflow-hidden rounded-3xl border border-pool-100 bg-pool-50 p-5 shadow-line lg:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-pool-700">Today Workspace</p>
            <h2 className="mt-2 text-3xl font-black tracking-normal text-ink">今天先把出勤跑顺。</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              你可以添加学员、创建排课、在排课页或手机教练页勾选出勤，然后到消课记录查看日志。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href="/members" variant="secondary">
              <Plus size={18} />
              添加学员
            </ButtonLink>
            <ButtonLink href="/schedule" variant="secondary">
              <CalendarPlus size={18} />
              添加排课
            </ButtonLink>
            <ButtonLink href="/coach/today">
              <Smartphone size={18} />
              手机出勤
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          action={
            <Link className="inline-flex items-center gap-1 text-sm font-black text-pool-700" href="/schedule">
              全部
              <ArrowRight size={15} />
            </Link>
          }
          title="待出勤课程"
        >
          <SchedulesTable schedules={pending} />
        </Panel>
        <Panel
          action={
            <Link className="inline-flex items-center gap-1 text-sm font-black text-pool-700" href="/attendance">
              日志
              <ClipboardCheck size={15} />
            </Link>
          }
          title="欠课 / 即将用完"
        >
          <div className="grid gap-3 p-4">
            {riskMembers.map((member) => (
              <Link
                className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:bg-pool-50 hover:shadow-line"
                href="/members"
                key={member.id}
              >
                <div>
                  <div className="font-black text-ink">{member.chineseName}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-500">{member.campus ?? "未填"} · {member.coach ?? "未分配"}</div>
                </div>
                <div className={member.status === "欠课" ? "font-black text-red-600" : "font-black text-amber-600"}>
                  {member.remainingLessons}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
