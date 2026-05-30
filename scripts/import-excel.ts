import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import type {
  AttendanceLog,
  CourseProduct,
  Member,
  ProductType,
  Schedule,
  SeedData
} from "../src/lib/types";

const DEFAULT_YEAR = 2026;
const EXCEL_PATH = process.env.EXCEL_SOURCE_PATH || path.join(process.cwd(), "出勤测试(2).xlsx");
const OUTPUT_PATH = path.join(process.cwd(), "src", "data", "seed.json");

type RawMember = {
  id: string;
  name: string;
  gender: string | null;
  campus: string | null;
  coach: string | null;
  productId: string;
  totalLessons: number;
  cardExpireDate: string | null;
  notes: string[];
};

type Context = {
  members: Map<string, RawMember>;
  schedules: Schedule[];
  attendanceLogs: AttendanceLog[];
  rawSessions: number;
  rawAttendanceSlots: number;
};

const products: CourseProduct[] = [
  {
    id: "product-class-pack",
    name: "模拟次卡",
    type: "class_pack",
    totalLessons: 20,
    validDays: 365,
    price: 0,
    notes: "Excel 导入默认产品"
  },
  {
    id: "product-monthly",
    name: "模拟月卡",
    type: "monthly",
    totalLessons: 0,
    validDays: 31,
    price: 0,
    notes: "按有效期判断，不扣课时"
  },
  {
    id: "product-camp",
    name: "模拟集训",
    type: "camp",
    totalLessons: 0,
    validDays: 14,
    price: 0,
    notes: "按集训日期判断，不扣课时"
  },
  {
    id: "product-vip",
    name: "VIP",
    type: "vip",
    totalLessons: 0,
    validDays: null,
    price: 0,
    notes: "状态永远正常"
  }
];

function slug(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return "";

  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }

  return String(value).trim();
}

function displayText(cell: ExcelJS.Cell) {
  const text = cell.text?.trim();
  if (text) return text;
  return normalizeText(cell.value);
}

function mergedValue(worksheet: ExcelJS.Worksheet, rowNumber: number, columnNumber: number) {
  const cell = worksheet.getCell(rowNumber, columnNumber);
  if (cell.value !== null && cell.value !== undefined && displayText(cell) !== "") {
    return displayText(cell);
  }

  const mergedCells = (worksheet as unknown as { _merges?: Record<string, ExcelJS.Range> })._merges ?? {};

  for (const range of Object.values(mergedCells)) {
    if (
      rowNumber >= range.top &&
      rowNumber <= range.bottom &&
      columnNumber >= range.left &&
      columnNumber <= range.right
    ) {
      return displayText(worksheet.getCell(range.top, range.left));
    }
  }

  return "";
}

function parseMonthDay(raw: string) {
  const match = raw.match(/(\d{1,2})\D+(\d{1,2})/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${DEFAULT_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateCell(cell: ExcelJS.Cell) {
  if (cell.value instanceof Date) {
    return cell.value.toISOString().slice(0, 10);
  }

  const text = displayText(cell);
  if (!text) return null;

  const fullDateMatch = text.match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
  if (fullDateMatch) {
    return `${fullDateMatch[1]}-${fullDateMatch[2].padStart(2, "0")}-${fullDateMatch[3].padStart(2, "0")}`;
  }

  const shortYearMatch = text.match(/\b(\d{2})\D+(\d{1,2})\D+(\d{1,2})\b/);
  if (shortYearMatch) {
    return `20${shortYearMatch[1]}-${shortYearMatch[2].padStart(2, "0")}-${shortYearMatch[3].padStart(2, "0")}`;
  }

  return parseMonthDay(text);
}

function parseExpireDate(raw: string) {
  const full = raw.match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
  if (full) {
    return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
  }

  const yearMonth = raw.match(/\b(\d{2})\D+(\d{1,2})\b/);
  if (!yearMonth) return null;

  const year = Number(`20${yearMonth[1]}`);
  const month = Number(yearMonth[2]);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(year, month, 0).getDate();

  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function parseLessonTime(raw: string) {
  const normalized = raw.replace(/\D/g, "");
  if (!normalized) return raw;

  if (normalized.length <= 2) {
    return `${normalized.padStart(2, "0")}:00`;
  }

  const hours = normalized.slice(0, -2).padStart(2, "0");
  const minutes = normalized.slice(-2);
  return `${hours}:${minutes}`;
}

function productFromPaymentInfo(info: string): { type: ProductType; totalLessons: number; productId: string } {
  const lower = info.toLowerCase();

  if (lower.includes("vip")) {
    return { type: "vip", totalLessons: 0, productId: "product-vip" };
  }

  if (info.includes("月")) {
    return { type: "monthly", totalLessons: 0, productId: "product-monthly" };
  }

  if (info.includes("集训")) {
    return { type: "camp", totalLessons: 0, productId: "product-camp" };
  }

  const match = info.match(/(\d+)\s*次?/);
  const totalLessons = match ? Number(match[1]) : 20;
  return { type: "class_pack", totalLessons, productId: "product-class-pack" };
}

function getOrCreateMember(context: Context, name: string, updates: Partial<RawMember> = {}) {
  const trimmedName = name.trim();
  let member = context.members.get(trimmedName);

  if (!member) {
    member = {
      id: `member-${slug(trimmedName)}`,
      name: trimmedName,
      gender: null,
      campus: null,
      coach: "未分配",
      productId: "product-class-pack",
      totalLessons: 20,
      cardExpireDate: null,
      notes: []
    };
    context.members.set(trimmedName, member);
  }

  if (updates.gender) member.gender = updates.gender;
  if (updates.campus) member.campus = updates.campus;
  if (updates.coach) member.coach = updates.coach;
  if (updates.productId) member.productId = updates.productId;
  if (typeof updates.totalLessons === "number") member.totalLessons = updates.totalLessons;
  if (updates.cardExpireDate) member.cardExpireDate = updates.cardExpireDate;
  if (updates.notes?.length) {
    member.notes.push(...updates.notes);
  }

  return member;
}

function addAttendanceLog(context: Context, log: AttendanceLog) {
  const duplicateBySchedule = log.sourceScheduleId
    ? context.attendanceLogs.some((item) => item.sourceScheduleId === log.sourceScheduleId)
    : false;

  if (duplicateBySchedule) return;

  const duplicateSheet2 = context.attendanceLogs.some(
    (item) =>
      item.memberId === log.memberId &&
      item.attendanceDate === log.attendanceDate &&
      item.source === "sheet2"
  );

  if (log.source === "sheet2" && duplicateSheet2) return;

  context.attendanceLogs.push(log);
}

function importAttendanceSheet(workbook: ExcelJS.Workbook, context: Context) {
  const worksheet = workbook.getWorksheet("出勤名单");
  if (!worksheet) {
    throw new Error("找不到 Sheet: 出勤名单");
  }

  let currentDate = "";
  let currentCampus = "";
  let currentWeekday = "";

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const directDate = displayText(row.getCell(1));
    const directCampus = displayText(row.getCell(2));
    const directWeekdayOrTime = displayText(row.getCell(3));

    if (directDate || (directCampus && directWeekdayOrTime.includes("周"))) {
      currentDate = mergedValue(worksheet, rowNumber, 1);
      currentCampus = mergedValue(worksheet, rowNumber, 2);
      currentWeekday = mergedValue(worksheet, rowNumber, 3);
      return;
    }

    const timeRaw = displayText(row.getCell(3));
    if (!timeRaw || !currentDate || !currentCampus) return;

    const lessonDate = parseMonthDay(currentDate);
    if (!lessonDate) return;

    const names: string[] = [];
    for (let columnNumber = 4; columnNumber <= worksheet.columnCount; columnNumber += 1) {
      const cellText = displayText(row.getCell(columnNumber));
      if (!cellText || /^\d+$/.test(cellText)) continue;
      names.push(cellText);
    }

    if (!names.length) return;

    context.rawSessions += 1;
    context.rawAttendanceSlots += names.length;

    names.forEach((name, index) => {
      const coach = `${currentCampus}教练`;
      const member = getOrCreateMember(context, name, {
        campus: currentCampus,
        coach
      });
      const scheduleId = `schedule-${slug(`${lessonDate}-${timeRaw}-${currentCampus}-${name}-${rowNumber}-${index}`)}`;
      const schedule: Schedule = {
        id: scheduleId,
        lessonDate,
        lessonTime: parseLessonTime(timeRaw),
        weekday: currentWeekday,
        campus: currentCampus,
        coach,
        memberId: member.id,
        memberName: member.name,
        attended: true,
        lessonStatus: "completed",
        source: "sheet1",
        sourceRow: rowNumber
      };

      context.schedules.push(schedule);
      addAttendanceLog(context, {
        id: `attendance-${slug(scheduleId)}`,
        attendanceDate: lessonDate,
        memberId: member.id,
        memberName: member.name,
        coach,
        campus: currentCampus,
        lessonsDeducted: 1,
        sourceScheduleId: schedule.id,
        source: "sheet1",
        sourceNote: `出勤名单第 ${rowNumber} 行`
      });
    });
  });
}

function findScheduleForSheet2(context: Context, memberId: string, attendanceDate: string) {
  return context.schedules.find(
    (schedule) =>
      schedule.memberId === memberId &&
      schedule.lessonDate === attendanceDate &&
      schedule.lessonStatus === "completed"
  );
}

function importPaymentSheet(workbook: ExcelJS.Workbook, context: Context) {
  const worksheet = workbook.getWorksheet("部分收费扣课信息");
  if (!worksheet) {
    throw new Error("找不到 Sheet: 部分收费扣课信息");
  }

  let lastCampus = "";
  let lastMember: RawMember | null = null;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values = Array.isArray(row.values) ? row.values : [];
    const hasContent = values.some((value) => normalizeText(value) !== "");
    if (!hasContent) return;

    const campus = displayText(row.getCell(1)) || lastCampus;
    if (campus) lastCampus = campus;

    const name = displayText(row.getCell(3));
    const gender = displayText(row.getCell(4)) || null;
    const expireRaw = displayText(row.getCell(5));
    const paymentInfo = displayText(row.getCell(6));
    const productInfo = paymentInfo ? productFromPaymentInfo(paymentInfo) : null;

    if (name) {
      lastMember = getOrCreateMember(context, name, {
        campus,
        gender,
        productId: productInfo?.productId,
        totalLessons: productInfo?.totalLessons,
        cardExpireDate: expireRaw ? parseExpireDate(expireRaw) : null,
        notes: paymentInfo ? [`支付信息：${paymentInfo}`] : []
      });
    } else if (lastMember) {
      if (paymentInfo) {
        const info = productFromPaymentInfo(paymentInfo);
        lastMember.productId = info.productId;
        lastMember.totalLessons = info.totalLessons;
        lastMember.notes.push(`追加支付信息：${paymentInfo}`);
      }

      if (expireRaw) {
        lastMember.cardExpireDate = parseExpireDate(expireRaw);
      }
    }

    if (!lastMember) return;

    for (let columnNumber = 7; columnNumber <= worksheet.columnCount; columnNumber += 1) {
      const cell = row.getCell(columnNumber);
      const cellRaw = displayText(cell);
      if (!cellRaw) continue;

      const attendanceDate = parseDateCell(cell);
      if (!attendanceDate) {
        lastMember.notes.push(`未识别扣课记录：${cellRaw}`);
        continue;
      }

      const matchingSchedule = findScheduleForSheet2(context, lastMember.id, attendanceDate);
      if (matchingSchedule) {
        continue;
      }

      addAttendanceLog(context, {
        id: `attendance-sheet2-${slug(`${lastMember.id}-${attendanceDate}-${rowNumber}-${columnNumber}-${cellRaw}`)}`,
        attendanceDate,
        memberId: lastMember.id,
        memberName: lastMember.name,
        coach: lastMember.coach,
        campus: lastMember.campus,
        lessonsDeducted: 1,
        sourceScheduleId: null,
        source: "sheet2",
        sourceNote: `收费扣课第 ${rowNumber} 行：${cellRaw}`
      });
    }
  });
}

function addCurrentWeekPendingLessons(context: Context) {
  const sampleSchedules = context.schedules
    .filter((schedule) => ["国际", "古北", "绿洲"].includes(schedule.campus))
    .slice(0, 18);

  const baseDate = new Date();
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - ((baseDate.getDay() + 6) % 7));

  sampleSchedules.forEach((schedule, index) => {
    const lessonDate = new Date(start);
    lessonDate.setDate(start.getDate() + (index % 6));
    const isoDate = lessonDate.toISOString().slice(0, 10);
    const id = `schedule-current-${slug(`${schedule.memberId}-${isoDate}-${index}`)}`;

    context.schedules.push({
      ...schedule,
      id,
      lessonDate: isoDate,
      lessonTime: schedule.lessonTime,
      weekday: ["周一", "周二", "周三", "周四", "周五", "周六"][index % 6],
      attended: false,
      lessonStatus: "pending",
      source: "current_week_mock",
      sourceRow: null
    });
  });
}

function buildMembers(context: Context): Member[] {
  const usedLessons = new Map<string, number>();
  context.attendanceLogs.forEach((log) => {
    usedLessons.set(log.memberId, (usedLessons.get(log.memberId) ?? 0) + log.lessonsDeducted);
  });

  return [...context.members.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
    .map((raw, index) => {
      const product = products.find((item) => item.id === raw.productId) ?? products[0];
      const used = usedLessons.get(raw.id) ?? 0;
      const remaining =
        product.type === "class_pack" ? raw.totalLessons - used : raw.totalLessons;
      let status: Member["status"] = "正常";

      if (product.type === "class_pack") {
        if (remaining < 0) status = "欠课";
        else if (remaining === 0) status = "已完成";
        else if (remaining <= 5) status = "即将用完";
      }

      return {
        id: raw.id,
        memberNo: index + 1,
        chineseName: raw.name,
        englishName: null,
        gender: raw.gender,
        phone: null,
        wechat: null,
        campus: raw.campus,
        coach: raw.coach,
        productId: product.id,
        productName: product.name,
        productType: product.type,
        totalLessons: raw.totalLessons,
        usedLessons: used,
        remainingLessons: remaining,
        cardStartDate: null,
        cardExpireDate: raw.cardExpireDate,
        campStartDate: null,
        campEndDate: null,
        status,
        notes: [...new Set(raw.notes)].join("\n") || null
      };
    });
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`找不到 Excel 文件：${EXCEL_PATH}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  const context: Context = {
    members: new Map(),
    schedules: [],
    attendanceLogs: [],
    rawSessions: 0,
    rawAttendanceSlots: 0
  };

  importAttendanceSheet(workbook, context);
  importPaymentSheet(workbook, context);
  addCurrentWeekPendingLessons(context);

  const members = buildMembers(context);
  const seed: SeedData = {
    generatedAt: new Date().toISOString(),
    stats: {
      products: products.length,
      members: members.length,
      schedules: context.schedules.length,
      attendanceLogs: context.attendanceLogs.length,
      rawSessions: context.rawSessions,
      rawAttendanceSlots: context.rawAttendanceSlots
    },
    products,
    members,
    schedules: context.schedules,
    attendanceLogs: context.attendanceLogs
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(seed, null, 2)}\n`, "utf8");

  console.log(`Seed generated: ${OUTPUT_PATH}`);
  console.log(seed.stats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
