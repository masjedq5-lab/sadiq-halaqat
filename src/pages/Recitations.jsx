import useRecitationAttendance from "../lib/useRecitationAttendance";
import { assertRecitationAttendance } from "../lib/recitationAttendance";
import SideLessonFields from "../components/SideLessonFields";
import {storedSideLesson,formatSideLessonTotal,validateSideLesson,sideLessonPayload,withSideLessonMetrics} from "../lib/sideLesson";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { surahs, evaluations } from "../data/surahList";
import { useToast } from "../components/Toast";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import AppSelect from "../components/AppSelect";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronDown, Clock3, Edit3, FileText, GraduationCap, Loader2, MessageSquareText, Plus, RefreshCw, Search, Sparkles, Target, Trash2, Trophy, UserRound, X } from "lucide-react";

export default function RecitationsNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);

  const [studentId, setStudentId] = useState("");
   const [showStudentList, setShowStudentList] = useState(false);
const [showDatePicker, setShowDatePicker] =
  useState(false);
const [selectedDate, setSelectedDate] =
  useState(getLocalDate());
  const [halaqaId, setHalaqaId] = useState("");
  const [halaqaName, setHalaqaName] = useState("");
  const attendanceGuard = useRecitationAttendance(supabase, { student_id: studentId, halaqa_id: halaqaId, recitation_date: selectedDate });

  const [fromSurah, setFromSurah] = useState("");
  const [fromAyah, setFromAyah] = useState("");
  const [toSurah, setToSurah] = useState("");
  const [toAyah, setToAyah] = useState("");

  const [lessonEvaluation, setLessonEvaluation] =
    useState("");

  const [sideFaces,setSideFaces] = useState("");
  const [sideLines,setSideLines] = useState("");
  const [sideChanged,setSideChanged] = useState(false);
  const [nextSurah, setNextSurah] = useState("");
  const [nextFromAyah, setNextFromAyah] =
    useState("");
  const [nextToSurah, setNextToSurah] =
    useState("");
  const [nextToAyah, setNextToAyah] =
    useState("");

  const [nextEvaluation, setNextEvaluation] =
    useState("");

  const [next2Surah, setNext2Surah] =
    useState("");
  const [next2FromAyah, setNext2FromAyah] =
    useState("");
  const [next2ToSurah, setNext2ToSurah] =
    useState("");
  const [next2ToAyah, setNext2ToAyah] =
    useState("");

  const [reviewSurah, setReviewSurah] =
    useState("");
  const [reviewFromAyah, setReviewFromAyah] =
    useState("");
  const [reviewToSurah, setReviewToSurah] =
    useState("");
  const [reviewToAyah, setReviewToAyah] =
    useState("");

  const [reviewEvaluation, setReviewEvaluation] =
    useState("");

  const [notes, setNotes] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] =
    useState(false);

  const [recordsSearch, setRecordsSearch] =
    useState("");

  const [evaluationFilter, setEvaluationFilter] =
    useState("all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!studentId) {
      setHalaqaId("");
      setHalaqaName("");
      return;
    }

    loadStudentHalaqa(studentId);
  }, [studentId]);

  const selectedStudent = useMemo(
    () =>
      students.find(
        (student) =>
          Number(student.id) === Number(studentId)
      ),
    [students, studentId]
  );

  

  const filteredRecords = useMemo(() => {
    const text = recordsSearch
      .trim()
      .toLowerCase();

    return records.filter((record) => {
      const name = studentName(
        record.student_id
      ).toLowerCase();

      const matchesSearch =
        !text || name.includes(text);

      const matchesEvaluation =
        evaluationFilter === "all" ||
        record.lesson_evaluation ===
          evaluationFilter;

      return (
        matchesSearch &&
        matchesEvaluation
      );
    });
  }, [
    records,
    recordsSearch,
    evaluationFilter,
    students,
  ]);

  const totalPoints = useMemo(() => {
    return (
      calculatePoints(lessonEvaluation) +
      calculatePoints(nextEvaluation) +
      calculatePoints(reviewEvaluation)
    );
  }, [
    lessonEvaluation,
    nextEvaluation,
    reviewEvaluation,
  ]);

  const stats = useMemo(() => {
    const total = records.length;

    const points = records.reduce(
      (sum, item) =>
        sum + Number(item.points || 0),
      0
    );

    const excellent = records.filter(
      (item) =>
        item.lesson_evaluation === "ممتاز"
    ).length;

    return {
      total,
      points,
      excellent,
    };
  }, [records]);

  async function loadData() {
    setRecordsLoading(true);

    const [
      studentsResult,
      recordsResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, user_number, phone, status"
        )
        .eq("role", "student")
        .order("full_name"),

      supabase
        .from("recitations")
        .select("*")
        .order("id", {
          ascending: false,
        }),
    ]);

    if (studentsResult.error) {
      showToast(
        studentsResult.error.message,
        "error"
      );
      setRecordsLoading(false);
      return;
    }

    if (recordsResult.error) {
      showToast(
        recordsResult.error.message,
        "error"
      );
      setRecordsLoading(false);
      return;
    }

    setStudents(
      studentsResult.data || []
    );

    try { setRecords(await withSideLessonMetrics(supabase, recordsResult.data || [])); }
    catch(error) { showToast(error.message || "تعذر تحميل مقادير جنب الدرس","error"); }

    setRecordsLoading(false);
  }

  async function loadStudentHalaqa(id) {
    const { data, error } =
      await supabase
        .from("student_halaqat")
        .select("halaqa_id")
        .eq(
          "student_id",
          Number(id)
        )
        .eq("is_current", true)
        .maybeSingle();

    if (error) {
      showToast(
        "تعذر تحميل حلقة الطالب",
        "error"
      );

      setHalaqaId("");
      setHalaqaName("");
      return;
    }

    if (!data) {
      setHalaqaId("");
      setHalaqaName("");
      return;
    }

    setHalaqaId(data.halaqa_id);

    const { data: halaqa } =
      await supabase
        .from("halaqat")
        .select("name")
        .eq("id", data.halaqa_id)
        .maybeSingle();

    setHalaqaName(
      halaqa?.name || ""
    );
  }

  
  function clearForm() {
    setStudentId("");
    setStudentSearch("");
    setShowStudentList(false);

    setSelectedDate(getLocalDate());

    setHalaqaId("");
    setHalaqaName("");

    setFromSurah("");
    setFromAyah("");
    setToSurah("");
    setToAyah("");
    setLessonEvaluation("");

    setSideFaces("");setSideLines("");setSideChanged(false);
    setNextSurah("");
    setNextFromAyah("");
    setNextToSurah("");
    setNextToAyah("");
    setNextEvaluation("");

    setNext2Surah("");
    setNext2FromAyah("");
    setNext2ToSurah("");
    setNext2ToAyah("");

    setReviewSurah("");
    setReviewFromAyah("");
    setReviewToSurah("");
    setReviewToAyah("");
    setReviewEvaluation("");

    setNotes("");

    setEditingId(null);
  }

  function editRecord(record) {
    setEditingId(record.id);
    const side=storedSideLesson(record);
    setSideFaces(side.faces || "");setSideLines(side.lines || "");setSideChanged(false);

    const student = students.find(
      (item) =>
        Number(item.id) ===
        Number(record.student_id)
    );

    setStudentId(
      String(record.student_id)
    );

    setStudentSearch(
      student?.full_name || ""
    );

    setSelectedDate(
      record.recitation_date ||
        getLocalDate()
    );

    setFromSurah(
      record.from_surah || ""
    );

    setFromAyah(
      record.from_ayah || ""
    );

    setToSurah(
      record.to_surah || ""
    );

    setToAyah(
      record.to_ayah || ""
    );

    setLessonEvaluation(
      record.lesson_evaluation || ""
    );

    setNextSurah(
      record.next_surah || ""
    );

    setNextFromAyah(
      record.next_from_ayah || ""
    );

    setNextToSurah(
      record.next_to_surah || ""
    );

    setNextToAyah(
      record.next_to_ayah || ""
    );

    setNextEvaluation(
      record.next_evaluation || ""
    );

    setNext2Surah(
      record.next2_surah || ""
    );

    setNext2FromAyah(
      record.next2_from_ayah || ""
    );

    setNext2ToSurah(
      record.next2_to_surah || ""
    );

    setNext2ToAyah(
      record.next2_to_ayah || ""
    );

    setReviewSurah(
      record.review_surah || ""
    );

    setReviewFromAyah(
      record.review_from_ayah || ""
    );

    setReviewToSurah(
      record.review_to_surah || ""
    );

    setReviewToAyah(
      record.review_to_ayah || ""
    );

    setReviewEvaluation(
      record.review_evaluation || ""
    );

    setNotes(record.notes || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    showToast(
      "تم تحميل التسميع للتعديل",
      "info"
    );
  }

  async function saveRecitation() {
    if (!studentId) {
      showToast(
        "اختر الطالب أولاً",
        "error"
      );
      return;
    }

    if (!halaqaId) {
      showToast(
        "الطالب غير مرتبط بحلقة حالية",
        "error"
      );
      return;
    }

    if (!selectedDate) {
      showToast(
        "حدد تاريخ التسميع",
        "error"
      );
      return;
    }

    const original=editingId?records.find(row=>Number(row.id)===Number(editingId)):null;
    const preserveSide=original && !sideChanged && !storedSideLesson(original).manual;
    let side;
    try { side=preserveSide?storedSideLesson(original):validateSideLesson(sideFaces,sideLines,nextEvaluation); }
    catch(error){showToast(error.message,"error");return;}
    if (!fromSurah && !toSurah && !reviewSurah && !side.totalLines && !(preserveSide && (original.next_surah || original.next2_surah))) {
      showToast("أدخل الدرس أو مقدار جنب الدرس أو المراجعة.","error");return;
    }

    setLoading(true);

    try {
      await assertRecitationAttendance(supabase, {student_id: studentId, halaqa_id: halaqaId, recitation_date: selectedDate});
      const points = totalPoints;

      const recordData = {
        student_id: Number(studentId),
        halaqa_id: Number(halaqaId),

        recitation_date:
          selectedDate,

        from_surah:
          fromSurah || null,

        from_ayah:
          fromAyah
            ? Number(fromAyah)
            : null,

        to_surah:
          toSurah || null,

        to_ayah:
          toAyah
            ? Number(toAyah)
            : null,

        lesson_evaluation:
          lessonEvaluation || null,

        next_surah:
          nextSurah || null,

        next_from_ayah:
          nextFromAyah
            ? Number(nextFromAyah)
            : null,

        next_to_surah:
          nextToSurah || null,

        next_to_ayah:
          nextToAyah
            ? Number(nextToAyah)
            : null,

        next_evaluation:
          nextEvaluation || null,

        next2_surah:
          next2Surah || null,

        next2_from_ayah:
          next2FromAyah
            ? Number(next2FromAyah)
            : null,

        next2_to_surah:
          next2ToSurah || null,

        next2_to_ayah:
          next2ToAyah
            ? Number(next2ToAyah)
            : null,

        review_surah:
          reviewSurah || null,

        review_from_ayah:
          reviewFromAyah
            ? Number(reviewFromAyah)
            : null,

        review_to_surah:
          reviewToSurah || null,

        review_to_ayah:
          reviewToAyah
            ? Number(reviewToAyah)
            : null,

        review_evaluation:
          reviewEvaluation || null,

        notes:
          notes.trim() || null,

        points,
      ...sideLessonPayload({original,changed:sideChanged,faces:sideFaces,lines:sideLines,evaluation:nextEvaluation}),
};

      if (editingId) {
        await updateRecitation(
          recordData,
          points
        );
      } else {
        await createRecitation(
          recordData,
          points
        );
      }
    } catch (error) {
      showToast(error.message || "تعذر حفظ التسميع", "error");
    } finally {
      setLoading(false);
    }
  }

  async function createRecitation(
    recordData,
    points
  ) {
    const {
      data: existing,
      error: duplicateError,
    } = await supabase
      .from("recitations")
      .select("id")
      .eq(
        "student_id",
        Number(studentId)
      )
      .eq(
        "recitation_date",
        selectedDate
      )
      .limit(1);

    if (duplicateError) {
      showToast(
        duplicateError.message,
        "error"
      );
      return;
    }

    if (
      existing &&
      existing.length > 0
    ) {
      showToast(
        "يوجد تسميع مسجل لهذا الطالب في نفس التاريخ",
        "error"
      );
      return;
    }

    const {
      error,
    } = await supabase
      .from("recitations")
      .insert([recordData]);

    if (error) {
      showToast(
        "تعذر حفظ التسميع: " +
          error.message,
        "error"
      );
      return;
    }

    if (points !== 0) {
      const {
        error: pointsError,
      } = await supabase
        .from(
          "points_transactions"
        )
        .insert([
          {
            student_id:
              Number(studentId),

            points,

            reason:
              "نقاط التسميع",

            category:
              "recitation",

            transaction_date:
              selectedDate,
          },
        ]);

      if (pointsError) {
        showToast(
          "تم حفظ التسميع لكن تعذر تسجيل النقاط",
          "error"
        );
      }
    }

    showToast(
      "تم حفظ التسميع بنجاح",
      "success"
    );

    clearForm();
    await loadData();
  }

  async function updateRecitation(
    recordData,
    points
  ) {
    const oldRecord =
      records.find(
        (record) =>
          Number(record.id) ===
          Number(editingId)
      );

    const oldPoints =
      Number(oldRecord?.points || 0);

    const {
      error,
    } = await supabase
      .from("recitations")
      .update(recordData)
      .eq("id", editingId);

    if (error) {
      showToast(
        "تعذر تعديل التسميع: " +
          error.message,
        "error"
      );
      return;
    }

    const difference =
      Number(points) -
      oldPoints;

    if (difference !== 0) {
      const {
        error: pointsError,
      } = await supabase
        .from(
          "points_transactions"
        )
        .insert([
          {
            student_id:
              Number(studentId),

            points: difference,

            reason:
              "تعديل نقاط التسميع",

            category:
              "recitation_edit",

            transaction_date:
              selectedDate,
          },
        ]);

      if (pointsError) {
        showToast(
          "تم تعديل التسميع لكن تعذر تحديث سجل النقاط",
          "error"
        );
        return;
      }
    }

    showToast(
      "تم تعديل التسميع بنجاح",
      "success"
    );

    clearForm();
    await loadData();
  }

  async function deleteRecitation(
    record
  ) {
    const name = studentName(
      record.student_id
    );

    const confirmed =
      window.confirm(
        `هل أنت متأكد من حذف تسميع ${name} بتاريخ ${formatShortDate(
          record.recitation_date
        )}؟`
      );

    if (!confirmed) return;

    setLoading(true);

    try {
      const {
        error,
      } = await supabase
        .from("recitations")
        .delete()
        .eq("id", record.id);

      if (error) {
        showToast(
          "تعذر حذف التسميع: " +
            error.message,
          "error"
        );
        return;
      }

      if (
        Number(record.points || 0) !==
        0
      ) {
        const {
          error: pointsError,
        } = await supabase
          .from(
            "points_transactions"
          )
          .insert([
            {
              student_id:
                Number(
                  record.student_id
                ),

              points:
                -Number(
                  record.points
                ),

              reason:
                "إلغاء تسميع",

              category:
                "recitation_delete",

              transaction_date:
                getLocalDate(),
            },
          ]);

        if (pointsError) {
          showToast(
            "تم حذف التسميع لكن تعذر تصحيح النقاط",
            "error"
          );
          return;
        }
      }

      if (
        Number(editingId) ===
        Number(record.id)
      ) {
        clearForm();
      }

      showToast(
        "تم حذف التسميع بنجاح",
        "success"
      );

      await loadData();
    } finally {
      setLoading(false);
    }
  }

  function studentName(id) {
    return (
      students.find(
        (student) =>
          Number(student.id) ===
          Number(id)
      )?.full_name ||
      "طالب غير معروف"
    );
  }

  

  return (
    <>
      <style>{pageCss}</style>

      <div
        className="recitation-page"
        dir="rtl"
      >
        <div className="page-shell">
          {/* HEADER */}

          <header className="page-header">
            <div className="header-main">
              <div className="header-icon">
                <BookOpen size={26} />
              </div>

              <div>
                <div className="eyebrow">
                  نظام الصديق
                </div>

                <h1>
                  التسميع اليومي
                </h1>

                <p>
                  تسجيل ومتابعة حفظ ومراجعة
                  القرآن الكريم للطلاب
                </p>
              </div>
            </div>

            <button type="button"
              className="ghost-button"
              onClick={() =>
                navigate("/admin")
              }
            >
              <ArrowRight size={18} />
              لوحة المشرف
            </button>
          </header>

          {/* STATS */}

          <section className="stats-grid">
            <Stat
              icon={<FileText size={21} />}
              title="إجمالي التسميعات"
              value={stats.total}
            />

            <Stat
              icon={<Trophy size={21} />}
              title="إجمالي النقاط"
              value={
                stats.points > 0
                  ? `+${stats.points}`
                  : stats.points
              }
            />

            <Stat
              icon={
                <Sparkles size={21} />
              }
              title="تقييمات ممتاز"
              value={stats.excellent}
            />

            <Stat
              icon={
                <CalendarDays size={21} />
              }
              title="تاريخ اليوم"
              value={formatShortDate(
                getLocalDate()
              )}
              small
            />
          </section>

          {/* EDIT BAR */}

          {editingId && (
            <div className="edit-banner">
              <div>
                <Edit3 size={19} />
                <div>
                  <strong>
                    وضع تعديل التسميع
                  </strong>

                  <span>
                    عدّل البيانات ثم احفظ
                    التغييرات
                  </span>
                </div>
              </div>

              <button type="button"
                onClick={clearForm}
              >
                <X size={16} />
                إلغاء التعديل
              </button>
            </div>
          )}

          {/* BASIC DATA */}

          <section className="panel">
            <SectionHeader
              icon={
                <UserRound size={19} />
              }
              title="بيانات الجلسة"
              subtitle="اختر الطالب والتاريخ والحلقة"
            />

            <div className="form-grid three">
              {/* STUDENT */}

              <div className="field">

  <AppSelect
    label="الطالب"
    value={studentId}
    onChange={setStudentId}
    options={students.map(student => ({
      value: student.id,
      label: student.full_name
    }))}
  />

  {selectedStudent && (
    <div
      style={{
        marginTop:"10px",
        padding:"calc(12px * var(--app-density,1)) calc(14px * var(--app-density,1))",
        borderRadius:"calc(12px * var(--app-radius-scale,1))",
        background:"#ECFDF5",
        border:"1px solid #A7F3D0",
        color:"#065F46",
        fontWeight:"700"
      }}
    >
      تم اختيار:
      {" "}
      {selectedStudent.full_name}
    </div>
  )}

</div>
              

{/* DATE */}

<div className="field">

  <label>
    تاريخ التسميع
  </label>

  <div
    onClick={() =>
      setShowDatePicker(true)
    }
    style={{
      background:"#FFFFFF",
      border:"1px solid #E2E8F0",
      borderRadius:"calc(14px * var(--app-radius-scale,1))",
      padding:"calc(10px * var(--app-density,1)) calc(12px * var(--app-density,1))",
      display:"flex",
      alignItems:"center",
      gap:"calc(10px * var(--app-density,1))",
      cursor:"pointer",
      minHeight:"58px",
      transition:"0.2s",
      boxShadow:
        "0 2px 8px color-mix(in srgb,var(--app-color-0f766e,#0f766e) 5%,transparent)"
    }}
  >

    <div
      style={{
        width:"42px",
        height:"42px",
        borderRadius:"calc(12px * var(--app-radius-scale,1))",
        background:
          "linear-gradient(135deg,var(--app-color-0f766e,#0F766E),var(--app-color-115e59,#115E59))",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        color:"#fff",
        flexShrink:0
      }}
    >
      <CalendarDays size={18}/>
    </div>

    <div
      style={{
        flex:1,
        overflow:"hidden"
      }}
    >

      <div
        style={{
          fontSize:"calc(11px * var(--app-font-scale,1))",
          color:"#64748B",
          fontWeight:"700",
          marginBottom:"2px"
        }}
      >
        تاريخ التسميع
      </div>

      <div
        style={{
          fontSize:"calc(14px * var(--app-font-scale,1))",
          fontWeight:"800",
          color:"#0F172A",
          whiteSpace:"nowrap",
          overflow:"hidden",
          textOverflow:"ellipsis"
        }}
      >
        {formatHijriDate(selectedDate)}
      </div>

      <div
        style={{
          color:"var(--app-color-0f766e,#0F766E)",
          fontSize:"calc(12px * var(--app-font-scale,1))",
          fontWeight:"700",
          marginTop:"2px"
        }}
      >
        {formatGregorianDate(selectedDate)}
      </div>

    </div>

  </div>

</div>              {/* HALAQA */}

              <div className="field">
                <label>
                  الحلقة الحالية
                </label>

                <div className="halaqa-box">
                  <div className="halaqa-icon">
                    <GraduationCap
                      size={19}
                    />
                  </div>

                  <div>
                    <span>
                      الحلقة
                    </span>

                    <strong>
                      {halaqaName ||
                        "سيتم تحديدها تلقائيًا"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

{showDatePicker && (

  <div
    onClick={() =>
      setShowDatePicker(false)
    }
    style={{
      position:"fixed",
      inset:0,
      background:"rgba(0,0,0,.35)",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      zIndex:9999
    }}
  >

    <div
      onClick={(e)=>
        e.stopPropagation()
      }
      style={{
        background:"#fff",
        borderRadius:"calc(18px * var(--app-radius-scale,1))",
        padding:"calc(14px * var(--app-density,1))",
        width:"fit-content",
        boxShadow:
          "0 20px 50px rgba(0,0,0,.15)"
      }}
    >

      <DatePicker
        selected={
          selectedDate
            ? new Date(selectedDate)
            : new Date()
        }
        onChange={(date) => {

          if (!date) return;

          const year =
            date.getFullYear();

          const month = String(
            date.getMonth() + 1
          ).padStart(2, "0");

          const day = String(
            date.getDate()
          ).padStart(2, "0");

          setSelectedDate(
            `${year}-${month}-${day}`
          );

          setShowDatePicker(false);

        }}
        inline
      />

    </div>

  </div>

)}

          {attendanceGuard.message && <p role="status" className="attendance-recitation-notice">{attendanceGuard.message}</p>}
          <fieldset className="attendance-recitation-fields" disabled={attendanceGuard.disabled}>
          {/* LESSON */}

          <RecitationSection
            icon={
              <BookOpen size={19} />
            }
            title="الدرس"
            subtitle="المقدار الجديد الذي تم تسميعه"
          >
            <QuranRange
              fromSurah={fromSurah}
              setFromSurah={
                setFromSurah
              }
              fromAyah={fromAyah}
              setFromAyah={
                setFromAyah
              }
              toSurah={toSurah}
              setToSurah={
                setToSurah
              }
              toAyah={toAyah}
              setToAyah={
                setToAyah
              }
            />

            <EvaluationSelect
              label="تقييم الدرس"
              value={
                lessonEvaluation
              }
              setValue={
                setLessonEvaluation
              }
            />
          </RecitationSection>

          {/* NEXT */}

          <RecitationSection icon={<Target size={19}/>} title="جنب الدرس" subtitle="المقدار الذي سمعه الطالب">
    <SideLessonFields faces={sideFaces} lines={sideLines} evaluation={nextEvaluation}
      onFaces={value=>{setSideFaces(value);setSideChanged(true);}}
      onLines={value=>{setSideLines(value);setSideChanged(true);}}
      onEvaluation={value=>{setNextEvaluation(value);setSideChanged(true);}}/>
  </RecitationSection>

          {/* NEXT 2 */}



          {/* REVIEW */}

          <RecitationSection
            icon={
              <RefreshCw size={19} />
            }
            title="المراجعة"
            subtitle="المقرر السابق الذي تمت مراجعته"
          >
            <QuranRange
              fromSurah={
                reviewSurah
              }
              setFromSurah={
                setReviewSurah
              }
              fromAyah={
                reviewFromAyah
              }
              setFromAyah={
                setReviewFromAyah
              }
              toSurah={
                reviewToSurah
              }
              setToSurah={
                setReviewToSurah
              }
              toAyah={
                reviewToAyah
              }
              setToAyah={
                setReviewToAyah
              }
            />

            <EvaluationSelect
              label="تقييم المراجعة"
              value={
                reviewEvaluation
              }
              setValue={
                setReviewEvaluation
              }
            />
          </RecitationSection>

          {/* SCORE + NOTES */}

          <section className="bottom-grid">
            <div className="score-card">
              <div className="score-icon">
                <Trophy size={24} />
              </div>

              <span>
                نقاط هذه الجلسة
              </span>

              <strong
                className={
                  totalPoints > 0
                    ? "positive"
                    : totalPoints <
                      0
                    ? "negative"
                    : ""
                }
              >
                {totalPoints > 0
                  ? `+${totalPoints}`
                  : totalPoints}
              </strong>

              <small>
                يتم احتساب النقاط من
                التقييمات المختارة
              </small>
            </div>

            <div className="panel notes-panel">
              <SectionHeader
                icon={
                  <MessageSquareText
                    size={19}
                  />
                }
                title="ملاحظات المعلم"
                subtitle="أضف أي ملاحظات مهمة عن الجلسة"
              />

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                placeholder="مثال: يحتاج إلى مراجعة الآيات الأخيرة..."
                rows={5}
              />
            </div>
          </section>

          </fieldset>
          {/* SAVE */}

          <div className="save-bar">
            <button type="button"
              className="save-button"
              onClick={
                saveRecitation
              }
              disabled={loading || attendanceGuard.disabled}
            >
              {loading ? (
                <Loader2
                  size={19}
                  className="spin"
                />
              ) : editingId ? (
                <CheckCircle2 size={19} />
              ) : (
                <Plus size={19} />
              )}

              {loading
                ? "جارٍ الحفظ..."
                : editingId
                ? "حفظ التعديلات"
                : "حفظ التسميع"}
            </button>

            <button type="button"
              className="cancel-button"
              onClick={clearForm}
              disabled={loading}
            >
              <X size={18} />
              تفريغ النموذج
            </button>
          </div>

          {/* RECORDS */}

          <section className="panel records-panel">
            <div className="records-header">
              <SectionHeader
                icon={
                  <Clock3 size={19} />
                }
                title="سجل التسميع"
                subtitle={`عرض ${filteredRecords.length} من ${records.length} سجل`}
              />

              <div className="records-tools">
                <div className="input-with-icon search-records">
                  <Search size={17} />

                  <input
                    value={
                      recordsSearch
                    }
                    onChange={(e) =>
                      setRecordsSearch(
                        e.target.value
                      )
                    }
                    placeholder="ابحث باسم الطالب..."
                  />
                </div>

                <select
                  value={
                    evaluationFilter
                  }
                  onChange={(e) =>
                    setEvaluationFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="all">
                    كل التقييمات
                  </option>

                  {evaluations.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {recordsLoading ? (
              <div className="loading-state">
                <Loader2
                  className="spin"
                  size={28}
                />
                جاري تحميل السجلات...
              </div>
            ) : filteredRecords.length ===
              0 ? (
              <div className="empty-state">
                <div>
                  <FileText size={28} />
                </div>

                <strong>
                  لا توجد سجلات
                </strong>

                <span>
                  لم يتم العثور على
                  تسميعات مطابقة
                </span>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>
                        التاريخ
                      </th>

                      <th>
                        الطالب
                      </th>

                      <th>
                        الدرس
                      </th>

                      <th>
                        التقييم
                      </th>

                      <th>
                        جنب الدرس
                      </th>

                      <th>
                        المراجعة
                      </th>

                      <th>
                        النقاط
                      </th>

                      <th>
                        إجراء
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRecords.map(
                      (record) => (
                        <tr
                          key={
                            record.id
                          }
                        >
                          <td>
                            <span className="date-cell">
                              {formatShortDate(
                                record.recitation_date
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="record-student">
                              <span>
                                <UserRound
                                  size={
                                    15
                                  }
                                />
                              </span>

                              <strong>
                                {studentName(
                                  record.student_id
                                )}
                              </strong>
                            </div>
                          </td>

                          <td>
                            <QuranText
                              from={
                                record.from_surah
                              }
                              fromAyah={
                                record.from_ayah
                              }
                              to={
                                record.to_surah
                              }
                              toAyah={
                                record.to_ayah
                              }
                            />
                          </td>

                          <td>
                            <EvaluationBadge
                              value={
                                record.lesson_evaluation
                              }
                            />
                          </td>

                          <td>
                            <div><strong>{formatSideLessonTotal(storedSideLesson(record).totalFaces)}</strong><EvaluationBadge value={record.next_evaluation}/></div>
                          </td>

                          <td>
                            <QuranText
                              from={
                                record.review_surah
                              }
                              fromAyah={
                                record.review_from_ayah
                              }
                              to={
                                record.review_to_surah
                              }
                              toAyah={
                                record.review_to_ayah
                              }
                            />
                          </td>

                          <td>
                            <strong
                              className={
                                Number(
                                  record.points
                                ) > 0
                                  ? "points-positive"
                                  : Number(
                                      record.points
                                    ) <
                                    0
                                  ? "points-negative"
                                  : "points-zero"
                              }
                            >
                              {Number(
                                record.points
                              ) > 0
                                ? `+${record.points}`
                                : record.points ??
                                  0}
                            </strong>
                          </td>

                          <td>
                            <div className="row-actions">
                              <button type="button"
                                className="edit-action"
                                onClick={() =>
                                  editRecord(
                                    record
                                  )
                                }
                                disabled={
                                  loading
                                }
                              >
                                <Edit3
                                  size={
                                    15
                                  }
                                />
                                تعديل
                              </button>

                              <button type="button"
                                className="delete-action"
                                onClick={() =>
                                  deleteRecitation(
                                    record
                                  )
                                }
                                disabled={
                                  loading
                                }
                              >
                                <Trash2
                                  size={
                                    15
                                  }
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/* ================================================= */
/* SECTION */
/* ================================================= */

function RecitationSection({
  icon,
  title,
  subtitle,
  children,
}) {
  return (
    <section className="panel">
      <SectionHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
      />

      {children}
    </section>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}) {
  return (
    <div className="section-header">
      <div className="section-icon">
        {icon}
      </div>

      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

/* ================================================= */
/* QURAN RANGE */
/* ================================================= */

function QuranRange({
  fromSurah,
  setFromSurah,
  fromAyah,
  setFromAyah,
  toSurah,
  setToSurah,
  toAyah,
  setToAyah,
}) {
  return (
    <div className="quran-range">
      <QuranSelect
        label="من سورة"
        value={fromSurah}
        onChange={setFromSurah}
      />

      <div className="field">
        <label>
          من آية
        </label>

        <input
          type="number"
          min="1"
          value={fromAyah}
          onChange={(e) =>
            setFromAyah(
              e.target.value
            )
          }
          placeholder="رقم الآية"
        />
      </div>

      <div className="range-arrow">
        <ArrowRight size={17} />
      </div>

      <QuranSelect
        label="إلى سورة"
        value={toSurah}
        onChange={setToSurah}
      />

      <div className="field">
        <label>
          إلى آية
        </label>

        <input
          type="number"
          min="1"
          value={toAyah}
          onChange={(e) =>
            setToAyah(
              e.target.value
            )
          }
          placeholder="رقم الآية"
        />
      </div>
    </div>
  );
}

function QuranSelect({
  label,
  value,
  onChange,
}) {
  return (
    <div className="field">
      <label>{label}</label>

      <div className="select-wrap">
        <select
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
        >
          <option value="">
            اختر السورة
          </option>

          {surahs.map((surah) => (
            <option
              key={surah}
              value={surah}
            >
              {surah}
            </option>
          ))}
        </select>

        <ChevronDown size={16} />
      </div>
    </div>
  );
}

/* ================================================= */
/* EVALUATION */
/* ================================================= */

function EvaluationSelect({
  label,
  value,
  setValue,
}) {
  return (
    <div className="evaluation-area">
      <label>{label}</label>

      <div className="evaluation-grid">
        {evaluations.map(
          (evaluation) => {
            const points =
              calculatePoints(
                evaluation
              );

            const active =
              value === evaluation;

            return (
              <button
                type="button"
                key={
                  evaluation
                }
                className={`evaluation-option ${getEvaluationClass(
                  evaluation
                )} ${
                  active
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setValue(
                    active
                      ? ""
                      : evaluation
                  )
                }
              >
                <span>
                  {evaluation}
                </span>

                <small>
                  {points > 0
                    ? `+${points}`
                    : points}
                </small>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}

/* ================================================= */
/* BADGES */
/* ================================================= */

function EvaluationBadge({
  value,
}) {
  if (!value) {
    return (
      <span className="evaluation-badge neutral">
        -
      </span>
    );
  }

  return (
    <span
      className={`evaluation-badge ${getEvaluationClass(
        value
      )}`}
    >
      {value}
    </span>
  );
}

/* ================================================= */
/* STAT */
/* ================================================= */

function Stat({
  icon,
  title,
  value,
  small = false,
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <span>
          {title}
        </span>

        <strong
          className={
            small ? "small-value" : ""
          }
        >
          {value}
        </strong>
      </div>
    </div>
  );
}

/* ================================================= */
/* QURAN TEXT */
/* ================================================= */

function QuranText({
  from,
  fromAyah,
  to,
  toAyah,
}) {
  if (!from && !to) {
    return (
      <span className="muted">
        -
      </span>
    );
  }

  return (
    <span className="quran-text">
      {from || "-"}{" "}
      {fromAyah
        ? `(${fromAyah})`
        : ""}

      {" → "}

      {to || "-"}{" "}
      {toAyah
        ? `(${toAyah})`
        : ""}
    </span>
  );
}

/* ================================================= */
/* DATE */
/* ================================================= */

function getLocalDate() {
  const date = new Date();

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortDate(
  dateString
) {
  if (!dateString) return "-";

  return new Date(
    `${dateString}T00:00:00`
  ).toLocaleDateString(
    "ar-SA",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatGregorianDate(
  dateString
) {

  if (!dateString)
    return "-";

  return new Date(
    `${dateString}T00:00:00`
  ).toLocaleDateString(
    "ar",
    {
      weekday:"long",
      day:"numeric",
      month:"long",
      year:"numeric"
    }
  );

}

function formatHijriDate(
  dateString
) {

  if (!dateString)
    return "-";

  return new Intl.DateTimeFormat(
    "ar-SA-u-ca-islamic",
    {
      weekday:"long",
      day:"numeric",
      month:"long",
      year:"numeric"
    }
  ).format(
    new Date(
      `${dateString}T00:00:00`
    )
  );

}

function calculatePoints(value) {

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

function getEvaluationClass(value) {

  if (value === "ممتاز")
    return "excellent";

  if (value === "جيد جداً")
    return "very-good";

  if (value === "جيد")
    return "good";

  if (value === "إعادة")
    return "bad";

  return "neutral";
}
/* ================================================= */
/* CSS */
/* ================================================= */

const pageCss = `
* {
  box-sizing: border-box;
}

.recitation-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 100% 0%, rgba(15,81,50,.07), transparent 28%),
    radial-gradient(circle at 0% 100%, rgba(15,81,50,.045), transparent 25%),
    #f7f5ef;
  color: #26332c;
}

.page-shell {
  width: min(1500px, calc(100% - 40px));
  margin: auto;
  padding: 30px 0 60px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 56px;
  height: 56px;
  border-radius: 17px;
  background: linear-gradient(145deg, #0f5132, #174f37);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 25px rgba(15,81,50,.16);
}

.eyebrow {
  color: #0f5132;
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 3px;
}

.page-header h1 {
  margin: 0;
  color: #173d2b;
  font-size: 29px;
  font-weight: 900;
}

.page-header p {
  margin: 5px 0 0;
  color: #7d8580;
  font-size: 13px;
}

button,
input,
select,
textarea {
  font-family: inherit;
}

button {
  transition:
    transform .15s ease,
    box-shadow .15s ease,
    border-color .15s ease,
    background .15s ease;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
}

button:disabled {
  opacity: .65;
  cursor: not-allowed !important;
}

.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dfe4df;
  background: #fff;
  color: #173d2b;
  border-radius: 11px;
  padding: 11px 16px;
  cursor: pointer;
  font-weight: 800;
  box-shadow: 0 4px 15px rgba(0,0,0,.035);
}

.stats-grid {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 13px;
  margin-bottom: 18px;
}

.stat-card {
  background: rgba(255,255,255,.9);
  border: 1px solid #e4e8e4;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 5px 18px rgba(0,0,0,.035);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: #edf5ef;
  color: #0f5132;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card span {
  display: block;
  color: #858c87;
  font-size: 11px;
  margin-bottom: 4px;
}

.stat-card strong {
  color: #173d2b;
  font-size: 22px;
  font-weight: 900;
}

.stat-card .small-value {
  font-size: 14px;
}

.edit-banner {
  background: #fff9e8;
  border: 1px solid #ead9a3;
  border-radius: 14px;
  padding: 12px 15px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.edit-banner > div {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #876b1c;
}

.edit-banner strong,
.edit-banner span {
  display: block;
}

.edit-banner strong {
  color: #5e4c19;
  font-size: 13px;
}

.edit-banner span {
  color: #8d805c;
  font-size: 11px;
  margin-top: 2px;
}

.edit-banner button {
  border: 1px solid #e4d6ad;
  background: #fff;
  color: #756126;
  border-radius: 8px;
  padding: 8px 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.panel {
  background: rgba(255,255,255,.96);
  border: 1px solid #e4e8e4;
  border-radius: 18px;
  padding: 21px;
  margin-bottom: 18px;
  box-shadow: 0 5px 20px rgba(0,0,0,.035);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 19px;
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: #edf5ef;
  color: #0f5132;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-header h2 {
  margin: 0;
  color: #173d2b;
  font-size: 17px;
  font-weight: 900;
}

.section-header p {
  margin: 4px 0 0;
  color: #8a928d;
  font-size: 11px;
}

.form-grid {
  display: grid;
  gap: 14px;
}

.form-grid.three {
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
}

.field label,
.evaluation-area > label {
  display: block;
  margin-bottom: 7px;
  color: #4a554e;
  font-size: 12px;
  font-weight: 800;
}

.field input,
.field select,
.records-tools select,
.notes-panel textarea {
  width: 100%;
  border: 1px solid #d9ded9;
  background: #fff;
  border-radius: 10px;
  outline: none;
  color: #29352f;
  font-size: 13px;
  padding: 11px 12px;
}

.field input:focus,
.field select:focus,
.records-tools select:focus,
.notes-panel textarea:focus {
  border-color: #0f5132;
  box-shadow: 0 0 0 3px rgba(15,81,50,.08);
}

.input-with-icon {
  min-height: 43px;
  border: 1px solid #d9ded9;
  border-radius: 10px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  color: #87908a;
}

.input-with-icon:focus-within {
  border-color: #0f5132;
  box-shadow: 0 0 0 3px rgba(15,81,50,.08);
}

.input-with-icon input {
  border: none !important;
  box-shadow: none !important;
  padding: 10px 0 !important;
  min-width: 0;
  flex: 1;
  outline: none;
}

.clear-input {
  border: none;
  background: #f1f3f1;
  color: #7c847f;
  width: 25px;
  height: 25px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.student-picker {
  position: relative;
}

.student-dropdown {
  position: absolute;
  z-index: 50;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  background: #fff;
  border: 1px solid #dfe5e0;
  border-radius: 13px;
  box-shadow: 0 18px 45px rgba(0,0,0,.12);
  padding: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.student-option {
  width: 100%;
  border: none;
  background: transparent;
  padding: 9px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: right;
  cursor: pointer;
  color: #26332c;
}

.student-option:hover,
.student-option.selected {
  background: #f1f7f3;
}

.student-option > span:nth-child(2) {
  flex: 1;
}

.student-option strong,
.student-option small {
  display: block;
}

.student-option strong {
  font-size: 12px;
}

.student-option small {
  color: #929a95;
  margin-top: 2px;
  font-size: 10px;
}

.student-option > svg {
  color: #0f5132;
}

.student-avatar {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #edf5ef;
  color: #0f5132;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-empty {
  padding: 20px;
  text-align: center;
  color: #888;
  font-size: 12px;
}

.selected-student {
  margin-top: 7px;
  color: #0f5132;
  background: #edf7ef;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.halaqa-box {
  min-height: 43px;
  border-radius: 10px;
  border: 1px solid #e0e5e1;
  background: #f8faf8;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
}

.halaqa-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: #eaf3ed;
  color: #0f5132;
  display: flex;
  align-items: center;
  justify-content: center;
}

.halaqa-box span,
.halaqa-box strong {
  display: block;
}

.halaqa-box span {
  color: #919892;
  font-size: 9px;
}

.halaqa-box strong {
  color: #304039;
  font-size: 12px;
  margin-top: 2px;
}

.field-hint {
  color: #858d88;
  font-size: 10px;
  margin-top: 6px;
}

.quran-range {
  display: grid;
  grid-template-columns:
    minmax(180px, 1fr)
    125px
    32px
    minmax(180px, 1fr)
    125px;
  align-items: end;
  gap: 10px;
}

.range-arrow {
  height: 43px;
  border-radius: 10px;
  background: #edf5ef;
  color: #0f5132;
  display: flex;
  align-items: center;
  justify-content: center;
}

.select-wrap {
  position: relative;
}

.select-wrap select {
  appearance: none;
  padding-left: 34px;
}

.select-wrap > svg {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: #818b84;
  pointer-events: none;
}

.evaluation-area {
  margin-top: 17px;
}

.evaluation-grid {
  display: grid;
  grid-template-columns:
    repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.evaluation-option {
  border: 1px solid #e0e4e1;
  background: #fafbfa;
  color: #59645e;
  border-radius: 10px;
  padding: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  font-weight: 800;
  font-size: 11px;
}

.evaluation-option small {
  border-radius: 7px;
  padding: 3px 6px;
  background: #eef0ee;
  color: #69736d;
  font-size: 10px;
}

.evaluation-option.active.excellent {
  background: #eaf7ee;
  border-color: #8dc7a1;
  color: #0f5132;
}

.evaluation-option.active.very-good,
.evaluation-option.active.good {
  background: #eef7ff;
  border-color: #a8c9e2;
  color: #185c8b;
}

.evaluation-option.active.bad {
  background: #fff1ef;
  border-color: #e5aaa4;
  color: #a3261b;
}

.bottom-grid {
  display: grid;
  grid-template-columns: .65fr 2fr;
  gap: 18px;
  margin-bottom: 18px;
}

.score-card {
  background:
    linear-gradient(145deg, #fff, #f8fbf9);
  border: 1px solid #e0e7e2;
  border-radius: 18px;
  padding: 23px;
  min-height: 190px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-icon {
  width: 43px;
  height: 43px;
  border-radius: 12px;
  background: #fff5dc;
  color: #a57816;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.score-card > span {
  color: #808983;
  font-size: 11px;
}

.score-card > strong {
  color: #173d2b;
  font-size: 45px;
  line-height: 1.1;
  margin: 5px 0;
}

.score-card > strong.positive {
  color: #0f5132;
}

.score-card > strong.negative {
  color: #b42318;
}

.score-card small {
  color: #969d98;
  font-size: 10px;
}

.notes-panel {
  margin: 0;
}

.notes-panel textarea {
  resize: vertical;
  min-height: 125px;
}

.save-bar {
  display: flex;
  gap: 9px;
  margin-bottom: 20px;
}

.save-button,
.cancel-button {
  border-radius: 11px;
  padding: 13px 20px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 900;
  font-size: 13px;
}

.save-button {
  flex: 1;
  border: none;
  background: linear-gradient(135deg, #0f5132, #174f37);
  color: #fff;
  box-shadow: 0 9px 22px rgba(15,81,50,.14);
}

.cancel-button {
  border: 1px solid #dce1dd;
  background: #fff;
  color: #59635d;
}

.spin {
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.records-panel {
  overflow: hidden;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.records-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.records-tools select {
  width: 170px;
  min-height: 42px;
}

.search-records {
  width: 260px;
}

.table-wrapper {
  overflow-x: auto;
  margin: 0 -21px -21px;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1100px;
}

thead {
  background: #f6f8f6;
}

th {
  color: #657069;
  font-size: 11px;
  font-weight: 900;
  padding: 12px 10px;
  border-bottom: 1px solid #e4e8e4;
  white-space: nowrap;
}

td {
  padding: 12px 10px;
  border-bottom: 1px solid #eef0ee;
  text-align: center;
  color: #4f5953;
  font-size: 11px;
}

tbody tr:hover {
  background: #fbfcfb;
}

.date-cell {
  color: #68726c;
  white-space: nowrap;
}

.record-student {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #26332c;
  white-space: nowrap;
}

.record-student > span {
  width: 27px;
  height: 27px;
  border-radius: 8px;
  background: #edf5ef;
  color: #0f5132;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quran-text {
  color: #4d5b53;
  white-space: nowrap;
}

.muted {
  color: #a1a7a3;
}

.evaluation-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  padding: 5px 9px;
  font-weight: 800;
  white-space: nowrap;
  font-size: 10px;
}

.evaluation-badge.excellent {
  background: #e8f6ed;
  color: #0f5132;
}

.evaluation-badge.very-good,
.evaluation-badge.good {
  background: #edf6ff;
  color: #21628f;
}

.evaluation-badge.bad {
  background: #fff0ee;
  color: #a3261b;
}

.evaluation-badge.neutral {
  background: #f0f2f0;
  color: #77817b;
}

.points-positive {
  color: #0f5132;
}

.points-negative {
  color: #b42318;
}

.points-zero {
  color: #7d8580;
}

.row-actions {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.edit-action,
.delete-action {
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.edit-action {
  border: 1px solid #d7e2da;
  background: #f7fbf8;
  color: #0f5132;
  padding: 0 9px;
  font-weight: 800;
  font-size: 10px;
}

.delete-action {
  width: 32px;
  border: 1px solid #f0d9d5;
  background: #fff8f7;
  color: #b42318;
}

.loading-state,
.empty-state {
  min-height: 230px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #89918b;
}

.empty-state > div {
  width: 58px;
  height: 58px;
  border-radius: 17px;
  background: #edf5ef;
  color: #0f5132;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state strong {
  color: #4d5952;
  font-size: 14px;
}

.empty-state span {
  color: #929993;
  font-size: 11px;
}

@media (max-width: 1050px) {
  .stats-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .form-grid.three {
    grid-template-columns:
      1fr 1fr;
  }

  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .page-shell {
    width: min(100% - 22px, 1500px);
    padding-top: 18px;
  }

  .page-header {
    align-items: flex-start;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .form-grid.three {
    grid-template-columns: 1fr;
  }

  .quran-range {
    grid-template-columns:
      1fr 1fr;
  }

  .range-arrow {
    display: none;
  }

  .evaluation-grid {
    grid-template-columns:
      1fr 1fr;
  }

  .records-tools {
    width: 100%;
    flex-direction: column;
  }

  .search-records,
  .records-tools select {
    width: 100%;
  }

  .save-bar {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 16px;
  }

  .evaluation-grid {
    grid-template-columns: 1fr;
  }

  .header-main {
    align-items: flex-start;
  }

  .header-icon {
    width: 48px;
    height: 48px;
  }
.react-datepicker {
  width: 100% !important;
  border: none !important;
  font-family: inherit !important;
}

.react-datepicker__month-container {
  width: 100% !important;
}

.react-datepicker__month {
  width: 100% !important;
}

.react-datepicker__day-name,
.react-datepicker__day {
  width: 4rem !important;
  line-height: 4rem !important;
  margin: 0.25rem !important;
  font-size: 18px !important;
}

.react-datepicker__current-month {
  font-size: 24px !important;
  font-weight: 900 !important;
  margin-bottom: 20px !important;
}

.react-datepicker__navigation {
  top: 20px !important;
}

.react-datepicker__header {
  background: #fff !important;
  border-bottom: 1px solid #E2E8F0 !important;
  padding-bottom: 20px !important;
}

.react-datepicker__day--selected {
  background: #0F766E !important;
  border-radius: 12px !important;
}

.react-datepicker__day:hover {
  border-radius: 12px !important;
}
}
`;
