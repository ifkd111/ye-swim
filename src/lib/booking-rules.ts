export function shanghaiNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
}

export function formatDateChina(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function minStudentBookingDate(now = shanghaiNow()) {
  const min = new Date(now);
  const afterCutoff = now.getHours() >= 20;
  min.setDate(min.getDate() + (afterCutoff ? 2 : 1));
  return formatDateChina(min);
}

export function isBookableForStudent(slotDate: string, now = shanghaiNow()) {
  return slotDate >= minStudentBookingDate(now);
}

export function bookingRuleText(now = shanghaiNow()) {
  return now.getHours() >= 20 ? "20:00 后只能申请后天及之后课程" : "今天不能约当天课，最早可申请明天课程";
}
