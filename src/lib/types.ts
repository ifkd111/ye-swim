export type UserRole = "admin" | "coach" | "frontdesk" | "student";
export type ProductType = "class_pack" | "monthly" | "camp" | "vip";
export type LessonStatus = "pending" | "completed" | "cancelled";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type AvailabilityStatus = "draft" | "published" | "closed";

export type CourseProduct = {
  id: string;
  name: string;
  type: ProductType;
  totalLessons: number;
  validDays: number | null;
  price: number;
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
  status: "正常" | "即将用完" | "已完成" | "欠课";
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

export type CoachAvailabilitySlot = {
  id: string;
  slotDate: string;
  slotTime: string;
  campus: string;
  coach: string;
  capacity: number;
  status: AvailabilityStatus;
  publishOrder: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string | null;
};

export type BookingRequest = {
  id: string;
  slotId: string;
  memberId: string;
  memberName: string;
  slotDate: string;
  slotTime: string;
  campus: string;
  coach: string;
  status: ReviewStatus;
  note: string | null;
  reviewedAt: string | null;
  createdScheduleId: string | null;
  createdAt: string | null;
};

export type CourseApplication = {
  id: string;
  memberId: string;
  memberName: string;
  productId: string;
  productName: string;
  status: ReviewStatus;
  note: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
};

export type StudentRegistration = {
  id: string;
  name: string;
  phone: string;
  productId: string | null;
  campus: string | null;
  coach: string | null;
  note: string | null;
  status: ReviewStatus;
  reviewedAt: string | null;
  createdAt: string | null;
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
