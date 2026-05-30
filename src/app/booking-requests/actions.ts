"use server";

import { revalidatePath } from "next/cache";
import { requireAdminViewer } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";

export async function approveBookingRequestAction(requestId: string) {
  try {
    await requireAdminViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_booking_request", {
    request_uuid: requestId
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/booking-requests");
  revalidatePath("/schedule");
  revalidatePath("/coach/today");
  revalidatePath("/student");
  return { ok: true, message: "预约已通过，并生成正式排课" };
}

export async function rejectBookingRequestAction(requestId: string) {
  try {
    await requireAdminViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_booking_request", {
    request_uuid: requestId
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/booking-requests");
  revalidatePath("/student");
  return { ok: true, message: "预约已拒绝" };
}
