import fs from "node:fs";
import path from "node:path";
import exampleSeed from "@/data/seed.example.json";
import type { AttendanceLog, Member, Schedule, SeedData } from "@/lib/types";

export function getSeedData(): SeedData {
  const seedPath = path.join(process.cwd(), "src", "data", "seed.json");

  if (!fs.existsSync(seedPath)) {
    return exampleSeed as SeedData;
  }

  return JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedData;
}

export function getMembers(): Member[] {
  return [...getSeedData().members].sort((a, b) => {
    const statusWeight = { 欠课: 0, 即将用完: 1, 正常: 2 };
    return statusWeight[a.status] - statusWeight[b.status] || a.chineseName.localeCompare(b.chineseName, "zh-CN");
  });
}

export function getSchedules(): Schedule[] {
  return [...getSeedData().schedules].sort((a, b) => {
    const byDate = a.lessonDate.localeCompare(b.lessonDate);
    if (byDate !== 0) return byDate;
    return a.lessonTime.localeCompare(b.lessonTime);
  });
}

export function getAttendanceLogs(): AttendanceLog[] {
  return [...getSeedData().attendanceLogs].sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
}

export function getTodaySchedules(limit = 18) {
  const pending = getSchedules().filter((schedule) => schedule.lessonStatus === "pending");
  return pending.slice(0, limit);
}

export function getDashboardData() {
  const members = getMembers();
  const schedules = getSchedules();
  const attendanceLogs = getAttendanceLogs();
  const todaySchedules = getTodaySchedules(20);
  const completedToday = todaySchedules.filter((schedule) => schedule.attended).length;

  return {
    members,
    schedules,
    attendanceLogs,
    todaySchedules,
    stats: [
      { label: "学员", value: members.length.toString(), detail: "Excel 模拟名单" },
      { label: "今日课程", value: todaySchedules.length.toString(), detail: `${completedToday} 已出勤` },
      { label: "欠课学员", value: members.filter((member) => member.status === "欠课").length.toString(), detail: "允许负课时" },
      { label: "即将续费", value: members.filter((member) => member.status === "即将用完").length.toString(), detail: "剩余课时 <= 5" }
    ],
    campusCounts: schedules.reduce<Record<string, number>>((acc, schedule) => {
      acc[schedule.campus] = (acc[schedule.campus] ?? 0) + 1;
      return acc;
    }, {}),
    coachCounts: schedules.reduce<Record<string, number>>((acc, schedule) => {
      acc[schedule.coach] = (acc[schedule.coach] ?? 0) + 1;
      return acc;
    }, {})
  };
}
