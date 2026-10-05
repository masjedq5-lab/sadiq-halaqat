import {displayDateFormatter} from "../../lib/calendar";
import {monthRange, weekRange, formatDate} from "../../lib/calendar";
import {withSideLessonMetrics,formatSideLessonTotal} from "../../lib/sideLesson";
import { supabase } from "../../lib/supabase";

const HALAQA_PERIODS = {
  after_fajr: "بعد الفجر",
  after_dhuhr: "بعد الظهر",
  after_asr: "بعد العصر",
  after_maghrib: "بعد المغرب",
  after_isha: "بعد العشاء",
};

export function todayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return todayKey(date);
}

export function currentMonthStart() {
  return monthRange(todayKey()).start;
}

export function formatGregorian(value) {
  if (!value) return "—";
  try {
    return displayDateFormatter( {
      timeZone: "Asia/Riyadh",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
  } catch {
    return String(value);
  }
}

export function formatHijri(value) {
  if (!value) return "—";
  try {
    return displayDateFormatter( {
      timeZone: "Asia/Riyadh",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
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

export function formatFaces(value) {
  const number = Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  if (Number.isInteger(number)) return String(number);
  return number.toFixed(2).replace(/\.?0+$/, "");
}

export function getPeriodLabel(filters) {
  if (!filters?.fromDate && !filters?.toDate) return "كل الفترات";
  if (filters.fromDate && filters.toDate) {
    return `${formatDate(filters.fromDate)} — ${formatDate(filters.toDate)}`;
  }
  if (filters.fromDate) return `من ${formatDate(filters.fromDate)}`;
  return `حتى ${formatDate(filters.toDate)}`;
}

export function getQuickRange(preset) {
  const today = todayKey();
  if (preset === "today") return { fromDate: today, toDate: today };
  if (preset === "7") return { fromDate: dateDaysAgo(6), toDate: today };
  if (preset === "30") return { fromDate: dateDaysAgo(29), toDate: today };
  if (preset === "week") return { fromDate: weekRange(today).start, toDate: today };
  if (preset === "month") return { fromDate: currentMonthStart(), toDate: today };
  return { fromDate: "", toDate: "" };
}

function uniqueNumbers(values) {
  return [...new Set((values || []).map(Number).filter(Boolean))];
}

function mapById(rows) {
  return new Map((rows || []).map((row) => [Number(row.id), row]));
}

function mainTeacherIdForHalaqa(scope, halaqaId) {
  const link = scope.teacherLinks.find(
    (item) => Number(item.halaqa_id) === Number(halaqaId) && item.role === "main"
  );

  if (link?.teacher_id) return Number(link.teacher_id);

  const halaqa = scope.halaqaMap.get(Number(halaqaId));
  return Number(halaqa?.main_teacher_id || 0) || null;
}

function teacherNameForStudentLink(scope, link) {
  const teacherId = Number(link?.teacher_id || 0) || mainTeacherIdForHalaqa(scope, link?.halaqa_id);
  return scope.profileMap.get(Number(teacherId))?.full_name || "غير محدد";
}

function normalizeEvaluation(value) {
  return String(value || "").trim().toLowerCase();
}

function isRepeat(value) {
  const text = normalizeEvaluation(value);
  return text.includes("إعادة") || text.includes("اعادة") || text.includes("repeat");
}

function recitationLessonFaces(row) {
  if (row?.lesson_faces_manual !== null && row?.lesson_faces_manual !== undefined) {
    return Number(row.lesson_faces_manual || 0);
  }

  if (row?.lesson_faces !== null && row?.lesson_faces !== undefined) {
    return Number(row.lesson_faces || 0);
  }

  if (row?.lesson_amount_value !== null && row?.lesson_amount_value !== undefined) {
    const value = Number(row.lesson_amount_value || 0);
    return row.lesson_amount_unit === "lines" ? value / 15 : value;
  }

  return 0;
}

async function getProfiles(ids) {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,full_name,user_number,phone,guardian_phone,parent_phone,role,status,is_active"
    )
    .in("id", ids);

  if (error) throw error;
  return data || [];
}

export async function loadReportScope() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("AUTH_REQUIRED");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,full_name,user_number,role,status,is_active")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError) throw profileError;

  let mosqueIds = [];
  let halaqat = [];
  let mosques = [];

  if (profile.role === "teacher") {
    const { data: links, error } = await supabase
      .from("teacher_halaqat")
      .select("halaqa_id")
      .eq("teacher_id", profile.id);

    if (error) throw error;

    const halaqaIds = uniqueNumbers((links || []).map((row) => row.halaqa_id));

    if (halaqaIds.length) {
      const { data, error: halaqaError } = await supabase
        .from("halaqat")
        .select(
          "id,name,mosque_id,main_teacher_id,assistant_teacher_id,capacity,status,halaqa_period,description"
        )
        .in("id", halaqaIds)
        .order("name");

      if (halaqaError) throw halaqaError;
      halaqat = data || [];
      mosqueIds = uniqueNumbers(halaqat.map((row) => row.mosque_id));
    }
  } else if (profile.role === "supervisor") {
    const { data: links, error } = await supabase
      .from("mosque_supervisors")
      .select("mosque_id")
      .eq("supervisor_id", profile.id);

    if (error) throw error;
    mosqueIds = uniqueNumbers((links || []).map((row) => row.mosque_id));

    if (mosqueIds.length) {
      const { data, error: halaqaError } = await supabase
        .from("halaqat")
        .select(
          "id,name,mosque_id,main_teacher_id,assistant_teacher_id,capacity,status,halaqa_period,description"
        )
        .in("mosque_id", mosqueIds)
        .order("name");

      if (halaqaError) throw halaqaError;
      halaqat = data || [];
    }
  } else {
    const [{ data: mosqueRows, error: mosqueError }, { data: halaqaRows, error: halaqaError }] =
      await Promise.all([
        supabase.from("mosques").select("id,name,address").order("name"),
        supabase
          .from("halaqat")
          .select(
            "id,name,mosque_id,main_teacher_id,assistant_teacher_id,capacity,status,halaqa_period,description"
          )
          .order("name"),
      ]);

    if (mosqueError) throw mosqueError;
    if (halaqaError) throw halaqaError;

    mosques = mosqueRows || [];
    halaqat = halaqaRows || [];
    mosqueIds = uniqueNumbers(mosques.map((row) => row.id));
  }

  if (!mosques.length && mosqueIds.length) {
    const { data, error } = await supabase
      .from("mosques")
      .select("id,name,address")
      .in("id", mosqueIds)
      .order("name");

    if (error) throw error;
    mosques = data || [];
  }

  const halaqaIds = uniqueNumbers(halaqat.map((row) => row.id));

  let teacherLinks = [];
  let studentLinks = [];

  if (halaqaIds.length) {
    const [teachersResult, studentsResult] = await Promise.all([
      supabase
        .from("teacher_halaqat")
        .select("teacher_id,halaqa_id,role")
        .in("halaqa_id", halaqaIds),
      supabase
        .from("student_halaqat")
        .select("student_id,halaqa_id,teacher_id,is_current,start_date,end_date")
        .in("halaqa_id", halaqaIds)
        .eq("is_current", true),
    ]);

    if (teachersResult.error) throw teachersResult.error;
    if (studentsResult.error) throw studentsResult.error;

    teacherLinks = teachersResult.data || [];
    studentLinks = studentsResult.data || [];
  }

  const profileIds = uniqueNumbers([
    profile.id,
    ...teacherLinks.map((row) => row.teacher_id),
    ...studentLinks.map((row) => row.student_id),
    ...studentLinks.map((row) => row.teacher_id),
    ...halaqat.map((row) => row.main_teacher_id),
    ...halaqat.map((row) => row.assistant_teacher_id),
  ]);

  const profiles = await getProfiles(profileIds);
  const profileMap = mapById(profiles);
  const halaqaMap = mapById(halaqat);
  const mosqueMap = mapById(mosques);

  return {
    profile,
    mode: profile.role === "supervisor" ? "supervisor" : profile.role === "teacher" ? "teacher" : "admin",
    mosques,
    halaqat,
    teacherLinks,
    studentLinks,
    profiles,
    profileMap,
    halaqaMap,
    mosqueMap,
    mosqueIds,
    halaqaIds,
  };
}

export function normalizeReportFilters(filters = {}) {
  const next = { ...filters };
  for (const key of ["mosque", "halaqa", "teacher", "student"]) {
    // Accept the previous single-value shape as well as multiple selections.
    const value = filters[`${key}Ids`] ?? filters[`${key}Id`] ?? [];
    next[`${key}Ids`] = [...new Set((Array.isArray(value) ? value : [value])
      .map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
    delete next[`${key}Id`];
  }
  return next;
}

export function getFilterOptions(scope, inputFilters) {
  const filters = normalizeReportFilters(inputFilters);
  const visibleHalaqat = scope.halaqat.filter((halaqa) =>
    !filters.mosqueIds.length || filters.mosqueIds.includes(Number(halaqa.mosque_id))
  );
  const visibleHalaqaIds = new Set(visibleHalaqat
    .filter((row) => !filters.halaqaIds.length || filters.halaqaIds.includes(Number(row.id)))
    .map((row) => Number(row.id)));
  const studentHalaqaIds = new Set(getAllowedHalaqaIds(scope, filters));

  const teacherIds = uniqueNumbers(
    scope.teacherLinks
      .filter((row) => visibleHalaqaIds.has(Number(row.halaqa_id)))
      .map((row) => row.teacher_id)
  );

  const studentIds = uniqueNumbers(
    scope.studentLinks
      .filter((row) => studentHalaqaIds.has(Number(row.halaqa_id)))
      .map((row) => row.student_id)
  );

  return {
    halaqat: visibleHalaqat,
    teachers: teacherIds
      .map((id) => scope.profileMap.get(Number(id)))
      .filter(Boolean)
      .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "ar")),
    students: studentIds
      .map((id) => scope.profileMap.get(Number(id)))
      .filter(Boolean)
      .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "ar")),
  };
}

export function updateReportFilters(scope, current, key, value) {
  const next = normalizeReportFilters({ ...current, [key]: value });
  // Keep valid choices when a parent selection grows; remove only stale ones.
  if (key === "mosqueIds" || key === "halaqaIds" || key === "teacherIds") {
    if (key === "mosqueIds") {
      const ids = new Set(getFilterOptions(scope, next).halaqat.map((row) => Number(row.id)));
      next.halaqaIds = next.halaqaIds.filter((id) => ids.has(id));
    }
    if (key !== "teacherIds") {
      const ids = new Set(getFilterOptions(scope, next).teachers.map((row) => Number(row.id)));
      next.teacherIds = next.teacherIds.filter((id) => ids.has(id));
    }
    const ids = new Set(getFilterOptions(scope, next).students.map((row) => Number(row.id)));
    next.studentIds = next.studentIds.filter((id) => ids.has(id));
  }
  if (key === "fromDate" || key === "toDate") next.preset = "custom";
  return next;
}

function getAllowedHalaqaIds(scope, filters) {
  let rows = scope.halaqat.slice();

  if (filters.mosqueIds.length) {
    rows = rows.filter((row) => filters.mosqueIds.includes(Number(row.mosque_id)));
  }

  if (filters.halaqaIds.length) {
    rows = rows.filter((row) => filters.halaqaIds.includes(Number(row.id)));
  }

  if (filters.teacherIds.length) {
    const teacherHalaqaIds = new Set(
      scope.teacherLinks
        .filter((row) => filters.teacherIds.includes(Number(row.teacher_id)))
        .map((row) => Number(row.halaqa_id))
    );
    rows = rows.filter((row) => teacherHalaqaIds.has(Number(row.id)));
  }

  return uniqueNumbers(rows.map((row) => row.id));
}

function getCurrentStudentLinks(scope, allowedHalaqaIds, filters) {
  const allowed = new Set(allowedHalaqaIds.map(Number));
  let rows = scope.studentLinks.filter((row) => allowed.has(Number(row.halaqa_id)));

  if (filters.studentIds.length) {
    rows = rows.filter((row) => filters.studentIds.includes(Number(row.student_id)));
  }

  return rows;
}

function applyDateFilters(query, field, filters) {
  let next = query;
  if (filters.fromDate) next = next.gte(field, filters.fromDate);
  if (filters.toDate) next = next.lte(field, filters.toDate);
  return next;
}

function reportMeta(scope, filters) {
  const names = (ids, map, field, fallback) => ids.length
    ? ids.map((id) => map.get(id)?.[field] || `#${id}`).join("، ")
    : fallback;

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: scope.profile.full_name || "—",
    mosqueName: names(filters.mosqueIds, scope.mosqueMap, "name", scope.mode === "teacher" && scope.mosques.length === 1 ? scope.mosques[0]?.name : "كل النطاق المتاح"),
    halaqaName: names(filters.halaqaIds, scope.halaqaMap, "name", "جميع الحلقات"),
    teacherName: names(filters.teacherIds, scope.profileMap, "full_name", scope.mode === "teacher" ? scope.profile.full_name : "جميع المعلمين"),
    studentName: names(filters.studentIds, scope.profileMap, "full_name", "جميع الطلاب"),
    periodLabel: getPeriodLabel(filters),
  };
}

function makeSummary(items) {
  return items.filter(Boolean).slice(0, 4);
}

async function buildStudents(scope, filters, allowedHalaqaIds) {
  const links = getCurrentStudentLinks(scope, allowedHalaqaIds, filters);
  const seen = new Set();
  const rows = [];

  for (const link of links) {
    const studentId = Number(link.student_id);
    if (seen.has(studentId)) continue;
    seen.add(studentId);

    const student = scope.profileMap.get(studentId);
    const halaqa = scope.halaqaMap.get(Number(link.halaqa_id));
    const mosque = scope.mosqueMap.get(Number(halaqa?.mosque_id));

    if (!student || !halaqa) continue;

    rows.push({
      id: studentId,
      name: student.full_name || "طالب",
      number: student.user_number || "—",
      guardianPhone: student.guardian_phone || student.parent_phone || "غير مسجل",
      halaqa: halaqa.name || "—",
      teacher: teacherNameForStudentLink(scope, link),
      mosque: mosque?.name || "—",
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const missingGuardian = rows.filter((row) => row.guardianPhone === "غير مسجل").length;

  return {
    title: "تقرير الطلاب",
    subtitle: "بطاقات مختصرة وواضحة لطلاب النطاق المحدد",
    layout: "students",
    rows,
    summary: makeSummary([
      { label: "عدد الطلاب", value: rows.length, tone: "green" },
      { label: "بجوال ولي أمر", value: rows.length - missingGuardian, tone: "blue" },
      { label: "بدون جوال ولي أمر", value: missingGuardian, tone: missingGuardian ? "gold" : "green" },
      { label: "الحلقات", value: new Set(rows.map((row) => row.halaqa)).size, tone: "teal" },
    ]),
    insights: missingGuardian
      ? [`يوجد ${missingGuardian} طالبًا يحتاج ملفه إلى استكمال جوال ولي الأمر.`]
      : ["بيانات جوال ولي الأمر متوفرة لجميع الطلاب الظاهرين في التقرير."],
  };
}

async function buildAttendance(scope, filters, allowedHalaqaIds) {
  if (!allowedHalaqaIds.length) return emptyReport("تقرير الحضور", "لا توجد حلقات ضمن النطاق الحالي");

  let query = supabase
    .from("attendance")
    .select("student_id,halaqa_id,attendance_date,status,notes")
    .in("halaqa_id", allowedHalaqaIds);

  if (filters.studentIds.length) query = query.in("student_id", filters.studentIds);
  query = applyDateFilters(query, "attendance_date", filters);

  const { data, error } = await query.order("attendance_date", { ascending: false });
  if (error) throw error;

  const groups = new Map();

  for (const item of data || []) {
    const key = `${item.student_id}-${item.halaqa_id}`;
    const current = groups.get(key) || {
      studentId: Number(item.student_id),
      halaqaId: Number(item.halaqa_id),
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
    };

    current.total += 1;
    if (item.status === "present") current.present += 1;
    if (item.status === "absent") current.absent += 1;
    if (item.status === "late") current.late += 1;
    if (item.status === "excused") current.excused += 1;
    groups.set(key, current);
  }

  const rows = [...groups.values()].map((group) => {
    const student = scope.profileMap.get(group.studentId);
    const halaqa = scope.halaqaMap.get(group.halaqaId);
    const mosque = scope.mosqueMap.get(Number(halaqa?.mosque_id));
    const rate = group.total ? Math.round(((group.present + group.late) / group.total) * 100) : 0;
    const absenceTotal = group.absent + group.excused;

    return {
      id: `${group.studentId}-${group.halaqaId}`,
      name: student?.full_name || "طالب",
      number: student?.user_number || "—",
      halaqa: halaqa?.name || "—",
      mosque: mosque?.name || "—",
      present: group.present,
      absent: group.absent,
      excused: group.excused,
      late: group.late,
      total: group.total,
      rate,
      attention: absenceTotal >= 3 || rate < 75,
    };
  });

  rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const totalRecords = rows.reduce((sum, row) => sum + row.total, 0);
  const absentTotal = rows.reduce((sum, row) => sum + row.absent, 0);
  const excusedTotal = rows.reduce((sum, row) => sum + row.excused, 0);
  const attentionCount = rows.filter((row) => row.attention).length;

  return {
    title: "تقرير الحضور",
    subtitle: "ملخص بسيط للحضور والغياب دون تفاصيل مربكة",
    layout: "attendance",
    rows,
    summary: makeSummary([
      { label: "الطلاب", value: rows.length, tone: "green" },
      { label: "سجلات الحضور", value: totalRecords, tone: "blue" },
      { label: "غياب", value: absentTotal, tone: absentTotal ? "red" : "green" },
      { label: "غياب بعذر", value: excusedTotal, tone: "gold" },
    ]),
    insights: attentionCount
      ? [`${attentionCount} طالبًا يحتاجون نظرة متابعة بسبب تكرار الغياب أو انخفاض الحضور.`]
      : ["لا تظهر في الفترة المحددة حالات حضور تحتاج تنبيهًا خاصًا."],
  };
}

async function buildRecitations(scope, filters, allowedHalaqaIds) {
  if (!allowedHalaqaIds.length) return emptyReport("تقرير التسميع", "لا توجد حلقات ضمن النطاق الحالي");

  let quranQuery = supabase.from("recitations").select("*").in("halaqa_id", allowedHalaqaIds);
  if (filters.studentIds.length) quranQuery = quranQuery.in("student_id", filters.studentIds);
  quranQuery = applyDateFilters(quranQuery, "recitation_date", filters);

  let nooraniaQuery = supabase.from("noorania_recitations").select("*").in("halaqa_id", allowedHalaqaIds);
  if (filters.studentIds.length) nooraniaQuery = nooraniaQuery.in("student_id", filters.studentIds);
  nooraniaQuery = applyDateFilters(nooraniaQuery, "recitation_date", filters);

  const [quranResult, nooraniaResult] = await Promise.all([quranQuery, nooraniaQuery]);
  if (quranResult.error) throw quranResult.error;

  const quranRows = await withSideLessonMetrics(supabase,quranResult.data || []);
  const nooraniaRows = nooraniaResult.error ? [] : await withSideLessonMetrics(supabase,nooraniaResult.data || [],"noorania");
  const groups = new Map();

  function ensure(studentId, halaqaId) {
    const key = `${studentId}-${halaqaId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        studentId: Number(studentId),
        halaqaId: Number(halaqaId),
        quranSessions: 0,
        nooraniaSessions: 0,
        lessonFaces: 0,
        sideLessonFaces: 0,
        reviewFaces: 0,
        repeats: 0,
        lastDate: null,
      });
    }
    return groups.get(key);
  }

  for (const row of quranRows) {
    const item = ensure(row.student_id, row.halaqa_id);
    item.sideLessonFaces += Number(row._side_lesson_accepted_faces || 0);
    item.quranSessions += 1;
    item.lessonFaces += recitationLessonFaces(row);
    item.reviewFaces += Number(row.review_faces || 0);
    if (isRepeat(row.lesson_evaluation) || isRepeat(row.review_evaluation) || isRepeat(row.next_evaluation) || isRepeat(row.next2_evaluation)) item.repeats += 1;
    if (!item.lastDate || row.recitation_date > item.lastDate) item.lastDate = row.recitation_date;
  }

  for (const row of nooraniaRows) {
    const item = ensure(row.student_id, row.halaqa_id);
    item.sideLessonFaces += Number(row._side_lesson_accepted_faces || 0);
    item.nooraniaSessions += 1;
    item.lessonFaces += Number(row.lesson_faces || 0);
    item.reviewFaces += Number(row.revision_faces || 0);
    if (
      isRepeat(row.lesson_evaluation) ||
      isRepeat(row.side_lesson_evaluation) ||
      isRepeat(row.revision_evaluation)
    ) {
      item.repeats += 1;
    }
    if (!item.lastDate || row.recitation_date > item.lastDate) item.lastDate = row.recitation_date;
  }

  const rows = [...groups.values()].map((group) => {
    const student = scope.profileMap.get(group.studentId);
    const halaqa = scope.halaqaMap.get(group.halaqaId);
    const mosque = scope.mosqueMap.get(Number(halaqa?.mosque_id));

    return {
      id: `${group.studentId}-${group.halaqaId}`,
      name: student?.full_name || "طالب",
      number: student?.user_number || "—",
      halaqa: halaqa?.name || "—",
      mosque: mosque?.name || "—",
      quranSessions: group.quranSessions,
      nooraniaSessions: group.nooraniaSessions,
      sessions: group.quranSessions + group.nooraniaSessions,
      lessonFaces: Math.round(group.lessonFaces * 100) / 100,
      sideLessonFaces: group.sideLessonFaces,
      sideLinesPerFace: group.quranSessions && group.nooraniaSessions ? 0 : group.nooraniaSessions ? 10 : 15,
      reviewFaces: Math.round(group.reviewFaces * 100) / 100,
      repeats: group.repeats,
      lastDate: group.lastDate,
    };
  });

  rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const sessions = rows.reduce((sum, row) => sum + row.sessions, 0);
  const repeats = rows.reduce((sum, row) => sum + row.repeats, 0);

  return {
    title: "تقرير التسميع",
    subtitle: "صورة مختصرة عن نشاط التسميع والإنجاز والإعادات",
    layout: "recitations",
    rows,
    summary: makeSummary([
      { label: "الطلاب", value: rows.length, tone: "green" },
      { label: "جلسات التسميع", value: sessions, tone: "blue" },
      { label: "إجمالي الحفظ", value: `${formatFaces(rows.reduce((s, r) => s + r.lessonFaces, 0))} صفحة`, tone: "teal" },
      { label: "الإعادات", value: repeats, tone: repeats ? "gold" : "green" },
    ]),
    insights: repeats
      ? [`سُجلت ${repeats} حالة إعادة في الفترة، ويمكن مراجعة الطلاب ذوي الإعادات المتكررة.`]
      : ["لا توجد إعادات مسجلة في التسميع خلال الفترة المحددة."],
  };
}

async function buildHalaqat(scope, filters, allowedHalaqaIds) {
  const allowed = new Set(allowedHalaqaIds.map(Number));
  const rows = scope.halaqat
    .filter((halaqa) => allowed.has(Number(halaqa.id)))
    .map((halaqa) => {
      const studentsCount = scope.studentLinks.filter(
        (item) => Number(item.halaqa_id) === Number(halaqa.id)
      ).length;
      const mainTeacherId = mainTeacherIdForHalaqa(scope, halaqa.id);
      return {
        id: Number(halaqa.id),
        name: halaqa.name || "حلقة",
        mosque: scope.mosqueMap.get(Number(halaqa.mosque_id))?.name || "—",
        mainTeacher: scope.profileMap.get(Number(mainTeacherId))?.full_name || "غير محدد",
        studentsCount,
        capacity: halaqa.capacity ?? "—",
        period: HALAQA_PERIODS[halaqa.halaqa_period] || "غير محدد",
        status: halaqa.status || "active",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const withoutTeacher = rows.filter((row) => row.mainTeacher === "غير محدد").length;

  return {
    title: "تقرير الحلقات",
    subtitle: "الحلقات والمعلمون والطلاب في صورة تشغيلية سهلة",
    layout: "halaqat",
    rows,
    summary: makeSummary([
      { label: "الحلقات", value: rows.length, tone: "green" },
      { label: "الطلاب", value: rows.reduce((s, r) => s + r.studentsCount, 0), tone: "blue" },
      { label: "بدون معلم رئيسي", value: withoutTeacher, tone: withoutTeacher ? "gold" : "green" },
      { label: "المساجد", value: new Set(rows.map((row) => row.mosque)).size, tone: "teal" },
    ]),
    insights: withoutTeacher
      ? [`يوجد ${withoutTeacher} حلقة بدون معلم رئيسي محدد.`]
      : ["جميع الحلقات الظاهرة لديها معلم رئيسي محدد."],
  };
}

async function buildTeachers(scope, filters, allowedHalaqaIds) {
  const allowed = new Set(allowedHalaqaIds.map(Number));
  const teacherIds = uniqueNumbers(
    scope.teacherLinks.filter((row) => allowed.has(Number(row.halaqa_id))).map((row) => row.teacher_id)
  );

  let rows = teacherIds.map((teacherId) => {
    const profile = scope.profileMap.get(Number(teacherId));
    const links = scope.teacherLinks.filter(
      (row) => Number(row.teacher_id) === Number(teacherId) && allowed.has(Number(row.halaqa_id))
    );
    const halaqat = links.map((row) => scope.halaqaMap.get(Number(row.halaqa_id))).filter(Boolean);
    const halaqaIds = new Set(halaqat.map((row) => Number(row.id)));
    const studentsCount = new Set(
      scope.studentLinks.filter((row) => halaqaIds.has(Number(row.halaqa_id))).map((row) => Number(row.student_id))
    ).size;

    return {
      id: Number(teacherId),
      name: profile?.full_name || "معلم",
      number: profile?.user_number || "—",
      halaqat: halaqat.map((row) => row.name).join("، ") || "—",
      mosques: [...new Set(halaqat.map((row) => scope.mosqueMap.get(Number(row.mosque_id))?.name).filter(Boolean))].join("، ") || "—",
      studentsCount,
    };
  });

  if (filters.teacherIds.length) rows = rows.filter((row) => filters.teacherIds.includes(Number(row.id)));
  rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return {
    title: "تقرير المعلمين",
    subtitle: "عرض مختصر للمعلمين والحلقات المرتبطة بهم",
    layout: "teachers",
    rows,
    summary: makeSummary([
      { label: "المعلمون", value: rows.length, tone: "green" },
      { label: "الطلاب", value: rows.reduce((s, r) => s + r.studentsCount, 0), tone: "blue" },
      { label: "الحلقات المرتبطة", value: new Set(scope.teacherLinks.filter((r) => allowed.has(Number(r.halaqa_id)) && rows.some((teacher) => teacher.id === Number(r.teacher_id))).map((r) => Number(r.halaqa_id))).size, tone: "teal" },
    ]),
    insights: rows.length ? ["يعرض التقرير المعلمين ضمن مساجد وحلقات نطاق المشرف فقط."] : [],
  };
}

async function buildMyMosques(scope, filters) {
  let mosques = scope.mosques.slice();
  if (filters.mosqueIds.length) mosques = mosques.filter((row) => filters.mosqueIds.includes(Number(row.id)));

  const rows = mosques.map((mosque) => {
    const halaqat = scope.halaqat.filter((row) => Number(row.mosque_id) === Number(mosque.id));
    const halaqaIds = new Set(halaqat.map((row) => Number(row.id)));
    const students = new Set(scope.studentLinks.filter((row) => halaqaIds.has(Number(row.halaqa_id))).map((row) => Number(row.student_id)));
    const teachers = new Set(scope.teacherLinks.filter((row) => halaqaIds.has(Number(row.halaqa_id))).map((row) => Number(row.teacher_id)));

    return {
      id: Number(mosque.id),
      name: mosque.name || "مسجد",
      address: mosque.address || "العنوان غير مسجل",
      halaqatCount: halaqat.length,
      studentsCount: students.size,
      teachersCount: teachers.size,
    };
  });

  rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return {
    title: "مساجدي",
    subtitle: "نظرة تنفيذية على المساجد المسندة للمشرف",
    layout: "mosques",
    rows,
    summary: makeSummary([
      { label: "المساجد", value: rows.length, tone: "green" },
      { label: "الحلقات", value: rows.reduce((s, r) => s + r.halaqatCount, 0), tone: "blue" },
      { label: "المعلمون", value: rows.reduce((s, r) => s + r.teachersCount, 0), tone: "teal" },
      { label: "الطلاب", value: rows.reduce((s, r) => s + r.studentsCount, 0), tone: "gold" },
    ]),
    insights: rows.length ? ["هذه الصفحة تعرض فقط المساجد المرتبطة بحساب المشرف الحالي."] : [],
  };
}

async function buildMonthlyProgress(scope, filters, allowedHalaqaIds) {
  if (!allowedHalaqaIds.length) return emptyReport("تقرير الإنجاز الشهري", "لا توجد حلقات ضمن النطاق الحالي");

  let query = supabase.from("monthly_progress").select("*").in("halaqa_id", allowedHalaqaIds);
  if (filters.studentIds.length) query = query.in("student_id", filters.studentIds);
  query = applyDateFilters(query, "progress_month", filters);

  const { data, error } = await query.order("progress_month", { ascending: false });
  if (error) throw error;

  const rows = (data || []).map((item) => {
    const student = scope.profileMap.get(Number(item.student_id));
    const halaqa = scope.halaqaMap.get(Number(item.halaqa_id));
    const mosque = scope.mosqueMap.get(Number(halaqa?.mosque_id));
    const memorization = Number(
      item.final_memorization_faces ?? item.memorization_pages ?? item.memorization_faces ?? 0
    );
    const revision = Number(item.final_revision_faces ?? item.revision_pages ?? item.revision_faces ?? 0);

    return {
      id: Number(item.id),
      name: student?.full_name || "طالب",
      number: student?.user_number || "—",
      halaqa: halaqa?.name || "—",
      mosque: mosque?.name || "—",
      month: item.progress_month,
      memorization,
      revision,
      approved: Boolean(item.approved),
      delayReason: item.delay_reason || item.notes || "—",
    };
  });

  const approved = rows.filter((row) => row.approved).length;

  return {
    title: "تقرير الإنجاز الشهري",
    subtitle: "ملخص الحفظ والمراجعة وحالة الاعتماد",
    layout: "monthly",
    rows,
    summary: makeSummary([
      { label: "السجلات", value: rows.length, tone: "green" },
      { label: "معتمد", value: approved, tone: "blue" },
      { label: "غير معتمد", value: rows.length - approved, tone: rows.length - approved ? "gold" : "green" },
      { label: "إجمالي الحفظ", value: `${formatFaces(rows.reduce((s, r) => s + r.memorization, 0))} صفحة`, tone: "teal" },
    ]),
    insights: rows.length - approved
      ? [`يوجد ${rows.length - approved} سجل إنجاز غير معتمد في الفترة المحددة.`]
      : rows.length
        ? ["جميع سجلات الإنجاز الظاهرة معتمدة."]
        : [],
  };
}

async function buildFull(scope, filters, allowedHalaqaIds) {
  const studentLinks = getCurrentStudentLinks(scope, allowedHalaqaIds, filters);
  const studentIds = uniqueNumbers(studentLinks.map((row) => row.student_id));
  const teacherIds = uniqueNumbers(
    scope.teacherLinks.filter((row) => allowedHalaqaIds.includes(Number(row.halaqa_id)) && (!filters.teacherIds.length || filters.teacherIds.includes(Number(row.teacher_id)))).map((row) => row.teacher_id)
  );

  let attendance = [];
  let recitations = [];

  if (allowedHalaqaIds.length) {
    let attendanceQuery = supabase.from("attendance").select("id,status").in("halaqa_id", allowedHalaqaIds);
    if (filters.studentIds.length) attendanceQuery = attendanceQuery.in("student_id", filters.studentIds);
    attendanceQuery = applyDateFilters(attendanceQuery, "attendance_date", filters);

    let recitationQuery = supabase.from("recitations").select("id,lesson_evaluation").in("halaqa_id", allowedHalaqaIds);
    if (filters.studentIds.length) recitationQuery = recitationQuery.in("student_id", filters.studentIds);
    recitationQuery = applyDateFilters(recitationQuery, "recitation_date", filters);

    const [attendanceResult, recitationsResult] = await Promise.all([attendanceQuery, recitationQuery]);
    if (attendanceResult.error) throw attendanceResult.error;
    if (recitationsResult.error) throw recitationsResult.error;
    attendance = attendanceResult.data || [];
    recitations = recitationsResult.data || [];
  }

  const absent = attendance.filter((row) => row.status === "absent").length;
  const excused = attendance.filter((row) => row.status === "excused").length;
  const repeats = recitations.filter((row) => isRepeat(row.lesson_evaluation)).length;

  const rows = [
    { id: "students", label: "الطلاب", value: studentIds.length, note: "الطلاب الحاليون في النطاق" },
    { id: "teachers", label: "المعلمون", value: teacherIds.length, note: "المعلمون المرتبطون بالحلقات" },
    { id: "halaqat", label: "الحلقات", value: allowedHalaqaIds.length, note: "الحلقات ضمن الفلاتر" },
    { id: "attendance", label: "سجلات الحضور", value: attendance.length, note: `${absent} غياب • ${excused} بعذر` },
    { id: "recitations", label: "جلسات التسميع", value: recitations.length, note: `${repeats} إعادة` },
  ];

  const mosqueIds = new Set(
    scope.halaqat.filter((row) => allowedHalaqaIds.includes(Number(row.id))).map((row) => Number(row.mosque_id))
  );

  return {
    title: "التقرير التنفيذي",
    subtitle: "ملخص سريع لصاحب المسجد أو المشرف أو المعلم",
    layout: "full",
    rows,
    summary: makeSummary([
      { label: "المساجد", value: mosqueIds.size, tone: "green" },
      { label: "الحلقات", value: allowedHalaqaIds.length, tone: "blue" },
      { label: "الطلاب", value: studentIds.length, tone: "teal" },
      { label: "التسميعات", value: recitations.length, tone: "gold" },
    ]),
    insights: [
      absent + excused > 0
        ? `سُجل ${absent + excused} حالة غياب في الفترة (${absent} بدون عذر و${excused} بعذر).`
        : "لا توجد حالات غياب في الفترة المحددة.",
      repeats > 0 ? `يوجد ${repeats} حالة إعادة في التسميع تحتاج نظرة متابعة.` : "لا توجد إعادات في التسميع خلال الفترة.",
    ],
  };
}

function emptyReport(title, subtitle) {
  return { title, subtitle, layout: "empty", rows: [], summary: [], insights: [] };
}

export async function buildReport({ type, scope, filters: inputFilters }) {
  const filters = normalizeReportFilters(inputFilters);
  const allowedHalaqaIds = getAllowedHalaqaIds(scope, filters);
  let result;

  if (type === "students") result = await buildStudents(scope, filters, allowedHalaqaIds);
  else if (type === "attendance") result = await buildAttendance(scope, filters, allowedHalaqaIds);
  else if (type === "recitations") result = await buildRecitations(scope, filters, allowedHalaqaIds);
  else if (type === "halaqat") result = await buildHalaqat(scope, filters, allowedHalaqaIds);
  else if (type === "teachers") result = await buildTeachers(scope, filters, allowedHalaqaIds);
  else if (type === "my-mosques") result = await buildMyMosques(scope, filters);
  else if (type === "monthly-progress") result = await buildMonthlyProgress(scope, filters, allowedHalaqaIds);
  else result = await buildFull(scope, filters, allowedHalaqaIds);

  return {
    ...result,
    type,
    meta: reportMeta(scope, filters),
  };
}

export function getExcelRows(report) {
  const rows = report?.rows || [];

  switch (report?.type) {
    case "students":
      return rows.map((row) => ({
        "اسم الطالب": row.name,
        "رقم الطالب": row.number,
        "جوال ولي الأمر": row.guardianPhone,
        "الحلقة": row.halaqa,
        "المعلم": row.teacher,
        "المسجد": row.mosque,
      }));

    case "attendance":
      return rows.map((row) => ({
        "اسم الطالب": row.name,
        "رقم الطالب": row.number,
        "الحلقة": row.halaqa,
        "المسجد": row.mosque,
        "حاضر": row.present,
        "غائب": row.absent,
        "بعذر": row.excused,
        "متأخر": row.late,
        "نسبة الحضور الفعلي": `${row.rate}%`,
      }));

    case "recitations":
      return rows.map((row) => ({
        "اسم الطالب": row.name,
        "رقم الطالب": row.number,
        "الحلقة": row.halaqa,
        "المسجد": row.mosque,
        "جلسات القرآن": row.quranSessions,
        "جلسات القاعدة": row.nooraniaSessions,
        "إجمالي الجلسات": row.sessions,
        "الحفظ - صفحات": row.lessonFaces,
        "المراجعة - صفحات": row.reviewFaces,
        "جنب الدرس": formatSideLessonTotal(row.sideLessonFaces,row.sideLinesPerFace),
        "الإعادات": row.repeats,
        "آخر تسميع": row.lastDate || "—",
      }));

    case "halaqat":
      return rows.map((row) => ({
        "الحلقة": row.name,
        "المسجد": row.mosque,
        "المعلم الرئيسي": row.mainTeacher,
        "عدد الطلاب": row.studentsCount,
        "السعة": row.capacity,
        "الفترة": row.period,
        "الحالة": row.status,
      }));

    case "teachers":
      return rows.map((row) => ({
        "اسم المعلم": row.name,
        "رقم المعلم": row.number,
        "الحلقات": row.halaqat,
        "المساجد": row.mosques,
        "عدد الطلاب": row.studentsCount,
      }));

    case "my-mosques":
      return rows.map((row) => ({
        "المسجد": row.name,
        "العنوان": row.address,
        "الحلقات": row.halaqatCount,
        "المعلمون": row.teachersCount,
        "الطلاب": row.studentsCount,
      }));

    case "monthly-progress":
      return rows.map((row) => ({
        "اسم الطالب": row.name,
        "رقم الطالب": row.number,
        "الحلقة": row.halaqa,
        "المسجد": row.mosque,
        "الشهر": row.month,
        "الحفظ - صفحات": row.memorization,
        "المراجعة - صفحات": row.revision,
        "معتمد": row.approved ? "نعم" : "لا",
        "ملاحظة/سبب": row.delayReason,
      }));

    default:
      return rows.map((row) => ({
        "المؤشر": row.label,
        "القيمة": row.value,
        "التوضيح": row.note,
      }));
  }
}
