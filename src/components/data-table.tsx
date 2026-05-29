import { Check, ClipboardCheck, Pencil, Trash2 } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { getProductTypeLabel, getStatusTone } from "@/lib/status";
import type { AttendanceLog, Member, Schedule } from "@/lib/types";

export function MembersTable({
  members,
  onEdit,
  onDelete,
  actionsDisabled = false
}: {
  members: Member[];
  onEdit?: (member: Member) => void;
  onDelete?: (member: Member) => void;
  actionsDisabled?: boolean;
}) {
  return (
    <div className="soft-scrollbar overflow-x-auto">
      <table className="min-w-[1040px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">学员</th>
            <th className="px-4 py-3">校区</th>
            <th className="px-4 py-3">教练</th>
            <th className="px-4 py-3">会员类型</th>
            <th className="px-4 py-3">总课时</th>
            <th className="px-4 py-3">已消课</th>
            <th className="px-4 py-3">剩余</th>
            <th className="px-4 py-3">状态</th>
            <th className="px-4 py-3">到期</th>
            {(onEdit || onDelete) ? <th className="px-4 py-3">操作</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((member) => (
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
              {(onEdit || onDelete) ? (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit ? (
                      <Button className="h-9 rounded-xl px-3" disabled={actionsDisabled} onClick={() => onEdit(member)} type="button" variant="secondary">
                        <Pencil size={15} />
                        编辑
                      </Button>
                    ) : null}
                    {onDelete ? (
                      <Button
                        className="h-9 rounded-xl px-3 text-red-600 hover:bg-red-50"
                        disabled={actionsDisabled}
                        onClick={() => onDelete(member)}
                        type="button"
                        variant="secondary"
                      >
                        <Trash2 size={15} />
                        删除
                      </Button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
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
  actionsDisabled = false
}: {
  schedules: Schedule[];
  onComplete?: (schedule: Schedule) => void;
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (schedule: Schedule) => void;
  actionsDisabled?: boolean;
}) {
  return (
    <div className="soft-scrollbar overflow-x-auto">
      <table className="min-w-[1080px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">日期</th>
            <th className="px-4 py-3">时间</th>
            <th className="px-4 py-3">校区</th>
            <th className="px-4 py-3">教练</th>
            <th className="px-4 py-3">学员</th>
            <th className="px-4 py-3">出勤</th>
            <th className="px-4 py-3">状态</th>
            {(onComplete || onEdit || onDelete) ? <th className="px-4 py-3">操作</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {schedules.map((schedule) => (
            <tr key={schedule.id} className="bg-white transition hover:bg-pool-50/45">
              <td className="px-4 py-3 font-medium text-ink">{schedule.lessonDate}</td>
              <td className="px-4 py-3 text-slate-600">{schedule.lessonTime}</td>
              <td className="px-4 py-3 text-slate-600">{schedule.campus}</td>
              <td className="px-4 py-3 text-slate-600">{schedule.coach}</td>
              <td className="px-4 py-3 font-medium text-ink">{schedule.memberName}</td>
              <td className="px-4 py-3">
                <input
                  aria-label={`${schedule.memberName} 出勤`}
                  className="size-5 cursor-pointer rounded border-slate-300 accent-pool-600"
                  type="checkbox"
                  checked={schedule.attended}
                  readOnly
                />
              </td>
              <td className="px-4 py-3">
                <Badge
                  className={
                    schedule.lessonStatus === "completed"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }
                >
                  {schedule.lessonStatus === "completed" ? "已完成" : "待出勤"}
                </Badge>
              </td>
              {(onComplete || onEdit || onDelete) ? (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onComplete ? (
                      <Button
                        className="h-9 rounded-xl px-3"
                        disabled={actionsDisabled || schedule.lessonStatus === "completed"}
                        onClick={() => onComplete(schedule)}
                        type="button"
                        variant={schedule.lessonStatus === "completed" ? "secondary" : "primary"}
                      >
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
                      <Button
                        className="h-9 rounded-xl px-3 text-red-600 hover:bg-red-50"
                        disabled={actionsDisabled}
                        onClick={() => onDelete(schedule)}
                        type="button"
                        variant="secondary"
                      >
                        <Trash2 size={15} />
                        删除
                      </Button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AttendanceTable({ logs }: { logs: AttendanceLog[] }) {
  return (
    <div className="soft-scrollbar overflow-x-auto">
      <table className="min-w-[820px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">日期</th>
            <th className="px-4 py-3">学员</th>
            <th className="px-4 py-3">教练</th>
            <th className="px-4 py-3">校区</th>
            <th className="px-4 py-3">扣课</th>
            <th className="px-4 py-3">来源</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => (
            <tr key={log.id} className="bg-white transition hover:bg-pool-50/45">
              <td className="px-4 py-3 font-medium text-ink">{log.attendanceDate}</td>
              <td className="px-4 py-3 font-medium text-ink">{log.memberName}</td>
              <td className="px-4 py-3 text-slate-600">{log.coach ?? "-"}</td>
              <td className="px-4 py-3 text-slate-600">{log.campus ?? "-"}</td>
              <td className="px-4 py-3 font-semibold text-ink">{log.lessonsDeducted}</td>
              <td className="px-4 py-3 text-slate-600">{log.sourceNote ?? log.source ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
