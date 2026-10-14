import CompactPageHeader from "../components/CompactPageHeader";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

import {
  Users,
  BookOpen,
  Search,
  Plus,
  Trash2,
  ArrowRight,
  Link2,
  UserRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  UserCheck,
  Layers3,
  RotateCcw,
} from "lucide-react";

export default function StudentAssignments() {
  const navigate = useNavigate();

  const { showToast } = useToastSafe();

  const [students, setStudents] = useState([]);
  const [halaqat, setHalaqat] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [studentId, setStudentId] = useState("");
  const [halaqaId, setHalaqaId] = useState("");

  const [search, setSearch] = useState("");
  const [halaqaFilter, setHalaqaFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // تحميل البيانات
  // =========================================================

  async function loadData(options = {}) {
    const silent = options.silent === true;

    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const [
        studentsResult,
        halaqatResult,
        assignmentsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            `
              id,
              full_name,
              user_number,
              phone,
              status,
              role
            `
          )
          .eq("role", "student")
          .order("full_name"),

        supabase
          .from("halaqat")
          .select("*")
          .order("name"),

        supabase
          .from("student_halaqat")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (studentsResult.error) {
        throw new Error(
          `تعذر تحميل الطلاب: ${studentsResult.error.message}`
        );
      }

      if (halaqatResult.error) {
        throw new Error(
          `تعذر تحميل الحلقات: ${halaqatResult.error.message}`
        );
      }

      if (assignmentsResult.error) {
        throw new Error(
          `تعذر تحميل ارتباطات الطلاب: ${assignmentsResult.error.message}`
        );
      }

      setStudents(studentsResult.data || []);
      setHalaqat(halaqatResult.data || []);
      setAssignments(assignmentsResult.data || []);
    } catch (err) {
      console.error(err);

      const message =
        err?.message ||
        "حدث خطأ أثناء تحميل البيانات.";

      setError(message);

      if (!silent) {
        showToast(message, "error");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  // =========================================================
  // بيانات محسنة للعرض
  // =========================================================

  const enrichedAssignments = useMemo(() => {
    return assignments.map((assignment) => {
      const student = students.find(
        (item) =>
          Number(item.id) ===
          Number(assignment.student_id)
      );

      const halaqa = halaqat.find(
        (item) =>
          Number(item.id) ===
          Number(assignment.halaqa_id)
      );

      return {
        ...assignment,
        student,
        halaqa,
      };
    });
  }, [
    assignments,
    students,
    halaqat,
  ]);

  // =========================================================
  // الارتباطات الحالية
  // =========================================================

  const currentAssignments = useMemo(() => {
    return enrichedAssignments.filter(
      (item) =>
        item.is_current !== false
    );
  }, [enrichedAssignments]);

  // =========================================================
  // البحث والفلترة
  // =========================================================

  const filteredAssignments =
    useMemo(() => {
      const text =
        search.trim().toLowerCase();

      return currentAssignments.filter(
        (assignment) => {
          const studentName =
            assignment.student
              ?.full_name || "";

          const studentNumber =
            assignment.student
              ?.user_number || "";

          const halaqaName =
            assignment.halaqa?.name || "";

          const matchesSearch =
            !text ||
            studentName
              .toLowerCase()
              .includes(text) ||
            String(studentNumber)
              .toLowerCase()
              .includes(text) ||
            halaqaName
              .toLowerCase()
              .includes(text);

          const matchesHalaqa =
            halaqaFilter === "all" ||
            Number(
              assignment.halaqa_id
            ) === Number(halaqaFilter);

          return (
            matchesSearch &&
            matchesHalaqa
          );
        }
      );
    }, [
      currentAssignments,
      search,
      halaqaFilter,
    ]);

  // =========================================================
  // إحصائيات
  // =========================================================

  const totalStudents =
    students.length;

  const assignedStudents =
    new Set(
      currentAssignments.map(
        (item) =>
          Number(item.student_id)
      )
    ).size;

  const unassignedStudents =
    Math.max(
      totalStudents -
        assignedStudents,
      0
    );

  const totalHalaqat =
    halaqat.length;

  // =========================================================
  // الطلاب غير المرتبطين
  // =========================================================

  const availableStudents =
    useMemo(() => {
      const currentStudentIds =
        new Set(
          currentAssignments.map(
            (item) =>
              Number(
                item.student_id
              )
          )
        );

      return students.filter(
        (student) =>
          !currentStudentIds.has(
            Number(student.id)
          )
      );
    }, [
      students,
      currentAssignments,
    ]);

  // =========================================================
  // ربط الطالب
  // =========================================================

  async function assignStudent() {
    if (!studentId || !halaqaId) {
      showToast(
        "اختر الطالب والحلقة أولاً.",
        "info"
      );
      return;
    }

    const numericStudentId =
      Number(studentId);

    const numericHalaqaId =
      Number(halaqaId);

    const student = students.find(
      (item) =>
        Number(item.id) ===
        numericStudentId
    );

    const halaqa = halaqat.find(
      (item) =>
        Number(item.id) ===
        numericHalaqaId
    );

    if (!student || !halaqa) {
      showToast(
        "بيانات الطالب أو الحلقة غير صحيحة.",
        "error"
      );
      return;
    }

    const existingCurrent =
      currentAssignments.find(
        (item) =>
          Number(
            item.student_id
          ) === numericStudentId
      );

    if (
      existingCurrent &&
      Number(
        existingCurrent.halaqa_id
      ) === numericHalaqaId
    ) {
      showToast(
        "الطالب مرتبط بهذه الحلقة بالفعل.",
        "info"
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * إذا كان الطالب مرتبطًا بحلقة حالية،
       * نقوم أولاً بإلغاء ارتباطه الحالي.
       */

      if (existingCurrent) {
        const {
          error: updateError,
        } = await supabase
          .from("student_halaqat")
          .update({
            is_current: false,
          })
          .eq(
            "id",
            existingCurrent.id
          );

        if (updateError) {
          throw updateError;
        }
      }

      /*
       * إنشاء الارتباط الجديد
       */

      const {
        error: insertError,
      } = await supabase
        .from("student_halaqat")
        .insert([
          {
            student_id:
              numericStudentId,

            halaqa_id:
              numericHalaqaId,

            is_current: true,
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      setStudentId("");
      setHalaqaId("");

      await loadData({
        silent: true,
      });

      if (existingCurrent) {
        showToast(
          `تم نقل ${student.full_name} إلى ${halaqa.name} بنجاح.`,
          "success"
        );
      } else {
        showToast(
          `تم ربط ${student.full_name} بحلقة ${halaqa.name}.`,
          "success"
        );
      }
    } catch (err) {
      console.error(err);

      showToast(
        err?.message ||
          "تعذر ربط الطالب بالحلقة.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // حذف / إنهاء الارتباط
  // =========================================================

  async function removeAssignment(
    assignment
  ) {
    if (!assignment) return;

    const studentName =
      assignment.student?.full_name ||
      "الطالب";

    const halaqaName =
      assignment.halaqa?.name ||
      "الحلقة";

    const confirmed =
      window.confirm(
        `هل تريد إنهاء ارتباط ${studentName} بحلقة ${halaqaName}؟`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      assignment.id
    );

    try {
      /*
       * بدل حذف السجل بالكامل،
       * نحافظ على السجل التاريخي
       * ونجعله غير حالي.
       */

      const {
        error: updateError,
      } = await supabase
        .from("student_halaqat")
        .update({
          is_current: false,
        })
        .eq(
          "id",
          assignment.id
        );

      if (updateError) {
        throw updateError;
      }

      await loadData({
        silent: true,
      });

      showToast(
        `تم إنهاء ارتباط ${studentName} بالحَلقة.`,
        "success"
      );
    } catch (err) {
      console.error(err);

      showToast(
        err?.message ||
          "تعذر إنهاء ارتباط الطالب.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  }

  // =========================================================
  // إعادة ضبط
  // =========================================================

  function resetFilters() {
    setSearch("");
    setHalaqaFilter("all");
  }

  // =========================================================
  // حالة تحميل
  // =========================================================

  if (loading) {
    return (
      <PageShell>
        <LoadingScreen />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <CompactPageHeader title="ربط الطلاب بالحلقات" actions={<>
<button
            type="button"
            onClick={() =>
              navigate("/admin")
            }
            style={backButton}
            title="العودة للوحة المشرف"
          >
            <ArrowRight size={17} /> العودة للوحة المشرف</button>
<button
          type="button"
          onClick={() =>
            loadData()
          }
          style={
            refreshButton
          }
        >
          <RefreshCw
            size={16}
          />

          تحديث البيانات
        </button>
</>} />

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div
          style={{
            background:
              "#fff4f3",
            border:
              "1px solid #f0cbc8",
            borderRadius:
              "calc(14px * var(--app-radius-scale,1))",
            padding:
              "calc(13px * var(--app-density,1)) calc(15px * var(--app-density,1))",
            marginBottom:
              "20px",
            display: "flex",
            alignItems:
              "center",
            gap: "calc(9px * var(--app-density,1))",
            color: "#a1261c",
            fontSize: "calc(13px * var(--app-font-scale,1))",
          }}
        >
          <AlertCircle
            size={18}
          />

          <span
            style={{
              flex: 1,
            }}
          >
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            style={{
              border: "none",
              background:
                "transparent",
              cursor: "pointer",
              color: "#a1261c",
            }}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(190px,1fr))",
          gap: "calc(15px * var(--app-density,1))",
          marginBottom:
            "24px",
        }}
      >
        <StatCard
          icon={<Users size={22} />}
          title="إجمالي الطلاب"
          value={totalStudents}
        />

        <StatCard
          icon={
            <UserCheck
              size={22}
            />
          }
          title="مرتبطون بحلقات"
          value={
            assignedStudents
          }
        />

        <StatCard
          icon={
            <UserRound
              size={22}
            />
          }
          title="بدون حلقة"
          value={
            unassignedStudents
          }
        />

        <StatCard
          icon={
            <Layers3
              size={22}
            />
          }
          title="عدد الحلقات"
          value={totalHalaqat}
        />
      </section>

      {/* =====================================================
          ADD ASSIGNMENT
      ===================================================== */}

      <section
        style={cardStyle}
      >
        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: "calc(11px * var(--app-density,1))",
            marginBottom:
              "18px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius:
                "calc(12px * var(--app-radius-scale,1))",
              background:
                "var(--app-color-edf5ef,#edf5ef)",
              color: "var(--app-color-0f5132,#0f5132)",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
            }}
          >
            <Plus
              size={21}
            />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                color: "var(--app-color-173d2b,#173d2b)",
                fontSize: "calc(19px * var(--app-font-scale,1))",
              }}
            >
              ربط طالب بحلقة
            </h2>

            <p
              style={{
                margin:
                  "4px 0 0",
                color: "#858d88",
                fontSize: "calc(12px * var(--app-font-scale,1))",
              }}
            >
              اختر الطالب والحلقة لإضافة
              ارتباط جديد
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr auto",
            gap: "calc(12px * var(--app-density,1))",
            alignItems:
              "end",
          }}
        >
          {/* الطالب */}

          <SelectField
            label="الطالب"
            value={studentId}
            onChange={
              setStudentId
            }
            icon={
              <UserRound
                size={17}
              />
            }
          >
            <option value="">
              اختر الطالب
            </option>

            {availableStudents.map(
              (student) => (
                <option
                  key={
                    student.id
                  }
                  value={
                    student.id
                  }
                >
                  {student.full_name}
                  {student.user_number
                    ? ` — ${student.user_number}`
                    : ""}
                </option>
              )
            )}
          </SelectField>

          {/* الحلقة */}

          <SelectField
            label="الحلقة"
            value={halaqaId}
            onChange={
              setHalaqaId
            }
            icon={
              <BookOpen
                size={17}
              />
            }
          >
            <option value="">
              اختر الحلقة
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
          </SelectField>

          <button
            type="button"
            onClick={
              assignStudent
            }
            disabled={
              saving ||
              !studentId ||
              !halaqaId
            }
            style={{
              height: "46px",
              padding:
                "0 calc(20px * var(--app-density,1))",
              border: "none",
              borderRadius:
                "calc(10px * var(--app-radius-scale,1))",
              background:
                saving ||
                !studentId ||
                !halaqaId
                  ? "#9aada2"
                  : "var(--app-color-0f5132,#0f5132)",
              color: "#fff",
              cursor:
                saving ||
                !studentId ||
                !halaqaId
                  ? "not-allowed"
                  : "pointer",
              display: "inline-flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              gap: "calc(7px * var(--app-density,1))",
              fontWeight: "800",
              fontSize: "calc(13px * var(--app-font-scale,1))",
              whiteSpace:
                "nowrap",
            }}
          >
            {saving ? (
              <>
                <Spinner />

                جارٍ الربط...
              </>
            ) : (
              <>
                <Link2
                  size={17}
                />

                ربط الطالب
              </>
            )}
          </button>
        </div>

        <div
          style={{
            marginTop:
              "13px",
            padding:
              "calc(10px * var(--app-density,1)) calc(12px * var(--app-density,1))",
            borderRadius:
              "calc(10px * var(--app-radius-scale,1))",
            background:
              "#fafbf9",
            color: "#77817b",
            fontSize: "calc(11px * var(--app-font-scale,1))",
            display: "flex",
            alignItems:
              "center",
            gap: "calc(7px * var(--app-density,1))",
          }}
        >
          <CheckCircle2
            size={15}
            color="#0f5132"
          />

          إذا كان الطالب مرتبطًا بحلقة
          أخرى، سيتم إنهاء ارتباطه الحالي
          ونقله للحلقة الجديدة مع الاحتفاظ
          بالسجل السابق.
        </div>
      </section>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <section
        style={{
          ...cardStyle,
          padding: "calc(15px * var(--app-density,1))",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(250px,1fr) 240px auto",
            gap: "calc(10px * var(--app-density,1))",
          }}
        >
          <div
            style={{
              position:
                "relative",
            }}
          >
            <Search
              size={18}
              style={{
                position:
                  "absolute",
                right:
                  "13px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                color: "#8b938e",
              }}
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="ابحث باسم الطالب أو رقمه أو الحلقة..."
              style={{
                ...inputStyle,
                paddingRight:
                  "calc(42px * var(--app-density,1))",
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                style={{
                  position:
                    "absolute",
                  left:
                    "8px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  width: "30px",
                  height:
                    "30px",
                  border:
                    "none",
                  borderRadius:
                    "calc(8px * var(--app-radius-scale,1))",
                  background:
                    "#f0f2f0",
                  color:
                    "#777",
                  cursor:
                    "pointer",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <select
            value={
              halaqaFilter
            }
            onChange={(e) =>
              setHalaqaFilter(
                e.target.value
              )
            }
            style={
              inputStyle
            }
          >
            <option value="all">
              جميع الحلقات
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

          {(search ||
            halaqaFilter !==
              "all") && (
            <button
              type="button"
              onClick={
                resetFilters
              }
              style={
                clearFilterButton
              }
            >
              <RotateCcw
                size={15}
              />

              تصفير
            </button>
          )}
        </div>
      </section>

      {/* =====================================================
          LIST HEADER
      ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginBottom:
            "14px",
          gap: "calc(10px * var(--app-density,1))",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "var(--app-color-173d2b,#173d2b)",
              fontSize: "calc(20px * var(--app-font-scale,1))",
            }}
          >
            الطلاب المرتبطون
          </h2>

          <p
            style={{
              margin:
                "4px 0 0",
              color: "#8a918d",
              fontSize: "calc(11px * var(--app-font-scale,1))",
            }}
          >
            عرض{" "}
            {
              filteredAssignments.length
            }{" "}
            من{" "}
            {
              currentAssignments.length
            }{" "}
            ارتباط حالي
          </p>
        </div>

        <div
          style={{
            padding:
              "calc(7px * var(--app-density,1)) calc(11px * var(--app-density,1))",
            background:
              "var(--app-color-edf5ef,#edf5ef)",
            color: "var(--app-color-0f5132,#0f5132)",
            borderRadius:
              "calc(9px * var(--app-radius-scale,1))",
            fontSize: "calc(12px * var(--app-font-scale,1))",
            fontWeight: "800",
          }}
        >
          {assignedStudents} طالب
        </div>
      </div>

      {/* =====================================================
          EMPTY
      ===================================================== */}

      {filteredAssignments.length ===
      0 ? (
        <EmptyState
          hasFilters={
            Boolean(search) ||
            halaqaFilter !==
              "all"
          }
          onReset={
            resetFilters
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(300px,1fr))",
            gap: "calc(16px * var(--app-density,1))",
          }}
        >
          {filteredAssignments.map(
            (assignment) => (
              <AssignmentCard
                key={
                  assignment.id
                }
                assignment={
                  assignment
                }
                deleting={
                  deletingId ===
                  assignment.id
                }
                onRemove={
                  removeAssignment
                }
              />
            )
          )}
        </div>
      )}
    </PageShell>
  );
}

// =============================================================
// Page Shell
// =============================================================

function PageShell({
  children,
}) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "#f7f5ef",
        padding:
          "calc(28px * var(--app-density,1)) calc(30px * var(--app-density,1))",
        boxSizing:
          "border-box",
        color:
          "#26332c",
        position:
          "relative",
        overflowX:
          "hidden",
      }}
    >
      <div
        style={{
          position:
            "fixed",
          inset: 0,
          pointerEvents:
            "none",
          opacity:
            0.035,
          backgroundImage: 'url("/ornaments/sadiq/emerald/05-wasl.svg")',
          backgroundSize:
            "290px 290px",
        }}
      />

      <div
        style={{
          position:
            "relative",
          zIndex: 1,
          maxWidth:
            "1450px",
          margin:
            "0 auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================
// Assignment Card
// =============================================================

function AssignmentCard({
  assignment,
  deleting,
  onRemove,
}) {
  const student =
    assignment.student;

  const halaqa =
    assignment.halaqa;

  return (
    <div
      style={{
        background:
          "#fff",
        border:
          "1px solid #e4e8e4",
        borderRadius:
          "calc(18px * var(--app-radius-scale,1))",
        padding:
          "calc(18px * var(--app-density,1))",
        boxShadow:
          "0 5px 18px rgba(0,0,0,.045)",
      }}
    >
      {/* Header */}

      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          gap: "calc(11px * var(--app-density,1))",
          marginBottom:
            "17px",
        }}
      >
        <div
          style={{
            width:
              "49px",
            height:
              "49px",
            flexShrink: 0,
            borderRadius:
              "calc(14px * var(--app-radius-scale,1))",
            background:
              "var(--app-color-edf5ef,#edf5ef)",
            color:
              "var(--app-color-0f5132,#0f5132)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          <UserRound
            size={24}
            strokeWidth={
              1.7
            }
          />
        </div>

        <div
          style={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <h3
            style={{
              margin: 0,
              color:
                "var(--app-color-173d2b,#173d2b)",
              fontSize:
                "calc(17px * var(--app-font-scale,1))",
              fontWeight:
                "800",
              overflow:
                "hidden",
              whiteSpace:
                "nowrap",
              textOverflow:
                "ellipsis",
            }}
          >
            {student?.full_name ||
              "طالب غير معروف"}
          </h3>

          <div
            style={{
              marginTop:
                "4px",
              color:
                "#89918c",
              fontSize:
                "calc(11px * var(--app-font-scale,1))",
            }}
          >
            رقم الطالب:{" "}
            {student?.user_number ||
              "-"}
          </div>
        </div>

        <span
          style={{
            padding:
              "calc(5px * var(--app-density,1)) calc(9px * var(--app-density,1))",
            borderRadius:
              "calc(20px * var(--app-radius-scale,1))",
            background:
              "#e8f6ed",
            color:
              "var(--app-color-0f5132,#0f5132)",
            fontSize:
              "calc(10px * var(--app-font-scale,1))",
            fontWeight:
              "800",
            whiteSpace:
              "nowrap",
          }}
        >
          مرتبط
        </span>
      </div>

      {/* Halaqa */}

      <div
        style={{
          background:
            "#fafbf9",
          border:
            "1px solid #edf0ed",
          borderRadius:
            "calc(13px * var(--app-radius-scale,1))",
          padding:
            "calc(13px * var(--app-density,1))",
          marginBottom:
            "15px",
        }}
      >
        <div
          style={{
            color:
              "#8a928d",
            fontSize:
              "calc(11px * var(--app-font-scale,1))",
            marginBottom:
              "7px",
          }}
        >
          الحلقة الحالية
        </div>

        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "calc(8px * var(--app-density,1))",
            color:
              "var(--app-color-173d2b,#173d2b)",
            fontSize:
              "calc(15px * var(--app-font-scale,1))",
            fontWeight:
              "800",
          }}
        >
          <BookOpen
            size={18}
            color="#0f5132"
          />

          {halaqa?.name ||
            "حلقة غير معروفة"}
        </div>
      </div>

      {/* Info */}

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap:
            "calc(8px * var(--app-density,1))",
          marginBottom:
            "16px",
        }}
      >
        <InfoBox
          label="الحالة"
          value={
            student?.status ===
            "active"
              ? "نشط"
              : "غير نشط"
          }
        />

        <InfoBox
          label="الجوال"
          value={
            student?.phone ||
            "غير مسجل"
          }
        />
      </div>

      {/* Action */}

      <button
        type="button"
        disabled={
          deleting
        }
        onClick={() =>
          onRemove(
            assignment
          )
        }
        style={{
          width:
            "100%",
          border:
            "1px solid #f0d8d5",
          background:
            deleting
              ? "#f4dddd"
              : "#fff8f7",
          color:
            "#b42318",
          borderRadius:
            "calc(10px * var(--app-radius-scale,1))",
          padding:
            "calc(10px * var(--app-density,1))",
          cursor:
            deleting
              ? "wait"
              : "pointer",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          gap:
            "calc(7px * var(--app-density,1))",
          fontSize:
            "calc(12px * var(--app-font-scale,1))",
          fontWeight:
            "800",
        }}
      >
        {deleting ? (
          <>
            <Spinner />

            جارٍ إنهاء الارتباط...
          </>
        ) : (
          <>
            <Trash2
              size={16}
            />

            إنهاء ارتباط الطالب
          </>
        )}
      </button>
    </div>
  );
}

// =============================================================
// Stat Card
// =============================================================

function StatCard({
  icon,
  title,
  value,
}) {
  return (
    <div
      style={{
        background:
          "#fff",
        border:
          "1px solid #e5e9e5",
        borderRadius:
          "calc(16px * var(--app-radius-scale,1))",
        padding:
          "calc(18px * var(--app-density,1))",
        display:
          "flex",
        alignItems:
          "center",
        gap:
          "calc(12px * var(--app-density,1))",
        boxShadow:
          "0 4px 14px rgba(0,0,0,.035)",
      }}
    >
      <div
        style={{
          width:
            "45px",
          height:
            "45px",
          borderRadius:
            "calc(13px * var(--app-radius-scale,1))",
          background:
            "var(--app-color-edf5ef,#edf5ef)",
          color:
            "var(--app-color-0f5132,#0f5132)",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          flexShrink:
            0,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            color:
              "#818a84",
            fontSize:
              "calc(11px * var(--app-font-scale,1))",
            marginBottom:
              "3px",
          }}
        >
          {title}
        </div>

        <strong
          style={{
            color:
              "var(--app-color-173d2b,#173d2b)",
            fontSize:
              "calc(24px * var(--app-font-scale,1))",
          }}
        >
          {value}
        </strong>
      </div>
    </div>
  );
}

// =============================================================
// Info Box
// =============================================================

function InfoBox({
  label,
  value,
}) {
  return (
    <div
      style={{
        background:
          "#fafafa",
        borderRadius:
          "calc(10px * var(--app-radius-scale,1))",
        padding:
          "calc(10px * var(--app-density,1))",
      }}
    >
      <div
        style={{
          color:
            "#969d98",
          fontSize:
            "calc(10px * var(--app-font-scale,1))",
          marginBottom:
            "3px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color:
            "#4c5750",
          fontSize:
            "calc(11px * var(--app-font-scale,1))",
          fontWeight:
            "700",
          overflow:
            "hidden",
          whiteSpace:
            "nowrap",
          textOverflow:
            "ellipsis",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// =============================================================
// Select Field
// =============================================================

function SelectField({
  label,
  value,
  onChange,
  icon,
  children,
}) {
  return (
    <div>
      <label
        style={{
          display:
            "block",
          marginBottom:
            "7px",
          color:
            "#465149",
          fontSize:
            "calc(12px * var(--app-font-scale,1))",
          fontWeight:
            "800",
        }}
      >
        {label}
      </label>

      <div
        style={{
          position:
            "relative",
        }}
      >
        <span
          style={{
            position:
              "absolute",
            right:
              "13px",
            top:
              "50%",
            transform:
              "translateY(-50%)",
            color:
              "#84908a",
            pointerEvents:
              "none",
            display:
              "flex",
          }}
        >
          {icon}
        </span>

        <select
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          style={{
            ...inputStyle,
            paddingRight:
              "calc(40px * var(--app-density,1))",
            appearance:
              "none",
          }}
        >
          {children}
        </select>

        <ChevronDown
          size={16}
          style={{
            position:
              "absolute",
            left:
              "12px",
            top:
              "50%",
            transform:
              "translateY(-50%)",
            color:
              "#89918c",
            pointerEvents:
              "none",
          }}
        />
      </div>
    </div>
  );
}

// =============================================================
// Empty State
// =============================================================

function EmptyState({
  hasFilters,
  onReset,
}) {
  return (
    <div
      style={{
        background:
          "#fff",
        border:
          "1px solid #e5e8e4",
        borderRadius:
          "calc(18px * var(--app-radius-scale,1))",
        padding:
          "calc(55px * var(--app-density,1)) calc(20px * var(--app-density,1))",
        textAlign:
          "center",
      }}
    >
      <div
        style={{
          width:
            "65px",
          height:
            "65px",
          margin:
            "0 auto 14px",
          borderRadius:
            "calc(18px * var(--app-radius-scale,1))",
          background:
            "var(--app-color-edf5ef,#edf5ef)",
          color:
            "var(--app-color-0f5132,#0f5132)",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
        }}
      >
        {hasFilters ? (
          <Search
            size={28}
          />
        ) : (
          <Link2
            size={28}
          />
        )}
      </div>

      <h3
        style={{
          margin:
            "0 0 7px",
          color:
            "#354139",
          fontSize:
            "calc(17px * var(--app-font-scale,1))",
        }}
      >
        {hasFilters
          ? "لا توجد نتائج"
          : "لا توجد ارتباطات حالية"}
      </h3>

      <p
        style={{
          margin: 0,
          color:
            "#929993",
          fontSize:
            "calc(12px * var(--app-font-scale,1))",
        }}
      >
        {hasFilters
          ? "لم نجد ارتباطًا مطابقًا للبحث أو الفلتر."
          : "ابدأ بربط الطلاب بالحلقات من النموذج أعلاه."}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          style={{
            marginTop:
              "15px",
            border:
              "none",
            background:
              "var(--app-color-0f5132,#0f5132)",
            color:
              "#fff",
            borderRadius:
              "calc(9px * var(--app-radius-scale,1))",
            padding:
              "calc(9px * var(--app-density,1)) calc(16px * var(--app-density,1))",
            cursor:
              "pointer",
            fontSize:
              "calc(12px * var(--app-font-scale,1))",
            fontWeight:
              "700",
          }}
        >
          تصفير البحث
        </button>
      )}
    </div>
  );
}

// =============================================================
// Loading
// =============================================================

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight:
          "70vh",
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
      }}
    >
      <div
        style={{
          background:
            "#fff",
          border:
            "1px solid #e5e8e4",
          borderRadius:
            "calc(18px * var(--app-radius-scale,1))",
          padding:
            "calc(35px * var(--app-density,1)) calc(45px * var(--app-density,1))",
          textAlign:
            "center",
          boxShadow:
            "0 8px 25px rgba(0,0,0,.04)",
        }}
      >
        <Spinner large />

        <div
          style={{
            marginTop:
              "14px",
            color:
              "#69736d",
            fontSize:
              "calc(13px * var(--app-font-scale,1))",
            fontWeight:
              "700",
          }}
        >
          جاري تحميل بيانات الطلاب والحلقات...
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Spinner
// =============================================================

function Spinner({
  large = false,
}) {
  const size =
    large ? 34 : 15;

  return (
    <span
      style={{
        width:
          `${size}px`,
        height:
          `${size}px`,
        border:
          `${large ? 3 : 2}px solid rgba(255,255,255,.45)`,
        borderTopColor:
          "#fff",
        borderRadius:
          "50%",
        display:
          "inline-block",
        animation:
          "sadiqSpin .7s linear infinite",
      }}
    />
  );
}

// =============================================================
// Toast Hook
// =============================================================

function useToastSafe() {
  /*
   * نستخدم الـToast المركزي الموجود في
   * components/Toast.jsx
   *
   * لو كان الـProvider موجودًا:
   * سيعمل بشكل طبيعي.
   *
   * ولو لم يكن موجودًا لأي سبب،
   * نستخدم fallback حتى لا تنهار الصفحة.
   */

  const context =
    typeof window !==
    "undefined"
      ? window.__SADIQ_TOAST_CONTEXT__
      : null;

  if (context) {
    return context;
  }

  return {
    showToast: (
      message,
      type = "success"
    ) => {
      window.dispatchEvent(
        new CustomEvent(
          "app:toast",
          {
            detail: {
              message,
              type,
            },
          }
        )
      );
    },
  };
}

// =============================================================
// Styles
// =============================================================

const cardStyle = {
  background:
    "#fff",
  border:
    "1px solid #e5e8e4",
  borderRadius:
    "calc(18px * var(--app-radius-scale,1))",
  padding:
    "calc(21px * var(--app-density,1))",
  marginBottom:
    "20px",
  boxShadow:
    "0 4px 15px rgba(0,0,0,.035)",
};

const inputStyle = {
  width:
    "100%",
  height:
    "46px",
  padding:
    "0 calc(12px * var(--app-density,1))",
  boxSizing:
    "border-box",
  border:
    "1px solid #d9dfdb",
  borderRadius:
    "calc(10px * var(--app-radius-scale,1))",
  outline:
    "none",
  fontSize:
    "calc(13px * var(--app-font-scale,1))",
  color:
    "#26332c",
  background:
    "#fff",
  direction:
    "rtl",
};

const backButton = {
  width:
    "43px",
  height:
    "43px",
  border:
    "1px solid #e0e4df",
  background:
    "#fff",
  color:
    "var(--app-color-173d2b,#173d2b)",
  borderRadius:
    "calc(11px * var(--app-radius-scale,1))",
  cursor:
    "pointer",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
};

const refreshButton = {
  border:
    "1px solid #dce3de",
  background:
    "#fff",
  color:
    "var(--app-color-0f5132,#0f5132)",
  borderRadius:
    "calc(10px * var(--app-radius-scale,1))",
  padding:
    "calc(10px * var(--app-density,1)) calc(14px * var(--app-density,1))",
  cursor:
    "pointer",
  display:
    "inline-flex",
  alignItems:
    "center",
  gap:
    "calc(7px * var(--app-density,1))",
  fontSize:
    "calc(12px * var(--app-font-scale,1))",
  fontWeight:
    "700",
};

const clearFilterButton = {
  height:
    "46px",
  border:
    "1px solid #d9dfdb",
  background:
    "#fff",
  color:
    "#66706a",
  borderRadius:
    "calc(10px * var(--app-radius-scale,1))",
  padding:
    "0 calc(13px * var(--app-density,1))",
  cursor:
    "pointer",
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap:
    "calc(6px * var(--app-density,1))",
  fontSize:
    "calc(12px * var(--app-font-scale,1))",
  fontWeight:
    "700",
};