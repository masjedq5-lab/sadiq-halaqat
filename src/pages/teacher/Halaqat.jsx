import CompactPageHeader from "../../components/CompactPageHeader";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { BookOpen, Building2, Users, Clock3, Mic2, TrendingUp, Pencil, Save, X, Search, RefreshCw, AlertTriangle, CheckCircle2, UserRoundCheck, ChevronLeft, Loader2 } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";

/* =========================================================
   ثوابت الصفحة
========================================================= */

const HALAQA_PERIODS = [
  {
    value: "after_fajr",
    label: "بعد الفجر",
  },
  {
    value: "after_dhuhr",
    label: "بعد الظهر",
  },
  {
    value: "after_asr",
    label: "بعد العصر",
  },
  {
    value: "after_maghrib",
    label: "بعد المغرب",
  },
  {
    value: "after_isha",
    label: "بعد العشاء",
  },
];

const STATUS_OPTIONS = [
  {
    value: "all",
    label: "كل الحالات",
  },
  {
    value: "active",
    label: "نشطة",
  },
  {
    value: "inactive",
    label: "متوقفة",
  },
  {
    value: "archived",
    label: "مؤرشفة",
  },
];

function getPeriodLabel(value) {
  return (
    HALAQA_PERIODS.find(
      (item) =>
        item.value === value
    )?.label || "غير محدد"
  );
}

function getStatusMeta(status) {
  if (status === "active") {
    return {
      label: "نشطة",
      background: "#ECFDF5",
      color: "#047857",
      border: "#A7F3D0",
    };
  }

  if (status === "inactive") {
    return {
      label: "متوقفة",
      background: "#FFF7ED",
      color: "#C2410C",
      border: "#FED7AA",
    };
  }

  return {
    label: "مؤرشفة",
    background: "#F1F5F9",
    color: "#64748B",
    border: "#CBD5E1",
  };
}

function getLocalDate() {
  const date = new Date();

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

function getDateDaysAgo(days) {
  const date = new Date();

  date.setDate(
    date.getDate() - days
  );

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

/* =========================================================
   الصفحة
========================================================= */

export default function Halaqat() {
  const navigate = useNavigate();

  const { showToast } =
    useToast();

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    teacher,
    setTeacher,
  ] = useState(null);

  const [
    halaqat,
    setHalaqat,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    periodFilter,
    setPeriodFilter,
  ] = useState("all");

  const [
    editingHalaqa,
    setEditingHalaqa,
  ] = useState(null);

  const [
    editForm,
    setEditForm,
  ] = useState({
    name: "",
    capacity: 30,
    halaqa_period: "",
    description: "",
  });

  /* =====================================================
     تحميل الصفحة
  ===================================================== */

  useEffect(() => {
    loadMyHalaqat();
  }, []);

  async function loadMyHalaqat(
    silent = false
  ) {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      /* -----------------------------------------
         المستخدم الحالي
      ----------------------------------------- */

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user =
        authData?.user;

      if (!user) {
        throw new Error(
          "تعذر التحقق من المستخدم الحالي"
        );
      }

      /* -----------------------------------------
         ملف المعلم
      ----------------------------------------- */

      const {
        data: teacherProfile,
        error: teacherError,
      } =
        await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            user_number
          `)
          .eq(
            "auth_user_id",
            user.id
          )
          .eq(
            "role",
            "teacher"
          )
          .single();

      if (teacherError) {
        throw teacherError;
      }

      setTeacher(
        teacherProfile
      );

      /* -----------------------------------------
         حلقات المعلم
      ----------------------------------------- */

      const {
        data: links,
        error: linksError,
      } =
        await supabase
          .from(
            "teacher_halaqat"
          )
          .select(`
            id,
            halaqa_id,
            teacher_id,
            role,
            created_at
          `)
          .eq(
            "teacher_id",
            teacherProfile.id
          );

      if (linksError) {
        throw linksError;
      }

      if (!links?.length) {
        setHalaqat([]);
        return;
      }

      /*
        في حال وجود ربط مكرر بالخطأ،
        نحتفظ بربط واحد فقط،
        ونفضّل main على assistant.
      */

      const rolePriority = {
        main: 2,
        assistant: 1,
      };

      const linksMap =
        new Map();

      for (const link of links) {
        const current =
          linksMap.get(
            Number(
              link.halaqa_id
            )
          );

        if (
          !current ||
          (
            rolePriority[
              link.role
            ] || 0
          ) >
            (
              rolePriority[
                current.role
              ] || 0
            )
        ) {
          linksMap.set(
            Number(
              link.halaqa_id
            ),
            link
          );
        }
      }

      const uniqueLinks =
        Array.from(
          linksMap.values()
        );

      const halaqaIds =
        uniqueLinks.map(
          (item) =>
            Number(
              item.halaqa_id
            )
        );

      /* -----------------------------------------
         بيانات الحلقات
      ----------------------------------------- */

      const {
        data: halaqatData,
        error: halaqatError,
      } =
        await supabase
          .from("halaqat")
          .select(`
            id,
            mosque_id,
            name,
            capacity,
            status,
            description,
            halaqa_period,
            created_at
          `)
          .in(
            "id",
            halaqaIds
          )
          .order(
            "name",
            {
              ascending: true,
            }
          );

      if (halaqatError) {
        throw halaqatError;
      }

      const mosqueIds = [
        ...new Set(
          (halaqatData || [])
            .map(
              (item) =>
                item.mosque_id
            )
            .filter(Boolean)
            .map(Number)
        ),
      ];

      /* -----------------------------------------
         المساجد
      ----------------------------------------- */

      let mosquesData = [];

      if (mosqueIds.length) {
        const {
          data,
          error,
        } =
          await supabase
            .from("mosques")
            .select(`
              id,
              name
            `)
            .in(
              "id",
              mosqueIds
            );

        if (error) {
          throw error;
        }

        mosquesData =
          data || [];
      }

      const mosqueMap =
        new Map(
          mosquesData.map(
            (mosque) => [
              Number(
                mosque.id
              ),
              mosque,
            ]
          )
        );

      /* -----------------------------------------
         طلاب الحلقات الحاليون
      ----------------------------------------- */

      const {
        data:
          assignmentsData,
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
            is_current
          `)
          .in(
            "halaqa_id",
            halaqaIds
          )
          .eq(
            "is_current",
            true
          );

      if (
        assignmentsError
      ) {
        throw assignmentsError;
      }

      const studentIds = [
        ...new Set(
          (
            assignmentsData ||
            []
          )
            .map(
              (item) =>
                item.student_id
            )
            .filter(Boolean)
            .map(Number)
        ),
      ];

      /* -----------------------------------------
         بيانات الطلاب
      ----------------------------------------- */

      let studentsData = [];

      if (studentIds.length) {
        const {
          data,
          error,
        } =
          await supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              status,
              is_active
            `)
            .in(
              "id",
              studentIds
            );

        if (error) {
          throw error;
        }

        studentsData =
          data || [];
      }

      const activeStudentIds =
        new Set(
          studentsData
            .filter(
              (student) =>
                student
                  .is_active !==
                  false &&
                student.status !==
                  "archived"
            )
            .map(
              (student) =>
                Number(
                  student.id
                )
            )
        );

      const activeAssignments =
        (
          assignmentsData ||
          []
        ).filter(
          (assignment) =>
            activeStudentIds.has(
              Number(
                assignment
                  .student_id
              )
            )
        );

      /* -----------------------------------------
         حضور اليوم
      ----------------------------------------- */

      const today =
        getLocalDate();

      const {
        data:
          attendanceToday,
        error:
          attendanceError,
      } =
        await supabase
          .from("attendance")
          .select(`
            id,
            student_id,
            halaqa_id,
            status,
            attendance_date
          `)
          .in(
            "halaqa_id",
            halaqaIds
          )
          .eq(
            "attendance_date",
            today
          );

      if (attendanceError) {
        throw attendanceError;
      }

      /* -----------------------------------------
         تسميع اليوم
      ----------------------------------------- */

      const {
        data:
          recitationsToday,
        error:
          recitationsError,
      } =
        await supabase
          .from("recitations")
          .select(`
            id,
            student_id,
            halaqa_id,
            recitation_date
          `)
          .in(
            "halaqa_id",
            halaqaIds
          )
          .eq(
            "recitation_date",
            today
          );

      if (recitationsError) {
        throw recitationsError;
      }

      /* -----------------------------------------
         آخر 7 أيام من التسميع
      ----------------------------------------- */

      const sevenDaysAgo =
        getDateDaysAgo(7);

      const {
        data:
          recentRecitations,
        error:
          recentRecitationsError,
      } =
        await supabase
          .from("recitations")
          .select(`
            student_id,
            halaqa_id,
            recitation_date
          `)
          .in(
            "halaqa_id",
            halaqaIds
          )
          .gte(
            "recitation_date",
            sevenDaysAgo
          );

      if (
        recentRecitationsError
      ) {
        throw recentRecitationsError;
      }

      /* -----------------------------------------
         الإنجاز الشهري
      ----------------------------------------- */

      const {
        data:
          monthlyProgressData,
        error:
          monthlyError,
      } =
        await supabase
          .from(
            "monthly_progress"
          )
          .select(`
            id,
            student_id,
            halaqa_id,
            progress_month,
            memorization_completed,
            revision_completed,
            approved
          `)
          .in(
            "halaqa_id",
            halaqaIds
          )
          .order(
            "progress_month",
            {
              ascending: false,
            }
          );

      if (monthlyError) {
        throw monthlyError;
      }

      /* -----------------------------------------
         تجهيز النتيجة النهائية
      ----------------------------------------- */

      const prepared =
        (
          halaqatData || []
        ).map(
          (halaqa) => {
            const halaqaId =
              Number(
                halaqa.id
              );

            const link =
              uniqueLinks.find(
                (item) =>
                  Number(
                    item.halaqa_id
                  ) === halaqaId
              );

            const assignments =
              activeAssignments.filter(
                (item) =>
                  Number(
                    item.halaqa_id
                  ) === halaqaId
              );

            const studentsCount =
              assignments.length;

            const capacity =
              Number(
                halaqa.capacity ||
                  0
              );

            const occupancyRate =
              capacity > 0
                ? Math.min(
                    100,
                    Math.round(
                      (
                        studentsCount /
                        capacity
                      ) * 100
                    )
                  )
                : 0;

            /*
              حضور اليوم
            */

            const todayRows =
              (
                attendanceToday ||
                []
              ).filter(
                (item) =>
                  Number(
                    item.halaqa_id
                  ) === halaqaId
              );

            const presentCount =
              todayRows.filter(
                (item) =>
                  item.status ===
                  "present"
              ).length;

            const attendanceRate =
              todayRows.length > 0
                ? Math.round(
                    (
                      presentCount /
                      todayRows.length
                    ) * 100
                  )
                : null;

            /*
              تسميع اليوم
            */

            const todayRecitationsCount =
              (
                recitationsToday ||
                []
              ).filter(
                (item) =>
                  Number(
                    item.halaqa_id
                  ) === halaqaId
              ).length;

            /*
              آخر شهر مسجل للإنجاز
            */

            const halaqaProgress =
              (
                monthlyProgressData ||
                []
              ).filter(
                (item) =>
                  Number(
                    item.halaqa_id
                  ) === halaqaId
              );

            const latestMonth =
              halaqaProgress[0]
                ?.progress_month ||
              null;

            const latestRows =
              latestMonth
                ? halaqaProgress.filter(
                    (item) =>
                      item.progress_month ===
                      latestMonth
                  )
                : [];

            const completedRows =
              latestRows.filter(
                (item) =>
                  item
                    .memorization_completed &&
                  item
                    .revision_completed
              );

            const progressRate =
              latestRows.length > 0
                ? Math.round(
                    (
                      completedRows.length /
                      latestRows.length
                    ) * 100
                  )
                : null;

            /*
              الحالات التي تحتاج متابعة
            */

            const assignedStudentIds =
              assignments.map(
                (item) =>
                  Number(
                    item.student_id
                  )
              );

            const absentTodayIds =
              new Set(
                todayRows
                  .filter(
                    (item) =>
                      item.status ===
                      "absent"
                  )
                  .map(
                    (item) =>
                      Number(
                        item.student_id
                      )
                  )
              );

            const studentsWithRecentRecitation =
              new Set(
                (
                  recentRecitations ||
                  []
                )
                  .filter(
                    (item) =>
                      Number(
                        item.halaqa_id
                      ) === halaqaId
                  )
                  .map(
                    (item) =>
                      Number(
                        item.student_id
                      )
                  )
              );

            const needsFollowUp =
              new Set();

            assignedStudentIds.forEach(
              (studentId) => {
                if (
                  absentTodayIds.has(
                    studentId
                  )
                ) {
                  needsFollowUp.add(
                    studentId
                  );
                }

                if (
                  !studentsWithRecentRecitation.has(
                    studentId
                  )
                ) {
                  needsFollowUp.add(
                    studentId
                  );
                }
              }
            );

            return {
              ...halaqa,

              mosque:
                mosqueMap.get(
                  Number(
                    halaqa.mosque_id
                  )
                ) || null,

              teacher_role:
                link?.role ||
                "assistant",

              students_count:
                studentsCount,

              occupancy_rate:
                occupancyRate,

              attendance_rate:
                attendanceRate,

              attendance_marked:
                todayRows.length,

              recitations_today:
                todayRecitationsCount,

              progress_rate:
                progressRate,

              latest_progress_month:
                latestMonth,

              follow_up_count:
                needsFollowUp.size,
            };
          }
        );

      setHalaqat(prepared);

    } catch (error) {
      console.error(
        "LOAD MY HALAQAT ERROR:",
        error
      );

      showToast(
        error.message ||
          "تعذر تحميل حلقاتك",
        "error"
      );

      setHalaqat([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* =====================================================
     الفلاتر
  ===================================================== */

  const filteredHalaqat =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      return halaqat.filter(
        (halaqa) => {
          const matchesSearch =
            !normalized ||
            halaqa.name
              ?.toLowerCase()
              .includes(
                normalized
              ) ||
            halaqa.mosque
              ?.name
              ?.toLowerCase()
              .includes(
                normalized
              );

          const matchesStatus =
            statusFilter ===
              "all" ||
            halaqa.status ===
              statusFilter;

          const matchesPeriod =
            periodFilter ===
              "all" ||
            halaqa
              .halaqa_period ===
              periodFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPeriod
          );
        }
      );
    }, [
      halaqat,
      search,
      statusFilter,
      periodFilter,
    ]);

  /* =====================================================
     الإحصائيات
  ===================================================== */

  const stats =
    useMemo(() => {
      const uniqueStudents =
        halaqat.reduce(
          (sum, halaqa) =>
            sum +
            Number(
              halaqa.students_count ||
                0
            ),
          0
        );

      const attendanceRows =
        halaqat.filter(
          (halaqa) =>
            halaqa
              .attendance_rate !==
            null
        );

      const averageAttendance =
        attendanceRows.length
          ? Math.round(
              attendanceRows.reduce(
                (
                  total,
                  halaqa
                ) =>
                  total +
                  halaqa
                    .attendance_rate,
                0
              ) /
                attendanceRows.length
            )
          : null;

      const recitations =
        halaqat.reduce(
          (sum, halaqa) =>
            sum +
            Number(
              halaqa
                .recitations_today ||
                0
            ),
          0
        );

      const followUp =
        halaqat.reduce(
          (sum, halaqa) =>
            sum +
            Number(
              halaqa
                .follow_up_count ||
                0
            ),
          0
        );

      return {
        halaqat:
          halaqat.length,

        students:
          uniqueStudents,

        attendance:
          averageAttendance,

        recitations,

        followUp,
      };
    }, [halaqat]);

  /* =====================================================
     فتح التعديل
  ===================================================== */

  function openEditModal(
    halaqa
  ) {
    setEditingHalaqa(
      halaqa
    );

    setEditForm({
      name:
        halaqa.name || "",

      capacity:
        halaqa.capacity ||
        30,

      halaqa_period:
        halaqa.halaqa_period ||
        "",

      description:
        halaqa.description ||
        "",
    });
  }

  function closeEditModal() {
    if (saving) return;

    setEditingHalaqa(null);

    setEditForm({
      name: "",
      capacity: 30,
      halaqa_period: "",
      description: "",
    });
  }

  /* =====================================================
     حفظ التعديل
  ===================================================== */

  async function saveEdit() {
    if (
      !editingHalaqa
    ) {
      return;
    }

    if (
      !editForm.name.trim()
    ) {
      showToast(
        "أدخل اسم الحلقة",
        "error"
      );
      return;
    }

    const capacity =
      Number(
        editForm.capacity
      );

    if (
      !Number.isFinite(
        capacity
      ) ||
      capacity < 1 ||
      capacity > 500
    ) {
      showToast(
        "السعة يجب أن تكون بين 1 و500 طالب",
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user =
        authData?.user;

      if (!user) {
        throw new Error(
          "تعذر التحقق من المستخدم"
        );
      }

      const {
        data: profile,
        error:
          profileError,
      } =
        await supabase
          .from("profiles")
          .select("id")
          .eq(
            "auth_user_id",
            user.id
          )
          .eq(
            "role",
            "teacher"
          )
          .single();

      if (profileError) {
        throw profileError;
      }

      /*
        تحقق أمني إضافي:
        الحلقة يجب أن تكون مرتبطة بهذا المعلم.
      */

      const {
        data: assignment,
        error:
          assignmentError,
      } =
        await supabase
          .from(
            "teacher_halaqat"
          )
          .select(`
            id,
            role
          `)
          .eq(
            "teacher_id",
            profile.id
          )
          .eq(
            "halaqa_id",
            editingHalaqa.id
          )
          .maybeSingle();

      if (
        assignmentError
      ) {
        throw assignmentError;
      }

      if (!assignment) {
        throw new Error(
          "ليس لديك صلاحية لتعديل هذه الحلقة"
        );
      }

      const {
        error: updateError,
      } =
        await supabase
          .from("halaqat")
          .update({
            name:
              editForm.name.trim(),

            capacity,

            halaqa_period:
              editForm.halaqa_period ||
              null,

            description:
              editForm.description
                .trim() ||
              null,
          })
          .eq(
            "id",
            editingHalaqa.id
          );

      if (updateError) {
        throw updateError;
      }

      showToast(
        "تم تحديث بيانات الحلقة بنجاح",
        "success"
      );

      closeEditModal();

      await loadMyHalaqat(
        true
      );

    } catch (error) {
      console.error(
        "UPDATE HALAQA ERROR:",
        error
      );

      showToast(
        error.message ||
          "تعذر تحديث الحلقة",
        "error"
      );

    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     فتح الحلقة
  ===================================================== */

  function openHalaqa(
    halaqa
  ) {
    /*
      حالياً نرسل المعلم إلى صفحة الطلاب الموجودة
      مع تمرير بيانات الحلقة.

      عندما ننشئ لاحقاً:
      /teacher/halaqat/:id
      نغيّر هذا السطر فقط.
    */

    navigate(
      "/teacher/students",
      {
        state: {
          halaqaId:
            halaqa.id,

          halaqaName:
            halaqa.name,
        },
      }
    );
  }

  /* =====================================================
     Render
  ===================================================== */

  return (
    <div
      className="teacher-halaqat-page"
      dir="rtl"
    >
      <style>
        {`
          .teacher-halaqat-page {
            width: 100%;
            max-width: 1600px;
            margin: 0 auto;
            color: #0f172a;
          }

          .halaqat-hero {
            position: relative;
            overflow: hidden;
            border: 1px solid color-mix(in srgb,var(--app-color-0f766e,#0f766e) 12%,transparent);
            border-radius: calc(26px * var(--app-radius-scale,1));
            padding: calc(28px * var(--app-density,1)) calc(30px * var(--app-density,1));
            margin-bottom: 22px;
            background:
              linear-gradient(
                135deg,
                #ffffff 0%,
                #f7fbfa 100%
              );
            box-shadow:
              0 14px 40px
              color-mix(in srgb,var(--app-color-0f4c45,#0f4c45) 6%,transparent);
          }

          .halaqat-hero::before {
            content: "";
            position: absolute;
            width: 260px;
            height: 260px;
            top: -150px;
            left: -70px;
            border-radius: 50%;
            background:
              radial-gradient(
                circle,
                rgba(212,175,55,.12),
                transparent 70%
              );
            pointer-events: none;
          }

          .halaqat-hero-inner {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content:
              space-between;
            gap: calc(20px * var(--app-density,1));
          }

          .halaqat-title-wrap {
            min-width: 0;
          }

          .halaqat-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: calc(7px * var(--app-density,1));
            margin-bottom: 7px;
            color: var(--app-color-0f766e,#0f766e);
            font-size: calc(13px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .halaqat-title {
            margin: 0;
            color: #0f172a;
            font-size: calc(30px * var(--app-font-scale,1));
            line-height: 1.3;
            font-weight: 950;
          }

          .halaqat-subtitle {
            margin: 7px 0 0;
            color: #64748b;
            font-size: calc(14px * var(--app-font-scale,1));
            line-height: 1.8;
          }

          .refresh-button {
            height: 46px;
            padding: 0 calc(17px * var(--app-density,1));
            border: 1px solid
              color-mix(in srgb,var(--app-color-0f766e,#0f766e) 15%,transparent);
            border-radius: calc(14px * var(--app-radius-scale,1));
            background: #ffffff;
            color: var(--app-color-0f766e,#0f766e);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: calc(8px * var(--app-density,1));
            font-family: inherit;
            font-weight: 900;
            cursor: pointer;
            box-shadow:
              0 7px 18px
              color-mix(in srgb,var(--app-color-0f4c45,#0f4c45) 6%,transparent);
          }

          .refresh-button:hover {
            background: #f0fdfa;
          }

          .spin {
            animation:
              halaqa-spin
              .8s linear infinite;
          }

          @keyframes halaqa-spin {
            to {
              transform:
                rotate(360deg);
            }
          }

          .halaqat-stats {
            display: grid;
            grid-template-columns:
              repeat(
                4,
                minmax(0, 1fr)
              );
            gap: calc(14px * var(--app-density,1));
            margin-bottom: 20px;
          }

          .halaqat-stat {
            min-width: 0;
            position: relative;
            overflow: hidden;
            padding: calc(18px * var(--app-density,1));
            border: 1px solid #e5eeeb;
            border-radius: calc(20px * var(--app-radius-scale,1));
            background: #ffffff;
            box-shadow:
              0 8px 25px
              rgba(15,23,42,.04);
          }

          .halaqat-stat-top {
            display: flex;
            align-items: center;
            justify-content:
              space-between;
            gap: calc(12px * var(--app-density,1));
          }

          .halaqat-stat-icon {
            width: 42px;
            height: 42px;
            flex: 0 0 42px;
            border-radius: calc(13px * var(--app-radius-scale,1));
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ecfdf5;
            color: var(--app-color-0f766e,#0f766e);
          }

          .halaqat-stat-label {
            color: #64748b;
            font-size: calc(13px * var(--app-font-scale,1));
            font-weight: 800;
          }

          .halaqat-stat-value {
            margin-top: 8px;
            color: #0f172a;
            font-size: calc(26px * var(--app-font-scale,1));
            line-height: 1;
            font-weight: 950;
          }

          .halaqat-filter-panel {
            display: grid;
            grid-template-columns:
              minmax(260px, 1fr)
              190px
              190px;
            gap: calc(12px * var(--app-density,1));
            padding: calc(14px * var(--app-density,1));
            margin-bottom: 20px;
            border: 1px solid #e5eeeb;
            border-radius: calc(20px * var(--app-radius-scale,1));
            background: #ffffff;
            box-shadow:
              0 7px 24px
              rgba(15,23,42,.035);
          }

          .halaqat-search {
            position: relative;
          }

          .halaqat-search svg {
            position: absolute;
            top: 50%;
            right: 14px;
            transform:
              translateY(-50%);
            color: #94a3b8;
            pointer-events: none;
          }

          .halaqat-search input,
          .halaqat-filter-panel select {
            width: 100%;
            height: 46px;
            box-sizing:
              border-box;
            border: 1px solid #dce5e1;
            border-radius: calc(14px * var(--app-radius-scale,1));
            background: #fbfdfc;
            color: #0f172a;
            outline: none;
            font-family: inherit;
            font-size: calc(13px * var(--app-font-scale,1));
            font-weight: 700;
          }

          .halaqat-search input {
            padding:
              0 calc(43px * var(--app-density,1)) 0 calc(14px * var(--app-density,1));
          }

          .halaqat-filter-panel select {
            padding: 0 calc(13px * var(--app-density,1));
            cursor: pointer;
          }

          .halaqat-search input:focus,
          .halaqat-filter-panel select:focus {
            border-color:
              color-mix(in srgb,var(--app-color-0f766e,#0f766e) 45%,transparent);
            box-shadow:
              0 0 0 3px
              color-mix(in srgb,var(--app-color-0f766e,#0f766e) 6%,transparent);
          }

          .halaqat-grid {
            display: grid;
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
            gap: calc(18px * var(--app-density,1));
          }

          .halaqa-card {
            position: relative;
            overflow: hidden;
            min-width: 0;
            border:
              1px solid #e4ece9;
            border-radius: calc(24px * var(--app-radius-scale,1));
            background: #ffffff;
            box-shadow:
              0 12px 34px
              rgba(15,23,42,.045);
            transition:
              transform .2s ease,
              box-shadow .2s ease,
              border-color .2s ease;
          }

          .halaqa-card:hover {
            transform:
              translateY(-2px);
            border-color:
              color-mix(in srgb,var(--app-color-0f766e,#0f766e) 22%,transparent);
            box-shadow:
              0 18px 42px
              color-mix(in srgb,var(--app-color-0f4c45,#0f4c45) 7.5%,transparent);
          }

          .halaqa-card-accent {
            height: 4px;
            background:
              linear-gradient(
                90deg,
                var(--app-color-0f766e,#0f766e),
                #d4af37
              );
          }

          .halaqa-card-body {
            padding: calc(20px * var(--app-density,1));
          }

          .halaqa-card-head {
            display: flex;
            align-items:
              flex-start;
            justify-content:
              space-between;
            gap: calc(14px * var(--app-density,1));
            margin-bottom: 17px;
          }

          .halaqa-card-name {
            margin: 0;
            color: #0f172a;
            font-size: calc(20px * var(--app-font-scale,1));
            font-weight: 950;
          }

          .halaqa-mosque {
            display: flex;
            align-items: center;
            gap: calc(7px * var(--app-density,1));
            margin-top: 6px;
            color: #64748b;
            font-size: calc(13px * var(--app-font-scale,1));
            font-weight: 700;
          }

          .halaqa-badges {
            display: flex;
            flex-wrap: wrap;
            justify-content:
              flex-end;
            gap: calc(7px * var(--app-density,1));
          }

          .halaqa-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 28px;
            padding: calc(4px * var(--app-density,1)) calc(10px * var(--app-density,1));
            border-radius: 999px;
            font-size: calc(11px * var(--app-font-scale,1));
            font-weight: 900;
            white-space: nowrap;
          }

          .halaqa-info-grid {
            display: grid;
            grid-template-columns:
              repeat(
                2,
                minmax(0,1fr)
              );
            gap: calc(10px * var(--app-density,1));
            margin-bottom: 16px;
          }

          .halaqa-info-item {
            min-width: 0;
            min-height: 62px;
            padding: calc(11px * var(--app-density,1)) calc(12px * var(--app-density,1));
            border-radius: calc(15px * var(--app-radius-scale,1));
            background: #f8faf9;
            border: 1px solid #edf2f0;
          }

          .halaqa-info-label {
            display: flex;
            align-items: center;
            gap: calc(6px * var(--app-density,1));
            margin-bottom: 6px;
            color: #64748b;
            font-size: calc(11px * var(--app-font-scale,1));
            font-weight: 800;
          }

          .halaqa-info-value {
            overflow: hidden;
            color: #0f172a;
            font-size: calc(14px * var(--app-font-scale,1));
            font-weight: 900;
            text-overflow:
              ellipsis;
            white-space:
              nowrap;
          }

          .occupancy-wrap {
            padding: calc(14px * var(--app-density,1));
            margin-bottom: 14px;
            border: 1px solid #edf2f0;
            border-radius: calc(16px * var(--app-radius-scale,1));
            background: #fbfdfc;
          }

          .occupancy-head {
            display: flex;
            align-items: center;
            justify-content:
              space-between;
            gap: calc(10px * var(--app-density,1));
            margin-bottom: 9px;
            font-size: calc(12px * var(--app-font-scale,1));
          }

          .occupancy-title {
            color: #475569;
            font-weight: 800;
          }

          .occupancy-value {
            color: var(--app-color-0f766e,#0f766e);
            font-weight: 950;
          }

          .occupancy-track {
            width: 100%;
            height: 7px;
            overflow: hidden;
            border-radius: 999px;
            background: #e7efec;
          }

          .occupancy-fill {
            height: 100%;
            border-radius: 999px;
            background:
              linear-gradient(
                90deg,
                var(--app-color-0f766e,#0f766e),
                #16a085
              );
            transition:
              width .3s ease;
          }

          .performance-grid {
            display: grid;
            grid-template-columns:
              repeat(
                3,
                minmax(0,1fr)
              );
            gap: calc(8px * var(--app-density,1));
            margin-bottom: 14px;
          }

          .performance-box {
            min-width: 0;
            padding: calc(12px * var(--app-density,1)) calc(8px * var(--app-density,1));
            border-radius: calc(15px * var(--app-radius-scale,1));
            text-align: center;
            background:
              linear-gradient(
                180deg,
                #ffffff,
                #fafcfb
              );
            border: 1px solid #edf2f0;
          }

          .performance-label {
            color: #94a3b8;
            font-size: calc(10px * var(--app-font-scale,1));
            font-weight: 800;
            white-space: nowrap;
          }

          .performance-value {
            margin-top: 5px;
            color: #0f172a;
            font-size: calc(16px * var(--app-font-scale,1));
            font-weight: 950;
          }

          .follow-up {
            min-height: 42px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            gap: calc(8px * var(--app-density,1));
            margin-bottom: 16px;
            padding: calc(9px * var(--app-density,1)) calc(11px * var(--app-density,1));
            border-radius: calc(13px * var(--app-radius-scale,1));
            font-size: calc(12px * var(--app-font-scale,1));
            font-weight: 850;
          }

          .follow-up.has-alert {
            color: #b45309;
            border: 1px solid #fde68a;
            background: #fffbeb;
          }

          .follow-up.clear {
            color: #047857;
            border: 1px solid #a7f3d0;
            background: #ecfdf5;
          }

          .halaqa-actions {
            display: flex;
            align-items: center;
            justify-content:
              space-between;
            gap: calc(10px * var(--app-density,1));
            padding-top: calc(15px * var(--app-density,1));
            border-top:
              1px solid #edf2f0;
          }

          .halaqa-edit-btn,
          .halaqa-open-btn {
            height: 42px;
            padding: 0 calc(15px * var(--app-density,1));
            border-radius: calc(13px * var(--app-radius-scale,1));
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: calc(7px * var(--app-density,1));
            font-family: inherit;
            font-size: calc(12px * var(--app-font-scale,1));
            font-weight: 900;
            cursor: pointer;
          }

          .halaqa-edit-btn {
            border:
              1px solid
              color-mix(in srgb,var(--app-color-0f766e,#0f766e) 16%,transparent);
            background: #f0fdfa;
            color: var(--app-color-0f766e,#0f766e);
          }

          .halaqa-open-btn {
            flex: 1;
            border: none;
            background:
              linear-gradient(
                135deg,
                var(--app-color-0f766e,#0f766e),
                var(--app-color-115e59,#115e59)
              );
            color: #ffffff;
            box-shadow:
              0 8px 18px
              color-mix(in srgb,var(--app-color-0f766e,#0f766e) 16%,transparent);
          }

          .empty-state {
            grid-column: 1 / -1;
            padding: calc(58px * var(--app-density,1)) calc(20px * var(--app-density,1));
            border: 1px dashed #cbd5e1;
            border-radius: calc(24px * var(--app-radius-scale,1));
            background: #ffffff;
            text-align: center;
          }

          .empty-icon {
            width: 62px;
            height: 62px;
            margin:
              0 auto 14px;
            border-radius: calc(18px * var(--app-radius-scale,1));
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ecfdf5;
            color: var(--app-color-0f766e,#0f766e);
          }

          .empty-title {
            margin: 0;
            color: #0f172a;
            font-size: calc(18px * var(--app-font-scale,1));
            font-weight: 950;
          }

          .empty-text {
            margin: 7px auto 0;
            max-width: 480px;
            color: #64748b;
            font-size: calc(13px * var(--app-font-scale,1));
            line-height: 1.8;
          }

          .modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 3000;
            padding: calc(20px * var(--app-density,1));
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              rgba(15,23,42,.52);
            backdrop-filter:
              blur(5px);
          }

          .edit-modal {
            width: min(
              620px,
              100%
            );
            max-height:
              calc(100vh - 40px);
            overflow-y: auto;
            border:
              1px solid
              rgba(255,255,255,.5);
            border-radius: calc(25px * var(--app-radius-scale,1));
            background: #ffffff;
            box-shadow:
              0 30px 80px
              rgba(15,23,42,.22);
          }

          .edit-modal-head {
            position: sticky;
            top: 0;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content:
              space-between;
            gap: calc(15px * var(--app-density,1));
            padding: calc(19px * var(--app-density,1)) calc(20px * var(--app-density,1));
            border-bottom:
              1px solid #edf2f0;
            background:
              rgba(255,255,255,.96);
            backdrop-filter:
              blur(12px);
          }

          .edit-modal-title {
            margin: 0;
            color: #0f172a;
            font-size: calc(18px * var(--app-font-scale,1));
            font-weight: 950;
          }

          .edit-modal-subtitle {
            margin-top: 4px;
            color: #64748b;
            font-size: calc(12px * var(--app-font-scale,1));
          }

          .modal-close {
            width: 40px;
            height: 40px;
            flex: 0 0 40px;
            border: none;
            border-radius: calc(12px * var(--app-radius-scale,1));
            background: #f1f5f9;
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }

          .edit-modal-body {
            padding: calc(20px * var(--app-density,1));
          }

          .edit-form-grid {
            display: grid;
            grid-template-columns:
              repeat(
                2,
                minmax(0,1fr)
              );
            gap: calc(14px * var(--app-density,1));
          }

          .form-field {
            min-width: 0;
          }

          .form-field.full {
            grid-column:
              1 / -1;
          }

          .form-label {
            display: block;
            margin-bottom: 7px;
            color: #334155;
            font-size: calc(12px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .form-input,
          .form-select,
          .form-textarea {
            width: 100%;
            box-sizing:
              border-box;
            border:
              1px solid #dce5e1;
            border-radius: calc(14px * var(--app-radius-scale,1));
            background: #fbfdfc;
            color: #0f172a;
            outline: none;
            font-family: inherit;
            font-size: calc(13px * var(--app-font-scale,1));
            font-weight: 700;
          }

          .form-input,
          .form-select {
            height: 46px;
            padding: 0 calc(13px * var(--app-density,1));
          }

          .form-textarea {
            min-height: 110px;
            resize: vertical;
            padding: calc(13px * var(--app-density,1));
            line-height: 1.7;
          }

          .form-input:focus,
          .form-select:focus,
          .form-textarea:focus {
            border-color:
              color-mix(in srgb,var(--app-color-0f766e,#0f766e) 45%,transparent);
            box-shadow:
              0 0 0 3px
              color-mix(in srgb,var(--app-color-0f766e,#0f766e) 6%,transparent);
          }

          .edit-modal-footer {
            display: flex;
            align-items: center;
            justify-content:
              flex-end;
            gap: calc(10px * var(--app-density,1));
            padding: calc(16px * var(--app-density,1)) calc(20px * var(--app-density,1)) calc(20px * var(--app-density,1));
          }

          .modal-cancel,
          .modal-save {
            height: 44px;
            padding: 0 calc(18px * var(--app-density,1));
            border-radius: calc(13px * var(--app-radius-scale,1));
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: calc(7px * var(--app-density,1));
            font-family: inherit;
            font-size: calc(13px * var(--app-font-scale,1));
            font-weight: 900;
            cursor: pointer;
          }

          .modal-cancel {
            border: 1px solid #e2e8f0;
            background: #ffffff;
            color: #475569;
          }

          .modal-save {
            min-width: 135px;
            border: none;
            background:
              linear-gradient(
                135deg,
                var(--app-color-0f766e,#0f766e),
                var(--app-color-115e59,#115e59)
              );
            color: #ffffff;
            box-shadow:
              0 9px 20px
              color-mix(in srgb,var(--app-color-0f766e,#0f766e) 18%,transparent);
          }

          .modal-save:disabled,
          .modal-cancel:disabled {
            opacity: .6;
            cursor: not-allowed;
          }

          .skeleton-grid {
            display: grid;
            grid-template-columns:
              repeat(
                2,
                minmax(0,1fr)
              );
            gap: calc(18px * var(--app-density,1));
          }

          .skeleton-card {
            height: 360px;
            border-radius: calc(24px * var(--app-radius-scale,1));
            background:
              linear-gradient(
                90deg,
                #f1f5f9 25%,
                #f8fafc 50%,
                #f1f5f9 75%
              );
            background-size:
              200% 100%;
            animation:
              skeleton-loading
              1.3s infinite;
          }

          @keyframes skeleton-loading {
            from {
              background-position:
                200% 0;
            }

            to {
              background-position:
                -200% 0;
            }
          }

          @media (
            max-width: 1050px
          ) {
            .halaqat-stats {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0,1fr)
                );
            }

            .halaqat-grid,
            .skeleton-grid {
              grid-template-columns:
                1fr;
            }
          }

          @media (
            max-width: 780px
          ) {
            .halaqat-hero {
              padding:
                calc(22px * var(--app-density,1)) calc(18px * var(--app-density,1));
              border-radius: calc(21px * var(--app-radius-scale,1));
            }

            .halaqat-hero-inner {
              align-items:
                flex-start;
            }

            .halaqat-title {
              font-size: calc(25px * var(--app-font-scale,1));
            }

            .halaqat-filter-panel {
              grid-template-columns:
                1fr;
            }

            .refresh-button {
              width: 44px;
              padding: 0;
            }

            .refresh-text {
              display: none;
            }
          }

          @media (
            max-width: 560px
          ) {
            .teacher-halaqat-page {
              width: 100%;
            }

            .halaqat-stats {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0,1fr)
                );
              gap: calc(9px * var(--app-density,1));
            }

            .halaqat-stat {
              padding: calc(14px * var(--app-density,1));
              border-radius: calc(17px * var(--app-radius-scale,1));
            }

            .halaqat-stat-icon {
              width: 36px;
              height: 36px;
              flex-basis: 36px;
              border-radius: calc(11px * var(--app-radius-scale,1));
            }

            .halaqat-stat-value {
              font-size: calc(22px * var(--app-font-scale,1));
            }

            .halaqa-card {
              border-radius: calc(20px * var(--app-radius-scale,1));
            }

            .halaqa-card-body {
              padding: calc(16px * var(--app-density,1));
            }

            .halaqa-card-head {
              flex-direction:
                column;
            }

            .halaqa-badges {
              justify-content:
                flex-start;
            }

            .halaqa-info-grid {
              grid-template-columns:
                1fr;
            }

            .performance-grid {
              grid-template-columns:
                repeat(
                  3,
                  minmax(0,1fr)
                );
              gap: calc(5px * var(--app-density,1));
            }

            .performance-box {
              padding: calc(10px * var(--app-density,1)) calc(4px * var(--app-density,1));
            }

            .performance-label {
              font-size: calc(9px * var(--app-font-scale,1));
            }

            .performance-value {
              font-size: calc(14px * var(--app-font-scale,1));
            }

            .halaqa-actions {
              flex-direction:
                column-reverse;
              align-items: stretch;
            }

            .halaqa-edit-btn,
            .halaqa-open-btn {
              width: 100%;
            }

            .edit-form-grid {
              grid-template-columns:
                1fr;
            }

            .form-field.full {
              grid-column: auto;
            }

            .modal-overlay {
              padding: calc(10px * var(--app-density,1));
              align-items:
                flex-end;
            }

            .edit-modal {
              max-height: 92vh;
              border-radius:
                calc(24px * var(--app-radius-scale,1)) calc(24px * var(--app-radius-scale,1)) calc(16px * var(--app-radius-scale,1)) calc(16px * var(--app-radius-scale,1));
            }
          }
        `}
      </style>

      {/* =================================================
          رأس الصفحة
      ================================================= */}

      <CompactPageHeader title="حلقاتي" actions={<>
<button
            type="button"
            className="refresh-button"
            onClick={() =>
              loadMyHalaqat(
                true
              )
            }
            disabled={
              refreshing
            }
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            <span
              className="refresh-text"
            >
              تحديث البيانات
            </span>
          </button>
</>} />

      {/* =================================================
          الإحصائيات
      ================================================= */}

      {!loading && (
        <section
          className="halaqat-stats"
        >
          <StatBox
            icon={BookOpen}
            label="حلقاتي"
            value={
              stats.halaqat
            }
          />

          <StatBox
            icon={Users}
            label="إجمالي الطلاب"
            value={
              stats.students
            }
          />

          <StatBox
            icon={UserRoundCheck}
            label="حضور اليوم"
            value={
              stats.attendance ===
              null
                ? "—"
                : `${stats.attendance}%`
            }
          />

          <StatBox
            icon={Mic2}
            label="تسميعات اليوم"
            value={
              stats.recitations
            }
          />
        </section>
      )}

      {/* =================================================
          البحث والفلاتر
      ================================================= */}

      {!loading && (
        <section
          className="halaqat-filter-panel"
        >
          <div
            className="halaqat-search"
          >
            <Search
              size={17}
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="ابحث باسم الحلقة أو المسجد..."
            />
          </div>

          <select
            value={
              statusFilter
            }
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
          >
            {STATUS_OPTIONS.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          <select
            value={
              periodFilter
            }
            onChange={(e) =>
              setPeriodFilter(
                e.target.value
              )
            }
          >
            <option value="all">
              كل المواعيد
            </option>

            {HALAQA_PERIODS.map(
              (period) => (
                <option
                  key={
                    period.value
                  }
                  value={
                    period.value
                  }
                >
                  {period.label}
                </option>
              )
            )}
          </select>
        </section>
      )}

      {/* =================================================
          Loading
      ================================================= */}

      {loading && (
        <section
          className="skeleton-grid"
        >
          {[1, 2].map(
            (item) => (
              <div
                key={item}
                className="skeleton-card"
              />
            )
          )}
        </section>
      )}

      {/* =================================================
          الحلقات
      ================================================= */}

      {!loading && (
        <section
          className="halaqat-grid"
        >
          {filteredHalaqat.length ===
          0 ? (
            <div
              className="empty-state"
            >
              <div
                className="empty-icon"
              >
                <BookOpen
                  size={27}
                />
              </div>

              <h3
                className="empty-title"
              >
                لا توجد حلقات
              </h3>

              <p
                className="empty-text"
              >
                {halaqat.length ===
                0
                  ? "لم يتم ربط أي حلقة بحسابك حتى الآن. تواصل مع إدارة النظام لإضافة الحلقة."
                  : "لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية."}
              </p>
            </div>
          ) : (
            filteredHalaqat.map(
              (halaqa) => (
                <HalaqaCard
                  key={
                    halaqa.id
                  }
                  halaqa={
                    halaqa
                  }
                  onEdit={() =>
                    openEditModal(
                      halaqa
                    )
                  }
                  onOpen={() =>
                    openHalaqa(
                      halaqa
                    )
                  }
                />
              )
            )
          )}
        </section>
      )}

      {/* =================================================
          نافذة التعديل
      ================================================= */}

      {editingHalaqa && (
        <div
          className="modal-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditModal();
            }
          }}
        >
          <div
            className="edit-modal"
          >
            <div
              className="edit-modal-head"
            >
              <div>
                <h2
                  className="edit-modal-title"
                >
                  تعديل الحلقة
                </h2>

                <div
                  className="edit-modal-subtitle"
                >
                  يمكنك تعديل
                  البيانات التشغيلية
                  للحلقة فقط.
                </div>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  closeEditModal
                }
                disabled={
                  saving
                }
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div
              className="edit-modal-body"
            >
              <div
                className="edit-form-grid"
              >
                <div
                  className="form-field"
                >
                  <label
                    className="form-label"
                  >
                    اسم الحلقة
                  </label>

                  <input
                    className="form-input"
                    value={
                      editForm.name
                    }
                    onChange={(
                      e
                    ) =>
                      setEditForm(
                        (
                          current
                        ) => ({
                          ...current,
                          name:
                            e
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="اسم الحلقة"
                  />
                </div>

                <div
                  className="form-field"
                >
                  <label
                    className="form-label"
                  >
                    موعد الحلقة
                  </label>

                  <select
                    className="form-select"
                    value={
                      editForm
                        .halaqa_period
                    }
                    onChange={(
                      e
                    ) =>
                      setEditForm(
                        (
                          current
                        ) => ({
                          ...current,
                          halaqa_period:
                            e
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="">
                      اختر الموعد
                    </option>

                    {HALAQA_PERIODS.map(
                      (
                        period
                      ) => (
                        <option
                          key={
                            period.value
                          }
                          value={
                            period.value
                          }
                        >
                          {
                            period.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div
                  className="form-field"
                >
                  <label
                    className="form-label"
                  >
                    سعة الحلقة
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="500"
                    className="form-input"
                    value={
                      editForm.capacity
                    }
                    onChange={(
                      e
                    ) =>
                      setEditForm(
                        (
                          current
                        ) => ({
                          ...current,
                          capacity:
                            e
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div
                  className="form-field"
                >
                  <label
                    className="form-label"
                  >
                    المسجد
                  </label>

                  <input
                    className="form-input"
                    value={
                      editingHalaqa
                        .mosque
                        ?.name ||
                      "غير محدد"
                    }
                    disabled
                    style={{
                      opacity:
                        0.72,
                      cursor:
                        "not-allowed",
                    }}
                  />
                </div>

                <div
                  className="form-field full"
                >
                  <label
                    className="form-label"
                  >
                    وصف الحلقة
                  </label>

                  <textarea
                    className="form-textarea"
                    value={
                      editForm
                        .description
                    }
                    onChange={(
                      e
                    ) =>
                      setEditForm(
                        (
                          current
                        ) => ({
                          ...current,
                          description:
                            e
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="اكتب وصفاً مختصراً للحلقة..."
                  />
                </div>
              </div>
            </div>

            <div
              className="edit-modal-footer"
            >
              <button
                type="button"
                className="modal-cancel"
                onClick={
                  closeEditModal
                }
                disabled={
                  saving
                }
              >
                إلغاء
              </button>

              <button
                type="button"
                className="modal-save"
                onClick={
                  saveEdit
                }
                disabled={
                  saving
                }
              >
                {saving ? (
                  <>
                    <Loader2
                      size={17}
                      className="spin"
                    />

                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Save
                      size={17}
                    />

                    حفظ التعديلات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   بطاقة الإحصائية
========================================================= */

function StatBox({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div
      className="halaqat-stat"
    >
      <div
        className="halaqat-stat-top"
      >
        <div>
          <div
            className="halaqat-stat-label"
          >
            {label}
          </div>

          <div
            className="halaqat-stat-value"
          >
            {value}
          </div>
        </div>

        <div
          className="halaqat-stat-icon"
        >
          <Icon
            size={20}
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   بطاقة الحلقة
========================================================= */

function HalaqaCard({
  halaqa,
  onEdit,
  onOpen,
}) {
  const status =
    getStatusMeta(
      halaqa.status
    );

  return (
    <article
      className="halaqa-card"
    >
      <div
        className="halaqa-card-accent"
      />

      <div
        className="halaqa-card-body"
      >
        <div
          className="halaqa-card-head"
        >
          <div>
            <h2
              className="halaqa-card-name"
            >
              {halaqa.name}
            </h2>

            <div
              className="halaqa-mosque"
            >
              <Building2
                size={15}
              />

              {halaqa.mosque
                ?.name ||
                "مسجد غير محدد"}
            </div>
          </div>

          <div
            className="halaqa-badges"
          >
            <span
              className="halaqa-badge"
              style={{
                background:
                  status.background,

                color:
                  status.color,

                border:
                  `1px solid ${status.border}`,
              }}
            >
              {
                status.label
              }
            </span>

            <span
              className="halaqa-badge"
              style={{
                background:
                  halaqa.teacher_role ===
                  "main"
                    ? "#ECFDF5"
                    : "#EFF6FF",

                color:
                  halaqa.teacher_role ===
                  "main"
                    ? "#047857"
                    : "#1D4ED8",

                border:
                  `1px solid ${
                    halaqa.teacher_role ===
                    "main"
                      ? "#A7F3D0"
                      : "#BFDBFE"
                  }`,
              }}
            >
              {halaqa.teacher_role ===
              "main"
                ? "المعلم الرئيسي"
                : "معلم مساعد"}
            </span>
          </div>
        </div>

        <div
          className="halaqa-info-grid"
        >
          <div
            className="halaqa-info-item"
          >
            <div
              className="halaqa-info-label"
            >
              <Clock3
                size={14}
              />

              موعد الحلقة
            </div>

            <div
              className="halaqa-info-value"
            >
              {getPeriodLabel(
                halaqa
                  .halaqa_period
              )}
            </div>
          </div>

          <div
            className="halaqa-info-item"
          >
            <div
              className="halaqa-info-label"
            >
              <Users
                size={14}
              />

              الطلاب
            </div>

            <div
              className="halaqa-info-value"
            >
              {
                halaqa.students_count
              }
              {" / "}
              {
                halaqa.capacity ||
                "—"
              }
            </div>
          </div>
        </div>

        <div
          className="occupancy-wrap"
        >
          <div
            className="occupancy-head"
          >
            <span
              className="occupancy-title"
            >
              نسبة امتلاء الحلقة
            </span>

            <span
              className="occupancy-value"
            >
              {
                halaqa.occupancy_rate
              }
              %
            </span>
          </div>

          <div
            className="occupancy-track"
          >
            <div
              className="occupancy-fill"
              style={{
                width:
                  `${halaqa.occupancy_rate}%`,
              }}
            />
          </div>
        </div>

        <div
          className="performance-grid"
        >
          <PerformanceBox
            icon={
              UserRoundCheck
            }
            label="الحضور"
            value={
              halaqa.attendance_rate ===
              null
                ? "—"
                : `${halaqa.attendance_rate}%`
            }
          />

          <PerformanceBox
            icon={Mic2}
            label="تسميع اليوم"
            value={
              halaqa.recitations_today
            }
          />

          <PerformanceBox
            icon={
              TrendingUp
            }
            label="الإنجاز"
            value={
              halaqa.progress_rate ===
              null
                ? "—"
                : `${halaqa.progress_rate}%`
            }
          />
        </div>

        {halaqa.follow_up_count >
        0 ? (
          <div
            className="follow-up has-alert"
          >
            <AlertTriangle
              size={16}
            />

            {
              halaqa.follow_up_count
            }

            {halaqa.follow_up_count ===
            1
              ? " طالب يحتاج متابعة"
              : " طلاب يحتاجون متابعة"}
          </div>
        ) : (
          <div
            className="follow-up clear"
          >
            <CheckCircle2
              size={16}
            />

            لا توجد حالات
            متابعة حالياً
          </div>
        )}

        <div
          className="halaqa-actions"
        >
          <button
            type="button"
            className="halaqa-edit-btn"
            onClick={
              onEdit
            }
          >
            <Pencil
              size={15}
            />

            تعديل
          </button>

          <button
            type="button"
            className="halaqa-open-btn"
            onClick={
              onOpen
            }
          >
            فتح الحلقة

            <ChevronLeft
              size={16}
            />
          </button>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   مؤشر أداء
========================================================= */

function PerformanceBox({
  label,
  value,
}) {
  return (
    <div
      className="performance-box"
    >
      <div
        className="performance-label"
      >
        {label}
      </div>

      <div
        className="performance-value"
      >
        {value}
      </div>
    </div>
  );
}