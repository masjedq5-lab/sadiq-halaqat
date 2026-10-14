import CompactPageHeader from "../../components/CompactPageHeader";
// src/pages/teacher/Exams.jsx
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { AlertTriangle, Award, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleGauge, Clock3, Eye, FileCheck2, GraduationCap, Loader2, Minus, Play, Plus, RefreshCw, Search, ShieldCheck, Trophy, Users, X } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import {
  EXAM_STATUS_META,
  deriveExamStatus,
  formatHijri,
} from "../examV2Utils";

import "./TeacherExamsV2.css";

function gradeLabel(score) {
  const value = Number(score || 0);

  if (value >= 95) return "ممتاز مرتفع";
  if (value >= 90) return "ممتاز";
  if (value >= 85) return "جيد جدًا مرتفع";
  if (value >= 80) return "جيد جدًا";
  if (value >= 75) return "جيد مرتفع";
  if (value >= 70) return "جيد";
  if (value >= 60) return "مقبول";

  return "لم يجتز";
}

function scoreNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(1);
}

function studentState(student) {
  if (student?.result) {
    return {
      key: "approved",
      label: "معتمد",
      tone: "success",
    };
  }

  const status = student?.attempt?.status;

  if (status === "completed") {
    return {
      key: "completed",
      label: "جاهز للاعتماد",
      tone: "gold",
    };
  }

  if (status === "in_progress") {
    return {
      key: "in_progress",
      label: "جارٍ الاختبار",
      tone: "green",
    };
  }

  return {
    key: "not_started",
    label: "لم يبدأ",
    tone: "neutral",
  };
}

export default function TeacherExams() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [exams, setExams] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [questionFilter, setQuestionFilter] = useState("all");

  const [selectedExam, setSelectedExam] = useState(null);
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard(silent = false) {
    if (!silent) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase.rpc(
        "teacher_exam_dashboard_v2"
      );

      if (error) throw error;

      setTeacher(data?.teacher || null);
      setExams(
        Array.isArray(data?.exams)
          ? data.exams
          : []
      );
    } catch (error) {
      console.error("TEACHER EXAMS DASHBOARD:", error);

      showToast(
        error.message ||
          "تعذر تحميل اختبارات المعلم",
        "error"
      );

      setExams([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function openStudent(exam, student) {
    setSessionLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        "teacher_start_exam_attempt_v2",
        {
          p_exam_id: Number(exam.id),
          p_student_id: Number(student.student_id),
        }
      );

      if (error) throw error;

      setSession(data);
    } catch (error) {
      console.error("START EXAM ATTEMPT:", error);

      const map = {
        EXAM_NOT_STARTED:
          "لم تبدأ مدة الاختبار بعد.",
        EXAM_CLOSED:
          "انتهت مدة الاختبار ولا يمكن بدء طالب جديد.",
        STUDENT_QUESTIONS_INCOMPLETE:
          "أسئلة هذا الطالب غير مكتملة. راجع المشرف.",
        STUDENT_NOT_ASSIGNED_TO_TEACHER:
          "هذا الطالب غير معيّن لك في هذا الاختبار.",
      };

      showToast(
        map[error.message] ||
          error.message ||
          "تعذر فتح اختبار الطالب",
        "error"
      );
    } finally {
      setSessionLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();

    return exams.filter((exam) => {
      const status = deriveExamStatus(exam);

      if (
        statusFilter !== "all" &&
        status !== statusFilter
      ) {
        return false;
      }

      if (
        questionFilter !== "all" &&
        Number(exam.questions_count || 3) !==
          Number(questionFilter)
      ) {
        return false;
      }

      if (!text) return true;

      const haystack = [
        exam.title,
        exam.mosque_name,
        ...(exam.halaqa_names || []),
        ...(exam.students || []).map(
          (student) => student.student_name
        ),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(text);
    });
  }, [
    exams,
    search,
    statusFilter,
    questionFilter,
  ]);

  const stats = useMemo(() => {
    const students = exams.flatMap(
      (exam) => exam.students || []
    );

    const active = exams.filter(
      (exam) =>
        deriveExamStatus(exam) === "active"
    ).length;

    const approved = students.filter(
      (student) => student.result
    ).length;

    const inProgress = students.filter(
      (student) =>
        student.attempt?.status === "in_progress"
    ).length;

    const scores = students
      .map((student) =>
        Number(student.result?.score)
      )
      .filter((score) => Number.isFinite(score));

    const average = scores.length
      ? Math.round(
          (scores.reduce(
            (sum, value) => sum + value,
            0
          ) /
            scores.length) *
            10
        ) / 10
      : 0;

    return {
      exams: exams.length,
      active,
      students: students.length,
      inProgress,
      approved,
      average,
    };
  }, [exams]);

  if (loading) {
    return (
      <div className="tex-page">
        <div className="tex-loading">
          <Loader2
            className="tex-spin"
            size={27}
          />
          جارٍ تجهيز اختباراتك…
        </div>
      </div>
    );
  }

  return (
    <div className="tex-page" dir="rtl">
      <CompactPageHeader title="اختباراتي" />

      <section className="teacher-exams-stats tex-stats">
        <Stat
          icon={FileCheck2}
          label="اختباراتي"
          value={stats.exams}
          note="المرفوعة لك"
        />

        <Stat
          icon={CircleGauge}
          label="جارٍ الآن"
          value={stats.active}
          note="ضمن المدة"
        />

        <Stat
          icon={Users}
          label="طلابي"
          value={stats.students}
          note="المعيّنون لك"
        />

        <Stat
          icon={Play}
          label="جارٍ الاختبار"
          value={stats.inProgress}
          note="محاولات مفتوحة"
        />

        <Stat
          icon={CheckCircle2}
          label="نتائج معتمدة"
          value={stats.approved}
          note="تم إنهاؤها"
        />

        <Stat
          icon={Award}
          label="متوسط النتائج"
          value={`${scoreNumber(
            stats.average
          )}%`}
          note="لنتائجك المعتمدة"
        />
      </section>

      <section className="tex-toolbar">
        <Field label="بحث">
          <div className="tex-search">
            <Search size={15} />

            <input
              className="tex-control"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="اسم الاختبار أو الطالب..."
            />
          </div>
        </Field>

        <Field label="حالة الاختبار">
          <select
            className="tex-control"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">
              كل الحالات
            </option>

            {Object.entries(
              EXAM_STATUS_META
            )
              .filter(
                ([key]) => key !== "draft"
              )
              .map(([key, meta]) => (
                <option
                  value={key}
                  key={key}
                >
                  {meta.label}
                </option>
              ))}
          </select>
        </Field>

        <Field label="عدد الأسئلة">
          <select
            className="tex-control"
            value={questionFilter}
            onChange={(event) =>
              setQuestionFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              3 و 6 أسئلة
            </option>
            <option value="3">
              3 أسئلة
            </option>
            <option value="6">
              6 أسئلة
            </option>
          </select>
        </Field>

        <button
          type="button"
          className="tex-refresh"
          onClick={() =>
            loadDashboard()
          }
        >
          <RefreshCw size={15} />
          تحديث
        </button>
      </section>

      {!filtered.length ? (
        <div className="tex-empty">
          <GraduationCap size={30} />

          <strong>
            لا توجد اختبارات مطابقة
          </strong>

          <span>
            ستظهر هنا الاختبارات المعتمدة التي
            عُيّنت لك فيها مجموعة من الطلاب.
          </span>
        </div>
      ) : (
        <section className="tex-grid">
          {filtered.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onOpen={() =>
                setSelectedExam(exam)
              }
            />
          ))}
        </section>
      )}

      {selectedExam && (
        <ExamStudentsModal
          exam={selectedExam}
          onClose={() =>
            setSelectedExam(null)
          }
          onOpenStudent={(student) =>
            openStudent(
              selectedExam,
              student
            )
          }
          sessionLoading={sessionLoading}
        />
      )}

      {session && (
        <AssessmentModal
          initialSession={session}
          onClose={async () => {
            setSession(null);
            await loadDashboard(true);
          }}
          onApproved={async () => {
            await loadDashboard(true);
          }}
        />
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
}) {
  return (
    <article className="tex-stat">
      <div className="tex-stat-icon">
        <Icon size={19} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <div className="tex-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function ExamCard({
  exam,
  onOpen,
}) {
  const status = deriveExamStatus(exam);
  const meta =
    EXAM_STATUS_META[status] ||
    EXAM_STATUS_META.active;

  const students = exam.students || [];

  const approved = students.filter(
    (student) => student.result
  ).length;

  const progress = students.length
    ? Math.round(
        (approved / students.length) *
          100
      )
    : 0;

  return (
    <article className="tex-card">
      <div className="tex-card-top">
        <div>
          <h3>{exam.title}</h3>

          <p>
            {exam.mosque_name || "—"} •{" "}
            {exam.questions_count || 3} أسئلة
          </p>
        </div>

        <span
          className={`tex-status ${meta.tone}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="tex-card-meta">
        <Meta
          label="الحلقات"
          value={
            exam.halaqa_names?.length
              ? exam.halaqa_names.join("، ")
              : "—"
          }
        />

        <Meta
          label="الطلاب المعيّنون لك"
          value={`${students.length} طالب`}
        />

        <Meta
          label="بداية الاختبار"
          value={formatHijri(
            exam.start_date
          )}
        />

        <Meta
          label="نهاية الاختبار"
          value={formatHijri(
            exam.end_date
          )}
        />
      </div>

      <div className="tex-progress">
        <div className="tex-progress-head">
          <span>إنجاز نتائجك</span>

          <strong>
            {approved} / {students.length}
          </strong>
        </div>

        <div className="tex-progress-track">
          <div
            className="tex-progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      <div className="tex-card-actions">
        <button
          type="button"
          className="tex-primary"
          onClick={onOpen}
        >
          <Eye size={14} />
          فتح الاختبار
        </button>
      </div>
    </article>
  );
}

function Meta({
  label,
  value,
}) {
  return (
    <div className="tex-meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* =========================================================
   STUDENTS
========================================================= */

function ExamStudentsModal({
  exam,
  onClose,
  onOpenStudent,
  sessionLoading,
}) {
  const [search, setSearch] =
    useState("");
  const [stateFilter, setStateFilter] =
    useState("all");

  const status = deriveExamStatus(exam);

  const filtered = useMemo(() => {
    const text = search
      .trim()
      .toLowerCase();

    return (exam.students || []).filter(
      (student) => {
        const state =
          studentState(student);

        if (
          stateFilter !== "all" &&
          state.key !== stateFilter
        ) {
          return false;
        }

        if (!text) return true;

        return [
          student.student_name,
          student.user_number,
        ]
          .join(" ")
          .toLowerCase()
          .includes(text);
      }
    );
  }, [
    exam.students,
    search,
    stateFilter,
  ]);

  const counts = useMemo(() => {
    const rows = exam.students || [];

    return {
      total: rows.length,
      notStarted: rows.filter(
        (row) =>
          studentState(row).key ===
          "not_started"
      ).length,
      inProgress: rows.filter(
        (row) =>
          studentState(row).key ===
          "in_progress"
      ).length,
      approved: rows.filter(
        (row) =>
          studentState(row).key ===
          "approved"
      ).length,
    };
  }, [exam.students]);

  return (
    <Modal
      title={exam.title}
      subtitle="الطلاب المعيّنون لك في هذا الاختبار"
      icon={Users}
      onClose={onClose}
      large
    >
      <div className="tex-mini-stats">
        <MiniStat
          label="الطلاب"
          value={counts.total}
        />

        <MiniStat
          label="لم يبدأ"
          value={counts.notStarted}
        />

        <MiniStat
          label="جارٍ"
          value={counts.inProgress}
        />

        <MiniStat
          label="معتمد"
          value={counts.approved}
        />
      </div>

      <section className="tex-student-toolbar">
        <div className="tex-search">
          <Search size={15} />

          <input
            className="tex-control"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="ابحث باسم الطالب أو رقمه..."
          />
        </div>

        <select
          className="tex-control"
          value={stateFilter}
          onChange={(event) =>
            setStateFilter(
              event.target.value
            )
          }
        >
          <option value="all">
            جميع الطلاب
          </option>
          <option value="not_started">
            لم يبدأ
          </option>
          <option value="in_progress">
            جارٍ الاختبار
          </option>
          <option value="completed">
            جاهز للاعتماد
          </option>
          <option value="approved">
            معتمد
          </option>
        </select>
      </section>

      {status === "upcoming" && (
        <Info tone="gold">
          <Clock3 size={15} />
          يبدأ الاختبار في{" "}
          {formatHijri(
            exam.start_date
          )}.
        </Info>
      )}

      {status === "ended" && (
        <Info tone="danger">
          <AlertTriangle size={15} />
          انتهت مدة الاختبار. لا يمكن
          بدء طالب جديد، لكن المحاولة
          التي بدأت قبل الإغلاق يمكن
          استكمالها.
        </Info>
      )}

      <div className="tex-students-list">
        {filtered.map((student) => (
          <StudentRow
            key={student.student_id}
            exam={exam}
            student={student}
            onOpen={() =>
              onOpenStudent(student)
            }
            busy={sessionLoading}
          />
        ))}

        {!filtered.length && (
          <div className="tex-small-empty">
            لا يوجد طلاب مطابقون.
          </div>
        )}
      </div>
    </Modal>
  );
}

function MiniStat({
  label,
  value,
}) {
  return (
    <div className="tex-mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StudentRow({
  exam,
  student,
  onOpen,
  busy,
}) {
  const state = studentState(student);
  const examStatus =
    deriveExamStatus(exam);

  const cannotStart =
    state.key === "not_started" &&
    examStatus !== "active";

  let buttonText = "بدء الاختبار";

  if (
    state.key === "in_progress" ||
    state.key === "completed"
  ) {
    buttonText = "استكمال الاختبار";
  }

  if (state.key === "approved") {
    buttonText = "عرض النتيجة";
  }

  return (
    <article className="tex-student-row">
      <div className="tex-student-main">
        <div className="tex-avatar">
          {(student.student_name ||
            "ط")[0]}
        </div>

        <div>
          <strong>
            {student.student_name}
          </strong>

          <span>
            {student.user_number ||
              "بدون رقم"}
          </span>
        </div>
      </div>

      <div className="tex-parts">
        {(student.parts || []).map(
          (part) => (
            <span
              className="tex-chip"
              key={part}
            >
              ج{part}
            </span>
          )
        )}
      </div>

      <span
        className={`tex-status ${state.tone}`}
      >
        {state.label}
      </span>

      {student.result ? (
        <div className="tex-score-pill">
          {scoreNumber(
            student.result.score
          )}
          /100
        </div>
      ) : (
        <div className="tex-score-pill muted">
          —
        </div>
      )}

      <button
        type="button"
        className="tex-row-btn"
        disabled={
          busy || cannotStart
        }
        onClick={onOpen}
      >
        {busy ? (
          <Loader2
            className="tex-spin"
            size={14}
          />
        ) : state.key === "approved" ? (
          <Eye size={14} />
        ) : (
          <Play size={14} />
        )}

        {cannotStart &&
        examStatus === "upcoming"
          ? "لم يبدأ بعد"
          : cannotStart
          ? "انتهت المدة"
          : buttonText}
      </button>
    </article>
  );
}

/* =========================================================
   ASSESSMENT
========================================================= */

function AssessmentModal({
  initialSession,
  onClose,
  onApproved,
}) {
  const { showToast } = useToast();

  const [session, setSession] =
    useState(initialSession);

  const [questions, setQuestions] =
    useState(
      Array.isArray(
        initialSession?.questions
      )
        ? initialSession.questions
        : []
    );

  const [activeIndex, setActiveIndex] =
    useState(() => {
      const current = Number(
        initialSession?.attempt
          ?.current_question || 1
      );

      return Math.max(
        0,
        Math.min(
          (initialSession?.questions
            ?.length || 1) - 1,
          current - 1
        )
      );
    });

  const [saving, setSaving] =
    useState(false);
  const [saveState, setSaveState] =
    useState("saved");

  const [approving, setApproving] =
    useState(false);

  const [teacherNotes, setTeacherNotes] =
    useState(
      initialSession?.result?.notes || ""
    );

  const [approvedResult, setApprovedResult] =
    useState(
      initialSession?.result || null
    );

  const saveTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(
          saveTimerRef.current
        );
      }
    };
  }, []);

  const readonly =
    session?.attempt?.status ===
      "approved" ||
    Boolean(approvedResult);

  const activeQuestion =
    questions[activeIndex] || null;

  const totals = useMemo(() => {
    const errors = questions.reduce(
      (sum, row) =>
        sum +
        Number(row.error_count || 0),
      0
    );

    const prompts = questions.reduce(
      (sum, row) =>
        sum +
        Number(row.prompt_count || 0),
      0
    );

    const tajweed = questions.reduce(
      (sum, row) =>
        sum +
        Number(
          row.tajweed_error_count || 0
        ),
      0
    );

    const deduction =
      errors +
      prompts * 0.5 +
      tajweed * 0.5;

    const score = Math.max(
      0,
      100 - deduction
    );

    return {
      errors,
      prompts,
      tajweed,
      deduction,
      score,
    };
  }, [questions]);

  const allCompleted =
    questions.length > 0 &&
    questions.every(
      (row) => row.completed
    );

  function updateLocalQuestion(
    index,
    patch
  ) {
    setQuestions((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              ...patch,
            }
          : row
      )
    );
  }

  function scheduleAutosave(
    nextQuestion
  ) {
    if (readonly) return;

    if (saveTimerRef.current) {
      clearTimeout(
        saveTimerRef.current
      );
    }

    setSaveState("pending");

    saveTimerRef.current = setTimeout(
      () => {
        persistQuestion(
          nextQuestion,
          false
        );
      },
      400
    );
  }

  function changeCounter(
    field,
    delta
  ) {
    if (
      readonly ||
      !activeQuestion
    ) {
      return;
    }

    const nextValue = Math.max(
      0,
      Number(
        activeQuestion[field] || 0
      ) + delta
    );

    const nextQuestion = {
      ...activeQuestion,
      [field]: nextValue,
    };

    updateLocalQuestion(
      activeIndex,
      {
        [field]: nextValue,
      }
    );

    scheduleAutosave(
      nextQuestion
    );
  }

  async function persistQuestion(
    question,
    markCompleted = question.completed
  ) {
    if (!question || readonly) {
      return null;
    }

    setSaving(true);
    setSaveState("saving");

    try {
      const { data, error } =
        await supabase.rpc(
          "teacher_save_exam_question_score_v2",
          {
            p_attempt_id: Number(
              session.attempt.id
            ),
            p_question_no: Number(
              question.question_no
            ),
            p_error_count: Number(
              question.error_count || 0
            ),
            p_prompt_count: Number(
              question.prompt_count || 0
            ),
            p_tajweed_error_count: Number(
              question.tajweed_error_count ||
                0
            ),
            p_completed:
              Boolean(markCompleted),
          }
        );

      if (error) throw error;

      setSaveState("saved");

      setSession((current) => ({
        ...current,
        attempt: {
          ...current.attempt,
          status:
            data?.attempt_status ||
            current.attempt.status,
          current_question:
            data?.current_question ||
            current.attempt.current_question,
        },
      }));

      return data;
    } catch (error) {
      console.error(
        "AUTOSAVE EXAM QUESTION:",
        error
      );

      setSaveState("error");

      showToast(
        "تعذر الحفظ التلقائي. حاول مرة أخرى.",
        "error"
      );

      return null;
    } finally {
      setSaving(false);
    }
  }

  async function completeQuestion() {
    if (
      readonly ||
      !activeQuestion
    ) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(
        saveTimerRef.current
      );
    }

    const question = {
      ...activeQuestion,
      completed: true,
    };

    updateLocalQuestion(
      activeIndex,
      {
        completed: true,
      }
    );

    const result =
      await persistQuestion(
        question,
        true
      );

    if (!result) return;

    const nextNotCompleted =
      questions.findIndex(
        (row, index) =>
          index > activeIndex &&
          !row.completed
      );

    if (nextNotCompleted >= 0) {
      setActiveIndex(
        nextNotCompleted
      );
      return;
    }

    const firstNotCompleted =
      questions.findIndex(
        (row, index) =>
          index !== activeIndex &&
          !row.completed
      );

    if (firstNotCompleted >= 0) {
      setActiveIndex(
        firstNotCompleted
      );
    }
  }

  async function approveResult() {
    if (!allCompleted) {
      showToast(
        "أكمل جميع الأسئلة أولًا",
        "error"
      );
      return;
    }

    const confirmed = window.confirm(
      `سيتم اعتماد نتيجة ${session.student.full_name} بدرجة ${scoreNumber(
        totals.score
      )} من 100.\n\nبعد الاعتماد لن يستطيع المعلم تعديلها مباشرة.\n\nهل تريد المتابعة؟`
    );

    if (!confirmed) return;

    setApproving(true);

    try {
      const { data, error } =
        await supabase.rpc(
          "teacher_approve_exam_result_v2",
          {
            p_attempt_id: Number(
              session.attempt.id
            ),
            p_notes:
              teacherNotes.trim() ||
              null,
          }
        );

      if (error) throw error;

      setApprovedResult(data);

      setSession((current) => ({
        ...current,
        attempt: {
          ...current.attempt,
          status: "approved",
        },
        result: data,
      }));

      showToast(
        "تم اعتماد نتيجة الطالب",
        "success"
      );

      await onApproved?.();
    } catch (error) {
      console.error(
        "APPROVE EXAM RESULT:",
        error
      );

      showToast(
        error.message ||
          "تعذر اعتماد النتيجة",
        "error"
      );
    } finally {
      setApproving(false);
    }
  }

  if (!session) return null;

  if (
    readonly &&
    approvedResult
  ) {
    return (
      <Modal
        title={session.exam.title}
        subtitle={session.student.full_name}
        icon={Award}
        onClose={onClose}
        large
      >
        <ResultApproved
          result={approvedResult}
          student={session.student}
          exam={session.exam}
          onClose={onClose}
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={session.exam.title}
      subtitle={`${session.student.full_name} • ${session.exam.questions_count} أسئلة`}
      icon={GraduationCap}
      onClose={onClose}
      large
    >
      <div className="tex-assessment-head">
        <div>
          <span>الطالب</span>
          <strong>
            {session.student.full_name}
          </strong>
          <small>
            {session.student.user_number ||
              "بدون رقم"}
          </small>
        </div>

        <div>
          <span>الأجزاء</span>
          <div className="tex-parts">
            {(session.parts || []).map(
              (part) => (
                <span
                  className="tex-chip"
                  key={part}
                >
                  ج{part}
                </span>
              )
            )}
          </div>
        </div>

        <div className="tex-autosave">
          {saveState === "saving" ||
          saveState === "pending" ? (
            <>
              <Loader2
                className="tex-spin"
                size={14}
              />
              جارٍ الحفظ
            </>
          ) : saveState === "error" ? (
            <>
              <AlertTriangle
                size={14}
              />
              تعذر الحفظ
            </>
          ) : (
            <>
              <CheckCircle2
                size={14}
              />
              محفوظ تلقائيًا
            </>
          )}
        </div>
      </div>

      <nav className="tex-question-nav">
        {questions.map(
          (question, index) => (
            <button
              type="button"
              key={question.question_no}
              className={`tex-question-step ${
                index === activeIndex
                  ? "active"
                  : ""
              } ${
                question.completed
                  ? "completed"
                  : ""
              }`}
              onClick={() =>
                setActiveIndex(index)
              }
            >
              <span>
                {question.completed ? (
                  <Check size={13} />
                ) : (
                  question.question_no
                )}
              </span>

              <small>
                س{question.question_no}
              </small>
            </button>
          )
        )}
      </nav>

      {activeQuestion && (
        <>
          <section className="tex-question-card">
            <div className="tex-question-kicker">
              السؤال{" "}
              {activeQuestion.question_no} من{" "}
              {questions.length}
            </div>

            <div className="tex-question-meta">
              <span>
                الجزء{" "}
                {activeQuestion.juz_number}
              </span>

              {activeQuestion.surah_name && (
                <span>
                  {
                    activeQuestion.surah_name
                  }
                </span>
              )}
            </div>

            <h2>
              {activeQuestion.prompt}
            </h2>
          </section>

          <section className="tex-counters">
            <Counter
              title="الخطأ"
              subtitle="كل خطأ = -1"
              value={
                activeQuestion.error_count
              }
              tone="danger"
              disabled={readonly}
              onMinus={() =>
                changeCounter(
                  "error_count",
                  -1
                )
              }
              onPlus={() =>
                changeCounter(
                  "error_count",
                  1
                )
              }
            />

            <Counter
              title="التنبيه"
              subtitle="كل تنبيه = -0.5"
              value={
                activeQuestion.prompt_count
              }
              tone="gold"
              disabled={readonly}
              onMinus={() =>
                changeCounter(
                  "prompt_count",
                  -1
                )
              }
              onPlus={() =>
                changeCounter(
                  "prompt_count",
                  1
                )
              }
            />

            <Counter
              title="خطأ التجويد"
              subtitle="كل خطأ = -0.5"
              value={
                activeQuestion.tajweed_error_count
              }
              tone="blue"
              disabled={readonly}
              onMinus={() =>
                changeCounter(
                  "tajweed_error_count",
                  -1
                )
              }
              onPlus={() =>
                changeCounter(
                  "tajweed_error_count",
                  1
                )
              }
            />
          </section>

          <section className="tex-live-score">
            <div>
              <span>
                خصم الاختبار حتى الآن
              </span>
              <strong>
                -{scoreNumber(
                  totals.deduction
                )}
              </strong>
            </div>

            <div className="tex-live-score-main">
              <span>
                الدرجة الحالية
              </span>
              <strong>
                {scoreNumber(
                  totals.score
                )}
                <small>/100</small>
              </strong>
            </div>

            <div>
              <span>
                الأسئلة المكتملة
              </span>
              <strong>
                {
                  questions.filter(
                    (row) =>
                      row.completed
                  ).length
                }
                /{questions.length}
              </strong>
            </div>
          </section>

          <div className="tex-question-actions">
            <button
              type="button"
              className="tex-secondary"
              disabled={
                activeIndex === 0
              }
              onClick={() =>
                setActiveIndex(
                  Math.max(
                    0,
                    activeIndex - 1
                  )
                )
              }
            >
              <ChevronRight size={15} />
              السابق
            </button>

            <button
              type="button"
              className={
                activeQuestion.completed
                  ? "tex-done-btn done"
                  : "tex-done-btn"
              }
              disabled={
                saving ||
                activeQuestion.completed
              }
              onClick={
                completeQuestion
              }
            >
              <CheckCircle2
                size={16}
              />
              {activeQuestion.completed
                ? "تم السؤال"
                : "تم السؤال وانتقل"}
            </button>

            <button
              type="button"
              className="tex-secondary"
              disabled={
                activeIndex ===
                questions.length - 1
              }
              onClick={() =>
                setActiveIndex(
                  Math.min(
                    questions.length - 1,
                    activeIndex + 1
                  )
                )
              }
            >
              التالي
              <ChevronLeft size={15} />
            </button>
          </div>
        </>
      )}

      {allCompleted && (
        <section className="tex-final-summary">
          <div className="tex-final-title">
            <Trophy size={21} />

            <div>
              <strong>
                الاختبار مكتمل
              </strong>
              <span>
                راجع الملخص ثم اعتمد
                النتيجة.
              </span>
            </div>
          </div>

          <div className="tex-final-grid">
            <Summary
              label="الأخطاء"
              value={totals.errors}
            />

            <Summary
              label="التنبيهات"
              value={totals.prompts}
            />

            <Summary
              label="أخطاء التجويد"
              value={totals.tajweed}
            />

            <Summary
              label="إجمالي الخصم"
              value={`-${scoreNumber(
                totals.deduction
              )}`}
            />

            <Summary
              label="النتيجة"
              value={`${scoreNumber(
                totals.score
              )}/100`}
              highlight
            />

            <Summary
              label="التقدير"
              value={gradeLabel(
                totals.score
              )}
              highlight
            />
          </div>

          <Field label="ملاحظات عامة — اختياري">
            <textarea
              className="tex-textarea"
              value={teacherNotes}
              onChange={(event) =>
                setTeacherNotes(
                  event.target.value
                )
              }
              placeholder="ملاحظة مختصرة على أداء الطالب..."
            />
          </Field>

          <Info tone="green">
            <ShieldCheck size={15} />
            بعد اعتماد النتيجة تُقفل عن
            التعديل المباشر للمعلم وتظهر
            للمشرف ضمن تقدم الاختبار.
          </Info>

          <div className="tex-final-actions">
            <button
              type="button"
              className="tex-primary"
              disabled={approving}
              onClick={approveResult}
            >
              {approving ? (
                <Loader2
                  className="tex-spin"
                  size={15}
                />
              ) : (
                <Award size={15} />
              )}
              اعتماد النتيجة
            </button>
          </div>
        </section>
      )}
    </Modal>
  );
}

function Counter({
  title,
  subtitle,
  value,
  tone,
  disabled,
  onMinus,
  onPlus,
}) {
  return (
    <article
      className={`tex-counter ${tone}`}
    >
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      <div className="tex-counter-control">
        <button
          type="button"
          disabled={
            disabled ||
            Number(value || 0) <= 0
          }
          onClick={onMinus}
        >
          <Minus size={16} />
        </button>

        <b>{value || 0}</b>

        <button
          type="button"
          disabled={disabled}
          onClick={onPlus}
        >
          <Plus size={16} />
        </button>
      </div>
    </article>
  );
}

function Summary({
  label,
  value,
  highlight = false,
}) {
  return (
    <div
      className={`tex-summary ${
        highlight ? "highlight" : ""
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultApproved({
  result,
  student,
  exam,
  onClose,
}) {
  const score = Number(
    result.score || 0
  );

  return (
    <section className="tex-result-approved">
      <div className="tex-result-award">
        <Award size={34} />
      </div>

      <span>
        تم اعتماد النتيجة
      </span>

      <h2>
        {student.full_name}
      </h2>

      <div className="tex-result-score">
        {scoreNumber(score)}
        <small>/100</small>
      </div>

      <strong className="tex-result-grade">
        {gradeLabel(score)}
      </strong>

      <div className="tex-final-grid">
        <Summary
          label="الأخطاء"
          value={
            result.error_count ?? "—"
          }
        />

        <Summary
          label="التنبيهات"
          value={
            result.prompt_count ?? "—"
          }
        />

        <Summary
          label="أخطاء التجويد"
          value={
            result.tajweed_error_count ??
            "—"
          }
        />

        <Summary
          label="إجمالي الخصم"
          value={`-${scoreNumber(
            result.deduction || 0
          )}`}
        />
      </div>

      <Info tone="green">
        <CheckCircle2 size={15} />
        تم تسجيل النتيجة رسميًا في
        الاختبار. مرحلة إشعار الطالب
        والشهادة مرتبطة باعتماد النتائج
        النهائي من المشرف.
      </Info>

      <button
        type="button"
        className="tex-primary"
        onClick={onClose}
      >
        العودة لقائمة الطلاب
      </button>
    </section>
  );
}

/* =========================================================
   SHARED
========================================================= */

function Modal({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  large = false,
}) {
  const content = (
    <div
      className="tex-modal"
      role="dialog"
      aria-modal="true"
    >
      <section
        className={`tex-modal-card ${
          large ? "large" : ""
        }`}
      >
        <header className="tex-modal-head">
          <div className="tex-modal-title">
            <div className="tex-modal-icon">
              <Icon size={18} />
            </div>

            <div>
              <strong>{title}</strong>
              <span>{subtitle}</span>
            </div>
          </div>

          <button
            type="button"
            className="tex-close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={17} />
          </button>
        </header>

        <div className="tex-modal-body">
          {children}
        </div>
      </section>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(
        content,
        document.body
      )
    : content;
}

function Info({
  children,
  tone = "green",
}) {
  return (
    <div
      className={`tex-info ${tone}`}
    >
      {children}
    </div>
  );
}
