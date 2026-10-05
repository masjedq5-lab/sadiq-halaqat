import {displayDateFormatter} from "../lib/calendar";
import CalendarInput from "../components/CalendarInput";
import StudentAccessCard from "../components/security/StudentAccessCard";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, ChevronDown, CircleSlash, Edit3, GraduationCap, Hash, Home, Loader2, MapPin, Phone, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Trash2, UserCheck, UserRound, Users, UserX, VenusAndMars, X } from "lucide-react";

import { supabase } from "../lib/supabase";
import ConfirmModal from "../components/ConfirmModal";
import { showToast } from "../components/Toast";

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
  {
    value: "noorania_quran",
    label: "القرآن والقاعدة النورانية",
  },
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

const EMPTY_FORM = {
  full_name: "",
  user_number: "",
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

function formatNumber(value) {
  try {
    return new Intl.NumberFormat("ar-SA").format(
      Number(value) || 0
    );
  } catch {
    return String(Number(value) || 0);
  }
}

function formatDate(value) {
  if (!value) return "لا يوجد";

  try {
    const text = String(value).slice(0, 10);
    const [year, month, day] = text.split("-").map(Number);

    const date = new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0
    );

    return displayDateFormatter(
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    ).format(date);
  } catch {
    return String(value);
  }
}

function formatHijriDate(value) {
  if (!value) return "";

  try {
    const text = String(value).slice(0, 10);
    const [year, month, day] = text.split("-").map(Number);

    const date = new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0
    );

    return displayDateFormatter(
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    ).format(date);
  } catch {
    return "";
  }
}

function getLabel(options, value, fallback = "غير محدد") {
  return (
    options.find((item) => item.value === value)?.label ||
    fallback
  );
}

function getAttendanceRate(student) {
  const total =
    Number(student.present || 0) +
    Number(student.absent || 0) +
    Number(student.late || 0) +
    Number(student.excused || 0);

  if (!total) return 0;

  return Math.round(
    ((Number(student.present || 0) +
      Number(student.late || 0)) /
      total) *
      100
  );
}

function getInitials(name) {
  const parts = normalizeText(name)
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "ط";

  if (parts.length === 1) {
    return parts[0].slice(0, 1);
  }

  return (
    parts[0].slice(0, 1) +
    parts[parts.length - 1].slice(0, 1)
  );
}

async function generateStudentNumber() {
  // رقم إداري تلقائي قابل للقراءة. نتحقق من عدم تكراره قبل الحفظ.
  // الشكل: S-000001
  const { data, error } = await supabase
    .from("profiles")
    .select("user_number")
    .eq("role", "student")
    .not("user_number", "is", null);

  if (error) throw error;

  let maxNumber = 0;

  for (const row of data || []) {
    const match = String(row.user_number || "").match(/(\d+)$/);
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]) || 0);
  }

  // نتحقق من الرقم المرشح حتى لو كانت هناك صيغ قديمة مختلفة.
  for (let offset = 1; offset <= 100; offset += 1) {
    const candidate = `S-${String(maxNumber + offset).padStart(6, "0")}`;
    const { data: existing, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_number", candidate)
      .maybeSingle();

    if (checkError) throw checkError;
    if (!existing) return candidate;
  }

  throw new Error("تعذر توليد رقم طالب فريد. حاول مرة أخرى.");
}

/* =========================================================
   Main Page
========================================================= */

export default function Students() {
  const [students, setStudents] = useState([]);
  const [halaqat, setHalaqat] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [halaqaFilter, setHalaqaFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const [currentProfile, setCurrentProfile] = useState(null);
  const [scopeMosqueIds, setScopeMosqueIds] = useState([]);

  useEffect(() => {
    loadPage();
  }, []);

  /* =====================================================
     Scope + Load
  ===================================================== */

  async function getScope() {
    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    const authUser = authData?.user;

    if (!authUser) {
      throw new Error("تعذر تحديد المستخدم الحالي.");
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, role, full_name, display_name")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      throw new Error("تعذر العثور على الملف الشخصي.");
    }

    if (profile.role === "admin") {
      return {
        profile,
        mosqueIds: null,
      };
    }

    if (profile.role !== "supervisor") {
      throw new Error(
        "هذه الصفحة مخصصة للمشرف أو مدير النظام."
      );
    }

    const {
      data: links,
      error: linksError,
    } = await supabase
      .from("mosque_supervisors")
      .select("mosque_id")
      .eq("supervisor_id", profile.id);

    if (linksError) throw linksError;

    const mosqueIds = [
      ...new Set(
        (links || [])
          .map((item) => Number(item.mosque_id))
          .filter(Boolean)
      ),
    ];

    return {
      profile,
      mosqueIds,
    };
  }

  async function loadPage() {
    try {
      setLoading(true);

      const scope = await getScope();

      setCurrentProfile(scope.profile);
      setScopeMosqueIds(scope.mosqueIds || []);

      let halaqatQuery = supabase
        .from("halaqat")
        .select(
          "id, mosque_id, name, status, capacity, halaqa_period"
        )
        .order("name");

      if (Array.isArray(scope.mosqueIds)) {
        if (scope.mosqueIds.length === 0) {
          setHalaqat([]);
          setStudents([]);
          return;
        }

        halaqatQuery = halaqatQuery.in(
          "mosque_id",
          scope.mosqueIds
        );
      }

      const {
        data: halaqatRows,
        error: halaqatError,
      } = await halaqatQuery;

      if (halaqatError) throw halaqatError;

      const safeHalaqat = halaqatRows || [];
      const halaqaIds = safeHalaqat.map((item) =>
        Number(item.id)
      );

      let assignments = [];

      if (scope.profile.role === "admin") {
        const {
          data,
          error,
        } = await supabase
          .from("student_halaqat")
          .select(
            "id, student_id, halaqa_id, start_date, end_date, is_current"
          )
          .eq("is_current", true);

        if (error) throw error;
        assignments = data || [];
      } else if (halaqaIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("student_halaqat")
          .select(
            "id, student_id, halaqa_id, start_date, end_date, is_current"
          )
          .eq("is_current", true)
          .in("halaqa_id", halaqaIds);

        if (error) throw error;
        assignments = data || [];
      }

      let profiles = [];

      if (scope.profile.role === "admin") {
        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "student")
          .order("full_name");

        if (error) throw error;
        profiles = data || [];
      } else {
        const studentIds = [
          ...new Set(
            assignments
              .map((item) => Number(item.student_id))
              .filter(Boolean)
          ),
        ];

        if (studentIds.length > 0) {
          const {
            data,
            error,
          } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "student")
            .in("id", studentIds)
            .order("full_name");

          if (error) throw error;
          profiles = data || [];
        }
      }

      const studentIds = profiles.map((item) =>
        Number(item.id)
      );

      let attendanceRows = [];
      let recitationRows = [];

      if (studentIds.length > 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const attendanceStart = [
          thirtyDaysAgo.getFullYear(),
          String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0"),
          String(thirtyDaysAgo.getDate()).padStart(2, "0"),
        ].join("-");

        const [
          attendanceResult,
          recitationsResult,
        ] = await Promise.all([
          supabase
            .from("attendance")
            .select(
              "student_id, status, attendance_date"
            )
            .in("student_id", studentIds)
            .gte("attendance_date", attendanceStart),

          supabase
            .from("recitations")
            .select(
              "id, student_id, recitation_date"
            )
            .in("student_id", studentIds),
        ]);

        if (attendanceResult.error) {
          throw attendanceResult.error;
        }

        if (recitationsResult.error) {
          throw recitationsResult.error;
        }

        attendanceRows = attendanceResult.data || [];
        recitationRows = recitationsResult.data || [];
      }

      const halaqaMap = new Map(
        safeHalaqat.map((item) => [
          Number(item.id),
          item,
        ])
      );

      const assignmentMap = new Map(
        assignments.map((item) => [
          Number(item.student_id),
          item,
        ])
      );

      const prepared = profiles.map((student) => {
        const assignment = assignmentMap.get(
          Number(student.id)
        );

        const halaqa = assignment
          ? halaqaMap.get(Number(assignment.halaqa_id))
          : null;

        const attendance = attendanceRows.filter(
          (item) =>
            Number(item.student_id) === Number(student.id)
        );

        const present = attendance.filter(
          (item) => item.status === "present"
        ).length;

        const absent = attendance.filter(
          (item) => item.status === "absent"
        ).length;

        const late = attendance.filter(
          (item) => item.status === "late"
        ).length;

        const excused = attendance.filter(
          (item) => item.status === "excused"
        ).length;

        const recitations = recitationRows
          .filter(
            (item) =>
              Number(item.student_id) === Number(student.id)
          )
          .sort(
            (a, b) =>
              new Date(b.recitation_date) -
              new Date(a.recitation_date)
          );

        return {
          ...student,

          halaqa_id: halaqa?.id || null,
          halaqa_name: halaqa?.name || "غير مرتبط",

          present,
          absent,
          late,
          excused,

          recitations_count: recitations.length,
          last_recitation:
            recitations[0]?.recitation_date || null,

          attendance_rate: getAttendanceRate({
            present,
            absent,
            late,
            excused,
          }),

          profile_complete: Boolean(
            normalizeText(student.guardian_name) &&
              normalizeText(student.guardian_phone) &&
              normalizeText(student.gender) &&
              normalizeText(student.nationality)
          ),
        };
      });

      setHalaqat(safeHalaqat);
      setStudents(prepared);
    } catch (error) {
      console.error("LOAD STUDENTS PAGE:", error);

      showToast(
        error?.message || "تعذر تحميل بيانات الطلاب.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     Modal
  ===================================================== */

  async function openCreate() {
    try {
      setEditingStudent(null);
      setSaving(true);

      const automaticNumber = await generateStudentNumber();

      setForm({
        ...EMPTY_FORM,
        user_number: automaticNumber,
        halaqa_id:
          halaqat.length === 1
            ? String(halaqat[0].id)
            : "",
      });

      setModalOpen(true);
    } catch (error) {
      console.error("GENERATE STUDENT NUMBER:", error);
      showToast(
        error?.message || "تعذر توليد رقم الطالب تلقائيًا.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  function openEdit(student) {
    setEditingStudent(student);

    setForm({
      full_name: student.full_name || "",
      user_number: student.user_number || "",
      phone: student.phone || "",

      birth_date: student.birth_date || "",
      gender: student.gender || "",
      nationality: student.nationality || "",
      residence_address: student.residence_address || "",

      guardian_name:
        student.guardian_name ||
        student.parent_name ||
        "",
      guardian_phone:
        student.guardian_phone ||
        student.parent_phone ||
        "",
      guardian_relation:
        student.guardian_relation || "",

      education_stage:
        student.education_stage ||
        student.education_level ||
        "",
      education_grade:
        student.education_grade || "",

      learning_goal:
        student.learning_goal || "",

      recitation_mode:
        student.recitation_mode || "",

      recitation_days: Array.isArray(student.recitation_days)
        ? student.recitation_days
        : [],

      preferred_recitation_time:
        student.preferred_recitation_time || "",

      halaqa_id: student.halaqa_id
        ? String(student.halaqa_id)
        : "",

      notes: student.notes || "",
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingStudent(null);
    setForm(EMPTY_FORM);
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleDay(day) {
    setForm((current) => ({
      ...current,
      recitation_days: current.recitation_days.includes(day)
        ? current.recitation_days.filter((item) => item !== day)
        : [...current.recitation_days, day],
    }));
  }

  /* =====================================================
     Save
  ===================================================== */

  async function saveStudent() {
    const fullName = normalizeText(form.full_name);
    let userNumber = normalizeText(form.user_number);

    if (!fullName) {
      showToast("أدخل اسم الطالب.", "error");
      return;
    }

    if (!userNumber && !editingStudent) {
      try {
        userNumber = await generateStudentNumber();
        setForm((current) => ({ ...current, user_number: userNumber }));
      } catch (error) {
        showToast(
          error?.message || "تعذر توليد رقم الطالب تلقائيًا.",
          "error"
        );
        return;
      }
    }

    if (!userNumber) {
      showToast("رقم الطالب غير متوفر.", "error");
      return;
    }

    if (!form.halaqa_id && currentProfile?.role === "supervisor") {
      showToast(
        "يجب ربط الطالب بإحدى حلقاتك.",
        "error"
      );
      return;
    }

    const age = getAgeFromBirthDate(form.birth_date);

    if (age !== null && (age < 3 || age > 100)) {
      showToast(
        "تاريخ الميلاد ينتج عمرًا غير منطقي.",
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      const profilePayload = {
        role: "student",
        full_name: fullName,
        user_number: userNumber,
        phone: normalizeText(form.phone) || null,

        birth_date: form.birth_date || null,
        age,

        gender: form.gender || null,
        nationality: normalizeText(form.nationality) || null,
        residence_address:
          normalizeText(form.residence_address) || null,

        guardian_name:
          normalizeText(form.guardian_name) || null,
        guardian_phone:
          normalizeText(form.guardian_phone) || null,
        guardian_relation:
          normalizeText(form.guardian_relation) || null,

        education_stage:
          form.education_stage || null,

        // توافق مع الشاشات القديمة التي ما زالت تقرأ education_level
        education_level:
          form.education_stage || null,

        education_grade:
          normalizeText(form.education_grade) || null,

        learning_goal:
          form.learning_goal || null,

        recitation_mode:
          form.recitation_mode || null,

        recitation_days:
          Array.isArray(form.recitation_days)
            ? form.recitation_days
            : [],

        preferred_recitation_time:
          form.preferred_recitation_time || null,

        notes: normalizeText(form.notes) || null,

        status:
          editingStudent?.status || "active",
      };

      let studentId = editingStudent?.id || null;

      if (studentId) {
        const {
          error: updateError,
        } = await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("id", studentId)
          .eq("role", "student");

        if (updateError) throw updateError;
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("profiles")
          .insert(profilePayload)
          .select("id")
          .single();

        if (insertError) throw insertError;

        studentId = data?.id;
      }

      if (!studentId) {
        throw new Error("تعذر تحديد الطالب بعد الحفظ.");
      }

      if (form.halaqa_id) {
        const targetHalaqaId = Number(form.halaqa_id);

        const allowedHalaqa = halaqat.some(
          (item) => Number(item.id) === targetHalaqaId
        );

        if (!allowedHalaqa) {
          throw new Error(
            "الحلقة المحددة ليست ضمن نطاق صلاحيتك."
          );
        }

        const {
          data: currentLinks,
          error: currentLinksError,
        } = await supabase
          .from("student_halaqat")
          .select("id, halaqa_id")
          .eq("student_id", studentId)
          .eq("is_current", true);

        if (currentLinksError) throw currentLinksError;

        const currentLink = (currentLinks || [])[0];

        if (
          !currentLink ||
          Number(currentLink.halaqa_id) !== targetHalaqaId
        ) {
          if (currentLinks?.length) {
            const {
              error: deactivateError,
            } = await supabase
              .from("student_halaqat")
              .update({
                is_current: false,
                end_date: new Date()
                  .toISOString()
                  .slice(0, 10),
              })
              .eq("student_id", studentId)
              .eq("is_current", true);

            if (deactivateError) throw deactivateError;
          }

          const {
            data: oldLink,
            error: oldLinkError,
          } = await supabase
            .from("student_halaqat")
            .select("id")
            .eq("student_id", studentId)
            .eq("halaqa_id", targetHalaqaId)
            .maybeSingle();

          if (oldLinkError) throw oldLinkError;

          if (oldLink) {
            const {
              error: reactivateError,
            } = await supabase
              .from("student_halaqat")
              .update({
                is_current: true,
                start_date: new Date()
                  .toISOString()
                  .slice(0, 10),
                end_date: null,
              })
              .eq("id", oldLink.id);

            if (reactivateError) throw reactivateError;
          } else {
            const {
              error: linkError,
            } = await supabase
              .from("student_halaqat")
              .insert({
                student_id: studentId,
                halaqa_id: targetHalaqaId,
                is_current: true,
              });

            if (linkError) throw linkError;
          }
        }
      } else if (
        editingStudent &&
        currentProfile?.role === "admin"
      ) {
        const {
          error: unlinkError,
        } = await supabase
          .from("student_halaqat")
          .update({
            is_current: false,
            end_date: new Date()
              .toISOString()
              .slice(0, 10),
          })
          .eq("student_id", studentId)
          .eq("is_current", true);

        if (unlinkError) throw unlinkError;
      }

      showToast(
        editingStudent
          ? "تم تحديث بيانات الطالب بنجاح."
          : "تمت إضافة الطالب بنجاح.",
        "success"
      );

      closeModal();
      await loadPage();
    } catch (error) {
      console.error("SAVE STUDENT:", error);

      showToast(
        error?.message || "تعذر حفظ بيانات الطالب.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Status
  ===================================================== */

  async function toggleStudentStatus(student) {
    try {
      const newStatus =
        student.status === "active"
          ? "inactive"
          : "active";

      const {
        error,
      } = await supabase
        .from("profiles")
        .update({
          status: newStatus,
        })
        .eq("id", student.id)
        .eq("role", "student");

      if (error) throw error;

      showToast(
        newStatus === "active"
          ? "تم تفعيل الطالب."
          : "تم إيقاف الطالب.",
        "success"
      );

      setStatusTarget(null);
      await loadPage();
    } catch (error) {
      console.error("TOGGLE STUDENT STATUS:", error);

      showToast(
        error?.message || "تعذر تغيير حالة الطالب.",
        "error"
      );
    }
  }

  /* =====================================================
     Delete
  ===================================================== */

  async function deleteStudent(student) {
    if (!student?.id) return;

    try {
      setSaving(true);

      const studentId = Number(student.id);

      const knownDependencies = [
        "monthly_progress",
        "monthly_plans",
        "noorania_recitations",
        "recitations",
        "attendance",
        "points_transactions",
        "exam_results",
        "exam_students",
        "student_halaqat",
      ];

      for (const table of knownDependencies) {
        const {
          error,
        } = await supabase
          .from(table)
          .delete()
          .eq("student_id", studentId);

        if (error) {
          throw new Error(
            `تعذر تنظيف بيانات الطالب من ${table}: ${error.message}`
          );
        }
      }

      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .delete()
        .eq("id", studentId)
        .eq("role", "student");

      if (profileError) throw profileError;

      showToast(
        "تم حذف الطالب وبياناته المرتبطة المعروفة.",
        "success"
      );

      setDeleteTarget(null);
      await loadPage();
    } catch (error) {
      console.error("DELETE STUDENT:", error);

      showToast(
        error?.message ||
          "تعذر حذف الطالب. قد توجد جداول أخرى مرتبطة به.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Filters
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
        student.nationality,
        student.residence_address,
        student.halaqa_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !text || searchable.includes(text);

      const matchesStatus =
        statusFilter === "all" ||
        student.status === statusFilter;

      const matchesHalaqa =
        halaqaFilter === "all" ||
        String(student.halaqa_id || "") === halaqaFilter;

      const stage =
        student.education_stage ||
        student.education_level ||
        "";

      const matchesStage =
        stageFilter === "all" || stage === stageFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesHalaqa &&
        matchesStage
      );
    });
  }, [
    students,
    search,
    statusFilter,
    halaqaFilter,
    stageFilter,
  ]);

  /* =====================================================
     KPIs
  ===================================================== */

  const activeCount = students.filter(
    (student) => student.status === "active"
  ).length;

  const linkedCount = students.filter(
    (student) => Boolean(student.halaqa_id)
  ).length;

  const incompleteCount = students.filter(
    (student) => !student.profile_complete
  ).length;

  const averageAttendance =
    students.length === 0
      ? 0
      : Math.round(
          students.reduce(
            (sum, student) =>
              sum + Number(student.attendance_rate || 0),
            0
          ) / students.length
        );

  const attentionCount = students.filter((student) =>
    student.status === "active" &&
    (Number(student.attendance_rate || 0) < 70 ||
      Number(student.recitations_count || 0) === 0 ||
      !student.profile_complete ||
      !student.halaqa_id)
  ).length;

  const hasFilters =
    search ||
    statusFilter !== "all" ||
    halaqaFilter !== "all" ||
    stageFilter !== "all";

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setHalaqaFilter("all");
    setStageFilter("all");
  }

  return (
    <div
      className="students-supervisor-page"
      dir="rtl"
    >
      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <section className="students-page-hero">
        <div className="students-page-hero-main">
          <div className="students-page-hero-icon">
            <Users size={22} />
          </div>

          <div>
            <div className="students-page-eyebrow">
              <Sparkles size={11} />
              إدارة الطلاب
            </div>

            <h1>الطلاب</h1>

            <p>
              إدارة ملفات الطلاب وربطهم بالحلقات ومتابعة
              بيانات ولي الأمر والحضور والتسميع والنقاط.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="students-add-button"
          onClick={openCreate}
          disabled={
            currentProfile?.role === "supervisor" &&
            halaqat.length === 0
          }
        >
          <Plus size={15} />
          إضافة طالب
        </button>
      </section>

      {/* =========================================
          STATS
      ========================================= */}

      <section className="students-stats-grid">
        <StudentStat
          label="إجمالي الطلاب"
          value={students.length}
          icon={Users}
          tone="green"
          sub="ضمن نطاق المشرف"
        />

        <StudentStat
          label="الطلاب النشطون"
          value={activeCount}
          icon={UserCheck}
          tone="blue"
          sub="حسابات فعالة"
        />

        <StudentStat
          label="مرتبطون بحلقة"
          value={linkedCount}
          icon={BookOpen}
          tone="gold"
          sub={`من ${students.length} طالب`}
        />

        <StudentStat
          label="متوسط الحضور"
          value={`${averageAttendance}%`}
          icon={CheckCircle2}
          tone={
            averageAttendance >= 75
              ? "green"
              : averageAttendance >= 50
                ? "gold"
                : "red"
          }
          sub="آخر 30 يومًا"
        />

        <StudentStat
          label="بيانات تحتاج استكمال"
          value={incompleteCount}
          icon={AlertTriangle}
          tone={
            incompleteCount > 0 ? "red" : "green"
          }
          sub="ولي الأمر / الجنس / الجنسية"
        />

        <StudentStat
          label="تحتاج متابعة"
          value={attentionCount}
          icon={Sparkles}
          tone={attentionCount > 0 ? "gold" : "green"}
          sub="حضور / تسميع / ملف / حلقة"
        />
      </section>

      {/* =========================================
          FILTERS
      ========================================= */}

      <section className="students-filter-card">
        <div className="students-filter-search">
          <Search size={15} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="ابحث بالاسم أو الرقم أو الجوال أو ولي الأمر..."
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="مسح البحث"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "كل الحالات" },
            { value: "active", label: "نشط" },
            { value: "inactive", label: "غير نشط" },
            { value: "archived", label: "مؤرشف" },
          ]}
        />

        <FilterSelect
          value={halaqaFilter}
          onChange={setHalaqaFilter}
          options={[
            { value: "all", label: "كل الحلقات" },
            ...halaqat.map((halaqa) => ({
              value: String(halaqa.id),
              label: halaqa.name,
            })),
          ]}
        />

        <FilterSelect
          value={stageFilter}
          onChange={setStageFilter}
          options={[
            { value: "all", label: "كل المراحل" },
            ...EDUCATION_STAGES,
          ]}
        />

        <button
          type="button"
          className="students-reset-filter"
          onClick={resetFilters}
          disabled={!hasFilters}
        >
          <RotateCcw size={13} />
          إعادة
        </button>
      </section>

      {/* =========================================
          RESULT HEADER
      ========================================= */}

      <div className="students-result-header">
        <div>
          <h2>قائمة الطلاب</h2>

          <p>
            عرض {formatNumber(filteredStudents.length)} من{" "}
            {formatNumber(students.length)} طالب
          </p>
        </div>

        {currentProfile?.role === "supervisor" && (
          <span className="students-scope-badge">
            <ShieldCheck size={12} />
            الطلاب التابعون لمساجدك فقط
          </span>
        )}
      </div>

      {/* =========================================
          LIST
      ========================================= */}

      {loading ? (
        <StudentsLoading />
      ) : filteredStudents.length === 0 ? (
        <StudentsEmpty
          filtered={Boolean(hasFilters)}
          onReset={resetFilters}
          canCreate={
            !(
              currentProfile?.role === "supervisor" &&
              halaqat.length === 0
            )
          }
          onCreate={openCreate}
        />
      ) : (
        <section className="students-card-grid">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onEdit={openEdit}
              onToggle={() => setStatusTarget(student)}
              onDelete={() => setDeleteTarget(student)}
            />
          ))}
        </section>
      )}

      {/* =========================================
          CREATE / EDIT MODAL
      ========================================= */}

      <StudentFormModal
        open={modalOpen}
        editingStudent={editingStudent}
        form={form}
        updateForm={updateForm}
        toggleDay={toggleDay}
        halaqat={halaqat}
        saving={saving}
        onSave={saveStudent}
        onClose={closeModal}
      />

      {/* =========================================
          STATUS CONFIRM
      ========================================= */}

      <ConfirmModal
        open={Boolean(statusTarget)}
        title={
          statusTarget?.status === "active"
            ? "إيقاف الطالب"
            : "تفعيل الطالب"
        }
        message={
          statusTarget
            ? statusTarget.status === "active"
              ? `سيتم إيقاف الطالب "${statusTarget.full_name}". سيبقى ملفه محفوظًا في النظام.`
              : `سيتم تفعيل الطالب "${statusTarget.full_name}" من جديد.`
            : ""
        }
        onConfirm={() =>
          statusTarget &&
          toggleStudentStatus(statusTarget)
        }
        onCancel={() => setStatusTarget(null)}
      />

      {/* =========================================
          DELETE CONFIRM
      ========================================= */}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="حذف الطالب نهائيًا"
        message={
          deleteTarget
            ? `هل تريد حذف الطالب "${deleteTarget.full_name}" نهائيًا؟\n\nسيتم حذف بياناته من الجداول المرتبطة المعروفة. إذا كان الطالب مرتبطًا بسجلات أخرى فقد يتعذر الحذف لحماية سجله.`
            : ""
        }
        onConfirm={() =>
          deleteTarget && deleteStudent(deleteTarget)
        }
        onCancel={() => setDeleteTarget(null)}
      />

      <style>{`
        .students-supervisor-page {
          display: grid;
          gap: calc(14px * var(--app-density,1));
          color: #34463B;
        }

        /* HERO */

        .students-page-hero {
          position: relative;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(14px * var(--app-density,1));

          padding: calc(15px * var(--app-density,1)) calc(17px * var(--app-density,1));

          border: 1px solid #E4EAE6;
          border-radius: calc(18px * var(--app-radius-scale,1));

          background:
            linear-gradient(
              135deg,
              #FFFFFF 0%,
              #F7FBF8 72%,
              #FFFDF7 100%
            );

          box-shadow:
            0 9px 26px rgba(26,54,41,.045);
        }

        .students-page-hero::after {
          content: "";

          position: absolute;
          left: -24px;
          top: -40px;

          width: 140px;
          height: 140px;

          border: 1px solid rgba(185,144,55,.12);
          border-radius: 50%;

          box-shadow:
            0 0 0 18px rgba(185,144,55,.025),
            0 0 0 36px color-mix(in srgb,var(--app-color-0f766e,#0f766e) 1.7999999999999998%,transparent);

          pointer-events: none;
        }

        .students-page-hero-main {
          position: relative;
          z-index: 2;

          display: flex;
          align-items: center;

          gap: calc(10px * var(--app-density,1));

          min-width: 0;
        }

        .students-page-hero-icon {
          width: 43px;
          height: 43px;

          flex: 0 0 43px;

          border-radius: calc(13px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #FFFFFF;

          background:
            linear-gradient(
              145deg,
              var(--app-color-0f5132,#0F5132),
              var(--app-color-0f766e,#0F766E)
            );

          box-shadow:
            0 8px 18px color-mix(in srgb,var(--app-color-0f5132,#0f5132) 12%,transparent);
        }

        .students-page-eyebrow {
          display: flex;
          align-items: center;

          gap: calc(3px * var(--app-density,1));

          color: #98772C;

          font-size: calc(6px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .students-page-hero h1 {
          margin: 1px 0 0;

          color: #35463C;

          font-size: calc(15px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .students-page-hero p {
          margin: 3px 0 0;

          color: #8D9791;

          font-size: calc(6px * var(--app-font-scale,1));
          line-height: 1.55;
        }

        .students-add-button {
          position: relative;
          z-index: 2;

          min-height: 36px;

          padding: 0 calc(12px * var(--app-density,1));

          border: none;
          border-radius: calc(9px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(5px * var(--app-density,1));

          color: #FFFFFF;

          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0F5132),
              var(--app-color-0f766e,#0F766E)
            );

          font-size: calc(6.5px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;

          box-shadow:
            0 8px 17px color-mix(in srgb,var(--app-color-0f5132,#0f5132) 12%,transparent);
        }

        .students-add-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        /* STATS */

        .students-stats-grid {
          display: grid;

          grid-template-columns:
            repeat(6, minmax(0,1fr));

          gap: calc(8px * var(--app-density,1));
        }

        .students-stat-card {
          position: relative;

          overflow: hidden;

          min-width: 0;

          padding: calc(11px * var(--app-density,1));

          border: 1px solid #E5EBE7;
          border-radius: calc(13px * var(--app-radius-scale,1));

          background: #FFFFFF;

          box-shadow:
            0 8px 22px rgba(25,51,39,.035);
        }

        .students-stat-card::before {
          content: "";

          position: absolute;
          top: 0;
          right: 0;
          left: 0;

          height: 2px;

          background: var(--stat-color);
        }

        .students-stat-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(6px * var(--app-density,1));
        }

        .students-stat-card-label {
          color: #8E9892;

          font-size: calc(5.4px * var(--app-font-scale,1));
          font-weight: 800;
        }

        .students-stat-card-icon {
          width: 29px;
          height: 29px;

          flex: 0 0 29px;

          border-radius: calc(8px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--stat-color);
          background: var(--stat-soft);
        }

        .students-stat-card strong {
          display: block;

          margin-top: 8px;

          color: var(--stat-color);

          font-size: calc(18px * var(--app-font-scale,1));
          font-weight: 950;
          line-height: 1;
        }

        .students-stat-card small {
          display: block;

          margin-top: 5px;

          overflow: hidden;

          color: #9AA29D;

          font-size: calc(5px * var(--app-font-scale,1));

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* FILTERS */

        .students-filter-card {
          display: grid;

          grid-template-columns:
            minmax(230px,1.4fr)
            minmax(130px,.7fr)
            minmax(150px,.8fr)
            minmax(150px,.8fr)
            auto;

          gap: calc(7px * var(--app-density,1));

          padding: calc(9px * var(--app-density,1));

          border: 1px solid #E5EBE7;
          border-radius: calc(13px * var(--app-radius-scale,1));

          background: #FFFFFF;

          box-shadow:
            0 7px 20px rgba(25,51,39,.03);
        }

        .students-filter-search {
          position: relative;
        }

        .students-filter-search > svg {
          position: absolute;
          right: 10px;
          top: 50%;

          transform: translateY(-50%);

          color: #8D9791;

          pointer-events: none;
        }

        .students-filter-search input,
        .students-filter-select select {
          width: 100%;
          height: 38px;

          border: 1px solid #DDE5E0;
          border-radius: calc(9px * var(--app-radius-scale,1));

          outline: none;

          color: #3D4D43;
          background: #FBFDFC;

          font-family: inherit;
          font-size: calc(6.3px * var(--app-font-scale,1));
        }

        .students-filter-search input {
          padding: 0 calc(32px * var(--app-density,1)) 0 calc(31px * var(--app-density,1));
        }

        .students-filter-search input:focus,
        .students-filter-select select:focus {
          border-color: #A3C6B0;

          box-shadow:
            0 0 0 3px color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);

          background: #FFFFFF;
        }

        .students-filter-search button {
          position: absolute;
          left: 8px;
          top: 50%;

          width: 21px;
          height: 21px;

          transform: translateY(-50%);

          border: none;
          border-radius: calc(6px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #76827A;
          background: #EDF2EF;

          cursor: pointer;
        }

        .students-filter-select {
          position: relative;
        }

        .students-filter-select select {
          appearance: none;

          padding: 0 calc(10px * var(--app-density,1)) 0 calc(29px * var(--app-density,1));
        }

        .students-filter-select svg {
          position: absolute;
          left: 9px;
          top: 50%;

          transform: translateY(-50%);

          color: #89938D;

          pointer-events: none;
        }

        .students-reset-filter {
          min-height: 38px;

          padding: 0 calc(9px * var(--app-density,1));

          border: 1px solid #DDE5E0;
          border-radius: calc(9px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(4px * var(--app-density,1));

          color: #536159;
          background: var(--app-color-f8fbf9,#F8FBF9);

          font-size: calc(5.8px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        .students-reset-filter:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        /* RESULT HEADER */

        .students-result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(10px * var(--app-density,1));

          padding: calc(2px * var(--app-density,1)) calc(2px * var(--app-density,1)) 0;
        }

        .students-result-header h2 {
          margin: 0;

          color: #35463C;

          font-size: calc(10px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .students-result-header p {
          margin: 2px 0 0;

          color: #929B95;

          font-size: calc(5.5px * var(--app-font-scale,1));
        }

        .students-scope-badge {
          min-height: 28px;

          padding: 0 calc(8px * var(--app-density,1));

          border: 1px solid #DCE8E0;
          border-radius: 999px;

          display: inline-flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          color: #0F6848;
          background: #F3F9F5;

          font-size: calc(5.5px * var(--app-font-scale,1));
          font-weight: 900;
        }

        /* STUDENT CARDS */

        .students-card-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fill,
              minmax(310px,1fr)
            );

          gap: calc(10px * var(--app-density,1));
        }

        .student-profile-card {
          position: relative;

          min-width: 0;
          overflow: hidden;

          padding: calc(12px * var(--app-density,1));

          border: 1px solid #E5EBE7;
          border-radius: calc(15px * var(--app-radius-scale,1));

          background: #FFFFFF;

          box-shadow:
            0 8px 23px rgba(25,51,39,.04);

          transition:
            transform .17s ease,
            box-shadow .17s ease,
            border-color .17s ease;
        }

        .student-profile-card:hover {
          transform: translateY(-2px);

          border-color: #C9DCD0;

          box-shadow:
            0 12px 26px rgba(25,51,39,.06);
        }

        .student-profile-card.inactive {
          opacity: .76;
        }

        .student-profile-card::before {
          content: "";

          position: absolute;
          top: 0;
          right: 0;
          left: 0;

          height: 2px;

          background:
            linear-gradient(
              90deg,
              transparent,
              var(--app-color-0f766e,#0F766E),
              #B99037,
              transparent
            );
        }

        .student-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: calc(8px * var(--app-density,1));
        }

        .student-card-identity {
          display: flex;
          align-items: center;

          gap: calc(8px * var(--app-density,1));

          min-width: 0;
        }

        .student-card-avatar {
          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #FFFFFF;

          background:
            linear-gradient(
              145deg,
              var(--app-color-0f5132,#0F5132),
              var(--app-color-0f766e,#0F766E)
            );

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .student-card-name {
          min-width: 0;
        }

        .student-card-name span,
        .student-card-name strong,
        .student-card-name small {
          display: block;
        }

        .student-card-name span {
          color: #9AA29D;
          font-size: calc(5px * var(--app-font-scale,1));
        }

        .student-card-name strong {
          margin-top: 1px;

          overflow: hidden;

          color: #3A4A40;

          font-size: calc(8.5px * var(--app-font-scale,1));
          font-weight: 950;

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .student-card-name small {
          margin-top: 2px;

          color: #929B95;
          font-size: calc(5px * var(--app-font-scale,1));
        }

        .student-status-badge {
          min-height: 23px;

          padding: 0 calc(6px * var(--app-density,1));

          border-radius: 999px;

          display: inline-flex;
          align-items: center;

          gap: calc(3px * var(--app-density,1));

          font-size: calc(5.2px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .student-status-badge.active {
          color: #0F704A;

          border: 1px solid #D9EADD;

          background: #F0F9F3;
        }

        .student-status-badge.inactive {
          color: #9D463A;

          border: 1px solid #EED8D3;

          background: #FFF4F1;
        }

        .student-card-primary-grid {
          display: grid;

          grid-template-columns:
            repeat(2,minmax(0,1fr));

          gap: calc(6px * var(--app-density,1));

          margin-top: 10px;
        }

        .student-info-box {
          min-width: 0;

          padding: calc(8px * var(--app-density,1));

          border: 1px solid #E8ECEA;
          border-radius: calc(9px * var(--app-radius-scale,1));

          background: #FBFDFC;
        }

        .student-info-box span {
          display: flex;
          align-items: center;

          gap: calc(3px * var(--app-density,1));

          color: #949D97;

          font-size: calc(5px * var(--app-font-scale,1));
        }

        .student-info-box strong {
          display: block;

          margin-top: 3px;

          overflow: hidden;

          color: #536159;

          font-size: calc(6.2px * var(--app-font-scale,1));
          font-weight: 900;

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .student-guardian-box {
          margin-top: 7px;
          padding: calc(9px * var(--app-density,1));

          border: 1px solid #E9E5D8;
          border-radius: calc(10px * var(--app-radius-scale,1));

          background:
            linear-gradient(
              135deg,
              #FFFDF8,
              #FFFFFF
            );
        }

        .student-guardian-head {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(8px * var(--app-density,1));
        }

        .student-guardian-head span {
          display: flex;
          align-items: center;

          gap: calc(3px * var(--app-density,1));

          color: #947124;

          font-size: calc(5.4px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .student-guardian-complete {
          color: var(--app-color-0f704a,#0F704A);
          font-size: calc(5px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .student-guardian-incomplete {
          color: #A44337;
          font-size: calc(5px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .student-guardian-grid {
          display: grid;

          grid-template-columns:
            repeat(3,minmax(0,1fr));

          gap: calc(5px * var(--app-density,1));

          margin-top: 7px;
        }

        .student-guardian-grid div span,
        .student-guardian-grid div strong {
          display: block;
        }

        .student-guardian-grid div span {
          color: #9A9F9B;
          font-size: calc(4.7px * var(--app-font-scale,1));
        }

        .student-guardian-grid div strong {
          margin-top: 2px;

          overflow: hidden;

          color: #5B5C58;

          font-size: calc(5.7px * var(--app-font-scale,1));
          font-weight: 850;

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .student-performance-row {
          display: grid;

          grid-template-columns:
            1fr 1fr 1fr;

          gap: calc(6px * var(--app-density,1));

          margin-top: 7px;
        }

        .student-performance-box {
          padding: calc(8px * var(--app-density,1));

          border: 1px solid #E7ECE9;
          border-radius: calc(9px * var(--app-radius-scale,1));

          background: #FFFFFF;

          text-align: center;
        }

        .student-performance-box span,
        .student-performance-box strong {
          display: block;
        }

        .student-performance-box span {
          color: #929B95;

          font-size: calc(4.8px * var(--app-font-scale,1));
        }

        .student-performance-box strong {
          margin-top: 2px;

          color: #3D4D43;

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .student-attendance-bar {
          height: 5px;

          margin-top: 4px;

          overflow: hidden;

          border-radius: 999px;

          background: #EEF2EF;
        }

        .student-attendance-bar div {
          height: 100%;

          border-radius: 999px;

          background:
            linear-gradient(
              90deg,
              var(--app-color-0f766e,#0F766E),
              #65A578
            );
        }

        .student-recitation-line {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(8px * var(--app-density,1));

          margin-top: 7px;
          padding: calc(7px * var(--app-density,1)) calc(8px * var(--app-density,1));

          border-top: 1px solid #EEF2EF;

          color: #8B958F;

          font-size: calc(5px * var(--app-font-scale,1));
        }

        .student-recitation-line span {
          display: inline-flex;
          align-items: center;

          gap: calc(3px * var(--app-density,1));
        }

        .student-recitation-line strong {
          color: #536159;
          font-size: calc(5.4px * var(--app-font-scale,1));
        }

        .student-smart-alert {
          display: flex;
          align-items: flex-start;
          gap: calc(5px * var(--app-density,1));
          margin-top: 7px;
          padding: calc(7px * var(--app-density,1)) calc(8px * var(--app-density,1));
          border: 1px solid #F0DFC0;
          border-radius: calc(9px * var(--app-radius-scale,1));
          color: #85651F;
          background: #FFF9ED;
          font-size: calc(5px * var(--app-font-scale,1));
          font-weight: 800;
          line-height: 1.55;
        }

        .student-smart-alert svg {
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .student-card-actions {
          display: grid;

          grid-template-columns:
            1fr 1fr 1fr;

          gap: calc(5px * var(--app-density,1));

          margin-top: 9px;
        }

        .student-card-action {
          min-height: 32px;

          border: none;
          border-radius: calc(8px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(3px * var(--app-density,1));

          font-size: calc(5.5px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        .student-card-action.edit {
          color: #3D6655;
          background: #EDF6F1;
        }

        .student-card-action.status {
          color: #8A6822;
          background: #FFF8E8;
        }

        .student-card-action.delete {
          color: #A34236;
          background: #FFF0ED;
        }

        /* LOADING / EMPTY */

        .students-state-card {
          min-height: 220px;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          gap: calc(5px * var(--app-density,1));

          padding: calc(20px * var(--app-density,1));

          border: 1px dashed #DDE5E0;
          border-radius: calc(14px * var(--app-radius-scale,1));

          color: #929C96;
          background: #FBFDFC;

          text-align: center;
        }

        .students-state-icon {
          width: 42px;
          height: 42px;

          border-radius: calc(12px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #0F6B49;
          background: var(--app-color-edf7f1,#EDF7F1);
        }

        .students-state-card strong {
          color: #57645C;
          font-size: calc(8px * var(--app-font-scale,1));
        }

        .students-state-card p {
          max-width: 360px;

          margin: 0;

          color: #929B95;

          font-size: calc(5.7px * var(--app-font-scale,1));
          line-height: 1.5;
        }

        .students-state-actions {
          display: flex;
          align-items: center;

          gap: calc(5px * var(--app-density,1));

          margin-top: 5px;
        }

        .students-state-actions button {
          min-height: 30px;

          padding: 0 calc(9px * var(--app-density,1));

          border: none;
          border-radius: calc(8px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          color: #FFFFFF;
          background: var(--app-color-0f6848,#0F6848);

          font-size: calc(5.7px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        /* MODAL */

        .student-form-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;

          display: flex;
          align-items: center;
          justify-content: center;

          /* نفس منطق نافذة المعلم: فراغ واضح عن التوب بار والحواف */
          padding: clamp(calc(76px * var(--app-density,1)), 9vh, calc(104px * var(--app-density,1))) clamp(calc(18px * var(--app-density,1)), 3vw, calc(42px * var(--app-density,1))) clamp(calc(20px * var(--app-density,1)), 3vh, calc(34px * var(--app-density,1)));

          background:
            rgba(10,29,24,.58);

          backdrop-filter: blur(7px);
        }

        .student-form-modal {
          width: min(760px, calc(100vw - 48px));
          max-height: calc(100dvh - clamp(100px, 12vh, 138px));

          overflow: auto;

          border: 1px solid rgba(255,255,255,.5);
          border-radius: calc(22px * var(--app-radius-scale,1));

          background: #FFFFFF;

          box-shadow:
            0 30px 90px rgba(0,0,0,.25);
        }

        .student-form-header {
          position: sticky;
          top: 0;
          z-index: 20;

          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: calc(12px * var(--app-density,1));

          padding: calc(14px * var(--app-density,1)) calc(17px * var(--app-density,1));

          border-bottom: 1px solid #E8EEE9;

          background:
            rgba(255,255,255,.97);

          backdrop-filter: blur(10px);
        }

        .student-form-heading {
          display: flex;
          align-items: center;

          gap: calc(9px * var(--app-density,1));
        }

        .student-form-heading-icon {
          width: 39px;
          height: 39px;

          flex: 0 0 39px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #FFFFFF;

          background:
            linear-gradient(
              145deg,
              var(--app-color-0f5132,#0F5132),
              var(--app-color-0f766e,#0F766E)
            );
        }

        .student-form-heading span {
          display: block;

          color: #98772C;

          font-size: calc(5.4px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .student-form-heading h2 {
          margin: 1px 0 0;

          color: #35463C;

          font-size: calc(12px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .student-form-heading p {
          margin: 2px 0 0;

          color: #8D9791;

          font-size: calc(5.5px * var(--app-font-scale,1));
        }

        .student-form-close {
          width: 32px;
          height: 32px;

          border: 1px solid #E0E7E2;
          border-radius: calc(9px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #657169;
          background: #FFFFFF;

          cursor: pointer;
        }

        .student-form-body {
          display: grid;
          gap: calc(9px * var(--app-density,1));

          padding: calc(12px * var(--app-density,1)) calc(16px * var(--app-density,1)) calc(16px * var(--app-density,1));
        }

        .student-form-section {
          padding: calc(11px * var(--app-density,1));

          border: 1px solid #E7ECE9;
          border-radius: calc(13px * var(--app-radius-scale,1));

          background: #FFFFFF;
        }

        .student-form-section-title {
          display: flex;
          align-items: center;

          gap: calc(5px * var(--app-density,1));

          margin-bottom: 9px;

          color: #405046;

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .student-form-grid {
          display: grid;

          grid-template-columns:
            repeat(3,minmax(0,1fr));

          gap: calc(8px * var(--app-density,1));
        }

        .student-form-field.full {
          grid-column: 1 / -1;
        }

        .student-form-field.double {
          grid-column: span 2;
        }

        .student-form-field label {
          display: block;

          margin-bottom: 5px;

          color: #58665D;

          font-size: calc(5.7px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .student-form-field label b {
          color: #B42318;
        }

        .student-form-field input,
        .student-form-field select,
        .student-form-field textarea {
          width: 100%;

          border: 1px solid #DDE5E0;
          border-radius: calc(8px * var(--app-radius-scale,1));

          outline: none;

          box-sizing: border-box;

          color: #3D4D43;
          background: #FBFDFC;

          font-family: inherit;
          font-size: calc(6.3px * var(--app-font-scale,1));
        }

        .student-form-field input,
        .student-form-field select {
          height: 38px;

          padding: 0 calc(9px * var(--app-density,1));
        }

        .student-form-field textarea {
          min-height: 75px;

          padding: calc(8px * var(--app-density,1)) calc(9px * var(--app-density,1));

          resize: vertical;

          line-height: 1.6;
        }

        .student-auto-number-input {
          color: var(--app-color-0f6848,#0F6848) !important;
          background: #F0F8F3 !important;
          font-weight: 950;
          letter-spacing: .4px;
          cursor: default;
        }

        .student-field-hint {
          display: flex;
          align-items: center;
          gap: calc(3px * var(--app-density,1));
          margin-top: 4px;
          color: #8B958F;
          font-size: calc(4.8px * var(--app-font-scale,1));
          font-weight: 750;
        }

        .student-form-field input:focus,
        .student-form-field select:focus,
        .student-form-field textarea:focus {
          border-color: #A3C6B0;

          box-shadow:
            0 0 0 3px color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);

          background: #FFFFFF;
        }

        .student-form-days {
          display: grid;

          grid-template-columns:
            repeat(7,minmax(0,1fr));

          gap: calc(5px * var(--app-density,1));

          margin-top: 7px;
        }

        .student-form-day {
          min-height: 31px;

          border: 1px solid #DDE5E0;
          border-radius: calc(8px * var(--app-radius-scale,1));

          color: #66736B;
          background: #FFFFFF;

          font-size: calc(5.5px * var(--app-font-scale,1));
          font-weight: 850;

          cursor: pointer;
        }

        .student-form-day.active {
          border-color: #BFD5C7;

          color: var(--app-color-0f6848,#0F6848);
          background: var(--app-color-edf7f1,#EDF7F1);
        }

        .student-form-footer {
          position: sticky;
          bottom: 0;
          z-index: 20;

          display: flex;
          align-items: center;
          justify-content: flex-end;

          gap: calc(6px * var(--app-density,1));

          padding: calc(10px * var(--app-density,1)) calc(16px * var(--app-density,1));

          border-top: 1px solid #E9EEEB;

          background:
            rgba(251,253,252,.97);

          backdrop-filter: blur(10px);
        }

        .student-form-footer button {
          min-height: 36px;

          padding: 0 calc(11px * var(--app-density,1));

          border-radius: calc(9px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(4px * var(--app-density,1));

          font-size: calc(6px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        .student-form-cancel {
          border: 1px solid #DCE4DF;

          color: #647169;
          background: #FFFFFF;
        }

        .student-form-save {
          border: none;

          color: #FFFFFF;

          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0F5132),
              var(--app-color-0f766e,#0F766E)
            );
        }

        .student-form-save:disabled,
        .student-form-cancel:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .students-spin {
          animation: studentsSpin .8s linear infinite;
        }

        @keyframes studentsSpin {
          to {
            transform: rotate(360deg);
          }
        }

        /* RESPONSIVE */

        @media (max-width: 1100px) {
          .students-stats-grid {
            grid-template-columns:
              repeat(3,minmax(0,1fr));
          }

          .students-filter-card {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .students-reset-filter {
            grid-column: 1 / -1;
          }
        }

        @media (min-width: 761px) and (max-width: 1180px) {
          .student-form-overlay {
            padding: calc(86px * var(--app-density,1)) calc(24px * var(--app-density,1)) calc(24px * var(--app-density,1));
          }

          .student-form-modal {
            width: min(720px, calc(100vw - 48px));
            max-height: calc(100dvh - 110px);
          }
        }

        @media (max-width: 760px) {
          .students-page-hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .students-add-button {
            width: 100%;
          }

          .students-stats-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .students-filter-card {
            grid-template-columns: 1fr;
          }

          .students-reset-filter {
            grid-column: auto;
          }

          .students-result-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .students-card-grid {
            grid-template-columns: 1fr;
          }

          .student-form-overlay {
            align-items: center;
            justify-content: center;
            padding: calc(82px * var(--app-density,1)) calc(12px * var(--app-density,1)) calc(14px * var(--app-density,1));
          }

          .student-form-modal {
            width: min(100%, 620px);
            max-height: calc(100dvh - 96px);
            border-radius: calc(18px * var(--app-radius-scale,1));
          }

          .student-form-grid {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .student-form-days {
            grid-template-columns:
              repeat(4,minmax(0,1fr));
          }
        }

@media (max-width: 470px) {
  /* ===== STAT CARDS — MOBILE COMPACT ===== */

  .students-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: calc(7px * var(--app-density,1));
  }

  .students-stat-card {
    min-height: 78px;
    padding: calc(9px * var(--app-density,1)) calc(10px * var(--app-density,1));
    border-radius: calc(12px * var(--app-radius-scale,1));
  }

  .students-stat-card-head {
    gap: calc(5px * var(--app-density,1));
  }

  .students-stat-card-icon {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    border-radius: calc(9px * var(--app-radius-scale,1));
  }

  .students-stat-card-icon svg {
    width: 15px;
    height: 15px;
  }

  .students-stat-card-label {
    font-size: calc(10px * var(--app-font-scale,1));
    line-height: 1.3;
  }

  .students-stat-card strong {
    margin-top: 5px;
    font-size: calc(20px * var(--app-font-scale,1));
    line-height: 1;
  }

  .students-stat-card small {
    margin-top: 4px;
    font-size: calc(8px * var(--app-font-scale,1));
    line-height: 1.25;
  }

  .student-card-primary-grid,
  .student-performance-row,
  .student-guardian-grid,
  .student-card-actions,
  .student-form-grid {
    grid-template-columns: 1fr;
  }

  .student-form-field.double,
  .student-form-field.full {
    grid-column: auto;
  }

  .student-form-days {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
      `}</style>
    </div>
  );
}

/* =========================================================
   Student Card
========================================================= */

function StudentCard({
  student,
  onEdit,
  onToggle,
  onDelete,
}) {
  const active =
    student.status === "active";

  const guardianName =
    student.guardian_name ||
    student.parent_name ||
    "غير مسجل";

  const guardianPhone =
    student.guardian_phone ||
    student.parent_phone ||
    "غير مسجل";

  const guardianRelation =
    student.guardian_relation ||
    "غير محددة";

  const stage =
    student.education_stage ||
    student.education_level ||
    "";

  return (
    <article
      className={`student-profile-card ${
        active ? "" : "inactive"
      }`}
    >
      <div className="student-card-head">
        <div className="student-card-identity">
          <div className="student-card-avatar">
            {getInitials(student.full_name)}
          </div>

          <div className="student-card-name">
            <span>الطالب</span>

            <strong>
              {student.full_name || "بدون اسم"}
            </strong>

            <small>
              رقم الطالب: {student.user_number || "—"}
            </small>
          </div>
        </div>

        <span
          className={`student-status-badge ${
            active ? "active" : "inactive"
          }`}
        >
          {active ? (
            <CheckCircle2 size={11} />
          ) : (
            <CircleSlash size={11} />
          )}

          {active ? "نشط" : "غير نشط"}
        </span>
      </div>

      <div className="student-card-primary-grid">
        <StudentInfoBox
          icon={BookOpen}
          label="الحلقة"
          value={student.halaqa_name}
        />

        <StudentInfoBox
          icon={GraduationCap}
          label="المرحلة"
          value={getLabel(
            EDUCATION_STAGES,
            stage
          )}
        />

        <StudentInfoBox
          icon={VenusAndMars}
          label="الجنس"
          value={getLabel(
            GENDERS,
            student.gender
          )}
        />

        <StudentInfoBox
          icon={MapPin}
          label="الجنسية"
          value={student.nationality || "غير محددة"}
        />

        <StudentInfoBox
          icon={Phone}
          label="جوال الطالب"
          value={student.phone || "غير مسجل"}
        />

        <StudentInfoBox
          icon={Home}
          label="السكن"
          value={
            student.residence_address ||
            "غير مسجل"
          }
        />
      </div>

      <div className="student-guardian-box">
        <div className="student-guardian-head">
          <span>
            <UserRound size={12} />
            ولي الأمر
          </span>

          <span
            className={
              student.profile_complete
                ? "student-guardian-complete"
                : "student-guardian-incomplete"
            }
          >
            {student.profile_complete
              ? "مكتمل"
              : "يحتاج استكمال"}
          </span>
        </div>

        <div className="student-guardian-grid">
          <div>
            <span>الاسم</span>
            <strong>{guardianName}</strong>
          </div>

          <div>
            <span>صلة القرابة</span>
            <strong>{guardianRelation}</strong>
          </div>

          <div>
            <span>رقم التواصل</span>
            <strong>{guardianPhone}</strong>
          </div>
        </div>
      </div>

      <div className="student-performance-row">
        <div className="student-performance-box">
          <span>الحضور - 30 يوم</span>

          <strong>
            {student.attendance_rate}%
          </strong>

          <div className="student-attendance-bar">
            <div
              style={{
                width: `${student.attendance_rate}%`,
              }}
            />
          </div>
        </div>

        <div className="student-performance-box">
          <span>التسميعات</span>

          <strong>
            {formatNumber(student.recitations_count)}
          </strong>
        </div>

        <div className="student-performance-box">
          <span>رصيد النقاط</span>

          <strong>
            {formatNumber(student.total_points)}
          </strong>
        </div>
      </div>

      <div className="student-recitation-line">
        <span>
          <CalendarDays size={11} />
          آخر تسميع
        </span>

        <strong>
          {student.last_recitation
            ? formatDate(student.last_recitation)
            : "لا يوجد"}
        </strong>
      </div>

      {active && (
        Number(student.attendance_rate || 0) < 70 ||
        Number(student.recitations_count || 0) === 0 ||
        !student.profile_complete ||
        !student.halaqa_id
      ) && (
        <div className="student-smart-alert">
          <AlertTriangle size={12} />
          <span>
            متابعة إدارية: {!student.halaqa_id ? "غير مرتبط بحلقة • " : ""}
            {!student.profile_complete ? "الملف غير مكتمل • " : ""}
            {Number(student.attendance_rate || 0) < 70 ? "الحضور منخفض • " : ""}
            {Number(student.recitations_count || 0) === 0 ? "لا يوجد تسميع" : ""}
          </span>
        </div>
      )}

      <div className="student-card-actions">
        <button
          type="button"
          className="student-card-action edit"
          onClick={() => onEdit(student)}
        >
          <Edit3 size={13} />
          تعديل
        </button>

        <button
          type="button"
          className="student-card-action status"
          onClick={onToggle}
        >
          {active ? (
            <UserX size={13} />
          ) : (
            <UserCheck size={13} />
          )}

          {active ? "إيقاف" : "تفعيل"}
        </button>

        <button
          type="button"
          className="student-card-action delete"
          onClick={onDelete}
        >
          <Trash2 size={13} />
          حذف
        </button>
      </div>
      <StudentAccessCard studentId={student.id} />
    </article>
  );
}

/* =========================================================
   Form Modal
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
    if (!open) return;

    const oldOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving, onClose]);

  if (!open) return null;

  return (
    <div
      className="student-form-overlay"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <div
        className="student-form-modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="student-form-header">
          <div className="student-form-heading">
            <div className="student-form-heading-icon">
              {editingStudent ? (
                <Edit3 size={18} />
              ) : (
                <Plus size={18} />
              )}
            </div>

            <div>
              <span>
                ملف الطالب
              </span>

              <h2>
                {editingStudent
                  ? "تعديل بيانات الطالب"
                  : "إضافة طالب جديد"}
              </h2>

              <p>
                بيانات شخصية وتعليمية وولي الأمر
                وجدول التسميع.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="student-form-close"
            onClick={onClose}
            disabled={saving}
          >
            <X size={16} />
          </button>
        </div>

        <div className="student-form-body">
          <FormSection
            icon={UserRound}
            title="البيانات الأساسية"
          >
            <div className="student-form-grid">
              <Field
                label="اسم الطالب"
                required
                value={form.full_name}
                onChange={(value) =>
                  updateForm("full_name", value)
                }
                placeholder="الاسم الرباعي"
                className="double"
              />

              <Field
                label="رقم الطالب"
                required
                value={form.user_number}
                onChange={() => {}}
                placeholder="يُنشأ تلقائيًا"
                readOnly
                hint={editingStudent ? "رقم الطالب ثابت" : "تم توليده تلقائيًا بواسطة النظام"}
              />

              <Field
                label="جوال الطالب"
                value={form.phone}
                onChange={(value) =>
                  updateForm("phone", value)
                }
                placeholder="05xxxxxxxx"
                type="tel"
              />

              <Field
                label="تاريخ الميلاد"
                value={form.birth_date}
                onChange={(value) =>
                  updateForm("birth_date", value)
                }
                type="date"
              />

              <SelectField
                label="الجنس"
                value={form.gender}
                onChange={(value) =>
                  updateForm("gender", value)
                }
                options={[
                  { value: "", label: "غير محدد" },
                  ...GENDERS,
                ]}
              />

              <Field
                label="الجنسية"
                value={form.nationality}
                onChange={(value) =>
                  updateForm("nationality", value)
                }
                placeholder="مثال: سعودي"
              />

              <Field
                label="عنوان السكن"
                value={form.residence_address}
                onChange={(value) =>
                  updateForm(
                    "residence_address",
                    value
                  )
                }
                placeholder="الحي / المدينة / وصف مختصر"
                className="double"
              />
            </div>
          </FormSection>

          <FormSection
            icon={ShieldCheck}
            title="بيانات ولي الأمر"
          >
            <div className="student-form-grid">
              <Field
                label="اسم ولي الأمر"
                value={form.guardian_name}
                onChange={(value) =>
                  updateForm("guardian_name", value)
                }
                placeholder="اسم ولي الأمر"
              />

              <Field
                label="جوال ولي الأمر"
                value={form.guardian_phone}
                onChange={(value) =>
                  updateForm("guardian_phone", value)
                }
                placeholder="05xxxxxxxx"
                type="tel"
              />

              <SelectField
                label="صلة القرابة"
                value={form.guardian_relation}
                onChange={(value) =>
                  updateForm(
                    "guardian_relation",
                    value
                  )
                }
                options={[
                  {
                    value: "",
                    label: "اختر صلة القرابة",
                  },
                  ...GUARDIAN_RELATIONS,
                ]}
              />
            </div>
          </FormSection>

          <FormSection
            icon={GraduationCap}
            title="التعليم والبرنامج"
          >
            <div className="student-form-grid">
              <SelectField
                label="المرحلة الدراسية"
                value={form.education_stage}
                onChange={(value) =>
                  updateForm(
                    "education_stage",
                    value
                  )
                }
                options={[
                  {
                    value: "",
                    label: "اختر المرحلة",
                  },
                  ...EDUCATION_STAGES,
                ]}
              />

              <Field
                label="الصف الدراسي"
                value={form.education_grade}
                onChange={(value) =>
                  updateForm(
                    "education_grade",
                    value
                  )
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
                  {
                    value: "",
                    label: "اختر الهدف",
                  },
                  ...LEARNING_GOALS,
                ]}
              />

              <SelectField
                label="الحلقة الحالية"
                value={form.halaqa_id}
                onChange={(value) =>
                  updateForm("halaqa_id", value)
                }
                options={[
                  {
                    value: "",
                    label: "غير مرتبط",
                  },
                  ...halaqat.map((halaqa) => ({
                    value: String(halaqa.id),
                    label: halaqa.name,
                  })),
                ]}
              />
            </div>
          </FormSection>

          <FormSection
            icon={BookOpen}
            title="إعدادات التسميع"
          >
            <div className="student-form-grid">
              <SelectField
                label="طريقة التسميع"
                value={form.recitation_mode}
                onChange={(value) =>
                  updateForm(
                    "recitation_mode",
                    value
                  )
                }
                options={[
                  {
                    value: "",
                    label: "غير محدد",
                  },
                  ...RECITATION_MODES,
                ]}
              />

              <Field
                label="وقت التسميع المفضل"
                value={
                  form.preferred_recitation_time
                }
                onChange={(value) =>
                  updateForm(
                    "preferred_recitation_time",
                    value
                  )
                }
                type="time"
              />
            </div>

            <div className="student-form-days">
              {DAYS.map((day) => {
                const active =
                  form.recitation_days.includes(
                    day.value
                  );

                return (
                  <button
                    key={day.value}
                    type="button"
                    className={`student-form-day ${
                      active ? "active" : ""
                    }`}
                    onClick={() =>
                      toggleDay(day.value)
                    }
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection
            icon={BookOpen}
            title="ملاحظات"
          >
            <div className="student-form-grid">
              <Field
                label="ملاحظات إضافية"
                value={form.notes}
                onChange={(value) =>
                  updateForm("notes", value)
                }
                placeholder="أي معلومات تربوية أو تشغيلية مهمة..."
                textarea
                className="full"
              />
            </div>
          </FormSection>
        </div>

        <div className="student-form-footer">
          <button
            type="button"
            className="student-form-cancel"
            onClick={onClose}
            disabled={saving}
          >
            إلغاء
          </button>

          <button
            type="button"
            className="student-form-save"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2
                size={14}
                className="students-spin"
              />
            ) : editingStudent ? (
              <Edit3 size={14} />
            ) : (
              <Plus size={14} />
            )}

            {saving
              ? "جارٍ الحفظ..."
              : editingStudent
                ? "حفظ التعديلات"
                : "إضافة الطالب"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Small Components
========================================================= */

function StudentStat({
  label,
  value,
  icon: Icon,
  tone,
  sub,
}) {
  const tones = {
    green: {
      color: "var(--app-color-0f704a,#0F704A)",
      soft: "#EAF7EE",
    },
    blue: {
      color: "#356D9E",
      soft: "#EDF5FB",
    },
    gold: {
      color: "#927021",
      soft: "#FFF8E8",
    },
    red: {
      color: "#A44337",
      soft: "#FFF0ED",
    },
  };

  const selected = tones[tone] || tones.green;

  return (
    <div
      className="students-stat-card"
      style={{
        "--stat-color": selected.color,
        "--stat-soft": selected.soft,
      }}
    >
      <div className="students-stat-card-head">
        <span className="students-stat-card-label">
          {label}
        </span>

        <div className="students-stat-card-icon">
          <Icon size={15} />
        </div>
      </div>

      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function StudentInfoBox({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="student-info-box">
      <span>
        <Icon size={11} />
        {label}
      </span>

      <strong title={value}>
        {value || "غير محدد"}
      </strong>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}) {
  return (
    <div className="students-filter-select">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown size={13} />
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  children,
}) {
  return (
    <section className="student-form-section">
      <div className="student-form-section-title">
        <Icon size={14} />
        {title}
      </div>

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
  readOnly = false,
  hint = "",
}) {
  const Input = type === "date" ? CalendarInput : "input";
  return (
    <div
      className={`student-form-field ${className}`}
    >
      <label>
        {label}
        {required && <b> *</b>}
      </label>

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          readOnly={readOnly}
          className={readOnly ? "student-auto-number-input" : ""}
        />
      )}

      {hint && (
        <small className="student-field-hint">
          <Hash size={10} />
          {hint}
        </small>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div className="student-form-field">
      <label>{label}</label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StudentsLoading() {
  return (
    <div className="students-state-card">
      <div className="students-state-icon">
        <Loader2
          size={22}
          className="students-spin"
        />
      </div>

      <strong>
        جارٍ تحميل الطلاب...
      </strong>

      <p>
        يتم تجهيز بيانات الطلاب والحلقات والحضور
        والتسميع.
      </p>
    </div>
  );
}

function StudentsEmpty({
  filtered,
  onReset,
  canCreate,
  onCreate,
}) {
  return (
    <div className="students-state-card">
      <div className="students-state-icon">
        <Users size={22} />
      </div>

      <strong>
        {filtered
          ? "لا توجد نتائج مطابقة"
          : "لا يوجد طلاب للعرض"}
      </strong>

      <p>
        {filtered
          ? "غيّر البحث أو الفلاتر الحالية."
          : "أضف طالبًا أو تأكد من وجود حلقات مرتبطة بنطاق المشرف."}
      </p>

      <div className="students-state-actions">
        {filtered && (
          <button
            type="button"
            onClick={onReset}
          >
            <RotateCcw size={12} />
            مسح الفلاتر
          </button>
        )}

        {!filtered && canCreate && (
          <button
            type="button"
            onClick={onCreate}
          >
            <Plus size={12} />
            إضافة طالب
          </button>
        )}
      </div>
    </div>
  );
}
