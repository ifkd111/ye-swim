"use server";

import { revalidatePath } from "next/cache";
import { requireAdminViewer } from "@/lib/authz";
import { clearDataCache } from "@/lib/data-source";
import { parseStandardImportWorkbook, type ImportIssue, type StandardImportParseResult } from "@/lib/standard-import";
import { createClient } from "@/lib/supabase/server";
import type { ProductType, LessonStatus } from "@/lib/types";

type ActionResult = {
  ok: boolean;
  message: string;
  stats?: {
    members: number;
    schedules: number;
    attendanceLogs: number;
    skippedSchedules: number;
  };
  errors?: ImportIssue[];
  warnings?: ImportIssue[];
};

type DbMember = {
  id: string;
  chinese_name: string;
  product_id: string | null;
  total_lessons: number;
};

type ProductRow = {
  id: string;
  name: string;
  type: ProductType;
};

type BalanceRow = {
  product_type: ProductType | null;
};

function weekdayOf(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${date}T00:00:00`));
}

function pickFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  return file;
}

function addIssue(issues: ImportIssue[], sheet: string | null, row: number | null, field: string | null, message: string) {
  issues.push({ sheet, row, field, message });
}

async function loadProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("course_products").select("id, name, type").order("created_at", { ascending: true });
  if (error) throw error;

  const byType = new Map<ProductType, ProductRow>();
  const byName = new Map<string, ProductRow>();
  (data ?? []).forEach((product) => {
    const row = product as ProductRow;
    if (!byType.has(row.type)) byType.set(row.type, row);
    byName.set(row.name.trim().toLowerCase(), row);
  });

  return { byType, byName };
}

function productFor(row: { productType: ProductType; productName: string | null }, products: Awaited<ReturnType<typeof loadProducts>>) {
  if (row.productName) {
    const byName = products.byName.get(row.productName.trim().toLowerCase());
    if (byName) return byName;
  }
  return products.byType.get(row.productType) ?? null;
}

async function productTypeForMemberFrom(supabase: Awaited<ReturnType<typeof createClient>>, memberId: string) {
  const { data } = await supabase.from("member_balances").select("product_type").eq("id", memberId).maybeSingle();
  return ((data as BalanceRow | null)?.product_type ?? "class_pack") as ProductType;
}

function deductionForProduct(productType: ProductType) {
  return productType === "class_pack" ? 1 : 0;
}

function deductionForManualLog(productType: ProductType, requested: number) {
  return productType === "class_pack" ? requested : 0;
}

function attendedForStatus(status: LessonStatus) {
  return status === "completed";
}

async function validateLinkedData(parsed: StandardImportParseResult) {
  const issues = [...parsed.errors];
  const warnings = [...parsed.warnings];
  const products = await loadProducts();
  const memberNames = new Set(parsed.members.map((member) => member.name));

  const supabase = await createClient();
  const { data: existing, error } = await supabase.from("members").select("id, chinese_name, product_id, total_lessons");
  if (error) throw error;

  const existingMap = new Map<string, DbMember>();
  (existing ?? []).forEach((member) => existingMap.set(String(member.chinese_name), member as DbMember));

  parsed.members.forEach((member) => {
    if (!productFor(member, products)) {
      addIssue(issues, "学员", member.rowNumber, "课程类型/产品名称", `找不到课程产品：${member.productName || member.productType}`);
    }
  });

  const knownName = (name: string) => memberNames.has(name) || existingMap.has(name);
  parsed.schedules.forEach((schedule) => {
    if (!knownName(schedule.memberName)) {
      addIssue(issues, "排课", schedule.rowNumber, "学员姓名*", `系统中没有学员「${schedule.memberName}」，请先在学员表加入`);
    }
  });

  parsed.attendanceLogs.forEach((log) => {
    if (!knownName(log.memberName)) {
      addIssue(issues, "消课", log.rowNumber, "学员姓名*", `系统中没有学员「${log.memberName}」，请先在学员表加入`);
    }
  });

  const attendanceKeys = new Set<string>();
  parsed.attendanceLogs.forEach((log) => {
    const key = `${log.memberName}|${log.attendanceDate}|${log.lessonsDeducted}|${log.sourceNote ?? ""}`;
    if (attendanceKeys.has(key)) {
      warnings.push({
        sheet: "消课",
        row: log.rowNumber,
        field: "学员姓名*/日期",
        message: "同一个文件里发现重复消课记录，导入时会保留第一条，跳过后续重复项"
      });
      return;
    }
    attendanceKeys.add(key);
  });

  if (!parsed.members.length && (parsed.schedules.length || parsed.attendanceLogs.length)) {
    warnings.push({
      sheet: "学员",
      row: null,
      field: null,
      message: "本次文件没有学员表数据，排课/消课只会匹配系统已有学员"
    });
  }

  return { issues, warnings, products, existingMap };
}

export async function validateStandardImportAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  const file = pickFile(formData);
  if (!file) return { ok: false, message: "请选择 Excel 文件", errors: [] };

  try {
    const parsed = await parseStandardImportWorkbook(file);
    const { issues, warnings } = await validateLinkedData(parsed);
    return {
      ok: issues.length === 0,
      message: issues.length ? "校验未通过，请先修正表格" : "校验通过，可以导入",
      stats: {
        members: parsed.members.length,
        schedules: parsed.schedules.length,
        attendanceLogs: parsed.attendanceLogs.length,
        skippedSchedules: 0
      },
      errors: issues,
      warnings
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Excel 解析失败", errors: [] };
  }
}

export async function importStandardWorkbookAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  const file = pickFile(formData);
  if (!file) return { ok: false, message: "请选择 Excel 文件", errors: [] };

  try {
    const parsed = await parseStandardImportWorkbook(file);
    const { issues, warnings, products, existingMap } = await validateLinkedData(parsed);
    if (issues.length) {
      return { ok: false, message: "导入已停止：校验未通过", errors: issues, warnings };
    }

    const supabase = await createClient();
    const memberMap = new Map(existingMap);
    let memberCount = 0;
    let scheduleCount = 0;
    let attendanceCount = 0;
    let skippedSchedules = 0;

    for (const member of parsed.members) {
      const product = productFor(member, products);
      if (!product) continue;

      const payload = {
        chinese_name: member.name,
        english_name: member.englishName,
        gender: member.gender,
        phone: member.phone,
        wechat: member.wechat,
        campus: member.campus,
        coach: member.coach ?? "未分配",
        product_id: product.id,
        total_lessons: member.totalLessons,
        card_start_date: member.cardStartDate,
        card_expire_date: member.cardExpireDate,
        notes: member.notes,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from("members").upsert(payload, { onConflict: "chinese_name" }).select("id, chinese_name, product_id, total_lessons").single();
      if (error) throw error;
      memberMap.set(member.name, data as DbMember);
      memberCount += 1;
    }

    for (const schedule of parsed.schedules) {
      const member = memberMap.get(schedule.memberName);
      if (!member) continue;

      const { data: duplicate, error: duplicateError } = await supabase
        .from("schedules")
        .select("id")
        .eq("member_id", member.id)
        .eq("lesson_date", schedule.lessonDate)
        .eq("lesson_time", schedule.lessonTime)
        .maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) {
        skippedSchedules += 1;
        continue;
      }

      const { data, error } = await supabase
        .from("schedules")
        .insert({
          lesson_date: schedule.lessonDate,
          lesson_time: schedule.lessonTime,
          weekday: weekdayOf(schedule.lessonDate),
          campus: schedule.campus,
          coach: schedule.coach,
          member_id: member.id,
          attended: attendedForStatus(schedule.lessonStatus),
          lesson_status: schedule.lessonStatus,
          source: "standard_import",
          source_row: schedule.rowNumber
        })
        .select("id")
        .single();
      if (error) throw error;
      scheduleCount += 1;

      if (schedule.lessonStatus === "completed") {
        const deducted = deductionForProduct(await productTypeForMemberFrom(supabase, member.id));
        if (deducted > 0) {
          const { error: attendanceError } = await supabase.from("attendance_logs").insert({
            attendance_date: schedule.lessonDate,
            member_id: member.id,
            coach: schedule.coach,
            campus: schedule.campus,
            lessons_deducted: deducted,
            source_schedule_id: data.id,
            source: "standard_import",
            source_note: schedule.notes ?? `排课表第 ${schedule.rowNumber} 行`
          });
          if (attendanceError && attendanceError.code !== "23505") throw attendanceError;
          if (!attendanceError) attendanceCount += 1;
        }
      }
    }

    for (const log of parsed.attendanceLogs) {
      const member = memberMap.get(log.memberName);
      if (!member) continue;

      const deducted = deductionForManualLog(await productTypeForMemberFrom(supabase, member.id), log.lessonsDeducted);
      const sourceNote = log.sourceNote ?? `消课表第 ${log.rowNumber} 行${deducted === 0 ? "；非次卡不扣课时" : ""}`;
      const { data: duplicateLog, error: duplicateLogError } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("member_id", member.id)
        .eq("attendance_date", log.attendanceDate)
        .eq("source", "standard_import")
        .eq("source_note", sourceNote)
        .maybeSingle();
      if (duplicateLogError) throw duplicateLogError;
      if (duplicateLog) continue;

      const { error } = await supabase.from("attendance_logs").insert({
        attendance_date: log.attendanceDate,
        member_id: member.id,
        coach: log.coach,
        campus: log.campus,
        lessons_deducted: deducted,
        source_schedule_id: null,
        source: "standard_import",
        source_note: sourceNote
      });
      if (error) throw error;
      attendanceCount += 1;
    }

    clearDataCache();
    revalidatePath("/imports");
    revalidatePath("/members");
    revalidatePath("/schedule");
    revalidatePath("/attendance");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: "导入完成",
      stats: {
        members: memberCount,
        schedules: scheduleCount,
        attendanceLogs: attendanceCount,
        skippedSchedules
      },
      warnings
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "导入失败", errors: [] };
  }
}
