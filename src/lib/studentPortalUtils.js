import {displayDateFormatter} from "./calendar";
const SETTINGS_KEY = "sadiq.student.preferences.v1";

export const STUDENT_ACCENTS = {
  emerald: "#0F6B5D",
  gold: "#B58B22",
  royal: "#6657C7",
  blue: "#2E6FA7",
};

export const DEFAULT_STUDENT_PREFERENCES = {
  theme: "light",
  fontSize: "normal",
  accent: "emerald",
  motion: true,
};

export function loadStudentPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...DEFAULT_STUDENT_PREFERENCES, ...saved };
  } catch {
    return DEFAULT_STUDENT_PREFERENCES;
  }
}

export function saveStudentPreferences(value) {
  const next = { ...DEFAULT_STUDENT_PREFERENCES, ...value };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent("student-settings-changed", { detail: next })
  );
  return next;
}

export function fontScale(size) {
  if (size === "large") return 1.08;
  if (size === "xlarge") return 1.16;
  return 1;
}

export function getRiyadhDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseLocalDate(value) {
  return new Date(`${String(value).slice(0, 10)}T12:00:00`);
}

const ummAlQuraFormatter = new Intl.DateTimeFormat(
  "en-US-u-ca-islamic-umalqura",
  { year: "numeric", month: "numeric", day: "numeric" }
);

export function getHijriParts(date = new Date()) {
  const result = {};
  ummAlQuraFormatter.formatToParts(date).forEach((part) => {
    if (["year", "month", "day"].includes(part.type)) {
      result[part.type] = Number(part.value);
    }
  });
  return { year: result.year, month: result.month, day: result.day };
}

export function formatGregorianDate(value, options = {}) {
  if (!value) return "—";
  try {
    return displayDateFormatter( {
      timeZone: "Asia/Riyadh",
      day: "numeric",
      month: "short",
      year: "numeric",
      ...options,
    }).format(parseLocalDate(value));
  } catch {
    return String(value);
  }
}

export function formatHijriDate(value, options = {}) {
  if (!value) return "—";
  try {
    return displayDateFormatter( {
      timeZone: "Asia/Riyadh",
      day: "numeric",
      month: "long",
      year: "numeric",
      ...options,
    }).format(parseLocalDate(value));
  } catch {
    return String(value);
  }
}

export function formatDateTime(value) {
  if (!value) return "—";
  try {
    return displayDateFormatter( {
      timeZone: "Asia/Riyadh",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

export function formatNumber(value) {
  try {
    return new Intl.NumberFormat("ar-SA").format(Number(value) || 0);
  } catch {
    return String(Number(value) || 0);
  }
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

export function facesToPretty(value) {
  const totalLines = Math.max(0, Math.round(Number(value || 0) * 15));
  const pages = Math.floor(totalLines / 15);
  const lines = totalLines % 15;

  if (pages && lines) return `${pages} صفحة + ${lines} سطر`;
  if (pages) return `${pages} ${pages === 1 ? "صفحة" : "صفحات"}`;
  if (lines) return `${lines} ${lines === 1 ? "سطر" : "أسطر"}`;
  return "0";
}

export function formatDailyAmount(amount, unit) {
  const value = Number(amount || 0);
  if (!value) return "غير محدد";
  if (unit === "lines") return `${value} ${value === 1 ? "سطر" : "أسطر"}`;
  if (unit === "lesson") return `${value} ${value === 1 ? "درس" : "دروس"}`;
  return `${value} ${value === 1 ? "صفحة" : "صفحات"}`;
}

export function evaluationTone(value) {
  const text = String(value || "").trim();
  if (["ممتاز", "excellent"].includes(text)) return "excellent";
  if (["جيد جدًا", "جيد جدا", "very_good"].includes(text)) return "very-good";
  if (["جيد", "good"].includes(text)) return "good";
  if (["إعادة", "اعادة", "repeat"].includes(text)) return "repeat";
  return "neutral";
}

export function examMessage(percent) {
  const value = Number(percent || 0);
  if (value >= 90) {
    return {
      tone: "excellent",
      title: "ممتاز جدًا!",
      body: "نتيجة قوية تليق باجتهادك. حافظ على هذا المستوى وواصل التقدم.",
    };
  }
  if (value >= 75) {
    return {
      tone: "good",
      title: "أداء جميل",
      body: "أنت على طريق ممتاز. مراجعة بسيطة ومنتظمة قد ترفعك للمرتبة الأعلى.",
    };
  }
  return {
    tone: "encourage",
    title: "فرصتك القادمة أفضل",
    body: "النتيجة خطوة في الرحلة وليست النهاية. راجع مواضع الضعف وابدأ من جديد بثقة.",
  };
}

const dateCache = new Map();

export function findGregorianForHijri(hijriYear, hijriMonth, hijriDay = 1) {
  const key = `${hijriYear}-${hijriMonth}-${hijriDay}`;
  if (dateCache.has(key)) return dateCache.get(key);

  const approxYear = Math.floor(Number(hijriYear) * 0.970224 + 621.5774);
  const cursor = new Date(approxYear - 1, 0, 1, 12);
  const end = new Date(approxYear + 1, 11, 31, 12);

  while (cursor <= end) {
    const hijri = getHijriParts(cursor);
    if (
      hijri.year === Number(hijriYear) &&
      hijri.month === Number(hijriMonth) &&
      hijri.day === Number(hijriDay)
    ) {
      const result = getRiyadhDateKey(cursor);
      dateCache.set(key, result);
      return result;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  throw new Error("تعذر تحويل التاريخ.");
}

export function getHijriMonthRange(year, month) {
  const start = findGregorianForHijri(year, month, 1);
  let nextYear = Number(year);
  let nextMonth = Number(month) + 1;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const nextStart = findGregorianForHijri(nextYear, nextMonth, 1);
  const endDate = parseLocalDate(nextStart);
  endDate.setDate(endDate.getDate() - 1);

  return { start, end: getRiyadhDateKey(endDate) };
}

const DAY_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function scheduledProgressInfo({
  days = [],
  period,
  plannedSessions = 0,
}) {
  if (!period || !Array.isArray(days) || !days.length) {
    return {
      passedSessions: 0,
      totalSessions: Number(plannedSessions || 0),
      expectedPercent: 0,
    };
  }

  const allowed = new Set(
    days.map((day) => DAY_MAP[day]).filter((value) => value !== undefined)
  );

  const start = parseLocalDate(period.start);
  const end = parseLocalDate(period.end);
  const today = parseLocalDate(getRiyadhDateKey());
  let total = 0;
  let passed = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    if (allowed.has(cursor.getDay())) {
      total += 1;
      if (cursor <= today) passed += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const finalTotal = Number(plannedSessions || total || 0);

  return {
    passedSessions: passed,
    totalSessions: finalTotal,
    expectedPercent: finalTotal
      ? clampPercent((passed / finalTotal) * 100)
      : 0,
  };
}

export function getSeasonalMessage(date = new Date()) {
  const h = getHijriParts(date);

  if (h.month === 9 && h.day <= 2) {
    return {
      tone: "ramadan",
      title: "رمضان مبارك",
      body: "نسأل الله أن يجعله شهر قرآن وبركة ورفعة لك ولأهلك.",
      icon: "crescent",
    };
  }

  if (h.month === 10 && h.day >= 1 && h.day <= 3) {
    return {
      tone: "eid",
      title: "عيد فطر مبارك",
      body: "تقبل الله طاعاتك، وكل عام وأنت أقرب للقرآن وأهله.",
      icon: "sparkles",
    };
  }

  if (h.month === 10 && h.day >= 4 && h.day <= 29) {
    return {
      tone: "fast",
      title: "فرصة ستة من شوال",
      body: "تذكير لطيف: صيام ستة أيام من شوال من أبواب الخير بعد رمضان.",
      icon: "heart",
    };
  }

  if (h.month === 1 && h.day >= 8 && h.day <= 10) {
    return {
      tone: "fast",
      title: "تذكير بصيام عاشوراء",
      body: "اقترب يوم عاشوراء؛ اجعلها فرصة للطاعة والصيام إن تيسر لك.",
      icon: "heart",
    };
  }

  if (h.month === 12 && h.day >= 8 && h.day <= 9) {
    return {
      tone: "fast",
      title: "تذكير بيوم عرفة",
      body: "يوم عرفة من أعظم أيام العام؛ تهيأ له بالطاعة والصيام لغير الحاج إن تيسر.",
      icon: "heart",
    };
  }

  if (h.month === 12 && h.day >= 10 && h.day <= 13) {
    return {
      tone: "eid",
      title: "عيد أضحى مبارك",
      body: "كل عام وأنت بخير، جعل الله أيامك طاعة وفرحًا وقربًا من القرآن.",
      icon: "sparkles",
    };
  }

  return null;
}

export function getPeriodLabel(value) {
  const labels = {
    after_fajr: "بعد الفجر",
    after_dhuhr: "بعد الظهر",
    after_asr: "بعد العصر",
    after_maghrib: "بعد المغرب",
    after_isha: "بعد العشاء",
  };
  return labels[value] || "غير محدد";
}

export function recitationDaysLabel(days = []) {
  const labels = {
    saturday: "السبت",
    sunday: "الأحد",
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
  };

  return Array.isArray(days) && days.length
    ? days.map((day) => labels[day] || day).join(" • ")
    : "غير محددة";
}
