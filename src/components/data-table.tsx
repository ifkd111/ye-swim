"use client";

import { ArrowDownUp, Check, ClipboardCheck, Pencil, Trash2 } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useMemo, useState } from "react";
import { Badge, Button } from "@/components/ui";
import { getProductTypeLabel, getStatusTone } from "@/lib/status";
import type { AttendanceLog, Member, Schedule } from "@/lib/types";

export type SortDir = "asc" | "desc";

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function compareValues(a: unknown, b: unknown, dir: SortDir) {
  const aNum = typeof a === "number" ? a : Number.NaN;
  const bNum = typeof b === "number" ? b : Number.NaN;
  const result =
    !Number.isNaN(aNum) && !Number.isNaN(bNum)
      ? aNum - bNum
      : text(a).localeCompare(text(b), "zh-CN", { numeric: true });
  return dir === "asc" ? result : -result;
}

export function SortButton({
  label,
  active,
  dir,
  onClick
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button className="inline-flex items-center gap-1 text-left" onClick={onClick} type="button">
      {label}
      <ArrowDownUp className={active ? "text-cyan-300" : "text-slate-600"} size={13} />
      {active ? <span className="text-[10px] text-cyan-300">{dir === "asc" ? "升" : "降"}</span> : null}
    </button>
  );
}

export function SkeletonRows({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row}>
          {Array.from({ length: columns }).map((__, col) => (
            <td className="px-4 py-3" key={col}>
              <Skeleton baseColor="#131e33" highlightColor="#1a2842" height={18} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function MembersTable({
  members,
  onEdit,
  onDelete,
  actionsDisabled = false,
  loading = false
}: {
  members: Member[];
  onEdit?: (member: Member) => void;
  onDelete?: (member: Member) => void;
  actionsDisabled?: boolean;
  loading?: boolean;
}) {
  type Key = "name" | "campus" | "coach" | "type" | "total" | "used" | "remaining" | "status" | "expire";
  const [sortKey, setSortKey] = useState<Key>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const hasActions = Boolean(onEdit || onDelete);

  function sortBy(key: Key) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const sorted = useMemo(() => {
    const pick: Record<Key, (member: Member) => unknown> = {
      name: (member) => member.chineseName,
      campus: (member) => member.campus,
      coach: (member) => member.coach,
      type: (member) => getProductTypeLabel(member.productType),
      total: (member) => member.totalLessons,
      used: (member) => member.usedLessons,
      remaining: (member) => member.remainingLessons,
      status: (member) => member.status,
      expire: (member) => member.cardExpireDate
    };
    return [...members].sort((a, b) => compareValues(pick[sortKey](a), pick[sortKey](b), sortDir));
  }, [members, sortDir, sortKey]);

  const headers: Array<[Key, string]> = [
    ["name", "学员"],
    ["campus", "校区"],
    ["coach", "教练"],
    ["type", "会员类型"],
    ["total", "总课时"],
    ["used", "已消课"],
    ["remaining", "剩余"],
    ["status", "状态"],
    ["expire", "到期"]
  ];

  return (
    <div className="soft-scrollbar overflow-x-auto">
      <table className="min-w-[1040px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map(([key, label]) => (
              <th className="px-4 py-3" key={key}>
                <SortButton active={sortKey === key} dir={sortDir} label={label} onClick={() => sortBy(key)} />
              </th>
            ))}
            {hasActions ? <th className="px-4 py-3">操作</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <SkeletonRows columns={hasActions ? 10 : 9} />
          ) : (
            sorted.map((member) => (
              <tr key={member.id} className="bg-white transition hover:bg-pool-50/45">
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink">{member.chineseName}</div>
                  <div className="text-xs text-slate-500">#{member.memberNo}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{member.campus ?? "未填"}</td>
                <td className="px-4 py-3 text-slate-600">{member.coach ?? "未分配"}</td>
                <td className="px-4 py-3 text-slate-600">{getProductTypeLabel(member.productType)}</td>
                <td className="px-4 py-3 text-slate-600">{member.totalLessons}</td>
                <td className="px-4 py-3 text-slate-600">{member.usedLessons}</td>
                <td className="px-4 py-3 font-semibold text-ink">{member.remainingLessons}</td>
                <td className="px-4 py-3">
                  <Badge className={getStatusTone(member.status)}>{member.status}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{member.cardExpireDate ?? "-"}</td>
                {hasActions ? (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {onEdit ? (
                        <Button className="h-9 rounded-xl px-3" disabled={actionsDisabled} onClick={() => onEdit(member)} type="button" variant="secondary">
                          <Pencil size={15} />
                          编辑
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button className="h-9 rounded-xl px-3 text-red-400 hover:bg-red-500/10" disabled={actionsDisabled} onClick={() => onDelete(member)} type="button" variant="secondary">
                          <Trash2 size={15} />
                          删除
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SchedulesTable({
  schedules,
  onComplete,
  onEdit,
  onDelete,
  actionsDisabled = false,
  loading = false
}: {
  schedules: Schedule[];
  onComplete?: (schedule: Schedule) => void;
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (schedule: Schedule) => void;
  actionsDisabled?: boolean;
  loading?: boolean;
}) {
  type Key = "date" | "time" | "campus" | "coach" | "member" | "attended" | "status";
  const [sortKey, setSortKey] = useState<Key>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const hasActions = Boolean(onComplete || onEdit || onDelete);

  function sortBy(key: Key) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const sorted = useMemo(() => {
    const pick: Record<Key, (schedule: Schedule) => unknown> = {
      date: (schedule) => schedule.lessonDate,
      time: (schedule) => schedule.lessonTime,
      campus: (schedule) => schedule.campus,
      coach: (schedule) => schedule.coach,
      member: (schedule) => schedule.memberName,
      attended: (schedule) => Number(schedule.attended),
      status: (schedule) => schedule.lessonStatus
    };
    return [...schedules].sort((a, b) => compareValues(pick[sortKey](a), pick[sortKey](b), sortDir));
  }, [schedules, sortDir, sortKey]);

  const headers: Array<[Key, string]> = [
    ["date", "日期"],
    ["time", "时间"],
    ["campus", "校区"],
    ["coach", "教练"],
    ["member", "学员"],
    ["attended", "出勤"],
    ["status", "状态"]
  ];

  return (
    <div className="soft-scrollbar overflow-x-auto">
      <table className="min-w-[1080px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map(([key, label]) => (
              <th className="px-4 py-3" key={key}>
                <SortButton active={sortKey === key} dir={sortDir} label={label} onClick={() => sortBy(key)} />
              </th>
            ))}
            {hasActions ? <th className="px-4 py-3">操作</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <SkeletonRows columns={hasActions ? 8 : 7} />
          ) : (
            sorted.map((schedule) => (
              <tr key={schedule.id} className="bg-white transition hover:bg-pool-50/45">
                <td className="px-4 py-3 font-medium text-ink">{schedule.lessonDate}</td>
                <td className="px-4 py-3 text-slate-600">{schedule.lessonTime}</td>
                <td className="px-4 py-3 text-slate-600">{schedule.campus}</td>
                <td className="px-4 py-3 text-slate-600">{schedule.coach}</td>
                <td className="px-4 py-3 font-medium text-ink">{schedule.memberName}</td>
                <td className="px-4 py-3">
                  <input aria-label={`${schedule.memberName} 出勤`} className="size-5 cursor-pointer rounded border-slate-300 accent-cyan-400" type="checkbox" checked={schedule.attended} readOnly />
                </td>
                <td className="px-4 py-3">
                  <Badge className={schedule.lessonStatus === "completed" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-slate-500/30 bg-slate-500/10 text-slate-300"}>
                    {schedule.lessonStatus === "completed" ? "已完成" : "待出勤"}
                  </Badge>
                </td>
                {hasActions ? (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {onComplete ? (
                        <Button className="h-9 rounded-xl px-3" disabled={actionsDisabled || schedule.lessonStatus === "completed"} onClick={() => onComplete(schedule)} type="button" variant={schedule.lessonStatus === "completed" ? "secondary" : "primary"}>
                          {schedule.lessonStatus === "completed" ? <ClipboardCheck size={15} /> : <Check size={15} />}
                          {schedule.lessonStatus === "completed" ? "已扣课" : "出勤"}
                        </Button>
                      ) : null}
                      {onEdit ? (
                        <Button className="h-9 rounded-xl px-3" disabled={actionsDisabled} onClick={() => onEdit(schedule)} type="button" variant="secondary">
                          <Pencil size={15} />
                          编辑
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button className="h-9 rounded-xl px-3 text-red-400 hover:bg-red-500/10" disabled={actionsDisabled} onClick={() => onDelete(schedule)} type="button" variant="secondary">
                          <Trash2 size={15} />
                          删除
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AttendanceTable({ logs, loading = false }: { logs: AttendanceLog[]; loading?: boolean }) {
  type Key = "date" | "member" | "coach" | "campus" | "deducted" | "source";
  const [sortKey, setSortKey] = useState<Key>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function sortBy(key: Key) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const sorted = useMemo(() => {
    const pick: Record<Key, (log: AttendanceLog) => unknown> = {
      date: (log) => log.attendanceDate,
      member: (log) => log.memberName,
      coach: (log) => log.coach,
      campus: (log) => log.campus,
      deducted: (log) => log.lessonsDeducted,
      source: (log) => log.sourceNote ?? log.source
    };
    return [...logs].sort((a, b) => compareValues(pick[sortKey](a), pick[sortKey](b), sortDir));
  }, [logs, sortDir, sortKey]);

  const headers: Array<[Key, string]> = [
    ["date", "日期"],
    ["member", "学员"],
    ["coach", "教练"],
    ["campus", "校区"],
    ["deducted", "扣课"],
    ["source", "来源"]
  ];

  return (
    <div className="soft-scrollbar overflow-x-auto">
      <table className="min-w-[820px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map(([key, label]) => (
              <th className="px-4 py-3" key={key}>
                <SortButton active={sortKey === key} dir={sortDir} label={label} onClick={() => sortBy(key)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <SkeletonRows columns={6} />
          ) : (
            sorted.map((log) => (
              <tr key={log.id} className="bg-white transition hover:bg-pool-50/45">
                <td className="px-4 py-3 font-medium text-ink">{log.attendanceDate}</td>
                <td className="px-4 py-3 font-medium text-ink">{log.memberName}</td>
                <td className="px-4 py-3 text-slate-600">{log.coach ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{log.campus ?? "-"}</td>
                <td className="px-4 py-3 font-semibold text-ink">{log.lessonsDeducted}</td>
                <td className="px-4 py-3 text-slate-600">{log.sourceNote ?? log.source ?? "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
