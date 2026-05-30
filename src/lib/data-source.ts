import { cache } from "react";
import { getAttendanceLogs as mockAttendance, getMembers as mockMembers, getSchedules as mockSchedules, getSeedData } from "@/lib/mock-data";
import { accountFromEmail, normalizeAccount, roleFromAccount } from "@/lib/account-role";
import { minStudentBookingDate } from "@/lib/booking-rules";
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

export type AppViewer = {
  userId: string | null;
  role: UserRole | null;
  fullName: string | null;
  memberId: string | null;
  coachName: string | null;
};

export type AppData = {
  mode: DataMode;
  viewer: AppViewer;
  products: CourseProduct[];
  members: Member[];
  schedules: Schedule[];
  attendanceLogs: AttendanceLog[];
  availabilitySlots: CoachAvailabilitySlot[];
  bookingRequests: BookingRequest[];
  courseApplications: CourseApplication[];
  studentRegistrations: StudentRegistration[];
};

type Supabase = Awaited<ReturnType<typeof createClient>>;
type QueryError = { code?: string; message?: string } | null | undefined;
type CacheEntry<T> = { expiresAt: number; value: T };

const requestCache = new Map<string, CacheEntry<unknown>>();
const SHORT_TTL = 12;
const MEDIUM_TTL = 30;
const LONG_TTL = 120;

function userRoleFromMetadata(value: unknown): UserRole | null {
  if (value === "admin" || value === "frontdesk" || value === "coach" || value === "student") {
    return value;
  }
  return null;
}

function isMissingSchema(error: QueryError) {
  return error?.code === "42703" || error?.code === "42P01" || error?.message?.includes("does not exist");
}

function throwIfError(error: QueryError) {
  if (error && !isMissingSchema(error)) {
    throw error;
  }
}

async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const existing = requestCache.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  const value = await loader();
  requestCache.set(key, { expiresAt: now + ttlSeconds * 1000, value });
  return value;
}

export function clearDataCache() {
  requestCache.clear();
}

function viewerCacheKey(viewer: AppViewer) {
  return [
    viewer.role ?? "guest",
    viewer.memberId ?? "no-member",
    viewer.coachName ?? "no-coach",
    viewer.userId ?? "no-user"
  ].join(":");
}

function demoViewer(): AppViewer {
  return {
    userId: null,
    role: "admin",
    fullName: "本地演示管理员",
    memberId: null,
    coachName: null
  };
}

function getDemoAppData(): AppData {
  const seed = getSeedData();
  return {
    mode: "demo",
    viewer: demoViewer(),
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

const getSupabaseContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const metadata = user?.user_metadata ?? {};
  const profileResult = user
    ? await supabase
        .from("profiles")
        .select("id, full_name, role, account, member_id, coach_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  if (profileResult.error && !isMissingSchema(profileResult.error)) {
    throw profileResult.error;
  }

  const account =
    normalizeAccount(profileResult.data?.account) ||
    normalizeAccount(metadata.account) ||
    accountFromEmail(user?.email);
  const role = roleFromAccount(account) ?? userRoleFromMetadata(profileResult.data?.role ?? metadata.role);
  const fullName =
    typeof profileResult.data?.full_name === "string"
      ? profileResult.data.full_name
      : typeof metadata.full_name === "string"
        ? metadata.full_name
        : null;

  return {
    supabase,
    viewer: {
      userId: user?.id ?? null,
      role,
      fullName,
      memberId: typeof profileResult.data?.member_id === "string" ? profileResult.data.member_id : null,
      coachName: typeof profileResult.data?.coach_name === "string" ? profileResult.data.coach_name : null
    } satisfies AppViewer
  };
});

async function getShellData() {
  if (!hasSupabaseBrowserConfig()) {
    return { mode: "demo" as const, viewer: demoViewer(), supabase: null };
  }

  const { supabase, viewer } = await getSupabaseContext();
  return { mode: "supabase" as const, viewer, supabase };
}

async function selectProducts(supabase: Supabase) {
  return cached("products:all", LONG_TTL, async () => {
    const { data, error } = await supabase
      .from("course_products")
      .select("*")
      .order("created_at", { ascending: true });
    throwIfError(error);
    return (data ?? []).map(toProduct);
  });
}

async function selectMembers(supabase: Supabase, viewer: AppViewer, limit = 1500) {
  if (viewer.role === "student" && !viewer.memberId) return [];
  if (viewer.role === "coach" && !viewer.coachName) return [];
  if (!viewer.role) return [];

  return cached(`members:${viewerCacheKey(viewer)}:${limit}`, SHORT_TTL, async () => {
    let query = supabase
      .from("member_balances")
      .select("*")
      .order("member_no", { ascending: true })
      .limit(limit);

    if (viewer.role === "student" && viewer.memberId) {
      query = query.eq("id", viewer.memberId);
    }

    if (viewer.role === "coach" && viewer.coachName) {
      query = query.eq("coach", viewer.coachName);
    }

    const { data, error } = await query;
    throwIfError(error);
    return (data ?? []).map(toMember);
  });
}

async function selectSchedules(
  supabase: Supabase,
  viewer: AppViewer,
  options: {
    status?: "pending" | "completed" | "cancelled";
    limit?: number;
    ascending?: boolean;
  } = {}
) {
  if (viewer.role === "student" && !viewer.memberId) return [];
  if (viewer.role === "coach" && !viewer.coachName) return [];
  if (!viewer.role) return [];

  const { status, limit = 500, ascending = true } = options;
  return cached(`schedules:${viewerCacheKey(viewer)}:${status ?? "all"}:${limit}:${ascending}`, SHORT_TTL, async () => {
    let query = supabase
      .from("schedules")
      .select("*, members(chinese_name)")
      .order("lesson_date", { ascending })
      .order("lesson_time", { ascending: true })
      .limit(limit);

    if (status) {
      query = query.eq("lesson_status", status);
    }

    if (viewer.role === "student" && viewer.memberId) {
      query = query.eq("member_id", viewer.memberId);
    }

    if (viewer.role === "coach" && viewer.coachName) {
      query = query.eq("coach", viewer.coachName);
    }

    const { data, error } = await query;
    throwIfError(error);
    return (data ?? []).map(toSchedule);
  });
}

async function selectAttendanceLogs(supabase: Supabase, viewer: AppViewer, limit = 500) {
  if (viewer.role === "student" && !viewer.memberId) return [];
  if (viewer.role === "coach" && !viewer.coachName) return [];
  if (!viewer.role) return [];

  return cached(`attendance:${viewerCacheKey(viewer)}:${limit}`, SHORT_TTL, async () => {
    let query = supabase
      .from("attendance_logs")
      .select("*, members(chinese_name)")
      .order("attendance_date", { ascending: false })
      .limit(limit);

    if (viewer.role === "student" && viewer.memberId) {
      query = query.eq("member_id", viewer.memberId);
    }

    if (viewer.role === "coach" && viewer.coachName) {
      query = query.eq("coach", viewer.coachName);
    }

    const { data, error } = await query;
    throwIfError(error);
    return (data ?? []).map(toAttendanceLog);
  });
}

async function selectAvailabilitySlots(supabase: Supabase, viewer: AppViewer, limit = 1000) {
  if (viewer.role === "coach" && !viewer.coachName) return [];
  if (viewer.role === "student" && !viewer.memberId) return [];
  if (!viewer.role) return [];

  return cached(`availability:${viewerCacheKey(viewer)}:${limit}`, SHORT_TTL, async () => {
    let query = supabase
      .from("coach_availability_slots")
      .select("*")
      .order("slot_date", { ascending: true })
      .order("publish_order", { ascending: true })
      .order("slot_time", { ascending: true })
      .limit(limit);

    if (viewer.role === "coach" && viewer.coachName) {
      query = query.eq("coach", viewer.coachName);
    }

    if (viewer.role === "student") {
      query = query.eq("status", "published").gte("slot_date", minStudentBookingDate());
    }

    const { data, error } = await query;
    throwIfError(error);
    return (data ?? []).map(toAvailabilitySlot);
  });
}

async function selectStudentAvailabilitySlots(supabase: Supabase, viewer: AppViewer, member: Member | null) {
  if (viewer.role !== "student" || !viewer.memberId) return [];

  return cached(`student-slots:${viewer.memberId}:${member?.coach ?? "all"}:${minStudentBookingDate()}`, SHORT_TTL, async () => {
    let query = supabase
      .from("coach_availability_slots")
      .select("*")
      .eq("status", "published")
      .gte("slot_date", minStudentBookingDate())
      .order("slot_date", { ascending: true })
      .order("publish_order", { ascending: true })
      .order("slot_time", { ascending: true })
      .limit(100);

    if (member?.coach) {
      query = query.eq("coach", member.coach);
    }

    const { data, error } = await query;
    throwIfError(error);
    return (data ?? []).map(toAvailabilitySlot);
  });
}

async function selectBookingRequests(supabase: Supabase, viewer: AppViewer, limit = 500) {
  if (viewer.role === "student" && !viewer.memberId) return [];
  if (viewer.role === "coach" && !viewer.coachName) return [];
  if (!viewer.role) return [];

  return cached(`bookings:${viewerCacheKey(viewer)}:${limit}`, SHORT_TTL, async () => {
    let query = supabase
      .from("booking_requests")
      .select("*, members(chinese_name), coach_availability_slots(slot_date, slot_time, campus, coach)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (viewer.role === "student" && viewer.memberId) {
      query = query.eq("member_id", viewer.memberId);
    }

    const { data, error } = await query;
    throwIfError(error);
    return (data ?? []).map(toBookingRequest);
  });
}

async function selectCourseApplications(supabase: Supabase, viewer: AppViewer, limit = 500) {
  if (viewer.role === "student" && !viewer.memberId) return [];
  if (!viewer.role) return [];

  return cached(`course-apps:${viewerCacheKey(viewer)}:${limit}`, SHORT_TTL, async () => {
    let query = supabase
      .from("course_applications")
      .select("*, members(chinese_name), course_products(name)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (viewer.role === "student" && viewer.memberId) {
      query = query.eq("member_id", viewer.memberId);
    }

    const { data, error } = await query;
    throwIfError(error);
    return (data ?? []).map(toCourseApplication);
  });
}

async function selectStudentRegistrations(supabase: Supabase, limit = 500) {
  return cached(`student-registrations:${limit}`, MEDIUM_TTL, async () => {
    const { data, error } = await supabase
      .from("student_registrations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error && isMissingSchema(error)) return [];
    throwIfError(error);
    return (data ?? []).map(toStudentRegistration);
  });
}

export async function getPageChromeData() {
  const shell = await getShellData();
  return { mode: shell.mode, viewer: shell.viewer };
}

export async function getDashboardData() {
  if (!hasSupabaseBrowserConfig()) {
    return getDemoAppData();
  }

  const { supabase, viewer } = await getSupabaseContext();
  const [members, schedules, attendanceLogs] = await Promise.all([
    selectMembers(supabase, viewer, 1000),
    selectSchedules(supabase, viewer, { status: "pending", limit: 120 }),
    selectAttendanceLogs(supabase, viewer, 200)
  ]);

  return {
    mode: "supabase" as const,
    viewer,
    products: [],
    members,
    schedules,
    attendanceLogs,
    availabilitySlots: [],
    bookingRequests: [],
    courseApplications: [],
    studentRegistrations: []
  };
}

export async function getMembersPageData() {
  if (!hasSupabaseBrowserConfig()) {
    const data = getDemoAppData();
    return { mode: data.mode, viewer: data.viewer, members: data.members };
  }

  const { supabase, viewer } = await getSupabaseContext();
  const members = await selectMembers(supabase, viewer, 1500);
  return { mode: "supabase" as const, viewer, members };
}

export async function getSchedulePageData() {
  if (!hasSupabaseBrowserConfig()) {
    const data = getDemoAppData();
    return {
      mode: data.mode,
      viewer: data.viewer,
      members: data.members,
      schedules: data.schedules,
      attendanceLogs: data.attendanceLogs
    };
  }

  const { supabase, viewer } = await getSupabaseContext();
  const [members, schedules] = await Promise.all([
    selectMembers(supabase, viewer, 1500),
    selectSchedules(supabase, viewer, { limit: 1500 })
  ]);

  return {
    mode: "supabase" as const,
    viewer,
    members,
    schedules,
    attendanceLogs: []
  };
}

export async function getAttendancePageData() {
  if (!hasSupabaseBrowserConfig()) {
    const data = getDemoAppData();
    return { mode: data.mode, viewer: data.viewer, attendanceLogs: data.attendanceLogs };
  }

  const { supabase, viewer } = await getSupabaseContext();
  const attendanceLogs = await selectAttendanceLogs(supabase, viewer, 1500);
  return { mode: "supabase" as const, viewer, attendanceLogs };
}

export async function getAvailabilityPageData() {
  if (!hasSupabaseBrowserConfig()) {
    const data = getDemoAppData();
    return { mode: data.mode, viewer: data.viewer, availabilitySlots: data.availabilitySlots };
  }

  const { supabase, viewer } = await getSupabaseContext();
  const availabilitySlots = await selectAvailabilitySlots(supabase, viewer, 1000);
  return { mode: "supabase" as const, viewer, availabilitySlots };
}

export async function getBookingRequestsPageData() {
  if (!hasSupabaseBrowserConfig()) {
    const data = getDemoAppData();
    return { mode: data.mode, viewer: data.viewer, bookingRequests: data.bookingRequests };
  }

  const { supabase, viewer } = await getSupabaseContext();
  const bookingRequests = await selectBookingRequests(supabase, viewer, 1000);
  return { mode: "supabase" as const, viewer, bookingRequests };
}

export async function getCourseApplicationsPageData() {
  if (!hasSupabaseBrowserConfig()) {
    const data = getDemoAppData();
    return { mode: data.mode, viewer: data.viewer, courseApplications: data.courseApplications };
  }

  const { supabase, viewer } = await getSupabaseContext();
  const courseApplications = await selectCourseApplications(supabase, viewer, 1000);
  return { mode: "supabase" as const, viewer, courseApplications };
}

export async function getProductsPageData() {
  if (!hasSupabaseBrowserConfig()) {
    const data = getDemoAppData();
    return { mode: data.mode, viewer: data.viewer, products: data.products };
  }

  const { supabase, viewer } = await getSupabaseContext();
  const products = await selectProducts(supabase);
  return { mode: "supabase" as const, viewer, products };
}

export async function getStudentPageData() {
  if (!hasSupabaseBrowserConfig()) {
    const data = getDemoAppData();
    return {
      mode: data.mode,
      viewer: data.viewer,
      member: data.members[0] ?? null,
      products: data.products,
      schedules: data.schedules,
      attendanceLogs: data.attendanceLogs,
      availabilitySlots: data.availabilitySlots,
      bookingRequests: data.bookingRequests,
      courseApplications: data.courseApplications
    };
  }

  const { supabase, viewer } = await getSupabaseContext();
  const [members, products, schedules, attendanceLogs, bookingRequests, courseApplications] = await Promise.all([
    selectMembers(supabase, viewer, 1),
    selectProducts(supabase),
    selectSchedules(supabase, viewer, { limit: 120, ascending: false }),
    selectAttendanceLogs(supabase, viewer, 120),
    selectBookingRequests(supabase, viewer, 120),
    selectCourseApplications(supabase, viewer, 120)
  ]);
  const member = members[0] ?? null;
  const availabilitySlots = await selectStudentAvailabilitySlots(supabase, viewer, member);

  return {
    mode: "supabase" as const,
    viewer,
    member,
    products,
    schedules,
    attendanceLogs,
    availabilitySlots,
    bookingRequests,
    courseApplications
  };
}

export async function getCoachTodayPageData() {
  if (!hasSupabaseBrowserConfig()) {
    const data = getDemoAppData();
    return { mode: data.mode, viewer: data.viewer, schedules: data.schedules, attendanceLogs: data.attendanceLogs };
  }

  const { supabase, viewer } = await getSupabaseContext();
  const schedules = await selectSchedules(supabase, viewer, { status: "pending", limit: 120 });
  return { mode: "supabase" as const, viewer, schedules, attendanceLogs: [] };
}

export async function getImportsPageData() {
  return getPageChromeData();
}

export async function getStaffPageData() {
  if (!hasSupabaseBrowserConfig()) {
    const data = getDemoAppData();
    return { mode: data.mode, viewer: data.viewer, members: data.members };
  }

  const { supabase, viewer } = await getSupabaseContext();
  const members = await selectMembers(supabase, viewer, 1500);
  return { mode: "supabase" as const, viewer, members };
}

export async function getAppData(): Promise<AppData> {
  if (!hasSupabaseBrowserConfig()) {
    return getDemoAppData();
  }

  const { supabase, viewer } = await getSupabaseContext();
  const [
    products,
    members,
    schedules,
    attendanceLogs,
    availabilitySlots,
    bookingRequests,
    courseApplications,
    studentRegistrations
  ] = await Promise.all([
    selectProducts(supabase),
    selectMembers(supabase, viewer),
    selectSchedules(supabase, viewer, { limit: 1500 }),
    selectAttendanceLogs(supabase, viewer, 1500),
    selectAvailabilitySlots(supabase, viewer),
    selectBookingRequests(supabase, viewer, 1000),
    selectCourseApplications(supabase, viewer, 1000),
    selectStudentRegistrations(supabase, 1000)
  ]);

  return {
    mode: "supabase",
    viewer,
    products,
    members,
    schedules,
    attendanceLogs,
    availabilitySlots,
    bookingRequests,
    courseApplications,
    studentRegistrations
  };
}
