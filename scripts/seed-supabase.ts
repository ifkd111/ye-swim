import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { AttendanceLog, Member, Schedule, SeedData, UserRole } from "../src/lib/types";
import { loadLocalEnv } from "./env";

loadLocalEnv();
dns.setDefaultResultOrder("ipv4first");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const seedPath = path.join(process.cwd(), "src", "data", "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedData;

const productIdMap = new Map<string, string>();
const memberIdMap = new Map<string, string>();
const scheduleIdMap = new Map<string, string>();

type StaffSeed = {
  account: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  campus: string | null;
  coachName: string | null;
};

async function failIfError<T>({ data, error }: { data: T | null; error: any }, label: string): Promise<T> {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  if (data === null) {
    throw new Error(`${label}: no data returned`);
  }
  return data;
}

function throwIfError({ error }: { error: any }, label: string) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function envOrDefault(key: string, fallback: string) {
  const value = process.env[key]?.trim();
  return value || fallback;
}

function accountToEmail(account: string) {
  return account === "admin" ? "admin@swimops.local" : `${account}@swimops.local`;
}

function assertValidAccount(account: StaffSeed) {
  if (account.role === "admin") {
    if (account.account !== "admin") {
      throw new Error("Admin account must be the unique admin");
    }
    return;
  }

  if (account.role === "coach" && !account.account.startsWith("jl")) {
    throw new Error(`Coach account must start with jl: ${account.account}`);
  }

  if (account.role === "frontdesk" && !account.account.startsWith("qt")) {
    throw new Error(`Frontdesk account must start with qt: ${account.account}`);
  }
}

function assertStrongEnoughPassword(account: StaffSeed) {
  if (account.password.length < 4) {
    throw new Error(`${account.account} password must be at least 4 characters`);
  }
}

function resolveCoachAssignment() {
  const scheduleMatch = seed.schedules.find((schedule) => schedule.coach && schedule.coach !== "未分配");
  const memberMatch = seed.members.find((member) => member.coach && member.coach !== "未分配");

  const coachName = envOrDefault("DEMO_COACH_NAME", scheduleMatch?.coach ?? memberMatch?.coach ?? "");
  const campus = process.env.DEMO_COACH_CAMPUS?.trim() || scheduleMatch?.campus || memberMatch?.campus || null;

  if (!coachName) {
    throw new Error("Could not infer DEMO_COACH_NAME from seed.json. Set DEMO_COACH_NAME in .env.local.");
  }

  return {
    coachName,
    campus
  };
}

async function ensureAuthUser(account: StaffSeed) {
  const listed = await supabase.auth.admin.listUsers();
  if (listed.error) {
    throw new Error(`list users: ${listed.error.message}`);
  }

  const existing = listed.data.users.find((user) => user.email === account.email);

  if (existing) {
    const updated = await supabase.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName, account: account.account, role: account.role }
    });

    if (updated.error || !updated.data.user) {
      throw new Error(`update auth user ${account.email}: ${updated.error?.message ?? "no user returned"}`);
    }

    return updated.data.user;
  }

  const created = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { full_name: account.fullName, account: account.account, role: account.role }
  });

  if (created.error || !created.data.user) {
    throw new Error(`create auth user ${account.email}: ${created.error?.message ?? "no user returned"}`);
  }

  return created.data.user;
}

async function seedStaffAccounts() {
  const coachAssignment = resolveCoachAssignment();
  const adminAccount = envOrDefault("DEMO_ADMIN_ACCOUNT", "admin").toLowerCase();
  const frontdeskAccount = envOrDefault("DEMO_FRONTDESK_ACCOUNT", "qt001").toLowerCase();
  const coachAccount = envOrDefault("DEMO_COACH_ACCOUNT", "jl001").toLowerCase();

  const accounts: StaffSeed[] = [
    {
      account: adminAccount,
      email: accountToEmail(adminAccount),
      password: envOrDefault("DEMO_ADMIN_PASSWORD", "132400"),
      fullName: "管理员",
      role: "admin",
      campus: null,
      coachName: null
    },
    {
      account: frontdeskAccount,
      email: accountToEmail(frontdeskAccount),
      password: envOrDefault("DEMO_FRONTDESK_PASSWORD", "132400"),
      fullName: "前台",
      role: "frontdesk",
      campus: coachAssignment.campus,
      coachName: null
    },
    {
      account: coachAccount,
      email: accountToEmail(coachAccount),
      password: envOrDefault("DEMO_COACH_PASSWORD", "132400"),
      fullName: coachAssignment.coachName,
      role: "coach",
      campus: coachAssignment.campus,
      coachName: coachAssignment.coachName
    }
  ];

  for (const account of accounts) {
    assertValidAccount(account);
    assertStrongEnoughPassword(account);
    const user = await ensureAuthUser(account);
    throwIfError(
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: account.fullName,
        role: account.role,
        campus: account.campus,
        coach_name: account.coachName,
        updated_at: new Date().toISOString()
      }),
      `upsert profile ${account.account}`
    );
  }

  return accounts;
}

async function removeLegacyStaffAccounts() {
  const legacyEmails = ["frontdesk@swimops.local", "coach@swimops.local"];
  const listed = await supabase.auth.admin.listUsers();

  if (listed.error) {
    throw new Error(`list users for cleanup: ${listed.error.message}`);
  }

  for (const email of legacyEmails) {
    const found = listed.data.users.find((user) => user.email === email);
    if (!found) continue;

    const deleted = await supabase.auth.admin.deleteUser(found.id);
    if (deleted.error) {
      throw new Error(`delete legacy user ${email}: ${deleted.error.message}`);
    }
  }
}

async function clearExistingData() {
  throwIfError(await supabase.from("attendance_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000"), "clear attendance");
  throwIfError(await supabase.from("schedules").delete().neq("id", "00000000-0000-0000-0000-000000000000"), "clear schedules");
  throwIfError(await supabase.from("members").delete().neq("id", "00000000-0000-0000-0000-000000000000"), "clear members");
  throwIfError(await supabase.from("course_products").delete().neq("id", "00000000-0000-0000-0000-000000000000"), "clear products");
}

async function seedProducts() {
  for (const product of seed.products) {
    const data = (await failIfError(
      await supabase
        .from("course_products")
        .insert({
          name: product.name,
          type: product.type,
          total_lessons: product.totalLessons,
          valid_days: product.validDays,
          notes: product.notes
        })
        .select("id")
        .single(),
      `insert product ${product.name}`
    )) as { id: string };
    productIdMap.set(product.id, data.id);
  }
}

function memberPayload(member: Member) {
  return {
    chinese_name: member.chineseName,
    english_name: member.englishName,
    gender: member.gender,
    phone: member.phone,
    wechat: member.wechat,
    campus: member.campus,
    coach: member.coach,
    product_id: member.productId ? productIdMap.get(member.productId) ?? null : null,
    total_lessons: member.totalLessons,
    card_start_date: member.cardStartDate,
    card_expire_date: member.cardExpireDate,
    camp_start_date: member.campStartDate,
    camp_end_date: member.campEndDate,
    notes: member.notes
  };
}

async function seedMembers() {
  for (const batch of chunks(seed.members, 150)) {
    const data = await failIfError(
      await supabase.from("members").insert(batch.map(memberPayload)).select("id,chinese_name"),
      "insert members"
    );

    data.forEach((row: { id: string; chinese_name: string }) => {
      const source = batch.find((member) => member.chineseName === row.chinese_name);
      if (source) memberIdMap.set(source.id, row.id);
    });
  }
}

function schedulePayload(schedule: Schedule) {
  return {
    lesson_date: schedule.lessonDate,
    lesson_time: schedule.lessonTime,
    weekday: schedule.weekday,
    campus: schedule.campus,
    coach: schedule.coach,
    member_id: memberIdMap.get(schedule.memberId),
    attended: schedule.attended,
    lesson_status: schedule.lessonStatus,
    source: schedule.source,
    source_row: schedule.sourceRow
  };
}

async function seedSchedules() {
  for (const batch of chunks(seed.schedules, 150)) {
    const payloads = batch.map(schedulePayload).filter((item) => item.member_id);
    const data = await failIfError(
      await supabase.from("schedules").insert(payloads).select("id,member_id,lesson_date,lesson_time,campus,source_row"),
      "insert schedules"
    );

    data.forEach((row: any) => {
      const source = batch.find(
        (schedule) =>
          memberIdMap.get(schedule.memberId) === row.member_id &&
          schedule.lessonDate === row.lesson_date &&
          schedule.lessonTime === row.lesson_time &&
          schedule.campus === row.campus &&
          schedule.sourceRow === row.source_row
      );
      if (source) scheduleIdMap.set(source.id, row.id);
    });
  }
}

function attendancePayload(log: AttendanceLog) {
  return {
    attendance_date: log.attendanceDate,
    member_id: memberIdMap.get(log.memberId),
    coach: log.coach,
    campus: log.campus,
    lessons_deducted: log.lessonsDeducted,
    source_schedule_id: log.sourceScheduleId ? scheduleIdMap.get(log.sourceScheduleId) ?? null : null,
    source: log.source,
    source_note: log.sourceNote
  };
}

async function seedAttendance() {
  const seenSchedules = new Set<string>();
  for (const batch of chunks(seed.attendanceLogs, 150)) {
    const payloads = batch
      .map(attendancePayload)
      .filter((item) => {
        if (!item.member_id) return false;
        if (item.source_schedule_id) {
          if (seenSchedules.has(item.source_schedule_id)) return false;
          seenSchedules.add(item.source_schedule_id);
        }
        return true;
      });

    throwIfError(await supabase.from("attendance_logs").insert(payloads), "insert attendance");
  }
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function main() {
  await removeLegacyStaffAccounts();
  const staffAccounts = await seedStaffAccounts();
  await clearExistingData();
  await seedProducts();
  await seedMembers();
  await seedSchedules();
  await seedAttendance();

  const admin = staffAccounts.find((account) => account.role === "admin");
  const frontdesk = staffAccounts.find((account) => account.role === "frontdesk");
  const coach = staffAccounts.find((account) => account.role === "coach");

  console.log("Supabase seeded");
  console.log({
    products: seed.products.length,
    members: seed.members.length,
    schedules: seed.schedules.length,
    attendanceLogs: seed.attendanceLogs.length,
    admin: admin?.account,
    frontdesk: frontdesk?.account,
    coach: coach?.account,
    coachName: coach?.coachName
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
