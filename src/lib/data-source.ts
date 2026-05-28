import { getAttendanceLogs as mockAttendance, getMembers as mockMembers, getSchedules as mockSchedules, getSeedData } from "@/lib/mock-data";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { toAttendanceLog, toMember, toProduct, toSchedule } from "@/lib/supabase/mappers";
import type { AttendanceLog, CourseProduct, Member, Schedule } from "@/lib/types";

export type DataMode = "supabase" | "demo";

export type AppData = {
  mode: DataMode;
  products: CourseProduct[];
  members: Member[];
  schedules: Schedule[];
  attendanceLogs: AttendanceLog[];
};

export async function getAppData(): Promise<AppData> {
  if (!hasSupabaseBrowserConfig()) {
    const seed = getSeedData();
    return {
      mode: "demo",
      products: seed.products,
      members: mockMembers(),
      schedules: mockSchedules(),
      attendanceLogs: mockAttendance()
    };
  }

  try {
    const supabase = await createClient();
    const [productsResult, membersResult, schedulesResult, attendanceResult] = await Promise.all([
      supabase.from("course_products").select("*").order("created_at", { ascending: true }),
      supabase.from("member_balances").select("*").order("member_no", { ascending: true }),
      supabase
        .from("schedules")
        .select("*, members(chinese_name)")
        .order("lesson_date", { ascending: true })
        .order("lesson_time", { ascending: true })
        .limit(1500),
      supabase
        .from("attendance_logs")
        .select("*, members(chinese_name)")
        .order("attendance_date", { ascending: false })
        .limit(1500)
    ]);

    if (productsResult.error || membersResult.error || schedulesResult.error || attendanceResult.error) {
      throw productsResult.error ?? membersResult.error ?? schedulesResult.error ?? attendanceResult.error;
    }

    return {
      mode: "supabase",
      products: (productsResult.data ?? []).map(toProduct),
      members: (membersResult.data ?? []).map(toMember),
      schedules: (schedulesResult.data ?? []).map(toSchedule),
      attendanceLogs: (attendanceResult.data ?? []).map(toAttendanceLog)
    };
  } catch (error) {
    console.error("Falling back to demo data because Supabase read failed:", error);
    const seed = getSeedData();
    return {
      mode: "demo",
      products: seed.products,
      members: mockMembers(),
      schedules: mockSchedules(),
      attendanceLogs: mockAttendance()
    };
  }
}
