"use server";

import { revalidatePath } from "next/cache";
import { requireAdminViewer } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number | null) {
  if (!days) return null;
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function approveCourseApplicationAction(applicationId: string) {
  try {
    await requireAdminViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  const supabase = await createClient();
  const { data: app, error: appError } = await supabase
    .from("course_applications")
    .select("id, member_id, product_id, status, course_products(type, total_lessons, valid_days)")
    .eq("id", applicationId)
    .single();

  if (appError || !app) return { ok: false, message: appError?.message ?? "申请不存在" };
  if (app.status !== "pending") return { ok: false, message: "该申请已处理" };

  const product = Array.isArray(app.course_products) ? app.course_products[0] : app.course_products;
  const startDate = today();
  const memberPayload: Record<string, unknown> = {
    product_id: app.product_id,
    card_start_date: startDate,
    card_expire_date: addDays(startDate, product?.valid_days ?? null),
    updated_at: new Date().toISOString()
  };

  if (product?.type === "class_pack") {
    memberPayload.total_lessons = product.total_lessons ?? 0;
  }

  const { error: memberError } = await supabase.from("members").update(memberPayload).eq("id", app.member_id);
  if (memberError) return { ok: false, message: memberError.message };

  const { error } = await supabase
    .from("course_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", applicationId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/course-applications");
  revalidatePath("/members");
  revalidatePath("/student");
  return { ok: true, message: "课程申请已通过，学员卡项已更新" };
}

export async function rejectCourseApplicationAction(applicationId: string) {
  try {
    await requireAdminViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", applicationId)
    .eq("status", "pending");

  if (error) return { ok: false, message: error.message };

  revalidatePath("/course-applications");
  revalidatePath("/student");
  return { ok: true, message: "课程申请已拒绝" };
}
