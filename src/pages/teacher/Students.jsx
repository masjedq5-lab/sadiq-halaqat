import { displayDateFormatter } from "../../lib/calendar";
import CalendarInput from "../../components/CalendarInput";
import StudentAccessCard from "../../components/security/StudentAccessCard";
import { functionErrorMessage } from "../../lib/functionErrors";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Archive, BookOpen, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCopy, Edit3, Eye, GraduationCap, Loader2, Plus, RefreshCw, RotateCcw, Search, ShieldCheck, Sparkles, Trash2, UserCheck, UserRound, Users, UserX, X } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { showToast } from "../../components/Toast";
import "./Students.css";

/* =========================================================
   Constants
========================================================= */

const DAYS = [
  { value: "saturday", label: "السبت" },
  { value: "sunday", label: "الأحد" },
  { value: "monday", label: "الإثنين" },
  { value: "tuesday", label: "الثلاثاء" },
  { value: "wednesday", label: "الأربعاء" },
  { value: "thursday", label: "الخميس" },
  { value: "friday", label: "الجمعة" },
];

const EDUCATION_STAGES = [
  { value: "primary", label: "ابتدائي" },
  { value: "middle", label: "متوسط" },
  { value: "secondary", label: "ثانوي" },
  { value: "university", label: "جامعي" },
  { value: "other", label: "غير ذلك" },
];

const LEARNING_GOALS = [
  { value: "quran", label: "القرآن الكريم" },
  { value: "noorania", label: "القاعدة النورانية" },
  { value: "noorania_quran", label: "القرآن والقاعدة النورانية" },
  { value: "other", label: "غير ذلك" },
];

const RECITATION_MODES = [
  { value: "regular", label: "حضوري" },
  { value: "remote", label: "عن بُعد" },
  { value: "both", label: "حضوري وعن بُعد" },
];

const GENDERS = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
];

const GUARDIAN_RELATIONS = [
  { value: "الأب", label: "الأب" },
  { value: "الأم", label: "الأم" },
  { value: "الأخ", label: "الأخ" },
  { value: "العم", label: "العم" },
  { value: "الخال", label: "الخال" },
  { value: "الجد", label: "الجد" },
  { value: "ولي آخر", label: "ولي آخر" },
];

const HALAQA_PERIODS = {
  after_fajr: "بعد الفجر",
  after_dhuhr: "بعد الظهر",
  after_asr: "بعد العصر",
  after_maghrib: "بعد المغرب",
  after_isha: "بعد العشاء",
};

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  birth_date: "",
  gender: "",
  nationality: "",
  residence_address: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_relation: "",
  education_stage: "",
  education_grade: "",
  learning_goal: "",
  recitation_mode: "",
  recitation_days: [],
  preferred_recitation_time: "",
  halaqa_id: "",
  notes: "",
};

/* =========================================================
   Helpers
========================================================= */

function normalizeText(value) {
  return String(value ?? "").trim();
}

function getAgeFromBirthDate(value) {
  if (!value) return null;

  const birth = new Date(`${value}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() < birth.getDate());

  if (beforeBirthday) age -= 1;

  return age >= 0 ? age : null;
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function needsFollowUp(lastRecitation) {
  if (!lastRecitation) return true;

  const last = new Date(lastRecitation);
  if (Number.isNaN(last.getTime())) return false;

  return last < daysAgo(7);
}

function formatNumber(value) {
  try {
    return new Intl.NumberFormat("ar-SA").format(Number(value) || 0);
  } catch {
    return String(Number(value) || 0);
  }
}

function formatDate(value) {
  if (!value) return "غير مسجل";

  try {
    return displayDateFormatter(
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    ).format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
  } catch {
    return String(value);
  }
}

function getLabel(options, value, fallback = "غير محدد") {
  return options.find((item) => item.value === value)?.label || fallback;
}

function getAttendanceRate(student) {
  const total =
    Number(student.present || 0) +
    Number(student.absent || 0) +
    Number(student.late || 0) +
    Number(student.excused || 0);

  if (!total) return 0;

  return Math.round(
    ((Number(student.present || 0) + Number(student.late || 0)) / total) * 100
  );
}

function getInitials(name) {
  const parts = normalizeText(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return "ط";
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`;
}

function statusLabel(status) {
  if (status === "active") return "نشط";
  if (status === "inactive") return "متوقف";
  if (status === "archived") return "مؤرشف";
  return status || "غير محدد";
}

/* =========================================================
   Page
========================================================= */

export default function Students() {
  const [teacher, setTeacher] = useState(null);
  const [teacherHalaqaIds, setTeacherHalaqaIds] = useState([]);
  const [students, setStudents] = useState([]);
  const [halaqat, setHalaqat] = useState([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("current");
  const [halaqaFilter, setHalaqaFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [viewStudent, setViewStudent] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [createdStudent, setCreatedStudent] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     Load
  ===================================================== */

  async function loadData(silent = false) {
    if (silent) setRefreshing(true);
    else setInitialLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("تعذر تحديد المستخدم الحالي.");

      const { data: teacherProfile, error: teacherError } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, user_number, role")
        .eq("auth_user_id", user.id)
        .eq("role", "teacher")
        .maybeSingle();

      if (teacherError) throw teacherError;
      if (!teacherProfile) throw new Error("تعذر العثور على حساب المعلم.");

      setTeacher(teacherProfile);

      const { data: teacherLinks, error: linksError } = await supabase
        .from("teacher_halaqat")
        .select("halaqa_id, role")
        .eq("teacher_id", teacherProfile.id);

      if (linksError) throw linksError;

      const uniqueIds = [
        ...new Set(
          (teacherLinks || [])
            .map((item) => Number(item.halaqa_id))
            .filter(Boolean)
        ),
      ];

      setTeacherHalaqaIds(uniqueIds);

      if (!uniqueIds.length) {
        setHalaqat([]);
        setStudents([]);
        return;
      }

      const roleMap = new Map(
        (teacherLinks || []).map((item) => [
          Number(item.halaqa_id),
          item.role,
        ])
      );

      const { data: halaqatRows, error: halaqatError } = await supabase
        .from("halaqat")
        .select(
          "id, name, mosque_id, capacity, status, halaqa_period, description"
        )
        .in("id", uniqueIds)
        .order("name");

      if (halaqatError) throw halaqatError;

      const mosqueIds = [
        ...new Set(
          (halaqatRows || [])
            .map((item) => Number(item.mosque_id))
            .filter(Boolean)
        ),
      ];

      let mosquesRows = [];

      if (mosqueIds.length) {
        const { data, error } = await supabase
          .from("mosques")
          .select("id, name")
          .in("id", mosqueIds);

        if (error) throw error;
        mosquesRows = data || [];
      }

      const mosqueMap = new Map(
        mosquesRows.map((mosque) => [Number(mosque.id), mosque.name])
      );

      const preparedHalaqat = (halaqatRows || []).map((halaqa) => ({
        ...halaqa,
        mosque_name:
          mosqueMap.get(Number(halaqa.mosque_id)) || "مسجد غير محدد",
        teacher_role:
          roleMap.get(Number(halaqa.id)) || "assistant",
      }));

      setHalaqat(preparedHalaqat);

      const { data: assignmentsRows, error: assignmentsError } = await supabase
        .from("student_halaqat")
        .select(
          "id, student_id, halaqa_id, teacher_id, start_date, end_date, is_current"
        )
        .in("halaqa_id", uniqueIds)
        .eq("is_current", true);

      if (assignmentsError) throw assignmentsError;

      const studentIds = [
        ...new Set(
          (assignmentsRows || [])
            .map((item) => Number(item.student_id))
            .filter(Boolean)
        ),
      ];

      if (!studentIds.length) {
        setStudents([]);
        return;
      }

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      const attendanceStart = [
        fromDate.getFullYear(),
        String(fromDate.getMonth() + 1).padStart(2, "0"),
        String(fromDate.getDate()).padStart(2, "0"),
      ].join("-");

      const [profilesResult, attendanceResult, recitationsResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .in("id", studentIds)
            .eq("role", "student"),

          supabase
            .from("attendance")
            .select("student_id, halaqa_id, status, attendance_date")
            .in("student_id", studentIds)
            .gte("attendance_date", attendanceStart),

          supabase
            .from("recitations")
            .select("id, student_id, halaqa_id, recitation_date")
            .in("student_id", studentIds),
        ]);

      if (profilesResult.error) throw profilesResult.error;
      if (attendanceResult.error) throw attendanceResult.error;
      if (recitationsResult.error) throw recitationsResult.error;

      const assignmentMap = new Map(
        (assignmentsRows || []).map((item) => [
          Number(item.student_id),
          item,
        ])
      );

      const halaqaMap = new Map(
        preparedHalaqat.map((item) => [Number(item.id), item])
      );

      const attendance = attendanceResult.data || [];
      const recitations = recitationsResult.data || [];

      const preparedStudents = (profilesResult.data || []).map((student) => {
        const assignment = assignmentMap.get(Number(student.id));
        const halaqa = assignment
          ? halaqaMap.get(Number(assignment.halaqa_id))
          : null;

        const studentAttendance = attendance.filter(
          (item) => Number(item.student_id) === Number(student.id)
        );

        const present = studentAttendance.filter(
          (item) => item.status === "present"
        ).length;

        const absent = studentAttendance.filter(
          (item) => item.status === "absent"
        ).length;

        const late = studentAttendance.filter(
          (item) => item.status === "late"
        ).length;

        const excused = studentAttendance.filter(
          (item) => item.status === "excused"
        ).length;

        const studentRecitations = recitations
          .filter((item) => Number(item.student_id) === Number(student.id))
          .sort(
            (a, b) =>
              new Date(b.recitation_date) - new Date(a.recitation_date)
          );

        const lastRecitation =
          studentRecitations[0]?.recitation_date || null;

        const attendanceRate = getAttendanceRate({
          present,
          absent,
          late,
          excused,
        });

        const profileComplete = Boolean(
          normalizeText(student.guardian_name) &&
            normalizeText(student.guardian_phone) &&
            normalizeText(student.gender) &&
            normalizeText(student.nationality)
        );

        return {
          ...student,
          halaqa_id: halaqa?.id || null,
          halaqa_name: halaqa?.name || "غير مرتبط",
          mosque_name: halaqa?.mosque_name || "غير محدد",
          halaqa_period: halaqa?.halaqa_period || null,
          teacher_role: halaqa?.teacher_role || null,
          present,
          absent,
          late,
          excused,
          attendance_rate: attendanceRate,
          recitations_count: studentRecitations.length,
          last_recitation: lastRecitation,
          follow_up: needsFollowUp(lastRecitation),
          profile_complete: profileComplete,
        };
      });

      preparedStudents.sort((a, b) =>
        String(a.full_name || "").localeCompare(
          String(b.full_name || ""),
          "ar"
        )
      );

      setStudents(preparedStudents);
    } catch (error) {
      console.error("LOAD TEACHER STUDENTS:", error);
      showToast(error?.message || "تعذر تحميل بيانات الطلاب.", "error");
      setStudents([]);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }

  /* =====================================================
     Access
  ===================================================== */

  function isTeacherHalaqa(halaqaId) {
    return teacherHalaqaIds.includes(Number(halaqaId));
  }

  async function ensureStudentAccess(studentId) {
    if (!teacherHalaqaIds.length) {
      throw new Error("لا توجد حلقات مرتبطة بحسابك.");
    }

    const { data, error } = await supabase
      .from("student_halaqat")
      .select("id, halaqa_id")
      .eq("student_id", studentId)
      .eq("is_current", true)
      .in("halaqa_id", teacherHalaqaIds)
      .limit(1);

    if (error) throw error;

    if (!data?.length) {
      throw new Error("ليس لديك صلاحية لإدارة هذا الطالب.");
    }

    return data[0];
  }

  /* =====================================================
     Form
  ===================================================== */

  function openCreateModal() {
    setEditingStudent(null);
    setForm({
      ...EMPTY_FORM,
      halaqa_id: halaqat.length === 1 ? String(halaqat[0].id) : "",
    });
    setFormOpen(true);
  }

  function openEditModal(student) {
    setEditingStudent(student);

    setForm({
      full_name: student.full_name || "",
      phone: student.phone || "",
      birth_date: student.birth_date || "",
      gender: student.gender || "",
      nationality: student.nationality || "",
      residence_address: student.residence_address || "",
      guardian_name: student.guardian_name || student.parent_name || "",
      guardian_phone: student.guardian_phone || student.parent_phone || "",
      guardian_relation: student.guardian_relation || "",
      education_stage:
        student.education_stage || student.education_level || "",
      education_grade: student.education_grade || "",
      learning_goal: student.learning_goal || "",
      recitation_mode: student.recitation_mode || "",
      recitation_days: Array.isArray(student.recitation_days)
        ? student.recitation_days
        : [],
      preferred_recitation_time:
        student.preferred_recitation_time || "",
      halaqa_id: student.halaqa_id ? String(student.halaqa_id) : "",
      notes: student.notes || "",
    });

    setViewStudent(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingStudent(null);
    setForm(EMPTY_FORM);
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleRecitationDay(day) {
    setForm((current) => ({
      ...current,
      recitation_days: current.recitation_days.includes(day)
        ? current.recitation_days.filter((item) => item !== day)
        : [...current.recitation_days, day],
    }));
  }

  function validateForm() {
    if (!normalizeText(form.full_name)) {
      throw new Error("أدخل اسم الطالب.");
    }

    if (!form.halaqa_id) {
      throw new Error("اختر الحلقة.");
    }

    if (!isTeacherHalaqa(form.halaqa_id)) {
      throw new Error("الحلقة المحددة ليست من حلقاتك.");
    }

    const age = getAgeFromBirthDate(form.birth_date);

    if (age !== null && (age < 3 || age > 100)) {
      throw new Error("تاريخ الميلاد ينتج عمرًا غير منطقي.");
    }

    return age;
  }

  function studentPayload(age) {
    return {
      full_name: normalizeText(form.full_name),
      phone: normalizeText(form.phone) || null,
      birth_date: form.birth_date || null,
      age,
      gender: form.gender || null,
      nationality: normalizeText(form.nationality) || null,
      residence_address: normalizeText(form.residence_address) || null,
      guardian_name: normalizeText(form.guardian_name) || null,
      guardian_phone: normalizeText(form.guardian_phone) || null,
      guardian_relation: normalizeText(form.guardian_relation) || null,
      education_stage: form.education_stage || null,
      education_grade: normalizeText(form.education_grade) || null,
      learning_goal: form.learning_goal || null,
      recitation_mode: form.recitation_mode || null,
      recitation_days: Array.isArray(form.recitation_days)
        ? form.recitation_days
        : [],
      preferred_recitation_time:
        form.preferred_recitation_time || null,
      notes: normalizeText(form.notes) || null,
      halaqa_id: Number(form.halaqa_id),
    };
  }

  async function saveStudent() {
    try {
      const age = validateForm();
      setSaving(true);

      if (!teacher?.id) {
        throw new Error("تعذر تحديد حساب المعلم.");
      }

      const payload = studentPayload(age);

      if (!editingStudent) {
        const { data, error } = await supabase.functions.invoke(
          "teacher-create-student",
          {
            body: payload,
          }
        );

        if (error) throw new Error(await functionErrorMessage(error, "تعذر إنشاء الطالب. حاول بعد قليل."));
        if (!data?.ok) {
          throw new Error(data?.message || "تعذر إنشاء الطالب.");
        }

        setCreatedStudent({
          full_name: data.profile?.full_name || payload.full_name,
          user_number: data.profile?.user_number,
          access_code: data.profile?.access_code,
        });

        setFormOpen(false);
        setForm(EMPTY_FORM);

        await loadData(true);

        showToast("تم إنشاء الطالب ورقمه تلقائيًا.", "success");
        return;
      }

      await ensureStudentAccess(editingStudent.id);

      const updatePayload = {
        full_name: payload.full_name,
        phone: payload.phone,
        birth_date: payload.birth_date,
        age: payload.age,
        gender: payload.gender,
        nationality: payload.nationality,
        residence_address: payload.residence_address,
        guardian_name: payload.guardian_name,
        guardian_phone: payload.guardian_phone,
        guardian_relation: payload.guardian_relation,
        education_stage: payload.education_stage,
        education_grade: payload.education_grade,
        learning_goal: payload.learning_goal,
        recitation_mode: payload.recitation_mode,
        recitation_days: payload.recitation_days,
        preferred_recitation_time: payload.preferred_recitation_time,
        notes: payload.notes,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", editingStudent.id)
        .eq("role", "student");

      if (profileError) throw profileError;

      if (Number(editingStudent.halaqa_id) !== Number(payload.halaqa_id)) {
        const { error: moveError } = await supabase.rpc(
          "move_teacher_student_halaqa",
          {
            p_student_id: editingStudent.id,
            p_halaqa_id: payload.halaqa_id,
          }
        );

        if (moveError) throw moveError;
      }

      showToast("تم حفظ تعديلات الطالب دون تغيير رقمه.", "success");

      closeForm();
      await loadData(true);
    } catch (error) {
      console.error("SAVE STUDENT:", error);
      showToast(error?.message || "تعذر حفظ بيانات الطالب.", "error");
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Status / archive
  ===================================================== */

  async function setStudentStatus(student, newStatus) {
    try {
      setSaving(true);

      const { error } = await supabase.rpc("set_teacher_student_status", {
        p_student_id: student.id,
        p_status: newStatus,
      });

      if (error) throw error;

      setViewStudent(null);
      setConfirmAction(null);

      await loadData(true);

      showToast(
        newStatus === "archived"
          ? "تمت أرشفة الطالب مع الاحتفاظ بجميع بياناته."
          : newStatus === "active"
            ? "تم تفعيل الطالب."
            : "تم إيقاف الطالب.",
        "success"
      );
    } catch (error) {
      console.error("SET STUDENT STATUS:", error);
      showToast(error?.message || "تعذر تغيير حالة الطالب.", "error");
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Delete
  ===================================================== */

  async function deleteStudent(student) {
    try {
      setSaving(true);

      const { data, error } = await supabase.functions.invoke(
        "teacher-delete-student",
        {
          body: {
            student_id: student.id,
          },
        }
      );

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.message || "تعذر حذف الطالب.");
      }

      setViewStudent(null);
      setConfirmAction(null);

      await loadData(true);

      showToast("تم حذف الطالب نهائيًا.", "success");
    } catch (error) {
      console.error("DELETE STUDENT:", error);
      showToast(
        error?.message ||
          "تعذر حذف الطالب. قد توجد بيانات مرتبطة تحتاج معالجة.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Filters / stats
  ===================================================== */

  const filteredStudents = useMemo(() => {
    const text = search.trim().toLowerCase();

    return students.filter((student) => {
      const searchable = [
        student.full_name,
        student.user_number,
        student.phone,
        student.guardian_name,
        student.guardian_phone,
        student.halaqa_name,
        student.mosque_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !text || searchable.includes(text);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "current"
            ? student.status !== "archived"
            : student.status === statusFilter;

      const matchesHalaqa =
        halaqaFilter === "all" ||
        String(student.halaqa_id || "") === String(halaqaFilter);

      return matchesSearch && matchesStatus && matchesHalaqa;
    });
  }, [students, search, statusFilter, halaqaFilter]);

  const stats = useMemo(() => {
    const current = students.filter(
      (student) => student.status !== "archived"
    );

    const active = students.filter(
      (student) => student.status === "active"
    ).length;

    const archived = students.filter(
      (student) => student.status === "archived"
    ).length;

    const followUp = current.filter((student) => student.follow_up).length;

    const averageAttendance = current.length
      ? Math.round(
          current.reduce(
            (sum, student) => sum + Number(student.attendance_rate || 0),
            0
          ) / current.length
        )
      : 0;

    return {
      current: current.length,
      active,
      archived,
      followUp,
      averageAttendance,
    };
  }, [students]);

  const hasFilters =
    Boolean(search) ||
    statusFilter !== "current" ||
    halaqaFilter !== "all";

  function resetFilters() {
    setSearch("");
    setStatusFilter("current");
    setHalaqaFilter("all");
  }

  /* =====================================================
     Render
  ===================================================== */

  return (
    <div className="students-pro" dir="rtl">
      <section className="students-hero">
        <div className="students-hero-copy">
          <div className="students-kicker">
            <Sparkles size={16} />
            إدارة الطلاب
          </div>

          <h1>طلاب حلقاتي</h1>

          <p>
            صفحة سريعة وخفيفة لإدارة الطلاب، مع بطاقة مختصرة لكل طالب
            وملف كامل عند الضغط على «عرض».
          </p>
        </div>

        <div className="students-hero-actions">
          <button
            type="button"
            className="students-icon-button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="تحديث البيانات"
          >
            <RefreshCw
              size={18}
              className={refreshing ? "students-spin" : ""}
            />
          </button>

          <button
            type="button"
            className="students-primary-button"
            onClick={openCreateModal}
            disabled={!halaqat.length}
          >
            <Plus size={18} />
            إضافة طالب
          </button>
        </div>
      </section>

      <section className="students-stats">
        <StatCard
          label="الطلاب الحاليون"
          value={stats.current}
          icon={Users}
          tone="green"
        />
        <StatCard
          label="النشطون"
          value={stats.active}
          icon={UserCheck}
          tone="blue"
        />
        <StatCard
          label="المؤرشفون"
          value={stats.archived}
          icon={Archive}
          tone="gold"
        />
        <StatCard
          label="يحتاجون متابعة"
          value={stats.followUp}
          icon={AlertTriangle}
          tone={stats.followUp ? "red" : "green"}
        />
        <StatCard
          label="متوسط الحضور"
          value={`${stats.averageAttendance}%`}
          icon={CheckCircle2}
          tone="teal"
        />
      </section>

      <section className="students-toolbar">
        <label className="students-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالاسم أو رقم الطالب…"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="مسح البحث"
            >
              <X size={15} />
            </button>
          )}
        </label>

        <SelectBox
          value={halaqaFilter}
          onChange={setHalaqaFilter}
          options={[
            { value: "all", label: "جميع حلقاتي" },
            ...halaqat.map((halaqa) => ({
              value: String(halaqa.id),
              label: halaqa.name,
            })),
          ]}
        />

        <SelectBox
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "current", label: "الطلاب الحاليون" },
            { value: "active", label: "النشطون" },
            { value: "inactive", label: "المتوقفون" },
            { value: "archived", label: "المؤرشفون" },
            { value: "all", label: "الكل" },
          ]}
        />

        <button
          type="button"
          className="students-reset"
          onClick={resetFilters}
          disabled={!hasFilters}
        >
          <RotateCcw size={16} />
          إعادة
        </button>
      </section>

      <div className="students-result-line">
        <div>
          <strong>قائمة الطلاب</strong>
          <span>
            عرض {formatNumber(filteredStudents.length)} من{" "}
            {formatNumber(students.length)}
          </span>
        </div>

        <div className="students-scope-note">
          <ShieldCheck size={15} />
          تظهر لك فقط حلقاتك وطلابها
        </div>
      </div>

      {initialLoading ? (
        <LoadingState />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          hasHalaqat={halaqat.length > 0}
          filtered={hasFilters}
          onReset={resetFilters}
          onCreate={openCreateModal}
        />
      ) : (
        <section className="students-grid">
          {filteredStudents.map((student) => (
            <CompactStudentCard
              key={student.id}
              student={student}
              onView={setViewStudent}
            />
          ))}
        </section>
      )}

      <StudentFormModal
        open={formOpen}
        editingStudent={editingStudent}
        form={form}
        updateForm={updateForm}
        toggleDay={toggleRecitationDay}
        halaqat={halaqat}
        saving={saving}
        onSave={saveStudent}
        onClose={closeForm}
      />

      <StudentDetailsModal
        student={viewStudent}
        saving={saving}
        onClose={() => setViewStudent(null)}
        onEdit={openEditModal}
        onAskAction={setConfirmAction}
      />

      <ActionConfirmModal
        action={confirmAction}
        saving={saving}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction?.student) return;

          if (confirmAction.type === "delete") {
            deleteStudent(confirmAction.student);
            return;
          }

          setStudentStatus(
            confirmAction.student,
            confirmAction.nextStatus
          );
        }}
      />

      <CreatedStudentModal
        student={createdStudent}
        onClose={() => setCreatedStudent(null)}
      />
    </div>
  );
}

/* =========================================================
   Compact card
========================================================= */

function CompactStudentCard({ student, onView }) {
  return (
    <article
      className={`student-compact-card is-${student.status || "active"}`}
    >
      <div className="student-compact-avatar">
        {getInitials(student.full_name)}
      </div>

      <div className="student-compact-copy">
        <strong>{student.full_name || "طالب بدون اسم"}</strong>
        <span>{student.user_number || "بدون رقم"}</span>
      </div>

      <span className={`student-status-badge is-${student.status || "active"}`}>
        {statusLabel(student.status)}
      </span>

      <button
        type="button"
        className="student-view-button"
        onClick={() => onView(student)}
      >
        <Eye size={16} />
        عرض
      </button>
    </article>
  );
}

/* =========================================================
   Details
========================================================= */

function StudentDetailsModal({
  student,
  saving,
  onClose,
  onEdit,
  onAskAction,
}) {
  if (!student) return null;

  const archived = student.status === "archived";
  const inactive = student.status === "inactive";

  return (
    <ModalBackdrop onClose={onClose} disabled={saving}>
      <section className="student-details-modal">
        <header className="student-modal-header">
          <div className="student-details-identity">
            <div className="student-details-avatar">
              {getInitials(student.full_name)}
            </div>

            <div>
              <span>ملف الطالب</span>
              <h2>{student.full_name}</h2>
              <div className="student-number-line">
                {student.user_number || "—"}
                <CopyButton value={student.user_number} />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="student-modal-close"
            onClick={onClose}
            disabled={saving}
          >
            <X size={19} />
          </button>
        </header>

        <div className="student-details-body">
          <StudentAccessCard key={student.id} studentId={student.id} />
          <section className="student-detail-highlight">
            <DetailMini
              icon={BookOpen}
              label="الحلقة"
              value={student.halaqa_name}
            />
            <DetailMini
              icon={Building2}
              label="المسجد"
              value={student.mosque_name}
            />
            <DetailMini
              icon={CheckCircle2}
              label="الحضور"
              value={`${student.attendance_rate || 0}%`}
            />
            <DetailMini
              icon={CalendarDays}
              label="آخر تسميع"
              value={
                student.last_recitation
                  ? formatDate(student.last_recitation)
                  : "لا يوجد"
              }
            />
          </section>

          {student.follow_up && student.status !== "archived" && (
            <div className="student-followup-alert">
              <AlertTriangle size={18} />
              يحتاج متابعة: لا يوجد تسميع خلال آخر 7 أيام.
            </div>
          )}

          <DetailSection title="البيانات الأساسية" icon={UserRound}>
            <DetailsGrid>
              <DetailItem
                label="رقم الطالب"
                value={student.user_number}
              />
              <DetailItem label="الجوال" value={student.phone} />
              <DetailItem
                label="تاريخ الميلاد"
                value={
                  student.birth_date
                    ? formatDate(student.birth_date)
                    : "غير مسجل"
                }
              />
              <DetailItem
                label="الجنس"
                value={getLabel(GENDERS, student.gender)}
              />
              <DetailItem
                label="الجنسية"
                value={student.nationality}
              />
              <DetailItem
                label="السكن"
                value={student.residence_address}
              />
            </DetailsGrid>
          </DetailSection>

          <DetailSection title="ولي الأمر" icon={ShieldCheck}>
            <DetailsGrid>
              <DetailItem
                label="الاسم"
                value={student.guardian_name || student.parent_name}
              />
              <DetailItem
                label="الجوال"
                value={student.guardian_phone || student.parent_phone}
              />
              <DetailItem
                label="صلة القرابة"
                value={student.guardian_relation}
              />
            </DetailsGrid>
          </DetailSection>

          <DetailSection title="التعليم والتسميع" icon={GraduationCap}>
            <DetailsGrid>
              <DetailItem
                label="المرحلة"
                value={getLabel(
                  EDUCATION_STAGES,
                  student.education_stage || student.education_level
                )}
              />
              <DetailItem
                label="الصف"
                value={student.education_grade}
              />
              <DetailItem
                label="الهدف"
                value={getLabel(LEARNING_GOALS, student.learning_goal)}
              />
              <DetailItem
                label="طريقة التسميع"
                value={getLabel(
                  RECITATION_MODES,
                  student.recitation_mode
                )}
              />
              <DetailItem
                label="الوقت المفضل"
                value={student.preferred_recitation_time}
              />
              <DetailItem
                label="أيام التسميع"
                value={
                  Array.isArray(student.recitation_days) &&
                  student.recitation_days.length
                    ? student.recitation_days
                        .map(
                          (day) =>
                            DAYS.find((item) => item.value === day)?.label ||
                            day
                        )
                        .join("، ")
                    : "غير محددة"
                }
              />
            </DetailsGrid>
          </DetailSection>

          <DetailSection title="الأداء المختصر" icon={CheckCircle2}>
            <section className="student-performance-grid">
              <PerformanceItem
                label="حضور 30 يوم"
                value={`${student.attendance_rate || 0}%`}
              />
              <PerformanceItem
                label="التسميعات"
                value={formatNumber(student.recitations_count)}
              />
              <PerformanceItem
                label="النقاط"
                value={formatNumber(student.total_points)}
              />
              <PerformanceItem
                label="الغياب"
                value={formatNumber(student.absent)}
              />
            </section>
          </DetailSection>

          {student.notes && (
            <DetailSection title="ملاحظات" icon={BookOpen}>
              <p className="student-notes">{student.notes}</p>
            </DetailSection>
          )}
        </div>

        <footer className="student-details-footer">
          <button
            type="button"
            className="student-action-button edit"
            onClick={() => onEdit(student)}
            disabled={saving}
          >
            <Edit3 size={17} />
            تعديل
          </button>

          {!archived && (
            <button
              type="button"
              className="student-action-button stop"
              onClick={() =>
                onAskAction({
                  type: "status",
                  student,
                  nextStatus: inactive ? "active" : "inactive",
                })
              }
              disabled={saving}
            >
              {inactive ? <UserCheck size={17} /> : <UserX size={17} />}
              {inactive ? "تفعيل" : "إيقاف"}
            </button>
          )}

          <button
            type="button"
            className={`student-action-button ${archived ? "restore" : "archive"}`}
            onClick={() =>
              onAskAction({
                type: "status",
                student,
                nextStatus: archived ? "active" : "archived",
              })
            }
            disabled={saving}
          >
            {archived ? <RotateCcw size={17} /> : <Archive size={17} />}
            {archived ? "إعادة التفعيل" : "أرشفة"}
          </button>

          <button
            type="button"
            className="student-action-button delete"
            onClick={() =>
              onAskAction({
                type: "delete",
                student,
              })
            }
            disabled={saving}
          >
            <Trash2 size={17} />
            حذف نهائي
          </button>
        </footer>
      </section>
    </ModalBackdrop>
  );
}

/* =========================================================
   Form modal
========================================================= */

function StudentFormModal({
  open,
  editingStudent,
  form,
  updateForm,
  toggleDay,
  halaqat,
  saving,
  onSave,
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape" && !saving) onClose();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, saving, onClose]);

  if (!open) return null;

  return (
    <ModalBackdrop onClose={onClose} disabled={saving}>
      <section className="student-form-modal">
        <header className="student-modal-header">
          <div className="student-form-heading">
            <div className="student-form-icon">
              {editingStudent ? <Edit3 size={21} /> : <Plus size={21} />}
            </div>

            <div>
              <span>ملف الطالب</span>
              <h2>
                {editingStudent ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
              </h2>
              <p>
                {editingStudent
                  ? "رقم الطالب ثابت ولن يتغير عند حفظ التعديلات."
                  : "رقم الطالب سيُنشأ تلقائيًا بعد الحفظ."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="student-modal-close"
            onClick={onClose}
            disabled={saving}
          >
            <X size={19} />
          </button>
        </header>

        <div className="student-form-body">
          {editingStudent ? (
            <div className="student-number-readonly">
              <div>
                <span>رقم الطالب</span>
                <strong>{editingStudent.user_number || "—"}</strong>
              </div>
              <ShieldCheck size={20} />
              <small>ثابت — لا يتم إنشاء رقم جديد عند التعديل</small>
            </div>
          ) : (
            <div className="student-number-auto">
              <Sparkles size={19} />
              <div>
                <strong>رقم الطالب تلقائي</strong>
                <span>
                  عند الضغط على «إنشاء الطالب» سيُنشئ النظام رقمًا عشوائيًا
                  فريدًا مثل ST-A84F29D71C، ويصبح صالحًا لدخول الطالب.
                </span>
              </div>
            </div>
          )}

          <FormSection title="البيانات الأساسية" icon={UserRound}>
            <div className="student-form-grid">
              <Field
                label="اسم الطالب"
                required
                value={form.full_name}
                onChange={(value) => updateForm("full_name", value)}
                placeholder="الاسم الكامل"
                className="span-2"
              />

              <Field
                label="جوال الطالب"
                value={form.phone}
                onChange={(value) => updateForm("phone", value)}
                placeholder="05xxxxxxxx"
                type="tel"
              />

              <Field
                label="تاريخ الميلاد"
                value={form.birth_date}
                onChange={(value) => updateForm("birth_date", value)}
                type="date"
              />

              <SelectField
                label="الجنس"
                value={form.gender}
                onChange={(value) => updateForm("gender", value)}
                options={[
                  { value: "", label: "غير محدد" },
                  ...GENDERS,
                ]}
              />

              <Field
                label="الجنسية"
                value={form.nationality}
                onChange={(value) => updateForm("nationality", value)}
                placeholder="مثال: سعودي"
              />

              <Field
                label="عنوان السكن"
                value={form.residence_address}
                onChange={(value) =>
                  updateForm("residence_address", value)
                }
                placeholder="الحي / المدينة / وصف مختصر"
                className="span-2"
              />
            </div>
          </FormSection>

          <FormSection title="ولي الأمر" icon={ShieldCheck}>
            <div className="student-form-grid">
              <Field
                label="اسم ولي الأمر"
                value={form.guardian_name}
                onChange={(value) => updateForm("guardian_name", value)}
                placeholder="اسم ولي الأمر"
              />

              <Field
                label="جوال ولي الأمر"
                value={form.guardian_phone}
                onChange={(value) => updateForm("guardian_phone", value)}
                placeholder="05xxxxxxxx"
                type="tel"
              />

              <SelectField
                label="صلة القرابة"
                value={form.guardian_relation}
                onChange={(value) =>
                  updateForm("guardian_relation", value)
                }
                options={[
                  { value: "", label: "اختر صلة القرابة" },
                  ...GUARDIAN_RELATIONS,
                ]}
              />
            </div>
          </FormSection>

          <FormSection title="التعليم والحلقة" icon={GraduationCap}>
            <div className="student-form-grid">
              <SelectField
                label="المرحلة الدراسية"
                value={form.education_stage}
                onChange={(value) =>
                  updateForm("education_stage", value)
                }
                options={[
                  { value: "", label: "اختر المرحلة" },
                  ...EDUCATION_STAGES,
                ]}
              />

              <Field
                label="الصف الدراسي"
                value={form.education_grade}
                onChange={(value) =>
                  updateForm("education_grade", value)
                }
                placeholder="مثال: الصف السادس"
              />

              <SelectField
                label="الهدف التعليمي"
                value={form.learning_goal}
                onChange={(value) =>
                  updateForm("learning_goal", value)
                }
                options={[
                  { value: "", label: "اختر الهدف" },
                  ...LEARNING_GOALS,
                ]}
              />

              <SelectField
                label="الحلقة"
                required
                value={form.halaqa_id}
                onChange={(value) => updateForm("halaqa_id", value)}
                options={[
                  { value: "", label: "اختر من حلقاتك" },
                  ...halaqat.map((halaqa) => ({
                    value: String(halaqa.id),
                    label: `${halaqa.name} — ${halaqa.mosque_name}${
                      halaqa.halaqa_period
                        ? ` — ${HALAQA_PERIODS[halaqa.halaqa_period] || ""}`
                        : ""
                    }`,
                  })),
                ]}
              />
            </div>
          </FormSection>

          <FormSection title="إعدادات التسميع" icon={BookOpen}>
            <div className="student-form-grid">
              <SelectField
                label="طريقة التسميع"
                value={form.recitation_mode}
                onChange={(value) =>
                  updateForm("recitation_mode", value)
                }
                options={[
                  { value: "", label: "غير محدد" },
                  ...RECITATION_MODES,
                ]}
              />

              <Field
                label="وقت التسميع المفضل"
                value={form.preferred_recitation_time}
                onChange={(value) =>
                  updateForm("preferred_recitation_time", value)
                }
                type="time"
              />
            </div>

            <div className="student-form-days">
              {DAYS.map((day) => {
                const active = form.recitation_days.includes(day.value);

                return (
                  <button
                    type="button"
                    key={day.value}
                    className={active ? "is-active" : ""}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection title="ملاحظات" icon={BookOpen}>
            <Field
              label="ملاحظات إضافية"
              value={form.notes}
              onChange={(value) => updateForm("notes", value)}
              placeholder="أي معلومات تربوية أو تشغيلية مهمة…"
              textarea
              className="span-3"
            />
          </FormSection>
        </div>

        <footer className="student-form-footer">
          <button
            type="button"
            className="students-secondary-button"
            onClick={onClose}
            disabled={saving}
          >
            إلغاء
          </button>

          <button
            type="button"
            className="students-primary-button"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={17} className="students-spin" />
            ) : editingStudent ? (
              <Edit3 size={17} />
            ) : (
              <Plus size={17} />
            )}

            {saving
              ? "جارٍ الحفظ…"
              : editingStudent
                ? "حفظ التعديلات"
                : "إنشاء الطالب"}
          </button>
        </footer>
      </section>
    </ModalBackdrop>
  );
}

/* =========================================================
   Confirm / success
========================================================= */

function ActionConfirmModal({ action, saving, onClose, onConfirm }) {
  if (!action) return null;

  const isDelete = action.type === "delete";
  const isArchive = action.nextStatus === "archived";
  const isRestore = action.nextStatus === "active";

  return (
    <ModalBackdrop onClose={onClose} disabled={saving}>
      <section className="student-confirm-modal">
        <div
          className={`student-confirm-icon ${
            isDelete ? "is-danger" : isArchive ? "is-archive" : "is-ok"
          }`}
        >
          {isDelete ? (
            <Trash2 size={26} />
          ) : isArchive ? (
            <Archive size={26} />
          ) : isRestore ? (
            <RotateCcw size={26} />
          ) : (
            <UserX size={26} />
          )}
        </div>

        <h3>
          {isDelete
            ? "حذف الطالب نهائيًا؟"
            : isArchive
              ? "أرشفة الطالب؟"
              : isRestore
                ? "إعادة تفعيل الطالب؟"
                : "إيقاف الطالب؟"}
        </h3>

        <p>
          {isDelete
            ? `سيتم حذف "${action.student.full_name}" نهائيًا مع بياناته المرتبطة وحساب الدخول. لا يمكن التراجع عن هذه العملية.`
            : isArchive
              ? `سيتم حفظ ملف "${action.student.full_name}" وتاريخه، لكن حسابه سيتوقف ويظهر ضمن المؤرشفين.`
              : isRestore
                ? `سيتم إعادة تفعيل "${action.student.full_name}" ويمكنه استخدام حسابه من جديد.`
                : `سيتم إيقاف حساب "${action.student.full_name}" مؤقتًا مع بقاء ملفه محفوظًا.`}
        </p>

        <div className="student-confirm-actions">
          <button
            type="button"
            className="students-secondary-button"
            onClick={onClose}
            disabled={saving}
          >
            إلغاء
          </button>

          <button
            type="button"
            className={isDelete ? "students-danger-button" : "students-primary-button"}
            onClick={onConfirm}
            disabled={saving}
          >
            {saving && <Loader2 size={17} className="students-spin" />}
            {isDelete ? "حذف نهائي" : "تأكيد"}
          </button>
        </div>
      </section>
    </ModalBackdrop>
  );
}

function CreatedStudentModal({ student, onClose }) {
  if (!student) return null;

  return (
    <ModalBackdrop onClose={onClose}>
      <section className="student-created-modal">
        <div className="student-created-icon">
          <Check size={27} />
        </div>

        <span>تم إنشاء الطالب بنجاح</span>
        <h3>{student.full_name}</h3>

        <p>
          احتفظ ببطاقة الدخول التالية للطالب أو ولي أمره.
        </p>

        <StudentAccessCard initialCard={student} />

        <button
          type="button"
          className="students-primary-button"
          onClick={onClose}
        >
          تم
        </button>
      </section>
    </ModalBackdrop>
  );
}

/* =========================================================
   Small components
========================================================= */

function ModalBackdrop({ children, onClose, disabled = false }) {
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !disabled) onClose?.();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disabled, onClose]);

  return (
    <div
      className="students-modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !disabled
        ) {
          onClose?.();
        }
      }}
    >
      {children}
    </div>
  );
}

function CopyButton({ value, large = false }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      showToast("تعذر نسخ الرقم.", "error");
    }
  }

  return (
    <button
      type="button"
      className={`student-copy-button ${large ? "is-large" : ""}`}
      onClick={copy}
      disabled={!value}
      title="نسخ رقم الطالب"
    >
      {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}
      {large && (copied ? "تم النسخ" : "نسخ الرقم")}
    </button>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <article className={`students-stat students-stat-${tone}`}>
      <div className="students-stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function SelectBox({ value, onChange, options }) {
  return (
    <label className="students-select">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} />
    </label>
  );
}

function DetailSection({ title, icon: Icon, children }) {
  return (
    <section className="student-detail-section">
      <header>
        <Icon size={18} />
        <h3>{title}</h3>
      </header>
      {children}
    </section>
  );
}

function DetailsGrid({ children }) {
  return <div className="student-details-grid">{children}</div>;
}

function DetailItem({ label, value }) {
  return (
    <div className="student-detail-item">
      <span>{label}</span>
      <strong>{value || "غير مسجل"}</strong>
    </div>
  );
}

function DetailMini({ icon: Icon, label, value }) {
  return (
    <div className="student-detail-mini">
      <Icon size={18} />
      <div>
        <span>{label}</span>
        <strong>{value || "—"}</strong>
      </div>
    </div>
  );
}

function PerformanceItem({ label, value }) {
  return (
    <div className="student-performance-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FormSection({ title, icon: Icon, children }) {
  return (
    <section className="student-form-section">
      <header>
        <Icon size={18} />
        <h3>{title}</h3>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
  className = "",
}) {
  const Input = type === "date" ? CalendarInput : "input";
  return (
    <label className={`student-form-field ${className}`}>
      <span>
        {label}
        {required && <b> *</b>}
      </span>

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  required,
  value,
  onChange,
  options,
}) {
  return (
    <label className="student-form-field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadingState() {
  return (
    <div className="students-state sadiq-loading-state">
      <Loader2 size={30} className="students-spin" />
      <strong>جارٍ تحميل الطلاب…</strong>
      <span>يتم تجهيز بيانات حلقاتك وطلابها.</span>
    </div>
  );
}

function EmptyState({
  hasHalaqat,
  filtered,
  onReset,
  onCreate,
}) {
  return (
    <div className="students-state">
      <Users size={31} />
      <strong>
        {!hasHalaqat
          ? "لا توجد حلقات مرتبطة بك"
          : filtered
            ? "لا توجد نتائج مطابقة"
            : "لا يوجد طلاب في حلقاتك"}
      </strong>
      <span>
        {!hasHalaqat
          ? "بعد اعتماد انضمامك إلى حلقة ستتمكن من إدارة طلابها."
          : filtered
            ? "جرّب تغيير البحث أو الفلاتر."
            : "أضف أول طالب، وسيُنشئ النظام رقمه تلقائيًا."}
      </span>

      <div>
        {filtered && (
          <button
            type="button"
            className="students-secondary-button"
            onClick={onReset}
          >
            <RotateCcw size={16} />
            مسح الفلاتر
          </button>
        )}

        {!filtered && hasHalaqat && (
          <button
            type="button"
            className="students-primary-button"
            onClick={onCreate}
          >
            <Plus size={16} />
            إضافة طالب
          </button>
        )}
      </div>
    </div>
  );
}
