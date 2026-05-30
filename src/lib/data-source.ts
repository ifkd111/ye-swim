import { getAttendanceLogs as mockAttendance, getMembers as mockMembers, getSchedules as mockSchedules, getSeedData } from "@/lib/mock-data";
import { accountFromEmail, normalizeAccount, roleFromAccount } from "@/lib/account-role";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  toAttendanceLog,
  toAvailabilitySlot,
  toBookingRequest,
  toCourseApplication,
  toMember,
  toProduct,
  toSchedule,
  toStudentRegistration
} from "@/lib/supabase/mappers";
import type {
  AttendanceLog,
  BookingRequest,
  CoachAvailabilitySlot,
  CourseApplication,
  CourseProduct,
  Member,
  Schedule,
  StudentRegistration,
  UserRole
} from "@/lib/types";

export type DataMode = "supabase" | "demo";

export type AppData = {
  mode: DataMode;
  viewer: {
    userId: string | null;
    role: UserRole | null;
    fullName: string | null;
    memberId: string | null;
    coachName: string | null;
  };
  products: CourseProduct[];
  members: Member[];
  schedules: Schedule[];
  attendanceLogs: AttendanceLog[];
  availabilitySlots: CoachAvailabilitySlot[];
  bookingRequests: BookingRequest[];
  courseApplications: CourseApplication[];
  studentRegistrations: StudentRegistration[];
};

function userRoleFromMetadata(value: unknown): UserRole | null {
  if (value === "admin" || value === "frontdesk" || value === "coach" || value === "student") {
    return value;
  }
  return null;
}

function isMissingSchema(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "42703" || error?.code === "42P01" || error?.message?.includes("does not exist");
}

export async function getAppData(): Promise<AppData> {
  if (!hasSupabaseBrowserConfig()) {
    const seed = getSeedData();
    return {
      mode: "demo",
      viewer: {
        userId: null,
        role: "admin",
        fullName: "本地演示管理员",
        memberId: null,
        coachName: null
      },
      products: seed.products,
      members: mockMembers(),
      schedules: mockSchedules(),
      attendanceLogs: mockAttendance(),
      availabilitySlots: [],
      bookingRequests: [],
      courseApplications: [],
      studentRegistrations: []
    };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const metadata = user?.user_metadata ?? {};
  const profileResult = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null, error: null };

  if (profileResult.error && !isMissingSchema(profileResult.error)) {
    throw profileResult.error;
  }

  const account =
    normalizeAccount(profileResult.data?.account) ||
    normalizeAccount(metadata.account) ||
    accountFromEmail(user?.email);
  const metadataRole = roleFromAccount(account) ?? userRoleFromMetadata(profileResult.data?.role ?? metadata.role);
  const metadataName =
    typeof profileResult.data?.full_name === "string"
      ? profileResult.data.full_name
      : typeof metadata.full_name === "string"
        ? metadata.full_name
        : null;
  const viewerMemberId = typeof profileResult.data?.member_id === "string" ? profileResult.data.member_id : null;
  const viewerCoachName = typeof profileResult.data?.coach_name === "string" ? profileResult.data.coach_name : null;
  const [productsResult, membersResult, schedulesResult, attendanceResult, slotsResult, bookingsResult, applicationsResult, registrationsResult] = await Promise.all([
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
      .limit(1500),
    supabase
      .from("coach_availability_slots")
      .select("*")
      .order("slot_date", { ascending: true })
      .order("publish_order", { ascending: true })
      .order("slot_time", { ascending: true })
      .limit(1000),
    supabase
      .from("booking_requests")
      .select("*, members(chinese_name), coach_availability_slots(slot_date, slot_time, campus, coach)")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("course_applications")
      .select("*, members(chinese_name), course_products(name)")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("student_registrations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000)
  ]);

  const blockingError = productsResult.error ?? membersResult.error ?? schedulesResult.error ?? attendanceResult.error;
  if (blockingError) {
    throw blockingError;
  }

  const optionalError = slotsResult.error ?? bookingsResult.error ?? applicationsResult.error ?? registrationsResult.error;
  if (optionalError && !isMissingSchema(optionalError)) {
    throw (
      slotsResult.error ??
      bookingsResult.error ??
      applicationsResult.error ??
      registrationsResult.error
    );
  }

  return {
    mode: "supabase",
    viewer: {
      userId: user?.id ?? null,
      role: metadataRole,
      fullName: metadataName,
      memberId: viewerMemberId,
      coachName: viewerCoachName
    },
    products: (productsResult.data ?? []).map(toProduct),
    members: (membersResult.data ?? []).map(toMember),
    schedules: (schedulesResult.data ?? []).map(toSchedule),
    attendanceLogs: (attendanceResult.data ?? []).map(toAttendanceLog),
    availabilitySlots: slotsResult.error ? [] : (slotsResult.data ?? []).map(toAvailabilitySlot),
    bookingRequests: bookingsResult.error ? [] : (bookingsResult.data ?? []).map(toBookingRequest),
    courseApplications: applicationsResult.error ? [] : (applicationsResult.data ?? []).map(toCourseApplication),
    studentRegistrations: registrationsResult.error ? [] : (registrationsResult.data ?? []).map(toStudentRegistration)
  };
}
