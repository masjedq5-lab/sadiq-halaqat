import {displayDateFormatter} from "../lib/calendar";
// src/pages/examV2Utils.js
const UMM_AL_QURA = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export const HIJRI_MONTHS = [
  "محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة",
  "رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"
];

export function getLocalDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getHijriParts(date = new Date()) {
  const result = {};
  UMM_AL_QURA.formatToParts(date).forEach((part) => {
    if (["year","month","day"].includes(part.type)) result[part.type] = Number(part.value);
  });
  return { year: result.year, month: result.month, day: result.day };
}

export function hijriInputFromGregorian(value) {
  return value ? getHijriParts(new Date(`${String(value).slice(0,10)}T12:00:00`)) : getHijriParts(new Date());
}

export function gregorianFromHijri({ year, month, day }) {
  const approxYear = Math.floor(Number(year) * 0.970224 + 621.5774);
  const cursor = new Date(approxYear - 1, 0, 1, 12);
  const end = new Date(approxYear + 1, 11, 31, 12);

  while (cursor <= end) {
    const h = getHijriParts(cursor);
    if (h.year === Number(year) && h.month === Number(month) && h.day === Number(day)) {
      return getLocalDate(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  throw new Error("تعذر تحويل التاريخ");
}

export function getHijriMonthDays(year, month) {
  let count = 0;
  for (let day = 1; day <= 30; day += 1) {
    try {
      gregorianFromHijri({ year, month, day });
      count = day;
    } catch {
      break;
    }
  }
  return count || 30;
}

export function formatHijri(value) {
  if (!value) return "—";
  try {
    return displayDateFormatter( {
      year: "numeric", month: "long", day: "numeric"
    }).format(new Date(`${String(value).slice(0,10)}T12:00:00`));
  } catch {
    return String(value);
  }
}

export function deriveExamStatus(exam) {
  const workflow = exam.workflow_status || "draft";
  const today = getLocalDate();
  const start = String(exam.start_date || exam.exam_date || "").slice(0,10);
  const end = String(exam.end_date || exam.exam_date || "").slice(0,10);

  if (workflow === "cancelled") return "cancelled";
  if (workflow === "completed") return "completed";
  if (workflow === "pending_results") return "pending_results";
  if (workflow === "draft") return "draft";
  if (start && today < start) return "upcoming";
  if (end && today > end) return "ended";
  return "active";
}

export const EXAM_STATUS_META = {
  draft: { label: "مسودة", tone: "neutral" },
  upcoming: { label: "قادم", tone: "gold" },
  active: { label: "جارٍ", tone: "green" },
  ended: { label: "انتهت المدة", tone: "danger" },
  pending_results: { label: "بانتظار النتائج", tone: "warning" },
  completed: { label: "مكتمل", tone: "success" },
  cancelled: { label: "ملغي", tone: "danger" },
};
