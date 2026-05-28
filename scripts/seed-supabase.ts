import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { AttendanceLog, Member, Schedule, SeedData } from "../src/lib/types";
import { loadLocalEnv } from "./env";

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("请先在 .env.local 填写 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY");
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

async function seedAdmin() {
  const email = process.env.DEMO_ADMIN_EMAIL || "admin@swimops.local";
  const password = process.env.DEMO_ADMIN_PASSWORD || "1324";
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list.users.find((user) => user.email === email);
  let user = existing;

  if (!user) {
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "管理员" }
    });

    if (created.error || !created.data.user) {
      throw new Error(`create admin user: ${created.error?.message ?? "no user returned"}`);
    }

    user = created.data.user;
  }

  throwIfError(
    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: "管理员",
      role: "admin",
      campus: null,
      coach_name: null
    }),
    "upsert admin profile"
  );
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
  await seedAdmin();
  await clearExistingData();
  await seedProducts();
  await seedMembers();
  await seedSchedules();
  await seedAttendance();

  console.log("Supabase seeded");
  console.log({
    products: seed.products.length,
    members: seed.members.length,
    schedules: seed.schedules.length,
    attendanceLogs: seed.attendanceLogs.length,
    admin: process.env.DEMO_ADMIN_EMAIL || "admin@swimops.local"
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
