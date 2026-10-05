import {displayDateFormatter} from "../lib/calendar";
import {monthRange} from "../lib/calendar";
import { supabase } from "../lib/supabase";

function localDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

function makeLast30Days() {
  const days = [];

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = localDateKey(date);

    days.push({
      key,
      label: displayDateFormatter( {
        timeZone: "Asia/Riyadh",
        day: "numeric",
        month: "short",
      }).format(date),
    });
  }

  return days;
}

function ensureNoError(error, label) {
  if (error) {
    console.error(label, error);
    throw error;
  }
}

export async function getTeacherAssignments() {
  const { data, error } = await supabase.rpc("get_my_teacher_assignments");
  ensureNoError(error, "get_my_teacher_assignments");

  return Array.isArray(data) ? data : [];
}

export async function getTeacherDashboardData({ teacherId, halaqaId }) {
  const today = localDateKey();
  const fromDate = dateDaysAgo(29);
  const monthStart = monthRange(today, "hijri").start;

  const [
    studentsResult,
    attendanceResult,
    recitationsResult,
    examsResult,
    monthlyResult,
  ] = await Promise.all([
    supabase
      .from("student_halaqat")
      .select("student_id")
      .eq("halaqa_id", halaqaId)
      .eq("is_current", true),

    supabase
      .from("attendance")
      .select("id, student_id, attendance_date, status")
      .eq("halaqa_id", halaqaId)
      .gte("attendance_date", fromDate)
      .lte("attendance_date", today),

    supabase
      .from("recitations")
      .select(
        "id, student_id, recitation_date, from_surah, to_surah, lesson_evaluation, points"
      )
      .eq("halaqa_id", halaqaId)
      .gte("recitation_date", fromDate)
      .lte("recitation_date", today)
      .order("recitation_date", { ascending: false })
      .limit(120),

    supabase
      .from("exams")
      .select("id")
      .eq("teacher_id", teacherId),

    supabase
      .from("monthly_progress")
      .select(
        "id, student_id, memorization_completed, revision_completed, approved, progress_month"
      )
      .eq("teacher_id", teacherId)
      .eq("halaqa_id", halaqaId)
      .eq("progress_month", monthStart),
  ]);

  ensureNoError(studentsResult.error, "teacher dashboard students");
  ensureNoError(attendanceResult.error, "teacher dashboard attendance");
  ensureNoError(recitationsResult.error, "teacher dashboard recitations");
  ensureNoError(examsResult.error, "teacher dashboard exams");
  ensureNoError(monthlyResult.error, "teacher dashboard monthly");

  const studentIds = [
    ...new Set((studentsResult.data ?? []).map((row) => row.student_id)),
  ];

  let profiles = [];
  if (studentIds.length) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, total_points")
      .in("id", studentIds);

    ensureNoError(error, "teacher dashboard student profiles");
    profiles = data ?? [];
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const students = studentIds.map((studentId) => ({
    student_id: studentId,
    profile: profileMap.get(studentId) ?? null,
  }));

  const attendance = attendanceResult.data ?? [];
  const recitations = recitationsResult.data ?? [];
  const monthlyProgress = monthlyResult.data ?? [];

  const todayAttendance = attendance.filter(
    (row) => row.attendance_date === today
  );
  const todayRecitations = recitations.filter(
    (row) => row.recitation_date === today
  );

  const presentCount = todayAttendance.filter(
    (row) => row.status === "present" || row.status === "late"
  ).length;

  const absentCount = todayAttendance.filter(
    (row) => row.status === "absent"
  ).length;

  const excusedCount = todayAttendance.filter(
    (row) => row.status === "excused"
  ).length;

  const monthlyCompleted = monthlyProgress.filter(
    (row) => row.memorization_completed && row.revision_completed
  ).length;

  const achievementRate = monthlyProgress.length
    ? Math.round((monthlyCompleted / monthlyProgress.length) * 100)
    : 0;

  const stats = {
    studentsCount: students.length,
    presentCount,
    absentCount,
    excusedCount,
    attendanceRecordedCount: todayAttendance.length,
    recitationsCount: todayRecitations.length,
    examsCount: (examsResult.data ?? []).length,
    achievementRate,
  };

  const dayTemplate = makeLast30Days();

  const attendanceChart = dayTemplate.map((day) => {
    const rows = attendance.filter(
      (row) => row.attendance_date === day.key
    );

    const attended = rows.filter(
      (row) => row.status === "present" || row.status === "late"
    ).length;

    return {
      date: day.label,
      attendance: rows.length
        ? Math.round((attended / rows.length) * 100)
        : 0,
      recorded: rows.length,
    };
  });

  const recitationChart = dayTemplate.map((day) => ({
    date: day.label,
    recitations: recitations.filter(
      (row) => row.recitation_date === day.key
    ).length,
  }));

  const topStudents = students
    .map((student) => ({
      student_id: student.student_id,
      full_name: student.profile?.full_name || "طالب",
      total_points: Number(student.profile?.total_points || 0),
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 5);

  const latestRecitations = recitations.slice(0, 8).map((item) => ({
    ...item,
    student_name:
      profileMap.get(item.student_id)?.full_name || "طالب",
  }));

  const alerts = [];

  if (students.length > 0 && todayAttendance.length === 0) {
    alerts.push({
      id: "attendance-not-recorded",
      type: "attendance_missing",
      title: "الحضور لم يُسجل اليوم",
      message: "ابدأ الحضور الآن حتى تكون بيانات الحلقة مكتملة.",
      actionPath: "/teacher/attendance",
      actionLabel: "تسجيل الحضور",
    });
  }

  if (absentCount > 0) {
    alerts.push({
      id: "today-absences",
      type: "absent",
      title: "غياب يحتاج متابعة",
      message: `يوجد ${absentCount} طالب${absentCount === 1 ? "" : "اً"} مسجل كغائب اليوم.`,
      actionPath: "/teacher/attendance",
      actionLabel: "عرض الحضور",
    });
  }

  if (students.length > 0 && todayRecitations.length === 0) {
    alerts.push({
      id: "recitations-empty",
      type: "recitation_delay",
      title: "لا توجد تسميعات اليوم",
      message: "لم يتم تسجيل أي تسميع في الحلقة حتى الآن.",
      actionPath: "/teacher/recitations",
      actionLabel: "إضافة تسميع",
    });
  }

  if (monthlyProgress.length > 0 && achievementRate < 70) {
    alerts.push({
      id: "monthly-progress",
      type: "monthly_plan",
      title: "الإنجاز الشهري يحتاج متابعة",
      message: `نسبة اكتمال خطط هذا الشهر ${achievementRate}٪.`,
      actionPath: "/teacher/monthly-achievement",
      actionLabel: "فتح الإنجاز",
    });
  }

  return {
    stats,
    attendanceChart,
    recitationChart,
    topStudents,
    latestRecitations,
    alerts,
  };
}
