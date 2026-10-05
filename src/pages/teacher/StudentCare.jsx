import {displayDateFormatter} from "../../lib/calendar";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { AlertTriangle, BadgeCheck, BellRing, BookOpen, CalendarCheck, CheckCircle2, ChevronDown, Clock3, HeartHandshake, History, Inbox, Loader2, Mail, MessageCircle, MessageSquareText, RefreshCw, RotateCcw, Search, Send, ShieldCheck, Sparkles, Target, UserRound, X } from "lucide-react";

import {
  supabase,
} from "../../lib/supabase";
import { effectiveMonthlyPlans } from "../../lib/effectiveLearning";

import {
  useTeacherPreferences,
} from "../../context/TeacherPreferencesContext";

import {
  showToast,
} from "../../components/Toast";

/* =========================================================
   CONSTANTS
========================================================= */

const CARE_THRESHOLD_DEFAULTS = {
  repeatedAbsenceDays: 14,
  repeatedAbsenceCount: 2,
  repeatedLateDays: 14,
  repeatedLateCount: 2,
  noRecitationDays: 7,
  planGraceHijriDays: 3,
  planWarningGap: 12,
  planSevereGap: 30,
};

const SEVERITY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const SEVERITY_META = {
  critical: {
    label: "متابعة عاجلة",
    className: "critical",
  },
  high: {
    label: "أولوية عالية",
    className: "high",
  },
  medium: {
    label: "يحتاج متابعة",
    className: "medium",
  },
  low: {
    label: "تنبيه",
    className: "low",
  },
};

const CATEGORY_META = {
  attendance: {
    label: "الحضور",
    icon: CalendarCheck,
  },
  plan: {
    label: "الخطة",
    icon: Target,
  },
  recitation: {
    label: "التسميع",
    icon: BookOpen,
  },
};

const MESSAGE_TYPES = [
  {
    value: "general",
    label: "رسالة عامة",
  },
  {
    value: "student_followup",
    label: "متابعة طالب",
  },
  {
    value: "attendance",
    label: "الحضور",
  },
  {
    value: "monthly_plan",
    label: "الخطة الشهرية",
  },
  {
    value: "recitation",
    label: "التسميع",
  },
  {
    value: "achievement",
    label: "الإنجاز",
  },
];

/* =========================================================
   DATE HELPERS
========================================================= */

const ummAlQuraFormatter =
  new Intl.DateTimeFormat(
    "en-US-u-ca-islamic-umalqura",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }
  );

const hijriDateCache = new Map();

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  return new Date(`${value}T12:00:00`);
}

function addDays(dateValue, amount) {
  const date = parseLocalDate(dateValue);
  date.setDate(date.getDate() + amount);
  return getLocalDate(date);
}

function daysBetween(fromValue, toValue = getLocalDate()) {
  if (!fromValue || !toValue) return 0;

  const from = parseLocalDate(fromValue);
  const to = parseLocalDate(toValue);

  return Math.max(
    0,
    Math.floor((to - from) / 86400000)
  );
}

function getHijriParts(date = new Date()) {
  const parts = ummAlQuraFormatter.formatToParts(date);
  const result = {};

  parts.forEach((part) => {
    if (["year", "month", "day"].includes(part.type)) {
      result[part.type] = Number(part.value);
    }
  });

  return {
    year: result.year,
    month: result.month,
    day: result.day,
  };
}

function findGregorianForHijri(year, month, day = 1) {
  const key = `${year}-${month}-${day}`;

  if (hijriDateCache.has(key)) {
    return hijriDateCache.get(key);
  }

  const approxYear = Math.floor(
    Number(year) * 0.970224 + 621.5774
  );

  const cursor = new Date(approxYear - 1, 0, 1, 12);
  const end = new Date(approxYear + 1, 11, 31, 12);

  while (cursor <= end) {
    const hijri = getHijriParts(cursor);

    if (
      hijri.year === Number(year) &&
      hijri.month === Number(month) &&
      hijri.day === Number(day)
    ) {
      const result = getLocalDate(cursor);
      hijriDateCache.set(key, result);
      return result;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  throw new Error("تعذر تحويل الشهر الهجري إلى الميلادي");
}

function getCurrentHijriMonthRange() {
  const current = getHijriParts(new Date());
  const start = findGregorianForHijri(
    current.year,
    current.month,
    1
  );

  let nextYear = current.year;
  let nextMonth = current.month + 1;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const nextStart = findGregorianForHijri(
    nextYear,
    nextMonth,
    1
  );

  const endDate = parseLocalDate(nextStart);
  endDate.setDate(endDate.getDate() - 1);

  return {
    hijriYear: current.year,
    hijriMonth: current.month,
    hijriDay: current.day,
    start,
    end: getLocalDate(endDate),
  };
}

function getElapsedMonthPercent(period) {
  const today = parseLocalDate(getLocalDate());
  const start = parseLocalDate(period.start);
  const end = parseLocalDate(period.end);

  if (today < start) return 0;
  if (today > end) return 100;

  const totalDays = Math.floor((end - start) / 86400000) + 1;
  const elapsedDays = Math.floor((today - start) / 86400000) + 1;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round((elapsedDays / totalDays) * 100)
    )
  );
}

function formatHijriDate(value) {
  if (!value) return "—";

  try {
    return displayDateFormatter(
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    ).format(parseLocalDate(value));
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return "—";

  try {
    return displayDateFormatter( {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function roundFaces(value) {
  return (
    Math.round(
      (Number(value || 0) + Number.EPSILON) * 100
    ) / 100
  );
}

function formatFaces(value) {
  const number = roundFaces(value);

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(2).replace(/\.?0+$/, "");
}

/* =========================================================
   PHONE / WHATSAPP
========================================================= */

function normalizePhone(phone) {
  if (!phone) return "";

  let digits = String(phone).replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0") && digits.length === 10) {
    digits = `966${digits.slice(1)}`;
  } else if (digits.startsWith("5") && digits.length === 9) {
    digits = `966${digits}`;
  }

  return digits;
}

function openWhatsAppApp(phone, message) {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    throw new Error("رقم التواصل غير صالح");
  }

  const encoded = encodeURIComponent(message);
  const appUrl = `whatsapp://send?phone=${normalized}&text=${encoded}`;
  const webUrl = `https://wa.me/${normalized}?text=${encoded}`;

  let leftPage = false;

  const visibilityHandler = () => {
    if (document.hidden) {
      leftPage = true;
    }
  };

  document.addEventListener(
    "visibilitychange",
    visibilityHandler,
    { once: true }
  );

  window.location.href = appUrl;

  window.setTimeout(() => {
    document.removeEventListener(
      "visibilitychange",
      visibilityHandler
    );

    if (!leftPage && document.visibilityState === "visible") {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  }, 1400);
}

/* =========================================================
   ALERT ENGINE
========================================================= */

function makeAlert({
  key,
  student,
  type,
  category,
  severity,
  title,
  description,
  recommendedAction,
  metrics = [],
  whatsapp = true,
  payload = {},
}) {
  return {
    key,
    student,
    type,
    category,
    severity,
    title,
    description,
    recommendedAction,
    metrics,
    whatsapp,
    payload,
  };
}

function buildAlerts({
  students,
  attendance,
  recitations,
  plans,
  progressRows,
  period,
  preferences = {},
}) {
  const today = getLocalDate();

  const repeatedAbsenceDays = Math.max(
    1,
    Number(
      preferences.care_absence_window_days ??
        CARE_THRESHOLD_DEFAULTS.repeatedAbsenceDays
    )
  );

  const repeatedAbsenceCount = Math.max(
    1,
    Number(
      preferences.care_absence_threshold ??
        CARE_THRESHOLD_DEFAULTS.repeatedAbsenceCount
    )
  );

  const repeatedLateCount = Math.max(
    1,
    Number(
      preferences.care_late_threshold ??
        CARE_THRESHOLD_DEFAULTS.repeatedLateCount
    )
  );

  const noRecitationDays = Math.max(
    1,
    Number(
      preferences.care_no_recitation_days ??
        CARE_THRESHOLD_DEFAULTS.noRecitationDays
    )
  );

  const planWarningGap = Math.max(
    0,
    Number(
      preferences.care_plan_delay_threshold ??
        CARE_THRESHOLD_DEFAULTS.planWarningGap
    )
  );

  const planSevereGap = Math.max(
    planWarningGap + 10,
    CARE_THRESHOLD_DEFAULTS.planSevereGap
  );

  const escalateAbsences = Math.max(
    repeatedAbsenceCount,
    Number(
      preferences.care_escalate_absences ??
        Math.max(4, repeatedAbsenceCount + 1)
    )
  );

  const recentAttendanceFrom = addDays(
    today,
    -(repeatedAbsenceDays - 1)
  );

  const expectedPercent = getElapsedMonthPercent(period);
  const alerts = [];

  students.forEach((student) => {
    const studentId = Number(student.student_id);
    const halaqaId = Number(student.halaqa_id);

    const studentAttendance = attendance.filter(
      (record) =>
        Number(record.student_id) === studentId &&
        Number(record.halaqa_id) === halaqaId
    );

    const todayAttendance = studentAttendance.find(
      (record) => record.attendance_date === today
    );

    const recentAttendance = studentAttendance.filter(
      (record) => record.attendance_date >= recentAttendanceFrom
    );

    const absenceCount = recentAttendance.filter(
      (record) => record.status === "absent"
    ).length;

    const lateCount = recentAttendance.filter(
      (record) => record.status === "late"
    ).length;

    if (
      todayAttendance?.status === "absent" &&
      absenceCount < repeatedAbsenceCount
    ) {
      alerts.push(
        makeAlert({
          key: `absence_today:${studentId}:${halaqaId}:${today}`,
          student,
          type: "absence_today",
          category: "attendance",
          severity: "high",
          title: "غائب اليوم بدون عذر",
          description:
            "تم تسجيل الطالب غائبًا اليوم، ويحتاج إلى متابعة سريعة لمعرفة سبب الغياب والمحافظة على انتظامه.",
          recommendedAction: "التواصل مع ولي الأمر اليوم.",
          metrics: [
            {
              label: "تاريخ الغياب",
              value: formatHijriDate(today),
            },
            {
              label: `غيابات آخر ${repeatedAbsenceDays} يومًا`,
              value: String(absenceCount),
            },
          ],
          payload: {
            date: today,
            absenceCount,
          },
        })
      );
    }

    if (
      absenceCount >= repeatedAbsenceCount
    ) {
      alerts.push(
        makeAlert({
          key: `absence_repeated:${studentId}:${halaqaId}:${today.slice(0, 7)}`,
          student,
          type: "absence_repeated",
          category: "attendance",
          severity:
            absenceCount >= escalateAbsences
              ? "critical"
              : "high",
          title: "تكرار الغياب",
          description: `تكرر غياب الطالب ${absenceCount} مرات خلال آخر ${repeatedAbsenceDays} يومًا، مما قد يؤثر على استمراره وإنجازه.`,
          recommendedAction:
            "التواصل مع ولي الأمر ومتابعة سبب تكرار الغياب.",
          metrics: [
            {
              label: "عدد الغيابات",
              value: String(absenceCount),
            },
            {
              label: "الفترة",
              value: `آخر ${repeatedAbsenceDays} يومًا`,
            },
          ],
          payload: {
            absenceCount,
          },
        })
      );
    }

    if (
      lateCount >= repeatedLateCount
    ) {
      alerts.push(
        makeAlert({
          key: `late_repeated:${studentId}:${halaqaId}:${today.slice(0, 7)}`,
          student,
          type: "late_repeated",
          category: "attendance",
          severity: lateCount >= 4 ? "high" : "medium",
          title: "تكرار التأخر عن الحلقة",
          description: `تأخر الطالب ${lateCount} مرات خلال آخر ${repeatedAbsenceDays} يومًا، ويستحسن معالجة السبب قبل أن يتحول إلى نمط دائم.`,
          recommendedAction:
            "التواصل بلطف مع الطالب أو ولي الأمر بشأن وقت الحضور.",
          metrics: [
            {
              label: "مرات التأخر",
              value: String(lateCount),
            },
            {
              label: "الفترة",
              value: `آخر ${repeatedAbsenceDays} يومًا`,
            },
          ],
          payload: {
            lateCount,
          },
        })
      );
    }

    const studentRecitations = recitations
      .filter(
        (record) =>
          Number(record.student_id) === studentId &&
          Number(record.halaqa_id) === halaqaId
      )
      .sort((a, b) =>
        String(b.recitation_date).localeCompare(
          String(a.recitation_date)
        )
      );

    const lastRecitationDate =
      studentRecitations[0]?.recitation_date || null;

    const baseline =
      lastRecitationDate || student.start_date || today;

    const daysWithoutRecitation = daysBetween(
      baseline,
      today
    );

    if (
      daysWithoutRecitation >= noRecitationDays
    ) {
      alerts.push(
        makeAlert({
          key: `no_recitation:${studentId}:${halaqaId}:${today.slice(0, 7)}`,
          student,
          type: "no_recitation",
          category: "recitation",
          severity:
            daysWithoutRecitation >= noRecitationDays * 2
              ? "high"
              : "medium",
          title: "انقطاع عن التسميع",
          description: lastRecitationDate
            ? `مضى ${daysWithoutRecitation} يومًا منذ آخر تسميع مسجل للطالب.`
            : `لا يوجد تسميع مسجل للطالب منذ ${daysWithoutRecitation} يومًا من بداية ارتباطه الحالي بالحلقة.`,
          recommendedAction:
            "متابعة الطالب ومعرفة سبب عدم وجود تسميع حديث.",
          metrics: [
            {
              label: "آخر تسميع",
              value: lastRecitationDate
                ? formatHijriDate(lastRecitationDate)
                : "لا يوجد",
            },
            {
              label: "مدة الانقطاع",
              value: `${daysWithoutRecitation} يوم`,
            },
          ],
          payload: {
            daysWithoutRecitation,
            lastRecitationDate,
          },
        })
      );
    }

    const plan = plans.find(
      (row) =>
        Number(row.student_id) === studentId &&
        Number(row.halaqa_id) === halaqaId
    );

    if (!plan) {
      if (period.hijriDay > CARE_THRESHOLD_DEFAULTS.planGraceHijriDays) {
        alerts.push(
          makeAlert({
            key: `plan_missing:${studentId}:${halaqaId}:${period.hijriYear}-${period.hijriMonth}`,
            student,
            type: "plan_missing",
            category: "plan",
            severity: "medium",
            title: "لا توجد خطة شهرية",
            description:
              "لم يتم إنشاء خطة حفظ أو مراجعة للطالب في الشهر الهجري الحالي.",
            recommendedAction:
              "إنشاء الخطة الشهرية للطالب قبل متابعة نسبة الإنجاز.",
            metrics: [
              {
                label: "الشهر الحالي",
                value: `${period.hijriMonth}/${period.hijriYear} هـ`,
              },
            ],
            whatsapp: false,
          })
        );
      }

      return;
    }

    const monthRecitations = studentRecitations.filter(
      (record) =>
        record.recitation_date >= period.start &&
        record.recitation_date <= period.end
    );

    const autoMem = roundFaces(
      monthRecitations.reduce(
        (sum, record) =>
          sum + Number(record.lesson_faces || 0),
        0
      )
    );

    const autoRev = roundFaces(
      monthRecitations.reduce(
        (sum, record) =>
          sum + Number(record.review_faces || 0),
        0
      )
    );

    const progress = progressRows.find(
      (row) =>
        Number(row.student_id) === studentId &&
        Number(row.halaqa_id) === halaqaId
    );

    const manualMem = Number(
      progress?.manual_memorization_faces || 0
    );

    const manualRev = Number(
      progress?.manual_revision_faces || 0
    );

    const achievedMem = roundFaces(autoMem + manualMem);
    const achievedRev = roundFaces(autoRev + manualRev);

    const memTarget = Number(
      plan.memorization_target_faces || 0
    );

    const revTarget = Number(
      plan.revision_target_faces || 0
    );

    const memPercent =
      memTarget > 0
        ? Math.round((achievedMem / memTarget) * 100)
        : 0;

    const revPercent =
      revTarget > 0
        ? Math.round((achievedRev / revTarget) * 100)
        : 0;

    const totalTarget = memTarget + revTarget;
    const totalAchieved = achievedMem + achievedRev;
    const memExpected = Number(plan.memorization_expected_percent ?? expectedPercent);
    const revExpected = Number(plan.revision_expected_percent ?? expectedPercent);
    const activeExpected = Math.max(memTarget > 0 ? memExpected : 0, revTarget > 0 ? revExpected : 0);

    if (
      totalTarget > 0 &&
      totalAchieved === 0 &&
      activeExpected >= 25
    ) {
      alerts.push(
        makeAlert({
          key: `no_monthly_progress:${studentId}:${halaqaId}:${period.hijriYear}-${period.hijriMonth}`,
          student,
          type: "no_monthly_progress",
          category: "plan",
          severity: "critical",
          title: "لم يبدأ إنجاز الخطة",
          description:
            "مضى جزء ملحوظ من الشهر، ولم يسجل للطالب أي إنجاز في الحفظ أو المراجعة حتى الآن.",
          recommendedAction:
            "التواصل مع الطالب وولي الأمر ومعرفة سبب توقف الإنجاز.",
          metrics: [
            {
              label: "المتوقع حتى اليوم",
              value: `${activeExpected}%`,
            },
            {
              label: "المنجز",
              value: "0%",
            },
          ],
          payload: {
            expectedPercent: activeExpected,
            memTarget,
            revTarget,
            achievedMem,
            achievedRev,
          },
        })
      );

      return;
    }

    if (memTarget > 0) {
      const memGap = memExpected - memPercent;

      if (memGap >= planWarningGap) {
        alerts.push(
          makeAlert({
            key: `plan_mem_${
              memGap >= planSevereGap
                ? "severe"
                : "behind"
            }:${studentId}:${halaqaId}:${period.hijriYear}-${period.hijriMonth}`,
            student,
            type:
              memGap >= planSevereGap
                ? "plan_mem_severe"
                : "plan_mem_behind",
            category: "plan",
            severity:
              memGap >= planSevereGap
                ? "high"
                : "medium",
            title:
              memGap >= planSevereGap
                ? "تأخر واضح في خطة الحفظ"
                : "متأخر عن خطة الحفظ",
            description: `حقق الطالب ${memPercent}% من خطة الحفظ، بينما المتوقع حتى اليوم يقارب ${memExpected}%.`,
            recommendedAction:
              "مراجعة سبب التأخر ومساعدة الطالب على العودة للمسار.",
            metrics: [
              {
                label: "هدف الحفظ",
                value: `${formatFaces(memTarget)} وجه`,
              },
              {
                label: "المنجز",
                value: `${formatFaces(achievedMem)} وجه`,
              },
              {
                label: "نسبة التحقيق",
                value: `${memPercent}%`,
              },
            ],
            payload: {
              target: memTarget,
              achieved: achievedMem,
              percent: memPercent,
              expectedPercent: memExpected,
            },
          })
        );
      }
    }

    if (revTarget > 0) {
      const revGap = revExpected - revPercent;

      if (revGap >= planWarningGap) {
        alerts.push(
          makeAlert({
            key: `plan_rev_${
              revGap >= planSevereGap
                ? "severe"
                : "behind"
            }:${studentId}:${halaqaId}:${period.hijriYear}-${period.hijriMonth}`,
            student,
            type:
              revGap >= planSevereGap
                ? "plan_rev_severe"
                : "plan_rev_behind",
            category: "plan",
            severity:
              revGap >= planSevereGap
                ? "high"
                : "medium",
            title:
              revGap >= planSevereGap
                ? "تأخر واضح في خطة المراجعة"
                : "متأخر عن خطة المراجعة",
            description: `حقق الطالب ${revPercent}% من خطة المراجعة، بينما المتوقع حتى اليوم يقارب ${revExpected}%.`,
            recommendedAction:
              "مراجعة برنامج المراجعة مع الطالب وتقسيم المتبقي إلى أهداف أقرب.",
            metrics: [
              {
                label: "هدف المراجعة",
                value: `${formatFaces(revTarget)} وجه`,
              },
              {
                label: "المنجز",
                value: `${formatFaces(achievedRev)} وجه`,
              },
              {
                label: "نسبة التحقيق",
                value: `${revPercent}%`,
              },
            ],
            payload: {
              target: revTarget,
              achieved: achievedRev,
              percent: revPercent,
              expectedPercent: revExpected,
            },
          })
        );
      }
    }
  });

  return alerts.sort((a, b) => {
    const severityDiff =
      SEVERITY_ORDER[b.severity] -
      SEVERITY_ORDER[a.severity];

    if (severityDiff !== 0) return severityDiff;

    return String(a.student.student_name).localeCompare(
      String(b.student.student_name),
      "ar"
    );
  });
}

/* =========================================================
   WHATSAPP TEMPLATES
========================================================= */

function buildWhatsAppMessage(alert, preferences = {}) {
  const studentName = alert.student.student_name;
  const greeting =
    preferences.whatsapp_greeting ||
    "السلام عليكم ورحمة الله وبركاته،";

  const closing =
    preferences.whatsapp_closing ||
    "شاكرين لكم تعاونكم واهتمامكم، وبارك الله فيكم وفي أبنائكم.";

  const signature =
    preferences.whatsapp_include_signature === false
      ? ""
      : preferences.whatsapp_signature ||
        "نظام الصديق\nمتابعة حلقات القرآن الكريم";

  const ending = [closing, signature]
    .filter(Boolean)
    .map((part) => `\n\n${part}`)
    .join("");

  switch (alert.type) {
    case "absence_today":
      return `${greeting}\n\nنسعد بتواصلكم، ونحيطكم علمًا بأن الطالب ${studentName} قد تغيب عن الحلقة اليوم دون تسجيل عذر.\n\nنأمل منكم التكرم بمتابعته والحرص على انتظامه، لما لذلك من أثر كبير في استمراره وتقدمه في حفظ كتاب الله.${ending}`;

    case "absence_repeated":
      return `${greeting}\n\nنود إحاطتكم بأن الطالب ${studentName} قد تكرر غيابه عن الحلقة خلال الفترة الأخيرة، حيث سجل ${alert.payload.absenceCount || 0} حالات غياب خلال آخر أسبوعين.\n\nنأمل منكم التكرم بمتابعته ومعرفة ما قد يعوق انتظامه، ويسعدنا التعاون معكم بما يعينه على الاستمرار والتقدم.${ending}`;

    case "late_repeated":
      return `${greeting}\n\nنود إشعاركم بأن الطالب ${studentName} قد تكرر تأخره عن بداية الحلقة خلال الفترة الأخيرة.\n\nنأمل منكم التكرم بمساعدته على الالتزام بوقت الحضور حتى يتمكن من الاستفادة من كامل وقت الحلقة وتحقيق تقدمه بصورة أفضل.${ending}`;

    case "no_recitation":
      return `${greeting}\n\nنود إشعاركم بأن الطالب ${studentName} لم يسجل له تسميع حديث خلال الأيام الماضية، ونرغب في الاطمئنان على سيره وتشجيعه على العودة إلى انتظامه في الحفظ والمراجعة.\n\nيسعدنا تعاونكم في متابعته وتحفيزه على الاستمرار.${ending}`;

    case "no_monthly_progress":
      return `${greeting}\n\nنود مشاركتكم ملاحظة تعليمية تخص الطالب ${studentName}، حيث لم يسجل له حتى الآن إنجاز في خطة الحفظ أو المراجعة لهذا الشهر رغم مرور جزء من الفترة.\n\nنأمل منكم دعمه وتشجيعه على البدء بخطته، وسيواصل معلمه متابعته ومساعدته بإذن الله.${ending}`;

    case "plan_mem_behind":
    case "plan_mem_severe":
      return `${greeting}\n\nنود مشاركتكم متابعة الطالب ${studentName} في خطة الحفظ لهذا الشهر.\n\nالهدف الشهري: ${formatFaces(alert.payload.target)} وجه\nالمنجز حتى الآن: ${formatFaces(alert.payload.achieved)} وجه\nنسبة الإنجاز: ${alert.payload.percent || 0}%\n\nيحتاج الطالب إلى مزيد من المتابعة خلال الفترة القادمة حتى يعود إلى المسار المناسب، ونقدر تعاونكم في تشجيعه وتنظيم وقته.${ending}`;

    case "plan_rev_behind":
    case "plan_rev_severe":
      return `${greeting}\n\nنود مشاركتكم متابعة الطالب ${studentName} في خطة المراجعة لهذا الشهر.\n\nالهدف الشهري: ${formatFaces(alert.payload.target)} وجه\nالمنجز حتى الآن: ${formatFaces(alert.payload.achieved)} وجه\nنسبة الإنجاز: ${alert.payload.percent || 0}%\n\nنأمل منكم دعمه وتشجيعه على الانتظام في المراجعة خلال الأيام القادمة، وسيواصل معلمه متابعته بإذن الله.${ending}`;

    default:
      return `${greeting}\n\nنود التواصل معكم بشأن متابعة الطالب ${studentName} في الحلقة، ونقدر تعاونكم الدائم في دعمه وتشجيعه على الاستمرار والتقدم.${ending}`;
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function StudentCare() {
  const {
    teacherPreferences = {},
  } = useTeacherPreferences();

  const [teacher, setTeacher] = useState(null);
  const [halaqat, setHalaqat] = useState([]);
  const [students, setStudents] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [recitations, setRecitations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [progressRows, setProgressRows] = useState([]);
  const [careActions, setCareActions] = useState([]);
  const [communications, setCommunications] = useState([]);

  const [recipients, setRecipients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageProfiles, setMessageProfiles] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [handlingKey, setHandlingKey] = useState(null);
  const [whatsappKey, setWhatsappKey] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [activeTab, setActiveTab] = useState("care");
  const [careView, setCareView] = useState("active");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedHalaqa, setSelectedHalaqa] = useState("all");
  const [messageView, setMessageView] = useState("inbox");

  const [compose, setCompose] = useState({
    recipient_id: "",
    student_context_id: "",
    subject: "",
    body: "",
    message_type: "general",
    reply_to_id: null,
  });

  const period = useMemo(
    () => getCurrentHijriMonthRange(),
    []
  );

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!halaqat.length || !teacher?.id) return;

    let preferred = "";

    if (teacherPreferences.remember_last_halaqa) {
      try {
        preferred =
          localStorage.getItem(
            `sadiq_teacher_last_halaqa_${teacher.id}`
          ) || "";
      } catch {
        preferred = "";
      }
    }

    if (
      !preferred &&
      teacherPreferences.default_halaqa_id
    ) {
      preferred = String(
        teacherPreferences.default_halaqa_id
      );
    }

    if (
      preferred &&
      halaqat.some(
        (item) => String(item.id) === String(preferred)
      )
    ) {
      setSelectedHalaqa(String(preferred));
    }
  }, [
    halaqat,
    teacher?.id,
    teacherPreferences.default_halaqa_id,
    teacherPreferences.remember_last_halaqa,
  ]);

  useEffect(() => {
    if (
      !teacher?.id ||
      selectedHalaqa === "all" ||
      !teacherPreferences.remember_last_halaqa
    ) {
      return;
    }

    try {
      localStorage.setItem(
        `sadiq_teacher_last_halaqa_${teacher.id}`,
        String(selectedHalaqa)
      );
    } catch {
      // التذكر المحلي تحسين تجربة فقط.
    }
  }, [
    selectedHalaqa,
    teacher?.id,
    teacherPreferences.remember_last_halaqa,
  ]);

  /* =====================================================
     LOAD
  ===================================================== */

  async function loadAll({ silent = false } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const user = authData?.user;

      if (!user) {
        throw new Error("تعذر التحقق من المستخدم الحالي");
      }

      const {
        data: teacherProfile,
        error: teacherError,
      } = await supabase
        .from("profiles")
        .select("id, full_name, user_number, phone")
        .eq("auth_user_id", user.id)
        .eq("role", "teacher")
        .single();

      if (teacherError) throw teacherError;

      setTeacher(teacherProfile);

      const {
        data: teacherLinks,
        error: linksError,
      } = await supabase
        .from("teacher_halaqat")
        .select("halaqa_id, role")
        .eq("teacher_id", teacherProfile.id);

      if (linksError) throw linksError;

      const halaqaIds = [
        ...new Set(
          (teacherLinks || []).map((row) => Number(row.halaqa_id))
        ),
      ];

      if (halaqaIds.length === 0) {
        setHalaqat([]);
        setStudents([]);
        return;
      }

      const {
        data: halaqaRows,
        error: halaqaError,
      } = await supabase
        .from("halaqat")
        .select("id, name, mosque_id, halaqa_period, status")
        .in("id", halaqaIds)
        .order("name", { ascending: true });

      if (halaqaError) throw halaqaError;

      setHalaqat(halaqaRows || []);

      const {
        data: assignments,
        error: assignmentsError,
      } = await supabase
        .from("student_halaqat")
        .select("student_id, halaqa_id, start_date, is_current")
        .in("halaqa_id", halaqaIds)
        .eq("is_current", true);

      if (assignmentsError) throw assignmentsError;

      const studentIds = [
        ...new Set(
          (assignments || []).map((row) => Number(row.student_id))
        ),
      ];

      if (studentIds.length === 0) {
        setStudents([]);
        setAttendance([]);
        setRecitations([]);
        setPlans([]);
        setProgressRows([]);
        await loadMessagesAndRecipients({
          teacherProfile,
          halaqaRows: halaqaRows || [],
          currentStudents: [],
        });
        return;
      }

      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select("id, full_name, user_number, phone, status, learning_goal, guardian_name, guardian_phone, parent_name, parent_phone")
        .in("id", studentIds)
        .eq("role", "student");

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (profiles || []).map((profile) => [
          Number(profile.id),
          profile,
        ])
      );

      const preparedStudents = (assignments || [])
        .map((assignment) => {
          const profile = profileMap.get(
            Number(assignment.student_id)
          );

          if (!profile) return null;

          const halaqa = (halaqaRows || []).find(
            (row) =>
              Number(row.id) === Number(assignment.halaqa_id)
          );

          return {
            ...profile,
            student_id: Number(profile.id),
            student_name: profile.full_name || "طالب",
            halaqa_id: Number(assignment.halaqa_id),
            halaqa_name: halaqa?.name || "حلقة",
            mosque_id: halaqa?.mosque_id || null,
            start_date: assignment.start_date,
          };
        })
        .filter(Boolean);

      setStudents(preparedStudents);

      const today = getLocalDate();
      const attendanceFrom = addDays(today, -90);
      const recitationFrom = addDays(today, -90);

      const [
        guardianResult,
        attendanceResult,
        recitationResult,
        planResult,
        progressResult,
        actionResult,
        communicationResult,
      ] = await Promise.all([
        supabase
          .from("student_guardians")
          .select(
            "id, student_id, guardian_name, relation, phone, is_primary, whatsapp_enabled"
          )
          .in("student_id", studentIds)
          .order("is_primary", { ascending: false }),

        supabase
          .from("attendance")
          .select("id, student_id, halaqa_id, attendance_date, status")
          .in("halaqa_id", halaqaIds)
          .in("student_id", studentIds)
          .gte("attendance_date", attendanceFrom)
          .lte("attendance_date", today),

        supabase
          .from("recitations")
          .select(
            "id, student_id, halaqa_id, recitation_date, lesson_faces, review_faces"
          )
          .in("halaqa_id", halaqaIds)
          .in("student_id", studentIds)
          .gte("recitation_date", recitationFrom)
          .lte("recitation_date", today),

        supabase
          .from("monthly_plans")
          .select(
            "id, student_id, halaqa_id, plan_month, hijri_year, hijri_month, memorization_target_faces, revision_target_faces, status"
          )
          .in("halaqa_id", halaqaIds)
          .in("student_id", studentIds)
          .eq("plan_month", period.start),

        supabase
          .from("monthly_progress")
          .select(
            "id, student_id, halaqa_id, progress_month, hijri_year, hijri_month, manual_memorization_faces, manual_revision_faces, final_memorization_faces, final_revision_faces"
          )
          .in("halaqa_id", halaqaIds)
          .in("student_id", studentIds)
          .eq("progress_month", period.start),

        supabase
          .from("student_care_actions")
          .select("*")
          .eq("teacher_id", teacherProfile.id),

        supabase
          .from("student_communications")
          .select("*")
          .eq("teacher_id", teacherProfile.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const results = [
        guardianResult,
        attendanceResult,
        recitationResult,
        planResult,
        progressResult,
        actionResult,
        communicationResult,
      ];

      const failed = results.find((result) => result.error);

      if (failed?.error) {
        throw failed.error;
      }

      setGuardians(guardianResult.data || []);
      setAttendance(attendanceResult.data || []);
      setRecitations(recitationResult.data || []);
      const effectivePlans = await Promise.all(halaqaIds.map((id) => effectiveMonthlyPlans(
        (planResult.data || []).filter((row) => Number(row.halaqa_id) === Number(id)), id, period
      )));
      setPlans(effectivePlans.flat());
      setProgressRows(progressResult.data || []);
      setCareActions(actionResult.data || []);
      setCommunications(communicationResult.data || []);

      await loadMessagesAndRecipients({
        teacherProfile,
        halaqaRows: halaqaRows || [],
        currentStudents: preparedStudents,
      });

      if (silent) {
        showToast("تم تحديث مركز العناية", "success");
      }
    } catch (error) {
      console.error("STUDENT CARE LOAD:", error);

      showToast(
        error.message || "تعذر تحميل مركز العناية بالطلاب",
        "error"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMessagesAndRecipients({
    teacherProfile,
    halaqaRows,
    currentStudents,
  }) {
    const {
      data: supervisorRows,
      error: supervisorError,
    } = await supabase.rpc(
      "get_teacher_supervisors"
    );

    if (supervisorError) {
      throw supervisorError;
    }

    const supervisorProfiles = Array.from(
      new Map(
        (supervisorRows || []).map((row) => [
          Number(row.supervisor_id),
          {
            id: Number(row.supervisor_id),
            name:
              row.supervisor_name ||
              "مشرف المسجد",
            mosque_name:
              row.mosque_name ||
              "",
            halaqa_name:
              row.halaqa_name ||
              "",
          },
        ])
      ).values()
    );

    const recipientRows = [
      ...supervisorProfiles.map((profile) => ({
        id: Number(profile.id),
        name: profile.name,
        role: "supervisor",
        roleLabel: profile.mosque_name
          ? `مشرف • ${profile.mosque_name}`
          : "مشرف",
      })),

      ...(currentStudents || []).map((student) => ({
        id: Number(student.student_id),
        name: student.student_name,
        role: "student",
        roleLabel: "طالب",
      })),
    ];

    const uniqueRecipients = Array.from(
      new Map(
        recipientRows.map((row) => [
          `${row.role}-${row.id}`,
          row,
        ])
      ).values()
    );

    setRecipients(uniqueRecipients);

    const {
      data: sentRows,
      error: sentError,
    } = await supabase
      .from("internal_messages")
      .select("*")
      .eq("sender_id", teacherProfile.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (sentError) throw sentError;

    const {
      data: inboxRows,
      error: inboxError,
    } = await supabase
      .from("internal_messages")
      .select("*")
      .eq("recipient_id", teacherProfile.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (inboxError) throw inboxError;

    const combined = [
      ...(sentRows || []),
      ...(inboxRows || []),
    ];

    const uniqueMessages = Array.from(
      new Map(
        combined.map((message) => [message.id, message])
      ).values()
    ).sort(
      (a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    );

    setMessages(uniqueMessages);

    const profileIds = [
      ...new Set(
        uniqueMessages
          .flatMap((message) => [
            message.sender_id,
            message.recipient_id,
            message.student_context_id,
          ])
          .filter(Boolean)
          .map(Number)
      ),
    ];

    if (profileIds.length > 0) {
      const {
        data: messageProfileRows,
        error: messageProfileError,
      } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", profileIds);

      if (messageProfileError) throw messageProfileError;

      setMessageProfiles(
        Object.fromEntries(
          (messageProfileRows || []).map((profile) => [
            Number(profile.id),
            profile,
          ])
        )
      );
    } else {
      setMessageProfiles({});
    }
  }

  /* =====================================================
     STUDENTS + GUARDIANS
  ===================================================== */

  const guardianMap = useMemo(() => {
    const map = new Map();

    guardians.forEach((guardian) => {
      const studentId = Number(guardian.student_id);

      if (!map.has(studentId) || guardian.is_primary) {
        map.set(studentId, guardian);
      }
    });

    return map;
  }, [guardians]);

  const enrichedStudents = useMemo(
    () =>
      students.map((student) => {
        const guardian = guardianMap.get(
          Number(student.student_id)
        );

        const guardianTablePhone =
          guardian?.whatsapp_enabled !== false && guardian?.phone
            ? guardian.phone
            : "";

        const guardianProfilePhone =
          student.guardian_phone ||
          student.parent_phone ||
          "";

        const studentPhone =
          student.phone || "";

        const guardianPhone =
          guardianTablePhone ||
          guardianProfilePhone;

        const guardianFirst =
          teacherPreferences.whatsapp_guardian_first !== false;

        const contactPhone = guardianFirst
          ? guardianPhone || studentPhone
          : studentPhone || guardianPhone;

        const usesGuardianPhone =
          Boolean(
            contactPhone &&
            guardianPhone &&
            String(contactPhone) === String(guardianPhone)
          );

        return {
          ...student,
          guardian,
          contact_phone: contactPhone,
          contact_name:
            guardian?.guardian_name ||
            student.guardian_name ||
            student.parent_name ||
            (usesGuardianPhone ? "ولي الأمر" : student.student_name),
          contact_source: usesGuardianPhone
            ? "guardian"
            : studentPhone
              ? "student"
              : "none",
        };
      }),
    [students, guardianMap, teacherPreferences.whatsapp_guardian_first]
  );

  /* =====================================================
     ALERTS
  ===================================================== */

  const allAlerts = useMemo(
    () =>
      buildAlerts({
        students: enrichedStudents,
        attendance,
        recitations,
        plans,
        progressRows,
        period,
        preferences: teacherPreferences,
      }),
    [
      enrichedStudents,
      attendance,
      recitations,
      plans,
      progressRows,
      period,
      teacherPreferences,
    ]
  );

  const actionMap = useMemo(
    () =>
      new Map(
        careActions.map((action) => [
          action.alert_key,
          action,
        ])
      ),
    [careActions]
  );

  const alertsWithState = useMemo(
    () =>
      allAlerts.map((alert) => {
        const action = actionMap.get(alert.key);
        const snoozed =
          action?.action_status === "snoozed" &&
          action?.snoozed_until &&
          new Date(action.snoozed_until) > new Date();

        return {
          ...alert,
          action,
          handled: action?.action_status === "handled",
          snoozed,
        };
      }),
    [allAlerts, actionMap]
  );

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return alertsWithState.filter((alert) => {
      const matchesView =
        careView === "handled"
          ? alert.handled
          : !alert.handled && !alert.snoozed;

      if (!matchesView) return false;

      if (
        selectedHalaqa !== "all" &&
        Number(alert.student.halaqa_id) !==
          Number(selectedHalaqa)
      ) {
        return false;
      }

      if (
        categoryFilter !== "all" &&
        alert.category !== categoryFilter
      ) {
        return false;
      }

      if (
        severityFilter !== "all" &&
        alert.severity !== severityFilter
      ) {
        return false;
      }

      if (query) {
        const haystack = [
          alert.student.student_name,
          alert.student.user_number,
          alert.student.halaqa_name,
          alert.title,
          alert.description,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [
    alertsWithState,
    careView,
    selectedHalaqa,
    categoryFilter,
    severityFilter,
    search,
  ]);

  const careStats = useMemo(() => {
    const active = alertsWithState.filter(
      (alert) => !alert.handled && !alert.snoozed
    );

    return {
      total: active.length,
      urgent: active.filter(
        (alert) =>
          alert.severity === "critical" ||
          alert.severity === "high"
      ).length,
      attendance: active.filter(
        (alert) => alert.category === "attendance"
      ).length,
      plan: active.filter(
        (alert) => alert.category === "plan"
      ).length,
      unreadMessages: messages.filter(
        (message) =>
          Number(message.recipient_id) === Number(teacher?.id) &&
          !message.read_at
      ).length,
    };
  }, [alertsWithState, messages, teacher]);

  /* =====================================================
     CARE ACTIONS
  ===================================================== */

  async function setAlertAction(alert, status, extra = {}) {
    if (!teacher?.id) return;

    setHandlingKey(alert.key);

    try {
      const payload = {
        alert_key: alert.key,
        student_id: Number(alert.student.student_id),
        teacher_id: Number(teacher.id),
        halaqa_id: Number(alert.student.halaqa_id),
        alert_type: alert.type,
        action_status: status,
        handled_at:
          status === "handled" ? new Date().toISOString() : null,
        snoozed_until:
          status === "snoozed"
            ? extra.snoozed_until
            : null,
        action_note: extra.action_note || null,
      };

      const {
        error,
      } = await supabase
        .from("student_care_actions")
        .upsert(payload, {
          onConflict: "teacher_id,alert_key",
        });

      if (error) throw error;

      const {
        data: actionRows,
        error: reloadError,
      } = await supabase
        .from("student_care_actions")
        .select("*")
        .eq("teacher_id", teacher.id);

      if (reloadError) throw reloadError;

      setCareActions(actionRows || []);

      if (status === "handled") {
        showToast("تم تسجيل التعامل مع الحالة", "success");
      } else if (status === "snoozed") {
        showToast("تم تأجيل المتابعة حسب المدة المحددة في الإعدادات", "success");
      } else {
        showToast("تمت إعادة الحالة للمتابعة", "success");
      }
    } catch (error) {
      console.error("CARE ACTION:", error);
      showToast(error.message || "تعذر تحديث الحالة", "error");
    } finally {
      setHandlingKey(null);
    }
  }

  async function handleAlert(alert) {
    await setAlertAction(alert, "handled");
  }

  async function snoozeAlert(alert) {
    const until = new Date();
    const hours = Math.max(
      1,
      Number(
        teacherPreferences.care_default_snooze_hours || 24
      )
    );

    until.setHours(until.getHours() + hours);

    await setAlertAction(alert, "snoozed", {
      snoozed_until: until.toISOString(),
    });
  }

  async function reopenAlert(alert) {
    await setAlertAction(alert, "reopened");
  }

  /* =====================================================
     WHATSAPP
  ===================================================== */

  async function contactByWhatsApp(alert) {
    const phone = alert.student.contact_phone;

    if (!phone) {
      showToast(
        "لا يوجد رقم ولي أمر أو رقم جوال مسجل لهذا الطالب",
        "error"
      );
      return;
    }

    const normalized = normalizePhone(phone);

    if (!normalized) {
      showToast("رقم التواصل غير صالح", "error");
      return;
    }

    const message = buildWhatsAppMessage(alert, teacherPreferences);

    if (teacherPreferences.whatsapp_mode === "preview") {
      const confirmed = window.confirm(
        `${message}\n\nفتح الرسالة في واتساب؟`
      );

      if (!confirmed) return;
    }

    setWhatsappKey(alert.key);

    try {
      const {
        error,
      } = await supabase
        .from("student_communications")
        .insert({
          student_id: Number(alert.student.student_id),
          teacher_id: Number(teacher.id),
          halaqa_id: Number(alert.student.halaqa_id),
          alert_key: alert.key,
          alert_type: alert.type,
          channel: "whatsapp",
          contact_name: alert.student.contact_name || null,
          contact_phone: normalized,
          message_text: message,
          communication_status: "opened",
        });

      if (error) {
        console.warn("Communication log failed:", error.message);
      } else {
        const {
          data: communicationRows,
        } = await supabase
          .from("student_communications")
          .select("*")
          .eq("teacher_id", teacher.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (communicationRows) {
          setCommunications(communicationRows);
        }
      }
    } finally {
      setWhatsappKey(null);

      try {
        openWhatsAppApp(normalized, message);
      } catch (error) {
        showToast(error.message || "تعذر فتح واتساب", "error");
      }
    }
  }

  /* =====================================================
     MESSAGES
  ===================================================== */

  function updateCompose(field, value) {
    setCompose((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function sendInternalMessage() {
    if (!teacher?.id) return;

    if (!compose.recipient_id) {
      showToast("اختر المستلم", "error");
      return;
    }

    if (!String(compose.body || "").trim()) {
      showToast("اكتب نص الرسالة", "error");
      return;
    }

    if (
      Number(compose.recipient_id) === Number(teacher.id)
    ) {
      showToast("لا يمكنك إرسال رسالة لنفسك", "error");
      return;
    }

    setSendingMessage(true);

    try {
      const recipient = recipients.find(
        (row) =>
          Number(row.id) ===
          Number(compose.recipient_id)
      );

      const {
        error,
      } = await supabase.rpc(
        "send_internal_message",
        {
          p_recipient_id:
            Number(
              compose.recipient_id
            ),
          p_subject:
            String(
              compose.subject || ""
            ).trim() || null,
          p_body:
            String(
              compose.body || ""
            ).trim(),
          p_message_type:
            compose.message_type ||
            "general",
          p_priority:
            "normal",
          p_student_context_id:
            compose.student_context_id
              ? Number(
                  compose.student_context_id
                )
              : null,
          p_reply_to_id:
            compose.reply_to_id ||
            null,
        }
      );

      if (error) {
        throw error;
      }

      setCompose({
        recipient_id: "",
        student_context_id: "",
        subject: "",
        body: "",
        message_type: "general",
        reply_to_id: null,
      });

      showToast(
        recipient?.role === "student"
          ? "تم إرسال الرسالة ووصلت إلى حساب الطالب"
          : recipient?.role === "supervisor"
            ? "تم إرسال الرسالة ووصلت إلى مركز إشعارات المشرف"
            : "تم إرسال الرسالة",
        "success"
      );

      await loadAll({ silent: false });
      setActiveTab("messages");
      setMessageView("sent");
    } catch (error) {
      console.error("SEND INTERNAL MESSAGE:", error);
      showToast(error.message || "تعذر إرسال الرسالة", "error");
    } finally {
      setSendingMessage(false);
    }
  }

  async function markMessageRead(message) {
    if (
      Number(message.recipient_id) !== Number(teacher?.id) ||
      message.read_at
    ) {
      return;
    }

    const readAt =
      new Date().toISOString();

    const {
      error,
    } = await supabase.rpc(
      "mark_internal_message_read",
      {
        p_message_id:
          Number(message.id),
      }
    );

    if (error) {
      console.error(error);
      return;
    }

    setMessages((current) =>
      current.map((row) =>
        row.id === message.id
          ? {
              ...row,
              read_at: readAt,
            }
          : row
      )
    );
  }

  function replyToMessage(message) {
    const otherId =
      Number(message.sender_id) === Number(teacher?.id)
        ? message.recipient_id
        : message.sender_id;

    setCompose({
      recipient_id: String(otherId),
      student_context_id: message.student_context_id
        ? String(message.student_context_id)
        : "",
      subject: message.subject
        ? `رد: ${message.subject.replace(/^رد:\s*/u, "")}`
        : "",
      body: "",
      message_type: message.message_type || "general",
      reply_to_id: message.id,
    });

    setActiveTab("messages");
    setMessageView("compose");
  }

  const visibleMessages = useMemo(() => {
    if (!teacher?.id) return [];

    if (messageView === "sent") {
      return messages.filter(
        (message) =>
          Number(message.sender_id) === Number(teacher.id)
      );
    }

    return messages.filter(
      (message) =>
        Number(message.recipient_id) === Number(teacher.id)
    );
  }, [messages, messageView, teacher]);

  /* =====================================================
     COMMUNICATION LOG
  ===================================================== */

  const communicationRows = useMemo(() => {
    const studentMap = new Map(
      enrichedStudents.map((student) => [
        Number(student.student_id),
        student,
      ])
    );

    return communications.map((row) => ({
      ...row,
      student: studentMap.get(Number(row.student_id)),
    }));
  }, [communications, enrichedStudents]);

  /* =====================================================
     RENDER
  ===================================================== */

  if (loading) {
    return (
      <div className="student-care-page" dir="rtl">
        <StudentCareStyles />
        <PageLoading />
      </div>
    );
  }

  return (
    <div className="student-care-page" dir="rtl">
      <StudentCareStyles />

      <section className="care-hero">
        <div className="care-hero-main">
          <div className="care-hero-icon">
            <HeartHandshake size={25} />
          </div>

          <div>
            <div className="care-eyebrow">
              <ShieldCheck size={13} />
              المتابعة الاستباقية
            </div>

            <h1>العناية بالطلاب</h1>

            <p>
              مركز ذكي يجمع الحضور والتسميع والخطة والإنجاز،
              ويحول البيانات إلى إجراءات متابعة عملية قبل أن يتفاقم التعثر.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="refresh-care-btn"
          disabled={refreshing}
          onClick={() => loadAll({ silent: true })}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "spin" : ""}
          />
          <span>تحديث البيانات</span>
        </button>
      </section>

      <section className="care-stats">
        <CareStat
          icon={BellRing}
          title="تحتاج إجراء"
          value={careStats.total}
          subtitle="حالات نشطة الآن"
          tone="total"
        />

        <CareStat
          icon={AlertTriangle}
          title="أولوية عالية"
          value={careStats.urgent}
          subtitle="تحتاج اهتمامًا قريبًا"
          tone="urgent"
        />

        <CareStat
          icon={CalendarCheck}
          title="الحضور"
          value={careStats.attendance}
          subtitle="غياب أو تأخر"
          tone="attendance"
        />

        <CareStat
          icon={Target}
          title="الخطة والإنجاز"
          value={careStats.plan}
          subtitle="تعثر أو خطة ناقصة"
          tone="plan"
        />

        <CareStat
          icon={Mail}
          title="رسائل جديدة"
          value={careStats.unreadMessages}
          subtitle="داخل نظام الصديق"
          tone="messages"
        />
      </section>

      <div className="care-tabs">
        <button
          type="button"
          className={activeTab === "care" ? "active" : ""}
          onClick={() => setActiveTab("care")}
        >
          <HeartHandshake size={15} />
          مركز العناية
          {careStats.total > 0 && (
            <span>{careStats.total}</span>
          )}
        </button>

        <button
          type="button"
          className={activeTab === "messages" ? "active" : ""}
          onClick={() => setActiveTab("messages")}
        >
          <MessageSquareText size={15} />
          المراسلات
          {careStats.unreadMessages > 0 && (
            <span>{careStats.unreadMessages}</span>
          )}
        </button>

        <button
          type="button"
          className={activeTab === "communications" ? "active" : ""}
          onClick={() => setActiveTab("communications")}
        >
          <History size={15} />
          سجل التواصل
        </button>
      </div>

      {activeTab === "care" && (
        <>
          <section className="care-toolbar">
            <div className="care-toolbar-top">
              <div className="view-switch">
                <button
                  type="button"
                  className={careView === "active" ? "active" : ""}
                  onClick={() => setCareView("active")}
                >
                  الحالات النشطة
                </button>

                <button
                  type="button"
                  className={careView === "handled" ? "active" : ""}
                  onClick={() => setCareView("handled")}
                >
                  تم التعامل
                </button>
              </div>

              <div className="care-search">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم الطالب أو الحالة..."
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="care-filters">
              <FilterSelect
                value={selectedHalaqa}
                onChange={setSelectedHalaqa}
              >
                <option value="all">كل الحلقات</option>
                {halaqat.map((halaqa) => (
                  <option key={halaqa.id} value={halaqa.id}>
                    {halaqa.name}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                value={categoryFilter}
                onChange={setCategoryFilter}
              >
                <option value="all">كل الأنواع</option>
                <option value="attendance">الحضور</option>
                <option value="plan">الخطة والإنجاز</option>
                <option value="recitation">التسميع</option>
              </FilterSelect>

              <FilterSelect
                value={severityFilter}
                onChange={setSeverityFilter}
              >
                <option value="all">كل الأولويات</option>
                <option value="critical">متابعة عاجلة</option>
                <option value="high">أولوية عالية</option>
                <option value="medium">يحتاج متابعة</option>
                <option value="low">تنبيه</option>
              </FilterSelect>
            </div>
          </section>

          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={
                careView === "active"
                  ? "لا توجد حالات تحتاج تدخلاً حاليًا"
                  : "لا توجد حالات معالجة ضمن الفلاتر الحالية"
              }
              description={
                careView === "active"
                  ? "البيانات الحالية لا تظهر تنبيهات متابعة ضمن المعايير المعتمدة."
                  : "غيّر الفلاتر أو عد إلى الحالات النشطة."
              }
            />
          ) : (
            <section className="alerts-grid">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.key}
                  alert={alert}
                  careView={careView}
                  handling={handlingKey === alert.key}
                  openingWhatsApp={whatsappKey === alert.key}
                  onWhatsApp={() => contactByWhatsApp(alert)}
                  onHandle={() => handleAlert(alert)}
                  onSnooze={() => snoozeAlert(alert)}
                  onReopen={() => reopenAlert(alert)}
                  onMessageStudent={() => {
                    setCompose({
                      recipient_id: String(alert.student.student_id),
                      student_context_id: String(alert.student.student_id),
                      subject: alert.title,
                      body: "",
                      message_type:
                        alert.category === "attendance"
                          ? "attendance"
                          : alert.category === "recitation"
                            ? "recitation"
                            : "student_followup",
                      reply_to_id: null,
                    });
                    setActiveTab("messages");
                    setMessageView("compose");
                  }}
                  onMessageSupervisor={() => {
                    const supervisor = recipients.find(
                      (recipient) => recipient.role === "supervisor"
                    );

                    if (!supervisor) {
                      showToast(
                        "لا يوجد مشرف مرتبط بمساجد حلقاتك حاليًا",
                        "info"
                      );
                      return;
                    }

                    setCompose({
                      recipient_id: String(supervisor.id),
                      student_context_id: String(alert.student.student_id),
                      subject: alert.title,
                      body: `السلام عليكم ورحمة الله وبركاته،\n\nأرفع لكم متابعة الطالب ${alert.student.student_name} بخصوص: ${alert.title}.\n\n`,
                      message_type: "student_followup",
                      reply_to_id: null,
                    });
                    setActiveTab("messages");
                    setMessageView("compose");
                  }}
                />
              ))}
            </section>
          )}
        </>
      )}

      {activeTab === "messages" && (
        <section className="messages-layout">
          <div className="messages-side">
            <button
              type="button"
              className={messageView === "compose" ? "active" : ""}
              onClick={() => setMessageView("compose")}
            >
              <Send size={14} />
              رسالة جديدة
            </button>

            <button
              type="button"
              className={messageView === "inbox" ? "active" : ""}
              onClick={() => setMessageView("inbox")}
            >
              <Inbox size={14} />
              الوارد
              {careStats.unreadMessages > 0 && (
                <span>{careStats.unreadMessages}</span>
              )}
            </button>

            <button
              type="button"
              className={messageView === "sent" ? "active" : ""}
              onClick={() => setMessageView("sent")}
            >
              <History size={14} />
              المرسل
            </button>
          </div>

          <div className="messages-main">
            {messageView === "compose" ? (
              <ComposeMessage
                compose={compose}
                recipients={recipients}
                students={enrichedStudents}
                sending={sendingMessage}
                updateCompose={updateCompose}
                onSend={sendInternalMessage}
                onCancelReply={() =>
                  updateCompose("reply_to_id", null)
                }
              />
            ) : visibleMessages.length === 0 ? (
              <EmptyState
                icon={Mail}
                title={
                  messageView === "inbox"
                    ? "لا توجد رسائل واردة"
                    : "لا توجد رسائل مرسلة"
                }
                description="ستظهر المراسلات الداخلية هنا عند وجودها."
              />
            ) : (
              <div className="message-list">
                {visibleMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    teacherId={teacher?.id}
                    profiles={messageProfiles}
                    onOpen={() => markMessageRead(message)}
                    onReply={() => replyToMessage(message)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "communications" && (
        <section className="communication-panel">
          <div className="panel-heading">
            <div>
              <h2>سجل التواصل</h2>
              <p>
                يسجل فتح واتساب أو وسائل التواصل الأخرى. فتح واتساب لا يعني أن الرسالة أُرسلت فعليًا.
              </p>
            </div>

            <span>{communicationRows.length} عملية</span>
          </div>

          {communicationRows.length === 0 ? (
            <EmptyState
              icon={History}
              title="لا يوجد سجل تواصل بعد"
              description="عند فتح واتساب من أي تنبيه سيظهر الحدث هنا."
            />
          ) : (
            <div className="communication-list">
              {communicationRows.map((row) => (
                <div className="communication-row" key={row.id}>
                  <div className="communication-icon">
                    <MessageCircle size={16} />
                  </div>

                  <div className="communication-info">
                    <strong>
                      {row.student?.student_name || "طالب"}
                    </strong>
                    <span>
                      {row.channel === "whatsapp"
                        ? "تم فتح واتساب"
                        : "تواصل"}
                      {row.contact_name
                        ? ` • ${row.contact_name}`
                        : ""}
                    </span>
                  </div>

                  <div className="communication-date">
                    {formatDateTime(row.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* =========================================================
   ALERT CARD
========================================================= */

function AlertCard({
  alert,
  careView,
  handling,
  openingWhatsApp,
  onWhatsApp,
  onHandle,
  onSnooze,
  onReopen,
  onMessageStudent,
  onMessageSupervisor,
}) {
  const severity = SEVERITY_META[alert.severity];
  const category = CATEGORY_META[alert.category];
  const CategoryIcon = category.icon;

  return (
    <article className={`alert-card ${severity.className}`}>
      <div className="alert-accent" />

      <div className="alert-header">
        <div className="alert-student">
          <div className="alert-avatar">
            <UserRound size={19} />
          </div>

          <div>
            <h3>{alert.student.student_name}</h3>
            <span>
              {alert.student.halaqa_name}
              {alert.student.user_number
                ? ` • ${alert.student.user_number}`
                : ""}
            </span>
          </div>
        </div>

        <div className="alert-badges">
          <span className={`severity-badge ${severity.className}`}>
            {severity.label}
          </span>

          <span className="category-badge">
            <CategoryIcon size={11} />
            {category.label}
          </span>
        </div>
      </div>

      <div className="alert-content">
        <h4>{alert.title}</h4>
        <p>{alert.description}</p>
      </div>

      {alert.metrics.length > 0 && (
        <div className="alert-metrics">
          {alert.metrics.map((metric) => (
            <div key={`${alert.key}-${metric.label}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="recommended-action">
        <Sparkles size={13} />
        <div>
          <span>الإجراء المقترح</span>
          <strong>{alert.recommendedAction}</strong>
        </div>
      </div>

      <div className="alert-actions">
        {careView === "active" ? (
          <>
            {alert.whatsapp && (
              <button
                type="button"
                className="whatsapp-btn"
                onClick={onWhatsApp}
                disabled={
                  openingWhatsApp ||
                  !alert.student.contact_phone
                }
                title={
                  alert.student.contact_source === "guardian"
                    ? "فتح واتساب ولي الأمر"
                    : "فتح واتساب الرقم الموجود في ملف الطالب"
                }
              >
                {openingWhatsApp ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <MessageCircle size={14} />
                )}
                {alert.student.contact_source === "guardian"
                  ? "واتساب ولي الأمر"
                  : alert.student.contact_source === "student"
                    ? "فتح واتساب"
                    : "لا يوجد رقم"}
              </button>
            )}

            <button
              type="button"
              className="internal-message-btn"
              onClick={onMessageStudent}
            >
              <MessageSquareText size={14} />
              رسالة للطالب
            </button>

            <button
              type="button"
              className="internal-message-btn"
              onClick={onMessageSupervisor}
            >
              <ShieldCheck size={14} />
              رسالة للمشرف
            </button>

            <button
              type="button"
              className="snooze-btn"
              onClick={onSnooze}
              disabled={handling}
            >
              <Clock3 size={14} />
              غدًا
            </button>

            <button
              type="button"
              className="handled-btn"
              onClick={onHandle}
              disabled={handling}
            >
              {handling ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <BadgeCheck size={14} />
              )}
              تم التعامل
            </button>
          </>
        ) : (
          <button
            type="button"
            className="reopen-btn"
            onClick={onReopen}
            disabled={handling}
          >
            <RotateCcw size={14} />
            إعادة للمتابعة
          </button>
        )}
      </div>

      {alert.whatsapp && (
        <div className="contact-source-note">
          {alert.student.contact_source === "guardian"
            ? `رقم التواصل: ${alert.student.contact_name || "ولي الأمر"}`
            : alert.student.contact_source === "student"
              ? "لم يوجد رقم صالح لولي الأمر؛ سيستخدم رقم جوال الطالب المسجل في ملفه."
              : "لا يوجد رقم تواصل مسجل."}
        </div>
      )}
    </article>
  );
}

/* =========================================================
   COMPOSE MESSAGE
========================================================= */

function ComposeMessage({
  compose,
  recipients,
  students,
  sending,
  updateCompose,
  onSend,
  onCancelReply,
}) {
  return (
    <div className="compose-card">
      <div className="compose-heading">
        <div className="compose-icon">
          <Send size={18} />
        </div>

        <div>
          <h2>رسالة داخل النظام</h2>
          <p>للمشرف أو الطالب مع إمكانية ربط الرسالة بطالب محدد.</p>
        </div>
      </div>

      {compose.reply_to_id && (
        <div className="reply-banner">
          <span>هذه الرسالة رد على رسالة سابقة.</span>
          <button type="button" onClick={onCancelReply}>
            <X size={13} />
          </button>
        </div>
      )}

      <div className="compose-grid">
        <div className="compose-field">
          <label>المستلم</label>
          <div className="compose-select">
            <select
              value={compose.recipient_id}
              onChange={(event) =>
                updateCompose("recipient_id", event.target.value)
              }
            >
              <option value="">اختر المستلم</option>

              {recipients.filter((row) => row.role === "supervisor").length > 0 && (
                <optgroup label="المشرفون">
                  {recipients
                    .filter((row) => row.role === "supervisor")
                    .map((row) => (
                      <option key={`supervisor-${row.id}`} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                </optgroup>
              )}

              <optgroup label="الطلاب">
                {recipients
                  .filter((row) => row.role === "student")
                  .map((row) => (
                    <option key={`student-${row.id}`} value={row.id}>
                      {row.name}
                    </option>
                  ))}
              </optgroup>
            </select>
            <ChevronDown size={14} />
          </div>
        </div>

        <div className="compose-field">
          <label>نوع الرسالة</label>
          <div className="compose-select">
            <select
              value={compose.message_type}
              onChange={(event) =>
                updateCompose("message_type", event.target.value)
              }
            >
              {MESSAGE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>

        <div className="compose-field">
          <label>الطالب المرتبط بالرسالة</label>
          <div className="compose-select">
            <select
              value={compose.student_context_id}
              onChange={(event) =>
                updateCompose(
                  "student_context_id",
                  event.target.value
                )
              }
            >
              <option value="">بدون ربط بطالب</option>
              {students.map((student) => (
                <option
                  key={student.student_id}
                  value={student.student_id}
                >
                  {student.student_name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>

        <div className="compose-field">
          <label>العنوان</label>
          <input
            value={compose.subject}
            onChange={(event) =>
              updateCompose("subject", event.target.value)
            }
            placeholder="عنوان مختصر للرسالة..."
          />
        </div>
      </div>

      <div className="compose-field body">
        <label>الرسالة</label>
        <textarea
          rows={7}
          value={compose.body}
          onChange={(event) =>
            updateCompose("body", event.target.value)
          }
          placeholder="اكتب رسالتك هنا..."
        />
      </div>

      <div className="compose-footer">
        <button
          type="button"
          onClick={onSend}
          disabled={sending}
        >
          {sending ? (
            <Loader2 size={15} className="spin" />
          ) : (
            <Send size={15} />
          )}
          إرسال الرسالة
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   MESSAGE CARD
========================================================= */

function MessageCard({
  message,
  teacherId,
  profiles,
  onOpen,
  onReply,
}) {
  const isInbox =
    Number(message.recipient_id) === Number(teacherId);

  const otherId = isInbox
    ? Number(message.sender_id)
    : Number(message.recipient_id);

  const other = profiles[otherId];
  const context = message.student_context_id
    ? profiles[Number(message.student_context_id)]
    : null;

  const unread = isInbox && !message.read_at;

  return (
    <article
      className={unread ? "message-card unread" : "message-card"}
      onClick={onOpen}
    >
      <div className="message-avatar">
        <UserRound size={18} />
      </div>

      <div className="message-content">
        <div className="message-top">
          <div>
            <strong>{other?.full_name || "مستخدم"}</strong>
            <span>
              {isInbox ? "أرسل إليك" : "أرسلت إليه"}
            </span>
          </div>

          <time>{formatDateTime(message.created_at)}</time>
        </div>

        <h4>{message.subject || "بدون عنوان"}</h4>
        <p>{message.body}</p>

        <div className="message-meta">
          {context && (
            <span>
              <UserRound size={11} />
              متعلق بالطالب: {context.full_name}
            </span>
          )}

          <span>
            {MESSAGE_TYPES.find(
              (type) => type.value === message.message_type
            )?.label || "رسالة عامة"}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="reply-btn"
        onClick={(event) => {
          event.stopPropagation();
          onReply();
        }}
      >
        رد
      </button>
    </article>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function CareStat({
  icon: Icon,
  title,
  value,
  subtitle,
  tone,
}) {
  return (
    <div className={`care-stat ${tone}`}>
      <div className="care-stat-icon">
        <Icon size={18} />
      </div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}) {
  return (
    <div className="filter-select">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="care-empty">
      <div className="care-empty-icon">
        <Icon size={27} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="care-page-loading">
      <div className="care-loading-icon">
        <Loader2 size={28} className="spin" />
      </div>
      <h3>جارٍ تجهيز مركز العناية</h3>
      <p>يتم تحليل الحضور والتسميع والخطة والإنجاز...</p>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

function StudentCareStyles() {
  return (
    <style>{`
      .student-care-page {
        width: 100%;
        max-width: 1600px;
        margin: 0 auto;
        color: #0f172a;
      }

      .student-care-page * {
        box-sizing: border-box;
      }

      .student-care-page button,
      .student-care-page input,
      .student-care-page select,
      .student-care-page textarea {
        font-family: inherit;
      }

      .care-hero {
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(18px * var(--app-density,1));
        padding: calc(22px * var(--app-density,1)) calc(24px * var(--app-density,1));
        margin-bottom: 14px;
        border: 1px solid color-mix(in srgb,var(--app-color-0f5132,#0f5132) 10%,transparent);
        border-radius: calc(23px * var(--app-radius-scale,1));
        background: linear-gradient(135deg,#fff 0%,var(--app-color-f5faf7,#f5faf7) 63%,#fffaf0 100%);
        box-shadow: 0 13px 37px color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
      }

      .care-hero::before {
        content: "";
        position: absolute;
        width: 280px;
        height: 280px;
        left: -145px;
        top: -170px;
        border-radius: 50%;
        background: radial-gradient(circle,rgba(201,162,39,.15),transparent 70%);
        pointer-events: none;
      }

      .care-hero-main {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: calc(12px * var(--app-density,1));
        min-width: 0;
      }

      .care-hero-icon {
        width: 51px;
        height: 51px;
        flex: 0 0 51px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: calc(16px * var(--app-radius-scale,1));
        color: #fff;
        background: linear-gradient(135deg,var(--app-color-0f5132,#0f5132),var(--app-color-0f766e,#0f766e));
        box-shadow: 0 10px 24px color-mix(in srgb,var(--app-color-0f5132,#0f5132) 18%,transparent);
      }

      .care-eyebrow {
        display: flex;
        align-items: center;
        gap: calc(5px * var(--app-density,1));
        margin-bottom: 3px;
        color: #9a741f;
        font-size: calc(9px * var(--app-font-scale,1));
        font-weight: 900;
      }

      .care-hero h1 {
        margin: 0;
        color: var(--app-color-173d2b,#173d2b);
        font-size: calc(25px * var(--app-font-scale,1));
        font-weight: 950;
      }

      .care-hero p {
        max-width: 590px;
        margin: 5px 0 0;
        color: #758079;
        font-size: calc(10px * var(--app-font-scale,1));
        line-height: 1.75;
      }

      .refresh-care-btn {
        position: relative;
        z-index: 2;
        min-height: 40px;
        padding: 0 calc(12px * var(--app-density,1));
        border: 1px solid #dce4df;
        border-radius: calc(10px * var(--app-radius-scale,1));
        display: inline-flex;
        align-items: center;
        gap: calc(6px * var(--app-density,1));
        color: var(--app-color-0f5132,#0f5132);
        background: #fff;
        font-size: calc(8px * var(--app-font-scale,1));
        font-weight: 900;
        cursor: pointer;
      }

      .care-stats {
        display: grid;
        grid-template-columns: repeat(5,minmax(0,1fr));
        gap: calc(9px * var(--app-density,1));
        margin-bottom: 14px;
      }

      .care-stat {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: calc(8px * var(--app-density,1));
        padding: calc(12px * var(--app-density,1));
        border: 1px solid #e5ebe7;
        border-radius: calc(16px * var(--app-radius-scale,1));
        background: #fff;
        box-shadow: 0 6px 20px rgba(15,23,42,.025);
      }

      .care-stat-icon {
        width: 36px;
        height: 36px;
        flex: 0 0 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: calc(11px * var(--app-radius-scale,1));
      }

      .care-stat.total .care-stat-icon { color:var(--app-color-0f5132,#0f5132);background:var(--app-color-edf7f1,#edf7f1); }
      .care-stat.urgent .care-stat-icon { color:#b42318;background:#fff0ef; }
      .care-stat.attendance .care-stat-icon { color:#b45309;background:#fff7ed; }
      .care-stat.plan .care-stat-icon { color:var(--app-color-0f766e,#0f766e);background:var(--app-color-edf8f7,#edf8f7); }
      .care-stat.messages .care-stat-icon { color:#927536;background:#fff8e7; }

      .care-stat span {
        display: block;
        color: #7f8a83;
        font-size: calc(7px * var(--app-font-scale,1));
      }

      .care-stat strong {
        display: block;
        margin-top: 1px;
        color: var(--app-color-173d2b,#173d2b);
        font-size: calc(18px * var(--app-font-scale,1));
        font-weight: 950;
      }

      .care-stat small {
        display: block;
        margin-top: 1px;
        color: #9ba39e;
        font-size: calc(6px * var(--app-font-scale,1));
      }

      .care-tabs {
        display: flex;
        align-items: center;
        gap: calc(6px * var(--app-density,1));
        padding: calc(6px * var(--app-density,1));
        margin-bottom: 12px;
        border: 1px solid #e3e9e5;
        border-radius: calc(14px * var(--app-radius-scale,1));
        background: #fff;
      }

      .care-tabs button {
        min-height: 37px;
        padding: 0 calc(11px * var(--app-density,1));
        border: none;
        border-radius: calc(9px * var(--app-radius-scale,1));
        display: inline-flex;
        align-items: center;
        gap: calc(5px * var(--app-density,1));
        color: #657269;
        background: transparent;
        font-size: calc(8px * var(--app-font-scale,1));
        font-weight: 850;
        cursor: pointer;
      }

      .care-tabs button.active {
        color: #fff;
        background: linear-gradient(135deg,var(--app-color-0f5132,#0f5132),var(--app-color-0f766e,#0f766e));
      }

      .care-tabs button > span {
        min-width: 19px;
        height: 19px;
        padding: 0 calc(5px * var(--app-density,1));
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: inherit;
        background: rgba(255,255,255,.16);
        font-size: calc(6px * var(--app-font-scale,1));
      }

      .care-toolbar {
        padding: calc(12px * var(--app-density,1));
        margin-bottom: 12px;
        border: 1px solid #e4eae6;
        border-radius: calc(16px * var(--app-radius-scale,1));
        background: #fff;
      }

      .care-toolbar-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(10px * var(--app-density,1));
        margin-bottom: 8px;
      }

      .view-switch {
        display: flex;
        gap: calc(4px * var(--app-density,1));
        padding: calc(4px * var(--app-density,1));
        border-radius: calc(10px * var(--app-radius-scale,1));
        background: #f3f6f4;
      }

      .view-switch button {
        min-height: 31px;
        padding: 0 calc(9px * var(--app-density,1));
        border: none;
        border-radius: calc(7px * var(--app-radius-scale,1));
        color: #657269;
        background: transparent;
        font-size: calc(7px * var(--app-font-scale,1));
        font-weight: 850;
        cursor: pointer;
      }

      .view-switch button.active {
        color: var(--app-color-0f5132,#0f5132);
        background: #fff;
        box-shadow: 0 3px 10px rgba(15,23,42,.05);
      }

      .care-search {
        position: relative;
        width: min(390px,100%);
      }

      .care-search > svg {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: #8c9690;
      }

      .care-search input {
        width: 100%;
        height: 37px;
        padding: 0 calc(34px * var(--app-density,1)) 0 calc(32px * var(--app-density,1));
        border: 1px solid #dce4df;
        border-radius: calc(9px * var(--app-radius-scale,1));
        outline: none;
        color: #33443a;
        background: #fbfdfc;
        font-size: calc(8px * var(--app-font-scale,1));
      }

      .care-search button {
        position: absolute;
        left: 6px;
        top: 50%;
        width: 25px;
        height: 25px;
        transform: translateY(-50%);
        border: none;
        border-radius: calc(7px * var(--app-radius-scale,1));
        display: flex;
        align-items: center;
        justify-content: center;
        color: #667169;
        background: #edf1ef;
        cursor: pointer;
      }

      .care-filters {
        display: grid;
        grid-template-columns: repeat(3,minmax(150px,1fr));
        gap: calc(7px * var(--app-density,1));
      }

      .filter-select {
        position: relative;
      }

      .filter-select select {
        width: 100%;
        height: 36px;
        appearance: none;
        padding: 0 calc(9px * var(--app-density,1)) 0 calc(28px * var(--app-density,1));
        border: 1px solid #dce4df;
        border-radius: calc(9px * var(--app-radius-scale,1));
        outline: none;
        color: #425047;
        background: #fbfdfc;
        font-size: calc(7px * var(--app-font-scale,1));
        cursor: pointer;
      }

      .filter-select > svg {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        color: #89938c;
        pointer-events: none;
      }

      .alerts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit,minmax(min(100%,450px),1fr));
        gap: calc(11px * var(--app-density,1));
      }

      .alert-card {
        position: relative;
        overflow: hidden;
        padding: calc(14px * var(--app-density,1));
        border: 1px solid #e4eae6;
        border-radius: calc(18px * var(--app-radius-scale,1));
        background: #fff;
        box-shadow: 0 7px 24px rgba(15,23,42,.035);
      }

      .alert-accent {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 3px;
      }

      .alert-card.critical .alert-accent { background:#b42318; }
      .alert-card.high .alert-accent { background:#dc6b19; }
      .alert-card.medium .alert-accent { background:#c49a2d; }
      .alert-card.low .alert-accent { background:var(--app-color-0f766e,#0f766e); }

      .alert-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: calc(8px * var(--app-density,1));
        margin-bottom: 10px;
      }

      .alert-student {
        display: flex;
        align-items: center;
        gap: calc(8px * var(--app-density,1));
        min-width: 0;
      }

      .alert-avatar {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: calc(12px * var(--app-radius-scale,1));
        color: var(--app-color-0f5132,#0f5132);
        background: var(--app-color-edf7f1,#edf7f1);
      }

      .alert-student h3 {
        margin: 0;
        color: #293a30;
        font-size: calc(11px * var(--app-font-scale,1));
        font-weight: 950;
      }

      .alert-student span {
        display: block;
        margin-top: 2px;
        color: #939c96;
        font-size: calc(6px * var(--app-font-scale,1));
      }

      .alert-badges {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: calc(4px * var(--app-density,1));
      }

      .severity-badge,
      .category-badge {
        min-height: 23px;
        padding: 0 calc(7px * var(--app-density,1));
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        gap: calc(3px * var(--app-density,1));
        font-size: calc(6px * var(--app-font-scale,1));
        font-weight: 850;
      }

      .severity-badge.critical { color:#991b1b;background:#fee2e2; }
      .severity-badge.high { color:#b45309;background:#fff7ed; }
      .severity-badge.medium { color:#84651e;background:#fff8e7; }
      .severity-badge.low { color:#0f766e;background:#edf8f7; }

      .category-badge {
        color: #526159;
        background: #f1f5f3;
      }

      .alert-content h4 {
        margin: 0 0 4px;
        color: #203c2d;
        font-size: calc(10px * var(--app-font-scale,1));
        font-weight: 950;
      }

      .alert-content p {
        margin: 0;
        color: #748078;
        font-size: calc(7px * var(--app-font-scale,1));
        line-height: 1.75;
      }

      .alert-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit,minmax(90px,1fr));
        gap: calc(5px * var(--app-density,1));
        margin-top: 9px;
      }

      .alert-metrics > div {
        padding: calc(7px * var(--app-density,1));
        border-radius: calc(9px * var(--app-radius-scale,1));
        background: var(--app-color-f7faf8,#f7faf8);
      }

      .alert-metrics span {
        display: block;
        color: #929b95;
        font-size: calc(5.7px * var(--app-font-scale,1));
      }

      .alert-metrics strong {
        display: block;
        margin-top: 2px;
        color: #415047;
        font-size: calc(7px * var(--app-font-scale,1));
      }

      .recommended-action {
        display: flex;
        align-items: flex-start;
        gap: calc(6px * var(--app-density,1));
        margin-top: 9px;
        padding: calc(8px * var(--app-density,1));
        border: 1px solid #dcebe3;
        border-radius: calc(10px * var(--app-radius-scale,1));
        color: var(--app-color-0f766e,#0f766e);
        background: #f4faf6;
      }

      .recommended-action span {
        display: block;
        color: #769084;
        font-size: calc(5.7px * var(--app-font-scale,1));
      }

      .recommended-action strong {
        display: block;
        margin-top: 2px;
        color: #3c6550;
        font-size: calc(6.5px * var(--app-font-scale,1));
        line-height: 1.55;
      }

      .alert-actions {
        display: flex;
        flex-wrap: wrap;
        gap: calc(5px * var(--app-density,1));
        margin-top: 9px;
      }

      .alert-actions button {
        min-height: 34px;
        padding: 0 calc(9px * var(--app-density,1));
        border-radius: calc(9px * var(--app-radius-scale,1));
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: calc(4px * var(--app-density,1));
        font-size: calc(6.5px * var(--app-font-scale,1));
        font-weight: 900;
        cursor: pointer;
      }

      .whatsapp-btn {
        border: none;
        color: #fff;
        background: linear-gradient(135deg,#168b55,#22a967);
      }

      .internal-message-btn {
        border: 1px solid #cddfd5;
        color: var(--app-color-0f5132,#0f5132);
        background: var(--app-color-f5faf7,#f5faf7);
      }

      .snooze-btn {
        border: 1px solid #e4decf;
        color: #786234;
        background: #fffaf0;
      }

      .handled-btn {
        border: none;
        color: #fff;
        background: linear-gradient(135deg,var(--app-color-0f5132,#0f5132),var(--app-color-0f766e,#0f766e));
      }

      .reopen-btn {
        border: 1px solid #d5ded8;
        color: var(--app-color-0f5132,#0f5132);
        background: #fff;
      }

      .contact-source-note {
        margin-top: 7px;
        color: #9aa29d;
        font-size: calc(5.7px * var(--app-font-scale,1));
      }

      .messages-layout {
        display: grid;
        grid-template-columns: 190px minmax(0,1fr);
        gap: calc(10px * var(--app-density,1));
      }

      .messages-side {
        display: flex;
        flex-direction: column;
        gap: calc(5px * var(--app-density,1));
        padding: calc(8px * var(--app-density,1));
        border: 1px solid #e4eae6;
        border-radius: calc(14px * var(--app-radius-scale,1));
        background: #fff;
        align-self: start;
      }

      .messages-side button {
        min-height: 38px;
        padding: 0 calc(9px * var(--app-density,1));
        border: none;
        border-radius: calc(9px * var(--app-radius-scale,1));
        display: flex;
        align-items: center;
        gap: calc(5px * var(--app-density,1));
        color: #637068;
        background: transparent;
        font-size: calc(7px * var(--app-font-scale,1));
        font-weight: 850;
        cursor: pointer;
      }

      .messages-side button.active {
        color: #fff;
        background: var(--app-color-0f5132,#0f5132);
      }

      .messages-side button span {
        margin-right: auto;
        min-width: 18px;
        height: 18px;
        padding: 0 calc(5px * var(--app-density,1));
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,.16);
        font-size: calc(6px * var(--app-font-scale,1));
      }

      .messages-main {
        min-width: 0;
      }

      .compose-card {
        padding: calc(15px * var(--app-density,1));
        border: 1px solid #e4eae6;
        border-radius: calc(17px * var(--app-radius-scale,1));
        background: #fff;
      }

      .compose-heading {
        display: flex;
        align-items: center;
        gap: calc(8px * var(--app-density,1));
        margin-bottom: 12px;
      }

      .compose-icon {
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: calc(11px * var(--app-radius-scale,1));
        color: var(--app-color-0f5132,#0f5132);
        background: var(--app-color-edf7f1,#edf7f1);
      }

      .compose-heading h2 {
        margin: 0;
        color: #2f4036;
        font-size: calc(12px * var(--app-font-scale,1));
      }

      .compose-heading p {
        margin: 3px 0 0;
        color: #929b95;
        font-size: calc(6.5px * var(--app-font-scale,1));
      }

      .reply-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(8px * var(--app-density,1));
        margin-bottom: 10px;
        padding: calc(7px * var(--app-density,1)) calc(9px * var(--app-density,1));
        border-radius: calc(9px * var(--app-radius-scale,1));
        color: #765a17;
        background: #fff8e7;
        font-size: calc(6px * var(--app-font-scale,1));
      }

      .reply-banner button {
        width: 24px;
        height: 24px;
        border: none;
        border-radius: calc(7px * var(--app-radius-scale,1));
        display: flex;
        align-items: center;
        justify-content: center;
        color: #765a17;
        background: #f4e8c8;
        cursor: pointer;
      }

      .compose-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: calc(8px * var(--app-density,1));
      }

      .compose-field label {
        display: block;
        margin-bottom: 4px;
        color: #647168;
        font-size: calc(6px * var(--app-font-scale,1));
        font-weight: 850;
      }

      .compose-field input,
      .compose-field select,
      .compose-field textarea {
        width: 100%;
        border: 1px solid #dce4df;
        border-radius: calc(9px * var(--app-radius-scale,1));
        outline: none;
        color: #3d4c43;
        background: #fbfdfc;
        font-size: calc(7px * var(--app-font-scale,1));
      }

      .compose-field input,
      .compose-field select {
        height: 37px;
        padding: 0 calc(8px * var(--app-density,1));
      }

      .compose-select {
        position: relative;
      }

      .compose-select select {
        appearance: none;
        padding-left: calc(28px * var(--app-density,1));
      }

      .compose-select > svg {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        color: #89938c;
        pointer-events: none;
      }

      .compose-field.body {
        margin-top: 8px;
      }

      .compose-field textarea {
        padding: calc(9px * var(--app-density,1));
        resize: vertical;
        line-height: 1.7;
      }

      .compose-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 9px;
      }

      .compose-footer button {
        min-height: 38px;
        padding: 0 calc(14px * var(--app-density,1));
        border: none;
        border-radius: calc(9px * var(--app-radius-scale,1));
        display: inline-flex;
        align-items: center;
        gap: calc(5px * var(--app-density,1));
        color: #fff;
        background: linear-gradient(135deg,var(--app-color-0f5132,#0f5132),var(--app-color-0f766e,#0f766e));
        font-size: calc(7px * var(--app-font-scale,1));
        font-weight: 900;
        cursor: pointer;
      }

      .message-list {
        display: grid;
        gap: calc(7px * var(--app-density,1));
      }

      .message-card {
        display: grid;
        grid-template-columns: 38px minmax(0,1fr) auto;
        gap: calc(9px * var(--app-density,1));
        align-items: start;
        padding: calc(12px * var(--app-density,1));
        border: 1px solid #e4eae6;
        border-radius: calc(14px * var(--app-radius-scale,1));
        background: #fff;
        cursor: pointer;
      }

      .message-card.unread {
        border-color: #bfd7c9;
        background: #f7fcf9;
        box-shadow: inset -3px 0 0 var(--app-color-0f766e,#0f766e);
      }

      .message-avatar {
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: calc(11px * var(--app-radius-scale,1));
        color: var(--app-color-0f5132,#0f5132);
        background: var(--app-color-edf7f1,#edf7f1);
      }

      .message-content {
        min-width: 0;
      }

      .message-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: calc(8px * var(--app-density,1));
      }

      .message-top strong {
        display: block;
        color: #35453b;
        font-size: calc(8px * var(--app-font-scale,1));
      }

      .message-top span,
      .message-top time {
        color: #929b95;
        font-size: calc(5.7px * var(--app-font-scale,1));
      }

      .message-content h4 {
        margin: 6px 0 3px;
        color: #294031;
        font-size: calc(8px * var(--app-font-scale,1));
      }

      .message-content p {
        margin: 0;
        color: #6f7b73;
        font-size: calc(6.5px * var(--app-font-scale,1));
        line-height: 1.65;
        white-space: pre-wrap;
      }

      .message-meta {
        display: flex;
        flex-wrap: wrap;
        gap: calc(5px * var(--app-density,1));
        margin-top: 7px;
      }

      .message-meta span {
        min-height: 22px;
        padding: 0 calc(7px * var(--app-density,1));
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        gap: calc(3px * var(--app-density,1));
        color: #68756d;
        background: #f2f5f3;
        font-size: calc(5.5px * var(--app-font-scale,1));
      }

      .reply-btn {
        min-height: 30px;
        padding: 0 calc(8px * var(--app-density,1));
        border: 1px solid #d6e1da;
        border-radius: calc(8px * var(--app-radius-scale,1));
        color: var(--app-color-0f5132,#0f5132);
        background: #fff;
        font-size: calc(6px * var(--app-font-scale,1));
        font-weight: 850;
        cursor: pointer;
      }

      .communication-panel {
        padding: calc(13px * var(--app-density,1));
        border: 1px solid #e4eae6;
        border-radius: calc(16px * var(--app-radius-scale,1));
        background: #fff;
      }

      .panel-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: calc(8px * var(--app-density,1));
        margin-bottom: 10px;
      }

      .panel-heading h2 {
        margin: 0;
        color: #293a30;
        font-size: calc(13px * var(--app-font-scale,1));
      }

      .panel-heading p {
        margin: 3px 0 0;
        color: #929b95;
        font-size: calc(6.5px * var(--app-font-scale,1));
      }

      .panel-heading > span {
        color: #7a877e;
        font-size: calc(7px * var(--app-font-scale,1));
      }

      .communication-list {
        display: grid;
        gap: calc(6px * var(--app-density,1));
      }

      .communication-row {
        display: grid;
        grid-template-columns: 36px minmax(0,1fr) auto;
        align-items: center;
        gap: calc(8px * var(--app-density,1));
        padding: calc(9px * var(--app-density,1));
        border: 1px solid #e7ece9;
        border-radius: calc(11px * var(--app-radius-scale,1));
        background: #fbfdfc;
      }

      .communication-icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: calc(10px * var(--app-radius-scale,1));
        color: #168b55;
        background: #edf9f2;
      }

      .communication-info strong {
        display: block;
        color: #35453b;
        font-size: calc(8px * var(--app-font-scale,1));
      }

      .communication-info span {
        display: block;
        margin-top: 2px;
        color: #89938c;
        font-size: calc(6px * var(--app-font-scale,1));
      }

      .communication-date {
        color: #98a19b;
        font-size: calc(6px * var(--app-font-scale,1));
      }

      .care-empty {
        padding: calc(50px * var(--app-density,1)) calc(20px * var(--app-density,1));
        border: 1px dashed #cbd7d0;
        border-radius: calc(18px * var(--app-radius-scale,1));
        text-align: center;
        background: #fff;
      }

      .care-empty-icon,
      .care-loading-icon {
        width: 55px;
        height: 55px;
        margin: 0 auto 10px;
        border-radius: calc(16px * var(--app-radius-scale,1));
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--app-color-0f5132,#0f5132);
        background: var(--app-color-edf7f1,#edf7f1);
      }

      .care-empty h3,
      .care-page-loading h3 {
        margin: 0;
        color: #35453b;
        font-size: calc(13px * var(--app-font-scale,1));
      }

      .care-empty p,
      .care-page-loading p {
        margin: 4px 0 0;
        color: #8d9790;
        font-size: calc(8px * var(--app-font-scale,1));
      }

      .care-page-loading {
        min-height: 60vh;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        text-align: center;
      }

      @keyframes careSpin {
        to { transform: rotate(360deg); }
      }

      .spin {
        animation: careSpin .8s linear infinite;
      }

      @media (max-width: 1100px) {
        .care-stats {
          grid-template-columns: repeat(3,minmax(0,1fr));
        }

        .messages-layout {
          grid-template-columns: 155px minmax(0,1fr);
        }
      }

      @media (max-width: 760px) {
        .care-hero {
          align-items: flex-start;
          padding: calc(16px * var(--app-density,1));
        }

        .care-hero h1 {
          font-size: calc(20px * var(--app-font-scale,1));
        }

        .care-hero p {
          display: none;
        }

        .refresh-care-btn {
          width: 39px;
          min-height: 39px;
          padding: 0;
          justify-content: center;
        }

        .refresh-care-btn span {
          display: none;
        }

        .care-stats {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }

        .care-tabs {
          overflow-x: auto;
        }

        .care-tabs button {
          flex: 0 0 auto;
        }

        .care-toolbar-top {
          align-items: stretch;
          flex-direction: column;
        }

        .care-search {
          width: 100%;
        }

        .care-filters {
          grid-template-columns: 1fr;
        }

        .alert-header {
          flex-direction: column;
        }

        .alert-badges {
          justify-content: flex-start;
        }

        .messages-layout {
          grid-template-columns: 1fr;
        }

        .messages-side {
          flex-direction: row;
          overflow-x: auto;
        }

        .messages-side button {
          flex: 0 0 auto;
        }

        .compose-grid {
          grid-template-columns: 1fr;
        }

        .message-card {
          grid-template-columns: 36px minmax(0,1fr);
        }

        .reply-btn {
          grid-column: 2;
          justify-self: start;
        }
      }

      @media (max-width: 430px) {
        .care-hero {
          padding: calc(13px * var(--app-density,1));
        }

        .care-hero-icon {
          width: 40px;
          height: 40px;
          flex-basis: 40px;
        }

        .care-hero h1 {
          font-size: calc(18px * var(--app-font-scale,1));
        }

        .care-stats {
          grid-template-columns: 1fr 1fr;
        }

        .alert-actions button {
          flex: 1 1 calc(50% - 5px);
        }

        .communication-row {
          grid-template-columns: 36px minmax(0,1fr);
        }

        .communication-date {
          grid-column: 2;
        }
      }
    `}</style>
  );
}
