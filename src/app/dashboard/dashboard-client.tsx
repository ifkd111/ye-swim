"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CalendarPlus, ClipboardCheck, Plus, ShieldPlus, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { SchedulesTable } from "@/components/data-table";
import { Modal } from "@/components/modal";
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
  const guideStorageKey = "swimops.admin.guide.dismissed.v1";
  const persist = dataMode === "demo";
  const { records: members } = useRecords(storageKeys.members, initialMembers, persist);
  const { records: schedules } = useRecords(storageKeys.schedules, initialSchedules, persist);
  const { records: attendance } = useRecords(storageKeys.attendance, initialAttendance, persist);
  const allowMemberWrite = canManageMembers(viewerRole, dataMode);
  const allowScheduleWrite = canManageSchedules(viewerRole, dataMode);
  const allowStaffManage = canManageStaff(viewerRole) && dataMode === "supabase";
  const [guideOpen, setGuideOpen] = useState(false);
  const pending = schedules.filter((schedule) => schedule.lessonStatus === "pending").slice(0, 10);
  const riskMembers = members.filter((member) => member.status !== "正常").slice(0, 6);
  const stats = [
    { label: "学员", value: String(members.length), detail: "可添加和搜索" },
    { label: "待出勤", value: String(schedules.filter((item) => item.lessonStatus === "pending").length), detail: "教练手机可勾选" },
    { label: "消课日志", value: String(attendance.length), detail: "防重复记录" },
    { label: "欠课学员", value: String(members.filter((member) => member.status === "欠课").length), detail: "允许负课时" }
  ];

  useEffect(() => {
    if (!allowStaffManage) return;
    try {
      const dismissed = window.localStorage.getItem(guideStorageKey);
      if (!dismissed) {
        setGuideOpen(true);
      }
    } catch {
      setGuideOpen(true);
    }
  }, [allowStaffManage]);

  function closeGuide(remember = false) {
    if (remember) {
      try {
        window.localStorage.setItem(guideStorageKey, "1");
      } catch {
        // ignore storage failures
      }
    }
    setGuideOpen(false);
  }

  return (
    <AppShell
      title="运营概览"
      subtitle={dataMode === "supabase" ? "已连接 Supabase，后台数据来自数据库。" : "演示模式：新增和勾选会保存在浏览器本地。"}
      viewerName={viewerName}
      viewerRole={viewerRole}
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
            {allowStaffManage ? (
              <Button className="h-11" onClick={() => setGuideOpen(true)} type="button" variant="secondary">
                <BookOpen size={18} />
                操作说明
              </Button>
            ) : null}
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

      <Modal className="max-w-3xl" onClose={() => closeGuide(false)} open={guideOpen} title="管理员操作说明">
        <div className="grid gap-4">
          <div className="rounded-3xl border border-pool-100 bg-pool-50 p-4">
            <div className="text-sm font-black uppercase tracking-[0.16em] text-pool-700">推荐顺序</div>
            <div className="mt-3 grid gap-3">
              {[
                "1. 先到“账号”页创建前台和教练账号。",
                "2. 到“学员”页补全姓名、校区、教练和卡项。",
                "3. 到“排课”页安排今天和本周课程。",
                "4. 教练在手机页勾选出勤，系统会自动写入消课记录。"
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-line">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="font-black text-ink">账号分发规则</div>
              <div className="mt-2 space-y-2 text-sm font-semibold leading-6 text-slate-600">
                <p>管理员账号固定是 `admin`。</p>
                <p>前台账号必须以 `qt` 开头，例如 `qt001`。</p>
                <p>教练账号必须以 `jl` 开头，例如 `jl001`。</p>
                <p>教练账号创建时要填写和排课一致的教练名称。</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="font-black text-ink">日常使用提醒</div>
              <div className="mt-2 space-y-2 text-sm font-semibold leading-6 text-slate-600">
                <p>排课完成后，教练手机页会自动看到待出勤课程。</p>
                <p>课程出勤确认后，会自动进入消课记录。</p>
                <p>如果教练看不到自己的课，请检查教练名称是否和排课一致。</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => closeGuide(false)} type="button" variant="secondary">
              先关闭
            </Button>
            <Button onClick={() => closeGuide(true)} type="button">
              我知道了
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
