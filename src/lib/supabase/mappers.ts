import type { AttendanceLog, CourseProduct, Member, ProductType, Schedule } from "@/lib/types";

type AnyRow = Record<string, any>;

export function toProduct(row: AnyRow): CourseProduct {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    totalLessons: row.total_lessons ?? 0,
    validDays: row.valid_days ?? null,
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
