"use client";

import Link from "next/link";
import { ArrowRight, CalendarPlus, ClipboardCheck, Plus, ShieldPlus, Smartphone } from "lucide-react";
import { SchedulesTable } from "@/components/data-table";
import { AppShell } from "@/components/site-shell";
import { Button, ButtonLink, Panel, StatCard } from "@/components/ui";
import { storageKeys, useRecords } from "@/hooks/use-local-records";
import { canManageMembers, canManageSchedules, canManageStaff } from "@/lib/permissions";
import type { DataMode } from "@/lib/data-source";
import type { AttendanceLog, Member, Schedule, UserRole } from "@/lib/types";

export function DashboardClient({
  initialMembers,
  initialSchedules,
  initialAttendance,
  dataMode,
  viewerRole,
  viewerName
}: {
  initialMembers: Member[];
  initialSchedules: Schedule[];
  initialAttendance: AttendanceLog[];
  dataMode: DataMode;
  viewerRole: UserRole | null;
  viewerName: string | null;
}) {
  const persist = dataMode === "demo";
  const { records: members } = useRecords(storageKeys.members, initialMembers, persist);
  const { records: schedules } = useRecords(storageKeys.schedules, initialSchedules, persist);
  const { records: attendance } = useRecords(storageKeys.attendance, initialAttendance, persist);
  const allowMemberWrite = canManageMembers(viewerRole, dataMode);
  const allowScheduleWrite = canManageSchedules(viewerRole, dataMode);
  const allowStaffManage = canManageStaff(viewerRole) && dataMode === "supabase";
  const pending = schedules.filter((schedule) => schedule.lessonStatus === "pending").slice(0, 10);
  const riskMembers = members.filter((member) => member.status === "欠课" || member.status === "即将用完").slice(0, 6);
  const stats = [
    { label: "学员", value: String(members.length), detail: "可添加和搜索" },
    { label: "待出勤", value: String(schedules.filter((item) => item.lessonStatus === "pending").length), detail: "教练手机可勾选" },
    { label: "消课日志", value: String(attendance.length), detail: "防重复记录" },
    { label: "欠课学员", value: String(members.filter((member) => member.status === "欠课").length), detail: "超上课时才欠课" }
  ];

  return (
    <AppShell
      title="运营概览"
      subtitle={dataMode === "supabase" ? "已连接 Supabase，后台数据来自数据库。" : "演示模式：新增和勾选会保存在浏览器本地。"}
      viewerName={viewerName}
      viewerRole={viewerRole}
    >
      <section className="mb-5 overflow-hidden rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Today Workspace</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-100">今天先把排课和出勤跑顺。</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-400">
              管理员控制教练时间池，学员提交申请，审批后生成排课，教练手机端完成出勤。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {allowMemberWrite ? (
              <ButtonLink href="/members" variant="secondary">
                <Plus size={18} />
                添加学员
              </ButtonLink>
            ) : null}
            {allowScheduleWrite ? (
              <ButtonLink href="/schedule" variant="secondary">
                <CalendarPlus size={18} />
                添加排课
              </ButtonLink>
            ) : null}
            <ButtonLink href="/coach/today">
              <Smartphone size={18} />
              手机出勤
            </ButtonLink>
            {allowStaffManage ? (
              <ButtonLink href="/staff" variant="secondary">
                <ShieldPlus size={18} />
                管理账号
              </ButtonLink>
            ) : null}
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
                className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#131e33] p-3 transition hover:border-cyan-400/30"
                href="/members"
                key={member.id}
              >
                <div>
                  <div className="font-semibold text-slate-100">{member.chineseName}</div>
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
