import {displayDateFormatter} from "../lib/calendar";
import {monthlySideLessonTotals,withSideLessonMetrics,formatSideLessonTotal,formatMonthlySideLessons} from "../lib/sideLesson";
import { effectiveMonthlyPlans } from "../lib/effectiveLearning";
// src/pages/MonthlyAchievement.jsx
// Admin Monthly Achievement Intelligence Center

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { BadgeCheck, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, FileSpreadsheet, FileText, AlertTriangle, CheckCircle2, XCircle, History, Layers3, Loader2, MessageSquareText, Printer, RefreshCw, Save, Search, ShieldCheck, Sparkles, Target, UserRound, Users, X } from "lucide-react";

import {
  supabase,
} from "../lib/supabase";

import {
  showToast,
} from "../components/Toast";

import { escapeHtml } from "../utils/htmlSecurity";

/* =========================================================
   الشهور الهجرية
========================================================= */

const HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];

/* =========================================================
   فترات الحلقات
========================================================= */

const HALAQA_PERIODS = {
  after_fajr: "بعد الفجر",
  after_dhuhr: "بعد الظهر",
  after_asr: "بعد العصر",
  after_maghrib: "بعد المغرب",
  after_isha: "بعد العشاء",
};

/* =========================================================
   Hijri / Gregorian Helpers
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

const hijriCache =
  new Map();

function getLocalDate(
  date = new Date()
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(
  value
) {
  return new Date(
    `${value}T12:00:00`
  );
}

function pad2(value) {
  return String(value)
    .padStart(2, "0");
}

function roundFaces(
  value
) {
  return (
    Math.round(
      (
        Number(value || 0) +
        Number.EPSILON
      ) *
        100
    ) / 100
  );
}

function formatFaces(
  value
) {
  const number =
    roundFaces(value);

  if (
    Number.isInteger(number)
  ) {
    return String(number);
  }

  return number
    .toFixed(2)
    .replace(
      /\.?0+$/,
      ""
    );
}

function acceptedRecitationEvaluation(value) {
  const text = String(value || "").trim();

  // نحافظ على توافق السجلات القديمة التي لم يكن التقييم إلزاميًا فيها.
  return !text || text !== "إعادة";
}

function getAcceptedLessonFaces(record) {
  if (!acceptedRecitationEvaluation(record?.lesson_evaluation)) {
    return 0;
  }

  const amount = Number(record?.lesson_amount_value || 0);
  const unit = record?.lesson_amount_unit;

  if (amount > 0 && (unit === "lines" || unit === "faces")) {
    return unit === "lines" ? amount / 15 : amount;
  }

  return Number(
    record?.lesson_faces_manual ??
      record?.lesson_faces ??
      0
  );
}

function getAcceptedReviewFaces(record) {
  if (!acceptedRecitationEvaluation(record?.review_evaluation)) {
    return 0;
  }

  return Number(record?.review_faces || 0);
}

function getHijriParts(
  date = new Date()
) {
  const parts =
    ummAlQuraFormatter
      .formatToParts(date);

  const result = {};

  parts.forEach(
    (part) => {
      if (
        part.type === "year" ||
        part.type === "month" ||
        part.type === "day"
      ) {
        result[
          part.type
        ] = Number(
          part.value
        );
      }
    }
  );

  return {
    year: result.year,
    month: result.month,
    day: result.day,
  };
}

/*
  يحول تاريخ هجري أم القرى
  إلى تاريخ ميلادي.

  لا نرسل السنة الهجرية مباشرة
  إلى عمود date في PostgreSQL.
*/

function findGregorianForHijri(
  hijriYear,
  hijriMonth,
  hijriDay = 1
) {
  const cacheKey =
    `date-${hijriYear}-${hijriMonth}-${hijriDay}`;

  if (
    hijriCache.has(
      cacheKey
    )
  ) {
    return hijriCache.get(
      cacheKey
    );
  }

  /*
    تقريب السنة الميلادية
    لتقليل نطاق البحث.
  */

  const approxYear =
    Math.floor(
      Number(hijriYear) *
        0.970224 +
        621.5774
    );

  const cursor =
    new Date(
      approxYear - 1,
      0,
      1,
      12,
      0,
      0
    );

  const end =
    new Date(
      approxYear + 1,
      11,
      31,
      12,
      0,
      0
    );

  while (
    cursor <= end
  ) {
    const parts =
      getHijriParts(
        cursor
      );

    if (
      parts.year ===
        Number(
          hijriYear
        ) &&
      parts.month ===
        Number(
          hijriMonth
        ) &&
      parts.day ===
        Number(
          hijriDay
        )
    ) {
      const result =
        getLocalDate(
          cursor
        );

      hijriCache.set(
        cacheKey,
        result
      );

      return result;
    }

    cursor.setDate(
      cursor.getDate() + 1
    );
  }

  throw new Error(
    "تعذر تحويل التاريخ إلى الميلادي"
  );
}

function getHijriMonthRange(
  hijriYear,
  hijriMonth
) {
  const cacheKey =
    `range-${hijriYear}-${hijriMonth}`;

  if (
    hijriCache.has(
      cacheKey
    )
  ) {
    return hijriCache.get(
      cacheKey
    );
  }

  const start =
    findGregorianForHijri(
      hijriYear,
      hijriMonth,
      1
    );

  let nextYear =
    Number(hijriYear);

  let nextMonth =
    Number(hijriMonth) + 1;

  if (
    nextMonth > 12
  ) {
    nextMonth = 1;
    nextYear += 1;
  }

  const nextStart =
    findGregorianForHijri(
      nextYear,
      nextMonth,
      1
    );

  const endDate =
    parseLocalDate(
      nextStart
    );

  endDate.setDate(
    endDate.getDate() - 1
  );

  const result = {
    start,

    end:
      getLocalDate(
        endDate
      ),
  };

  hijriCache.set(
    cacheKey,
    result
  );

  return result;
}

function formatHijriFullDate(
  value
) {
  if (!value) {
    return "—";
  }

  try {
    return displayDateFormatter(
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    ).format(
      parseLocalDate(
        value
      )
    );
  } catch {
    return value;
  }
}

function formatGregorianDate(
  value
) {
  if (!value) {
    return "—";
  }

  try {
    return displayDateFormatter(
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    ).format(
      parseLocalDate(
        value
      )
    );
  } catch {
    return value;
  }
}

/* =========================================================
   Current Hijri Month
========================================================= */

const CURRENT_HIJRI =
  getHijriParts(
    new Date()
  );

/* =========================================================
   اختيار أفضل سجل قديم/حديث
========================================================= */

function selectExistingProgress({
  rows,
  studentId,
  period,
  hijriYear,
  hijriMonth,
}) {
  const studentRows =
    (rows || [])
      .filter(
        (row) =>
          Number(
            row.student_id
          ) ===
          Number(
            studentId
          )
      )
      .sort(
        (a, b) =>
          Number(
            b.id || 0
          ) -
          Number(
            a.id || 0
          )
      );

  if (
    studentRows.length ===
    0
  ) {
    return null;
  }

  /*
    النسخة الجديدة:
    progress_month =
    التاريخ لبداية
    الشهر الهجري.
  */

  const exact =
    studentRows.find(
      (row) =>
        row.progress_month ===
        period.start
    );

  if (exact) {
    return exact;
  }

  /*
    لو سبق حفظ hijri_year/month
    ولكن progress_month مختلف.
  */

  const byHijri =
    studentRows.find(
      (row) =>
        Number(
          row.hijri_year
        ) ===
          Number(
            hijriYear
          ) &&
        Number(
          row.hijri_month
        ) ===
          Number(
            hijriMonth
          )
    );

  if (byHijri) {
    return byHijri;
  }

  /*
    دعم النظام القديم:
    كان يحفظ 1448-03-01
    كأنه تاريخ ميلادي.
  */

  const oldKey =
    `${hijriYear}-${pad2(
      hijriMonth
    )}-01`;

  return (
    studentRows.find(
      (row) =>
        row.progress_month ===
        oldKey
    ) ||
    null
  );
}


/* =========================================================
   Smart Monthly Analysis
========================================================= */

function calculateAchievementPercent(done, target) {
  const goal = Number(target || 0);
  if (goal <= 0) return null;
  return Math.round((Number(done || 0) / goal) * 100);
}

function buildSmartDelayAnalysis({
  attendanceRows = [],
  recitationRows = [],
  nooraniaRows = [],
  plannedSessions = 0,
  finalMem = 0,
  finalRev = 0,
  memTarget = 0,
  revTarget = 0,
}) {
  const absent = attendanceRows.filter((item) => item.status === "absent").length;
  const excused = attendanceRows.filter((item) => item.status === "excused").length;
  const late = attendanceRows.filter((item) => item.status === "late").length;
  const missed = absent + excused;

  const quranRepeats = recitationRows.reduce((sum, item) => {
    return sum + (item.lesson_evaluation === "إعادة" ? 1 : 0) + (item.review_evaluation === "إعادة" ? 1 : 0);
  }, 0);

  const nooraniaRepeats = nooraniaRows.reduce((sum, item) => {
    return (
      sum +
      (item.lesson_evaluation === "إعادة" ? 1 : 0) +
      (item.side_lesson_evaluation === "إعادة" ? 1 : 0) +
      (item.revision_evaluation === "إعادة" ? 1 : 0)
    );
  }, 0);

  const repeats = quranRepeats + nooraniaRepeats;
  const sessions = new Set([
    ...recitationRows.map((item) => `q-${item.id}`),
    ...nooraniaRows.map((item) => `n-${item.id}`),
  ]).size;

  const reasons = [];

  if (missed >= 3 || (plannedSessions >= 4 && missed / plannedSessions >= 0.25)) {
    reasons.push("غياب متكرر");
  }

  if (repeats >= 3 || (sessions >= 4 && repeats / sessions >= 0.3)) {
    reasons.push("تكرار الإعادة في التسميع");
  }

  if (plannedSessions > 0 && sessions === 0) {
    reasons.push("انقطاع عن التسميع");
  } else if (plannedSessions >= 5 && sessions < plannedSessions * 0.6) {
    reasons.push("قلة جلسات التسميع");
  }

  if (Number(memTarget || 0) > 0 && Number(finalMem || 0) < Number(memTarget) * 0.75) {
    reasons.push("انخفاض إنجاز الحفظ عن الخطة");
  }

  if (Number(revTarget || 0) > 0 && Number(finalRev || 0) < Number(revTarget) * 0.75) {
    reasons.push("انخفاض إنجاز المراجعة عن الخطة");
  }

  if (late >= 3) reasons.push("تأخر متكرر في الحضور");

  return {
    reason: reasons.length ? reasons.slice(0, 3).join(" • ") : "لا يوجد تعثر ظاهر",
    hasDelay: reasons.length > 0,
    absent,
    excused,
    missed,
    late,
    repeats,
    sessions,
    reasons,
  };
}

function getOverallCompletion(row) {
  const planned = [];
  if (Number(row.memorization_target_faces || 0) > 0) planned.push(Boolean(row.memorization_completed));
  if (Number(row.revision_target_faces || 0) > 0) planned.push(Boolean(row.revision_completed));
  if (!planned.length) return null;
  return planned.every(Boolean);
}

/* =========================================================
   PAGE
========================================================= */

export default function MonthlyAchievement() {
  /* =====================================================
     Teacher / Scope
  ===================================================== */

  const [
    teacher,
    setTeacher,
  ] = useState(null);

  const [
    halaqat,
    setHalaqat,
  ] = useState([]);

  /* =====================================================
     Monthly Data
  ===================================================== */

  const [
    rows,
    setRows,
  ] = useState([]);

  const [
    rawRecitations,
    setRawRecitations,
  ] = useState([]);

  /* =====================================================
     Filters
  ===================================================== */

  const [
    selectedHalaqa,
    setSelectedHalaqa,
  ] = useState("");

  const [
    hijriYear,
    setHijriYear,
  ] = useState(
    CURRENT_HIJRI.year
  );

  const [
    hijriMonth,
    setHijriMonth,
  ] = useState(
    CURRENT_HIJRI.month
  );

  const [
    search,
    setSearch,
  ] = useState("");

  /* =====================================================
     UI
  ===================================================== */

  const [
    initialLoading,
    setInitialLoading,
  ] = useState(true);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    approving,
    setApproving,
  ] = useState(false);

  const [
    detailStudent,
    setDetailStudent,
  ] = useState(null);

  /* =====================================================
     Period
  ===================================================== */

  const period =
    useMemo(() => {
      try {
        return getHijriMonthRange(
          hijriYear,
          hijriMonth
        );
      } catch (
        error
      ) {
        console.error(
          "HIJRI PERIOD:",
          error
        );

        return null;
      }
    }, [
      hijriYear,
      hijriMonth,
    ]);

  /* =====================================================
     Dirty
  ===================================================== */

  const hasUnsavedChanges =
    useMemo(
      () =>
        rows.some(
          (row) =>
            row.dirty
        ),
      [rows]
    );

  useEffect(() => {
    if (
      !hasUnsavedChanges
    ) {
      return;
    }

    const handler =
      (event) => {
        event.preventDefault();

        event.returnValue =
          "";
      };

    window.addEventListener(
      "beforeunload",
      handler
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handler
      );
    };
  }, [
    hasUnsavedChanges,
  ]);

  function confirmLoseChanges() {
    if (
      !hasUnsavedChanges
    ) {
      return true;
    }

    return window.confirm(
      "لديك تعديلات غير محفوظة.\n\nهل تريد الانتقال بدون حفظها؟"
    );
  }

  /* =====================================================
     Initial
  ===================================================== */

  useEffect(() => {
    loadTeacherScope();
  }, []);

  useEffect(() => {
    if (
      selectedHalaqa &&
      period
    ) {
      loadMonthlyData();
    }
  }, [
    selectedHalaqa,
    hijriYear,
    hijriMonth,
  ]);

  /* =====================================================
     Load Teacher Scope
  ===================================================== */

  async function loadTeacherScope() {
    setInitialLoading(true);

    try {
      /*
        نسخة الإدارة:
        لا نقيد الصفحة بحلقات المستخدم الحالي.
        نجلب الحلقات والمساجد ثم نحدد المعلم الرئيسي
        للحلقة المختارة في useEffect مستقل.
      */
      const { data: halaqatRows, error: halaqatError } =
        await supabase
          .from("halaqat")
          .select(`
            id,
            name,
            mosque_id,
            halaqa_period,
            status
          `)
          .order("name", { ascending: true });

      if (halaqatError) throw halaqatError;

      const mosqueIds = [
        ...new Set(
          (halaqatRows || [])
            .map((halaqa) => halaqa.mosque_id)
            .filter(Boolean)
            .map(Number)
        ),
      ];

      let mosques = [];

      if (mosqueIds.length > 0) {
        const { data, error } =
          await supabase
            .from("mosques")
            .select("id,name")
            .in("id", mosqueIds);

        if (error) throw error;
        mosques = data || [];
      }

      const mosqueMap = new Map(
        mosques.map((mosque) => [Number(mosque.id), mosque.name])
      );

      const prepared = (halaqatRows || []).map((halaqa) => ({
        ...halaqa,
        mosque_name:
          mosqueMap.get(Number(halaqa.mosque_id)) || "مسجد غير محدد",
      }));

      setHalaqat(prepared);

      if (prepared.length > 0) {
        setSelectedHalaqa(String(prepared[0].id));
      } else {
        setSelectedHalaqa("");
        setRows([]);
      }
    } catch (error) {
      console.error("LOAD ADMIN MONTHLY SCOPE:", error);

      showToast(
        error.message || "تعذر تحميل نطاق الإنجاز الشهري",
        "error"
      );
    } finally {
      setInitialLoading(false);
    }
  }

  /*
    الإدارة تعتمد المعلم الرئيسي المرتبط بالحَلَقة
    حتى تبقى عمليات الحفظ والاعتماد متوافقة
    مع بنية monthly_progress الحالية.
  */
  useEffect(() => {
    let cancelled = false;

    async function loadSelectedHalaqaTeacher() {
      if (!selectedHalaqa) {
        if (!cancelled) setTeacher(null);
        return;
      }

      try {
        const { data: link, error: linkError } =
          await supabase
            .from("teacher_halaqat")
            .select("teacher_id")
            .eq("halaqa_id", Number(selectedHalaqa))
            .eq("role", "main")
            .maybeSingle();

        if (linkError) throw linkError;

        if (!link?.teacher_id) {
          if (!cancelled) setTeacher(null);
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("id,full_name,user_number")
            .eq("id", link.teacher_id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (!cancelled) setTeacher(profile || null);
      } catch (error) {
        console.error("LOAD HALAQA TEACHER:", error);
        if (!cancelled) setTeacher(null);
      }
    }

    loadSelectedHalaqaTeacher();

    return () => {
      cancelled = true;
    };
  }, [selectedHalaqa]);

  /* =====================================================
     Load Monthly Data
  ===================================================== */

  async function loadMonthlyData() {
    if (
      !selectedHalaqa ||
      !period
    ) {
      return;
    }

    setLoading(true);

    try {
      /* -----------------------------------------
         الطلاب الذين كانوا في الحلقة
         خلال الشهر.

         لا نعتمد is_current فقط،
         حتى تعمل التقارير التاريخية.
      ----------------------------------------- */

      const {
        data:
          assignments,
        error:
          assignmentsError,
      } =
        await supabase
          .from(
            "student_halaqat"
          )
          .select(`
            id,
            student_id,
            halaqa_id,
            start_date,
            end_date,
            is_current
          `)
          .eq(
            "halaqa_id",
            Number(
              selectedHalaqa
            )
          )
          .lte(
            "start_date",
            period.end
          )
          .or(
            `end_date.is.null,end_date.gte.${period.start}`
          );

      if (
        assignmentsError
      ) {
        throw assignmentsError;
      }

      const studentIds = [
        ...new Set(
          (
            assignments ||
            []
          ).map(
            (item) =>
              Number(
                item.student_id
              )
          )
        ),
      ];

      if (
        studentIds.length ===
        0
      ) {
        setRows([]);
        setRawRecitations([]);

        return;
      }

      /* -----------------------------------------
         Profiles
      ----------------------------------------- */

      const {
        data:
          profiles,
        error:
          profilesError,
      } =
        await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            user_number,
            status,
            learning_goal
          `)
          .in(
            "id",
            studentIds
          )
          .eq(
            "role",
            "student"
          );

      if (
        profilesError
      ) {
        throw profilesError;
      }

      /* -----------------------------------------
         Existing monthly_progress

         نجلب جميع سجلات هؤلاء الطلاب
         لهذه الحلقة، ثم نختار السجل
         الأنسب في JavaScript.

         هذا يدعم:
         - النظام الجديد
         - hijri_year/month
         - سجلات النظام القديمة
      ----------------------------------------- */

      const {
        data:
          allExistingProgress,
        error:
          progressError,
      } =
        await supabase
          .from(
            "monthly_progress"
          )
          .select("*")
          .eq(
            "halaqa_id",
            Number(
              selectedHalaqa
            )
          )
          .in(
            "student_id",
            studentIds
          )
          .order(
            "id",
            {
              ascending:
                false,
            }
          );

      if (
        progressError
      ) {
        throw progressError;
      }

      /* -----------------------------------------
         Monthly plans + Attendance + Noorania
      ----------------------------------------- */

      const [plansResult, attendanceResult, nooraniaResult] = await Promise.all([
        supabase
          .from("monthly_plans")
          .select(`
            id, student_id, plan_month, hijri_year, hijri_month,
            memorization_target_faces, revision_target_faces,
            memorization_daily_amount, memorization_daily_unit,
            revision_daily_amount, revision_daily_unit,
            planned_sessions, recitation_days_snapshot
          `)
          .eq("halaqa_id", Number(selectedHalaqa))
          .eq("plan_month", period.start)
          .in("student_id", studentIds),

        supabase
          .from("attendance")
          .select("student_id, attendance_date, status")
          .eq("halaqa_id", Number(selectedHalaqa))
          .in("student_id", studentIds)
          .gte("attendance_date", period.start)
          .lte("attendance_date", period.end),

        supabase
          .from("noorania_recitations")
          .select(`
            id, student_id, recitation_date,
            lesson_evaluation, side_lesson_evaluation, revision_evaluation
          `)
          .eq("halaqa_id", Number(selectedHalaqa))
          .in("student_id", studentIds)
          .gte("recitation_date", period.start)
          .lte("recitation_date", period.end),
      ]);

      if (plansResult.error) throw plansResult.error;
      if (attendanceResult.error) throw attendanceResult.error;
      if (nooraniaResult.error) throw nooraniaResult.error;

      const effectivePlans = await effectiveMonthlyPlans(plansResult.data || [], selectedHalaqa, period);
      const planMap = new Map(effectivePlans.map((item) => [Number(item.student_id), item]));
      const attendanceRows = attendanceResult.data || [];
      const nooraniaRows = nooraniaResult.data || [];

      /* -----------------------------------------
         Recitations
      ----------------------------------------- */

      const {
        data:
          recitations,
        error:
          recitationsError,
      } =
        await supabase
          .from("recitations")
          .select(`
            id,
            student_id,
            halaqa_id,
            teacher_id,
            recitation_date,

            from_surah,
            from_ayah,
            to_surah,
            to_ayah,

            lesson_evaluation,
            lesson_amount_type,
            lesson_faces,
            lesson_faces_manual,
            lesson_amount_value,
            lesson_amount_unit,

            review_surah,
            review_from_ayah,
            review_to_surah,
            review_to_ayah,

            review_evaluation,
            review_faces,

            notes
          `)
          .eq(
            "halaqa_id",
            Number(
              selectedHalaqa
            )
          )
          .in(
            "student_id",
            studentIds
          )
          .gte(
            "recitation_date",
            period.start
          )
          .lte(
            "recitation_date",
            period.end
          )
          .order(
            "recitation_date",
            {
              ascending:
                true,
            }
          )
          .order(
            "id",
            {
              ascending:
                true,
            }
          );

      if (
        recitationsError
      ) {
        throw recitationsError;
      }

      const measuredRecitations=await withSideLessonMetrics(supabase,recitations || []);
      const sideTotals=await monthlySideLessonTotals(supabase,selectedHalaqa,studentIds,period);
      setRawRecitations(measuredRecitations);

      /* -----------------------------------------
         Aggregate
      ----------------------------------------- */

      const aggregate =
        new Map();

      (
        recitations || []
      ).forEach(
        (record) => {
          const studentId =
            Number(
              record.student_id
            );

          const old =
            aggregate.get(
              studentId
            ) || {
              memorization: 0,
              revision: 0,
              sessions: 0,
              lessonSessions: 0,
              revisionSessions: 0,
              lastDate: null,
            };

          const lesson =
            getAcceptedLessonFaces(record);

          const revision =
            getAcceptedReviewFaces(record);

          old.sessions += 1;

          old.memorization +=
            lesson;

          old.revision +=
            revision;

          if (
            lesson > 0
          ) {
            old.lessonSessions +=
              1;
          }

          if (
            revision > 0
          ) {
            old.revisionSessions +=
              1;
          }

          if (
            !old.lastDate ||
            record.recitation_date >
              old.lastDate
          ) {
            old.lastDate =
              record.recitation_date;
          }

          aggregate.set(
            studentId,
            old
          );
        }
      );

      /* -----------------------------------------
         Build Rows
      ----------------------------------------- */

      const result =
        (
          profiles || []
        )
          .map(
            (profile) => {
              const studentId =
                Number(
                  profile.id
                );

              const auto =
                aggregate.get(
                  studentId
                ) || {
                  memorization: 0,
                  revision: 0,
                  sessions: 0,
                  lessonSessions: 0,
                  revisionSessions: 0,
                  lastDate: null,
                };

              const existing =
                selectExistingProgress({
                  rows:
                    allExistingProgress,

                  studentId,

                  period,

                  hijriYear,

                  hijriMonth,
                });

              const autoMem =
                roundFaces(
                  auto.memorization
                );

              const autoRev =
                roundFaces(
                  auto.revision
                );

              const manualMem =
                roundFaces(
                  existing
                    ?.manual_memorization_faces ||
                    0
                );

              const manualRev =
                roundFaces(
                  existing
                    ?.manual_revision_faces ||
                    0
                );

              const finalMem =
                roundFaces(
                  autoMem +
                    manualMem
                );

              const finalRev =
                roundFaces(
                  autoRev +
                    manualRev
                );

              const monthlyPlan = planMap.get(studentId) || null;
              const memTarget = roundFaces(monthlyPlan?.memorization_target_faces || 0);
              const revTarget = roundFaces(monthlyPlan?.revision_target_faces || 0);
              const plannedSessions = Number(monthlyPlan?.planned_sessions || 0);

              const studentAttendance = attendanceRows.filter(
                (item) => Number(item.student_id) === studentId
              );
              const studentRecitations = (recitations || []).filter(
                (item) => Number(item.student_id) === studentId
              );
              const studentNoorania = nooraniaRows.filter(
                (item) => Number(item.student_id) === studentId
              );

              const smartAnalysis = buildSmartDelayAnalysis({
                attendanceRows: studentAttendance,
                recitationRows: studentRecitations,
                nooraniaRows: studentNoorania,
                plannedSessions,
                finalMem,
                finalRev,
                memTarget,
                revTarget,
              });

              const memCompleted = memTarget > 0 ? finalMem >= memTarget : false;
              const revCompleted = revTarget > 0 ? finalRev >= revTarget : false;

              /*
                لو الاعتماد موجود
                لكن أرقام التسميع
                تغيرت بعده،
                نعتبر المصدر متغيرًا.
              */

              const sourceChanged =
                Boolean(
                  existing &&
                  (
                    roundFaces(
                      existing
                        .auto_memorization_faces ||
                        0
                    ) !==
                      autoMem ||

                    roundFaces(
                      existing
                        .auto_revision_faces ||
                        0
                    ) !==
                      autoRev ||

                    Number(
                      existing
                        .source_recitations_count ||
                        0
                    ) !==
                      Number(
                        auto.sessions
                      )
                  )
                );

              return {
                side_lesson_faces: Number(sideTotals.get(studentId) || 0),
                side_lesson_lines_per_face: sideTotals.linesPerFace.get(studentId) ?? 15,
                id:
                  studentId,

                progress_id:
                  existing?.id ||
                  null,

                old_progress_month:
                  existing
                    ?.progress_month ||
                  null,

                student_id:
                  studentId,

                student_name:
                  profile.full_name ||
                  "طالب",

                user_number:
                  profile.user_number ||
                  "",

                learning_goal:
                  profile.learning_goal ||
                  "",

                auto_memorization_faces:
                  autoMem,

                manual_memorization_faces:
                  manualMem,

                manual_memorization_reason:
                  existing
                    ?.manual_memorization_reason ||
                  "",

                final_memorization_faces:
                  finalMem,

                auto_revision_faces:
                  autoRev,

                manual_revision_faces:
                  manualRev,

                manual_revision_reason:
                  existing
                    ?.manual_revision_reason ||
                  "",

                final_revision_faces:
                  finalRev,

                source_recitations_count:
                  Number(
                    auto.sessions
                  ),

                lesson_sessions:
                  Number(
                    auto.lessonSessions
                  ),

                revision_sessions:
                  Number(
                    auto.revisionSessions
                  ),

                last_recitation_date:
                  auto.lastDate,

                notes:
                  existing?.notes ||
                  "",

                memorization_target_faces: memTarget,
                revision_target_faces: revTarget,
                planned_sessions: plannedSessions,
                recitation_days_snapshot: monthlyPlan?.recitation_days_snapshot || [],
                memorization_daily_amount: monthlyPlan?.memorization_daily_amount || 0,
                memorization_daily_unit: monthlyPlan?.memorization_daily_unit || "lines",
                revision_daily_amount: monthlyPlan?.revision_daily_amount || 0,
                revision_daily_unit: monthlyPlan?.revision_daily_unit || "faces",

                delay_reason: smartAnalysis.reason,
                smart_delay: smartAnalysis,
                smart_total_sessions: smartAnalysis.sessions,

                memorization_completed: memCompleted,
                revision_completed: revCompleted,
                memorization_percent: calculateAchievementPercent(finalMem, memTarget),
                revision_percent: calculateAchievementPercent(finalRev, revTarget),

                approved:
                  Boolean(
                    existing
                      ?.approved
                  ) &&
                  !sourceChanged,

                source_changed:
                  sourceChanged,

                legacy_record:
                  Boolean(
                    existing &&
                    existing.progress_month !==
                      period.start
                  ),

                dirty:
                  false,
              };
            }
          )
          .sort(
            (a, b) =>
              String(
                a.student_name
              ).localeCompare(
                String(
                  b.student_name
                ),
                "ar"
              )
          );

      setRows(
        result
      );

    } catch (error) {
      console.error(
        "LOAD MONTHLY DATA:",
        error
      );

      showToast(
        error.message ||
          "تعذر حساب الإنجاز الشهري",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     Update Row
  ===================================================== */

  function updateRow(
    studentId,
    field,
    value
  ) {
    setRows(
      (current) =>
        current.map(
          (row) => {
            if (
              Number(
                row.student_id
              ) !==
              Number(
                studentId
              )
            ) {
              return row;
            }

            const next = {
              ...row,

              [field]: value,

              /*
                أي تعديل من المعلم
                يلغي الاعتماد محليًا
                حتى يعاد الحفظ
                والاعتماد.
              */

              approved: false,

              dirty: true,
            };

            if (
              field ===
                "manual_memorization_faces" &&
              Number(
                value || 0
              ) <= 0
            ) {
              next.manual_memorization_reason =
                "";
            }

            if (
              field ===
                "manual_revision_faces" &&
              Number(
                value || 0
              ) <= 0
            ) {
              next.manual_revision_reason =
                "";
            }

            next.final_memorization_faces =
              roundFaces(
                Number(
                  next.auto_memorization_faces ||
                    0
                ) +
                  Number(
                    next.manual_memorization_faces ||
                      0
                  )
              );

            next.final_revision_faces =
              roundFaces(
                Number(
                  next.auto_revision_faces ||
                    0
                ) +
                  Number(
                    next.manual_revision_faces ||
                      0
                  )
              );

            next.memorization_completed =
              Number(next.memorization_target_faces || 0) > 0
                ? Number(next.final_memorization_faces || 0) >= Number(next.memorization_target_faces || 0)
                : false;

            next.revision_completed =
              Number(next.revision_target_faces || 0) > 0
                ? Number(next.final_revision_faces || 0) >= Number(next.revision_target_faces || 0)
                : false;

            next.memorization_percent = calculateAchievementPercent(
              next.final_memorization_faces,
              next.memorization_target_faces
            );
            next.revision_percent = calculateAchievementPercent(
              next.final_revision_faces,
              next.revision_target_faces
            );

            return next;
          }
        )
    );
  }

  /* =====================================================
     Validation
  ===================================================== */

  function validateRows() {
    for (
      const row of rows
    ) {
      const manualMem =
        Number(
          row.manual_memorization_faces ||
            0
        );

      const manualRev =
        Number(
          row.manual_revision_faces ||
            0
        );

      if (
        manualMem < 0 ||
        manualRev < 0
      ) {
        showToast(
          `لا يمكن إدخال عدد أوجه سالب للطالب ${row.student_name}`,
          "error"
        );

        return false;
      }

      if (
        manualMem > 0 &&
        !String(
          row.manual_memorization_reason ||
            ""
        ).trim()
      ) {
        showToast(
          `اكتب سبب إضافة أوجه الحفظ يدويًا للطالب ${row.student_name}`,
          "error"
        );

        return false;
      }

      if (
        manualRev > 0 &&
        !String(
          row.manual_revision_reason ||
            ""
        ).trim()
      ) {
        showToast(
          `اكتب سبب إضافة أوجه المراجعة يدويًا للطالب ${row.student_name}`,
          "error"
        );

        return false;
      }
    }

    return true;
  }

  /* =====================================================
     Payload
  ===================================================== */

  function buildPayload(
    row
  ) {
    const halaqa =
      halaqat.find(
        (item) =>
          Number(
            item.id
          ) ===
          Number(
            selectedHalaqa
          )
      );

    const finalMem =
      roundFaces(
        row.final_memorization_faces
      );

    const finalRev =
      roundFaces(
        row.final_revision_faces
      );

    return {
      student_id:
        Number(
          row.student_id
        ),

      halaqa_id:
        Number(
          selectedHalaqa
        ),

      /*
        موجود في الجدول القديم
        ونبقيه للتوافق.
      */

      mosque_id:
        halaqa?.mosque_id ||
        null,

      teacher_id:
        teacher?.id ||
        null,

      /*
        هذا ميلادي فعلي.
      */

      progress_month:
        period.start,

      hijri_year:
        Number(
          hijriYear
        ),

      hijri_month:
        Number(
          hijriMonth
        ),

      /* -------------------------------
         Automatic
      ------------------------------- */

      auto_memorization_faces:
        roundFaces(
          row.auto_memorization_faces
        ),

      auto_revision_faces:
        roundFaces(
          row.auto_revision_faces
        ),

      /* -------------------------------
         Manual
      ------------------------------- */

      manual_memorization_faces:
        roundFaces(
          row.manual_memorization_faces
        ),

      manual_revision_faces:
        roundFaces(
          row.manual_revision_faces
        ),

      manual_memorization_reason:
        String(
          row.manual_memorization_reason ||
            ""
        ).trim() ||
        null,

      manual_revision_reason:
        String(
          row.manual_revision_reason ||
            ""
        ).trim() ||
        null,

      /* -------------------------------
         Final
      ------------------------------- */

      final_memorization_faces:
        finalMem,

      final_revision_faces:
        finalRev,

      /*
        توافق مؤقت مع
        vw_monthly_progress_report.

        الأعمدة القديمة قد تكون integer،
        لذلك نخزن تقريبًا صحيحًا فيها.

        الدقة الحقيقية موجودة في:
        final_*_faces
      */

      memorization_pages:
        Math.round(
          finalMem
        ),

      revision_pages:
        Math.round(
          finalRev
        ),

      /* -------------------------------
         Source
      ------------------------------- */

      source_recitations_count:
        Number(
          row.source_recitations_count ||
            0
        ),

      calculated_at:
        new Date()
          .toISOString(),

      /* -------------------------------
         Legacy fields

         سنعيد بناء معناها لاحقًا
         عند إضافة الخطة الشهرية.
      ------------------------------- */

      memorization_completed:
        Boolean(
          row.memorization_completed
        ),

      revision_completed:
        Boolean(
          row.revision_completed
        ),

      delay_reason:
        String(
          row.delay_reason ||
            ""
        ).trim() ||
        null,

      notes:
        String(
          row.notes ||
            ""
        ).trim() ||
        null,

      approved:
        Boolean(
          row.approved
        ),
    };
  }

  /* =====================================================
     Persist
  ===================================================== */

  async function persistRows({
    silent = false,
    reload = true,
    controlLoading = true,
  } = {}) {
    if (
      rows.length === 0
    ) {
      if (!silent) {
        showToast(
          "لا توجد بيانات للحفظ",
          "error"
        );
      }

      return false;
    }

    if (
      !selectedHalaqa ||
      !teacher?.id ||
      !period
    ) {
      showToast(
        "الحلقة أو المعلم الرئيسي غير مكتمل الربط",
        "error"
      );

      return false;
    }

    if (
      !validateRows()
    ) {
      return false;
    }

    if (
      controlLoading
    ) {
      setSaving(true);
    }

    try {
      /*
        إذا كان السجل قديمًا،
        نحدثه بواسطة id
        ونحوّل progress_month
        إلى التاريخ الصحيح.

        إذا كان جديدًا نستخدم upsert.
      */

      await Promise.all(
        rows.map(
          async (row) => {
            const payload =
              buildPayload(
                row
              );

            if (
              row.progress_id
            ) {
              const {
                error,
              } =
                await supabase
                  .from(
                    "monthly_progress"
                  )
                  .update(
                    payload
                  )
                  .eq(
                    "id",
                    row.progress_id
                  );

              if (error) {
                throw error;
              }

              return;
            }

            const {
              error,
            } =
              await supabase
                .from(
                  "monthly_progress"
                )
                .upsert(
                  payload,
                  {
                    onConflict:
                      "student_id,halaqa_id,progress_month",
                  }
                );

            if (error) {
              throw error;
            }
          }
        )
      );

      if (!silent) {
        showToast(
          "تم حفظ الإنجاز الشهري بنجاح",
          "success"
        );
      }

      if (reload) {
        await loadMonthlyData();
      } else {
        setRows(
          (current) =>
            current.map(
              (row) => ({
                ...row,

                dirty:
                  false,

                source_changed:
                  false,

                legacy_record:
                  false,
              })
            )
        );
      }

      return true;

    } catch (error) {
      console.error(
        "SAVE MONTHLY:",
        error
      );

      showToast(
        error.message ||
          "تعذر حفظ الإنجاز الشهري",
        "error"
      );

      return false;
    } finally {
      if (
        controlLoading
      ) {
        setSaving(false);
      }
    }
  }

  async function saveAll() {
    await persistRows();
  }

  /* =====================================================
     Approve
  ===================================================== */

  async function approveAll() {
    if (
      rows.length === 0
    ) {
      showToast(
        "لا توجد بيانات للاعتماد",
        "error"
      );

      return;
    }

    if (
      !validateRows()
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `اعتماد إنجاز شهر ${
          HIJRI_MONTHS[
            hijriMonth - 1
          ]
        } ${hijriYear} هـ؟\n\nإذا تم تعديل التسميع لاحقًا سيظهر تنبيه بأن مصدر الإنجاز تغير ويحتاج إعادة اعتماد.`
      );

    if (!confirmed) {
      return;
    }

    setApproving(true);

    try {
      /*
        نحفظ أولًا.
      */

      const saved =
        await persistRows({
          silent: true,
          reload: false,
          controlLoading:
            false,
        });

      if (!saved) {
        return;
      }

      const studentIds =
        rows.map(
          (row) =>
            Number(
              row.student_id
            )
        );

      const {
        error,
      } =
        await supabase
          .from(
            "monthly_progress"
          )
          .update({
            approved: true,
          })
          .eq(
            "halaqa_id",
            Number(
              selectedHalaqa
            )
          )
          .eq(
            "progress_month",
            period.start
          )
          .in(
            "student_id",
            studentIds
          );

      if (error) {
        throw error;
      }

      showToast(
        "تم اعتماد الإنجاز الشهري",
        "success"
      );

      await loadMonthlyData();

    } catch (error) {
      console.error(
        "APPROVE MONTHLY:",
        error
      );

      showToast(
        error.message ||
          "تعذر اعتماد الإنجاز الشهري",
        "error"
      );
    } finally {
      setApproving(false);
    }
  }

  /* =====================================================
     Recalculate
  ===================================================== */

  async function recalculate() {
    if (
      hasUnsavedChanges
    ) {
      const confirmed =
        window.confirm(
          "سيتم إلغاء التعديلات غير المحفوظة وإعادة الحساب من سجلات التسميع.\n\nهل تريد المتابعة؟"
        );

      if (!confirmed) {
        return;
      }
    }

    await loadMonthlyData();

    showToast(
      "تم إعادة احتساب الإنجاز من التسميع",
      "success"
    );
  }

  /* =====================================================
     Filter Rows
  ===================================================== */

  const filteredRows =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLowerCase();

      if (!text) {
        return rows;
      }

      return rows.filter(
        (row) =>
          String(
            row.student_name ||
              ""
          )
            .toLowerCase()
            .includes(text) ||
          String(
            row.user_number ||
              ""
          )
            .toLowerCase()
            .includes(text)
      );
    }, [
      rows,
      search,
    ]);

  /* =====================================================
     Stats
  ===================================================== */

  const stats =
    useMemo(() => {
      const totalStudents =
        rows.length;

      const autoMem =
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            Number(
              row.auto_memorization_faces ||
                0
            ),
          0
        );

      const manualMem =
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            Number(
              row.manual_memorization_faces ||
                0
            ),
          0
        );

      const finalMem =
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            Number(
              row.final_memorization_faces ||
                0
            ),
          0
        );

      const autoRev =
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            Number(
              row.auto_revision_faces ||
                0
            ),
          0
        );

      const manualRev =
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            Number(
              row.manual_revision_faces ||
                0
            ),
          0
        );

      const finalRev =
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            Number(
              row.final_revision_faces ||
                0
            ),
          0
        );

      const sessions =
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            Number(
              row.source_recitations_count ||
                0
            ),
          0
        );

      const approved =
        rows.filter(
          (row) =>
            row.approved
        ).length;

      const active =
        rows.filter(
          (row) =>
            Number(
              row.final_memorization_faces
            ) >
              0 ||
            Number(
              row.final_revision_faces
            ) >
              0 || Number(row.side_lesson_faces || 0) > 0
        ).length;

      const manualStudents =
        rows.filter(
          (row) =>
            Number(
              row.manual_memorization_faces
            ) >
              0 ||
            Number(
              row.manual_revision_faces
            ) >
              0
        ).length;

      return {
        totalStudents,

        autoMem:
          roundFaces(
            autoMem
          ),

        manualMem:
          roundFaces(
            manualMem
          ),

        finalMem:
          roundFaces(
            finalMem
          ),

        autoRev:
          roundFaces(
            autoRev
          ),

        manualRev:
          roundFaces(
            manualRev
          ),

        finalRev:
          roundFaces(
            finalRev
          ),

        sessions,

        approved,

        active,

        manualStudents,
      };
    }, [rows]);

  /* =====================================================
     Details
  ===================================================== */

  const detailRecords =
    useMemo(() => {
      if (
        !detailStudent
      ) {
        return [];
      }

      return rawRecitations.filter(
        (record) =>
          Number(
            record.student_id
          ) ===
          Number(
            detailStudent.student_id
          )
      );
    }, [
      rawRecitations,
      detailStudent,
    ]);

  /* =====================================================
     Halaqa
  ===================================================== */

  const selectedHalaqaData =
    useMemo(
      () =>
        halaqat.find(
          (halaqa) =>
            Number(
              halaqa.id
            ) ===
            Number(
              selectedHalaqa
            )
        ),
      [
        halaqat,
        selectedHalaqa,
      ]
    );

  /* =====================================================
     Period Navigation
  ===================================================== */

  function applyPeriod(
    year,
    month
  ) {
    if (
      !confirmLoseChanges()
    ) {
      return;
    }

    const requestedIndex =
      Number(year) *
        12 +
      Number(month);

    const currentIndex =
      CURRENT_HIJRI.year *
        12 +
      CURRENT_HIJRI.month;

    if (
      requestedIndex >
      currentIndex
    ) {
      showToast(
        "لا يمكن اختيار شهر مستقبلي",
        "info"
      );

      return;
    }

    setHijriYear(
      Number(year)
    );

    setHijriMonth(
      Number(month)
    );

    setSearch("");
  }

  function moveHijriMonth(
    amount
  ) {
    let year =
      Number(
        hijriYear
      );

    let month =
      Number(
        hijriMonth
      ) + amount;

    if (
      month > 12
    ) {
      month = 1;
      year += 1;
    }

    if (
      month < 1
    ) {
      month = 12;
      year -= 1;
    }

    applyPeriod(
      year,
      month
    );
  }

  function goCurrentMonth() {
    applyPeriod(
      CURRENT_HIJRI.year,
      CURRENT_HIJRI.month
    );
  }

  const isCurrentMonth =
    Number(
      hijriYear
    ) ===
      CURRENT_HIJRI.year &&
    Number(
      hijriMonth
    ) ===
      CURRENT_HIJRI.month;

  /* =====================================================
     Halaqa Change
  ===================================================== */

  function changeHalaqa(
    value
  ) {
    if (
      !confirmLoseChanges()
    ) {
      return;
    }

    setSelectedHalaqa(
      value
    );

    setSearch("");
  }

  /* =====================================================
     Excel
  ===================================================== */

  async function exportExcel() {
    if (rows.length === 0) {
      showToast("لا توجد بيانات للتصدير", "error");
      return;
    }

    try {
      const XLSX = await import("xlsx");
    const selectedHalaqaData = halaqat.find(
      (item) => Number(item.id) === Number(selectedHalaqa)
    );

    const titleRows = [
      ["تقرير الإنجاز الشهري — نظام الصديق"],
      [`${HIJRI_MONTHS[hijriMonth - 1]} ${hijriYear} هـ`],
      [
        `الحلقة: ${selectedHalaqaData?.name || "-"}`,
        `المسجد: ${selectedHalaqaData?.mosque_name || "-"}`,
        `المعلم: ${teacher?.full_name || "-"}`,
      ],
      [],
    ];

    const headers = [
      "م",
      "الطالب",
      "رقم الطالب",
      "هدف الحفظ",
      "إنجاز الحفظ",
      "حالة الحفظ",
      "جنب الدرس",
      "هدف المراجعة",
      "إنجاز المراجعة",
      "حالة المراجعة",
      "الحالة الشهرية",
      "سبب التعثر الذكي",
      "الغياب",
      "الغياب بعذر",
      "الإعادات",
      "جلسات التسميع",
      "ملاحظات",
      "الاعتماد",
    ];

    const body = rows.map((row, index) => {
      const overall = getOverallCompletion(row);
      return [
        index + 1,
        row.student_name,
        row.user_number || "",
        formatFaces(row.memorization_target_faces),
        formatFaces(row.final_memorization_faces),
        Number(row.memorization_target_faces || 0) <= 0
          ? "لا توجد خطة"
          : row.memorization_completed
            ? "منجز"
            : "غير منجز",
        formatSideLessonTotal(row.side_lesson_faces, row.side_lesson_lines_per_face),
        formatFaces(row.revision_target_faces),
        formatFaces(row.final_revision_faces),
        Number(row.revision_target_faces || 0) <= 0
          ? "لا توجد خطة"
          : row.revision_completed
            ? "منجز"
            : "غير منجز",
        overall === null ? "لا توجد خطة" : overall ? "منجز" : "غير منجز",
        row.delay_reason || "لا يوجد تعثر ظاهر",
        Number(row.smart_delay?.absent || 0),
        Number(row.smart_delay?.excused || 0),
        Number(row.smart_delay?.repeats || 0),
        Number(row.smart_total_sessions ?? row.source_recitations_count ?? 0),
        row.notes || "",
        row.approved ? "معتمد" : "غير معتمد",
      ];
    });

    const footerRows = [
      [],
      ["بالقرآن نرتقي، وبالمتابعة نصنع أثرًا يبقى."],
      ["الصديق • تقرير الإنجاز الشهري"],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([
      ...titleRows,
      headers,
      ...body,
      ...footerRows,
    ]);

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      { s: { r: 5 + body.length, c: 0 }, e: { r: 5 + body.length, c: headers.length - 1 } },
      { s: { r: 6 + body.length, c: 0 }, e: { r: 6 + body.length, c: headers.length - 1 } },
    ];

    worksheet["!cols"] = [
      { wch: 6 }, { wch: 25 }, { wch: 16 }, { wch: 13 }, { wch: 14 }, { wch: 14 },
      { wch: 13 }, { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 32 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 13 }, { wch: 30 }, { wch: 13 },
    ];
    worksheet["!views"] = [{ rightToLeft: true }];

    const summary = XLSX.utils.aoa_to_sheet([
      ["ملخص الإنجاز الشهري"],
      ["الشهر", `${HIJRI_MONTHS[hijriMonth - 1]} ${hijriYear} هـ`],
      ["عدد الطلاب", rows.length],
      ["المنجزون", rows.filter((row) => getOverallCompletion(row) === true).length],
      ["غير المنجزين", rows.filter((row) => getOverallCompletion(row) === false).length],
      ["حالات التعثر", rows.filter((row) => row.smart_delay?.hasDelay).length],
      ["إجمالي حفظ منجز", formatFaces(rows.reduce((sum, row) => sum + Number(row.final_memorization_faces || 0), 0))],
      ["إجمالي مراجعة منجزة", formatFaces(rows.reduce((sum, row) => sum + Number(row.final_revision_faces || 0), 0))],
    ]);
    summary["!cols"] = [{ wch: 24 }, { wch: 26 }];
    summary["!views"] = [{ rightToLeft: true }];

    const workbook = XLSX.utils.book_new();
    workbook.Props = {
      Title: "تقرير الإنجاز الشهري",
      Subject: "نظام الصديق لإدارة الحلقات",
      Author: "الصديق",
    };
    XLSX.utils.book_append_sheet(workbook, worksheet, "الإنجاز الشهري");
    XLSX.utils.book_append_sheet(workbook, summary, "الملخص");

    XLSX.writeFile(workbook, `الإنجاز-الشهري-${hijriYear}-${pad2(hijriMonth)}.xlsx`);
    showToast("تم إنشاء ملف Excel الاحترافي", "success");
    } catch (error) {
      console.error("Excel export failed:", error);
      showToast("تعذر تصدير Excel. أعد المحاولة.", "error");
    }
  }

  /* =====================================================
     Print
  ===================================================== */

  function openProfessionalReport(mode = "print") {
    if (rows.length === 0 || !period) {
      showToast("لا توجد بيانات للتقرير", "error");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("تعذر فتح نافذة التقرير", "error");
      return;
    }

    try {
      printWindow.opener = null;
    } catch {
      // Browser-level opener isolation is best-effort only.
    }

    const origin = window.location.origin;
    const selectedHalaqaData = halaqat.find(
      (item) => Number(item.id) === Number(selectedHalaqa)
    );

    const completedCount = rows.filter((row) => getOverallCompletion(row) === true).length;
    const delayedCount = rows.filter((row) => row.smart_delay?.hasDelay).length;
    const achievementRate = rows.length
      ? Math.round((completedCount / rows.length) * 100)
      : 0;

    const rowsHtml = rows.map((row, index) => {
      const overall = getOverallCompletion(row);
      const memStatus = Number(row.memorization_target_faces || 0) <= 0
        ? "غير مخطط"
        : row.memorization_completed ? "منجز" : "غير منجز";
      const revStatus = Number(row.revision_target_faces || 0) <= 0
        ? "غير مخطط"
        : row.revision_completed ? "منجز" : "غير منجز";

      return `
        <tr>
          <td>${index + 1}</td>
          <td class="student-name">${escapeHtml(row.student_name)}</td>
          <td>${escapeHtml(row.user_number || "-")}</td>
          <td>${formatFaces(row.final_memorization_faces)} / ${formatFaces(row.memorization_target_faces)}</td>
          <td><span class="status ${memStatus === "منجز" ? "ok" : memStatus === "غير منجز" ? "bad" : "muted"}">${memStatus}</span></td>
          <td>${formatSideLessonTotal(row.side_lesson_faces, row.side_lesson_lines_per_face)}</td>
          <td>${formatFaces(row.final_revision_faces)} / ${formatFaces(row.revision_target_faces)}</td>
          <td><span class="status ${revStatus === "منجز" ? "ok" : revStatus === "غير منجز" ? "bad" : "muted"}">${revStatus}</span></td>
          <td><span class="status ${overall === true ? "ok" : overall === false ? "bad" : "muted"}">${overall === null ? "لا توجد خطة" : overall ? "منجز" : "غير منجز"}</span></td>
          <td class="reason">${escapeHtml(row.delay_reason || "لا يوجد تعثر ظاهر")}</td>
          <td>${row.smart_total_sessions ?? row.source_recitations_count ?? 0}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${mode === "pdf" ? "PDF" : "طباعة"} — تقرير الإنجاز الشهري</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Tahoma, Arial, sans-serif;
            color: #17382f;
            background: #f3f6f4;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page {
            position: relative;
            min-height: 185mm;
            overflow: hidden;
            padding: 18px 20px 16px;
            border: 1px solid #dce7e2;
            background: #fff;
          }
          .corner { position: absolute; width: 108px; opacity: .10; pointer-events: none; }
          .corner.r { top: -12px; right: -8px; }
          .corner.l { top: -12px; left: -8px; transform: scaleX(-1); }
          .corner.br { bottom: -22px; right: -12px; transform: scaleY(-1); opacity: .055; }
          .corner.bl { bottom: -22px; left: -12px; transform: scale(-1); opacity: .055; }
          .watermark {
            position: absolute;
            width: 360px;
            left: 50%;
            top: 54%;
            transform: translate(-50%, -50%);
            opacity: .025;
            pointer-events: none;
          }
          .report { position: relative; z-index: 2; }
          .top-line { height: 4px; border-radius: 999px; background: linear-gradient(90deg,#0f4c45,#d1b34c,#0f4c45); }
          .header {
            display: grid;
            grid-template-columns: 70px 1fr 170px;
            gap: 14px;
            align-items: center;
            padding: 15px 4px 12px;
            border-bottom: 1px solid #e4ebe8;
          }
          .header-logo {
            width: 54px; height: 54px; object-fit: contain; padding: 6px;
            border: 1px solid #dce7e2; border-radius: 15px; background: #fff;
          }
          .title h1 { margin: 0; color: #0d4239; font-size: 23px; }
          .title p { margin: 5px 0 0; color: #7a8c85; font-size: 10px; }
          .month-box {
            padding: 10px; border: 1px solid #e7d9a7; border-radius: 13px;
            background: #fffaf0; text-align: center;
          }
          .month-box span { display:block; color:#9c7b20; font-size:9px; }
          .month-box strong { display:block; margin-top:4px; color:#624d16; font-size:13px; }
          .meta {
            display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; margin: 11px 0;
          }
          .meta div, .stat {
            padding: 8px 9px; border: 1px solid #e2e9e6; border-radius: 10px; background: #fafcfb;
          }
          .meta span, .stat span { display:block; color:#84958e; font-size:8px; }
          .meta strong { display:block; margin-top:3px; color:#294940; font-size:10px; }
          .stats { display:grid; grid-template-columns:repeat(5,1fr); gap:7px; margin-bottom:11px; }
          .stat { text-align:center; }
          .stat strong { display:block; color:#0f4c45; font-size:17px; }
          table { width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; border:1px solid #dce6e2; border-radius:11px; }
          th { padding:7px 5px; background:#0f4c45; color:#fff; font-size:8px; font-weight:800; }
          td { padding:6px 5px; border-bottom:1px solid #e7ecea; border-left:1px solid #edf1ef; text-align:center; font-size:7.6px; }
          tbody tr:nth-child(even) td { background:#f9fbfa; }
          tbody tr:last-child td { border-bottom:0; }
          .student-name { font-weight:800; text-align:right; }
          .reason { max-width:170px; text-align:right; line-height:1.45; }
          .status { display:inline-block; padding:3px 6px; border-radius:999px; font-size:7px; font-weight:800; white-space:nowrap; }
          .status.ok { color:#166534; background:#dcfce7; }
          .status.bad { color:#a43b32; background:#fff0ee; }
          .status.muted { color:#697973; background:#eef2f0; }
          .footer {
            display:flex; align-items:center; justify-content:space-between; gap:12px;
            margin-top:12px; padding-top:10px; border-top:1px solid #e2e9e6;
          }
          .signature { color:#526b63; font-size:9px; font-weight:700; }
          .signature strong { display:block; margin-bottom:2px; color:#9a7820; font-size:10px; }
          .brand-sign { display:flex; align-items:center; gap:7px; color:#74867f; font-size:8px; }
          .brand-sign img { width:27px; height:27px; object-fit:contain; }
          .pdf-hint { margin-top:7px; color:#899992; text-align:center; font-size:7px; }
          @media print { body { background:#fff; } .page { border:0; } .pdf-hint { display:none; } }
        </style>
      </head>
      <body>
        <div class="page">
          <img class="corner r" src="${origin}/ornaments/sadiq/gold/07-rukn-tr.svg" alt="" />
          <img class="corner l" src="${origin}/ornaments/sadiq/gold/07-rukn-tr.svg" alt="" />
          <img class="corner br" src="${origin}/ornaments/sadiq/gold/07-rukn-tr.svg" alt="" />
          <img class="corner bl" src="${origin}/ornaments/sadiq/gold/07-rukn-tr.svg" alt="" />
          <img class="watermark" src="${origin}/icon-512.png" alt="" />

          <main class="report">
            <div class="top-line"></div>
            <header class="header">
              <img class="header-logo" src="${origin}/icon-512.png" alt="شعار الصديق" />
              <div class="title">
                <h1>تقرير الإنجاز الشهري</h1>
                <p>نظام الصديق لإدارة حلقات القرآن الكريم — قراءة ذكية للإنجاز والتعثر</p>
              </div>
              <div class="month-box">
                <span>الشهر الهجري</span>
                <strong>${HIJRI_MONTHS[hijriMonth - 1]} ${hijriYear} هـ</strong>
              </div>
            </header>

            <section class="meta">
              <div><span>المسجد</span><strong>${escapeHtml(selectedHalaqaData?.mosque_name || "-")}</strong></div>
              <div><span>الحلقة</span><strong>${escapeHtml(selectedHalaqaData?.name || "-")}</strong></div>
              <div><span>المعلم</span><strong>${escapeHtml(teacher?.full_name || "-")}</strong></div>
              <div><span>حدود الفترة</span><strong>${escapeHtml(formatGregorianDate(period.start))} — ${escapeHtml(formatGregorianDate(period.end))}</strong></div>
            </section>

            <section class="stats">
              <div class="stat"><strong>${rows.length}</strong><span>الطلاب</span></div>
              <div class="stat"><strong>${completedCount}</strong><span>منجزون</span></div>
              <div class="stat"><strong>${rows.length - completedCount}</strong><span>غير منجزين / بلا خطة</span></div>
              <div class="stat"><strong>${delayedCount}</strong><span>حالات تحتاج متابعة</span></div>
              <div class="stat"><strong>${achievementRate}%</strong><span>نسبة الإنجاز</span></div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>م</th><th>الطالب</th><th>الرقم</th><th>الحفظ / الهدف</th><th>حالة الحفظ</th>
                  <th>جنب الدرس</th><th>المراجعة / الهدف</th><th>حالة المراجعة</th><th>الشهر</th><th>سبب التعثر الذكي</th><th>الجلسات</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            <footer class="footer">
              <div class="signature">
                <strong>بالقرآن نرتقي، وبالمتابعة نصنع أثرًا يبقى.</strong>
                تقرير تعليمي لمساندة المعلم في متابعة رحلة الطالب، لا لمجرد تسجيل الأرقام.
              </div>
              <div class="brand-sign">
                <img src="${origin}/icon-512.png" alt="شعار الصديق" />
                <span>الصديق • متابعةٌ تصنع فرقًا</span>
              </div>
            </footer>

            ${mode === "pdf" ? '<div class="pdf-hint">من نافذة الطباعة اختر «حفظ بتنسيق PDF» للحصول على النسخة النهائية مع الحفاظ على العربية والزخارف.</div>' : ''}
          </main>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();

    const triggerPrint = () => {
      window.setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch {
          // The print window may have been closed by the user.
        }
      }, 420);
    };

    if (printWindow.document.readyState === "complete") {
      triggerPrint();
    } else {
      printWindow.addEventListener("load", triggerPrint, { once: true });
    }
  }

  function printReport() {
    openProfessionalReport("print");
  }

  function exportPdf() {
    openProfessionalReport("pdf");
  }

  /* =====================================================
     Loading
  ===================================================== */

  if (
    initialLoading
  ) {
    return (
      <div
        className="monthly-achievement-page"
        dir="rtl"
      >
        <MonthlyStyles />

        <PageLoading />
      </div>
    );
  }

  /* =====================================================
     Render
  ===================================================== */

  return (
    <div
      className="monthly-achievement-page"
      dir="rtl"
    >
      <MonthlyStyles />

      {/* =================================================
          HERO
      ================================================= */}

      <section
        className="monthly-hero"
      >
        <div
          className="monthly-hero-main"
        >
          <div
            className="monthly-hero-icon"
          >
            <Target
              size={24}
            />
          </div>

          <div>
            <div
              className="monthly-eyebrow"
            >
              <ShieldCheck
                size={13}
              />

              مركز الإدارة
              والمتابعة
            </div>

            <h1>
              الإنجاز الشهري
            </h1>

            <p>
              لوحة إدارية شهرية تربط الخطة بالتسميع والحضور والاعتماد، وتكشف الحالات التي تحتاج تدخلًا ومتابعة.
            </p>
          </div>
        </div>

        <div
          className="monthly-actions"
        >
          <button
            type="button"
            className="hero-action recalc"
            onClick={
              recalculate
            }
            disabled={
              loading
            }
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "spin"
                  : ""
              }
            />

            <span>
              إعادة احتساب
            </span>
          </button>

          <button
            type="button"
            className="hero-action excel"
            onClick={
              exportExcel
            }
          >
            <FileSpreadsheet
              size={16}
            />

            <span>
              Excel
            </span>
          </button>

          <button
            type="button"
            className="hero-action pdf"
            onClick={exportPdf}
          >
            <FileText size={16} />
            <span>PDF</span>
          </button>

          <button
            type="button"
            className="hero-action print"
            onClick={printReport}
          >
            <Printer size={16} />
            <span>طباعة</span>
          </button>

          <button
            type="button"
            className="hero-action save"
            onClick={
              saveAll
            }
            disabled={
              saving ||
              loading
            }
          >
            {saving ? (
              <Loader2
                size={16}
                className="spin"
              />
            ) : (
              <Save
                size={16}
              />
            )}

            <span>
              حفظ
            </span>
          </button>

          <button
            type="button"
            className="hero-action approve"
            onClick={
              approveAll
            }
            disabled={
              approving ||
              loading
            }
          >
            {approving ? (
              <Loader2
                size={16}
                className="spin"
              />
            ) : (
              <BadgeCheck
                size={16}
              />
            )}

            <span>
              اعتماد الشهر
            </span>
          </button>
        </div>
      </section>

      {/* =================================================
          UNSAVED
      ================================================= */}

      {hasUnsavedChanges && (
        <div
          className="unsaved-notice"
        >
          <CircleAlert
            size={14}
          />

          توجد تعديلات لم يتم
          حفظها بعد.

          <button
            type="button"
            onClick={
              saveAll
            }
          >
            حفظ الآن
          </button>
        </div>
      )}

      {/* =================================================
          SOURCE INFO
      ================================================= */}

      <div
        className="monthly-source-note"
      >
        <Sparkles
          size={14}
        />

        <div>
          <strong>
            الإنجاز الشهري الذكي
          </strong>

          <span>
            قراءة إدارية موحدة للإنجاز الفعلي والخطة والحضور والتسميع والاعتماد، مع إبراز حالات التعثر والتغير بعد الاعتماد.
          </span>
        </div>
      </div>

      {/* =================================================
          PERIOD
      ================================================= */}

      <section
        className="period-selector-card"
      >
        <button
          type="button"
          className="period-arrow"
          onClick={() =>
            moveHijriMonth(-1)
          }
          title="الشهر السابق"
        >
          <ChevronRight
            size={19}
          />
        </button>

        <div
          className="period-main"
        >
          <div
            className="period-icon"
          >
            <CalendarDays
              size={21}
            />
          </div>

          <div
            className="period-content"
          >
            <span
              className="period-label"
            >
              الشهر الهجري
              — تقويم أم القرى
            </span>

            <div
              className="period-select-row"
            >
              <div
                className="period-select"
              >
                <select
                  value={
                    hijriMonth
                  }
                  onChange={(
                    event
                  ) => {
                    const month =
                      Number(
                        event
                          .target
                          .value
                      );

                    applyPeriod(
                      hijriYear,
                      month
                    );
                  }}
                >
                  {HIJRI_MONTHS.map(
                    (
                      month,
                      index
                    ) => (
                      <option
                        key={
                          month
                        }
                        value={
                          index +
                          1
                        }
                        disabled={
                          Number(
                            hijriYear
                          ) ===
                            CURRENT_HIJRI.year &&
                          index +
                            1 >
                            CURRENT_HIJRI.month
                        }
                      >
                        {month}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={14}
                />
              </div>

              <div
                className="period-select year"
              >
                <select
                  value={
                    hijriYear
                  }
                  onChange={(
                    event
                  ) => {
                    const year =
                      Number(
                        event
                          .target
                          .value
                      );

                    let month =
                      Number(
                        hijriMonth
                      );

                    if (
                      year ===
                        CURRENT_HIJRI.year &&
                      month >
                        CURRENT_HIJRI.month
                    ) {
                      month =
                        CURRENT_HIJRI.month;
                    }

                    applyPeriod(
                      year,
                      month
                    );
                  }}
                >
                  {Array.from(
                    {
                      length:
                        CURRENT_HIJRI.year -
                        1400 +
                        1,
                    },
                    (
                      _,
                      index
                    ) =>
                      CURRENT_HIJRI.year -
                      index
                  ).map(
                    (year) => (
                      <option
                        key={
                          year
                        }
                        value={
                          year
                        }
                      >
                        {year} هـ
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={14}
                />
              </div>
            </div>

            {period && (
              <div
                className="period-conversion"
              >
                <span>
                  حدود الفترة
                  المقابلة
                </span>

                <strong>
                  {formatGregorianDate(
                    period.start
                  )}

                  <span>
                    ←
                  </span>

                  {formatGregorianDate(
                    period.end
                  )}
                </strong>
              </div>
            )}
          </div>
        </div>

        <div
          className="period-current-area"
        >
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={
                goCurrentMonth
              }
            >
              الشهر الحالي
            </button>
          )}
        </div>

        <button
          type="button"
          className="period-arrow"
          onClick={() =>
            moveHijriMonth(1)
          }
          disabled={
            isCurrentMonth
          }
          title="الشهر التالي"
        >
          <ChevronLeft
            size={19}
          />
        </button>
      </section>

      {/* =================================================
          SCOPE
      ================================================= */}

      <section
        className="scope-card"
      >
        <div
          className="scope-heading"
        >
          <div
            className="scope-heading-icon"
          >
            <Layers3
              size={17}
            />
          </div>

          <div>
            <strong>
              نطاق المتابعة
            </strong>

            <span>
              متابعة الحلقة والمعلم والشهر
            </span>
          </div>
        </div>

        <div
          className="scope-grid"
        >
          <div
            className="field"
          >
            <label>
              الحلقة
            </label>

            <div
              className="select-wrap"
            >
              <select
                value={
                  selectedHalaqa
                }
                onChange={(
                  event
                ) =>
                  changeHalaqa(
                    event.target
                      .value
                  )
                }
              >
                {halaqat.length ===
                  0 && (
                  <option value="">
                    لا توجد حلقات
                  </option>
                )}

                {halaqat.map(
                  (halaqa) => (
                    <option
                      key={
                        halaqa.id
                      }
                      value={
                        halaqa.id
                      }
                    >
                      {
                        halaqa.name
                      }
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={15}
              />
            </div>
          </div>

          <div
            className="field"
          >
            <label>
              البحث
            </label>

            <div
              className="search-wrap"
            >
              <Search
                size={15}
              />

              <input
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="اسم الطالب أو رقمه..."
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  <X
                    size={13}
                  />
                </button>
              )}
            </div>
          </div>

          {selectedHalaqaData && (
            <div
              className="halaqa-summary"
            >
              <span>
                الحلقة الحالية
              </span>

              <strong>
                {
                  selectedHalaqaData.name
                }
              </strong>

              <small>
                {
                  selectedHalaqaData.mosque_name
                }

                {selectedHalaqaData.halaqa_period
                  ? ` • ${
                      HALAQA_PERIODS[
                        selectedHalaqaData
                          .halaqa_period
                      ] ||
                      ""
                    }`
                  : ""}
              </small>
            </div>
          )}
        </div>
      </section>

      {/* =================================================
          STATS
      ================================================= */}

      <section
        className="monthly-stats"
      >
        <MonthlyStat icon={<Layers3 size={18}/>} title="جنب الدرس" value={formatMonthlySideLessons(rows)} tone="revision" />
<MonthlyStat
          icon={Users}
          title="طلاب الشهر"
          value={
            stats.totalStudents
          }
          subtitle={`${stats.active} لديهم إنجاز`}
          tone="students"
        />

        <MonthlyStat
          icon={BookOpen}
          title="إجمالي الحفظ"
          value={
            formatFaces(
              stats.finalMem
            )
          }
          subtitle={`${formatFaces(
            stats.autoMem
          )} تلقائي + ${formatFaces(
            stats.manualMem
          )} يدوي`}
          tone="memorization"
        />

        <MonthlyStat
          icon={
            RefreshCw
          }
          title="إجمالي المراجعة"
          value={
            formatFaces(
              stats.finalRev
            )
          }
          subtitle={`${formatFaces(
            stats.autoRev
          )} تلقائي + ${formatFaces(
            stats.manualRev
          )} يدوي`}
          tone="revision"
        />

        <MonthlyStat
          icon={History}
          title="جلسات التسميع"
          value={
            stats.sessions
          }
          subtitle="مصدر الحساب التلقائي"
          tone="sessions"
        />

        <MonthlyStat
          icon={BadgeCheck}
          title="السجلات المعتمدة"
          value={`${stats.approved}/${stats.totalStudents}`}
          subtitle={`${stats.manualStudents} بها إضافة يدوية`}
          tone="approved"
        />
      </section>

      {/* =================================================
          STUDENT HEADER
      ================================================= */}

      <div
        className="students-section-header"
      >
        <div>
          <h2>
            متابعة الطلاب الشهرية
          </h2>

          <p>
            قراءة رقابية توضح الخطة والمنجز والتعثر والاعتماد ومصدر الأرقام.
          </p>
        </div>

        <div
          className="students-count"
        >
          <UserRound
            size={13}
          />

          {
            filteredRows.length
          }

          طالب
        </div>
      </div>

      {/* =================================================
          CONTENT
      ================================================= */}

      {loading ? (
        <InlineLoading />
      ) : halaqat.length ===
        0 ? (
        <EmptyState
          icon={Layers3}
          title="لا توجد حلقات متاحة للمتابعة"
          description="لم يتم العثور على حلقات في نطاق الإدارة الحالي."
        />
      ) : filteredRows.length ===
        0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد طلاب"
          description={
            search
              ? "لا يوجد طالب مطابق للبحث الحالي."
              : "لا يوجد طلاب ضمن هذه الحلقة خلال الشهر المحدد."
          }
        />
      ) : (
        <section
          className="achievement-grid"
        >
          {filteredRows.map(
            (row) => (
              <StudentAchievementCard
                key={
                  row.student_id
                }
                row={row}
                onChange={(
                  field,
                  value
                ) =>
                  updateRow(
                    row.student_id,
                    field,
                    value
                  )
                }
                onDetails={() =>
                  setDetailStudent(
                    row
                  )
                }
              />
            )
          )}
        </section>
      )}

      {/* =================================================
          DETAILS
      ================================================= */}

      {detailStudent && (
        <DetailsModal
          student={
            detailStudent
          }
          records={
            detailRecords
          }
          onClose={() =>
            setDetailStudent(
              null
            )
          }
          onChange={(field, value) => {
            updateRow(detailStudent.student_id, field, value);
            setDetailStudent((current) => {
              if (!current) return current;
              const next = { ...current, [field]: value };
              if (field === "manual_memorization_faces") {
                next.final_memorization_faces = roundFaces(Number(next.auto_memorization_faces || 0) + Number(value || 0));
                next.memorization_completed = Number(next.memorization_target_faces || 0) > 0
                  ? next.final_memorization_faces >= Number(next.memorization_target_faces || 0)
                  : false;
              }
              if (field === "manual_revision_faces") {
                next.final_revision_faces = roundFaces(Number(next.auto_revision_faces || 0) + Number(value || 0));
                next.revision_completed = Number(next.revision_target_faces || 0) > 0
                  ? next.final_revision_faces >= Number(next.revision_target_faces || 0)
                  : false;
              }
              return next;
            });
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   Student Achievement Card
========================================================= */

function StudentAchievementCard({
  row,
  onChange,
  onDetails,
}) {
  const overall = getOverallCompletion(row);

  const memStatus = Number(row.memorization_target_faces || 0) <= 0
    ? "no-plan"
    : row.memorization_completed
      ? "done"
      : "pending";

  const revStatus = Number(row.revision_target_faces || 0) <= 0
    ? "no-plan"
    : row.revision_completed
      ? "done"
      : "pending";

  return (
    <article className="achievement-summary-card">
      <div className={`achievement-summary-accent ${overall === true ? "done" : overall === false ? "pending" : "neutral"}`} />

      <div className="achievement-summary-header">
        <div className="student-identity compact">
          <div className="student-avatar compact-avatar">
            <UserRound size={18} />
          </div>
          <div>
            <h3>{row.student_name}</h3>
            <span>{row.user_number || "طالب الحلقة"}</span>
          </div>
        </div>

        <span className={`monthly-completion-badge ${overall === true ? "done" : overall === false ? "pending" : "neutral"}`}>
          {overall === true ? <CheckCircle2 size={14} /> : overall === false ? <XCircle size={14} /> : <History size={14} />}
          {overall === null ? "لا توجد خطة" : overall ? "منجز" : "غير منجز"}
        </span>
      </div>

      <div className="achievement-summary-grid">
        <AchievementSummaryItem
          title="الحفظ"
          status={memStatus}
          done={row.final_memorization_faces}
          target={row.memorization_target_faces}
          percent={row.memorization_percent}
        />
        <AchievementSummaryItem
          title="المراجعة"
          status={revStatus}
          done={row.final_revision_faces}
          target={row.revision_target_faces}
          percent={row.revision_percent}
        />
      <div className="achievement-summary-item"><span>جنب الدرس</span><strong>{formatSideLessonTotal(row.side_lesson_faces,row.side_lesson_lines_per_face)}</strong><em>من التسميع تلقائيًا</em></div></div>

      <div className={`smart-delay-summary ${row.smart_delay?.hasDelay ? "has-delay" : "clear"}`}>
        {row.smart_delay?.hasDelay ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
        <div>
          <span>سبب التعثر الذكي</span>
          <strong>{row.delay_reason || "لا يوجد تعثر ظاهر"}</strong>
        </div>
      </div>

      <div className="achievement-summary-footer">
        <div>
          <History size={14} />
          <span>{row.smart_total_sessions ?? row.source_recitations_count ?? 0} جلسة تسميع</span>
        </div>
        <button type="button" onClick={onDetails}>
          <Search size={15} />
          عرض
        </button>
      </div>
    </article>
  );
}

function AchievementSummaryItem({ title, status, done, target, percent }) {
  return (
    <div className={`achievement-summary-item ${status}`}>
      <span>{title}</span>
      <strong>
        {formatFaces(done)}
        <small> / {formatFaces(target)} وجه</small>
      </strong>
      <em>
        {status === "no-plan" ? "لا توجد خطة" : status === "done" ? "منجز" : `${percent ?? 0}%`}
      </em>
    </div>
  );
}

/* =========================================================
   Achievement Block
========================================================= */

function AchievementBlock({
  type,
  icon,
  title,
  automatic,
  manual,
  total,
  reason,
  onManualChange,
  onReasonChange,
}) {
  const manualNumber =
    Number(
      manual || 0
    );

  return (
    <div
      className={
        `achievement-block ${type}`
      }
    >
      <div
        className="achievement-block-header"
      >
        <div>
          {icon}

          <strong>
            {title}
          </strong>
        </div>

        <span>
          بالأوجه
        </span>
      </div>

      {/* Automatic */}

      <div
        className="automatic-value"
      >
        <div>
          <Sparkles
            size={12}
          />

          <span>
            من التسميع
          </span>
        </div>

        <strong>
          {formatFaces(
            automatic
          )}

          <small>
            وجه
          </small>
        </strong>
      </div>

      {/* Manual */}

      <div
        className="manual-value"
      >
        <label>
          إضافة يدوية
        </label>

        <div
          className="manual-number"
        >
          <input
            type="number"
            min="0"
            step="0.1"
            value={
              manual
            }
            onChange={(
              event
            ) => {
              const value =
                event.target
                  .value;

              onManualChange(
                value === ""
                  ? ""
                  : Number(
                      value
                    )
              );
            }}
            placeholder="0"
          />

          <span>
            وجه
          </span>
        </div>
      </div>

      {/* Reason */}

      {manualNumber >
        0 && (
        <div
          className="manual-reason"
        >
          <label>
            سبب الإضافة
            <span>
              *
            </span>
          </label>

          <input
            value={
              reason
            }
            onChange={(
              event
            ) =>
              onReasonChange(
                event.target
                  .value
              )
            }
            placeholder={
              type ===
              "revision"
                ? "مثال: سمع الطالب 100 وجه مراجعة خارج تسجيل الجلسات"
                : "مثال: تم تسميع مقدار إضافي ولم يسجل في صفحة التسميع"
            }
          />
        </div>
      )}

      {/* Total */}

      <div
        className="final-value"
      >
        <span>
          الإجمالي النهائي
        </span>

        <strong>
          {formatFaces(
            total
          )}

          <small>
            وجه
          </small>
        </strong>
      </div>
    </div>
  );
}

/* =========================================================
   Details Modal
========================================================= */

function DetailsModal({
  student,
  records,
  onClose,
  onChange,
}) {
  const lessonTotal =
    records.reduce(
      (
        sum,
        record
      ) =>
        sum +
        getAcceptedLessonFaces(record),
      0
    );

  const revisionTotal =
    records.reduce(
      (
        sum,
        record
      ) =>
        sum +
        getAcceptedReviewFaces(record),
      0
    );

  return (
    <div
      className="details-overlay"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className="details-modal"
      >
        <div
          className="details-header"
        >
          <div>
            <span>
              تفاصيل مصدر
              الإنجاز
            </span>

            <h2>
              {
                student.student_name
              }
            </h2>

            <p>
              كل جلسة دخلت في
              الحساب التلقائي
              لهذا الشهر.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
          >
            <X
              size={17}
            />
          </button>
        </div>

        <div
          className="details-summary"
        >
          <div>
            <span>
              جلسات التسميع
            </span>

            <strong>
              {
                records.length
              }
            </strong>
          </div>

          <div>
            <span>
              الحفظ التلقائي
            </span>

            <strong>
              {formatFaces(
                lessonTotal
              )}
            </strong>
          </div>

          <div>
            <span>
              المراجعة التلقائية
            </span>

            <strong>
              {formatFaces(
                revisionTotal
              )}
            </strong>
          </div>
        <div><span>جنب الدرس</span><strong>{formatSideLessonTotal(student.side_lesson_faces,student.side_lesson_lines_per_face)}</strong></div></div>

        <div className="details-smart-analysis">
          <div className="details-analysis-head">
            <Sparkles size={16} />
            <div>
              <span>التحليل الذكي</span>
              <strong>{student.delay_reason || "لا يوجد تعثر ظاهر"}</strong>
            </div>
          </div>

          <div className="details-analysis-grid">
            <div><span>غياب</span><strong>{student.smart_delay?.absent || 0}</strong></div>
            <div><span>غياب بعذر</span><strong>{student.smart_delay?.excused || 0}</strong></div>
            <div><span>إعادات</span><strong>{student.smart_delay?.repeats || 0}</strong></div>
            <div><span>الجلسات</span><strong>{student.smart_total_sessions ?? student.source_recitations_count ?? 0}</strong></div>
          </div>
        </div>

        <div className="details-manual-area">
          <div className="details-manual-heading">
            <div>
              <span>التعديل اليدوي الوحيد</span>
              <strong>إضافة إنجاز غير مسجل في التسميع</strong>
            </div>
            <ShieldCheck size={17} />
          </div>

          <div className="achievement-columns detail-edit-columns">
            <AchievementBlock
              type="memorization"
              icon={<BookOpen size={16} />}
              title="الحفظ"
              automatic={student.auto_memorization_faces}
              manual={student.manual_memorization_faces}
              total={student.final_memorization_faces}
              reason={student.manual_memorization_reason}
              onManualChange={(value) => onChange("manual_memorization_faces", value)}
              onReasonChange={(value) => onChange("manual_memorization_reason", value)}
            />
            <AchievementBlock
              type="revision"
              icon={<RefreshCw size={16} />}
              title="المراجعة"
              automatic={student.auto_revision_faces}
              manual={student.manual_revision_faces}
              total={student.final_revision_faces}
              reason={student.manual_revision_reason}
              onManualChange={(value) => onChange("manual_revision_faces", value)}
              onReasonChange={(value) => onChange("manual_revision_reason", value)}
            />
          </div>

          <div className="monthly-notes detail-notes">
            <label><MessageSquareText size={13} /> ملاحظة اختيارية</label>
            <textarea
              rows={2}
              value={student.notes || ""}
              onChange={(event) => onChange("notes", event.target.value)}
              placeholder="ملاحظة مختصرة عند الحاجة..."
            />
          </div>
        </div>

        <div
          className="details-body"
        >
          {records.length ===
          0 ? (
            <div
              className="details-empty"
            >
              لا توجد جلسات
              تسميع لهذا الطالب
              في الشهر المحدد.
            </div>
          ) : (
            records.map(
              (
                record,
                index
              ) => (
                <article
                  key={
                    record.id
                  }
                  className="source-record"
                >
                  <div
                    className="source-number"
                  >
                    {index + 1}
                  </div>

                  <div
                    className="source-main"
                  >
                    <div
                      className="source-date"
                    >
                      <div>
                        <strong>
                          {formatHijriFullDate(
                            record.recitation_date
                          )}
                        </strong>

                        <span>
                          {formatGregorianDate(
                            record.recitation_date
                          )}
                        </span>
                      </div>
                    </div>

                    <div
                      className="source-values"
                    >
                      <div
                        className="source-range"
                      >
                        <span>
                          الدرس
                        </span>

                        <strong>
                          {record.from_surah ||
                            "غير مسجل"}

                          {record.from_ayah
                            ? ` (${record.from_ayah})`
                            : ""}

                          {record.to_surah
                            ? ` ← ${record.to_surah}`
                            : ""}

                          {record.to_ayah
                            ? ` (${record.to_ayah})`
                            : ""}
                        </strong>
                      </div>

                      <div>
                        <span>
                          أوجه الحفظ
                        </span>

                        <strong>
                          {formatFaces(
                            record.lesson_faces_manual ??
                              record.lesson_faces
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          أوجه المراجعة
                        </span>

                        <strong>
                          {formatFaces(
                            record.review_faces
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                </article>
              )
            )
          )}
        </div>

        <div
          className="details-footer"
        >
          <button
            type="button"
            onClick={
              onClose
            }
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Monthly Stat
========================================================= */

function MonthlyStat({
  icon: Icon,
  title,
  value,
  subtitle,
  tone,
}) {
  return (
    <div
      className={
        `monthly-stat ${tone}`
      }
    >
      <div
        className="monthly-stat-icon"
      >
        <Icon
          size={18}
        />
      </div>

      <div
        className="monthly-stat-content"
      >
        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {subtitle}
        </small>
      </div>
    </div>
  );
}

/* =========================================================
   Empty
========================================================= */

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div
      className="monthly-empty"
    >
      <div
        className="monthly-empty-icon"
      >
        <Icon
          size={26}
        />
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   Loading
========================================================= */

function InlineLoading() {
  return (
    <div
      className="monthly-inline-loading"
    >
      <Loader2
        size={26}
        className="spin"
      />

      <strong>
        جارٍ احتساب الإنجاز
        من جلسات التسميع...
      </strong>

      <span>
        يتم جمع أوجه الحفظ
        والمراجعة لكل طالب.
      </span>
    </div>
  );
}

function PageLoading() {
  return (
    <div
      className="monthly-page-loading"
    >
      <div
        className="monthly-page-loading-icon"
      >
        <Loader2
          size={28}
          className="spin"
        />
      </div>

      <h3>
        جارٍ تجهيز الإنجاز
        الشهري
      </h3>

      <p>
        يتم تحميل حلقات المعلم
        وتجهيز التقويم الهجري...
      </p>
    </div>
  );
}

/* =========================================================
   Styles
========================================================= */

function MonthlyStyles() {
  return (
    <style>
      {`
        .monthly-achievement-page {
          position: relative;
          isolation: isolate;
          width: 100%;
          max-width: none;
          min-height: 100%;
          margin: 0;
          padding: clamp(10px, 1.6vw, 24px);
          overflow-x: hidden;
          color: #0f172a;
          background:
            radial-gradient(circle at 8% 4%, rgba(185,139,45,.07), transparent 22rem),
            linear-gradient(180deg, #f8f6ef 0%, #f6f7f3 100%);
        }

        .monthly-achievement-page::before,
        .monthly-achievement-page::after {
          content: "";
          position: absolute;
          z-index: -1;
          width: 190px;
          height: 190px;
          opacity: .055;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 18%, transparent 0 15%, #9b7727 16% 17%, transparent 18%),
            radial-gradient(ellipse at 50% 54%, transparent 0 22%, #9b7727 23% 24%, transparent 25%),
            radial-gradient(ellipse at 30% 48%, transparent 0 15%, #9b7727 16% 17%, transparent 18%),
            radial-gradient(ellipse at 70% 48%, transparent 0 15%, #9b7727 16% 17%, transparent 18%);
        }

        .monthly-achievement-page::before {
          top: 8px;
          left: -55px;
          transform: rotate(-18deg);
        }

        .monthly-achievement-page::after {
          right: -60px;
          bottom: 40px;
          transform: rotate(162deg);
        }

        .monthly-achievement-page * {
          box-sizing: border-box;
        }

        .monthly-achievement-page button,
        .monthly-achievement-page input,
        .monthly-achievement-page select,
        .monthly-achievement-page textarea {
          font-family: inherit;
        }

        /* =============================================
           HERO
        ============================================= */

        .monthly-hero {
          position: relative;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 18px;

          padding: 20px 22px;
          margin-bottom: 14px;

          border:
            1px solid
            rgba(15,81,50,.1);

          border-radius: 20px;

          background:
            linear-gradient(
              135deg,
              #ffffff 0%,
              #f3f8f4 60%,
              #fffaf1 100%
            );

          box-shadow:
            0 13px 37px
            rgba(15,81,50,.05);
        }

        .monthly-hero::before {
          content: "";

          position: absolute;

          width: 280px;
          height: 280px;

          left: -145px;
          top: -170px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(201,162,39,.15),
              transparent 69%
            );

          pointer-events: none;
        }

        .monthly-hero-main {
          position: relative;
          z-index: 2;

          display: flex;
          align-items: center;

          gap: 12px;

          min-width: 0;
        }

        .monthly-hero-icon {
          width: 50px;
          height: 50px;

          flex: 0 0 50px;

          border-radius: 16px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #fff;

          background:
            linear-gradient(
              135deg,
              #0f5132,
              #0f766e
            );

          box-shadow:
            0 10px 24px
            rgba(15,81,50,.18);
        }

        .monthly-eyebrow {
          display: flex;
          align-items: center;

          gap: 5px;

          margin-bottom: 3px;

          color: #9a741f;

          font-size: 9px;
          font-weight: 900;
        }

        .monthly-hero h1 {
          margin: 0;

          color: #173d2b;

          font-size: 25px;
          font-weight: 950;
        }

        .monthly-hero p {
          max-width: 470px;

          margin: 5px 0 0;

          color: #758079;

          font-size: 10px;
          line-height: 1.75;
        }

        .monthly-actions {
          position: relative;
          z-index: 2;

          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;

          gap: 6px;
        }

        .hero-action {
          min-height: 40px;

          padding: 0 11px;

          border-radius: 10px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 5px;

          font-size: 8px;
          font-weight: 900;

          cursor: pointer;
        }

        .hero-action.recalc,
        .hero-action.print {
          border:
            1px solid #dce4df;

          color: #536158;
          background: #fff;
        }

        .hero-action.excel {
          border:
            1px solid #b9d8c5;

          color: #047857;
          background: #f0faf4;
        }

        .hero-action.save {
          border: none;

          color: #fff;

          background:
            linear-gradient(
              135deg,
              #0f5132,
              #0f766e
            );
        }

        .hero-action.approve {
          border: none;

          color: #fff;

          background:
            linear-gradient(
              135deg,
              #947019,
              #c69a30
            );

          box-shadow:
            0 7px 17px
            rgba(148,112,25,.14);
        }

        .hero-action:disabled {
          opacity: .5;
          cursor: wait;
        }

        /* =============================================
           UNSAVED
        ============================================= */

        .unsaved-notice {
          display: flex;
          align-items: center;

          gap: 6px;

          margin-bottom: 12px;
          padding: 9px 12px;

          border:
            1px solid #f0d9a4;

          border-radius: 12px;

          color: #765a17;
          background: #fff8e7;

          font-size: 8px;
        }

        .unsaved-notice button {
          margin-right: auto;

          border: none;
          border-radius: 8px;

          padding: 6px 9px;

          color: #fff;
          background: #8a6717;

          font-size: 7px;
          font-weight: 850;

          cursor: pointer;
        }

        /* =============================================
           SOURCE NOTE
        ============================================= */

        .monthly-source-note {
          display: flex;
          align-items: center;

          gap: 8px;

          margin-bottom: 14px;
          padding: 10px 13px;

          border:
            1px solid #dcebe3;

          border-radius: 13px;

          color: #37624c;
          background: #f4faf6;
        }

        .monthly-source-note > svg {
          flex: 0 0 auto;
        }

        .monthly-source-note strong {
          display: block;

          margin-bottom: 1px;

          font-size: 8px;
        }

        .monthly-source-note span {
          display: block;

          color: #678074;

          font-size: 7px;
          line-height: 1.65;
        }

        /* =============================================
           PERIOD
        ============================================= */

        .period-selector-card {
          display: grid;

          grid-template-columns:
            42px
            minmax(0,1fr)
            auto
            42px;

          align-items: center;

          gap: 10px;

          margin-bottom: 14px;
          padding: 14px;

          border:
            1px solid #e3e9e5;

          border-radius: 19px;

          background: #fff;

          box-shadow:
            0 7px 23px
            rgba(15,23,42,.03);
        }

        .period-arrow {
          width: 40px;
          height: 40px;

          border:
            1px solid #dfe6e2;

          border-radius: 11px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #0f5132;
          background: #fff;

          cursor: pointer;
        }

        .period-arrow:disabled {
          opacity: .3;
          cursor: not-allowed;
        }

        .period-main {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: 10px;
        }

        .period-icon {
          width: 44px;
          height: 44px;

          flex: 0 0 44px;

          border-radius: 13px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #0f5132;
          background: #edf7f1;
        }

        .period-content {
          min-width: 0;
        }

        .period-label {
          display: block;

          margin-bottom: 4px;

          color: #8a958e;

          font-size: 7px;
        }

        .period-select-row {
          display: flex;
          align-items: center;

          gap: 6px;
        }

        .period-select {
          position: relative;
        }

        .period-select select {
          min-width: 155px;
          height: 35px;

          appearance: none;

          padding:
            0 10px 0 28px;

          border:
            1px solid #dce4df;

          border-radius: 9px;

          outline: none;

          color: #173d2b;
          background: #fbfdfc;

          font-size: 10px;
          font-weight: 900;

          cursor: pointer;
        }

        .period-select.year
        select {
          min-width: 90px;
        }

        .period-select > svg {
          position: absolute;

          left: 8px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #859089;

          pointer-events: none;
        }

        .period-conversion {
          margin-top: 6px;
        }

        .period-conversion > span {
          display: block;

          color: #a0a8a3;

          font-size: 6px;
        }

        .period-conversion strong {
          display: flex;
          align-items: center;
          flex-wrap: wrap;

          gap: 5px;

          margin-top: 2px;

          color: #7b672f;

          font-size: 7px;
        }

        .period-current-area button {
          min-height: 34px;

          padding: 0 10px;

          border:
            1px solid #cadcd1;

          border-radius: 9px;

          color: #0f5132;
          background: #f5faf7;

          font-size: 7px;
          font-weight: 850;

          cursor: pointer;
        }

        /* =============================================
           SCOPE
        ============================================= */

        .scope-card {
          margin-bottom: 14px;
          padding: 13px;

          border:
            1px solid #e4eae6;

          border-radius: 18px;

          background: #fff;

          box-shadow:
            0 6px 21px
            rgba(15,23,42,.025);
        }

        .scope-heading {
          display: flex;
          align-items: center;

          gap: 8px;

          margin-bottom: 10px;
        }

        .scope-heading-icon {
          width: 34px;
          height: 34px;

          flex: 0 0 34px;

          border-radius: 10px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #0f5132;
          background: #edf7f1;
        }

        .scope-heading strong {
          display: block;

          color: #33443a;

          font-size: 9px;
        }

        .scope-heading span {
          display: block;

          margin-top: 1px;

          color: #939c96;

          font-size: 6px;
        }

        .scope-grid {
          display: grid;

          grid-template-columns:
            minmax(190px,.7fr)
            minmax(250px,1.2fr)
            minmax(200px,.8fr);

          gap: 8px;

          align-items: end;
        }

        .field label {
          display: block;

          margin-bottom: 4px;

          color: #627067;

          font-size: 7px;
          font-weight: 850;
        }

        .select-wrap,
        .search-wrap {
          position: relative;
        }

        .select-wrap select,
        .search-wrap input {
          width: 100%;
          height: 39px;

          border:
            1px solid #dce4df;

          border-radius: 10px;

          outline: none;

          color: #33443a;
          background: #fbfdfc;

          font-size: 8px;
        }

        .select-wrap select {
          appearance: none;

          padding:
            0 9px 0 29px;
        }

        .select-wrap > svg {
          position: absolute;

          left: 9px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #859089;

          pointer-events: none;
        }

        .search-wrap > svg {
          position: absolute;

          right: 10px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #8c9690;

          pointer-events: none;
        }

        .search-wrap input {
          padding:
            0 34px 0 31px;
        }

        .search-wrap button {
          position: absolute;

          left: 6px;
          top: 50%;

          width: 25px;
          height: 25px;

          transform:
            translateY(-50%);

          border: none;
          border-radius: 7px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #667169;
          background: #edf1ef;

          cursor: pointer;
        }

        .halaqa-summary {
          min-height: 55px;

          padding: 8px 10px;

          border:
            1px solid #eee0bd;

          border-radius: 11px;

          background:
            linear-gradient(
              135deg,
              #fffdf8,
              #fff9eb
            );
        }

        .halaqa-summary span,
        .halaqa-summary small {
          display: block;

          color: #96865f;

          font-size: 6px;
        }

        .halaqa-summary strong {
          display: block;

          margin: 2px 0;

          color: #70571a;

          font-size: 9px;
          font-weight: 900;
        }

        /* =============================================
           STATS
        ============================================= */

        .monthly-stats {
          display: grid;

          grid-template-columns:
            repeat(
              5,
              minmax(0,1fr)
            );

          gap: 9px;

          margin-bottom: 17px;
        }

        .monthly-stat {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: 8px;

          padding: 12px;

          border:
            1px solid #e5ebe7;

          border-radius: 16px;

          background: #fff;

          box-shadow:
            0 6px 20px
            rgba(15,23,42,.025);
        }

        .monthly-stat-icon {
          width: 36px;
          height: 36px;

          flex: 0 0 36px;

          border-radius: 11px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .monthly-stat.students
        .monthly-stat-icon {
          color: #0f5132;
          background: #edf7f1;
        }

        .monthly-stat.memorization
        .monthly-stat-icon {
          color: #047857;
          background: #eaf8ef;
        }

        .monthly-stat.revision
        .monthly-stat-icon {
          color: #0f766e;
          background: #edf8f7;
        }

        .monthly-stat.sessions
        .monthly-stat-icon {
          color: #927536;
          background: #fff8e7;
        }

        .monthly-stat.approved
        .monthly-stat-icon {
          color: #166534;
          background: #ecfdf3;
        }

        .monthly-stat-content {
          min-width: 0;
        }

        .monthly-stat-content > span {
          display: block;

          color: #7f8a83;

          font-size: 7px;
        }

        .monthly-stat-content > strong {
          display: block;

          margin-top: 1px;

          color: #173d2b;

          font-size: 18px;
          font-weight: 950;
        }

        .monthly-stat-content > small {
          display: block;

          margin-top: 1px;

          color: #9ba39e;

          font-size: 6px;

          line-height: 1.4;
        }

        /* =============================================
           SECTION
        ============================================= */

        .students-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;

          gap: 8px;

          margin-bottom: 10px;
        }

        .students-section-header h2 {
          margin: 0;

          color: #173d2b;

          font-size: 17px;
          font-weight: 950;
        }

        .students-section-header p {
          margin: 3px 0 0;

          color: #909993;

          font-size: 7px;
        }

        .students-count {
          display: inline-flex;
          align-items: center;

          gap: 4px;

          color: #758178;

          font-size: 7px;
          font-weight: 850;
        }

        /* =============================================
           GRID
        ============================================= */

        .achievement-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(
                min(100%,460px),
                1fr
              )
            );

          gap: 12px;
        }

        .student-achievement-card {
          position: relative;
          overflow: hidden;

          min-width: 0;

          padding: 14px;

          border:
            1px solid #e4eae6;

          border-radius: 19px;

          background: #fff;

          box-shadow:
            0 7px 24px
            rgba(15,23,42,.035);

          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .student-achievement-card:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 13px 31px
            rgba(15,81,50,.065);
        }

        .student-card-line {
          position: absolute;

          top: 0;
          right: 0;
          left: 0;

          height: 3px;

          background:
            linear-gradient(
              90deg,
              #0f5132,
              #c9a227
            );
        }

        .student-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: 8px;

          margin-bottom: 10px;
        }

        .student-identity {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: 8px;
        }

        .student-avatar {
          width: 39px;
          height: 39px;

          flex: 0 0 39px;

          border-radius: 12px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #0f5132;
          background: #edf7f1;
        }

        .student-identity h3 {
          margin: 0;

          overflow: hidden;

          color: #293a30;

          font-size: 11px;
          font-weight: 950;

          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .student-identity span {
          display: block;

          margin-top: 2px;

          color: #939c96;

          font-size: 6px;
        }

        .student-badges {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;

          gap: 4px;
        }

        .source-badge,
        .approved-badge,
        .draft-badge,
        .changed-badge,
        .legacy-badge {
          min-height: 23px;

          padding: 0 7px;

          border-radius: 999px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 3px;

          font-size: 6px;
          font-weight: 850;
        }

        .source-badge.auto {
          color: #047857;
          background: #ecfdf3;
        }

        .source-badge.manual {
          color: #927536;
          background: #fff7df;
        }

        .source-badge.mixed {
          color: #0f766e;
          background: #edf8f7;
        }

        .source-badge.none {
          color: #64748b;
          background: #f1f5f9;
        }

        .approved-badge {
          color: #166534;
          background: #dcfce7;
        }

        .draft-badge {
          color: #64748b;
          background: #f1f5f9;
        }

        .changed-badge {
          color: #b45309;
          background: #fff7ed;
        }

        .legacy-badge {
          color: #6b5b34;
          background: #fbf7eb;
        }

        /* =============================================
           SOURCE INFO
        ============================================= */

        .student-source-info {
          display: grid;

          grid-template-columns:
            .7fr
            1.4fr
            auto;

          gap: 6px;

          margin-bottom: 10px;
          padding: 8px;

          border-radius: 11px;

          background: #f7faf8;
        }

        .student-source-info
        > div {
          display: flex;
          align-items: center;

          gap: 4px;

          min-width: 0;

          color: #7e8982;

          font-size: 6px;
        }

        .student-source-info
        strong {
          overflow: hidden;

          color: #47564d;

          font-size: 7px;

          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .student-source-info
        button {
          min-height: 29px;

          padding: 0 8px;

          border:
            1px solid #cfdcd4;

          border-radius: 8px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 4px;

          color: #0f5132;
          background: #fff;

          font-size: 6px;
          font-weight: 850;

          cursor: pointer;
        }

        /* =============================================
           BLOCKS
        ============================================= */

        .achievement-columns {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 8px;
        }

        .achievement-block {
          overflow: hidden;

          border:
            1px solid #e5ebe7;

          border-radius: 13px;

          background: #fbfdfc;
        }

        .achievement-block-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 6px;

          padding: 9px 10px;

          border-bottom:
            1px solid #e9eeeb;
        }

        .achievement-block-header
        > div {
          display: flex;
          align-items: center;

          gap: 5px;
        }

        .achievement-block-header
        strong {
          color: #33443a;

          font-size: 8px;
        }

        .achievement-block-header
        > span {
          color: #929c95;

          font-size: 6px;
        }

        .achievement-block.memorization
        .achievement-block-header
        > div {
          color: #047857;
        }

        .achievement-block.revision
        .achievement-block-header
        > div {
          color: #0f766e;
        }

        /* Automatic */

        .automatic-value {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 6px;

          margin: 8px;
          padding: 8px;

          border-radius: 9px;

          color: #047857;
          background: #edf9f2;
        }

        .automatic-value
        > div {
          display: flex;
          align-items: center;

          gap: 4px;

          font-size: 7px;
        }

        .automatic-value
        > strong {
          font-size: 13px;
          font-weight: 950;
        }

        .automatic-value
        small {
          margin-right: 2px;

          font-size: 6px;
          font-weight: 700;
        }

        /* Manual */

        .manual-value,
        .manual-reason {
          padding:
            0 8px 8px;
        }

        .manual-value label,
        .manual-reason label {
          display: block;

          margin-bottom: 4px;

          color: #6c7971;

          font-size: 6px;
          font-weight: 850;
        }

        .manual-reason
        label span {
          color: #b42318;
        }

        .manual-number {
          position: relative;
        }

        .manual-number input,
        .manual-reason input {
          width: 100%;
          height: 35px;

          border:
            1px solid #dce4df;

          border-radius: 9px;

          outline: none;

          color: #33443a;
          background: #fff;

          font-size: 8px;
        }

        .manual-number input {
          padding:
            0 8px 0 37px;
        }

        .manual-number
        > span {
          position: absolute;

          left: 8px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #89938c;

          font-size: 6px;
        }

        .manual-reason input {
          padding: 0 8px;
        }

        /* Total */

        .final-value {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 6px;

          padding: 9px 10px;

          border-top:
            1px solid #e7ece9;

          background: #fff;
        }

        .final-value
        > span {
          color: #727f76;

          font-size: 7px;
          font-weight: 800;
        }

        .final-value
        > strong {
          color: #173d2b;

          font-size: 15px;
          font-weight: 950;
        }

        .final-value
        small {
          margin-right: 2px;

          color: #88938c;

          font-size: 6px;
        }

        /* =============================================
           NOTES
        ============================================= */

        .monthly-notes {
          margin-top: 9px;
        }

        .monthly-notes label {
          display: flex;
          align-items: center;

          gap: 4px;

          margin-bottom: 4px;

          color: #69766e;

          font-size: 6px;
          font-weight: 850;
        }

        .monthly-notes textarea {
          width: 100%;
          min-height: 51px;

          padding: 8px;

          border:
            1px solid #dfe6e2;

          border-radius: 9px;

          outline: none;

          resize: vertical;

          color: #3e4d44;
          background: #fbfdfc;

          font-size: 7px;
          line-height: 1.6;
        }

        /* =============================================
           DETAILS MODAL
        ============================================= */

        .details-overlay {
          position: fixed;
          inset: 0;

          z-index: 6000;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 16px;

          background:
            rgba(15,23,42,.58);

          backdrop-filter:
            blur(5px);
        }

        .details-modal {
          width:
            min(
              800px,
              100%
            );

          max-height:
            calc(
              100dvh - 32px
            );

          overflow-y: auto;

          border-radius: 22px;

          background: #f8faf9;

          box-shadow:
            0 30px 90px
            rgba(15,23,42,.28);
        }

        .details-header {
          position: sticky;
          top: 0;

          z-index: 10;

          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: 10px;

          padding: 15px 17px;

          border-bottom:
            1px solid #e7ede9;

          background:
            rgba(
              255,
              255,
              255,
              .97
            );

          backdrop-filter:
            blur(12px);
        }

        .details-header
        > div > span {
          color: #0f766e;

          font-size: 7px;
          font-weight: 900;
        }

        .details-header h2 {
          margin:
            2px 0 0;

          color: #173d2b;

          font-size: 15px;
        }

        .details-header p {
          margin:
            3px 0 0;

          color: #919a94;

          font-size: 7px;
        }

        .details-header
        > button {
          width: 35px;
          height: 35px;

          border: none;
          border-radius: 9px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #64748b;
          background: #f1f5f3;

          cursor: pointer;
        }

        .details-summary {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              1fr
            );

          gap: 7px;

          padding: 12px;
        }

        .details-summary
        > div {
          padding: 10px;

          border:
            1px solid #e4eae6;

          border-radius: 11px;

          text-align: center;

          background: #fff;
        }

        .details-summary span {
          display: block;

          color: #87928b;

          font-size: 6px;
        }

        .details-summary strong {
          display: block;

          margin-top: 2px;

          color: #0f5132;

          font-size: 16px;
        }

        .details-body {
          padding:
            0 12px 12px;
        }

        .source-record {
          display: grid;

          grid-template-columns:
            30px
            minmax(0,1fr);

          gap: 8px;

          margin-bottom: 7px;
          padding: 10px;

          border:
            1px solid #e5ebe7;

          border-radius: 12px;

          background: #fff;
        }

        .source-number {
          width: 28px;
          height: 28px;

          border-radius: 9px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #0f5132;
          background: #edf7f1;

          font-size: 8px;
          font-weight: 900;
        }

        .source-main {
          min-width: 0;
        }

        .source-date {
          margin-bottom: 7px;
        }

        .source-date strong {
          display: block;

          color: #33443a;

          font-size: 8px;
        }

        .source-date span {
          display: block;

          margin-top: 2px;

          color: #949d97;

          font-size: 6px;
        }

        .source-values {
          display: grid;

          grid-template-columns:
            1.4fr
            .65fr
            .65fr;

          gap: 6px;
        }

        .source-values > div {
          min-width: 0;

          padding: 7px;

          border-radius: 8px;

          background: #f7faf8;
        }

        .source-values span {
          display: block;

          color: #909a93;

          font-size: 6px;
        }

        .source-values strong {
          display: block;

          margin-top: 2px;

          overflow: hidden;

          color: #3c4b42;

          font-size: 7px;

          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .details-empty {
          padding: 35px;

          text-align: center;

          color: #8a958e;

          font-size: 8px;
        }

        .details-footer {
          position: sticky;
          bottom: 0;

          display: flex;
          justify-content: flex-end;

          padding: 10px 12px;

          border-top:
            1px solid #e7ede9;

          background:
            rgba(
              255,
              255,
              255,
              .97
            );
        }

        .details-footer button {
          min-height: 36px;

          padding: 0 15px;

          border: none;
          border-radius: 9px;

          color: #fff;
          background: #0f5132;

          font-size: 7px;
          font-weight: 900;

          cursor: pointer;
        }

        /* =============================================
           EMPTY / LOADING
        ============================================= */

        .monthly-empty {
          padding: 50px 20px;

          border:
            1px dashed #cbd7d0;

          border-radius: 18px;

          text-align: center;

          background: #fff;
        }

        .monthly-empty-icon,
        .monthly-page-loading-icon {
          width: 55px;
          height: 55px;

          margin:
            0 auto 10px;

          border-radius: 16px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #0f5132;
          background: #edf7f1;
        }

        .monthly-empty h3,
        .monthly-page-loading h3 {
          margin: 0;

          color: #35453b;

          font-size: 13px;
        }

        .monthly-empty p,
        .monthly-page-loading p {
          margin: 4px 0 0;

          color: #8d9790;

          font-size: 8px;
        }

        .monthly-inline-loading {
          min-height: 190px;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          gap: 7px;

          color: #718077;

          text-align: center;
        }

        .monthly-inline-loading strong {
          font-size: 9px;
        }

        .monthly-inline-loading span {
          color: #979f9a;

          font-size: 7px;
        }

        .monthly-page-loading {
          min-height: 60vh;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          text-align: center;
        }

        /* =============================================
           ANIMATION
        ============================================= */

        @keyframes monthlySpin {
          to {
            transform:
              rotate(360deg);
          }
        }

        .spin {
          animation:
            monthlySpin
            .8s linear infinite;
        }

        /* =============================================
           TABLET
        ============================================= */

        @media (
          max-width: 1100px
        ) {
          .monthly-stats {
            grid-template-columns:
              repeat(
                3,
                minmax(0,1fr)
              );
          }

          .scope-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .halaqa-summary {
            grid-column:
              1 / -1;
          }

          .student-source-info {
            grid-template-columns:
              1fr 1fr;
          }

          .student-source-info
          button {
            grid-column:
              1 / -1;
          }
        }

        /* =============================================
           MOBILE
        ============================================= */

        @media (
          max-width: 720px
        ) {
          .monthly-hero {
            align-items:
              flex-start;

            padding: 16px;

            border-radius: 19px;
          }

          .monthly-hero-icon {
            width: 42px;
            height: 42px;

            flex-basis: 42px;
          }

          .monthly-hero h1 {
            font-size: 20px;
          }

          .monthly-hero p {
            display: none;
          }

          .monthly-actions {
            gap: 4px;
          }

          .hero-action {
            width: 38px;
            min-height: 38px;

            padding: 0;
          }

          .hero-action span {
            display: none;
          }

          /* PERIOD */

          .period-selector-card {
            grid-template-columns:
              37px
              minmax(0,1fr)
              37px;

            gap: 6px;
          }

          .period-current-area {
            grid-column:
              1 / -1;

            text-align: center;
          }

          .period-icon {
            display: none;
          }

          .period-select-row {
            flex-wrap: wrap;
          }

          .period-select {
            flex: 1;
          }

          .period-select select,
          .period-select.year
          select {
            width: 100%;
            min-width: 0;
          }

          /* SCOPE */

          .scope-grid {
            grid-template-columns:
              1fr;
          }

          .halaqa-summary {
            grid-column: auto;
          }

          /* STATS */

          .monthly-stats {
            grid-template-columns:
              repeat(
                2,
                minmax(0,1fr)
              );

            gap: 7px;
          }

          .monthly-stat {
            padding: 10px;
          }

          /* CARD */

          .student-achievement-card:hover {
            transform: none;
          }

          .student-card-header {
            flex-direction:
              column;
          }

          .student-badges {
            justify-content:
              flex-start;
          }

          .student-source-info {
            grid-template-columns:
              1fr;
          }

          .student-source-info
          button {
            grid-column: auto;
          }

          .achievement-columns {
            grid-template-columns:
              1fr;
          }

          /* MODAL */

          .details-overlay {
            align-items:
              flex-end;

            padding: 7px;
          }

          .details-modal {
            max-height:
              95dvh;

            border-radius:
              21px 21px
              9px 9px;
          }

          .details-summary {
            grid-template-columns:
              1fr 1fr;
          }

          .source-values {
            grid-template-columns:
              1fr;
          }
        }

        /* =============================================
           SMALL MOBILE
        ============================================= */

        @media (
          max-width: 430px
        ) {
          .monthly-hero {
            padding: 13px;
          }

          .monthly-hero h1 {
            font-size: 18px;
          }

          .monthly-hero-icon {
            width: 38px;
            height: 38px;

            flex-basis: 38px;
          }

          .monthly-eyebrow {
            font-size: 7px;
          }

          .monthly-source-note {
            font-size: 7px;
          }

          .monthly-stats {
            grid-template-columns:
              1fr 1fr;
          }

          .monthly-stat-content
          > strong {
            font-size: 15px;
          }

          .details-summary {
            grid-template-columns:
              1fr;
          }
        }

        /* ==========================================
           PRO MAX v3 — إنجاز مختصر + تحليل ذكي
        ========================================== */

        .achievement-grid {
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: 12px;
        }

        .achievement-summary-card {
          position: relative;
          overflow: hidden;
          padding: 15px;
          border: 1px solid #dfe8e4;
          border-radius: 18px;
          background: linear-gradient(180deg,#fff,#fbfdfc);
          box-shadow: 0 10px 26px rgba(8,47,42,.045);
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .achievement-summary-card:hover { transform: translateY(-2px); box-shadow: 0 15px 32px rgba(8,47,42,.075); }
        .achievement-summary-accent { position:absolute; right:0; top:0; width:4px; height:100%; }
        .achievement-summary-accent.done { background:#2e9a71; }
        .achievement-summary-accent.pending { background:#d3a332; }
        .achievement-summary-accent.neutral { background:#9aa7a2; }

        .achievement-summary-header { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
        .student-identity.compact { gap:9px; }
        .student-identity.compact h3 { margin:0; color:#173d33; font-size:14px; font-weight:950; }
        .student-identity.compact span { display:block; margin-top:4px; color:#83938d; font-size:10px; font-weight:750; }
        .compact-avatar { width:40px; height:40px; flex-basis:40px; }

        .monthly-completion-badge {
          min-height:27px; display:inline-flex; align-items:center; gap:5px; padding:0 9px;
          border-radius:999px; font-size:9px; font-weight:900; white-space:nowrap;
        }
        .monthly-completion-badge.done { color:#166534; background:#dcfce7; }
        .monthly-completion-badge.pending { color:#9a5c0c; background:#fff6dc; }
        .monthly-completion-badge.neutral { color:#6b7b75; background:#eef2f0; }

        .achievement-summary-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; }
        .achievement-summary-item { min-height:82px; padding:10px; border:1px solid #e4ebe8; border-radius:12px; background:#fff; }
        .achievement-summary-item > span { display:block; color:#7f9089; font-size:10px; font-weight:800; }
        .achievement-summary-item > strong { display:block; margin-top:5px; color:#183e34; font-size:14px; font-weight:950; }
        .achievement-summary-item > strong small { color:#8a9993; font-size:9px; font-weight:750; }
        .achievement-summary-item > em { display:inline-flex; margin-top:7px; padding:3px 7px; border-radius:999px; font-size:9px; font-style:normal; font-weight:900; }
        .achievement-summary-item.done > em { color:#166534; background:#dcfce7; }
        .achievement-summary-item.pending > em { color:#9a5c0c; background:#fff6dc; }
        .achievement-summary-item.no-plan > em { color:#6b7b75; background:#eef2f0; }

        .smart-delay-summary { display:grid; grid-template-columns:18px 1fr; gap:7px; align-items:start; margin-top:9px; padding:9px 10px; border-radius:11px; }
        .smart-delay-summary.has-delay { border:1px solid #efd9aa; background:#fffaf0; color:#906d16; }
        .smart-delay-summary.clear { border:1px solid #d5eadf; background:#f2faf6; color:#197052; }
        .smart-delay-summary span { display:block; font-size:9px; font-weight:800; opacity:.78; }
        .smart-delay-summary strong { display:block; margin-top:3px; font-size:10px; line-height:1.55; font-weight:900; }

        .achievement-summary-footer { display:flex; align-items:center; justify-content:space-between; gap:9px; margin-top:10px; padding-top:10px; border-top:1px solid #edf1ef; }
        .achievement-summary-footer > div { display:flex; align-items:center; gap:5px; color:#778982; font-size:10px; font-weight:750; }
        .achievement-summary-footer button { min-height:35px; display:inline-flex; align-items:center; gap:5px; padding:0 12px; border:0; border-radius:9px; background:#0f4c45; color:#fff; font-family:inherit; font-size:10px; font-weight:900; cursor:pointer; }

        .details-smart-analysis { margin:12px 16px 0; padding:12px; border:1px solid #eadca9; border-radius:13px; background:#fffaf0; }
        .details-analysis-head { display:flex; align-items:flex-start; gap:8px; color:#876715; }
        .details-analysis-head span { display:block; font-size:9px; font-weight:800; }
        .details-analysis-head strong { display:block; margin-top:3px; font-size:11px; line-height:1.6; font-weight:950; }
        .details-analysis-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-top:10px; }
        .details-analysis-grid > div { padding:8px; border-radius:9px; background:rgba(255,255,255,.65); text-align:center; }
        .details-analysis-grid span { display:block; color:#948254; font-size:8px; }
        .details-analysis-grid strong { display:block; margin-top:3px; color:#695317; font-size:13px; font-weight:950; }

        .details-manual-area { margin:12px 16px; padding:13px; border:1px solid #dde7e3; border-radius:14px; background:#fbfdfc; }
        .details-manual-heading { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; color:#0f4c45; }
        .details-manual-heading span { display:block; color:#83928c; font-size:9px; font-weight:800; }
        .details-manual-heading strong { display:block; margin-top:2px; color:#25483f; font-size:11px; font-weight:950; }
        .detail-edit-columns { margin:0; }
        .detail-notes { margin-top:10px; }

        .hero-action.pdf { color:#7c5d13; background:#fff8df; border-color:#eadca7; }

        /* رفع المقروئية في الصفحة الحالية */
        .monthly-achievement-page .hero-main h1 { font-size:28px; }
        .monthly-achievement-page .hero-main p { font-size:13px; line-height:1.75; }
        .monthly-achievement-page .monthly-source-note strong,
        .monthly-achievement-page .scope-heading strong,
        .monthly-achievement-page .students-heading h2 { font-size:14px; }
        .monthly-achievement-page .monthly-source-note span,
        .monthly-achievement-page .scope-heading span,
        .monthly-achievement-page .students-heading p { font-size:10px; line-height:1.6; }
        .monthly-achievement-page input,
        .monthly-achievement-page select,
        .monthly-achievement-page textarea { font-size:12px; }

        @media (max-width:700px) {
          .achievement-grid { grid-template-columns:1fr; }
          .details-analysis-grid { grid-template-columns:1fr 1fr; }
          .achievement-summary-grid { grid-template-columns:1fr 1fr; }
          .detail-edit-columns { grid-template-columns:1fr; }
        }
        @media (max-width:430px) {
          .achievement-summary-header { flex-direction:column; }
          .achievement-summary-grid { grid-template-columns:1fr; }
        }


        /* =============================================
           ADMIN RESPONSIVE REFINEMENT
        ============================================= */
        @media (max-width: 1180px) {
          .monthly-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .scope-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .halaqa-summary {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .monthly-achievement-page {
            padding: 9px;
          }

          .monthly-hero {
            align-items: stretch;
            flex-direction: column;
            padding: 14px;
            border-radius: 17px;
          }

          .monthly-hero-icon {
            width: 42px;
            height: 42px;
            flex-basis: 42px;
            border-radius: 13px;
          }

          .monthly-hero h1 {
            font-size: 20px;
          }

          .monthly-actions {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .hero-action {
            width: 100%;
            min-height: 38px;
            padding: 0 7px;
          }

          .period-selector-card {
            grid-template-columns: 34px minmax(0,1fr) 34px;
            padding: 10px;
          }

          .period-current-area {
            grid-column: 1 / -1;
            grid-row: 2;
            text-align: center;
          }

          .period-main {
            align-items: flex-start;
          }

          .period-icon {
            display: none;
          }

          .period-select-row {
            flex-wrap: wrap;
          }

          .period-select,
          .period-select select,
          .period-select.year select {
            min-width: 0;
            width: 100%;
          }

          .period-select-row > * {
            flex: 1 1 120px;
          }

          .scope-grid {
            grid-template-columns: 1fr;
          }

          .halaqa-summary {
            grid-column: auto;
          }

          .monthly-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px;
          }

          .monthly-stat {
            min-height: 76px;
            padding: 9px;
            border-radius: 13px;
          }

          .monthly-stat-icon {
            width: 31px;
            height: 31px;
            flex-basis: 31px;
          }

          .achievement-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 430px) {
          .monthly-actions {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .monthly-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .monthly-stat small {
            display: none;
          }

          .period-selector-card {
            gap: 6px;
          }

          .period-arrow {
            width: 32px;
            height: 36px;
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .monthly-stat,
          .hero-action,
          .student-achievement-card {
            transition:
              transform .18s ease,
              box-shadow .18s ease,
              border-color .18s ease;
          }

          .monthly-stat:hover,
          .student-achievement-card:hover {
            transform: translateY(-2px);
          }

          .hero-action:hover:not(:disabled) {
            transform: translateY(-1px);
          }
        }

      `}
    </style>
  );
}
