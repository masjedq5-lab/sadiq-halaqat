import {displayDateFormatter} from "../../lib/calendar";
import {monthRange, dateKey, weekRange} from "../../lib/calendar";
import CalendarInput from "../../components/CalendarInput";
import useRecitationAttendance from "../../lib/useRecitationAttendance";
import { assertRecitationAttendance } from "../../lib/recitationAttendance";
import SideLessonFields from "../../components/SideLessonFields";
import { storedSideLesson, formatSideLessonTotal, validateSideLesson, sideLessonPayload, withSideLessonMetrics } from "../../lib/sideLesson";
import StudentLessonActivity from "../../components/StudentLessonActivity";
import { learningPolicy } from "../../lib/effectiveLearning";
// src/pages/teacher/Recitations.jsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { BookOpen, CalendarDays, CheckCircle2, CircleAlert, ChevronDown, ChevronLeft, Clock3, Edit3, FileText, GraduationCap, Layers3, Loader2, MessageSquareText, Plus, Play, RefreshCw, Search, Sparkles, Target, Trash2, Trophy, UserX, X, BookMarked, Hash, Save, LibraryBig, History, ShieldCheck, Building2 } from "lucide-react";

import {
  supabase,
} from "../../lib/supabase";

import {
  surahs,
  evaluations,
} from "../../data/surahList";

import {
  useToast,
} from "../../components/Toast";
import {
  useTeacherPreferences,
} from "../../context/TeacherPreferencesContext";

/* =========================================================
   ثوابت
========================================================= */

const LESSON_AMOUNTS = [
  {
    value: "three_lines",
    label: "3 أسطر",
    faces: 0.2,
    hint: "3 من 15 سطر",
  },
  {
    value: "half_page",
    label: "نصف صفحة",
    faces: 0.5,
    hint: "0.50 وجه",
  },
  {
    value: "one_page",
    label: "صفحة",
    faces: 1,
    hint: "1.00 وجه",
  },
  {
    value: "two_pages",
    label: "صفحتان",
    faces: 2,
    hint: "2.00 وجه",
  },
];

const HALAQA_PERIODS = {
  after_fajr: "بعد الفجر",
  after_dhuhr: "بعد الظهر",
  after_asr: "بعد العصر",
  after_maghrib: "بعد المغرب",
  after_isha: "بعد العشاء",
};

function normalizeQuranPlanDirection(value) {
  return value === "backward" ? "backward" : "forward";
}

/* =========================================================
   Initial Forms
========================================================= */

function createCommonForm() {
  return {
    halaqa_id: "",
    student_id: "",
    recitation_date:
      getLocalDate(),
    notes: "",
  };
}

function createQuranForm(defaultAmountType = "") {
  const defaultAmount =
    legacyLessonAmount(defaultAmountType);

  return {
    from_surah: "",
    from_ayah: "",
    to_surah: "",
    to_ayah: "",

    lesson_evaluation: "",
    lesson_amount_type: defaultAmountType || "",
    lesson_amount_value: defaultAmount.amount,
    lesson_amount_unit: defaultAmount.unit,

    side_lesson_faces: "",
    side_lesson_lines: "",
    side_amount_changed: false,
    next_surah: "",
    next_from_ayah: "",
    next_to_surah: "",
    next_to_ayah: "",
    next_evaluation: "",

    next2_surah: "",
    next2_from_ayah: "",
    next2_to_surah: "",
    next2_to_ayah: "",
    next2_evaluation: "",

    review_surah: "",
    review_from_ayah: "",
    review_to_surah: "",
    review_to_ayah: "",
    review_evaluation: "",
    review_faces: "",
  };
}

function createCompletionModes() {
  return {
    lesson: "exact",

    review: "exact",
  };
}

function createNooraniaForm() {
  return {
    lesson: "",
    lesson_evaluation: "",
    lesson_faces: "",
    lesson_unit: "lines",

    side_lesson_faces: "",
    side_lesson_lines: "",
    side_amount_changed: false,
    side_lesson: "",
    side_lesson_evaluation: "",

    revision: "",
    revision_evaluation: "",
    revision_faces: "",
    revision_unit: "lines",
  };
}

function nooraniaAmountToPages(value, unit) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  // قاعدة الصديق للقاعدة النورانية: 10 أسطر = صفحة واحدة.
  const pages = unit === "lines"
    ? amount / 10
    : amount;

  return Math.round((pages + Number.EPSILON) * 10000) / 10000;
}

/* =========================================================
   الصفحة
========================================================= */

export default function Recitations() {
  const [learningRevision, setLearningRevision] = useState(0);
  const [currentLearningPolicy, setCurrentLearningPolicy] = useState(null);
  const {
    showToast,
  } = useToast();

  const {
    teacherPreferences = {},
  } = useTeacherPreferences();

  /* =====================================================
     بيانات المستخدم
  ===================================================== */

  const [
    teacher,
    setTeacher,
  ] = useState(null);

  const [
    halaqat,
    setHalaqat,
  ] = useState([]);

  /*
    الطلاب الحاليون فقط
    لاستخدامهم عند إنشاء تسميع جديد.
  */

  const [
    students,
    setStudents,
  ] = useState([]);

  /*
    جميع ملفات الطلاب المرتبطين
    بالسجلات القديمة أو الحالية.

    الهدف:
    إظهار اسم الطالب حتى لو
    انتقل لاحقًا من الحلقة.
  */

  const [
    profiles,
    setProfiles,
  ] = useState([]);

  /* =====================================================
     السجلات
  ===================================================== */

  const [
    quranRecords,
    setQuranRecords,
  ] = useState([]);

  const [
    nooraniaRecords,
    setNooraniaRecords,
  ] = useState([]);

  /* =====================================================
     حالات الصفحة
  ===================================================== */

  const [
    initialLoading,
    setInitialLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingKey,
    setDeletingKey,
  ] = useState("");

  /* =====================================================
     Modal
  ===================================================== */

  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  /*
    quran
    noorania
  */

  const [
    formType,
    setFormType,
  ] = useState("quran");

  /*
    {
      type: "quran" | "noorania",
      id: number
    }
  */

  const [
    editing,
    setEditing,
  ] = useState(null);

  const [
    commonForm,
    setCommonForm,
  ] = useState(
    createCommonForm
  );

  const [
    quranForm,
    setQuranForm,
  ] = useState(
    createQuranForm
  );

  const [
    nooraniaForm,
    setNooraniaForm,
  ] = useState(
    createNooraniaForm
  );


  const [
    planSuggestion,
    setPlanSuggestion,
  ] = useState(null);

  const [
    rangeMetrics,
    setRangeMetrics,
  ] = useState({
    lesson: null,


    review: null,
  });

  const [
    rangeMetricsLoading,
    setRangeMetricsLoading,
  ] = useState(false);

  const [
    completionModes,
    setCompletionModes,
  ] = useState(createCompletionModes);

  /* =====================================================
     جلسة الحلقة القابلة للاستئناف
  ===================================================== */

  const [
    activeSession,
    setActiveSession,
  ] = useState(null);

  const [
    sessionStudents,
    setSessionStudents,
  ] = useState([]);

  const [
    sessionBusy,
    setSessionBusy,
  ] = useState(false);

  const [
    sessionLauncherHalaqa,
    setSessionLauncherHalaqa,
  ] = useState("");

  const [
    sessionLauncherDate,
    setSessionLauncherDate,
  ] = useState(getLocalDate());

  /* =====================================================
     سجل العمليات - Filters
  ===================================================== */

  const [
    recordsSearch,
    setRecordsSearch,
  ] = useState("");

  const [
    recordTypeFilter,
    setRecordTypeFilter,
  ] = useState("all");

  const [
    halaqaFilter,
    setHalaqaFilter,
  ] = useState("all");

  const [
    dateFilter,
    setDateFilter,
  ] = useState("today");

  const attendanceGuard = useRecitationAttendance(supabase, commonForm, formOpen,
    sessionStudents.map(row => `${row.student_id}:${row.status}`).join(","));

  /* =====================================================
     التحميل
  ===================================================== */

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (
      !sessionLauncherHalaqa &&
      halaqat.length === 1
    ) {
      setSessionLauncherHalaqa(String(halaqat[0].id));
    }
  }, [halaqat, sessionLauncherHalaqa]);

  /* =====================================================
     منع Scroll خلف Modal
  ===================================================== */

  useEffect(() => {
    if (!formOpen) {
      document.body.style.overflow =
        "";

      return;
    }

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [formOpen]);

  /* =====================================================
     جلسة الحلقة - تحميل / استئناف
  ===================================================== */

  async function loadActiveSessionForTeacher(
    teacherId,
    knownProfiles = []
  ) {
    if (!teacherId) {
      setActiveSession(null);
      setSessionStudents([]);
      return null;
    }

    const { data: session, error } = await supabase
      .from("recitation_sessions")
      .select("*")
      .eq("teacher_id", Number(teacherId))
      .eq("session_type", "quran")
      .eq("status", "active")
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!session) {
      setActiveSession(null);
      setSessionStudents([]);
      return null;
    }

    const { data: rows, error: rowsError } = await supabase
      .from("recitation_session_students")
      .select("*")
      .eq("session_id", Number(session.id))
      .order("position", { ascending: true });

    if (rowsError) throw rowsError;

    const baseProfiles = Array.isArray(knownProfiles)
      ? knownProfiles
      : [];

    const profileMap = new Map(
      baseProfiles.map((profile) => [
        Number(profile.id),
        profile,
      ])
    );

    const missingIds = [
      ...new Set(
        (rows || [])
          .map((row) => Number(row.student_id))
          .filter((id) => id && !profileMap.has(id))
      ),
    ];

    if (missingIds.length > 0) {
      const { data: missingProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, user_number, phone, status")
        .in("id", missingIds);

      if (profilesError) throw profilesError;

      (missingProfiles || []).forEach((profile) => {
        profileMap.set(Number(profile.id), profile);
      });
    }

    const preparedRows = (rows || []).map((row) => ({
      ...row,
      student_profile:
        profileMap.get(Number(row.student_id)) || null,
    }));

    setActiveSession(session);
    setSessionStudents(preparedRows);
    setSessionLauncherHalaqa(String(session.halaqa_id));
    setSessionLauncherDate(session.session_date || getLocalDate());

    return {
      session,
      students: preparedRows,
    };
  }

  /* =====================================================
     تحميل البيانات
  ===================================================== */

  async function loadData(
    silent = false
  ) {
    if (silent) {
      setRefreshing(true);
    } else {
      setInitialLoading(true);
    }

    try {
      /* -----------------------------------------
         Auth
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
         Teacher profile
      ----------------------------------------- */

      const {
        data:
          teacherProfile,
        error:
          teacherError,
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
         Teacher Halaqat
      ----------------------------------------- */

      const {
        data: teacherLinks,
        error: linksError,
      } =
        await supabase
          .from(
            "teacher_halaqat"
          )
          .select(`
            halaqa_id,
            role
          `)
          .eq(
            "teacher_id",
            teacherProfile.id
          );

      if (linksError) {
        throw linksError;
      }

      const teacherHalaqaIds = [
        ...new Set(
          (
            teacherLinks ||
            []
          ).map(
            (item) =>
              Number(
                item.halaqa_id
              )
          )
        ),
      ];

      if (
        teacherHalaqaIds.length ===
        0
      ) {
        setHalaqat([]);
        setStudents([]);
        setProfiles([]);
        setQuranRecords([]);
        setNooraniaRecords([]);

        return;
      }

      const roleMap =
        new Map();

      (
        teacherLinks || []
      ).forEach(
        (item) => {
          const id =
            Number(
              item.halaqa_id
            );

          /*
            إذا وجد main و assistant
            نفضل main.
          */

          if (
            !roleMap.has(id) ||
            item.role === "main"
          ) {
            roleMap.set(
              id,
              item.role
            );
          }
        }
      );

      /* -----------------------------------------
         Halaqat
      ----------------------------------------- */

      const {
        data: halaqatRows,
        error:
          halaqatError,
      } =
        await supabase
          .from("halaqat")
          .select(`
            id,
            name,
            mosque_id,
            halaqa_period,
            capacity,
            status
          `)
          .in(
            "id",
            teacherHalaqaIds
          )
          .order(
            "name",
            {
              ascending:
                true,
            }
          );

      if (halaqatError) {
        throw halaqatError;
      }

      /* -----------------------------------------
         Mosques
      ----------------------------------------- */

      const mosqueIds = [
        ...new Set(
          (
            halaqatRows ||
            []
          )
            .map(
              (item) =>
                item.mosque_id
            )
            .filter(Boolean)
            .map(Number)
        ),
      ];

      let mosqueRows = [];

      if (
        mosqueIds.length > 0
      ) {
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

        mosqueRows =
          data || [];
      }

      const mosqueMap =
        new Map(
          mosqueRows.map(
            (mosque) => [
              Number(
                mosque.id
              ),
              mosque.name,
            ]
          )
        );

      const preparedHalaqat =
        (
          halaqatRows ||
          []
        ).map(
          (halaqa) => ({
            ...halaqa,

            mosque_name:
              mosqueMap.get(
                Number(
                  halaqa.mosque_id
                )
              ) ||
              "مسجد غير محدد",

            teacher_role:
              roleMap.get(
                Number(
                  halaqa.id
                )
              ) ||
              "assistant",
          })
        );

      setHalaqat(
        preparedHalaqat
      );

      /* -----------------------------------------
         Current student assignments
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
            is_current
          `)
          .in(
            "halaqa_id",
            teacherHalaqaIds
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

      /* -----------------------------------------
         Quran Records

         مهم:
         نجيب بالسحلقة وليس teacher_id
         حتى تظهر السجلات القديمة التي
         teacher_id فيها null.
      ----------------------------------------- */

      const {
        data:
          quranRows,
        error:
          quranError,
      } =
        await supabase
          .from("recitations")
          .select("*")
          .in(
            "halaqa_id",
            teacherHalaqaIds
          )
          .order(
            "recitation_date",
            {
              ascending:
                false,
            }
          )
          .order(
            "id",
            {
              ascending:
                false,
            }
          );

      if (quranError) {
        throw quranError;
      }

      /* -----------------------------------------
         Noorania Records
      ----------------------------------------- */

      const {
        data:
          nooraniaRows,
        error:
          nooraniaError,
      } =
        await supabase
          .from(
            "noorania_recitations"
          )
          .select("*")
          .in(
            "halaqa_id",
            teacherHalaqaIds
          )
          .order(
            "recitation_date",
            {
              ascending:
                false,
            }
          )
          .order(
            "id",
            {
              ascending:
                false,
            }
          );

      if (
        nooraniaError
      ) {
        throw nooraniaError;
      }

      setQuranRecords(await withSideLessonMetrics(supabase, quranRows || []));

      setNooraniaRecords(await withSideLessonMetrics(supabase, nooraniaRows || [], "noorania"));

      /* -----------------------------------------
         Profile IDs

         الحاليون + أصحاب السجلات القديمة.
      ----------------------------------------- */

      const studentIds = [
        ...new Set([
          ...(
            assignments || []
          ).map(
            (item) =>
              Number(
                item.student_id
              )
          ),

          ...(
            quranRows || []
          ).map(
            (item) =>
              Number(
                item.student_id
              )
          ),

          ...(
            nooraniaRows || []
          ).map(
            (item) =>
              Number(
                item.student_id
              )
          ),
        ]),
      ].filter(Boolean);

      let profileRows = [];

      if (
        studentIds.length > 0
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              user_number,
              phone,
              status,
              learning_goal,
              recitation_mode,
              recitation_days
            `)
            .in(
              "id",
              studentIds
            );

        if (error) {
          throw error;
        }

        profileRows =
          data || [];
      }

      setProfiles(
        profileRows
      );

      const profileMap =
        new Map(
          profileRows.map(
            (profile) => [
              Number(
                profile.id
              ),
              profile,
            ]
          )
        );

      /*
        الطلاب النشطون والحاليون
        فقط عند إضافة سجل جديد.
      */

      const currentStudents =
        (
          assignments || []
        )
          .map(
            (
              assignment
            ) => {
              const profile =
                profileMap.get(
                  Number(
                    assignment
                      .student_id
                  )
                );

              if (!profile) {
                return null;
              }

              if (
                profile.status !==
                "active"
              ) {
                return null;
              }

              return {
                ...profile,

                student_id:
                  Number(
                    profile.id
                  ),

                halaqa_id:
                  Number(
                    assignment
                      .halaqa_id
                  ),
              };
            }
          )
          .filter(Boolean);

      setStudents(
        currentStudents
      );

      await loadActiveSessionForTeacher(
        teacherProfile.id,
        profileRows
      );

    } catch (error) {
      console.error(
        "LOAD RECITATIONS:",
        error
      );

      showToast(
        error.message ||
          "تعذر تحميل بيانات التسميع",
        "error"
      );
    } finally {
      setInitialLoading(
        false
      );

      setRefreshing(
        false
      );
    }
  }

  /* =====================================================
     أسماء
  ===================================================== */

  function studentName(
    id
  ) {
    return (
      profiles.find(
        (profile) =>
          Number(
            profile.id
          ) ===
          Number(id)
      )?.full_name ||
      "طالب غير معروف"
    );
  }

  function halaqaName(
    id
  ) {
    return (
      halaqat.find(
        (halaqa) =>
          Number(
            halaqa.id
          ) ===
          Number(id)
      )?.name ||
      "حلقة غير معروفة"
    );
  }

  /* =====================================================
     Combined Records
  ===================================================== */

  const allRecords =
    useMemo(() => {
      const merged = [
        ...quranRecords.map(
          (record) => ({
            ...record,
            record_type:
              "quran",
          })
        ),

        ...nooraniaRecords.map(
          (record) => ({
            ...record,
            record_type:
              "noorania",
          })
        ),
      ];

      return merged.sort(
        (a, b) => {
          const dateCompare =
            String(
              b.recitation_date ||
                ""
            ).localeCompare(
              String(
                a.recitation_date ||
                  ""
              )
            );

          if (
            dateCompare !== 0
          ) {
            return dateCompare;
          }

          return (
            Number(b.id) -
            Number(a.id)
          );
        }
      );
    }, [
      quranRecords,
      nooraniaRecords,
    ]);

  /* =====================================================
     Record filters
  ===================================================== */

  const filteredRecords =
    useMemo(() => {
      const text =
        recordsSearch
          .trim()
          .toLowerCase();

      const todayDate =
        getLocalDate();

      const monthPeriod = monthRange(todayDate);
      const weekPeriod = weekRange(todayDate);

      return allRecords.filter(
        (record) => {
          const name =
            studentName(
              record.student_id
            ).toLowerCase();

          const hName =
            halaqaName(
              record.halaqa_id
            ).toLowerCase();

          const matchesSearch =
            !text ||
            name.includes(
              text
            ) ||
            hName.includes(
              text
            );

          const matchesType =
            recordTypeFilter ===
              "all" ||
            record.record_type ===
              recordTypeFilter;

          const matchesHalaqa =
            halaqaFilter ===
              "all" ||
            Number(
              record.halaqa_id
            ) ===
              Number(
                halaqaFilter
              );

          const matchesDate =
            dateFilter ===
              "all" ||
            (
              dateFilter ===
                "today" &&
              String(
                record.recitation_date ||
                  ""
              ) === todayDate
            ) ||
            (
              dateFilter === "week" && record.recitation_date >= weekPeriod.start && record.recitation_date < weekPeriod.nextStart
            ) || (
              dateFilter ===
                "month" &&
              (record.recitation_date >= monthPeriod.start && record.recitation_date < monthPeriod.nextStart)
            );

          return (
            matchesSearch &&
            matchesType &&
            matchesHalaqa &&
            matchesDate
          );
        }
      );
    }, [
      allRecords,
      recordsSearch,
      recordTypeFilter,
      halaqaFilter,
      dateFilter,
      profiles,
      halaqat,
    ]);

  /* =====================================================
     إحصائيات الشهر الحالي
  ===================================================== */

  const stats =
    useMemo(() => {
      const month = monthRange(dateKey());

      const monthQuran =
        quranRecords.filter(
          (record) =>
            (record.recitation_date >= month.start && record.recitation_date < month.nextStart)
        );

      const monthNoorania =
        nooraniaRecords.filter(
          (record) =>
            (record.recitation_date >= month.start && record.recitation_date < month.nextStart)
        );

      const lessonFaces =
        monthQuran.reduce(
          (sum, record) =>
            sum +
            Number(
              record.lesson_faces ||
                0
            ),
          0
        );

      const reviewFaces =
        monthQuran.reduce(
          (sum, record) =>
            sum +
            Number(
              record.review_faces ||
                0
            ),
          0
        );

      return {
        total:
          allRecords.length,

        quran:
          monthQuran.length,

        noorania:
          monthNoorania.length,

        lessonFaces,

        reviewFaces,
      };
    }, [
      allRecords,
      quranRecords,
      nooraniaRecords,
    ]);

  /* =====================================================
     Students for form
  ===================================================== */

  const studentsForForm =
    useMemo(() => {
      if (
        !commonForm.halaqa_id
      ) {
        return [];
      }

      let result =
        students.filter(
          (student) =>
            Number(
              student.halaqa_id
            ) ===
            Number(
              commonForm.halaqa_id
            )
        );

      /*
        أثناء تعديل سجل قديم،
        ربما الطالب انتقل إلى
        حلقة أخرى لاحقًا.

        نضيفه للقائمة حتى يظهر
        اسمه بشكل صحيح.
      */

      if (
        editing &&
        commonForm.student_id &&
        !result.some(
          (student) =>
            Number(
              student.id
            ) ===
            Number(
              commonForm.student_id
            )
        )
      ) {
        const oldStudent =
          profiles.find(
            (profile) =>
              Number(
                profile.id
              ) ===
              Number(
                commonForm.student_id
              )
          );

        if (oldStudent) {
          result = [
            {
              ...oldStudent,

              student_id:
                oldStudent.id,

              halaqa_id:
                Number(
                  commonForm.halaqa_id
                ),
            },

            ...result,
          ];
        }
      }

      return result;
    }, [
      students,
      profiles,
      commonForm.halaqa_id,
      commonForm.student_id,
      editing,
    ]);

  /* =====================================================
     الخطة الشهرية → المطلوب القرآني الفعلي
  ===================================================== */

  useEffect(() => {
    if (
      editing ||
      !formOpen ||
      formType !== "quran" ||
      !commonForm.student_id ||
      !commonForm.halaqa_id ||
      !commonForm.recitation_date
    ) {
      if (editing) {
        setPlanSuggestion(null);
      }
      return;
    }

    let active = true;

    async function rpcOne(name, args) {
      const { data, error } = await supabase.rpc(name, args);
      if (error) throw error;
      return Array.isArray(data) ? data[0] || null : data || null;
    }

    async function generateRange({
      startSurah,
      startAyah,
      amount,
      unit,
      limitSurah,
      limitAyah,
      direction = "forward",
    }) {
      if (
        !startSurah ||
        !startAyah ||
        !limitSurah ||
        !limitAyah ||
        Number(amount || 0) <= 0
      ) {
        return null;
      }

      const normalizedDirection =
        normalizeQuranPlanDirection(direction);

      const rpcName =
        normalizedDirection === "backward"
          ? "quran_generate_reverse_bounded_assignment_v1"
          : "quran_generate_assignment";

      try {
        return await rpcOne(rpcName, {
          p_start_surah: startSurah,
          p_start_ayah: Number(startAyah),
          p_target_amount: Number(amount),
          p_target_unit: unit || "lines",
          p_limit_surah: limitSurah,
          p_limit_ayah: Number(limitAyah),
        });
      } catch (error) {
        const message = String(error?.message || "");

        if (
          message.includes("QURAN_LIMIT_BEFORE_START") ||
          message.includes("QURAN_REVERSE_LIMIT_NOT_AFTER_ROUTE_START")
        ) {
          return null;
        }

        throw error;
      }
    }

    async function nextPosition(
      surahName,
      ayahNumber,
      direction = "forward"
    ) {
      if (!surahName || !ayahNumber) return null;

      const rpcName =
        normalizeQuranPlanDirection(direction) === "backward"
          ? "quran_next_reverse_surah_position"
          : "quran_next_ayah";

      return rpcOne(rpcName, {
        p_surah: surahName,
        p_ayah: Number(ayahNumber),
      });
    }

    async function getRevisionCycleBounds(plan) {
      if (!plan?.revision_auto_range) {
        return null;
      }

      const { data: policy, error: policyError } = await supabase
        .from("quran_student_policies")
        .select(`
          revision_scope_mode,
          revision_scope_start_surah,
          revision_scope_start_ayah,
          revision_scope_end_surah,
          revision_scope_end_ayah
        `)
        .eq("student_id", Number(commonForm.student_id))
        .eq("halaqa_id", Number(commonForm.halaqa_id))
        .lte("effective_from", commonForm.recitation_date)
        .or(`effective_to.is.null,effective_to.gte.${commonForm.recitation_date}`)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (policyError) throw policyError;

      if (
        policy?.revision_scope_mode === "manual" &&
        policy.revision_scope_start_surah &&
        Number(policy.revision_scope_start_ayah || 0) > 0 &&
        policy.revision_scope_end_surah &&
        Number(policy.revision_scope_end_ayah || 0) > 0
      ) {
        return {
          startSurah: policy.revision_scope_start_surah,
          startAyah: Number(policy.revision_scope_start_ayah),
          endSurah: policy.revision_scope_end_surah,
          endAyah: Number(policy.revision_scope_end_ayah),
          source: "manual",
        };
      }

      if (!plan?.memorization_from_surah) {
        return null;
      }

      const bounds = await rpcOne(
        "quran_revision_cycle_bounds",
        {
          p_lesson_surah: plan.memorization_from_surah,
          p_direction: normalizeQuranPlanDirection(
            plan.revision_direction
          ),
        }
      );

      if (!bounds) return null;

      return {
        startSurah: bounds.cycle_start_surah_name,
        startAyah: Number(bounds.cycle_start_ayah),
        endSurah: bounds.cycle_end_surah_name,
        endAyah: Number(bounds.cycle_end_ayah),
        source: "lesson_derived",
      };
    }

    async function generateReviewRange({
      plan,
      startSurah,
      startAyah,
      amount,
      unit,
      cycleBounds,
    }) {
      if (
        !startSurah ||
        !startAyah ||
        Number(amount || 0) <= 0
      ) {
        return null;
      }

      if (cycleBounds) {
        return generateCyclicQuranAssignmentRange({
          startSurah,
          startAyah,
          amount,
          unit,
          direction: plan?.revision_direction,
          cycleBounds,
        });
      }

      return generateRange({
        startSurah,
        startAyah,
        amount,
        unit,
        limitSurah: plan?.revision_to_surah,
        limitAyah: plan?.revision_to_ayah,
        direction: plan?.revision_direction,
      });
    }

    async function loadPlanSuggestion() {
      try {
        const hijri = getHijriPartsForDate(
          commonForm.recitation_date
        );

        const { data: plan, error } = await supabase
          .from("monthly_plans")
          .select(`
            id,
            status,
            hijri_year,
            hijri_month,
            memorization_daily_amount,
            memorization_daily_unit,
            revision_daily_amount,
            revision_daily_unit,
            memorization_direction,
            memorization_auto_range,
            revision_direction,
            revision_auto_range,
            memorization_from_surah,
            memorization_from_ayah,
            memorization_to_surah,
            memorization_to_ayah,
            revision_from_surah,
            revision_from_ayah,
            revision_to_surah,
            revision_to_ayah,
            memorization_target_faces,
            revision_target_faces,
            planned_sessions,
            recitation_days_snapshot,
            noorania_lesson_daily_amount,
            noorania_lesson_daily_unit,
            noorania_revision_daily_amount,
            noorania_revision_daily_unit
          `)
          .eq("student_id", Number(commonForm.student_id))
          .eq("halaqa_id", Number(commonForm.halaqa_id))
          .eq("hijri_year", Number(hijri.year))
          .eq("hijri_month", Number(hijri.month))
          .maybeSingle();

        if (error) throw error;
        if (!active) return;

        const policy = await learningPolicy(commonForm.student_id, commonForm.halaqa_id, commonForm.recitation_date);
        if (!active) return;
        setCurrentLearningPolicy(policy);

        if (!plan) {
          setPlanSuggestion(null);
          return;
        }

        const {
          data: interventionHistory,
          error: interventionError,
        } = await supabase
          .from("student_learning_interventions")
          .select(`
            id,
            intervention_type,
            status,
            confirmed_reason,
            trigger_summary,
            start_date,
            end_date,
            lesson_override_amount,
            lesson_override_unit,
            review_daily_amount,
            review_daily_unit
          `)
          .eq("student_id", Number(commonForm.student_id))
          .eq("halaqa_id", Number(commonForm.halaqa_id))
          .in("status", ["active", "completed"])
          .lte("start_date", commonForm.recitation_date)
          .order("start_date", { ascending: false }).order("id", { ascending: false });

        if (interventionError) throw interventionError;
        const activeIntervention = (interventionHistory || []).find((item) => !item.end_date ||
          (item.status === "completed" ? item.end_date > commonForm.recitation_date : item.end_date >= commonForm.recitation_date)) || null;

        const student = profiles.find(
          (item) => Number(item.id) === Number(commonForm.student_id)
        );

        const days = Array.isArray(plan.recitation_days_snapshot) &&
          plan.recitation_days_snapshot.length
          ? plan.recitation_days_snapshot
          : Array.isArray(student?.recitation_days)
            ? student.recitation_days
            : [];

        const scheduledToday = isScheduledRecitationDate(
          commonForm.recitation_date,
          days
        );

        const plannedSessions = Number(plan.planned_sessions || 0);

        const memFallback = inferDailyFromTarget(
          plan.memorization_target_faces,
          plannedSessions
        );

        const revFallback = inferDailyFromTarget(
          plan.revision_target_faces,
          plannedSessions
        );

        const baseMemorizationAmount =
          policy?.lesson_daily_amount ?? plan.memorization_daily_amount ?? memFallback.amount;

        const baseMemorizationUnit =
          policy?.lesson_daily_unit || plan.memorization_daily_unit || memFallback.unit || "lines";

        const baseRevisionAmount =
          plan.revision_daily_amount ?? revFallback.amount;

        const baseRevisionUnit =
          plan.revision_daily_unit || revFallback.unit || "faces";

        const interventionType =
          activeIntervention?.intervention_type || null;

        const lessonSuppressed =
          policy?.lesson_enabled === false || Number(baseMemorizationAmount || 0) <= 0 ||
          interventionType === "stabilization_full" ||
          interventionType === "pause";

        const memorizationAmount =
          interventionType === "stabilization_partial"
            ? Number(activeIntervention?.lesson_override_amount || 0)
            : baseMemorizationAmount;

        const memorizationUnit =
          interventionType === "stabilization_partial"
            ? (activeIntervention?.lesson_override_unit || baseMemorizationUnit)
            : baseMemorizationUnit;

        const revisionAmount =
          interventionType === "pause"
            ? null
            : (
                activeIntervention?.review_daily_amount ??
                baseRevisionAmount
              );

        const revisionUnit =
          interventionType === "pause"
            ? baseRevisionUnit
            : (
                activeIntervention?.review_daily_unit ||
                baseRevisionUnit
              );

        const reviewSegmentType =
          interventionType === "stabilization_full"
            ? "stabilization_review"
            : "revision";

        const [lessonHistory, reviewHistory] = await Promise.all([
          supabase.from("recitations").select("to_surah,to_ayah,recitation_date")
            .eq("student_id", Number(commonForm.student_id)).eq("halaqa_id", Number(commonForm.halaqa_id))
            .lte("recitation_date", commonForm.recitation_date).not("to_surah", "is", null).not("to_ayah", "is", null)
            .or("lesson_evaluation.is.null,lesson_evaluation.neq.إعادة")
            .order("recitation_date", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("recitations").select("review_to_surah,review_to_ayah,recitation_date")
            .eq("student_id", Number(commonForm.student_id)).eq("halaqa_id", Number(commonForm.halaqa_id))
            .lte("recitation_date", commonForm.recitation_date).not("review_to_surah", "is", null).not("review_to_ayah", "is", null)
            .or("review_evaluation.is.null,review_evaluation.neq.إعادة")
            .order("recitation_date", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (lessonHistory.error) throw lessonHistory.error;
        if (reviewHistory.error) throw reviewHistory.error;
        const previousLesson = lessonHistory.data;
        const previousReview = reviewHistory.data;

        let lessonStart = {
          surah: plan.memorization_from_surah,
          ayah: plan.memorization_from_ayah,
        };

        if (previousLesson) {
          const next = await nextPosition(
            previousLesson.to_surah,
            previousLesson.to_ayah,
            plan.memorization_direction
          );

          if (next) {
            lessonStart = {
              surah: next.surah_name,
              ayah: next.ayah,
            };
          }
        }

        if (policy?.lesson_start_surah && policy?.lesson_start_ayah &&
          (!previousLesson || previousLesson.recitation_date < policy.lesson_start_date)) {
          lessonStart = { surah: policy.lesson_start_surah, ayah: Number(policy.lesson_start_ayah) };
        }

        const revisionCycleBounds =
          await getRevisionCycleBounds(plan);

        let reviewStart = {
          surah: plan.revision_from_surah,
          ayah: plan.revision_from_ayah,
        };

        if (previousReview) {
          const reachedCycleEnd =
            revisionCycleBounds &&
            String(previousReview.review_to_surah || "").trim() ===
              String(revisionCycleBounds.endSurah || "").trim() &&
            Number(previousReview.review_to_ayah || 0) ===
              Number(revisionCycleBounds.endAyah || 0);

          const next = reachedCycleEnd
            ? {
                surah_name: revisionCycleBounds.startSurah,
                ayah: Number(revisionCycleBounds.startAyah),
              }
            : await nextPosition(
                previousReview.review_to_surah,
                previousReview.review_to_ayah,
                plan.revision_direction
              );

          if (next) {
            reviewStart = {
              surah: next.surah_name,
              ayah: next.ayah,
            };
          }
        }

        let generatedLesson = null;
        let generatedReview = null;

        if (!lessonSuppressed) {
          try {
            generatedLesson = await generateRange({
              startSurah: lessonStart.surah,
              startAyah: lessonStart.ayah,
              amount: memorizationAmount,
              unit: memorizationUnit,
              limitSurah: plan.memorization_to_surah,
              limitAyah: plan.memorization_to_ayah,
              direction: plan.memorization_direction,
            });
          } catch (generationError) {
            if (!String(generationError?.message || "").includes("QURAN_LIMIT_BEFORE_START")) {
              throw generationError;
            }
          }
        }

        if (interventionType !== "pause") {
          generatedReview = await generateReviewRange({
            plan,
            startSurah: reviewStart.surah,
            startAyah: reviewStart.ayah,
            amount: revisionAmount,
            unit: revisionUnit,
            cycleBounds: revisionCycleBounds,
          });
        }

        if (!active) return;

        setPlanSuggestion({
          ...plan,
          scheduledToday,
          days,
          memorizationAmount,
          memorizationUnit,
          revisionAmount,
          revisionUnit,
          generatedLesson,
          generatedReview,
          activeIntervention: activeIntervention || null,
          interventionType,
          lessonSuppressed,
          reviewSegmentType,
          revisionCycleBounds,
        });

        setCompletionModes(createCompletionModes());
  
        setQuranForm((current) => {
          const next = { ...current };

          if (lessonSuppressed) {
            next.from_surah = "";
            next.from_ayah = "";
            next.to_surah = "";
            next.to_ayah = "";
            next.lesson_evaluation = "";
            next.lesson_amount_value = "";
            next.lesson_amount_type = "";
          }



          if (interventionType === "pause") {
            next.review_surah = "";
            next.review_from_ayah = "";
            next.review_to_surah = "";
            next.review_to_ayah = "";
            next.review_evaluation = "";
            next.review_faces = "";
          }

          if (generatedLesson) {
            next.from_surah = generatedLesson.start_surah_name;
            next.from_ayah = String(generatedLesson.start_ayah);
            next.to_surah = generatedLesson.end_surah_name;
            next.to_ayah = String(generatedLesson.end_ayah);
            next.lesson_amount_value = "";
            next.lesson_amount_unit = memorizationUnit;
            next.lesson_amount_type = "";
          }



          if (generatedReview) {
            next.review_surah = generatedReview.start_surah_name;
            next.review_from_ayah = String(generatedReview.start_ayah);
            next.review_to_surah = generatedReview.end_surah_name;
            next.review_to_ayah = String(generatedReview.end_ayah);
            next.review_faces = "";
          }

          return next;
        });
      } catch (error) {
        console.error("LOAD QURAN ASSIGNMENT:", error);

        if (active) {
          setPlanSuggestion(null);
        }
      }
    }

    loadPlanSuggestion();

    return () => {
      active = false;
    };
  }, [
    editing,
    formOpen,
    formType,
    commonForm.student_id,
    commonForm.halaqa_id,
    commonForm.recitation_date,
    profiles,
    learningRevision,
  ]);

  /* =====================================================
     حساب النطاقات من جدول المصحف
  ===================================================== */

  useEffect(() => {
    if (!formOpen || formType !== "quran") { setRangeMetrics({ lesson: null, review: null }); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setRangeMetricsLoading(true);
      async function metric(fromSurah, fromAyah, toSurah, toAyah) {
        if (!hasCompleteQuranRange(fromSurah, fromAyah, toSurah, toAyah)) return null;
        const { data, error } = await supabase.rpc("quran_range_metrics", {
          p_from_surah: fromSurah, p_from_ayah: Number(fromAyah), p_to_surah: toSurah, p_to_ayah: Number(toAyah) });
        if (error) throw error;
        return Array.isArray(data) ? data[0] || null : data || null;
      }
      try {
        const [lesson, review] = await Promise.all([
          metric(quranForm.from_surah,quranForm.from_ayah,quranForm.to_surah,quranForm.to_ayah),
          metric(quranForm.review_surah,quranForm.review_from_ayah,quranForm.review_to_surah,quranForm.review_to_ayah)]);
        if (active) setRangeMetrics({ lesson, review });
      } catch (error) { console.error("QURAN RANGE METRICS:",error); if (active) setRangeMetrics({lesson:null,review:null}); }
      finally { if (active) setRangeMetricsLoading(false); }
    },180);
    return () => { active=false;window.clearTimeout(timer); };
  },[formOpen,formType,quranForm.from_surah,quranForm.from_ayah,quranForm.to_surah,quranForm.to_ayah,
    quranForm.review_surah,quranForm.review_from_ayah,quranForm.review_to_surah,quranForm.review_to_ayah]);

  /* =====================================================
     حالة جلسة الحلقة الحالية
  ===================================================== */

  const sessionProgress = useMemo(() => {
    const total = sessionStudents.length;
    const completed = sessionStudents.filter(
      (item) => item.status === "completed"
    ).length;
    const absent = sessionStudents.filter(
      (item) => item.status === "absent"
    ).length;
    const skipped = sessionStudents.filter(
      (item) => item.status === "skipped"
    ).length;
    const pending = sessionStudents.filter(
      (item) => item.status === "pending"
    ).length;
    const handled = completed + absent + skipped;

    return {
      total,
      completed,
      absent,
      skipped,
      pending,
      handled,
      percent:
        total > 0
          ? Math.round((handled / total) * 100)
          : 0,
    };
  }, [sessionStudents]);

  const currentSessionStudent = useMemo(() => {
    if (!activeSession) return null;

    const currentId = Number(activeSession.current_student_id || 0);

    return (
      sessionStudents.find(
        (item) =>
          item.status === "pending" &&
          Number(item.student_id) === currentId
      ) ||
      sessionStudents.find(
        (item) => item.status === "pending"
      ) ||
      null
    );
  }, [activeSession, sessionStudents]);

  const isActiveSessionForm = Boolean(
    !editing &&
      formType === "quran" &&
      activeSession &&
      String(activeSession.halaqa_id) === String(commonForm.halaqa_id) &&
      String(activeSession.session_date) === String(commonForm.recitation_date) &&
      sessionStudents.some(
        (item) =>
          item.status === "pending" &&
          String(item.student_id) === String(commonForm.student_id)
      )
  );

  /* =====================================================
     مقدار الدرس الحالي
  ===================================================== */

  const lessonFaces =
    useMemo(() => {
      const manualValue = Number(
        quranForm.lesson_amount_value || 0
      );

      if (manualValue > 0) {
        return quranForm.lesson_amount_unit === "lines"
          ? roundFaces(manualValue / 15)
          : roundFaces(manualValue);
      }

      return (
        LESSON_AMOUNTS.find(
          (item) =>
            item.value === quranForm.lesson_amount_type
        )?.faces || 0
      );
    }, [
      quranForm.lesson_amount_value,
      quranForm.lesson_amount_unit,
      quranForm.lesson_amount_type,
    ]);

  /* =====================================================
     النقاط
  ===================================================== */

  const quranPoints =
    useMemo(() => {
      return (
        calculatePoints(
          quranForm
            .lesson_evaluation
        ) +
        calculatePoints(
          quranForm
            .next_evaluation
        ) +
        calculatePoints(
          quranForm
            .next2_evaluation
        ) +
        calculatePoints(
          quranForm
            .review_evaluation
        )
      );
    }, [quranForm]);

  const nooraniaPoints =
    useMemo(() => {
      return (
        calculatePoints(
          nooraniaForm
            .lesson_evaluation
        ) +
        calculatePoints(
          nooraniaForm
            .side_lesson_evaluation
        ) +
        calculatePoints(
          nooraniaForm
            .revision_evaluation
        )
      );
    }, [nooraniaForm]);

  /* =====================================================
     تحديث Form
  ===================================================== */

  function setCommon(
    key,
    value
  ) {
    if (!editing && key === "halaqa_id") {
      setCommonForm((current) => ({
        ...current,
        halaqa_id: value,
        student_id: "",
      }));

      if (
        teacher?.id &&
        value &&
        teacherPreferences.remember_last_halaqa
      ) {
        try {
          localStorage.setItem(
            `sadiq_teacher_last_halaqa_${teacher.id}`,
            String(value)
          );
        } catch {
          // التذكر المحلي تحسين تجربة فقط.
        }
      }

      setQuranForm(
        createQuranForm(
          teacherPreferences.recitation_default_amount_type
        )
      );
      setNooraniaForm(createNooraniaForm());
      setPlanSuggestion(null);
      setCompletionModes(createCompletionModes());
      return;
    }

    if (!editing && key === "student_id") {
      setCommonForm((current) => ({
        ...current,
        student_id: value,
      }));

      // لا نسمح أن تنتقل مقادير الطالب السابق إلى الطالب الجديد.
      setQuranForm(
        createQuranForm(
          teacherPreferences.recitation_default_amount_type
        )
      );
      setNooraniaForm(createNooraniaForm());
      setPlanSuggestion(null);
      setCompletionModes(createCompletionModes());
      return;
    }

    setCommonForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  function setQuran(
    key,
    value
  ) {
    setQuranForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }



  function setTrackCompletion(
    track,
    mode
  ) {
    const config =
      track === "lesson"
        ? {
            generated: planSuggestion?.generatedLesson,
            fromSurahKey: "from_surah",
            fromAyahKey: "from_ayah",
            toSurahKey: "to_surah",
            toAyahKey: "to_ayah",
            evaluationKey: "lesson_evaluation",
          }
        : {
              generated: planSuggestion?.generatedReview,
              fromSurahKey: "review_surah",
              fromAyahKey: "review_from_ayah",
              toSurahKey: "review_to_surah",
              toAyahKey: "review_to_ayah",
              evaluationKey: "review_evaluation",
            };

    const generated = config.generated;

    setCompletionModes((current) => ({
      ...current,
      [track]: mode,
    }));

    if (!generated) return;

    setQuranForm((current) => {
      const next = { ...current };

      next[config.fromSurahKey] = generated.start_surah_name;
      next[config.fromAyahKey] = String(generated.start_ayah);

      if (mode === "exact" || mode === "repeat") {
        next[config.toSurahKey] = generated.end_surah_name;
        next[config.toAyahKey] = String(generated.end_ayah);
      }

      if (mode === "repeat") {
        next[config.evaluationKey] = "إعادة";
      } else if (next[config.evaluationKey] === "إعادة") {
        next[config.evaluationKey] = "";
      }

      return next;
    });
  }

  function setTrackEvaluation(
    track,
    key,
    value
  ) {
    setQuran(key, value);

    if (value === "إعادة") {
      setTrackCompletion(track, "repeat");
      return;
    }

    if (completionModes[track] === "repeat") {
      setTrackCompletion(track, "exact");
      setQuran(key, value);
    }
  }

  function setNoorania(
    key,
    value
  ) {
    setNooraniaForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  /* =====================================================
     Reset
  ===================================================== */

  function resetForms(
    close = true
  ) {
    setEditing(null);

    setCommonForm(
      createCommonForm()
    );

    setQuranForm(
      createQuranForm(
        teacherPreferences.recitation_default_amount_type
      )
    );

    setNooraniaForm(
      createNooraniaForm()
    );

    setPlanSuggestion(null);
    setCompletionModes(createCompletionModes());
    setRangeMetrics({
      lesson: null,


      review: null,
    });

    if (close) {
      setFormOpen(false);
    }
  }

  /* =====================================================
     إنشاء جديد
  ===================================================== */

  function openCreate(
    type
  ) {
    setEditing(null);

    setFormType(type);

    let rememberedHalaqa = "";

    if (
      teacher?.id &&
      teacherPreferences.remember_last_halaqa
    ) {
      try {
        rememberedHalaqa =
          localStorage.getItem(
            `sadiq_teacher_last_halaqa_${teacher.id}`
          ) || "";
      } catch {
        rememberedHalaqa = "";
      }
    }

    const rememberedExists =
      rememberedHalaqa &&
      halaqat.some(
        (item) => String(item.id) === String(rememberedHalaqa)
      );

    const preferredHalaqa =
      rememberedExists
        ? String(rememberedHalaqa)
        : teacherPreferences.default_halaqa_id &&
            halaqat.some(
              (item) =>
                Number(item.id) ===
                Number(teacherPreferences.default_halaqa_id)
            )
          ? String(teacherPreferences.default_halaqa_id)
          : "";

    const defaultHalaqa =
      preferredHalaqa ||
      (halaqat.length === 1
        ? String(
            halaqat[0].id
          )
        : "");

    setCommonForm({
      ...createCommonForm(),

      halaqa_id:
        defaultHalaqa,
    });

    setQuranForm(
      createQuranForm(
        teacherPreferences.recitation_default_amount_type
      )
    );

    setNooraniaForm(
      createNooraniaForm()
    );

    setPlanSuggestion(null);
    setCompletionModes(createCompletionModes());

    setFormOpen(true);
  }

  /* =====================================================
     إجراءات جلسة الحلقة
  ===================================================== */

  async function openSessionStudent(
    sessionRow,
    sessionOverride = null
  ) {
    const session = sessionOverride || activeSession;

    if (!session || !sessionRow) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("recitation_sessions")
      .update({
        current_student_id: Number(sessionRow.student_id),
        last_activity_at: now,
        updated_at: now,
      })
      .eq("id", Number(session.id));

    if (error) throw error;

    setActiveSession((current) =>
      current
        ? {
            ...current,
            current_student_id: Number(sessionRow.student_id),
            last_activity_at: now,
            updated_at: now,
          }
        : current
    );

    setEditing(null);
    setFormType("quran");
    setCommonForm({
      ...createCommonForm(),
      halaqa_id: String(session.halaqa_id),
      student_id: String(sessionRow.student_id),
      recitation_date: session.session_date || getLocalDate(),
    });
    setQuranForm(
      createQuranForm(
        teacherPreferences.recitation_default_amount_type
      )
    );
    setNooraniaForm(createNooraniaForm());
    setPlanSuggestion(null);
    setCompletionModes(createCompletionModes());
    setRangeMetrics({
      lesson: null,


      review: null,
    });
    setFormOpen(true);
  }

  async function resumeActiveSession() {
    if (!activeSession) return;

    const target = currentSessionStudent;

    if (!target) {
      showToast(
        "لا يوجد طلاب متبقون في هذه الجلسة",
        "info"
      );
      return;
    }

    try {
      setSessionBusy(true);
      await openSessionStudent(target);
    } catch (error) {
      console.error("RESUME RECITATION SESSION:", error);
      showToast(
        error.message || "تعذر استئناف جلسة الحلقة",
        "error"
      );
    } finally {
      setSessionBusy(false);
    }
  }

  async function startQuranSession() {
    if (!teacher?.id) {
      showToast("تعذر تحديد حساب المعلم", "error");
      return;
    }

    const halaqaId = Number(
      sessionLauncherHalaqa ||
        (halaqat.length === 1 ? halaqat[0].id : 0)
    );

    if (!halaqaId) {
      showToast("اختر الحلقة لبدء الجلسة", "error");
      return;
    }

    if (!sessionLauncherDate) {
      showToast("حدد تاريخ الجلسة", "error");
      return;
    }

    if (sessionLauncherDate > getLocalDate()) {
      showToast("لا يمكن بدء جلسة بتاريخ مستقبلي", "error");
      return;
    }

    const roster = students
      .filter(
        (student) => Number(student.halaqa_id) === halaqaId
      )
      .slice()
      .sort((a, b) =>
        String(a.full_name || "").localeCompare(
          String(b.full_name || ""),
          "ar"
        )
      );

    if (roster.length === 0) {
      showToast("لا يوجد طلاب نشطون في هذه الحلقة", "error");
      return;
    }

    setSessionBusy(true);

    try {
      const { data: existing, error: existingError } = await supabase
        .from("recitation_sessions")
        .select("*")
        .eq("teacher_id", Number(teacher.id))
        .eq("session_type", "quran")
        .eq("status", "active")
        .order("last_activity_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const loaded = await loadActiveSessionForTeacher(
          teacher.id,
          profiles
        );

        showToast(
          "لديك جلسة قائمة؛ تم فتحها بدل إنشاء جلسة جديدة",
          "info"
        );

        const target =
          loaded?.students?.find(
            (item) =>
              item.status === "pending" &&
              Number(item.student_id) ===
                Number(loaded.session.current_student_id)
          ) ||
          loaded?.students?.find(
            (item) => item.status === "pending"
          );

        if (target) {
          await openSessionStudent(target, loaded.session);
        }

        return;
      }

      const now = new Date().toISOString();

      const { data: session, error: sessionError } = await supabase
        .from("recitation_sessions")
        .insert([
          {
            teacher_id: Number(teacher.id),
            halaqa_id: halaqaId,
            session_date: sessionLauncherDate,
            session_type: "quran",
            status: "active",
            current_student_id: Number(roster[0].id),
            started_at: now,
            last_activity_at: now,
            updated_at: now,
          },
        ])
        .select("*")
        .single();

      if (sessionError) throw sessionError;

      const sessionRows = roster.map((student, index) => ({
        session_id: Number(session.id),
        student_id: Number(student.id),
        position: index + 1,
        status: "pending",
        updated_at: now,
      }));

      const { data: insertedRows, error: rowsError } = await supabase
        .from("recitation_session_students")
        .insert(sessionRows)
        .select("*");

      if (rowsError) {
        await supabase
          .from("recitation_sessions")
          .delete()
          .eq("id", Number(session.id));
        throw rowsError;
      }

      const profileMap = new Map(
        roster.map((student) => [Number(student.id), student])
      );

      const prepared = (insertedRows || [])
        .map((row) => ({
          ...row,
          student_profile:
            profileMap.get(Number(row.student_id)) || null,
        }))
        .sort((a, b) => Number(a.position) - Number(b.position));

      setActiveSession(session);
      setSessionStudents(prepared);

      showToast(
        `بدأت جلسة الحلقة — ${prepared.length} طالب`,
        "success"
      );

      if (prepared[0]) {
        await openSessionStudent(prepared[0], session);
      }
    } catch (error) {
      console.error("START RECITATION SESSION:", error);
      showToast(
        error.message || "تعذر بدء جلسة الحلقة",
        "error"
      );
    } finally {
      setSessionBusy(false);
    }
  }

  async function completeSessionStudent({
    studentId,
    recitationId,
  }) {
    if (
      !activeSession ||
      String(activeSession.halaqa_id) !== String(commonForm.halaqa_id) ||
      String(activeSession.session_date) !== String(commonForm.recitation_date)
    ) {
      return null;
    }

    const currentRow = sessionStudents.find(
      (item) =>
        Number(item.student_id) === Number(studentId) &&
        item.status === "pending"
    );

    if (!currentRow) return null;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("recitation_session_students")
      .update({
        status: "completed",
        quran_recitation_id: Number(recitationId),
        completed_at: now,
        updated_at: now,
      })
      .eq("id", Number(currentRow.id))
      .eq("session_id", Number(activeSession.id));

    if (error) throw error;

    const updatedRows = sessionStudents.map((item) =>
      Number(item.id) === Number(currentRow.id)
        ? {
            ...item,
            status: "completed",
            quran_recitation_id: Number(recitationId),
            completed_at: now,
            updated_at: now,
          }
        : item
    );

    const nextRow =
      updatedRows.find(
        (item) =>
          item.status === "pending" &&
          Number(item.position) > Number(currentRow.position)
      ) ||
      updatedRows.find((item) => item.status === "pending") ||
      null;

    setSessionStudents(updatedRows);

    if (nextRow) {
      const { error: sessionError } = await supabase
        .from("recitation_sessions")
        .update({
          current_student_id: Number(nextRow.student_id),
          last_activity_at: now,
          updated_at: now,
        })
        .eq("id", Number(activeSession.id));

      if (sessionError) throw sessionError;

      setActiveSession((current) =>
        current
          ? {
              ...current,
              current_student_id: Number(nextRow.student_id),
              last_activity_at: now,
              updated_at: now,
            }
          : current
      );

      return { handled: true, nextRow };
    }

    const { error: finishError } = await supabase
      .from("recitation_sessions")
      .update({
        status: "completed",
        current_student_id: null,
        completed_at: now,
        last_activity_at: now,
        updated_at: now,
      })
      .eq("id", Number(activeSession.id));

    if (finishError) throw finishError;

    setActiveSession(null);
    setSessionStudents([]);

    return { handled: true, nextRow: null, completed: true };
  }

  async function markCurrentSessionAbsent() {
    if (!activeSession || !currentSessionStudent) return;

    setSessionBusy(true);

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("recitation_session_students")
        .update({
          status: "absent",
          completed_at: now,
          updated_at: now,
        })
        .eq("id", Number(currentSessionStudent.id))
        .eq("session_id", Number(activeSession.id));

      if (error) throw error;

      const updatedRows = sessionStudents.map((item) =>
        Number(item.id) === Number(currentSessionStudent.id)
          ? {
              ...item,
              status: "absent",
              completed_at: now,
              updated_at: now,
            }
          : item
      );

      const nextRow =
        updatedRows.find(
          (item) =>
            item.status === "pending" &&
            Number(item.position) > Number(currentSessionStudent.position)
        ) ||
        updatedRows.find((item) => item.status === "pending") ||
        null;

      setSessionStudents(updatedRows);

      if (nextRow) {
        const { error: sessionError } = await supabase
          .from("recitation_sessions")
          .update({
            current_student_id: Number(nextRow.student_id),
            last_activity_at: now,
            updated_at: now,
          })
          .eq("id", Number(activeSession.id));

        if (sessionError) throw sessionError;

        setActiveSession((current) =>
          current
            ? {
                ...current,
                current_student_id: Number(nextRow.student_id),
                last_activity_at: now,
                updated_at: now,
              }
            : current
        );

        showToast("تم تسجيل الغياب والانتقال للطالب التالي", "info");
        await openSessionStudent(nextRow);
      } else {
        const { error: finishError } = await supabase
          .from("recitation_sessions")
          .update({
            status: "completed",
            current_student_id: null,
            completed_at: now,
            last_activity_at: now,
            updated_at: now,
          })
          .eq("id", Number(activeSession.id));

        if (finishError) throw finishError;

        setActiveSession(null);
        setSessionStudents([]);
        resetForms();
        showToast("اكتملت جلسة الحلقة", "success");
      }
    } catch (error) {
      console.error("MARK SESSION ABSENT:", error);
      showToast(
        error.message || "تعذر تسجيل غياب الطالب",
        "error"
      );
    } finally {
      setSessionBusy(false);
    }
  }

  /* =====================================================
     تعديل سجل قرآن قديم أو جديد
  ===================================================== */

  function editQuranRecord(
    record
  ) {
    setFormType(
      "quran"
    );

    setEditing({
      type: "quran",
      id: record.id,
    });

    setCommonForm({
      halaqa_id:
        String(
          record.halaqa_id
        ),

      student_id:
        String(
          record.student_id
        ),

      recitation_date:
        record.recitation_date ||
        getLocalDate(),

      notes:
        record.notes || "",
    });

    const sideAmount = storedSideLesson(record, "quran");
    setQuranForm({
      side_lesson_faces: sideAmount.faces || "",
      side_lesson_lines: sideAmount.lines || "",
      side_amount_changed: false,
      from_surah:
        record.from_surah ||
        "",

      from_ayah:
        valueToString(
          record.from_ayah
        ),

      to_surah:
        record.to_surah ||
        "",

      to_ayah:
        valueToString(
          record.to_ayah
        ),

      lesson_evaluation:
        record.lesson_evaluation ||
        "",

      lesson_amount_type:
        record.lesson_amount_type ||
        "",

      lesson_amount_value:
        record.lesson_amount_value ??
        legacyLessonAmount(
          record.lesson_amount_type
        ).amount,

      lesson_amount_unit:
        record.lesson_amount_unit ||
        legacyLessonAmount(
          record.lesson_amount_type
        ).unit,

      next_surah:
        record.next_surah ||
        "",

      next_from_ayah:
        valueToString(
          record.next_from_ayah
        ),

      next_to_surah:
        record.next_to_surah ||
        "",

      next_to_ayah:
        valueToString(
          record.next_to_ayah
        ),

      next_evaluation:
        record.next_evaluation ||
        "",

      next2_surah:
        record.next2_surah ||
        "",

      next2_from_ayah:
        valueToString(
          record.next2_from_ayah
        ),

      next2_to_surah:
        record.next2_to_surah ||
        "",

      next2_to_ayah:
        valueToString(
          record.next2_to_ayah
        ),

      next2_evaluation:
        record.next2_evaluation ||
        "",

      review_surah:
        record.review_surah ||
        "",

      review_from_ayah:
        valueToString(
          record.review_from_ayah
        ),

      review_to_surah:
        record.review_to_surah ||
        "",

      review_to_ayah:
        valueToString(
          record.review_to_ayah
        ),

      review_evaluation:
        record.review_evaluation ||
        "",

      review_faces:
        valueToString(
          record.review_faces
        ),
    });

    setPlanSuggestion(null);
    setCompletionModes({
      lesson: record.lesson_evaluation === "إعادة" ? "repeat" : "exact",
      review: record.review_evaluation === "إعادة" ? "repeat" : "exact",
    });

    setFormOpen(true);
  }

  /* =====================================================
     تعديل سجل نورانية
  ===================================================== */

  function editNooraniaRecord(
    record
  ) {
    setFormType(
      "noorania"
    );

    setEditing({
      type:
        "noorania",

      id:
        record.id,
    });

    setCommonForm({
      halaqa_id:
        String(
          record.halaqa_id
        ),

      student_id:
        String(
          record.student_id
        ),

      recitation_date:
        record.recitation_date ||
        getLocalDate(),

      notes:
        record.notes || "",
    });

    const sideAmount = storedSideLesson(record, "noorania");
    setNooraniaForm({
      side_lesson_faces: sideAmount.faces || "",
      side_lesson_lines: sideAmount.lines || "",
      side_amount_changed: false,
      lesson:
        record.lesson || "",

      lesson_evaluation:
        record.lesson_evaluation ||
        "",

      lesson_faces:
        valueToString(
          record.lesson_amount_value ?? record.lesson_faces
        ),

      lesson_unit:
        record.lesson_amount_unit || "faces",

      side_lesson:
        record.side_lesson ||
        "",

      side_lesson_evaluation:
        record.side_lesson_evaluation ||
        "",

      revision:
        record.revision ||
        "",

      revision_evaluation:
        record.revision_evaluation ||
        "",

      revision_faces:
        valueToString(
          record.revision_amount_value ?? record.revision_faces
        ),

      revision_unit:
        record.revision_amount_unit || "faces",
    });

    setPlanSuggestion(null);

    setFormOpen(true);
  }

  /* =====================================================
     Validation Common
  ===================================================== */

  function validateCommon() {
    if (!teacher?.id) {
      showToast(
        "تعذر تحديد حساب المعلم",
        "error"
      );

      return false;
    }

    if (
      !commonForm.halaqa_id
    ) {
      showToast(
        "اختر الحلقة",
        "error"
      );

      return false;
    }

    const allowed =
      halaqat.some(
        (halaqa) =>
          Number(
            halaqa.id
          ) ===
          Number(
            commonForm.halaqa_id
          )
      );

    if (!allowed) {
      showToast(
        "الحلقة ليست ضمن حلقاتك",
        "error"
      );

      return false;
    }

    if (
      !commonForm.student_id
    ) {
      showToast(
        "اختر الطالب",
        "error"
      );

      return false;
    }

    if (
      !commonForm.recitation_date
    ) {
      showToast(
        "حدد تاريخ التسميع",
        "error"
      );

      return false;
    }

    if (
      commonForm.recitation_date >
      getLocalDate()
    ) {
      showToast(
        "لا يمكن تسجيل تسميع بتاريخ مستقبلي",
        "error"
      );

      return false;
    }

    return true;
  }

  /* =====================================================
     SAVE
  ===================================================== */

  async function saveRecord() {
    if (
      !validateCommon()
    ) {
      return;
    }

    if (
      formType === "quran"
    ) {
      await saveQuran();
    } else {
      await saveNoorania();
    }
  }

  async function getQuranPositionInfo(
    surah,
    ayah
  ) {
    if (!surah || !ayah) {
      return null;
    }

    const { data, error } = await supabase.rpc(
      "quran_position_info",
      {
        p_surah: surah,
        p_ayah: Number(ayah),
      }
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data)
      ? data[0] || null
      : data || null;
  }

  async function normalizeQuranPositionToCycle({
    surah,
    ayah,
    direction = "forward",
    cycleBounds = null,
  }) {
    if (
      !surah ||
      !ayah ||
      !cycleBounds?.startSurah ||
      !cycleBounds?.startAyah ||
      !cycleBounds?.endSurah ||
      !cycleBounds?.endAyah
    ) {
      return surah && ayah
        ? { surah, ayah: Number(ayah) }
        : null;
    }

    const [position, cycleStart, cycleEnd] =
      await Promise.all([
        getQuranPositionInfo(surah, ayah),
        getQuranPositionInfo(
          cycleBounds.startSurah,
          cycleBounds.startAyah
        ),
        getQuranPositionInfo(
          cycleBounds.endSurah,
          cycleBounds.endAyah
        ),
      ]);

    if (!position || !cycleStart || !cycleEnd) {
      return {
        surah: cycleBounds.startSurah,
        ayah: Number(cycleBounds.startAyah),
      };
    }

    const normalizedDirection =
      normalizeQuranPlanDirection(direction);

    const inCycle =
      normalizedDirection === "backward"
        ? (
            Number(position.surah_no) <=
              Number(cycleStart.surah_no) &&
            Number(position.surah_no) >=
              Number(cycleEnd.surah_no) &&
            (
              Number(position.surah_no) !==
                Number(cycleStart.surah_no) ||
              Number(position.ayah) >=
                Number(cycleStart.ayah)
            ) &&
            (
              Number(position.surah_no) !==
                Number(cycleEnd.surah_no) ||
              Number(position.ayah) <=
                Number(cycleEnd.ayah)
            )
          )
        : (
            Number(position.source_id) >=
              Number(cycleStart.source_id) &&
            Number(position.source_id) <=
              Number(cycleEnd.source_id)
          );

    return inCycle
      ? {
          surah: position.surah_name,
          ayah: Number(position.ayah),
        }
      : {
          surah: cycleBounds.startSurah,
          ayah: Number(cycleBounds.startAyah),
        };
  }

  async function getQuranRangeMetrics(
    fromSurah,
    fromAyah,
    toSurah,
    toAyah
  ) {
    if (!hasCompleteQuranRange(
      fromSurah,
      fromAyah,
      toSurah,
      toAyah
    )) {
      return null;
    }

    const [startInfo, endInfo] =
      await Promise.all([
        getQuranPositionInfo(fromSurah, fromAyah),
        getQuranPositionInfo(toSurah, toAyah),
      ]);

    if (!startInfo || !endInfo) {
      return null;
    }

    const rpcName =
      Number(startInfo.source_id) >
      Number(endInfo.source_id)
        ? "quran_reverse_surah_range_metrics"
        : "quran_range_metrics";

    const { data, error } = await supabase.rpc(
      rpcName,
      {
        p_from_surah: fromSurah,
        p_from_ayah: Number(fromAyah),
        p_to_surah: toSurah,
        p_to_ayah: Number(toAyah),
      }
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data)
      ? data[0] || null
      : data || null;
  }

  async function getNextQuranPosition(
    surah,
    ayah,
    direction = "forward"
  ) {
    if (!surah || !ayah) {
      return null;
    }

    const rpcName =
      normalizeQuranPlanDirection(direction) === "backward"
        ? "quran_next_reverse_surah_position"
        : "quran_next_ayah";

    const { data, error } = await supabase.rpc(
      rpcName,
      {
        p_surah: surah,
        p_ayah: Number(ayah),
      }
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data)
      ? data[0] || null
      : data || null;
  }



  async function generateQuranAssignmentRange({
    startSurah,
    startAyah,
    amount,
    unit,
    limitSurah,
    limitAyah,
    direction = "forward",
  }) {
    if (
      !startSurah ||
      !startAyah ||
      !limitSurah ||
      !limitAyah ||
      Number(amount || 0) <= 0
    ) {
      return null;
    }

    const rpcName =
      normalizeQuranPlanDirection(direction) === "backward"
        ? "quran_generate_reverse_bounded_assignment_v1"
        : "quran_generate_assignment";

    const { data, error } = await supabase.rpc(
      rpcName,
      {
        p_start_surah: startSurah,
        p_start_ayah: Number(startAyah),
        p_target_amount: Number(amount),
        p_target_unit: unit || "lines",
        p_limit_surah: limitSurah,
        p_limit_ayah: Number(limitAyah),
      }
    );

    if (error) {
      const message = String(error.message || "");

      if (
        message.includes("QURAN_LIMIT_BEFORE_START") ||
        message.includes("QURAN_REVERSE_LIMIT_NOT_AFTER_ROUTE_START")
      ) {
        return null;
      }

      throw error;
    }

    return Array.isArray(data)
      ? data[0] || null
      : data || null;
  }

  function decorateCyclicAssignment(generated, cycleBounds) {
    if (!generated) return null;

    const wraps = Number(generated.wrap_count || 0);
    const segments = [];

    if (wraps > 0) {
      segments.push({
        kind: "finish_cycle",
        label: "إكمال الدورة الحالية",
        fromSurah: generated.start_surah_name,
        fromAyah: Number(generated.start_ayah),
        toSurah: cycleBounds.endSurah,
        toAyah: Number(cycleBounds.endAyah),
      });

      if (wraps > 1) {
        segments.push({
          kind: "full_cycles",
          label: `${wraps - 1} دورة كاملة إضافية`,
          fromSurah: cycleBounds.startSurah,
          fromAyah: Number(cycleBounds.startAyah),
          toSurah: cycleBounds.endSurah,
          toAyah: Number(cycleBounds.endAyah),
          repeatCount: wraps - 1,
        });
      }

      segments.push({
        kind: "after_wrap",
        label: "ثم بعد اللفة",
        fromSurah: cycleBounds.startSurah,
        fromAyah: Number(cycleBounds.startAyah),
        toSurah: generated.end_surah_name,
        toAyah: Number(generated.end_ayah),
      });
    }

    return {
      ...generated,
      route_segments: segments,
      cycle_bounds: cycleBounds,
    };
  }

  async function generateCyclicQuranAssignmentRange({
    startSurah,
    startAyah,
    amount,
    unit,
    direction = "forward",
    cycleBounds,
  }) {
    if (
      !startSurah ||
      !startAyah ||
      Number(amount || 0) <= 0 ||
      !cycleBounds?.startSurah ||
      !cycleBounds?.startAyah ||
      !cycleBounds?.endSurah ||
      !cycleBounds?.endAyah
    ) {
      return null;
    }

    const { data, error } = await supabase.rpc(
      "quran_generate_cyclic_assignment",
      {
        p_start_surah: startSurah,
        p_start_ayah: Number(startAyah),
        p_cycle_start_surah: cycleBounds.startSurah,
        p_cycle_start_ayah: Number(cycleBounds.startAyah),
        p_cycle_end_surah: cycleBounds.endSurah,
        p_cycle_end_ayah: Number(cycleBounds.endAyah),
        p_direction: normalizeQuranPlanDirection(direction),
        p_target_amount: Number(amount),
        p_target_unit: unit || "lines",
      }
    );

    if (error) throw error;

    const generated = Array.isArray(data)
      ? data[0] || null
      : data || null;

    return decorateCyclicAssignment(
      generated ? { ...generated, direction: normalizeQuranPlanDirection(direction) } : null,
      cycleBounds
    );
  }

  async function resolveGeneratedCompletion({
    track,
    generated,
    actualEndSurah,
    actualEndAyah,
    evaluation,
    direction = "forward",
  }) {
    if (!generated) {
      return evaluation === "إعادة"
        ? "repeat"
        : "exact";
    }

    if (evaluation === "إعادة") {
      return "repeat";
    }

    const [
      plannedStart,
      plannedEnd,
      actualEnd,
    ] = await Promise.all([
      getQuranPositionInfo(
        generated.start_surah_name,
        generated.start_ayah
      ),
      getQuranPositionInfo(
        generated.end_surah_name,
        generated.end_ayah
      ),
      getQuranPositionInfo(
        actualEndSurah,
        actualEndAyah
      ),
    ]);

    if (!plannedStart || !plannedEnd || !actualEnd) {
      throw new Error(
        "تعذر التحقق من موضع النهاية الفعلية في المصحف"
      );
    }

    const normalizedDirection =
      normalizeQuranPlanDirection(direction);

    const selected =
      completionModes[track] || "exact";

    const plannedEndMatchesActual =
      Number(plannedEnd.source_id || 0) ===
      Number(actualEnd.source_id || 0);

    if (Number(generated?.wrap_count || 0) > 0) {
      if (plannedEndMatchesActual) {
        if (selected === "under" || selected === "over") {
          throw new Error(
            selected === "under"
              ? "اختر نهاية فعلية قبل نهاية المطلوب لأنك حددت «أقل»"
              : "اختر نهاية فعلية بعد نهاية المطلوب لأنك حددت «أكثر»"
          );
        }

        return "exact";
      }

      if (selected === "under" || selected === "over") {
        return selected;
      }

      throw new Error(
        "في حالة «أتم» يجب أن تكون النهاية الفعلية هي نهاية المطلوب بعد إكمال اللفة"
      );
    }

    const compareRoute = (left, right) => {
      if (normalizedDirection === "backward") {
        const leftSurah = Number(left.surah_no || 0);
        const rightSurah = Number(right.surah_no || 0);

        if (leftSurah !== rightSurah) {
          return leftSurah > rightSurah ? -1 : 1;
        }

        const leftAyah = Number(left.ayah || 0);
        const rightAyah = Number(right.ayah || 0);

        if (leftAyah === rightAyah) return 0;
        return leftAyah < rightAyah ? -1 : 1;
      }

      const leftSource = Number(left.source_id || 0);
      const rightSource = Number(right.source_id || 0);

      if (leftSource === rightSource) return 0;
      return leftSource < rightSource ? -1 : 1;
    };

    if (compareRoute(actualEnd, plannedStart) < 0) {
      throw new Error(
        "النهاية الفعلية لا يمكن أن تكون قبل بداية المطلوب"
      );
    }

    const actualVsPlannedEnd =
      compareRoute(actualEnd, plannedEnd);

    const derived =
      actualVsPlannedEnd === 0
        ? "exact"
        : actualVsPlannedEnd < 0
          ? "under"
          : "over";

    if (
      selected === "under" &&
      derived !== "under"
    ) {
      throw new Error(
        "اختر نهاية فعلية قبل نهاية المطلوب لأنك حددت «أقل»"
      );
    }

    if (
      selected === "over" &&
      derived !== "over"
    ) {
      throw new Error(
        "اختر نهاية فعلية بعد نهاية المطلوب لأنك حددت «أكثر»"
      );
    }

    if (
      selected === "exact" &&
      derived !== "exact"
    ) {
      throw new Error(
        "في حالة «أتم» يجب أن تكون النهاية الفعلية هي نهاية المطلوب"
      );
    }

    return derived;
  }



  async function buildRecitationSegment({
    recitationRecord,
    segmentType,
    sequenceNo = 1,
    actualRange,
    plannedRange = null,
    plannedAmount = null,
    plannedUnit = null,
    evaluation = "",
    completionStatus = "exact",
  }) {
    if (
      !hasCompleteQuranRange(
        actualRange?.fromSurah,
        actualRange?.fromAyah,
        actualRange?.toSurah,
        actualRange?.toAyah
      )
    ) {
      return null;
    }

    const effectivePlanned =
      plannedRange || {
        start_surah_name: actualRange.fromSurah,
        start_ayah: Number(actualRange.fromAyah),
        end_surah_name: actualRange.toSurah,
        end_ayah: Number(actualRange.toAyah),
      };

    const [
      plannedStart,
      plannedEnd,
      actualStart,
      actualEnd,
      actualMetrics,
    ] = await Promise.all([
      getQuranPositionInfo(
        effectivePlanned.start_surah_name,
        effectivePlanned.start_ayah
      ),
      getQuranPositionInfo(
        effectivePlanned.end_surah_name,
        effectivePlanned.end_ayah
      ),
      getQuranPositionInfo(
        actualRange.fromSurah,
        actualRange.fromAyah
      ),
      getQuranPositionInfo(
        actualRange.toSurah,
        actualRange.toAyah
      ),
       Number(effectivePlanned?.wrap_count || 0) > 0 &&
      completionStatus === "exact" &&
      String(actualRange.toSurah || "").trim() ===
        String(effectivePlanned.end_surah_name || "").trim() &&
      Number(actualRange.toAyah || 0) ===
        Number(effectivePlanned.end_ayah || 0)
        ? Promise.resolve({
            quran_lines: Number(effectivePlanned.quran_lines || 0),
            faces: Number(effectivePlanned.faces || 0),
          })
        : getQuranRangeMetrics(
            actualRange.fromSurah,
            actualRange.fromAyah,
            actualRange.toSurah,
            actualRange.toAyah
          ),
    ]);

    if (
      !plannedStart ||
      !plannedEnd ||
      !actualStart ||
      !actualEnd ||
      !actualMetrics
    ) {
      throw new Error(
        "تعذر بناء مقطع التسميع من بيانات المصحف"
      );
    }

    return {
      recitation_id: Number(recitationRecord.id),
      assignment_id: null,
      student_id: Number(recitationRecord.student_id),
      halaqa_id: Number(recitationRecord.halaqa_id),
      teacher_id: recitationRecord.teacher_id
        ? Number(recitationRecord.teacher_id)
        : teacher?.id || null,
      segment_type: segmentType,
      sequence_no: Number(sequenceNo),

      planned_start_word_id: null,
      planned_end_word_id: null,
      actual_start_word_id: null,
      actual_end_word_id: null,

      planned_start_ayah_id: Number(plannedStart.ayah_id),
      planned_end_ayah_id: Number(plannedEnd.ayah_id),
      actual_start_ayah_id: Number(actualStart.ayah_id),
      actual_end_ayah_id: Number(actualEnd.ayah_id),

      planned_amount:
        plannedAmount === null ||
        plannedAmount === undefined ||
        plannedAmount === ""
          ? null
          : Number(plannedAmount),

      planned_unit:
        plannedUnit || null,

      actual_quran_lines:
        Number(actualMetrics.quran_lines || 0),

      actual_faces:
        Number(actualMetrics.faces || 0),

      evaluation:
        textOrNull(evaluation),

      completion_status:
        completionStatus,
    };
  }

  async function buildNextAssignment({
    recitationRecord,
    segmentType,
    sequenceNo,
    generatedRange,
    actualEndSurah,
    actualEndAyah,
    completionStatus,
    amount,
    unit,
    planEndSurah,
    planEndAyah,
    direction = "forward",
    cycleBounds = null,
    interventionId = null,
    source = "generated",
  }) {
    if (
      !planSuggestion?.id ||
      !generatedRange ||
      Number(amount || 0) <= 0
    ) {
      return null;
    }

    let nextRange = null;

    if (completionStatus === "repeat") {
      nextRange = generatedRange;
    } else {
      const reachedCycleEnd =
        cycleBounds &&
        String(actualEndSurah || "").trim() ===
          String(cycleBounds.endSurah || "").trim() &&
        Number(actualEndAyah || 0) ===
          Number(cycleBounds.endAyah || 0);

      let nextStart = reachedCycleEnd
        ? {
            surah_name: cycleBounds.startSurah,
            ayah: Number(cycleBounds.startAyah),
          }
        : await getNextQuranPosition(
            actualEndSurah,
            actualEndAyah,
            direction
          );

      if (!nextStart) {
        return null;
      }

      if (cycleBounds) {
        const normalizedCycleStart =
          await normalizeQuranPositionToCycle({
            surah: nextStart.surah_name,
            ayah: nextStart.ayah,
            direction,
            cycleBounds,
          });

        nextStart = {
          surah_name:
            normalizedCycleStart?.surah ||
            cycleBounds.startSurah,
          ayah:
            normalizedCycleStart?.ayah ||
            Number(cycleBounds.startAyah),
        };
      }

      nextRange = cycleBounds
        ? await generateCyclicQuranAssignmentRange({
            startSurah: nextStart.surah_name,
            startAyah: nextStart.ayah,
            amount,
            unit,
            direction,
            cycleBounds,
          })
        : await generateQuranAssignmentRange({
            startSurah: nextStart.surah_name,
            startAyah: nextStart.ayah,
            amount,
            unit,
            limitSurah: planEndSurah,
            limitAyah: planEndAyah,
            direction,
          });
    }

    if (!nextRange) {
      return null;
    }

    const [startPosition, endPosition] =
      await Promise.all([
        getQuranPositionInfo(
          nextRange.start_surah_name,
          nextRange.start_ayah
        ),
        getQuranPositionInfo(
          nextRange.end_surah_name,
          nextRange.end_ayah
        ),
      ]);

    if (!startPosition || !endPosition) {
      throw new Error(
        "تعذر تجهيز موضع المطلوب القادم"
      );
    }

    return {
      student_id: Number(recitationRecord.student_id),
      halaqa_id: Number(recitationRecord.halaqa_id),
      teacher_id: recitationRecord.teacher_id
        ? Number(recitationRecord.teacher_id)
        : teacher?.id || null,
      monthly_plan_id: Number(planSuggestion.id),
      intervention_id:
        interventionId ? Number(interventionId) : null,
      generated_from_recitation_id:
        Number(recitationRecord.id),
      assignment_date:
        getNextScheduledRecitationDate(
          recitationRecord.recitation_date,
          planSuggestion.days
        ),
      segment_type: segmentType,
      sequence_no: Number(sequenceNo),
      start_word_id: null,
      end_word_id: null,
      start_ayah_id: Number(startPosition.ayah_id),
      end_ayah_id: Number(endPosition.ayah_id),
      target_amount: Number(amount),
      target_unit: unit,
      source,
      status: "planned",
      generated_reason:
        completionStatus === "repeat"
          ? "إعادة نفس المطلوب بحسب نتيجة الجلسة السابقة"
          : completionStatus === "under"
            ? "متابعة من آخر موضع فعلي بعد إنجاز أقل من المطلوب"
            : completionStatus === "over"
              ? "متابعة بعد آخر موضع فعلي لأن الطالب تجاوز المطلوب"
              : "توليد تلقائي بعد إتمام المطلوب",
      _range: nextRange,
    };
  }



  async function syncQuranEngineAfterSave(
    recitationRecord
  ) {
    const generatedLesson =
      planSuggestion?.generatedLesson || null;



    const generatedReview =
      planSuggestion?.generatedReview || null;

    const lessonCompletion =
      hasCompleteQuranRange(
        recitationRecord.from_surah,
        recitationRecord.from_ayah,
        recitationRecord.to_surah,
        recitationRecord.to_ayah
      )
        ? await resolveGeneratedCompletion({
            track: "lesson",
            generated: generatedLesson,
            actualEndSurah: recitationRecord.to_surah,
            actualEndAyah: recitationRecord.to_ayah,
            evaluation: recitationRecord.lesson_evaluation,
            direction: planSuggestion?.memorization_direction,
          })
        : null;



    const reviewCompletion =
      hasCompleteQuranRange(
        recitationRecord.review_surah,
        recitationRecord.review_from_ayah,
        recitationRecord.review_to_surah,
        recitationRecord.review_to_ayah
      )
        ? await resolveGeneratedCompletion({
            track: "review",
            generated: generatedReview,
            actualEndSurah: recitationRecord.review_to_surah,
            actualEndAyah: recitationRecord.review_to_ayah,
            evaluation: recitationRecord.review_evaluation,
            direction: planSuggestion?.revision_direction,
          })
        : null;

    const segmentRows = (
      await Promise.all([
        buildRecitationSegment({
          recitationRecord,
          segmentType: "lesson",
          sequenceNo: 1,
          actualRange: {
            fromSurah: recitationRecord.from_surah,
            fromAyah: recitationRecord.from_ayah,
            toSurah: recitationRecord.to_surah,
            toAyah: recitationRecord.to_ayah,
          },
          plannedRange: generatedLesson,
          plannedAmount:
            planSuggestion?.memorizationAmount ?? null,
          plannedUnit:
            planSuggestion?.memorizationUnit ?? null,
          evaluation:
            recitationRecord.lesson_evaluation,
          completionStatus:
            lessonCompletion || "exact",
        }),





        buildRecitationSegment({
          recitationRecord,
          segmentType:
            planSuggestion?.reviewSegmentType || "revision",
          sequenceNo: 1,
          actualRange: {
            fromSurah: recitationRecord.review_surah,
            fromAyah: recitationRecord.review_from_ayah,
            toSurah: recitationRecord.review_to_surah,
            toAyah: recitationRecord.review_to_ayah,
          },
          plannedRange: generatedReview,
          plannedAmount:
            planSuggestion?.revisionAmount ?? null,
          plannedUnit:
            planSuggestion?.revisionUnit ?? null,
          evaluation:
            recitationRecord.review_evaluation,
          completionStatus:
            reviewCompletion || "exact",
        }),
      ])
    ).filter(Boolean);

    const { error: deleteSegmentsError } =
      await supabase
        .from("recitation_segments")
        .delete()
        .eq(
          "recitation_id",
          Number(recitationRecord.id)
        ).neq("segment_type", "side_lesson");

    if (deleteSegmentsError) {
      throw deleteSegmentsError;
    }

    if (segmentRows.length > 0) {
      const { error: segmentsError } =
        await supabase
          .from("recitation_segments")
          .insert(segmentRows);

      if (segmentsError) {
        throw segmentsError;
      }
    }

    const { error: clearGeneratedError } =
      await supabase
        .from("quran_assignments")
        .delete()
        .eq(
          "generated_from_recitation_id",
          Number(recitationRecord.id)
        );

    if (clearGeneratedError) {
      throw clearGeneratedError;
    }

    if (!planSuggestion?.id) {
      return null;
    }

    const nextLesson =
      lessonCompletion
        ? await buildNextAssignment({
            recitationRecord,
            segmentType: "lesson",
            sequenceNo: 1,
            generatedRange: generatedLesson,
            actualEndSurah:
              recitationRecord.to_surah,
            actualEndAyah:
              recitationRecord.to_ayah,
            completionStatus:
              lessonCompletion,
            amount:
              planSuggestion.memorizationAmount,
            unit:
              planSuggestion.memorizationUnit,
            planEndSurah:
              planSuggestion.memorization_to_surah,
            planEndAyah:
              planSuggestion.memorization_to_ayah,
            direction:
              planSuggestion.memorization_direction,
            interventionId:
              planSuggestion?.activeIntervention?.id || null,
            source:
              planSuggestion?.activeIntervention
                ? "intervention"
                : "generated",
          })
        : null;

    const nextReview =
      reviewCompletion
        ? await buildNextAssignment({
            recitationRecord,
            segmentType:
              planSuggestion?.reviewSegmentType || "revision",
            sequenceNo: 1,
            generatedRange: generatedReview,
            actualEndSurah:
              recitationRecord.review_to_surah,
            actualEndAyah:
              recitationRecord.review_to_ayah,
            completionStatus:
              reviewCompletion,
            amount:
              planSuggestion.revisionAmount,
            unit:
              planSuggestion.revisionUnit,
            planEndSurah:
              planSuggestion.revision_to_surah,
            planEndAyah:
              planSuggestion.revision_to_ayah,
            direction:
              planSuggestion.revision_direction,
            cycleBounds:
              planSuggestion.revisionCycleBounds || null,
            interventionId:
              planSuggestion?.activeIntervention?.id || null,
            source:
              planSuggestion?.activeIntervention
                ? "intervention"
                : "generated",
          })
        : null;



    const assignmentRows = [
      nextLesson,
      nextReview,
    ].filter(Boolean);

    const refreshTargets = [
      generatedLesson && lessonCompletion
        ? {
            segment_type: "lesson",
            sequence_no: 1,
          }
        : null,



      generatedReview && reviewCompletion
        ? {
            segment_type:
              planSuggestion?.reviewSegmentType || "revision",
            sequence_no: 1,
          }
        : null,
    ].filter(Boolean);

    for (const target of refreshTargets) {
      const { error: supersedeError } =
        await supabase
          .from("quran_assignments")
          .update({
            status: "superseded",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "student_id",
            Number(recitationRecord.student_id)
          )
          .eq(
            "halaqa_id",
            Number(recitationRecord.halaqa_id)
          )
          .eq(
            "monthly_plan_id",
            Number(planSuggestion.id)
          )
          .eq(
            "segment_type",
            target.segment_type
          )
          .eq(
            "sequence_no",
            target.sequence_no
          )
          .in("source", ["generated", "intervention"])
          .eq("status", "planned")
          .neq(
            "generated_from_recitation_id",
            Number(recitationRecord.id)
          );

      if (supersedeError) {
        throw supersedeError;
      }
    }

    if (assignmentRows.length > 0) {
      const rowsToInsert =
        assignmentRows.map(
          ({ _range, ...row }) => row
        );

      const { error: assignmentsError } =
        await supabase
          .from("quran_assignments")
          .insert(rowsToInsert);

      if (assignmentsError) {
        throw assignmentsError;
      }
    }

    const preview = {
      date:
        assignmentRows[0]?.assignment_date ||
        null,
      lesson:
        nextLesson?._range || null,

      review:
        nextReview?._range || null,
      lessonCompletion,

      reviewCompletion,
    };


    return preview;
  }

  /* =====================================================
     SAVE QURAN
  ===================================================== */

  async function saveQuran() {
    const original = editing?.type === "quran" ? quranRecords.find(row => Number(row.id) === Number(editing.id)) : null;
    const preserveSide = original && !quranForm.side_amount_changed && !storedSideLesson(original).manual;
    const lessonComplete = hasCompleteQuranRange(quranForm.from_surah,quranForm.from_ayah,quranForm.to_surah,quranForm.to_ayah);
    const lessonPartial = hasAnyQuranRange(quranForm.from_surah,quranForm.from_ayah,quranForm.to_surah,quranForm.to_ayah);
    const reviewComplete = hasCompleteQuranRange(quranForm.review_surah,quranForm.review_from_ayah,quranForm.review_to_surah,quranForm.review_to_ayah);
    const reviewPartial = hasAnyQuranRange(quranForm.review_surah,quranForm.review_from_ayah,quranForm.review_to_surah,quranForm.review_to_ayah);
    try {
      const side = preserveSide ? storedSideLesson(original) : validateSideLesson(quranForm.side_lesson_faces,quranForm.side_lesson_lines,quranForm.next_evaluation);
      const oldLesson = editing && !lessonPartial && (Number(quranForm.lesson_amount_value || 0)>0 || quranForm.lesson_amount_type);
      const oldReview = editing && !reviewPartial && Number(quranForm.review_faces || 0)>0;
      if (!lessonComplete && !oldLesson && !reviewComplete && !oldReview && !side.totalLines && !(preserveSide && (original.next_surah || original.next2_surah))) throw new Error("سجل الدرس أو مقدار جنب الدرس أو المراجعة أولًا.");
      if (lessonPartial && !lessonComplete) throw new Error("أكمل نطاق الدرس: من سورة وآية إلى سورة وآية.");
      if (lessonComplete && !quranForm.lesson_evaluation) throw new Error("حدد تقييم الدرس.");
      if (reviewPartial && !reviewComplete) throw new Error("أكمل نطاق المراجعة: من سورة وآية إلى سورة وآية.");
      if (reviewComplete && !quranForm.review_evaluation) throw new Error("حدد تقييم المراجعة.");
      if (lessonComplete && planSuggestion?.generatedLesson) await resolveGeneratedCompletion({track:"lesson",generated:planSuggestion.generatedLesson,
        actualEndSurah:quranForm.to_surah,actualEndAyah:quranForm.to_ayah,evaluation:quranForm.lesson_evaluation,direction:planSuggestion.memorization_direction});
      if (reviewComplete && planSuggestion?.generatedReview) await resolveGeneratedCompletion({track:"review",generated:planSuggestion.generatedReview,
        actualEndSurah:quranForm.review_to_surah,actualEndAyah:quranForm.review_to_ayah,evaluation:quranForm.review_evaluation,direction:planSuggestion.revision_direction});
      setSaving(true);
      const payload = {
        student_id:Number(commonForm.student_id),halaqa_id:Number(commonForm.halaqa_id),teacher_id:teacher.id,recitation_date:commonForm.recitation_date,
        from_surah:textOrNull(quranForm.from_surah),from_ayah:numberOrNull(quranForm.from_ayah),to_surah:textOrNull(quranForm.to_surah),to_ayah:numberOrNull(quranForm.to_ayah),
        lesson_evaluation:textOrNull(quranForm.lesson_evaluation),lesson_amount_type:lessonComplete?null:textOrNull(quranForm.lesson_amount_type),
        lesson_amount_value:lessonComplete?null:numberOrNull(quranForm.lesson_amount_value),lesson_amount_unit:lessonComplete?null:textOrNull(quranForm.lesson_amount_unit),
        lesson_faces_manual:lessonComplete?null:(Number(quranForm.lesson_amount_value||0)>0?(quranForm.lesson_amount_unit==="lines"?Number(quranForm.lesson_amount_value)/15:Number(quranForm.lesson_amount_value)):null),
        ...sideLessonPayload({original,changed:quranForm.side_amount_changed,faces:quranForm.side_lesson_faces,lines:quranForm.side_lesson_lines,evaluation:quranForm.next_evaluation}),
        review_surah:textOrNull(quranForm.review_surah),review_from_ayah:numberOrNull(quranForm.review_from_ayah),review_to_surah:textOrNull(quranForm.review_to_surah),review_to_ayah:numberOrNull(quranForm.review_to_ayah),
        review_evaluation:textOrNull(quranForm.review_evaluation),review_faces:reviewComplete?null:numberOrNull(quranForm.review_faces),notes:textOrNull(commonForm.notes),points:quranPoints,
      };
      await saveToTable({table:"recitations",type:"quran",payload,points:quranPoints,reason:"تسميع القرآن",afterPersist:syncQuranEngineAfterSave});
    } catch (error) { showToast(error.message || "تعذر حفظ التسميع","error"); }
    finally { setSaving(false); }
  }

  /* =====================================================
     SAVE NOORANIA
  ===================================================== */

  async function saveNoorania() {
    const original = editing?.type === "noorania" ? nooraniaRecords.find(row=>Number(row.id)===Number(editing.id)) : null;
    const preserveSide = original && !nooraniaForm.side_amount_changed && !storedSideLesson(original,"noorania").manual;
    try { if (!preserveSide) validateSideLesson(nooraniaForm.side_lesson_faces,nooraniaForm.side_lesson_lines,nooraniaForm.side_lesson_evaluation,10); }
    catch(error){showToast(error.message,"error");return;}
    if (!nooraniaForm.lesson.trim() && !nooraniaForm.revision.trim() && !storedSideLesson({...nooraniaForm},"noorania").totalLines && !(preserveSide && original.side_lesson)) { showToast("سجل الدرس أو مقدار جنب الدرس أو المراجعة أولًا.","error");return; }

    if (
      nooraniaForm.lesson.trim() && !nooraniaForm
        .lesson_evaluation
    ) {
      showToast(
        "حدد تقييم الدرس",
        "error"
      );

      return;
    }

    if (nooraniaForm.lesson.trim() && (nooraniaForm.lesson_faces === "" || Number(nooraniaForm.lesson_faces) < 0)) {
      showToast(
        "أدخل مقدار تسميع الدرس",
        "error"
      );

      return;
    }

    if (
      !preserveSide && (Number(nooraniaForm.side_lesson_faces || 0) > 0 || Number(nooraniaForm.side_lesson_lines || 0) > 0) &&
      !nooraniaForm
        .side_lesson_evaluation
    ) {
      showToast(
        "حدد تقييم جنب الدرس",
        "error"
      );

      return;
    }

    if (
      nooraniaForm
        .revision
        .trim()
    ) {
      if (
        !nooraniaForm
          .revision_evaluation
      ) {
        showToast(
          "حدد تقييم المراجعة",
          "error"
        );

        return;
      }

      if (
        nooraniaForm
          .revision_faces ===
          "" ||
        Number(
          nooraniaForm
            .revision_faces
        ) < 0
      ) {
        showToast(
          "أدخل مقدار المراجعة",
          "error"
        );

        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        student_id:
          Number(
            commonForm.student_id
          ),

        halaqa_id:
          Number(
            commonForm.halaqa_id
          ),

        teacher_id:
          teacher.id,

        recitation_date:
          commonForm.recitation_date,

        lesson:
          nooraniaForm
            .lesson
            .trim(),

        lesson_evaluation:
          textOrNull(
            nooraniaForm
              .lesson_evaluation
          ),

        lesson_amount_value:
          numberOrNull(
            nooraniaForm
              .lesson_faces
          ),

        lesson_amount_unit:
          nooraniaForm.lesson_unit || "lines",

        lesson_faces:
          nooraniaAmountToPages(
            nooraniaForm.lesson_faces,
            nooraniaForm.lesson_unit
          ),

        side_lesson:
          textOrNull(
            nooraniaForm
              .side_lesson
          ),

        side_lesson_evaluation:
          textOrNull(
            nooraniaForm
              .side_lesson_evaluation
          ),

        revision:
          textOrNull(
            nooraniaForm
              .revision
          ),

        revision_evaluation:
          textOrNull(
            nooraniaForm
              .revision_evaluation
          ),

        revision_amount_value:
          nooraniaForm.revision.trim()
            ? numberOrNull(nooraniaForm.revision_faces)
            : null,

        revision_amount_unit:
          nooraniaForm.revision.trim()
            ? (nooraniaForm.revision_unit || "lines")
            : null,

        revision_faces:
          nooraniaForm.revision.trim()
            ? nooraniaAmountToPages(
                nooraniaForm.revision_faces,
                nooraniaForm.revision_unit
              )
            : null,

        notes:
          textOrNull(
            commonForm.notes
          ),

        points:
          nooraniaPoints,
      ...sideLessonPayload({original,changed:nooraniaForm.side_amount_changed,faces:nooraniaForm.side_lesson_faces,lines:nooraniaForm.side_lesson_lines,evaluation:nooraniaForm.side_lesson_evaluation,program:"noorania"}),
};

      await saveToTable({
        table:
          "noorania_recitations",

        type:
          "noorania",

        payload,

        points:
          nooraniaPoints,

        reason:
          "تسميع القاعدة",
      });

    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     INSERT / UPDATE المشترك
  ===================================================== */

  async function saveToTable({
    table,
    type,
    payload,
    points,
    reason,
    afterPersist = null,
  }) {
    await assertRecitationAttendance(supabase, payload);
    let persistedRecord = null;
    let postPersistResult = null;

    /*
      ============================================
      UPDATE
      ============================================
    */

    if (
      editing &&
      editing.type === type
    ) {
      const source =
        type === "quran"
          ? quranRecords
          : nooraniaRecords;

      const oldRecord =
        source.find(
          (record) =>
            Number(record.id) ===
            Number(editing.id)
        );

      if (!oldRecord) {
        throw new Error(
          "تعذر العثور على السجل القديم"
        );
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(table)
          .update(payload)
          .eq("id", editing.id)
          .eq(
            "halaqa_id",
            oldRecord.halaqa_id
          )
          .select("*")
          .single();

      if (error) {
        throw error;
      }

      persistedRecord = data;

      if (
        afterPersist &&
        persistedRecord
      ) {
        postPersistResult =
          await afterPersist(
            persistedRecord
          );
      }

      const oldPoints =
        Number(oldRecord.points || 0);

      const difference =
        Number(points) - oldPoints;

      if (difference !== 0) {
        await addPointsTransaction({
          studentId:
            payload.student_id,
          points:
            difference,
          date:
            payload.recitation_date,
          reason:
            `تعديل ${reason}`,
        });
      }

      showToast(
        "تم تعديل السجل بنجاح",
        "success"
      );
    }

    /*
      ============================================
      INSERT

      لا يوجد منع لتكرار اليوم.
      الطالب يمكن أن يكون لديه أكثر
      من جلسة في اليوم نفسه.
      ============================================
    */

    else {
      const {
        data,
        error,
      } =
        await supabase
          .from(table)
          .insert([payload])
          .select("*")
          .single();

      if (error) {
        throw error;
      }

      persistedRecord = data;

      if (
        afterPersist &&
        persistedRecord
      ) {
        postPersistResult =
          await afterPersist(
            persistedRecord
          );
      }

      if (Number(points) !== 0) {
        await addPointsTransaction({
          studentId:
            payload.student_id,
          points,
          date:
            payload.recitation_date,
          reason,
        });
      }

      showToast(
        type === "quran"
          ? "تم حفظ تسميع القرآن بنجاح"
          : "تم حفظ تسميع القاعدة النورانية بنجاح",
        "success"
      );
    }

    if (
      type === "quran" &&
      postPersistResult
    ) {
      const nextParts = [];

      if (postPersistResult.lesson) {
        nextParts.push(
          `الحفظ ${formatGeneratedRange(
            postPersistResult.lesson
          )}`
        );
      }



      if (postPersistResult.review) {
        nextParts.push(
          `المراجعة ${formatGeneratedRange(
            postPersistResult.review
          )}`
        );
      }

      if (nextParts.length > 0) {
        showToast(
          `المطلوب القادم: ${nextParts.join(" • ")}`,
          "info"
        );
      } else if (
        planSuggestion?.id
      ) {
        showToast(
          "تم تسجيل الجلسة ولا يوجد مطلوب تالٍ داخل حدود الخطة الحالية لهذا المسار",
          "info"
        );
      }
    }

    const sessionAdvance =
      type === "quran" &&
      !editing &&
      persistedRecord
        ? await completeSessionStudent({
            studentId: payload.student_id,
            recitationId: persistedRecord.id,
          })
        : null;

    if (sessionAdvance?.handled) {
      if (sessionAdvance.nextRow) {
        await openSessionStudent(sessionAdvance.nextRow);

        showToast(
          `الطالب التالي: ${
            sessionAdvance.nextRow.student_profile?.full_name || "الطالب"
          }`,
          "info"
        );
      } else {
        resetForms();
        showToast("اكتملت جلسة الحلقة بنجاح", "success");
      }

      await loadData(true);

      return {
        record: persistedRecord,
        engine: postPersistResult,
      };
    }

    const shouldAdvance =
      !editing &&
      teacherPreferences.recitation_advance_next_student !== false &&
      commonForm.halaqa_id &&
      commonForm.student_id;

    if (shouldAdvance) {
      const currentIndex =
        studentsForForm.findIndex(
          (student) =>
            String(student.id) ===
            String(commonForm.student_id)
        );

      const nextStudent =
        currentIndex >= 0
          ? studentsForForm[
              currentIndex + 1
            ]
          : null;

      if (nextStudent) {
        const currentHalaqa =
          commonForm.halaqa_id;
        const currentDate =
          commonForm.recitation_date ||
          getLocalDate();

        setEditing(null);
        setCommonForm({
          ...createCommonForm(),
          halaqa_id:
            String(currentHalaqa),
          student_id:
            String(nextStudent.id),
          recitation_date:
            currentDate,
        });

        setQuranForm(
          createQuranForm(
            teacherPreferences
              .recitation_default_amount_type
          )
        );
        setNooraniaForm(
          createNooraniaForm()
        );
        setPlanSuggestion(null);
        setCompletionModes(
          createCompletionModes()
        );
        setFormOpen(true);

        showToast(
          `تم الانتقال إلى الطالب التالي: ${
            nextStudent.full_name ||
            "الطالب"
          }`,
          "info"
        );
      } else {
        resetForms();
      }
    } else {
      resetForms();
    }

    await loadData(true);

    return {
      record: persistedRecord,
      engine: postPersistResult,
    };
  }

  /* =====================================================
     POINTS
  ===================================================== */

  async function addPointsTransaction({
    studentId,
    points,
    date,
    reason,
  }) {
    if (
      Number(points) === 0
    ) {
      return;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "points_transactions"
        )
        .insert([
          {
            student_id:
              Number(
                studentId
              ),

            points:
              Number(
                points
              ),

            reason,

            /*
              نحافظ على category
              المستخدمة سابقًا
              حتى لا نصطدم بقيود DB.
            */

            category:
              "recitation",

            transaction_date:
              date,
          },
        ]);

    if (error) {
      console.error(
        "POINTS TRANSACTION:",
        error
      );

      showToast(
        "تم حفظ التسميع، لكن تعذر تحديث سجل النقاط",
        "error"
      );
    }
  }

  /* =====================================================
     DELETE
  ===================================================== */

  async function deleteRecord(
    record
  ) {
    const type =
      record.record_type;

    const table =
      type === "quran"
        ? "recitations"
        : "noorania_recitations";

    const typeName =
      type === "quran"
        ? "تسميع القرآن"
        : "تسميع القاعدة النورانية";

    const confirmed =
      window.confirm(
        `هل تريد حذف ${typeName} للطالب "${studentName(
          record.student_id
        )}"؟\n\nالتاريخ: ${formatHijriDate(
          record.recitation_date
        )}\n${formatGregorianDate(
          record.recitation_date
        )}\n\nلا يمكن التراجع عن الحذف.`
      );

    if (!confirmed) {
      return;
    }

    const key =
      `${type}-${record.id}`;

    setDeletingKey(key);

    try {
      const {
        error,
      } =
        await supabase
          .from(table)
          .delete()
          .eq(
            "id",
            record.id
          )
          .eq(
            "halaqa_id",
            record.halaqa_id
          );

      if (error) {
        throw error;
      }

      const oldPoints =
        Number(
          record.points ||
            0
        );

      if (
        oldPoints !== 0
      ) {
        await addPointsTransaction({
          studentId:
            record.student_id,

          points:
            -oldPoints,

          date:
            getLocalDate(),

          reason:
            `إلغاء ${typeName}`,
        });
      }

      if (
        editing &&
        editing.type ===
          type &&
        Number(
          editing.id
        ) ===
          Number(
            record.id
          )
      ) {
        resetForms();
      }

      showToast(
        "تم حذف السجل",
        "success"
      );

      await loadData(true);

    } catch (error) {
      console.error(
        "DELETE RECITATION:",
        error
      );

      showToast(
        error.message ||
          "تعذر حذف السجل",
        "error"
      );
    } finally {
      setDeletingKey("");
    }
  }

  /* =====================================================
     فتح Edit
  ===================================================== */

  function editRecord(
    record
  ) {
    if (
      record.record_type ===
      "quran"
    ) {
      editQuranRecord(
        record
      );
    } else {
      editNooraniaRecord(
        record
      );
    }
  }

  /* =====================================================
     Render
  ===================================================== */

  if (initialLoading) {
    return (
      <div
        className="recitations-page"
        dir="rtl"
      >
        <PageStyles />

        <LoadingState />
      </div>
    );
  }

  return (
    <div
      className="recitations-page"
      dir="rtl"
    >
      <PageStyles />

      {/* =================================================
          HERO
      ================================================= */}

      <section
        className="recitations-hero"
      >
        <div
          className="hero-main"
        >
          <div
            className="hero-icon"
          >
            <BookOpen
              size={24}
            />
          </div>

          <div>
            <div
              className="hero-eyebrow"
            >
              <ShieldCheck
                size={13}
              />

              بوابة المعلم
            </div>

            <h1>
              التسميع
            </h1>

            <p>
              تسجيل سريع وواضح للقرآن والقاعدة النورانية،
              بدون إدخال «من سورة / من آية / إلى سورة / إلى آية» في الجلسة اليومية.
            </p>
          </div>
        </div>

        <div
          className="hero-actions"
        >
          <button
            type="button"
            className="refresh-button"
            onClick={() =>
              loadData(true)
            }
            disabled={
              refreshing
            }
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            <span>
              تحديث
            </span>
          </button>

          <button
            type="button"
            className="create-button quran"
            onClick={() =>
              openCreate(
                "quran"
              )
            }
            disabled={
              halaqat.length ===
              0
            }
          >
            <BookOpen
              size={16}
            />

            <span>
              إضافة تسميع قرآن
            </span>
          </button>

          <button
            type="button"
            className="create-button noorania"
            onClick={() =>
              openCreate(
                "noorania"
              )
            }
            disabled={
              halaqat.length ===
              0
            }
          >
            <LibraryBig
              size={16}
            />

            <span>
              إضافة تسميع نورانية
            </span>
          </button>
        </div>
      </section>

      {/* =================================================
          INFO
      ================================================= */}

      <div
        className="recitation-scope"
      >
        <Sparkles
          size={14}
        />

        اختر الطالب والمقدار والتقييم والمراجعة، وأكمل التسميع بسهولة.
      </div>

      {/* =================================================
          HALAQA SESSION
      ================================================= */}

      {activeSession ? (
        <section className="halaqa-session-card active">
          <div className="halaqa-session-top">
            <div className="halaqa-session-heading">
              <div className="halaqa-session-icon">
                <Play size={18} />
              </div>

              <div>
                <span className="halaqa-session-kicker">جلسة قرآن جارية</span>
                <h2>
                  {halaqaName(activeSession.halaqa_id)}
                </h2>
                <p>
                  {currentSessionStudent
                    ? `وصلت إلى الطالب ${currentSessionStudent.position} من ${sessionProgress.total} — ${currentSessionStudent.student_profile?.full_name || studentName(currentSessionStudent.student_id)}`
                    : "تمت معالجة جميع طلاب الجلسة"}
                </p>
              </div>
            </div>

            <div className="halaqa-session-actions">
              {currentSessionStudent && (
                <button
                  type="button"
                  className="session-absent-button"
                  onClick={markCurrentSessionAbsent}
                  disabled={sessionBusy}
                >
                  <UserX size={15} />
                  غائب
                </button>
              )}

              <button
                type="button"
                className="session-resume-button"
                onClick={resumeActiveSession}
                disabled={sessionBusy || !currentSessionStudent}
              >
                {sessionBusy ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
                متابعة الجلسة
              </button>
            </div>
          </div>

          <div className="halaqa-session-progress">
            <div
              className="halaqa-session-progress-bar"
              style={{ width: `${sessionProgress.percent}%` }}
            />
          </div>

          <div className="halaqa-session-meta">
            <div><CheckCircle2 size={14} /><strong>{sessionProgress.completed}</strong><span>مكتمل</span></div>
            <div><UserX size={14} /><strong>{sessionProgress.absent}</strong><span>غائب</span></div>
            <div><Clock3 size={14} /><strong>{sessionProgress.pending}</strong><span>متبقٍ</span></div>
            <div><CalendarDays size={14} /><span>{formatGregorianDate(activeSession.session_date)}</span></div>
          </div>

          <div className="halaqa-session-roster">
            {sessionStudents.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`session-student-chip ${item.status} ${
                  currentSessionStudent && Number(currentSessionStudent.id) === Number(item.id)
                    ? "current"
                    : ""
                }`}
                onClick={() =>
                  item.status === "pending"
                    ? openSessionStudent(item)
                    : undefined
                }
                disabled={sessionBusy || item.status !== "pending"}
                title={item.student_profile?.full_name || studentName(item.student_id)}
              >
                <span>{item.position}</span>
                <strong>{item.student_profile?.full_name || studentName(item.student_id)}</strong>
                {item.status === "completed" ? (
                  <CheckCircle2 size={13} />
                ) : item.status === "absent" ? (
                  <UserX size={13} />
                ) : (
                  <Clock3 size={13} />
                )}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="halaqa-session-card launcher">
          <div className="halaqa-session-heading">
            <div className="halaqa-session-icon">
              <Play size={18} />
            </div>

            <div>
              <span className="halaqa-session-kicker">الوضع السريع للمعلم</span>
              <h2>ابدأ جلسة الحلقة</h2>
              <p>يحفظ النظام ترتيب الطلاب وتقدم الجلسة تلقائيًا، ويمكنك الرجوع والمتابعة من نفس الطالب.</p>
            </div>
          </div>

          <div className="halaqa-session-launch-controls">
            <select
              value={sessionLauncherHalaqa}
              onChange={(event) => setSessionLauncherHalaqa(event.target.value)}
              disabled={sessionBusy}
            >
              <option value="">اختر الحلقة</option>
              {halaqat.map((halaqa) => (
                <option key={halaqa.id} value={halaqa.id}>
                  {halaqa.name} — {halaqa.mosque_name}
                </option>
              ))}
            </select>

            <CalendarInput

              value={sessionLauncherDate}
              max={getLocalDate()}
              onChange={(event) => setSessionLauncherDate(event.target.value)}
              disabled={sessionBusy}
            />

            <button
              type="button"
              className="session-start-button"
              onClick={startQuranSession}
              disabled={sessionBusy || halaqat.length === 0}
            >
              {sessionBusy ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
              بدء جلسة القرآن
            </button>
          </div>
        </section>
      )}

      {/* =================================================
          STATS
      ================================================= */}

      <section
        className="recitation-stats"
      >
        <StatCard
          icon={History}
          title="إجمالي السجلات"
          value={
            stats.total
          }
          subtitle="قرآن + نورانية"
        />

        <StatCard
          icon={BookOpen}
          title="تسميعات القرآن"
          value={
            stats.quran
          }
          subtitle="هذا الشهر"
        />

        <StatCard
          icon={LibraryBig}
          title="تسميعات النورانية"
          value={
            stats.noorania
          }
          subtitle="هذا الشهر"
        />

        <StatCard
          icon={Target}
          title="أوجه الدرس"
          value={formatFaces(
            stats.lessonFaces
          )}
          subtitle="قرآن هذا الشهر"
        />

        <StatCard
          icon={RefreshCw}
          title="أوجه المراجعة"
          value={formatFaces(
            stats.reviewFaces
          )}
          subtitle="قرآن هذا الشهر"
        />
      </section>

      {/* =================================================
          FILTERS
      ================================================= */}

      <section
        className="records-toolbar"
      >
        <div
          className="records-search"
        >
          <Search
            size={16}
          />

          <input
            value={
              recordsSearch
            }
            onChange={(e) =>
              setRecordsSearch(
                e.target.value
              )
            }
            placeholder="ابحث باسم الطالب أو الحلقة..."
          />

          {recordsSearch && (
            <button
              type="button"
              onClick={() =>
                setRecordsSearch("")
              }
            >
              <X
                size={13}
              />
            </button>
          )}
        </div>

        <select
          value={
            recordTypeFilter
          }
          onChange={(e) =>
            setRecordTypeFilter(
              e.target.value
            )
          }
        >
          <option value="all">
            جميع أنواع التسميع
          </option>

          <option value="quran">
            القرآن الكريم
          </option>

          <option value="noorania">
            القاعدة النورانية
          </option>
        </select>

        <select
          value={
            halaqaFilter
          }
          onChange={(e) =>
            setHalaqaFilter(
              e.target.value
            )
          }
        >
          <option value="all">
            جميع حلقاتي
          </option>

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
                {halaqa.name}
              </option>
            )
          )}
        </select>

        <select
          value={
            dateFilter
          }
          onChange={(e) =>
            setDateFilter(
              e.target.value
            )
          }
        >
          <option value="today">
            هذا اليوم
          </option>

          <option value="all">
            كل التواريخ
          </option>

          <option value="week">هذا الأسبوع</option>
          <option value="month">
            هذا الشهر
          </option>
        </select>
      </section>

      {/* =================================================
          RECORDS HEADER
      ================================================= */}

      <div
        className="records-title-row"
      >
        <div>
          <h2>
            سجل التسميع
          </h2>

          <p>
            عرض{" "}
            {
              filteredRecords.length
            }{" "}
            من{" "}
            {allRecords.length}
            {" "}
            سجل
          </p>
        </div>
      </div>

      {/* =================================================
          RECORDS
      ================================================= */}

      {halaqat.length ===
      0 ? (
        <EmptyState
          icon={Layers3}
          title="لا توجد حلقات مرتبطة بك"
          description="يجب أن تقوم الإدارة بربط المعلم بحلقة أولًا."
        />
      ) : filteredRecords.length ===
        0 ? (
        <EmptyState
          icon={FileText}
          title="لا توجد سجلات"
          description="لم يتم العثور على سجلات مطابقة للفلاتر الحالية."
        />
      ) : (
        <section
          className="records-grid"
        >
          {filteredRecords.map(
            (record) => (
              <RecordCard
                key={`${record.record_type}-${record.id}`}
                record={
                  record
                }
                studentName={
                  studentName(
                    record.student_id
                  )
                }
                halaqa={
                  halaqat.find(
                    (item) =>
                      Number(
                        item.id
                      ) ===
                      Number(
                        record.halaqa_id
                      )
                  )
                }
                deleting={
                  deletingKey ===
                  `${record.record_type}-${record.id}`
                }
                onEdit={() =>
                  editRecord(
                    record
                  )
                }
                onDelete={() =>
                  deleteRecord(
                    record
                  )
                }
              />
            )
          )}
        </section>
      )}

      {/* =================================================
          FORM MODAL
      ================================================= */}

      {formOpen && (
        <div
          className="recitation-modal-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              resetForms();
            }
          }}
        >
          <div
            className="recitation-modal"
          >
            {/* ===========================================
                MODAL HEADER
            =========================================== */}

            <div
              className="modal-header"
            >
              <div
                className="modal-heading"
              >
                <div
                  className={
                    formType ===
                    "quran"
                      ? "modal-icon quran"
                      : "modal-icon noorania"
                  }
                >
                  {formType ===
                  "quran" ? (
                    <BookOpen
                      size={18}
                    />
                  ) : (
                    <LibraryBig
                      size={18}
                    />
                  )}
                </div>

                <div>
                  <div
                    className="modal-eyebrow"
                  >
                    {editing
                      ? "تعديل سجل"
                      : "جلسة جديدة"}
                  </div>

                  <h2>
                    {formType ===
                    "quran"
                      ? "تسميع القرآن الكريم"
                      : "تسميع القاعدة النورانية"}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  resetForms()
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

            {/* ===========================================
                EDIT NOTICE
            =========================================== */}

            {editing && (
              <div
                className="edit-notice"
              >
                <Edit3
                  size={14}
                />

                تعديل السجل الحالي
              </div>
            )}

            {/* ===========================================
                COMMON
            =========================================== */}

            <div
              className="modal-body"
            >
              {isActiveSessionForm && currentSessionStudent && (
                <div className="session-modal-progress">
                  <div>
                    <span>جلسة الحلقة</span>
                    <strong>
                      الطالب {currentSessionStudent.position} من {sessionProgress.total}
                    </strong>
                    <small>
                      {currentSessionStudent.student_profile?.full_name || studentName(currentSessionStudent.student_id)}
                    </small>
                  </div>

                  <div className="session-modal-progress-track">
                    <i style={{ width: `${sessionProgress.percent}%` }} />
                  </div>

                  <button
                    type="button"
                    onClick={markCurrentSessionAbsent}
                    disabled={sessionBusy || saving}
                  >
                    <UserX size={14} />
                    غائب والانتقال للتالي
                  </button>
                </div>
              )}
              <FormSection
                icon={<GraduationCap size={16} />}
                title="بيانات الجلسة"
                collapsible
                defaultOpen
                summary={
                  commonForm.student_id
                    ? `${studentName(commonForm.student_id)} • ${formatGregorianDate(commonForm.recitation_date)}`
                    : "الحلقة • الطالب • التاريخ"
                }
              >
                <div
                  className="form-grid three"
                >
                  <SelectField
                    label="الحلقة"
                    required
                    value={
                      commonForm
                        .halaqa_id
                    }
                    disabled={
                      Boolean(
                        editing ||
                        isActiveSessionForm
                      )
                    }
                    onChange={(
                      value
                    ) => {
                      setCommonForm(
                        (current) => ({
                          ...current,
                          halaqa_id:
                            value,
                          student_id:
                            "",
                        })
                      );
                    }}
                    options={[
                      {
                        value: "",
                        label:
                          "اختر الحلقة",
                      },

                      ...halaqat.map(
                        (halaqa) => ({
                          value:
                            String(
                              halaqa.id
                            ),

                          label:
                            `${halaqa.name} — ${halaqa.mosque_name}`,
                        })
                      ),
                    ]}
                  />

                  <SelectField
                    label="الطالب"
                    required
                    value={
                      commonForm
                        .student_id
                    }
                    disabled={
                      Boolean(
                        editing ||
                        isActiveSessionForm
                      ) ||
                      !commonForm
                        .halaqa_id
                    }
                    onChange={(
                      value
                    ) =>
                      setCommon(
                        "student_id",
                        value
                      )
                    }
                    options={[
                      {
                        value: "",
                        label:
                          commonForm
                            .halaqa_id
                            ? "اختر الطالب"
                            : "اختر الحلقة أولًا",
                      },

                      ...studentsForForm.map(
                        (
                          student
                        ) => ({
                          value:
                            String(
                              student.id
                            ),

                          label:
                            `${student.full_name}${
                              student.user_number
                                ? ` — ${student.user_number}`
                                : ""
                            }`,
                        })
                      ),
                    ]}
                  />

                  <DateField
                    value={
                      commonForm
                        .recitation_date
                    }
                    disabled={isActiveSessionForm}
                    onChange={(
                      value
                    ) =>
                      setCommon(
                        "recitation_date",
                        value
                      )
                    }
                  />
                </div>

              </FormSection>

              {attendanceGuard.message && <p role="status" className="attendance-recitation-notice">{attendanceGuard.message}</p>}
              <fieldset className="attendance-recitation-fields" disabled={attendanceGuard.disabled}>

              {/* =========================================
                  QURAN
              ========================================= */}

              {/* =========================================
                  QURAN
              ========================================= */}

              {formType === "quran" && (
                <>
                  {!editing && planSuggestion && <StudentLessonActivity key={`${commonForm.student_id}-${commonForm.recitation_date}`}
                    studentId={commonForm.student_id} halaqaId={commonForm.halaqa_id}
                    policy={currentLearningPolicy} plan={planSuggestion} disabled={saving}
                    effectiveDate={commonForm.recitation_date}
                    onSaved={() => setLearningRevision((value) => value + 1)} />}
                  {planSuggestion &&
                    teacherPreferences.recitation_show_monthly_plan !== false && (
                    <div className={`recitation-plan-brief ${planSuggestion.scheduledToday ? "scheduled" : "extra-day"}`}>
                      <Target size={15} />
                      <span>
                        {planSuggestion.activeIntervention
                          ? formatInterventionType(planSuggestion.interventionType)
                          : "خطة اليوم جاهزة"}
                      </span>
                      {!planSuggestion.scheduledToday && (
                        <small>جلسة إضافية</small>
                      )}
                    </div>
                  )}

                  <FormSection
                    icon={<BookOpen size={17} />}
                    title="الحفظ"
                    collapsible
                    summary={
                      planSuggestion?.generatedLesson
                        ? formatGeneratedRange(planSuggestion.generatedLesson)
                        : quranForm.from_surah
                          ? formatRecordRange(
                              quranForm.from_surah,
                              quranForm.from_ayah,
                              quranForm.to_surah,
                              quranForm.to_ayah
                            )
                          : "اضغط للتسجيل"
                    }
                  >
                    {planSuggestion?.lessonSuppressed && !editing ? (
                      <div className="side-policy-none-state">
                        <ShieldCheck size={16} />
                        <div>
                          <strong>
                            {planSuggestion.interventionType === "pause" || currentLearningPolicy?.lesson_enabled === false
                              ? "الحفظ موقوف"
                              : "تثبيت بدون حفظ جديد"}
                          </strong>
                        </div>
                      </div>
                    ) : planSuggestion?.generatedLesson && !editing ? (
                      <>
                        <PlannedQuranTask
                          title="المطلوب"
                          assignment={planSuggestion.generatedLesson}
                          amount={planSuggestion.memorizationAmount}
                          unit={planSuggestion.memorizationUnit}
                        />

                        <CompletionStatusSelector
                          value={completionModes.lesson}
                          onChange={(value) =>
                            setTrackCompletion("lesson", value)
                          }
                        />

                        {(completionModes.lesson === "under" ||
                          completionModes.lesson === "over") && (
                          <QuranActualEndEditor
                            label={
                              completionModes.lesson === "under"
                                ? "آخر موضع وصل إليه الطالب"
                                : "آخر موضع زاد إليه الطالب"
                            }
                            toSurah={quranForm.to_surah}
                            toAyah={quranForm.to_ayah}
                            onToSurah={(value) =>
                              setQuran("to_surah", value)
                            }
                            onToAyah={(value) =>
                              setQuran("to_ayah", value)
                            }
                          />
                        )}

                        {completionModes.lesson === "repeat" && (
                          <div className="completion-repeat-note">
                            <RefreshCw size={15} />
                            <span>إعادة نفس المطلوب</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <QuranRangeEditor
                        fromSurah={quranForm.from_surah}
                        fromAyah={quranForm.from_ayah}
                        toSurah={quranForm.to_surah}
                        toAyah={quranForm.to_ayah}
                        onFromSurah={(value) => setQuran("from_surah", value)}
                        onFromAyah={(value) => setQuran("from_ayah", value)}
                        onToSurah={(value) => setQuran("to_surah", value)}
                        onToAyah={(value) => setQuran("to_ayah", value)}
                      />
                    )}

                    {(!planSuggestion?.lessonSuppressed || editing) && (
                      <>
                        <RangeMetricPreview
                          metrics={rangeMetrics.lesson}
                          loading={rangeMetricsLoading}
                          emptyText="اختر نطاق الدرس ليحسب النظام الإنجاز تلقائيًا."
                        />

                        <EvaluationSelector
                          label="تقييم الدرس"
                          value={quranForm.lesson_evaluation}
                          onChange={(value) =>
                            setTrackEvaluation(
                              "lesson",
                              "lesson_evaluation",
                              value
                            )
                          }
                        />
                      </>
                    )}
                  </FormSection>

                  <FormSection icon={<Target size={17}/>} title="جنب الدرس">
    <SideLessonFields faces={quranForm.side_lesson_faces} lines={quranForm.side_lesson_lines} evaluation={quranForm.next_evaluation}
      onFaces={value => setQuranForm(current => ({...current,side_lesson_faces:value,side_amount_changed:true,next2_evaluation:""}))}
      onLines={value => setQuranForm(current => ({...current,side_lesson_lines:value,side_amount_changed:true,next2_evaluation:""}))}
      onEvaluation={value => setQuranForm(current => ({...current,next_evaluation:value,side_amount_changed:true,next2_evaluation:""}))}/>
  </FormSection>



                  <FormSection
                    icon={<RefreshCw size={17} />}
                    title="المراجعة"
                    collapsible
                    summary={
                      planSuggestion?.generatedReview
                        ? formatGeneratedRange(planSuggestion.generatedReview)
                        : quranForm.review_surah
                          ? formatRecordRange(
                              quranForm.review_surah,
                              quranForm.review_from_ayah,
                              quranForm.review_to_surah,
                              quranForm.review_to_ayah
                            )
                          : "اضغط للتسجيل"
                    }
                  >
                    {planSuggestion?.interventionType === "pause" && !editing ? (
                      <div className="side-policy-none-state">
                        <ShieldCheck size={16} />
                        <div>
                          <strong>المراجعة موقوفة مؤقتًا</strong>
                        </div>
                      </div>
                    ) : planSuggestion?.generatedReview && !editing ? (
                      <>
                        <PlannedQuranTask
                          title={
                            planSuggestion.reviewSegmentType === "stabilization_review"
                              ? "مراجعة التثبيت المطلوبة"
                              : "المراجعة المطلوبة"
                          }
                          assignment={planSuggestion.generatedReview}
                          amount={planSuggestion.revisionAmount}
                          unit={planSuggestion.revisionUnit}
                        />

                        <CompletionStatusSelector
                          value={completionModes.review}
                          onChange={(value) =>
                            setTrackCompletion("review", value)
                          }
                        />

                        {(completionModes.review === "under" ||
                          completionModes.review === "over") && (
                          <QuranActualEndEditor
                            label={
                              completionModes.review === "under"
                                ? "آخر موضع راجعه الطالب"
                                : "آخر موضع زاد في مراجعته"
                            }
                            toSurah={quranForm.review_to_surah}
                            toAyah={quranForm.review_to_ayah}
                            onToSurah={(value) =>
                              setQuran("review_to_surah", value)
                            }
                            onToAyah={(value) =>
                              setQuran("review_to_ayah", value)
                            }
                          />
                        )}

                        {completionModes.review === "repeat" && (
                          <div className="completion-repeat-note">
                            <RefreshCw size={15} />
                            <span>إعادة نفس المطلوب</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <QuranRangeEditor
                        fromSurah={quranForm.review_surah}
                        fromAyah={quranForm.review_from_ayah}
                        toSurah={quranForm.review_to_surah}
                        toAyah={quranForm.review_to_ayah}
                        onFromSurah={(value) => setQuran("review_surah", value)}
                        onFromAyah={(value) => setQuran("review_from_ayah", value)}
                        onToSurah={(value) => setQuran("review_to_surah", value)}
                        onToAyah={(value) => setQuran("review_to_ayah", value)}
                      />
                    )}

                    {(planSuggestion?.interventionType !== "pause" || editing) && (
                      <>
                        <RangeMetricPreview
                          metrics={rangeMetrics.review}
                          loading={rangeMetricsLoading}
                          emptyText="اختر نطاق المراجعة وسيحسب النظام الأوجه تلقائيًا."
                        />

                        <EvaluationSelector
                          label={
                            planSuggestion?.reviewSegmentType === "stabilization_review"
                              ? "تقييم مراجعة التثبيت"
                              : "تقييم المراجعة"
                          }
                          value={quranForm.review_evaluation}
                          onChange={(value) =>
                            setTrackEvaluation(
                              "review",
                              "review_evaluation",
                              value
                            )
                          }
                        />
                      </>
                    )}
                  </FormSection>
                </>
              )}

              {/* =========================================
                  NOORANIA
              ========================================= */}

              {formType === "noorania" && (
                <>
                  <FormSection
                    icon={<LibraryBig size={16} />}
                    title="الدرس"
                    collapsible
                    summary={
                      nooraniaForm.lesson
                        ? `${nooraniaForm.lesson}${nooraniaForm.lesson_evaluation ? ` • ${nooraniaForm.lesson_evaluation}` : ""}`
                        : "اضغط للتسجيل"
                    }
                  >
                    <div className="form-grid two compact-noorania-grid">
                      <TextField
                        label="الدرس"
                        required
                        value={nooraniaForm.lesson}
                        onChange={(value) => setNoorania("lesson", value)}
                        placeholder="مثال: الدرس العاشر"
                      />

                      <NooraniaAmountField
                        label="المقدار"
                        required
                        value={nooraniaForm.lesson_faces}
                        unit={nooraniaForm.lesson_unit}
                        onValueChange={(value) => setNoorania("lesson_faces", value)}
                        onUnitChange={(value) => setNoorania("lesson_unit", value)}
                      />
                    </div>

                    <EvaluationSelector
                      label="التقييم"
                      value={nooraniaForm.lesson_evaluation}
                      onChange={(value) => setNoorania("lesson_evaluation", value)}
                    />
                  </FormSection>

                  <FormSection icon={<Target size={17}/>} title="جنب الدرس">
    <SideLessonFields linesPerFace={10} faces={nooraniaForm.side_lesson_faces} lines={nooraniaForm.side_lesson_lines} evaluation={nooraniaForm.side_lesson_evaluation}
      onFaces={value => setNooraniaForm(current => ({...current,side_lesson_faces:value,side_amount_changed:true}))}
      onLines={value => setNooraniaForm(current => ({...current,side_lesson_lines:value,side_amount_changed:true}))}
      onEvaluation={value => setNooraniaForm(current => ({...current,side_lesson_evaluation:value,side_amount_changed:true}))}/>
  </FormSection>

                  <FormSection
                    icon={<RefreshCw size={16} />}
                    title="المراجعة"
                    collapsible
                    summary={
                      nooraniaForm.revision
                        ? `${nooraniaForm.revision}${nooraniaForm.revision_evaluation ? ` • ${nooraniaForm.revision_evaluation}` : ""}`
                        : "اضغط للتسجيل"
                    }
                  >
                    <div className="form-grid two compact-noorania-grid">
                      <TextField
                        label="المراجعة"
                        value={nooraniaForm.revision}
                        onChange={(value) => setNoorania("revision", value)}
                        placeholder="مثال: الدرس الأول إلى الخامس"
                      />

                      <NooraniaAmountField
                        label="المقدار"
                        value={nooraniaForm.revision_faces}
                        unit={nooraniaForm.revision_unit}
                        onValueChange={(value) => setNoorania("revision_faces", value)}
                        onUnitChange={(value) => setNoorania("revision_unit", value)}
                      />
                    </div>

                    <EvaluationSelector
                      label="التقييم"
                      value={nooraniaForm.revision_evaluation}
                      onChange={(value) => setNoorania("revision_evaluation", value)}
                    />
                  </FormSection>
                </>
              )}

              {/* =========================================
                  POINTS + NOTES
              ========================================= */}

              <div
                className="bottom-form-grid"
              >
                <div
                  className="points-preview"
                >
                  <div
                    className="points-icon"
                  >
                    <Trophy
                      size={21}
                    />
                  </div>

                  <span>
                    نقاط الجلسة
                  </span>

                  <strong>
                    {(formType ===
                    "quran"
                      ? quranPoints
                      : nooraniaPoints) >
                    0
                      ? `+${
                          formType ===
                          "quran"
                            ? quranPoints
                            : nooraniaPoints
                        }`
                      : formType ===
                        "quran"
                      ? quranPoints
                      : nooraniaPoints}
                  </strong>

                  <small>النقاط</small>
                </div>

                <details className="recitation-notes-details">
                  <summary>
                    <MessageSquareText size={14} />
                    ملاحظة
                  </summary>
                  <div className="notes-box compact">
                    <textarea
                      value={commonForm.notes}
                      onChange={(e) => setCommon("notes", e.target.value)}
                      placeholder="اختياري"
                      rows={3}
                    />
                  </div>
                </details>
              </div>
              </fieldset>
            </div>

            {/* ===========================================
                FOOTER
            =========================================== */}

            <div
              className="modal-footer"
            >
              <button
                type="button"
                className="modal-cancel"
                onClick={() =>
                  resetForms()
                }
                disabled={
                  saving
                }
              >
                <X
                  size={15}
                />

                إلغاء
              </button>

              <button
                type="button"
                className="modal-save"
                onClick={
                  saveRecord
                }
                disabled={
                  saving || attendanceGuard.disabled
                }
              >
                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      className="spin"
                    />

                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Save
                      size={16}
                    />

                    {editing
                      ? "حفظ التعديلات"
                      : "حفظ التسميع"}
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
   Record Card
========================================================= */

function RecordCard({
  record,
  studentName,
  halaqa,
  deleting,
  onEdit,
  onDelete,
}) {
  const quran =
    record.record_type ===
    "quran";

  return (
    <article
      className="record-card"
    >
      <div
        className={
          quran
            ? "record-accent quran"
            : "record-accent noorania"
        }
      />

      {/* HEADER */}

      <div
        className="record-card-header"
      >
        <div
          className="record-student"
        >
          <div
            className={
              quran
                ? "record-avatar quran"
                : "record-avatar noorania"
            }
          >
            {quran ? (
              <BookOpen
                size={18}
              />
            ) : (
              <LibraryBig
                size={18}
              />
            )}
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <h3>
              {studentName}
            </h3>

            <div
              className="record-type-label"
            >
              {quran
                ? "القرآن الكريم"
                : "القاعدة النورانية"}
            </div>
          </div>
        </div>

        <div
          className="record-badges"
        >
          {!record.teacher_id && (
            <span
              className="legacy-badge"
            >
              سجل قديم
            </span>
          )}

          <span
            className={
              quran
                ? "type-badge quran"
                : "type-badge noorania"
            }
          >
            {quran
              ? "قرآن"
              : "نورانية"}
          </span>
        </div>
      </div>

      {/* DATE */}

      <div
        className="record-date"
      >
        <CalendarDays
          size={14}
        />

        <div>
          <strong>
            {formatHijriDate(
              record.recitation_date
            )}
          </strong>


        </div>
      </div>

      {/* HALAQA */}

      <div
        className="record-halaqa"
      >
        <div>
          <GraduationCap
            size={13}
          />

          {halaqa?.name ||
            "حلقة غير معروفة"}
        </div>

        {halaqa?.mosque_name && (
          <div>
            <Building2
              size={13}
            />

            {
              halaqa.mosque_name
            }
          </div>
        )}

        {halaqa?.halaqa_period && (
          <div>
            <Clock3
              size={13}
            />

            {HALAQA_PERIODS[
              halaqa.halaqa_period
            ] ||
              "غير محدد"}
          </div>
        )}
      </div>

      {/* QURAN */}

      {quran ? (
        <>
          <RecordSection
            title="الدرس"
            icon={
              <BookOpen
                size={14}
              />
            }
          >
            <div className="record-values quick-record-values">
              <strong className="quran-range-record">
                {formatRecordRange(
                  record.from_surah,
                  record.from_ayah,
                  record.to_surah,
                  record.to_ayah
                ) || formatStoredLessonAmount(record) || "—"}
              </strong>

              {(record.lesson_faces_manual ?? record.lesson_faces) != null && (
                <FaceBadge
                  label="محسوب من المصحف"
                  value={record.lesson_faces_manual ?? record.lesson_faces}
                />
              )}

              <EvaluationBadge
                value={
                  record.lesson_evaluation
                }
              />
            </div>
          </RecordSection>

          {storedSideLesson(record).totalLines > 0 && <RecordSection title="جنب الدرس" icon={<Target size={14}/>}>
 <strong>{formatSideLessonTotal(storedSideLesson(record).totalFaces)}</strong>
 <EvaluationBadge value={record.next_evaluation}/>
 </RecordSection>}

          {(record.review_surah ||
            record.review_faces ||
            record.review_evaluation) && (
            <RecordSection
              title="المراجعة"
              icon={
                <RefreshCw
                  size={14}
                />
              }
            >
              <div className="record-values quick-record-values">
                <strong className="quran-range-record">
                  {formatRecordRange(
                    record.review_surah,
                    record.review_from_ayah,
                    record.review_to_surah,
                    record.review_to_ayah
                  ) || "—"}
                </strong>

                {record.review_faces != null && (
                  <FaceBadge
                    label="محسوب من المصحف"
                    value={record.review_faces}
                  />
                )}

                <EvaluationBadge
                  value={
                    record.review_evaluation
                  }
                />
              </div>
            </RecordSection>
          )}
        </>      ) : (
        <>
          <RecordSection
            title="الدرس"
            icon={
              <LibraryBig
                size={13}
              />
            }
          >
            <strong
              className="text-record-value"
            >
              {record.lesson ||
                "—"}
            </strong>

            <div
              className="record-values"
            >
              <EvaluationBadge
                value={
                  record.lesson_evaluation
                }
              />

              <FaceBadge
                label="أوجه التسميع"
                value={
                  record.lesson_faces
                }
              />
            </div>
          </RecordSection>

          {(record.side_lesson || storedSideLesson(record,"noorania").totalLines > 0) && (
            <RecordSection
              title="جنب الدرس"
              icon={
                <Target
                  size={13}
                />
              }
            >
              <strong
                className="text-record-value"
              >
                {
                  storedSideLesson(record,"noorania").totalLines > 0 ? formatSideLessonTotal(storedSideLesson(record,"noorania").totalFaces,10) : record.side_lesson
                }
              </strong>

              <EvaluationBadge
                value={
                  record.side_lesson_evaluation
                }
              />
            </RecordSection>
          )}

          {record.revision && (
            <RecordSection
              title="المراجعة"
              icon={
                <RefreshCw
                  size={13}
                />
              }
            >
              <strong
                className="text-record-value"
              >
                {record.revision}
              </strong>

              <div
                className="record-values"
              >
                <EvaluationBadge
                  value={
                    record.revision_evaluation
                  }
                />

                <FaceBadge
                  label="أوجه المراجعة"
                  value={
                    record.revision_faces
                  }
                />
              </div>
            </RecordSection>
          )}
        </>
      )}

      {/* NOTES */}

      {record.notes && (
        <div
          className="record-notes"
        >
          <MessageSquareText
            size={12}
          />

          {record.notes}
        </div>
      )}

      {/* FOOTER */}

      <div
        className="record-footer"
      >
        <div
          className="record-points"
        >
          <Trophy
            size={14}
          />

          {Number(
            record.points ||
              0
          ) > 0
            ? `+${record.points}`
            : record.points || 0}

          <span>
            نقطة
          </span>
        </div>

        <div
          className="record-actions"
        >
          <button
            type="button"
            className="record-edit"
            onClick={onEdit}
            disabled={
              deleting
            }
          >
            <Edit3
              size={13}
            />

            تعديل
          </button>

          <button
            type="button"
            className="record-delete"
            onClick={
              onDelete
            }
            disabled={
              deleting
            }
          >
            {deleting ? (
              <Loader2
                size={13}
                className="spin"
              />
            ) : (
              <Trash2
                size={13}
              />
            )}

            حذف
          </button>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   Record section
========================================================= */

function RecordSection({
  title,
  icon,
  children,
}) {
  return (
    <div
      className="record-section"
    >
      <div
        className="record-section-title"
      >
        {icon}

        {title}
      </div>

      <div
        className="record-section-content"
      >
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   Stat
========================================================= */

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
}) {
  return (
    <div
      className="recitation-stat"
    >
      <div
        className="recitation-stat-icon"
      >
        <Icon
          size={17}
        />
      </div>

      <div>
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
   Form Section
========================================================= */

function FormSection({
  icon,
  title,
  subtitle,
  summary = "",
  collapsible = false,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (collapsible) {
    return (
      <section className={`form-section compact-form-section ${open ? "open" : ""}`}>
        <button
          type="button"
          className="compact-form-section-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="form-section-icon">{icon}</span>
          <span className="compact-form-section-copy">
            <strong>{title}</strong>
            {summary && <small>{summary}</small>}
          </span>
          <ChevronDown className={open ? "open" : ""} size={18} />
        </button>

        {open && (
          <div className="compact-form-section-body">
            {children}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="form-section">
      <div className="form-section-header">
        <div className="form-section-icon">{icon}</div>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* =========================================================
   Select
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
}) {
  return (
    <div
      className="field"
    >
      <label
        className="field-label"
      >
        {label}

        {required && (
          <span
            className="required"
          >
            *
          </span>
        )}
      </label>

      <div
        className="select-wrap"
      >
        <select
          value={value}
          disabled={
            disabled
          }
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
        >
          {options.map(
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

        <ChevronDown
          size={15}
        />
      </div>
    </div>
  );
}

/* =========================================================
   Text
========================================================= */

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}) {
  return (
    <div
      className="field"
    >
      <label
        className="field-label"
      >
        {label}

        {required && (
          <span
            className="required"
          >
            *
          </span>
        )}
      </label>

      <input
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={
          placeholder
        }
      />
    </div>
  );
}

/* =========================================================
   Number
========================================================= */

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  min,
  step,
  suffix,
  required = false,
}) {
  return (
    <div
      className="field"
    >
      <label
        className="field-label"
      >
        {label}

        {required && (
          <span
            className="required"
          >
            *
          </span>
        )}
      </label>

      <div
        className="number-wrap"
      >
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          placeholder={
            placeholder
          }
        />

        {suffix && (
          <span>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Quran Smart Task
========================================================= */

function formatInterventionType(type) {
  if (type === "stabilization_partial") return "تثبيت جزئي";
  if (type === "stabilization_full") return "تثبيت كامل";
  if (type === "pause") return "إيقاف مؤقت";
  return "تدخل تربوي";
}



function PlannedQuranTask({
  title,
  assignment,
  amount,
  unit,
}) {
  if (!assignment) return null;

  const amountText =
    Number(amount || 0) > 0
      ? unit === "lines"
        ? `${amount} سطر`
        : `${formatFaces(amount)} وجه`
      : "";

  return (
    <div className="planned-quran-task compact">
      <div className="planned-quran-task-head">
        <div>
          <span>{title}</span>
          <strong>{formatGeneratedRange(assignment)}</strong>
        </div>

        {amountText && (
          <div className="planned-quran-speed">
            <Target size={13} />
            <span>{amountText}</span>
          </div>
        )}
      </div>

      {Array.isArray(assignment.route_segments) &&
        assignment.route_segments.length > 1 && (
          <div className="planned-quran-cycle-route">
            <div className="planned-quran-cycle-title">
              <RefreshCw size={13} />
              <span>المطلوب يلتف داخل نطاق المحفوظ</span>
            </div>

            {assignment.route_segments.map((segment, index) => (
              <div className="planned-quran-cycle-step" key={`${segment.kind || "route"}-${index}`}>
                <b>{index + 1}</b>
                <span>
                  {segment.label}: من {segment.fromSurah} {segment.fromAyah}
                  {" "}إلى{" "}
                  {segment.toSurah} {segment.toAyah}
                </span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}



function CompletionStatusSelector({
  value,
  onChange,
}) {
  const items = [
    { value: "exact", label: "أتم" },
    { value: "under", label: "أقل" },
    { value: "over", label: "أكثر" },
    { value: "repeat", label: "إعادة" },
  ];

  return (
    <div className="completion-status-block compact">
      <div className="completion-status-options compact">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className={
              value === item.value
                ? `completion-status-btn ${item.value} active`
                : `completion-status-btn ${item.value}`
            }
            onClick={() => onChange(item.value)}
          >
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuranActualEndEditor({
  label,
  toSurah,
  toAyah,
  onToSurah,
  onToAyah,
}) {
  const options = [
    { value: "", label: "اختر السورة" },
    ...surahs.map((surah) => ({
      value: surah,
      label: surah,
    })),
  ];

  return (
    <div className="actual-end-editor">
      <div className="actual-end-heading">
        <Edit3 size={15} />

        <strong>{label}</strong>
      </div>

      <div className="form-grid two">
        <SelectField
          label="آخر سورة"
          value={toSurah}
          onChange={onToSurah}
          options={options}
        />

        <NumberField
          label="آخر آية"
          value={toAyah}
          onChange={onToAyah}
          min="1"
          step="1"
          placeholder="رقم الآية"
        />
      </div>
    </div>
  );
}

/* =========================================================
   Quran Range
========================================================= */

function QuranRangeEditor({
  fromSurah,
  fromAyah,
  toSurah,
  toAyah,
  onFromSurah,
  onFromAyah,
  onToSurah,
  onToAyah,
}) {
  const options = [
    { value: "", label: "اختر السورة" },
    ...surahs.map((surah) => ({ value: surah, label: surah })),
  ];

  return (
    <div className="quran-range-editor">
      <div className="quran-range-side">
        <span className="quran-range-side-title">البداية</span>

        <div className="quran-range-fields">
          <SelectField
            label="من سورة"
            value={fromSurah}
            onChange={onFromSurah}
            options={options}
          />

          <NumberField
            label="من آية"
            value={fromAyah}
            onChange={onFromAyah}
            min="1"
            step="1"
            placeholder="1"
          />
        </div>
      </div>

      <div className="quran-range-arrow">
        <ChevronLeft size={18} />
      </div>

      <div className="quran-range-side">
        <span className="quran-range-side-title">النهاية الفعلية</span>

        <div className="quran-range-fields">
          <SelectField
            label="إلى سورة"
            value={toSurah}
            onChange={onToSurah}
            options={options}
          />

          <NumberField
            label="إلى آية"
            value={toAyah}
            onChange={onToAyah}
            min="1"
            step="1"
            placeholder="1"
          />
        </div>
      </div>
    </div>
  );
}

function RangeMetricPreview() {
  return null;
}

/* =========================================================
   Date
========================================================= */

function DateField({
  value,
  onChange,
  disabled = false,
}) {
  return (
    <div
      className="field"
    >
      <label
        className="field-label"
      >
        التاريخ
        <span
          className="required"
        >
          *
        </span>
      </label>

      <div
        className="date-input-wrap"
      >
        <CalendarDays
          size={15}
        />

        <CalendarInput

          value={value}
          max={getLocalDate()}
          disabled={disabled}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
        />
      </div>
    </div>
  );
}

/* =========================================================
   Quran Select
========================================================= */



/* =========================================================
   Noorania Amount — 10 lines = 1 page
========================================================= */

function NooraniaAmountField({
  label,
  value,
  unit,
  onValueChange,
  onUnitChange,
  required = false,
}) {
  const pages = nooraniaAmountToPages(value, unit);

  return (
    <div className="field noorania-amount-field">
      <label className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </label>

      <div className="noorania-amount-control">
        <input
          type="number"
          min="0"
          step={unit === "lines" ? "1" : "0.1"}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={unit === "lines" ? "1" : "0.5"}
        />

        <div className="noorania-unit-toggle">
          <button
            type="button"
            className={unit === "lines" ? "active" : ""}
            onClick={() => onUnitChange("lines")}
          >
            أسطر
          </button>
          <button
            type="button"
            className={unit === "faces" ? "active" : ""}
            onClick={() => onUnitChange("faces")}
          >
            صفحات
          </button>
        </div>
      </div>

      {Number(value || 0) > 0 && (
        <small className="noorania-pages-preview">
          = {formatFaces(pages)} صفحة
        </small>
      )}
    </div>
  );
}

/* =========================================================
   Evaluation
========================================================= */

function EvaluationSelector({
  label,
  value,
  onChange,
}) {
  return (
    <div
      className="evaluation-area"
    >
      <label
        className="field-label"
      >
        {label}
      </label>

      <div
        className="evaluation-grid"
      >
        {evaluations.map(
          (
            evaluation
          ) => {
            const active =
              value ===
              evaluation;

            const points =
              calculatePoints(
                evaluation
              );

            return (
              <button
                key={
                  evaluation
                }
                type="button"
                className={
                  `evaluation-option ${getEvaluationClass(
                    evaluation
                  )} ${
                    active
                      ? "active"
                      : ""
                  }`
                }
                onClick={() =>
                  onChange(
                    active
                      ? ""
                      : evaluation
                  )
                }
              >
                <span>
                  {
                    evaluation
                  }
                </span>

                <small aria-hidden="true">{points > 0 ? "•" : ""}</small>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Badges
========================================================= */

function EvaluationBadge({
  value,
}) {
  if (!value) {
    return (
      <span
        className="evaluation-badge neutral"
      >
        بدون تقييم
      </span>
    );
  }

  return (
    <span
      className={
        `evaluation-badge ${getEvaluationClass(
          value
        )}`
      }
    >
      {value}
    </span>
  );
}

function FaceBadge({
  label,
  value,
}) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return (
      <span
        className="face-badge legacy"
      >
        {label || "المقدار"}:
        {" "}
        غير محدد
      </span>
    );
  }

  return (
    <span
      className="face-badge"
    >
      <Hash
        size={11}
      />

      {label && (
        <>
          {label}
          {" • "}
        </>
      )}

      {formatFaces(
        value
      )}{" "}
      وجه
    </span>
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
      className="records-empty"
    >
      <div
        className="empty-icon"
      >
        <Icon
          size={25}
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

function LoadingState() {
  return (
    <div
      className="recitations-loading sadiq-loading-state"
    >
      <PageStyles />

      <div
        className="loading-icon"
      >
        <Loader2
          size={27}
          className="spin"
        />
      </div>

      <h3>
        جارٍ تجهيز نظام
        التسميع
      </h3>

      <p>
        يتم تحميل حلقات المعلم،
        الطلاب والسجلات...
      </p>
    </div>
  );
}

/* =========================================================
   Helpers
========================================================= */

function getLocalDate(
  date = new Date()
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function parseDate(
  dateString
) {
  return new Date(
    `${dateString}T12:00:00`
  );
}

/*
  تقويم أم القرى
*/

function formatHijriDate(
  dateString
) {
  if (!dateString) {
    return "—";
  }

  try {
    return displayDateFormatter(
      {
        weekday:
          "long",

        year:
          "numeric",

        month:
          "long",

        day:
          "numeric",
      }
    ).format(
      parseDate(
        dateString
      )
    );
  } catch {
    return dateString;
  }
}

function formatGregorianDate(
  dateString
) {
  if (!dateString) {
    return "—";
  }

  try {
    return displayDateFormatter(
      {
        year:
          "numeric",

        month:
          "long",

        day:
          "numeric",
      }
    ).format(
      parseDate(
        dateString
      )
    );
  } catch {
    return dateString;
  }
}

function roundFaces(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
}

function legacyLessonAmount(type) {
  const item = LESSON_AMOUNTS.find((entry) => entry.value === type);

  if (!item) {
    return { amount: "", unit: "lines" };
  }

  if (type === "three_lines") {
    return { amount: 3, unit: "lines" };
  }

  return { amount: item.faces, unit: "faces" };
}

function inferDailyFromTarget(targetFaces, sessions) {
  const total = Number(targetFaces || 0);
  const count = Number(sessions || 0);

  if (total <= 0 || count <= 0) {
    return { amount: "", unit: "lines" };
  }

  const dailyFaces = total / count;
  const lines = dailyFaces * 15;
  const roundedLines = Math.round(lines);

  if (
    dailyFaces < 1 &&
    Math.abs(lines - roundedLines) < 0.02
  ) {
    return { amount: roundedLines, unit: "lines" };
  }

  return { amount: roundFaces(dailyFaces), unit: "faces" };
}

function getHijriPartsForDate(dateString) {
  const parts = new Intl.DateTimeFormat(
    "en-US-u-ca-islamic-umalqura",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }
  ).formatToParts(parseDate(dateString));

  const result = {};

  parts.forEach((part) => {
    if (["year", "month", "day"].includes(part.type)) {
      result[part.type] = Number(part.value);
    }
  });

  return result;
}

const RECITATION_DAY_TO_JS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function isScheduledRecitationDate(dateString, days) {
  if (!Array.isArray(days) || days.length === 0) {
    return false;
  }

  const dayNumber = parseDate(dateString).getDay();

  return days.some(
    (day) => RECITATION_DAY_TO_JS[day] === dayNumber
  );
}

function getNextScheduledRecitationDate(
  dateString,
  days
) {
  const cursor = parseDate(
    dateString || getLocalDate()
  );

  const allowed =
    Array.isArray(days)
      ? days
          .map(
            (day) =>
              RECITATION_DAY_TO_JS[day]
          )
          .filter(
            (day) =>
              Number.isInteger(day)
          )
      : [];

  for (
    let offset = 1;
    offset <= 14;
    offset += 1
  ) {
    cursor.setDate(
      cursor.getDate() + 1
    );

    if (
      allowed.length === 0 ||
      allowed.includes(
        cursor.getDay()
      )
    ) {
      return getLocalDate(
        cursor
      );
    }
  }

  return getLocalDate(
    cursor
  );
}

function formatStoredLessonAmount(record) {
  const amount = Number(record?.lesson_amount_value || 0);
  const unit = record?.lesson_amount_unit;

  if (amount <= 0 || !unit) {
    return "";
  }

  if (unit === "lines") {
    return `${amount} ${amount === 1 ? "سطر" : amount === 2 ? "سطران" : "أسطر"}`;
  }

  return `${formatFaces(amount)} ${amount === 1 ? "صفحة" : "صفحات"}`;
}

function calculatePoints(
  value
) {
  switch (value) {
    case "ممتاز":
      return 2;

    case "جيد جداً":
      return 1;

    case "جيد":
      return 0;

    case "إعادة":
      return -1;

    default:
      return 0;
  }
}

function getEvaluationClass(
  value
) {
  if (
    value === "ممتاز"
  ) {
    return "excellent";
  }

  if (
    value === "جيد جداً"
  ) {
    return "very-good";
  }

  if (
    value === "جيد"
  ) {
    return "good";
  }

  if (
    value === "إعادة"
  ) {
    return "bad";
  }

  return "neutral";
}

function formatFaces(
  value
) {
  const number =
    Number(
      value || 0
    );

  if (
    Number.isInteger(
      number
    )
  ) {
    return String(
      number
    );
  }

  return Number(
    number.toFixed(2)
  ).toString();
}

function hasCompleteQuranRange(fromSurah, fromAyah, toSurah, toAyah) {
  return Boolean(
    String(fromSurah || "").trim() &&
    Number(fromAyah || 0) > 0 &&
    String(toSurah || "").trim() &&
    Number(toAyah || 0) > 0
  );
}

function hasAnyQuranRange(fromSurah, fromAyah, toSurah, toAyah) {
  return Boolean(
    String(fromSurah || "").trim() ||
    Number(fromAyah || 0) > 0 ||
    String(toSurah || "").trim() ||
    Number(toAyah || 0) > 0
  );
}

function formatRecordRange(fromSurah, fromAyah, toSurah, toAyah) {
  if (!hasCompleteQuranRange(fromSurah, fromAyah, toSurah, toAyah)) {
    return "";
  }

  if (String(fromSurah) === String(toSurah)) {
    return `${fromSurah} ${fromAyah} → ${toAyah}`;
  }

  return `${fromSurah} ${fromAyah} → ${toSurah} ${toAyah}`;
}

function formatGeneratedRange(range) {
  if (!range) return "—";

  return formatRecordRange(
    range.start_surah_name,
    range.start_ayah,
    range.end_surah_name,
    range.end_ayah
  );
}

function textOrNull(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(
      value
    ).trim();

  return text ||
    null;
}

function numberOrNull(
  value
) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function valueToString(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(
    value
  );
}

/* =========================================================
   CSS
========================================================= */

function PageStyles() {
  return (
    <style>
      {`
        .recitations-page {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          color: #0f172a;
        }

        .recitations-page * {
          box-sizing: border-box;
        }

        .recitations-page button,
        .recitations-page input,
        .recitations-page select,
        .recitations-page textarea {
          font-family: inherit;
        }

        /* =============================================
           HERO
        ============================================= */

        .recitations-hero {
          position: relative;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(18px * var(--app-density,1));

          padding: calc(22px * var(--app-density,1)) calc(24px * var(--app-density,1));
          margin-bottom: 16px;

          border:
            1px solid
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 10%,transparent);

          border-radius: calc(23px * var(--app-radius-scale,1));

          background:
            linear-gradient(
              135deg,
              #ffffff,
              var(--app-color-f5faf7,#f5faf7)
            );

          box-shadow:
            0 12px 34px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
        }

        .recitations-hero::after {
          content: "";

          position: absolute;

          width: 260px;
          height: 260px;

          left: -130px;
          top: -150px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(201,162,39,.14),
              transparent 68%
            );

          pointer-events: none;
        }

        .hero-main {
          position: relative;
          z-index: 2;

          display: flex;
          align-items: center;

          gap: calc(12px * var(--app-density,1));

          min-width: 0;
        }

        .hero-icon {
          width: 49px;
          height: 49px;

          flex: 0 0 49px;

          border-radius: calc(15px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #fff;

          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );

          box-shadow:
            0 10px 23px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 17%,transparent);
        }

        .hero-eyebrow {
          display: flex;
          align-items: center;
          gap: calc(5px * var(--app-density,1));

          margin-bottom: 3px;

          color: var(--app-color-0f766e,#0f766e);

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .hero-main h1 {
          margin: 0;

          color: var(--app-color-173d2b,#173d2b);

          font-size: calc(25px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .hero-main p {
          margin: 5px 0 0;

          color: #78857e;

          font-size: calc(11px * var(--app-font-scale,1));
          line-height: 1.7;
        }

        .hero-actions {
          position: relative;
          z-index: 2;

          display: flex;
          align-items: center;

          gap: calc(7px * var(--app-density,1));
        }

        .refresh-button,
        .create-button {
          min-height: 42px;

          padding: 0 calc(13px * var(--app-density,1));

          border-radius: calc(12px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(6px * var(--app-density,1));

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        .refresh-button {
          border:
            1px solid #dfe7e2;

          color: var(--app-color-0f5132,#0f5132);
          background: #fff;
        }

        .create-button {
          border: none;

          color: #fff;
        }

        .create-button.quran {
          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );
        }

        .create-button.noorania {
          background:
            linear-gradient(
              135deg,
              #9a741f,
              #b18a31
            );
        }

        .refresh-button:disabled,
        .create-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        /* =============================================
           SCOPE
        ============================================= */

        .recitation-scope {
          display: flex;
          align-items: center;

          gap: calc(7px * var(--app-density,1));

          margin-bottom: 16px;
          padding: calc(10px * var(--app-density,1)) calc(13px * var(--app-density,1));

          border:
            1px solid #dcebe3;

          border-radius: calc(13px * var(--app-radius-scale,1));

          color: #37624c;
          background: #f4faf6;

          font-size: calc(9px * var(--app-font-scale,1));
          line-height: 1.7;
        }

        /* =============================================
           HALAQA SESSION
        ============================================= */

        .halaqa-session-card {
          position: relative;
          overflow: hidden;
          margin-bottom: 18px;
          padding: calc(16px * var(--app-density,1));
          border: 1px solid #dfe9e3;
          border-radius: calc(19px * var(--app-radius-scale,1));
          background: #fff;
          box-shadow: 0 10px 28px rgba(15,81,50,.05);
        }

        .halaqa-session-card.active {
          border-color: color-mix(in srgb,var(--app-color-0f5132,#0f5132) 18%,#dfe9e3);
          background:
            radial-gradient(circle at 0 0,rgba(201,162,39,.10),transparent 34%),
            linear-gradient(135deg,#ffffff,#f7fbf8);
        }

        .halaqa-session-card.launcher {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .halaqa-session-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .halaqa-session-heading {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .halaqa-session-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #fff;
          background: linear-gradient(135deg,var(--app-color-0f5132,#0f5132),var(--app-color-0f766e,#0f766e));
          box-shadow: 0 8px 18px rgba(15,81,50,.13);
        }

        .halaqa-session-kicker {
          display: block;
          margin-bottom: 2px;
          color: #9a741f;
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .halaqa-session-heading h2 {
          margin: 0;
          color: var(--app-color-173d2b,#173d2b);
          font-size: calc(15px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .halaqa-session-heading p {
          margin: 4px 0 0;
          color: #728079;
          font-size: calc(9px * var(--app-font-scale,1));
          line-height: 1.7;
        }

        .halaqa-session-actions,
        .halaqa-session-launch-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .halaqa-session-launch-controls select,
        .halaqa-session-launch-controls input {
          min-height: 40px;
          border: 1px solid #dfe7e2;
          border-radius: 11px;
          padding: 0 10px;
          background: #fff;
          color: #28483a;
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 800;
          outline: none;
        }

        .session-start-button,
        .session-resume-button,
        .session-absent-button {
          min-height: 40px;
          border-radius: 11px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 950;
          cursor: pointer;
        }

        .session-start-button,
        .session-resume-button {
          border: none;
          color: #fff;
          background: linear-gradient(135deg,var(--app-color-0f5132,#0f5132),var(--app-color-0f766e,#0f766e));
        }

        .session-absent-button {
          border: 1px solid #ead9d4;
          color: #9b3a2b;
          background: #fff8f6;
        }

        .session-start-button:disabled,
        .session-resume-button:disabled,
        .session-absent-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .halaqa-session-progress {
          position: relative;
          height: 6px;
          overflow: hidden;
          margin: 14px 0 10px;
          border-radius: 999px;
          background: #e8efeb;
        }

        .halaqa-session-progress-bar {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: inherit;
          background: linear-gradient(90deg,var(--app-color-0f766e,#0f766e),#c9a227);
          transition: width .28s ease;
        }

        .halaqa-session-meta {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          color: #607168;
          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 800;
        }

        .halaqa-session-meta > div {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .halaqa-session-meta strong { color: #173d2b; }

        .halaqa-session-roster {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding-top: 12px;
          scrollbar-width: thin;
        }

        .session-student-chip {
          min-width: 126px;
          max-width: 180px;
          min-height: 38px;
          padding: 6px 8px;
          display: grid;
          grid-template-columns: 22px minmax(0,1fr) 16px;
          align-items: center;
          gap: 5px;
          border: 1px solid #e2e9e5;
          border-radius: 11px;
          color: #42564b;
          background: #fff;
          cursor: pointer;
          text-align: right;
        }

        .session-student-chip > span {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: #eef5f1;
          font-size: 8px;
          font-weight: 950;
        }

        .session-student-chip strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: calc(8px * var(--app-font-scale,1));
        }

        .session-student-chip.current {
          border-color: rgba(15,118,110,.38);
          box-shadow: 0 0 0 3px rgba(15,118,110,.06);
        }

        .session-student-chip.completed {
          color: #25734d;
          background: #f1faf5;
          border-color: #cde9d8;
        }

        .session-student-chip.absent {
          color: #9b3a2b;
          background: #fff7f5;
          border-color: #eed8d2;
        }

        .session-student-chip:disabled {
          cursor: default;
          opacity: .82;
        }

        .session-modal-progress {
          display: grid;
          grid-template-columns: auto minmax(140px,1fr) auto;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 11px 12px;
          border: 1px solid #dcebe3;
          border-radius: 13px;
          background: linear-gradient(135deg,#f8fcfa,#fff);
        }

        .session-modal-progress > div:first-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .session-modal-progress span,
        .session-modal-progress small {
          color: #718078;
          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 800;
        }

        .session-modal-progress strong {
          color: #173d2b;
          font-size: calc(10px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .session-modal-progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: #e6eeea;
        }

        .session-modal-progress-track i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg,var(--app-color-0f766e,#0f766e),#c9a227);
        }

        .session-modal-progress button {
          min-height: 34px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border: 1px solid #ead9d4;
          border-radius: 9px;
          color: #9b3a2b;
          background: #fff8f6;
          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 900;
          cursor: pointer;
        }

        /* =============================================
           STATS
        ============================================= */

        .recitation-stats {
          display: grid;

          grid-template-columns:
            repeat(
              5,
              minmax(0,1fr)
            );

          gap: calc(9px * var(--app-density,1));

          margin-bottom: 18px;
        }

        .recitation-stat {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: calc(9px * var(--app-density,1));

          padding: calc(13px * var(--app-density,1));

          border:
            1px solid #e6ece8;

          border-radius: calc(16px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 6px 20px
            rgba(15,23,42,.03);
        }

        .recitation-stat-icon {
          width: 36px;
          height: 36px;

          flex: 0 0 36px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .recitation-stat span {
          display: block;

          color: #7f8b83;

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 750;
        }

        .recitation-stat strong {
          display: block;

          margin-top: 1px;

          color: var(--app-color-173d2b,#173d2b);

          font-size: calc(18px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .recitation-stat small {
          display: block;

          margin-top: 1px;

          color: #9ba39e;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        /* =============================================
           FILTERS
        ============================================= */

        .records-toolbar {
          display: grid;

          grid-template-columns:
            minmax(230px,1fr)
            175px
            175px
            150px;

          gap: calc(8px * var(--app-density,1));

          padding: calc(12px * var(--app-density,1));
          margin-bottom: 18px;

          border:
            1px solid #e5ebe7;

          border-radius: calc(17px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 6px 20px
            rgba(15,23,42,.025);
        }

        .records-toolbar select,
        .records-search input {
          width: 100%;
          height: 41px;

          border:
            1px solid #dce4df;

          border-radius: calc(10px * var(--app-radius-scale,1));

          outline: none;

          color: #33443a;
          background: #fbfdfc;

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 700;
        }

        .records-toolbar select {
          padding: 0 calc(9px * var(--app-density,1));
        }

        .records-search {
          position: relative;
        }

        .records-search > svg {
          position: absolute;

          right: 12px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #8c9690;

          pointer-events: none;
        }

        .records-search input {
          padding:
            0 calc(37px * var(--app-density,1)) 0 calc(34px * var(--app-density,1));
        }

        .records-search button {
          position: absolute;

          left: 6px;
          top: 50%;

          width: 26px;
          height: 26px;

          transform:
            translateY(-50%);

          border: none;
          border-radius: calc(7px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #667169;
          background: #edf1ef;

          cursor: pointer;
        }

        /* =============================================
           RECORDS HEADER
        ============================================= */

        .records-title-row {
          margin-bottom: 11px;
        }

        .records-title-row h2 {
          margin: 0;

          color: var(--app-color-173d2b,#173d2b);

          font-size: calc(17px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .records-title-row p {
          margin: 3px 0 0;

          color: #909993;

          font-size: calc(8px * var(--app-font-scale,1));
        }

        /* =============================================
           RECORD GRID
        ============================================= */

        .records-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(
                min(100%,340px),
                1fr
              )
            );

          gap: calc(13px * var(--app-density,1));
        }

        .record-card {
          position: relative;
          overflow: hidden;

          min-width: 0;

          border:
            1px solid #e4eae6;

          border-radius: calc(19px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 7px 24px
            rgba(15,23,42,.035);

          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .record-card:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 13px 32px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 7.000000000000001%,transparent);
        }

        .record-accent {
          height: 3px;
        }

        .record-accent.quran {
          background:
            linear-gradient(
              90deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );
        }

        .record-accent.noorania {
          background:
            linear-gradient(
              90deg,
              #9a741f,
              #d1ab4d
            );
        }

        .record-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: calc(8px * var(--app-density,1));

          padding: calc(14px * var(--app-density,1)) calc(14px * var(--app-density,1)) calc(10px * var(--app-density,1));
        }

        .record-student {
          display: flex;
          align-items: center;

          gap: calc(8px * var(--app-density,1));

          min-width: 0;
        }

        .record-avatar {
          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .record-avatar.quran {
          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .record-avatar.noorania {
          color: #927536;
          background: #fff8e7;
        }

        .record-student h3 {
          margin: 0;

          overflow: hidden;

          color: #26382e;

          font-size: calc(12px * var(--app-font-scale,1));
          font-weight: 950;

          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .record-type-label {
          margin-top: 2px;

          color: #929b95;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .record-badges {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;

          gap: calc(4px * var(--app-density,1));
        }

        .type-badge,
        .legacy-badge {
          padding: calc(4px * var(--app-density,1)) calc(7px * var(--app-density,1));

          border-radius: 999px;

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .type-badge.quran {
          color: #047857;
          background: #ecfdf5;
        }

        .type-badge.noorania {
          color: #8a681e;
          background: #fff8e7;
        }

        .legacy-badge {
          color: #64748b;
          background: #f1f5f9;
        }

        /* DATE */

        .record-date {
          display: flex;
          align-items: flex-start;

          gap: calc(6px * var(--app-density,1));

          margin: 0 14px 9px;
          padding: calc(8px * var(--app-density,1)) calc(9px * var(--app-density,1));

          border-radius: calc(10px * var(--app-radius-scale,1));

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-f5faf7,#f5faf7);
        }

        .record-date strong {
          display: block;

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .record-date span {
          display: block;

          margin-top: 2px;

          color: #87928b;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        /* HALAQA */

        .record-halaqa {
          display: flex;
          flex-wrap: wrap;

          gap: calc(4px * var(--app-density,1)) calc(10px * var(--app-density,1));

          margin:
            0 14px 10px;

          color: #78857d;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .record-halaqa div {
          display: inline-flex;
          align-items: center;

          gap: calc(3px * var(--app-density,1));
        }

        /* SECTION */

        .record-section {
          margin:
            0 14px 8px;
          padding: calc(9px * var(--app-density,1));

          border:
            1px solid #edf1ef;

          border-radius: calc(11px * var(--app-radius-scale,1));

          background: #fbfdfc;
        }

        .record-section-title {
          display: flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          margin-bottom: 6px;

          color: #78847c;

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .record-section-content {
          color: #33443a;

          font-size: calc(9px * var(--app-font-scale,1));
        }

        .quran-text {
          display: inline-flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          color: #33443a;

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 800;
        }

        .quran-arrow {
          color: #a0aaa3;
        }

        .muted {
          color: #a0a7a2;
        }

        .record-values {
          display: flex;
          flex-wrap: wrap;

          gap: calc(5px * var(--app-density,1));

          margin-top: 7px;
        }

        .evaluation-badge,
        .face-badge {
          display: inline-flex;
          align-items: center;

          gap: calc(3px * var(--app-density,1));

          padding: calc(4px * var(--app-density,1)) calc(7px * var(--app-density,1));

          border-radius: 999px;

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .evaluation-badge.excellent {
          color: #047857;
          background: #e9f9ef;
        }

        .evaluation-badge.very-good {
          color: #0f766e;
          background: #edf8f7;
        }

        .evaluation-badge.good {
          color: #927536;
          background: #fff8e7;
        }

        .evaluation-badge.bad {
          color: #b42318;
          background: #fff0ef;
        }

        .evaluation-badge.neutral {
          color: #64748b;
          background: #f1f3f2;
        }

        .face-badge {
          color: #0f5132;
          background: #edf7f1;
        }

        .face-badge.legacy {
          color: #64748b;
          background: #f1f5f9;
        }

        .sub-record-line {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(7px * var(--app-density,1));

          padding: calc(4px * var(--app-density,1)) 0;
        }

        .text-record-value {
          color: #33443a;

          font-size: calc(9px * var(--app-font-scale,1));
        }

        /* NOTES */

        .record-notes {
          display: flex;
          align-items: flex-start;

          gap: calc(5px * var(--app-density,1));

          margin:
            0 14px 10px;
          padding: calc(8px * var(--app-density,1)) calc(9px * var(--app-density,1));

          border-radius: calc(10px * var(--app-radius-scale,1));

          color: #756843;
          background: #fffaf0;

          font-size: calc(7px * var(--app-font-scale,1));
          line-height: 1.6;
        }

        /* FOOTER */

        .record-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(8px * var(--app-density,1));

          padding:
            calc(10px * var(--app-density,1)) calc(14px * var(--app-density,1)) calc(13px * var(--app-density,1));

          border-top:
            1px solid #edf1ef;
        }

        .record-points {
          display: flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          color: #927536;

          font-size: calc(10px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .record-points span {
          color: #9aa39d;

          font-size: calc(6px * var(--app-font-scale,1));
          font-weight: 700;
        }

        .record-actions {
          display: flex;

          gap: calc(5px * var(--app-density,1));
        }

        .record-edit,
        .record-delete {
          min-height: 31px;

          padding: 0 calc(9px * var(--app-density,1));

          border-radius: calc(8px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(4px * var(--app-density,1));

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 850;

          cursor: pointer;
        }

        .record-edit {
          border:
            1px solid #b9d6c5;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-f5faf7,#f5faf7);
        }

        .record-delete {
          border:
            1px solid #f1d1ce;

          color: #b42318;
          background: #fff5f4;
        }

        /* =============================================
           MODAL
        ============================================= */

        .recitation-modal-overlay {
          position: fixed;
          inset: 0;

          z-index: 5000;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: calc(16px * var(--app-density,1));

          background:
            rgba(15,23,42,.58);

          backdrop-filter:
            blur(5px);
        }

        .recitation-modal {
          width:
            min(
              980px,
              100%
            );

          max-height:
            calc(
              100dvh - 32px
            );

          overflow-y: auto;

          border-radius: calc(24px * var(--app-radius-scale,1));

          background: #f8faf9;

          box-shadow:
            0 32px 90px
            rgba(15,23,42,.3);
        }

        .modal-header {
          position: sticky;
          top: 0;

          z-index: 20;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(10px * var(--app-density,1));

          padding: calc(15px * var(--app-density,1)) calc(17px * var(--app-density,1));

          border-bottom:
            1px solid #e8eeea;

          background:
            rgba(255,255,255,.97);

          backdrop-filter:
            blur(14px);
        }

        .modal-heading {
          display: flex;
          align-items: center;

          gap: calc(9px * var(--app-density,1));
        }

        .modal-icon {
          width: 39px;
          height: 39px;

          flex: 0 0 39px;

          border-radius: calc(12px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-icon.quran {
          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .modal-icon.noorania {
          color: #927536;
          background: #fff8e7;
        }

        .modal-eyebrow {
          color: #909993;

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 800;
        }

        .modal-heading h2 {
          margin: 1px 0 0;

          color: var(--app-color-173d2b,#173d2b);

          font-size: calc(15px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .modal-close {
          width: 37px;
          height: 37px;

          border: none;
          border-radius: calc(10px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #64748b;
          background: #f1f5f3;

          cursor: pointer;
        }

        .edit-notice {
          display: flex;
          align-items: center;

          gap: calc(6px * var(--app-density,1));

          padding: calc(9px * var(--app-density,1)) calc(16px * var(--app-density,1));

          border-bottom:
            1px solid #f0dfb7;

          color: #84651e;
          background: #fff8e7;

          font-size: calc(8px * var(--app-font-scale,1));
          line-height: 1.6;
        }

        .modal-body {
          padding: calc(15px * var(--app-density,1));
        }

        /* =============================================
           FORM SECTION
        ============================================= */

        .form-section {
          padding: calc(15px * var(--app-density,1));
          margin-bottom: 12px;

          border:
            1px solid #e5ebe7;

          border-radius: calc(17px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 4px 14px
            rgba(15,23,42,.02);
        }

        .form-section-header {
          display: flex;
          align-items: center;

          gap: calc(8px * var(--app-density,1));

          margin-bottom: 13px;
        }

        .form-section-icon {
          width: 34px;
          height: 34px;

          flex: 0 0 34px;

          border-radius: calc(10px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .form-section-header h3 {
          margin: 0;

          color: #26382e;

          font-size: calc(11px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .form-section-header p {
          margin: 2px 0 0;

          color: #939c96;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        /* =============================================
           INPUTS
        ============================================= */

        .form-grid {
          display: grid;

          gap: calc(10px * var(--app-density,1));
        }

        .form-grid.three {
          grid-template-columns:
            repeat(
              3,
              minmax(0,1fr)
            );
        }

        .form-grid.two {
          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );
        }

        .field {
          min-width: 0;
        }

        .field-label {
          display: flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          margin-bottom: 5px;

          color: #566259;

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .required {
          color: #b42318;

          margin-right: 2px;
        }

        .field input,
        .field select,
        .notes-box textarea {
          width: 100%;

          box-sizing: border-box;

          border:
            1px solid #dce4df;

          border-radius: calc(10px * var(--app-radius-scale,1));

          outline: none;

          color: #33443a;
          background: #fbfdfc;

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 650;
        }

        .field input,
        .field select {
          height: 40px;

          padding: 0 calc(9px * var(--app-density,1));
        }

        .field input:focus,
        .field select:focus,
        .notes-box textarea:focus {
          border-color:
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 45%,transparent);

          box-shadow:
            0 0 0 3px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
        }

        .field select:disabled {
          color: #7f8b83;
          background: #f3f5f4;

          cursor: not-allowed;
        }

        .select-wrap,
        .number-wrap,
        .date-input-wrap {
          position: relative;
        }

        .select-wrap select {
          appearance: none;

          padding-left: calc(30px * var(--app-density,1));
        }

        .select-wrap > svg {
          position: absolute;

          left: 10px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #859089;

          pointer-events: none;
        }

        .number-wrap input {
          padding-left: calc(45px * var(--app-density,1));
        }

        .number-wrap > span {
          position: absolute;

          left: 9px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #89938c;

          font-size: calc(7px * var(--app-font-scale,1));

          pointer-events: none;
        }

        .date-input-wrap > svg {
          position: absolute;

          right: 10px;
          top: 50%;

          transform:
            translateY(-50%);

          color: var(--app-color-0f5132,#0f5132);

          pointer-events: none;
        }

        .date-input-wrap input {
          padding-right: calc(33px * var(--app-density,1));
        }

        /* =============================================
           DUAL DATE
        ============================================= */

        .dual-date {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: calc(7px * var(--app-density,1));

          margin-top: 10px;
        }

        .dual-date > div {
          padding: calc(8px * var(--app-density,1)) calc(10px * var(--app-density,1));

          border-radius: calc(10px * var(--app-radius-scale,1));

          background: var(--app-color-f5faf7,#f5faf7);
        }

        .dual-date span {
          display: block;

          color: #8c9690;

          font-size: calc(6px * var(--app-font-scale,1));
        }

        .dual-date strong {
          display: block;

          margin-top: 2px;

          color: var(--app-color-0f5132,#0f5132);

          font-size: calc(8px * var(--app-font-scale,1));
        }

        /* =============================================
           QURAN RANGE
        ============================================= */

        .quran-range {
          display: grid;

          grid-template-columns:
            minmax(140px,1fr)
            minmax(90px,.55fr)
            25px
            minmax(140px,1fr)
            minmax(90px,.55fr);

          gap: calc(7px * var(--app-density,1));

          align-items: end;
        }

        .range-divider {
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #98a29c;

          font-size: calc(14px * var(--app-font-scale,1));
        }

        /* =============================================
           EVALUATIONS
        ============================================= */

        .evaluation-area {
          margin-top: 13px;
        }

        .evaluation-grid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0,1fr)
            );

          gap: calc(6px * var(--app-density,1));
        }

        .evaluation-option {
          min-height: 40px;

          border:
            1px solid #dfe5e1;

          border-radius: calc(10px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(4px * var(--app-density,1));

          padding: 0 calc(9px * var(--app-density,1));

          color: #606c64;
          background: #fff;

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 850;

          cursor: pointer;
        }

        .evaluation-option small {
          opacity: .7;
          font-size: calc(6px * var(--app-font-scale,1));
        }

        .evaluation-option.excellent.active {
          border-color: var(--app-color-0f5132,#0f5132);

          color: var(--app-color-0f5132,#0f5132);
          background: #e8f6ed;
        }

        .evaluation-option.very-good.active {
          border-color: var(--app-color-0f766e,#0f766e);

          color: var(--app-color-0f766e,#0f766e);
          background: var(--app-color-edf8f7,#edf8f7);
        }

        .evaluation-option.good.active {
          border-color: #c79d43;

          color: #927536;
          background: #fff8e7;
        }

        .evaluation-option.bad.active {
          border-color: #b42318;

          color: #b42318;
          background: #fff0ef;
        }

        /* =============================================
           LESSON AMOUNT
        ============================================= */

        .lesson-amount-block {
          margin-top: 13px;
        }

        .lesson-amount-grid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0,1fr)
            );

          gap: calc(6px * var(--app-density,1));
        }

        .amount-option {
          min-height: 52px;

          border:
            1px solid #dfe5e1;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          gap: calc(2px * var(--app-density,1));

          color: #59665e;
          background: #fff;

          cursor: pointer;
        }

        .amount-option strong {
          font-size: calc(9px * var(--app-font-scale,1));
        }

        .amount-option span {
          color: #97a09a;

          font-size: calc(6px * var(--app-font-scale,1));
        }

        .amount-option.active {
          border-color: var(--app-color-0f5132,#0f5132);

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);

          box-shadow:
            inset 0 0 0 1px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 8%,transparent);
        }

        .faces-preview {
          display: flex;
          align-items: center;

          gap: calc(5px * var(--app-density,1));

          margin-top: 7px;
          padding: calc(7px * var(--app-density,1)) calc(9px * var(--app-density,1));

          border-radius: calc(9px * var(--app-radius-scale,1));

          color: #66736a;
          background: #f5f8f6;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .faces-preview strong {
          color: var(--app-color-0f5132,#0f5132);
        }

        .evaluation-faces-grid {
          margin-top: 0;
        }

        /* =============================================
           BOTTOM FORM
        ============================================= */

        .bottom-form-grid {
          display: grid;

          grid-template-columns:
            190px
            minmax(0,1fr);

          gap: calc(10px * var(--app-density,1));
        }

        .points-preview {
          min-height: 135px;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          border:
            1px solid #f0e2c2;

          border-radius: calc(16px * var(--app-radius-scale,1));

          background:
            linear-gradient(
              145deg,
              #fffaf0,
              #fffdf8
            );
        }

        .points-icon {
          width: 37px;
          height: 37px;

          margin-bottom: 5px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #927536;
          background: #fff2cf;
        }

        .points-preview > span {
          color: #9b844f;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .points-preview > strong {
          margin-top: 2px;

          color: #8c6919;

          font-size: calc(23px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .points-preview > small {
          margin-top: 2px;

          color: #a99c7c;

          font-size: calc(6px * var(--app-font-scale,1));
        }

        .notes-box {
          padding: calc(13px * var(--app-density,1));

          border:
            1px solid #e5ebe7;

          border-radius: calc(16px * var(--app-radius-scale,1));

          background: #fff;
        }

        .notes-box textarea {
          min-height: 91px;

          padding: calc(9px * var(--app-density,1));

          resize: vertical;

          line-height: 1.7;
        }

        /* =============================================
           MODAL FOOTER
        ============================================= */

        .modal-footer {
          position: sticky;
          bottom: 0;

          z-index: 20;

          display: flex;
          justify-content: flex-end;

          gap: calc(7px * var(--app-density,1));

          padding: calc(12px * var(--app-density,1)) calc(16px * var(--app-density,1));

          border-top:
            1px solid #e7ede9;

          background:
            rgba(255,255,255,.97);

          backdrop-filter:
            blur(14px);
        }

        .modal-save,
        .modal-cancel {
          min-height: 40px;

          padding: 0 calc(15px * var(--app-density,1));

          border-radius: calc(10px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(5px * var(--app-density,1));

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        .modal-save {
          min-width: 135px;

          border: none;

          color: #fff;

          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );
        }

        .modal-cancel {
          border:
            1px solid #dce3df;

          color: #637068;
          background: #fff;
        }

        .modal-save:disabled,
        .modal-cancel:disabled {
          opacity: .55;
          cursor: wait;
        }

        /* =============================================
           EMPTY
        ============================================= */

        .records-empty {
          padding: calc(48px * var(--app-density,1)) calc(20px * var(--app-density,1));

          border:
            1px dashed #ccd8d1;

          border-radius: calc(19px * var(--app-radius-scale,1));

          text-align: center;

          background: #fff;
        }

        .empty-icon,
        .loading-icon {
          width: 54px;
          height: 54px;

          margin:
            0 auto 10px;

          border-radius: calc(16px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .records-empty h3,
        .recitations-loading h3 {
          margin: 0;

          color: #35453b;

          font-size: calc(13px * var(--app-font-scale,1));
        }

        .records-empty p,
        .recitations-loading p {
          margin: 4px 0 0;

          color: #8d9790;

          font-size: calc(8px * var(--app-font-scale,1));
        }

        .recitations-loading {
          min-height: 55vh;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          text-align: center;
        }

        /* =============================================
           ANIMATION
        ============================================= */

        @keyframes recitationSpin {
          to {
            transform:
              rotate(360deg);
          }
        }

        .spin {
          animation:
            recitationSpin
            .8s linear infinite;
        }

        /* =============================================
           TABLET
        ============================================= */

        @media (
          max-width: 1100px
        ) {
          .recitation-stats {
            grid-template-columns:
              repeat(
                3,
                minmax(0,1fr)
              );
          }

          .records-toolbar {
            grid-template-columns:
              1fr 1fr;
          }

          .records-search {
            grid-column:
              1 / -1;
          }

          .quran-range {
            grid-template-columns:
              1fr 1fr;

            gap: calc(9px * var(--app-density,1));
          }

          .range-divider {
            display: none;
          }
        }

        /* =============================================
           MOBILE
        ============================================= */

        @media (
          max-width: 720px
        ) {
          .recitations-hero {
            align-items:
              flex-start;

            padding: calc(17px * var(--app-density,1));

            border-radius: calc(19px * var(--app-radius-scale,1));
          }

          .hero-icon {
            width: 42px;
            height: 42px;

            flex-basis: 42px;
          }

          .hero-main h1 {
            font-size: calc(20px * var(--app-font-scale,1));
          }

          .hero-main p {
            display: none;
          }

          .hero-actions {
            gap: calc(5px * var(--app-density,1));
          }

          .refresh-button,
          .create-button {
            width: 40px;
            min-height: 40px;

            padding: 0;
          }

          .refresh-button span,
          .create-button span {
            display: none;
          }

          .recitation-stats {
            grid-template-columns:
              repeat(
                2,
                minmax(0,1fr)
              );

            gap: calc(7px * var(--app-density,1));
          }

          .recitation-stat {
            padding: calc(10px * var(--app-density,1));
          }

          .recitation-stat-icon {
            width: 32px;
            height: 32px;

            flex-basis: 32px;
          }

          .recitation-stat strong {
            font-size: calc(16px * var(--app-font-scale,1));
          }

          .records-toolbar {
            grid-template-columns:
              1fr;
          }

          .records-search {
            grid-column: auto;
          }

          /* MODAL */

          .recitation-modal-overlay {
            padding: calc(7px * var(--app-density,1));

            align-items:
              flex-end;
          }

          .recitation-modal {
            max-height: 95dvh;

            border-radius:
              calc(22px * var(--app-radius-scale,1)) calc(22px * var(--app-radius-scale,1))
              calc(10px * var(--app-radius-scale,1)) calc(10px * var(--app-radius-scale,1));
          }

          .modal-body {
            padding: calc(11px * var(--app-density,1));
          }

          .form-grid.three,
          .form-grid.two {
            grid-template-columns:
              1fr;
          }

          .dual-date {
            grid-template-columns:
              1fr;
          }

          .quran-range {
            grid-template-columns:
              1fr 1fr;
          }

          .evaluation-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .lesson-amount-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .bottom-form-grid {
            grid-template-columns:
              1fr;
          }

          .points-preview {
            min-height: 100px;
          }

          .modal-footer {
            padding: calc(10px * var(--app-density,1)) calc(12px * var(--app-density,1));
          }

          .modal-save,
          .modal-cancel {
            flex: 1;
          }

          .record-card:hover {
            transform: none;
          }
        }

        /* =============================================
           SMALL MOBILE
        ============================================= */

        @media (
          max-width: 430px
        ) {
          .recitations-hero {
            padding: calc(14px * var(--app-density,1));
          }

          .hero-main {
            gap: calc(8px * var(--app-density,1));
          }

          .hero-main h1 {
            font-size: calc(18px * var(--app-font-scale,1));
          }

          .hero-eyebrow {
            font-size: calc(7px * var(--app-font-scale,1));
          }

          .hero-icon {
            width: 38px;
            height: 38px;

            flex-basis: 38px;
          }

          .refresh-button,
          .create-button {
            width: 36px;
            min-height: 36px;
          }

          .recitation-scope {
            font-size: calc(7px * var(--app-font-scale,1));
          }

          .quran-range {
            grid-template-columns:
              1fr;
          }

          .evaluation-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .record-card-header {
            align-items:
              flex-start;
          }

          .record-footer {
            flex-direction:
              column;

            align-items:
              stretch;
          }

          .record-actions {
            display: grid;

            grid-template-columns:
              1fr 1fr;
          }

          .record-edit,
          .record-delete {
            width: 100%;
          }
        }

        /* =============================================
           QUICK PRO v1 — وضوح وسرعة
        ============================================= */

        .recitations-page {
          --quick-green: var(--app-color-0f4c45,#0f4c45);
          --quick-deep: var(--app-color-082f2a,#082f2a);
          --quick-gold: #d1b34c;
          --quick-ink: #173a33;
          --quick-muted: #6f827b;
          --quick-border: #dce6e2;
          color: var(--quick-ink);
        }

        .hero-eyebrow,
        .recitation-scope,
        .stat-card span,
        .stat-card small,
        .records-title-row p,
        .modal-eyebrow,
        .form-section-header p,
        .field-label,
        .field label,
        .dual-date span,
        .record-type-badge,
        .record-halaqa,
        .record-footer,
        .face-badge span,
        .evaluation-badge,
        .empty-state span {
          font-size: calc(12px * var(--app-font-scale,1));
          line-height: 1.55;
        }

        .hero-main h1 {
          font-size: calc(28px * var(--app-font-scale,1));
          line-height: 1.2;
        }

        .hero-main p {
          max-width: 700px;
          margin-top: 7px;
          font-size: calc(14px * var(--app-font-scale,1));
          line-height: 1.8;
          color: #667b73;
        }

        .recitation-scope {
          min-height: 48px;
          padding: calc(11px * var(--app-density,1)) calc(14px * var(--app-density,1));
          border-radius: calc(13px * var(--app-radius-scale,1));
        }

        .stat-card strong {
          font-size: calc(24px * var(--app-font-scale,1));
        }

        .records-toolbar input,
        .records-toolbar select,
        .field input,
        .field select,
        .field textarea,
        .select-field select,
        .text-field input,
        .number-field input,
        .date-field input {
          font-size: calc(14px * var(--app-font-scale,1));
        }

        .records-title-row h2,
        .form-section-header h3 {
          font-size: calc(17px * var(--app-font-scale,1));
        }

        .modal-header h2 {
          font-size: calc(22px * var(--app-font-scale,1));
          line-height: 1.3;
        }

        .recitation-modal {
          width: min(980px, 96vw);
          border-radius: calc(24px * var(--app-radius-scale,1));
        }

        .modal-body {
          padding: calc(18px * var(--app-density,1)) calc(20px * var(--app-density,1)) calc(24px * var(--app-density,1));
        }

        .form-section {
          border-radius: calc(17px * var(--app-radius-scale,1));
          padding: calc(16px * var(--app-density,1));
        }

        .quick-entry-banner {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: calc(11px * var(--app-density,1));
          align-items: center;
          margin-bottom: 13px;
          padding: calc(13px * var(--app-density,1)) calc(14px * var(--app-density,1));
          border: 1px solid rgba(209,179,76,.28);
          border-radius: calc(15px * var(--app-radius-scale,1));
          background:
            linear-gradient(
              135deg,
              #fffaf0,
              #fffdf8
            );
        }

        .quick-entry-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: calc(12px * var(--app-radius-scale,1));
          background: #f6e9b6;
          color: #8d6f16;
        }

        .quick-entry-banner strong {
          display: block;
          color: #6b5314;
          font-size: calc(14px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .quick-entry-banner span {
          display: block;
          margin-top: 4px;
          color: #887642;
          font-size: calc(12px * var(--app-font-scale,1));
          line-height: 1.7;
          font-weight: 700;
        }

        .quick-section-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(260px, .75fr);
          gap: calc(15px * var(--app-density,1));
          align-items: start;
        }

        .quick-amount-column,
        .quick-evaluation-column {
          min-width: 0;
        }

        .lesson-amount-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: calc(8px * var(--app-density,1));
        }

        .amount-option {
          min-height: 72px;
          border-radius: calc(13px * var(--app-radius-scale,1));
        }

        .amount-option strong {
          font-size: calc(14px * var(--app-font-scale,1));
        }

        .amount-option span {
          margin-top: 5px;
          font-size: calc(11px * var(--app-font-scale,1));
        }

        .quick-faces-preview {
          min-height: 42px;
          margin-top: 9px;
          font-size: calc(12px * var(--app-font-scale,1));
        }

        .evaluation-grid {
          gap: calc(8px * var(--app-density,1));
        }

        .evaluation-option {
          min-height: 50px;
          border-radius: calc(12px * var(--app-radius-scale,1));
          font-size: calc(13px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .quick-side-grid {
          align-items: end;
        }

        .quick-side-grid .text-field input {
          min-height: 46px;
        }

        .quick-record-values {
          justify-content: flex-start;
          gap: calc(8px * var(--app-density,1));
        }

        .quick-side-record {
          align-items: center;
          gap: calc(9px * var(--app-density,1));
        }

        .text-record-value {
          font-size: calc(13px * var(--app-font-scale,1));
          line-height: 1.55;
        }

        .record-card {
          border-radius: calc(18px * var(--app-radius-scale,1));
        }

        .record-student strong {
          font-size: calc(14px * var(--app-font-scale,1));
        }

        .record-student span,
        .record-date strong,
        .record-date span {
          font-size: calc(11px * var(--app-font-scale,1));
        }

        .record-section h4 {
          font-size: calc(12px * var(--app-font-scale,1));
        }

        .modal-save,
        .modal-cancel,
        .refresh-button,
        .create-button {
          font-size: calc(12px * var(--app-font-scale,1));
          font-weight: 900;
        }

        @media (max-width: 820px) {
          .quick-section-grid {
            grid-template-columns: 1fr;
          }

          .lesson-amount-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .recitation-modal {
            width: min(100%, 720px);
          }
        }

        @media (max-width: 520px) {
          .hero-main h1 {
            font-size: calc(23px * var(--app-font-scale,1));
          }

          .hero-main p {
            font-size: calc(13px * var(--app-font-scale,1));
          }

          .hero-eyebrow,
          .recitation-scope,
          .stat-card span,
          .stat-card small,
          .records-title-row p,
          .modal-eyebrow,
          .form-section-header p,
          .field-label,
          .field label,
          .dual-date span,
          .record-halaqa,
          .record-footer {
            font-size: calc(11px * var(--app-font-scale,1));
          }

          .lesson-amount-grid,
          .evaluation-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quick-entry-banner {
            grid-template-columns: 38px 1fr;
            padding: calc(11px * var(--app-density,1));
          }

          .quick-entry-icon {
            width: 37px;
            height: 37px;
          }

          .modal-body {
            padding: calc(13px * var(--app-density,1));
          }

          .form-section {
            padding: calc(13px * var(--app-density,1));
          }
        }


        /* =============================================
           SMART PLAN DEFAULT + FREE LESSON AMOUNT
        ============================================= */

        .plan-suggestion-card {
          display: grid;
          grid-template-columns: 43px 1fr;
          gap: calc(10px * var(--app-density,1));
          align-items: center;
          margin-bottom: 13px;
          padding: calc(12px * var(--app-density,1)) calc(13px * var(--app-density,1));
          border: 1px solid #cfe3dc;
          border-radius: calc(14px * var(--app-radius-scale,1));
          background: linear-gradient(135deg, #eef8f4, #fbfdfc);
        }

        .plan-suggestion-card.extra-day {
          border-color: #eadca7;
          background: linear-gradient(135deg, #fffaf0, #fffdf8);
        }

        .plan-suggestion-icon {
          width: 41px;
          height: 41px;
          display: grid;
          place-items: center;
          border-radius: calc(12px * var(--app-radius-scale,1));
          background: #dff1ea;
          color: var(--app-color-147a5e,#147a5e);
        }

        .plan-suggestion-card.extra-day .plan-suggestion-icon {
          background: #f8ebbd;
          color: #8d6f16;
        }

        .plan-suggestion-copy span,
        .plan-suggestion-copy strong,
        .plan-suggestion-copy small {
          display: block;
        }

        .plan-suggestion-copy span {
          color: #71857d;
          font-size: calc(10px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .plan-suggestion-copy strong {
          margin-top: 3px;
          color: #173f37;
          font-size: calc(13px * var(--app-font-scale,1));
          line-height: 1.45;
          font-weight: 950;
        }

        .plan-suggestion-copy small {
          margin-top: 4px;
          color: #70827b;
          font-size: calc(10px * var(--app-font-scale,1));
          line-height: 1.55;
          font-weight: 700;
        }

        .lesson-free-field {
          min-width: 0;
        }

        .lesson-free-control {
          display: grid;
          grid-template-columns: minmax(100px,1fr) auto;
          gap: calc(8px * var(--app-density,1));
        }

        .lesson-free-control > input {
          width: 100%;
          height: 48px;
          border: 1px solid #d9e3df;
          border-radius: calc(12px * var(--app-radius-scale,1));
          outline: none;
          padding: 0 calc(12px * var(--app-density,1));
          background: #fff;
          color: #23433b;
          font-family: inherit;
          font-size: calc(14px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .lesson-free-control > input:focus {
          border-color: #9fc8bc;
          box-shadow: 0 0 0 4px color-mix(in srgb,var(--app-color-0f4c45,#0f4c45) 6%,transparent);
        }

        .lesson-unit-switch {
          min-width: 145px;
          display: grid;
          grid-template-columns: repeat(2,1fr);
          overflow: hidden;
          border: 1px solid #d9e3df;
          border-radius: calc(12px * var(--app-radius-scale,1));
          background: #fff;
        }

        .lesson-unit-switch button {
          border: 0;
          background: transparent;
          color: #72857e;
          font-family: inherit;
          font-size: calc(11px * var(--app-font-scale,1));
          font-weight: 900;
          cursor: pointer;
        }

        .lesson-unit-switch button + button {
          border-right: 1px solid #e1e9e6;
        }

        .lesson-unit-switch button.active {
          background: #eaf7f1;
          color: var(--app-color-147a5e,#147a5e);
        }

        .lesson-free-hint {
          display: block;
          margin-top: 7px;
          color: #82938d;
          font-size: calc(10px * var(--app-font-scale,1));
          line-height: 1.5;
        }

        @media (max-width: 560px) {
          .lesson-free-control {
            grid-template-columns: 1fr;
          }

          .lesson-unit-switch {
            min-width: 0;
            min-height: 42px;
          }

          .plan-suggestion-card {
            grid-template-columns: 37px 1fr;
          }

          .plan-suggestion-icon {
            width: 36px;
            height: 36px;
          }
        }

        /* ===== Quiet recitation modal v2 ===== */
        .recitation-modal {
          width: min(840px, 100%) !important;
        }

        .modal-body {
          padding: calc(12px * var(--app-density,1)) !important;
        }

        .modal-header {
          padding: calc(12px * var(--app-density,1)) calc(14px * var(--app-density,1)) !important;
        }

        .modal-icon {
          width: 34px !important;
          height: 34px !important;
          flex-basis: 34px !important;
        }

        .modal-heading h2 {
          font-size: calc(13px * var(--app-font-scale,1)) !important;
        }

        .form-section {
          margin-bottom: 8px !important;
        }

        .compact-form-section-toggle {
          min-height: 50px !important;
          grid-template-columns: 30px minmax(0,1fr) auto !important;
          padding: 8px 10px !important;
        }

        .compact-form-section .form-section-icon {
          width: 30px !important;
          height: 30px !important;
          flex-basis: 30px !important;
        }

        .compact-form-section-copy strong {
          font-size: 10.5px !important;
        }

        .compact-form-section-copy small {
          margin-top: 2px !important;
          font-size: 8px !important;
        }

        .compact-form-section-body {
          gap: 8px !important;
          padding: 9px 10px 10px !important;
        }

        .field input,
        .field select {
          height: 38px !important;
        }

        .field-label {
          margin-bottom: 4px !important;
          font-size: calc(7.5px * var(--app-font-scale,1)) !important;
        }

        .evaluation-area {
          margin-top: 8px !important;
        }

        .evaluation-grid {
          gap: 5px !important;
        }

        .evaluation-option {
          min-height: 34px !important;
          justify-content: center !important;
          padding: 0 7px !important;
          font-size: calc(7.5px * var(--app-font-scale,1)) !important;
        }

        .evaluation-option small {
          display: none !important;
        }

        .planned-quran-task.compact {
          padding: 8px 9px !important;
        }

        .planned-quran-task-head > div > span {
          font-size: 8px !important;
        }

        .planned-quran-task-head > div > strong {
          font-size: 10px !important;
        }

        .planned-quran-cycle-route {
          display: grid;
          gap: 6px;
          margin-top: 9px;
          padding: 9px;
          border-radius: 12px;
          background: linear-gradient(145deg, rgba(235,248,242,.9), rgba(255,255,255,.96));
          border: 1px solid rgba(20,122,94,.1);
        }

        .planned-quran-cycle-title {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #1b6550;
          font-size: 9px;
          font-weight: 950;
        }

        .planned-quran-cycle-step {
          display: grid;
          grid-template-columns: 20px minmax(0,1fr);
          align-items: center;
          gap: 7px;
          padding: 6px 7px;
          border-radius: 9px;
          background: rgba(255,255,255,.82);
          color: #48675e;
          font-size: 8.5px;
          font-weight: 850;
          line-height: 1.6;
        }

        .planned-quran-cycle-step b {
          width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #e5f5ed;
          color: #17664e;
          font-size: 8px;
        }

        .planned-quran-speed {
          min-height: 28px !important;
          padding: 4px 7px !important;
          font-size: 8px !important;
        }

        .completion-status-options.compact .completion-status-btn {
          min-height: 33px !important;
        }

        .side-policy-none-state {
          align-items: center !important;
          padding: 9px 10px !important;
          border-radius: 11px !important;
        }

        .side-policy-none-state span {
          display: none !important;
        }

        .side-policy-none-state strong {
          font-size: 9px !important;
        }

        .side-lesson-full-range-edit {
          margin-top: 10px;
          padding: 12px;
          border: 1px solid rgba(24, 96, 78, .12);
          border-radius: 18px;
          background: rgba(250, 252, 251, .92);
        }

        .side-lesson-manual-amount {
          margin-top: 10px;
          padding: 12px;
          border: 1px solid rgba(24, 96, 78, .12);
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(248,252,250,.96), rgba(255,255,255,.98));
        }

        .side-lesson-manual-title {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 10px;
          color: #315e52;
          font-size: 12px;
          font-weight: 900;
        }

        .side-lesson-manual-controls {
          display: grid;
          grid-template-columns: minmax(90px,.8fr) minmax(110px,1fr) auto;
          gap: 8px;
          align-items: end;
        }

        .side-lesson-manual-apply {
          min-height: 44px;
          padding: 0 14px;
          border: 1px solid rgba(18,101,78,.14);
          border-radius: 13px;
          background: #edf7f3;
          color: #17654f;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .side-lesson-manual-apply:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        @media (max-width: 620px) {
          .side-lesson-manual-controls {
            grid-template-columns: 1fr 1fr;
          }

          .side-lesson-manual-apply {
            grid-column: 1 / -1;
          }
        }

        .side-policy-live-badge {
          margin-bottom: 0 !important;
          padding: 7px 9px !important;
          font-size: 8.5px !important;
        }

        .side-policy-live-badge small {
          display: none !important;
        }

        .completion-repeat-note {
          padding: 7px 9px !important;
          font-size: 8.5px !important;
        }

        .compact-noorania-grid {
          gap: 8px !important;
        }

        .bottom-form-grid {
          grid-template-columns: 128px minmax(0,1fr) !important;
          gap: 8px !important;
          margin-top: 8px !important;
        }

        .points-preview {
          min-height: 62px !important;
          padding: 7px 9px !important;
          display: grid !important;
          grid-template-columns: 28px 1fr auto !important;
          grid-template-rows: auto auto !important;
          align-items: center !important;
          justify-content: initial !important;
          column-gap: 7px !important;
          border-radius: 12px !important;
        }

        .points-icon {
          width: 28px !important;
          height: 28px !important;
          margin: 0 !important;
          grid-row: 1 / 3 !important;
        }

        .points-preview > span {
          font-size: 7px !important;
        }

        .points-preview > strong {
          margin: 0 !important;
          grid-row: 1 / 3 !important;
          grid-column: 3 !important;
          font-size: calc(17px * var(--app-font-scale,1)) !important;
        }

        .points-preview > small {
          margin: 0 !important;
          font-size: 6px !important;
        }

        .recitation-notes-details > summary {
          min-height: 38px !important;
        }

        .modal-footer {
          padding: calc(9px * var(--app-density,1)) calc(12px * var(--app-density,1)) !important;
        }

        .modal-save,
        .modal-cancel {
          min-height: 38px !important;
        }

        @media (max-width: 620px) {
          .recitation-modal-overlay {
            padding: 8px !important;
          }

          .recitation-modal {
            max-height: calc(100dvh - 16px) !important;
            border-radius: 18px !important;
          }

          .modal-body {
            padding: 9px !important;
          }

          .form-grid.three {
            grid-template-columns: 1fr 1fr !important;
          }

          .form-grid.three > :last-child {
            grid-column: 1 / -1;
          }

          .form-grid.two,
          .compact-noorania-grid {
            grid-template-columns: 1fr !important;
          }

          .compact-form-section-toggle {
            min-height: 48px !important;
          }

          .bottom-form-grid {
            grid-template-columns: 1fr !important;
          }

          .points-preview {
            grid-template-columns: 28px 1fr auto !important;
            min-height: 54px !important;
          }
        }

        .noorania-amount-control {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 6px;
          align-items: stretch;
        }

        .noorania-amount-control > input {
          width: 100%;
          height: 38px;
          border: 1px solid #dce4df;
          border-radius: 10px;
          outline: none;
          padding: 0 9px;
          color: #33443a;
          background: #fbfdfc;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
        }

        .noorania-unit-toggle {
          display: grid;
          grid-template-columns: repeat(2,auto);
          gap: 3px;
          padding: 3px;
          border-radius: 10px;
          background: #f0f4f1;
        }

        .noorania-unit-toggle button {
          min-width: 52px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #718079;
          font-family: inherit;
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .noorania-unit-toggle button.active {
          background: #fff;
          color: #175b47;
          box-shadow: 0 2px 8px rgba(17,79,61,.08);
        }

        .noorania-pages-preview {
          display: block;
          margin-top: 4px;
          color: #8b753d;
          font-size: 7.5px;
          font-weight: 850;
        }

        @media (max-width: 520px) {
          .noorania-amount-control {
            grid-template-columns: 1fr;
          }

          .noorania-unit-toggle {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .noorania-unit-toggle button {
            min-height: 30px;
          }
        }

        /* ===== Compact recitation modal ===== */
        .recitation-plan-brief {
          min-height: 38px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          margin-bottom: 8px;
          border: 1px solid rgba(22,92,69,.10);
          border-radius: 11px;
          background: #f3f8f5;
          color: #2a6652;
          font-size: 9.5px;
          font-weight: 900;
        }

        .recitation-plan-brief small {
          margin-right: auto;
          color: #9b792c;
          font-size: 8px;
        }

        .compact-form-section {
          padding: 0 !important;
          overflow: hidden;
          border-radius: 14px !important;
          box-shadow: none !important;
        }

        .compact-form-section-toggle {
          width: 100%;
          min-height: 56px;
          display: grid;
          grid-template-columns: 34px minmax(0,1fr) auto;
          align-items: center;
          gap: 9px;
          padding: 9px 11px;
          border: 0;
          background: #fff;
          color: #2f5548;
          font-family: inherit;
          text-align: right;
          cursor: pointer;
        }

        .compact-form-section.open .compact-form-section-toggle {
          border-bottom: 1px solid rgba(24,86,66,.08);
          background: linear-gradient(135deg,#f6faf8,#fffdf7);
        }

        .compact-form-section-copy {
          min-width: 0;
        }

        .compact-form-section-copy strong {
          display: block;
          color: #24483b;
          font-size: 11px;
          font-weight: 950;
        }

        .compact-form-section-copy small {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          color: #83908b;
          font-size: 8.5px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .compact-form-section-toggle > svg:last-child {
          color: #73827c;
          transition: transform .18s ease;
        }

        .compact-form-section-toggle > svg.open:last-child {
          transform: rotate(180deg);
        }

        .compact-form-section-body {
          display: grid;
          gap: 10px;
          padding: 10px 11px 12px;
        }

        .planned-quran-task.compact {
          margin: 0 !important;
          padding: 9px 10px !important;
          border-radius: 11px !important;
        }

        .planned-quran-task.compact .planned-quran-task-meta {
          display: none !important;
        }

        .completion-status-block.compact {
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
        }

        .completion-status-options.compact {
          grid-template-columns: repeat(4,minmax(0,1fr)) !important;
          gap: 6px !important;
        }

        .completion-status-options.compact .completion-status-btn {
          min-height: 36px !important;
          padding: 6px !important;
        }

        .completion-status-options.compact .completion-status-btn span {
          display: none !important;
        }

        .completion-status-options.compact .completion-status-btn strong {
          font-size: 9px !important;
        }

        .actual-end-editor {
          padding: 9px !important;
        }

        .actual-end-heading {
          margin-bottom: 7px !important;
        }

        .actual-end-heading > strong {
          font-size: 9px !important;
        }

        .secondary-side-details > summary {
          min-height: 40px !important;
          font-size: 9px !important;
        }

        .recitation-notes-details {
          border: 1px solid rgba(24,86,66,.09);
          border-radius: 12px;
          background: #fafcfb;
          overflow: hidden;
        }

        .recitation-notes-details > summary {
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          color: #60746c;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
          list-style: none;
        }

        .recitation-notes-details > summary::-webkit-details-marker {
          display: none;
        }

        .recitation-notes-details .notes-box.compact {
          margin: 0 !important;
          padding: 0 10px 10px !important;
        }

        .recitation-notes-details .notes-box.compact textarea {
          min-height: 74px !important;
        }

        .form-section:not(.compact-form-section) .form-section-header p {
          display: none;
        }

        @media (max-width: 620px) {
          .compact-form-section-toggle {
            min-height: 52px;
            grid-template-columns: 31px minmax(0,1fr) auto;
            padding: 8px 9px;
          }

          .completion-status-options.compact {
            grid-template-columns: repeat(4,minmax(0,1fr)) !important;
          }

          .completion-status-options.compact .completion-status-btn {
            min-width: 0 !important;
          }

          .form-grid.three {
            grid-template-columns: 1fr !important;
          }
        }

        .quran-engine-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid rgba(16, 86, 66, 0.16);
          border-radius: 18px;
          background:
            radial-gradient(circle at top left, rgba(201, 166, 88, 0.12), transparent 34%),
            linear-gradient(135deg, rgba(248, 252, 249, 0.98), rgba(255, 255, 255, 0.98));
          margin-bottom: 14px;
        }

        .quran-engine-banner strong,
        .quran-engine-banner span {
          display: block;
        }

        .quran-engine-banner strong {
          color: #123f33;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .quran-engine-banner span {
          color: #60736d;
          font-size: 12px;
          line-height: 1.7;
        }

        .side-policy-live-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          padding: 9px 11px;
          border-radius: 13px;
          background: rgba(68, 101, 72, 0.08);
          color: #426144;
        }
        .side-policy-live-badge small { margin-right: auto; color: #858f86; }
        .side-policy-none-state {
          display:flex;
          align-items:flex-start;
          gap:10px;
          padding:14px;
          border:1px dashed #d8dfd5;
          border-radius:16px;
          background:#fbfcfa;
          color:#667168;
        }
        .side-policy-none-state strong { display:block; color:#354838; }
        .side-policy-none-state span { display:block; margin-top:3px; font-size:12px; }

        .planned-quran-task {
          border: 1px solid rgba(18, 92, 70, 0.15);
          border-radius: 17px;
          padding: 13px 14px;
          background:
            radial-gradient(circle at top left, rgba(201,166,88,.11), transparent 38%),
            linear-gradient(135deg, rgba(244,250,247,.96), rgba(255,255,255,.99));
          box-shadow: 0 8px 24px rgba(25, 74, 60, 0.05);
        }

        .planned-quran-task-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .planned-quran-task-head span,
        .planned-quran-task-head strong {
          display: block;
        }

        .planned-quran-task-head > div:first-child > span {
          color: #6d7f79;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .planned-quran-task-head > div:first-child > strong {
          color: #123f33;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.7;
        }

        .planned-quran-speed {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(201,166,88,.12);
          color: #806628;
          font-size: 10px;
          font-weight: 900;
        }

        .planned-quran-task-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 9px;
        }

        .planned-quran-task-meta span {
          padding: 5px 8px;
          border-radius: 9px;
          background: rgba(20,122,94,.07);
          color: #547168;
          font-size: 9px;
          font-weight: 850;
        }

        .completion-status-block {
          margin-top: 12px;
        }

        .completion-status-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }

        .completion-status-heading span {
          color: #315d50;
          font-size: 11px;
          font-weight: 950;
        }

        .completion-status-heading small {
          color: #8a9893;
          font-size: 9px;
        }

        .completion-status-options {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 8px;
        }

        .completion-status-btn {
          min-height: 60px;
          border: 1px solid #e1e9e6;
          border-radius: 14px;
          padding: 8px;
          background: #fff;
          color: #60736c;
          font-family: inherit;
          cursor: pointer;
          transition: .18s ease;
        }

        .completion-status-btn strong,
        .completion-status-btn span {
          display: block;
        }

        .completion-status-btn strong {
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 3px;
        }

        .completion-status-btn span {
          font-size: 8px;
          line-height: 1.45;
          opacity: .82;
        }

        .completion-status-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(20,122,94,.28);
        }

        .completion-status-btn.active {
          border-color: rgba(20,122,94,.34);
          background: #edf8f3;
          color: #12684f;
          box-shadow: 0 7px 18px rgba(20,122,94,.08);
        }

        .completion-status-btn.under.active {
          border-color: rgba(181,126,26,.28);
          background: #fff9e9;
          color: #87651d;
        }

        .completion-status-btn.over.active {
          border-color: rgba(23,105,149,.24);
          background: #eef8fc;
          color: #236885;
        }

        .completion-status-btn.repeat.active {
          border-color: rgba(154,68,68,.22);
          background: #fff2f2;
          color: #914747;
        }

        .actual-end-editor {
          margin-top: 11px;
          padding: 12px;
          border: 1px dashed rgba(20,122,94,.28);
          border-radius: 15px;
          background: rgba(248,252,250,.92);
        }

        .actual-end-heading {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 10px;
          color: #315d50;
        }

        .actual-end-heading strong,
        .actual-end-heading span {
          display: block;
        }

        .actual-end-heading strong {
          font-size: 11px;
          font-weight: 950;
        }

        .actual-end-heading span {
          margin-top: 2px;
          color: #7d8d87;
          font-size: 9px;
        }

        .completion-repeat-note {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 10px;
          padding: 9px 11px;
          border-radius: 12px;
          background: #fff5f5;
          color: #8b4949;
          font-size: 10px;
          font-weight: 800;
        }

        .quran-range-editor {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 34px minmax(0, 1fr);
          gap: 10px;
          align-items: end;
        }

        .quran-range-side {
          border: 1px solid #e3ebe7;
          border-radius: 16px;
          padding: 12px;
          background: #fbfdfc;
        }

        .quran-range-side-title {
          display: block;
          margin-bottom: 8px;
          color: #3f6257;
          font-size: 11px;
          font-weight: 900;
        }

        .quran-range-fields {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(90px, .65fr);
          gap: 8px;
        }

        .quran-range-arrow {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: #9a7b35;
          background: rgba(201, 166, 88, 0.12);
          margin-bottom: 20px;
        }

        .range-metric-preview {
          margin-top: 10px;
          border-radius: 15px;
          border: 1px solid #e3ebe7;
          min-height: 48px;
        }

        .range-metric-preview.empty,
        .range-metric-preview.loading {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 13px;
          color: #72817c;
          background: #fbfdfc;
          font-size: 12px;
        }

        .range-metric-preview.ready {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
          gap: 8px;
          padding: 10px;
          background: linear-gradient(135deg, rgba(239, 248, 244, .9), rgba(255,255,255,.98));
        }

        .range-metric-preview.ready > div:not(.range-source-chip) {
          padding: 7px 9px;
          border-radius: 11px;
          background: rgba(255,255,255,.88);
        }

        .range-metric-preview.ready span,
        .range-metric-preview.ready strong {
          display: block;
        }

        .range-metric-preview.ready span {
          color: #71817b;
          font-size: 10px;
          margin-bottom: 3px;
        }

        .range-metric-preview.ready strong {
          color: #163f34;
          font-size: 12px;
          font-weight: 900;
        }

        .range-source-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0 9px;
          border-radius: 11px;
          color: #7b632b;
          background: rgba(201,166,88,.11);
          font-size: 10px;
          font-weight: 900;
        }

        .precision-warning {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          margin-top: 8px;
          color: #7f6427;
          font-size: 11px;
          line-height: 1.6;
        }

        .secondary-side-details {
          border: 1px dashed #dbe6e1;
          border-radius: 16px;
          background: rgba(250,252,251,.75);
          padding: 0 14px;
          margin: 12px 0;
        }

        .secondary-side-details summary {
          min-height: 46px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #526b63;
          font-size: 12px;
          font-weight: 900;
        }

        .secondary-side-body {
          padding: 0 0 14px;
        }

        .quran-range-record {
          color: #173f34;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.65;
        }

        @media (max-width: 760px) {
          .halaqa-session-card.launcher,
          .halaqa-session-top {
            align-items: stretch;
            flex-direction: column;
          }

          .halaqa-session-actions,
          .halaqa-session-launch-controls {
            width: 100%;
          }

          .halaqa-session-launch-controls select,
          .halaqa-session-launch-controls input,
          .session-start-button,
          .session-resume-button,
          .session-absent-button {
            flex: 1 1 150px;
          }

          .session-modal-progress {
            grid-template-columns: 1fr;
          }

          .completion-status-options {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .completion-status-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .planned-quran-task-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .planned-quran-speed {
            align-self: flex-start;
          }

          .quran-range-editor {
            grid-template-columns: 1fr;
          }

          .quran-range-arrow {
            transform: rotate(-90deg);
            margin: -2px auto;
          }

          .quran-range-fields {
            grid-template-columns: 1fr 92px;
          }

          .range-metric-preview.ready {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .range-source-chip {
            min-height: 38px;
            justify-content: center;
          }
        }
      `}
    </style>
  );
}
