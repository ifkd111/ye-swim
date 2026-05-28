export type UserRole = "admin" | "coach" | "frontdesk";
export type ProductType = "class_pack" | "monthly" | "camp" | "vip";
export type LessonStatus = "pending" | "completed" | "cancelled";

export type CourseProduct = {
  id: string;
  name: string;
  type: ProductType;
  totalLessons: number;
  validDays: number | null;
  notes: string | null;
};

export type Member = {
  id: string;
  memberNo: number;
  chineseName: string;
  englishName: string | null;
  gender: string | null;
  phone: string | null;
  wechat: string | null;
  campus: string | null;
  coach: string | null;
  productId: string | null;
  productName: string | null;
  productType: ProductType;
  totalLessons: number;
  usedLessons: number;
  remainingLessons: number;
  cardStartDate: string | null;
  cardExpireDate: string | null;
  campStartDate: string | null;
  campEndDate: string | null;
  status: "正常" | "即将用完" | "欠课";
  notes: string | null;
};

export type Schedule = {
  id: string;
  lessonDate: string;
  lessonTime: string;
  weekday: string | null;
  campus: string;
  coach: string;
  memberId: string;
  memberName: string;
  attended: boolean;
  lessonStatus: LessonStatus;
  source: string | null;
  sourceRow: number | null;
};

export type AttendanceLog = {
  id: string;
  attendanceDate: string;
  memberId: string;
  memberName: string;
  coach: string | null;
  campus: string | null;
  lessonsDeducted: number;
  sourceScheduleId: string | null;
  source: string | null;
  sourceNote: string | null;
};

export type SeedData = {
  generatedAt: string;
  stats: {
    products: number;
    members: number;
    schedules: number;
    attendanceLogs: number;
    rawSessions: number;
    rawAttendanceSlots: number;
  };
  products: CourseProduct[];
  members: Member[];
  schedules: Schedule[];
  attendanceLogs: AttendanceLog[];
};
