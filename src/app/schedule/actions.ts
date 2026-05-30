"use server";

import { revalidatePath } from "next/cache";
import { clearDataCache } from "@/lib/data-source";
import { createClient } from "@/lib/supabase/server";

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function weekdayOf(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${date}T00:00:00`));
}

export async function createScheduleAction(formData: FormData) {
  const supabase = await createClient();
  const lessonDate = String(formData.get("lessonDate") ?? "");

  const payload = {
    member_id: String(formData.get("memberId") ?? ""),
    lesson_date: lessonDate,
    lesson_time: String(formData.get("lessonTime") ?? "17:00"),
    weekday: lessonDate ? weekdayOf(lessonDate) : null,
    campus: String(formData.get("campus") ?? "").trim() || "未填",
    coach: String(formData.get("coach") ?? "").trim() || "未分配",
    attended: false,
    lesson_status: "pending",
    source: "web_form"
  };

  if (!payload.member_id || !payload.lesson_date) {
    return { ok: false, message: "请选择学员和日期" };
  }

  const { error } = await supabase.from("schedules").insert(payload);
  if (error) return { ok: false, message: error.message };

  clearDataCache();
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  revalidatePath("/coach/today");
  return { ok: true, message: "排课已保存" };
}

export async function updateScheduleAction(scheduleId: string, formData: FormData) {
  const supabase = await createClient();
  const lessonDate = String(formData.get("lessonDate") ?? "");

  const payload = {
    member_id: String(formData.get("memberId") ?? ""),
    lesson_date: lessonDate,
    lesson_time: String(formData.get("lessonTime") ?? "17:00"),
    weekday: lessonDate ? weekdayOf(lessonDate) : null,
    campus: String(formData.get("campus") ?? "").trim() || "未填",
    coach: String(formData.get("coach") ?? "").trim() || "未分配",
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("schedules").update(payload).eq("id", scheduleId);
  if (error) return { ok: false, message: error.message };

  const { error: syncError } = await supabase.rpc("sync_completed_schedule_attendance", {
    schedule_uuid: scheduleId
  });
  if (syncError) return { ok: false, message: syncError.message };

  clearDataCache();
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  revalidatePath("/coach/today");
  revalidatePath("/members");
  revalidatePath("/attendance");
  return { ok: true, message: "排课已更新" };
}

export async function deleteScheduleAction(scheduleId: string) {
  const supabase = await createClient();
  await supabase.from("attendance_logs").delete().eq("source_schedule_id", scheduleId);
  const { error } = await supabase.from("schedules").delete().eq("id", scheduleId);
  if (error) return { ok: false, message: error.message };

  clearDataCache();
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  revalidatePath("/coach/today");
  revalidatePath("/members");
  revalidatePath("/attendance");
  return { ok: true, message: "排课已删除" };
}

export async function completeScheduleAction(scheduleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_schedule_attended", {
    schedule_uuid: scheduleId
  });

  if (error) return { ok: false, message: error.message };

  clearDataCache();
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  revalidatePath("/coach/today");
  revalidatePath("/attendance");
  revalidatePath("/members");
  revalidatePath("/student");
  return { ok: true, message: "已出勤并写入消课日志" };
}
