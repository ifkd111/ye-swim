import type {
  AttendanceLog,
  BookingRequest,
  CoachAvailabilitySlot,
  CourseApplication,
  CourseProduct,
  Member,
  ProductType,
  Schedule,
  StudentRegistration
} from "@/lib/types";

type AnyRow = Record<string, any>;

export function toProduct(row: AnyRow): CourseProduct {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    totalLessons: row.total_lessons ?? 0,
    validDays: row.valid_days ?? null,
    price: row.price ?? 0,
    notes: row.notes ?? null
  };
}

export function toMember(row: AnyRow): Member {
  const productType = (row.product_type ?? "class_pack") as ProductType;
  const totalLessons = row.total_lessons ?? 0;
  const usedLessons = row.used_lessons ?? 0;
  const remainingLessons =
    typeof row.remaining_lessons === "number" ? row.remaining_lessons : totalLessons - usedLessons;

  return {
    id: row.id,
    memberNo: Number(row.member_no ?? 0),
    chineseName: row.chinese_name,
    englishName: row.english_name ?? null,
    gender: row.gender ?? null,
    phone: row.phone ?? null,
    wechat: row.wechat ?? null,
    campus: row.campus ?? null,
    coach: row.coach ?? null,
    productId: row.product_id ?? null,
    productName: row.product_name ?? null,
    productType,
    totalLessons,
    usedLessons,
    remainingLessons,
    cardStartDate: row.card_start_date ?? null,
    cardExpireDate: row.card_expire_date ?? null,
    campStartDate: row.camp_start_date ?? null,
    campEndDate: row.camp_end_date ?? null,
    status: row.status ?? "正常",
    notes: row.notes ?? null
  };
}

export function toSchedule(row: AnyRow): Schedule {
  const memberName = row.members?.chinese_name ?? row.member?.chinese_name ?? row.member_name ?? "未命名";

  return {
    id: row.id,
    lessonDate: row.lesson_date,
    lessonTime: row.lesson_time,
    weekday: row.weekday ?? null,
    campus: row.campus,
    coach: row.coach,
    memberId: row.member_id,
    memberName,
    attended: row.attended ?? false,
    lessonStatus: row.lesson_status ?? "pending",
    source: row.source ?? null,
    sourceRow: row.source_row ?? null
  };
}

export function toAttendanceLog(row: AnyRow): AttendanceLog {
  const memberName = row.members?.chinese_name ?? row.member?.chinese_name ?? row.member_name ?? "未命名";

  return {
    id: row.id,
    attendanceDate: row.attendance_date,
    memberId: row.member_id,
    memberName,
    coach: row.coach ?? null,
    campus: row.campus ?? null,
    lessonsDeducted: row.lessons_deducted ?? 0,
    sourceScheduleId: row.source_schedule_id ?? null,
    source: row.source ?? null,
    sourceNote: row.source_note ?? null
  };
}

export function toAvailabilitySlot(row: AnyRow): CoachAvailabilitySlot {
  return {
    id: row.id,
    slotDate: row.slot_date,
    slotTime: row.slot_time,
    campus: row.campus,
    coach: row.coach,
    capacity: row.capacity ?? 1,
    status: row.status ?? "draft",
    publishOrder: row.publish_order ?? 100,
    notes: row.notes ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null
  };
}

export function toBookingRequest(row: AnyRow): BookingRequest {
  const slot = row.coach_availability_slots ?? row.slot ?? {};
  const memberName = row.members?.chinese_name ?? row.member?.chinese_name ?? row.member_name ?? "未命名";

  return {
    id: row.id,
    slotId: row.slot_id,
    memberId: row.member_id,
    memberName,
    slotDate: row.slot_date ?? slot.slot_date,
    slotTime: row.slot_time ?? slot.slot_time,
    campus: row.campus ?? slot.campus,
    coach: row.coach ?? slot.coach,
    status: row.status ?? "pending",
    note: row.note ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdScheduleId: row.created_schedule_id ?? null,
    createdAt: row.created_at ?? null
  };
}

export function toCourseApplication(row: AnyRow): CourseApplication {
  const memberName = row.members?.chinese_name ?? row.member?.chinese_name ?? row.member_name ?? "未命名";
  const productName = row.course_products?.name ?? row.product?.name ?? row.product_name ?? "课程";

  return {
    id: row.id,
    memberId: row.member_id,
    memberName,
    productId: row.product_id,
    productName,
    status: row.status ?? "pending",
    note: row.note ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at ?? null
  };
}

export function toStudentRegistration(row: AnyRow): StudentRegistration {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    productId: row.product_id ?? null,
    campus: row.campus ?? null,
    coach: row.coach ?? null,
    note: row.note ?? null,
    status: row.status ?? "pending",
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at ?? null
  };
}
