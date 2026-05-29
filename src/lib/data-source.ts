import { getAttendanceLogs as mockAttendance, getMembers as mockMembers, getSchedules as mockSchedules, getSeedData } from "@/lib/mock-data";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { toAttendanceLog, toMember, toProduct, toSchedule } from "@/lib/supabase/mappers";
import type { AttendanceLog, CourseProduct, Member, Schedule, UserRole } from "@/lib/types";

export type DataMode = "supabase" | "demo";

export type AppData = {
  mode: DataMode;
  viewer: {
    userId: string | null;
    role: UserRole | null;
    fullName: string | null;
  };
  products: CourseProduct[];
  members: Member[];
  schedules: Schedule[];
  attendanceLogs: AttendanceLog[];
};

function userRoleFromMetadata(value: unknown): UserRole | null {
  if (value === "admin" || value === "frontdesk" || value === "coach") {
    return value;
  }
  return null;
}

export async function getAppData(): Promise<AppData> {
  if (!hasSupabaseBrowserConfig()) {
    const seed = getSeedData();
    return {
      mode: "demo",
      viewer: {
        userId: null,
        role: "admin",
        fullName: "本地演示管理员"
      },
      products: seed.products,
      members: mockMembers(),
      schedules: mockSchedules(),
      attendanceLogs: mockAttendance()
    };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const metadata = user?.user_metadata ?? {};
  const metadataRole = userRoleFromMetadata(metadata.role);
  const metadataName = typeof metadata.full_name === "string" ? metadata.full_name : null;
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
    viewer: {
      userId: user?.id ?? null,
      role: metadataRole,
      fullName: metadataName
    },
    products: (productsResult.data ?? []).map(toProduct),
    members: (membersResult.data ?? []).map(toMember),
    schedules: (schedulesResult.data ?? []).map(toSchedule),
    attendanceLogs: (attendanceResult.data ?? []).map(toAttendanceLog)
  };
}
