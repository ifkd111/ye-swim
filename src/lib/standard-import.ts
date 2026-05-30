import ExcelJS from "exceljs";
import type { LessonStatus, ProductType } from "@/lib/types";

export const MEMBER_SHEET = "学员";
export const SCHEDULE_SHEET = "排课";
export const ATTENDANCE_SHEET = "消课";
export const README_SHEET = "说明";

export const memberHeaders = [
  "姓名*",
  "英文名",
  "性别",
  "手机号",
  "微信",
  "校区",
  "教练",
  "课程类型*",
  "产品名称",
  "总课时",
  "开卡日期(YYYY-MM-DD)",
  "到期日期(YYYY-MM-DD)",
  "备注"
] as const;

export const scheduleHeaders = [
  "日期(YYYY-MM-DD)*",
  "时间(HH:mm或HH:mm-HH:mm)*",
  "校区*",
  "教练*",
  "学员姓名*",
  "状态(pending/completed/cancelled)",
  "备注"
] as const;

export const attendanceHeaders = [
  "日期(YYYY-MM-DD)*",
  "学员姓名*",
  "教练",
  "校区",
  "扣课数",
  "来源备注"
] as const;

export type ImportIssue = {
  sheet: string | null;
  row: number | null;
  field: string | null;
  message: string;
};

export type StandardMemberRow = {
  rowNumber: number;
  name: string;
  englishName: string | null;
  gender: string | null;
  phone: string | null;
  wechat: string | null;
  campus: string | null;
  coach: string | null;
  productType: ProductType;
  productName: string | null;
  totalLessons: number;
  cardStartDate: string | null;
  cardExpireDate: string | null;
  notes: string | null;
};

export type StandardScheduleRow = {
  rowNumber: number;
  lessonDate: string;
  lessonTime: string;
  campus: string;
  coach: string;
  memberName: string;
  lessonStatus: LessonStatus;
  notes: string | null;
};

export type StandardAttendanceRow = {
  rowNumber: number;
  attendanceDate: string;
  memberName: string;
  coach: string | null;
  campus: string | null;
  lessonsDeducted: number;
  sourceNote: string | null;
};

export type StandardImportParseResult = {
  members: StandardMemberRow[];
  schedules: StandardScheduleRow[];
  attendanceLogs: StandardAttendanceRow[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
};

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    return toDateString(value);
  }

  if (typeof value === "object") {
    const rich = value as { text?: unknown; result?: unknown; hyperlink?: unknown };
    if (typeof rich.text === "string") return rich.text.trim();
    if (rich.result !== undefined) return cleanText(rich.result);
  }

  return String(value).trim();
}

function cellText(row: ExcelJS.Row, column: number) {
  return cleanText(row.getCell(column).value || row.getCell(column).text);
}

function headerKey(value: string) {
  return value.replace(/\s/g, "").replace(/[＊*]/g, "").trim();
}

function buildHeaderMap(worksheet: ExcelJS.Worksheet, expectedHeaders: readonly string[], errors: ImportIssue[]) {
  const headerRow = worksheet.getRow(1);
  const actual = new Map<string, number>();

  headerRow.eachCell((cell, column) => {
    const key = headerKey(cleanText(cell.value || cell.text));
    if (key) actual.set(key, column);
  });

  const map = new Map<string, number>();
  expectedHeaders.forEach((header) => {
    const column = actual.get(headerKey(header));
    if (!column) {
      errors.push({
        sheet: worksheet.name,
        row: 1,
        field: header,
        message: `缺少表头：${header}`
      });
      return;
    }
    map.set(header, column);
  });

  return map;
}

function toDateString(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function excelSerialToDate(value: number) {
  const utcDays = Math.floor(value - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return new Date(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate());
}

function parseDateValue(value: unknown) {
  if (value instanceof Date) return toDateString(value);
  if (typeof value === "number" && value > 20000 && value < 80000) return toDateString(excelSerialToDate(value));

  const text = cleanText(value)
    .replace(/[年月/.]/g, "-")
    .replace(/日/g, "")
    .trim();
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateCell(row: ExcelJS.Row, column: number) {
  const cell = row.getCell(column);
  return parseDateValue(cell.value ?? cell.text);
}

function normalizeTimePart(hour: number, minute: number) {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeValue(value: unknown) {
  if (value instanceof Date) return normalizeTimePart(value.getHours(), value.getMinutes());

  const text = cleanText(value).replace(/：/g, ":").replace(/[~至—–]/g, "-");
  if (!text) return null;

  const compact = text.match(/^(\d{1,2})(\d{2})$/);
  if (compact) return normalizeTimePart(Number(compact[1]), Number(compact[2]));

  const hourOnly = text.match(/^(\d{1,2})$/);
  if (hourOnly) return normalizeTimePart(Number(hourOnly[1]), 0);

  const range = text.match(/^(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?$/);
  if (!range) return null;

  const start = normalizeTimePart(Number(range[1]), Number(range[2]));
  if (!start) return null;
  if (!range[3]) return start;

  const end = normalizeTimePart(Number(range[3]), Number(range[4]));
  return end ? `${start}-${end}` : null;
}

function normalizeProductType(raw: string): ProductType | null {
  const value = raw.trim().toLowerCase();
  if (value === "class_pack" || value === "次卡") return "class_pack";
  if (value === "monthly" || value === "月卡") return "monthly";
  if (value === "camp" || value === "集训") return "camp";
  if (value === "vip" || value === "vip卡") return "vip";
  return null;
}

function normalizeLessonStatus(raw: string): LessonStatus | null {
  const value = raw.trim().toLowerCase();
  if (!value || value === "pending" || value === "待出勤" || value === "待上课") return "pending";
  if (value === "completed" || value === "已完成" || value === "已出勤") return "completed";
  if (value === "cancelled" || value === "已取消" || value === "取消") return "cancelled";
  return null;
}

function numberOrDefault(raw: string, fallback: number) {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowIsBlank(row: ExcelJS.Row, columns: Iterable<number>) {
  for (const column of columns) {
    if (cellText(row, column)) return false;
  }
  return true;
}

function readWorksheet(workbook: ExcelJS.Workbook, name: string, errors: ImportIssue[]) {
  const worksheet = workbook.getWorksheet(name);
  if (!worksheet) {
    errors.push({ sheet: name, row: null, field: null, message: `找不到工作表：${name}` });
    return null;
  }
  return worksheet;
}

function readMembers(workbook: ExcelJS.Workbook, result: StandardImportParseResult) {
  const worksheet = readWorksheet(workbook, MEMBER_SHEET, result.errors);
  if (!worksheet) return;

  const map = buildHeaderMap(worksheet, memberHeaders, result.errors);
  if (map.size !== memberHeaders.length) return;
  const columns = memberHeaders.map((header) => map.get(header)!);
  const seen = new Set<string>();

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (rowIsBlank(row, columns)) continue;

    const name = cellText(row, map.get("姓名*")!);
    const productRaw = cellText(row, map.get("课程类型*")!);
    const productType = normalizeProductType(productRaw);
    const totalLessons = numberOrDefault(cellText(row, map.get("总课时")!), productType === "class_pack" ? 20 : 0);
    const cardStartDate = parseDateCell(row, map.get("开卡日期(YYYY-MM-DD)")!);
    const cardExpireDate = parseDateCell(row, map.get("到期日期(YYYY-MM-DD)")!);

    if (!name) {
      result.errors.push({ sheet: MEMBER_SHEET, row: rowNumber, field: "姓名*", message: "学员姓名不能为空" });
    }
    if (!productType) {
      result.errors.push({
        sheet: MEMBER_SHEET,
        row: rowNumber,
        field: "课程类型*",
        message: "课程类型只能是 class_pack/次卡、monthly/月卡、camp/集训、vip"
      });
    }
    if (totalLessons === null || totalLessons < 0) {
      result.errors.push({ sheet: MEMBER_SHEET, row: rowNumber, field: "总课时", message: "总课时必须是大于等于 0 的数字" });
    }
    if (cellText(row, map.get("开卡日期(YYYY-MM-DD)")!) && !cardStartDate) {
      result.errors.push({ sheet: MEMBER_SHEET, row: rowNumber, field: "开卡日期", message: "日期格式应为 YYYY-MM-DD" });
    }
    if (cellText(row, map.get("到期日期(YYYY-MM-DD)")!) && !cardExpireDate) {
      result.errors.push({ sheet: MEMBER_SHEET, row: rowNumber, field: "到期日期", message: "日期格式应为 YYYY-MM-DD" });
    }

    if (!name || !productType || totalLessons === null || totalLessons < 0) continue;
    if (seen.has(name)) {
      result.warnings.push({ sheet: MEMBER_SHEET, row: rowNumber, field: "姓名*", message: "同一个文件内有重复学员姓名，导入时以后出现的资料为准" });
    }
    seen.add(name);

    result.members.push({
      rowNumber,
      name,
      englishName: cellText(row, map.get("英文名")!) || null,
      gender: cellText(row, map.get("性别")!) || null,
      phone: cellText(row, map.get("手机号")!) || null,
      wechat: cellText(row, map.get("微信")!) || null,
      campus: cellText(row, map.get("校区")!) || null,
      coach: cellText(row, map.get("教练")!) || null,
      productType,
      productName: cellText(row, map.get("产品名称")!) || null,
      totalLessons,
      cardStartDate,
      cardExpireDate,
      notes: cellText(row, map.get("备注")!) || null
    });
  }
}

function readSchedules(workbook: ExcelJS.Workbook, result: StandardImportParseResult) {
  const worksheet = readWorksheet(workbook, SCHEDULE_SHEET, result.errors);
  if (!worksheet) return;

  const map = buildHeaderMap(worksheet, scheduleHeaders, result.errors);
  if (map.size !== scheduleHeaders.length) return;
  const columns = scheduleHeaders.map((header) => map.get(header)!);

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (rowIsBlank(row, columns)) continue;

    const lessonDate = parseDateCell(row, map.get("日期(YYYY-MM-DD)*")!);
    const rawTime = row.getCell(map.get("时间(HH:mm或HH:mm-HH:mm)*")!).value ?? row.getCell(map.get("时间(HH:mm或HH:mm-HH:mm)*")!).text;
    const lessonTime = parseTimeValue(rawTime);
    const campus = cellText(row, map.get("校区*")!);
    const coach = cellText(row, map.get("教练*")!);
    const memberName = cellText(row, map.get("学员姓名*")!);
    const lessonStatus = normalizeLessonStatus(cellText(row, map.get("状态(pending/completed/cancelled)")!));

    if (!lessonDate) result.errors.push({ sheet: SCHEDULE_SHEET, row: rowNumber, field: "日期", message: "日期格式应为 YYYY-MM-DD" });
    if (!lessonTime) result.errors.push({ sheet: SCHEDULE_SHEET, row: rowNumber, field: "时间", message: "时间格式应为 HH:mm 或 HH:mm-HH:mm" });
    if (!campus) result.errors.push({ sheet: SCHEDULE_SHEET, row: rowNumber, field: "校区", message: "校区不能为空" });
    if (!coach) result.errors.push({ sheet: SCHEDULE_SHEET, row: rowNumber, field: "教练", message: "教练不能为空" });
    if (!memberName) result.errors.push({ sheet: SCHEDULE_SHEET, row: rowNumber, field: "学员姓名", message: "学员姓名不能为空" });
    if (!lessonStatus) result.errors.push({ sheet: SCHEDULE_SHEET, row: rowNumber, field: "状态", message: "状态只能是 pending/completed/cancelled 或中文等价值" });

    if (!lessonDate || !lessonTime || !campus || !coach || !memberName || !lessonStatus) continue;

    result.schedules.push({
      rowNumber,
      lessonDate,
      lessonTime,
      campus,
      coach,
      memberName,
      lessonStatus,
      notes: cellText(row, map.get("备注")!) || null
    });
  }
}

function readAttendance(workbook: ExcelJS.Workbook, result: StandardImportParseResult) {
  const worksheet = readWorksheet(workbook, ATTENDANCE_SHEET, result.errors);
  if (!worksheet) return;

  const map = buildHeaderMap(worksheet, attendanceHeaders, result.errors);
  if (map.size !== attendanceHeaders.length) return;
  const columns = attendanceHeaders.map((header) => map.get(header)!);

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (rowIsBlank(row, columns)) continue;

    const attendanceDate = parseDateCell(row, map.get("日期(YYYY-MM-DD)*")!);
    const memberName = cellText(row, map.get("学员姓名*")!);
    const lessonsDeducted = numberOrDefault(cellText(row, map.get("扣课数")!), 1);

    if (!attendanceDate) result.errors.push({ sheet: ATTENDANCE_SHEET, row: rowNumber, field: "日期", message: "日期格式应为 YYYY-MM-DD" });
    if (!memberName) result.errors.push({ sheet: ATTENDANCE_SHEET, row: rowNumber, field: "学员姓名", message: "学员姓名不能为空" });
    if (lessonsDeducted === null || lessonsDeducted < 0) {
      result.errors.push({ sheet: ATTENDANCE_SHEET, row: rowNumber, field: "扣课数", message: "扣课数必须是大于等于 0 的数字" });
    }

    if (!attendanceDate || !memberName || lessonsDeducted === null || lessonsDeducted < 0) continue;

    result.attendanceLogs.push({
      rowNumber,
      attendanceDate,
      memberName,
      coach: cellText(row, map.get("教练")!) || null,
      campus: cellText(row, map.get("校区")!) || null,
      lessonsDeducted,
      sourceNote: cellText(row, map.get("来源备注")!) || null
    });
  }
}

export async function parseStandardImportWorkbook(file: File): Promise<StandardImportParseResult> {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer;
  await workbook.xlsx.load(buffer);

  const result: StandardImportParseResult = {
    members: [],
    schedules: [],
    attendanceLogs: [],
    errors: [],
    warnings: []
  };

  readMembers(workbook, result);
  readSchedules(workbook, result);
  readAttendance(workbook, result);

  if (!result.members.length && !result.schedules.length && !result.attendanceLogs.length && !result.errors.length) {
    result.errors.push({ sheet: null, row: null, field: null, message: "没有读取到可导入的数据" });
  }

  return result;
}

function applyHeaderStyle(worksheet: ExcelJS.Worksheet) {
  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0C1525" } };
  header.alignment = { vertical: "middle" };
  header.height = 24;
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

function addSheet(workbook: ExcelJS.Workbook, name: string, headers: readonly string[], widths: number[]) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.addRow(headers);
  worksheet.columns = headers.map((header, index) => ({
    key: header,
    width: widths[index] ?? 16
  }));
  applyHeaderStyle(worksheet);
  return worksheet;
}

export async function createStandardImportWorkbookBuffer() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ye-swim V3";
  workbook.created = new Date();

  const members = addSheet(workbook, MEMBER_SHEET, memberHeaders, [16, 14, 10, 16, 16, 12, 14, 16, 18, 10, 22, 22, 30]);
  members.addRow(["示例学员A", "Amy", "女", "13800000000", "amy_parent", "古北", "古北教练", "class_pack", "20次卡", 20, "2026-06-01", "2027-06-01", "标准示例，可删除"]);
  members.addRow(["示例学员B", "", "男", "", "", "国际", "国际教练", "monthly", "月卡", 0, "2026-06-01", "2026-07-01", "月卡不扣课时"]);

  const schedules = addSheet(workbook, SCHEDULE_SHEET, scheduleHeaders, [22, 24, 12, 14, 16, 26, 30]);
  schedules.addRow(["2026-06-02", "17:00-18:00", "古北", "古北教练", "示例学员A", "pending", "待审批通过后的正式排课也可在此补录"]);
  schedules.addRow(["2026-06-03", "18:00", "国际", "国际教练", "示例学员B", "completed", "已完成会同步写入消课日志"]);

  const attendance = addSheet(workbook, ATTENDANCE_SHEET, attendanceHeaders, [22, 16, 14, 12, 10, 30]);
  attendance.addRow(["2026-06-03", "示例学员A", "古北教练", "古北", 1, "历史补录"]);

  const readme = workbook.addWorksheet(README_SHEET);
  readme.columns = [{ width: 24 }, { width: 88 }];
  readme.addRows([
    ["字段", "说明"],
    ["课程类型", "可填 class_pack/次卡、monthly/月卡、camp/集训、vip。次卡出勤扣课；月卡/集训/VIP 不扣课时。"],
    ["排课状态", "可填 pending/待出勤、completed/已完成、cancelled/已取消。"],
    ["日期", "统一使用 YYYY-MM-DD。上传时也兼容 Excel 日期单元格。"],
    ["时间", "可填 17:00 或 17:00-18:00。"],
    ["联动校验", "排课和消课里的学员姓名必须能在学员表或系统已有学员中找到。"],
    ["重复导入", "系统会跳过已存在的同学同日同时间排课；消课记录会按学员、日期、扣课数做重复提示。"]
  ]);
  applyHeaderStyle(readme);

  return workbook.xlsx.writeBuffer();
}
