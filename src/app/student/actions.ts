"use server";

import { revalidatePath } from "next/cache";
import { requireStudentViewer } from "@/lib/authz";
import { clearDataCache } from "@/lib/data-source";
import { createClient } from "@/lib/supabase/server";

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function createStudentBookingRequestAction(slotId: string, formData: FormData) {
  try {
    await requireStudentViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "请使用学员账号登录" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_booking_request", {
    slot_uuid: slotId,
    request_note: emptyToNull(formData.get("note"))
  });

  if (error) return { ok: false, message: error.message };

  clearDataCache();
  revalidatePath("/student");
  revalidatePath("/booking-requests");
  return { ok: true, message: "预约申请已提交，等待管理员审批" };
}

export async function createCourseApplicationAction(productId: string, formData: FormData) {
  let viewer;
  try {
    viewer = await requireStudentViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "请使用学员账号登录" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("course_applications").insert({
    member_id: viewer.memberId,
    product_id: productId,
    note: emptyToNull(formData.get("note"))
  });

  if (error) return { ok: false, message: error.message };

  clearDataCache();
  revalidatePath("/student");
  revalidatePath("/course-applications");
  return { ok: true, message: "课程申请已提交，等待管理员审批" };
}
