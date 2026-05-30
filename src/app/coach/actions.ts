"use server";

import { revalidatePath } from "next/cache";
import { clearDataCache } from "@/lib/data-source";
import { createClient } from "@/lib/supabase/server";

export async function markAttendance(scheduleId: string) {
  const hasSupabaseConfig =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseConfig) {
    return {
      ok: true,
      mode: "demo",
      message: "演示模式：已模拟出勤。配置 Supabase 后会写入真实日志。"
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_schedule_attended", {
    schedule_uuid: scheduleId
  });

  if (error) {
    return {
      ok: false,
      mode: "supabase",
      message: error.message
    };
  }

  clearDataCache();
  revalidatePath("/coach/today");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/attendance");
  revalidatePath("/members");
  revalidatePath("/student");

  return {
    ok: true,
    mode: "supabase",
    message: "已完成出勤并写入消课日志。"
  };
}
