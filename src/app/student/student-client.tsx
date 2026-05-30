"use client";

import { CalendarPlus, Send } from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { createCourseApplicationAction, createStudentBookingRequestAction } from "@/app/student/actions";
import { Field, Modal, textareaClass } from "@/components/modal";
import { AppShell } from "@/components/site-shell";
import { Badge, Button, EmptyState, Panel, StatCard } from "@/components/ui";
import { bookingRuleText, isBookableForStudent, minStudentBookingDate } from "@/lib/booking-rules";
import { getProductTypeLabel, getStatusTone } from "@/lib/status";
import type {
  AttendanceLog,
  BookingRequest,
  CoachAvailabilitySlot,
  CourseApplication,
  CourseProduct,
  Member,
  Schedule,
  UserRole
} from "@/lib/types";

function reviewLabel(status: "pending" | "approved" | "rejected") {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  return "待审批";
}

function reviewTone(status: "pending" | "approved" | "rejected") {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function StudentClient({
  member,
  products,
  schedules,
  attendanceLogs,
  slots,
  bookingRequests,
  courseApplications,
  viewerName,
  viewerRole
}: {
  member: Member | null;
  products: CourseProduct[];
  schedules: Schedule[];
  attendanceLogs: AttendanceLog[];
  slots: CoachAvailabilitySlot[];
  bookingRequests: BookingRequest[];
  courseApplications: CourseApplication[];
  viewerName: string | null;
  viewerRole: UserRole | null;
}) {
  const [bookingSlot, setBookingSlot] = useState<CoachAvailabilitySlot | null>(null);
  const [courseProduct, setCourseProduct] = useState<CourseProduct | null>(null);
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();
  const minDate = minStudentBookingDate();

  const availableSlots = useMemo(() => {
    if (!member) return [];
    return slots
      .filter((slot) => slot.status === "published")
      .filter((slot) => !member.coach || slot.coach === member.coach)
      .filter((slot) => isBookableForStudent(slot.slotDate))
      .filter((slot) => !bookingRequests.some((request) => request.slotId === slot.id && request.status !== "rejected"))
      .slice(0, 60);
  }, [bookingRequests, member, slots]);

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookingSlot) return;
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createStudentBookingRequestAction(bookingSlot.id, form);
      setToast(result.message);
      if (result.ok) {
        setBookingSlot(null);
        window.location.reload();
      }
    });
  }

  function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseProduct) return;
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createCourseApplicationAction(courseProduct.id, form);
      setToast(result.message);
      if (result.ok) {
        setCourseProduct(null);
        window.location.reload();
      }
    });
  }

  if (!member) {
    return (
      <AppShell title="学员端" subtitle="当前账号还没有绑定学员档案。" viewerName={viewerName} viewerRole={viewerRole}>
        <EmptyState title="账号未绑定学员" detail="请联系管理员在账号管理中绑定你的学员档案。" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="我的课程"
      subtitle={`${bookingRuleText()}。当前最早可申请日期：${minDate}`}
      viewerName={viewerName}
      viewerRole={viewerRole}
    >
      {toast ? <div className="mb-4 rounded-3xl border border-pool-100 bg-pool-50 px-4 py-3 text-sm font-bold text-pool-700">{toast}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="当前课程" value={member.productName ?? getProductTypeLabel(member.productType)} detail={getProductTypeLabel(member.productType)} />
        <StatCard label="剩余课时" value={String(member.remainingLessons)} detail={`已消课 ${member.usedLessons}`} />
        <StatCard label="到期日期" value={member.cardExpireDate ?? "长期"} detail={member.cardStartDate ? `开卡 ${member.cardStartDate}` : "未填写开卡日期"} />
        <StatCard label="绑定教练" value={member.coach ?? "未分配"} detail={member.campus ?? "未填写校区"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel action={<Badge className={getStatusTone(member.status)}>{member.status}</Badge>} title="我的档案">
          <div className="grid gap-3 p-5 text-sm font-semibold text-slate-600 sm:grid-cols-2">
            <div>姓名：<span className="text-ink">{member.chineseName}</span></div>
            <div>校区：<span className="text-ink">{member.campus ?? "-"}</span></div>
            <div>教练：<span className="text-ink">{member.coach ?? "-"}</span></div>
            <div>手机号：<span className="text-ink">{member.phone ?? "-"}</span></div>
          </div>
        </Panel>

        <Panel title="课程申请">
          <div className="grid gap-3 p-4">
            {products.map((product) => (
              <div key={product.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-line">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-ink">{product.name}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">
                      {getProductTypeLabel(product.type)} · {product.totalLessons || "不限"} 课时 · {product.validDays ?? "长期"} 天 · ¥{product.price}
                    </div>
                  </div>
                  <Button className="h-9 rounded-xl px-3" disabled={isPending} onClick={() => setCourseProduct(product)} type="button">
                    申请
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6" action={<span className="text-sm font-bold text-slate-500">最早 {minDate}</span>} title="预约课程">
        {availableSlots.length ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {availableSlots.map((slot) => (
              <div key={slot.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-line">
                <div className="text-lg font-black text-ink">{slot.slotDate}</div>
                <div className="mt-1 text-sm font-semibold text-slate-600">{slot.slotTime}</div>
                <div className="mt-3 text-sm font-semibold text-slate-500">{slot.campus} · {slot.coach}</div>
                <Button className="mt-4 h-10 w-full rounded-xl" disabled={isPending} onClick={() => setBookingSlot(slot)} type="button">
                  <CalendarPlus size={17} />
                  申请预约
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="暂时没有可预约时间" detail="管理员发布绑定教练的空余时间后，你会在这里看到可申请的日期。" />
        )}
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="我的申请">
          <div className="grid gap-3 p-4">
            {[...bookingRequests, ...courseApplications].length ? (
              <>
                {bookingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-line">
                    <div>
                      <div className="font-black text-ink">预约 {request.slotDate} {request.slotTime}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">{request.campus} · {request.coach}</div>
                    </div>
                    <Badge className={reviewTone(request.status)}>{reviewLabel(request.status)}</Badge>
                  </div>
                ))}
                {courseApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-line">
                    <div>
                      <div className="font-black text-ink">课程申请</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">{app.productName}</div>
                    </div>
                    <Badge className={reviewTone(app.status)}>{reviewLabel(app.status)}</Badge>
                  </div>
                ))}
              </>
            ) : (
              <EmptyState title="暂无申请" detail="你提交的课程申请和预约申请会显示在这里。" />
            )}
          </div>
        </Panel>

        <Panel title="我的排课与出勤">
          <div className="grid gap-3 p-4">
            {schedules.slice(0, 8).map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-line">
                <div>
                  <div className="font-black text-ink">{schedule.lessonDate} {schedule.lessonTime}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-500">{schedule.campus} · {schedule.coach}</div>
                </div>
                <Badge className={schedule.lessonStatus === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
                  {schedule.lessonStatus === "completed" ? "已完成" : "待上课"}
                </Badge>
              </div>
            ))}
            {attendanceLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                {log.attendanceDate} · {log.coach ?? "-"} · 扣课 {log.lessonsDeducted}
              </div>
            ))}
            {!schedules.length && !attendanceLogs.length ? <EmptyState title="暂无排课记录" detail="预约通过后会出现在这里。" /> : null}
          </div>
        </Panel>
      </div>

      <Modal onClose={() => setBookingSlot(null)} open={Boolean(bookingSlot)} title="提交预约申请">
        <form className="grid gap-4" onSubmit={submitBooking}>
          <div className="rounded-3xl border border-pool-100 bg-pool-50 p-4 text-sm font-semibold text-pool-800">
            {bookingSlot?.slotDate} {bookingSlot?.slotTime} · {bookingSlot?.campus} · {bookingSlot?.coach}
          </div>
          <Field label="备注">
            <textarea className={textareaClass} name="note" placeholder="如有特殊情况可以填写" />
          </Field>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setBookingSlot(null)} type="button" variant="secondary">取消</Button>
            <Button disabled={isPending} type="submit"><Send size={17} />提交申请</Button>
          </div>
        </form>
      </Modal>

      <Modal onClose={() => setCourseProduct(null)} open={Boolean(courseProduct)} title="提交课程申请">
        <form className="grid gap-4" onSubmit={submitCourse}>
          <div className="rounded-3xl border border-pool-100 bg-pool-50 p-4 text-sm font-semibold text-pool-800">
            {courseProduct?.name} · {courseProduct ? getProductTypeLabel(courseProduct.type) : ""}
          </div>
          <Field label="备注">
            <textarea className={textareaClass} name="note" placeholder="例如续费、换课、想调整训练目标等" />
          </Field>
          <div className="flex justify-end gap-3">
            <Button onClick={() => setCourseProduct(null)} type="button" variant="secondary">取消</Button>
            <Button disabled={isPending} type="submit"><Send size={17} />提交申请</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
