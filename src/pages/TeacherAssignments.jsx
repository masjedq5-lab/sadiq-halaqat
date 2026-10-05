import {displayDateFormatter} from "../lib/calendar";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";

import { Users, BookOpen, UserRound, Plus, Trash2, ArrowRight, Search, RefreshCw, Link2, X, ShieldCheck } from "lucide-react";

export default function TeacherAssignments() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [teachers, setTeachers] = useState([]);
  const [halaqat, setHalaqat] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [teacherId, setTeacherId] = useState("");
  const [halaqaId, setHalaqaId] = useState("");
  const [assignmentRole, setAssignmentRole] =
    useState("main");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================
  // تحميل البيانات
  // ==========================================

  async function loadData() {
    setLoading(true);

    try {
      const [
        teachersResult,
        halaqatResult,
        assignmentsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, user_number, phone, status"
          )
          .eq("role", "teacher")
          .order("full_name"),

        supabase
          .from("halaqat")
          .select("id, name, mosque_id")
          .order("name"),

        supabase
          .from("teacher_halaqat")
          .select(
            "id, teacher_id, halaqa_id, role, created_at"
          )
          .order("id", {
            ascending: false,
          }),
      ]);

      if (teachersResult.error) {
        throw new Error(
          `تعذر تحميل المعلمين: ${teachersResult.error.message}`
        );
      }

      if (halaqatResult.error) {
        throw new Error(
          `تعذر تحميل الحلقات: ${halaqatResult.error.message}`
        );
      }

      if (assignmentsResult.error) {
        throw new Error(
          `تعذر تحميل روابط المعلمين: ${assignmentsResult.error.message}`
        );
      }

      setTeachers(
        teachersResult.data || []
      );

      setHalaqat(
        halaqatResult.data || []
      );

      setAssignments(
        assignmentsResult.data || []
      );
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "حدث خطأ أثناء تحميل البيانات",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // ربط المعلم
  // ==========================================

  async function assignTeacher() {
    if (!teacherId) {
      showToast(
        "اختر المعلم أولًا",
        "error"
      );
      return;
    }

    if (!halaqaId) {
      showToast(
        "اختر الحلقة أولًا",
        "error"
      );
      return;
    }

    const teacherNumber =
      Number(teacherId);

    const halaqaNumber =
      Number(halaqaId);

    // منع الربط المكرر
    const alreadyAssigned =
      assignments.some(
        (item) =>
          Number(item.teacher_id) ===
            teacherNumber &&
          Number(item.halaqa_id) ===
            halaqaNumber
      );

    if (alreadyAssigned) {
      showToast(
        "هذا المعلم مرتبط بهذه الحلقة بالفعل",
        "info"
      );
      return;
    }

    setSaving(true);

    try {
      const { error } =
        await supabase
          .from("teacher_halaqat")
          .insert([
            {
              teacher_id:
                teacherNumber,

              halaqa_id:
                halaqaNumber,

              role:
                assignmentRole,
            },
          ]);

      if (error) {
        throw error;
      }

      const teacher =
        teachers.find(
          (item) =>
            Number(item.id) ===
            teacherNumber
        );

      const halaqa =
        halaqat.find(
          (item) =>
            Number(item.id) ===
            halaqaNumber
        );

      showToast(
        `تم ربط ${teacher?.full_name || "المعلم"} بحلقة ${halaqa?.name || ""}`,
        "success"
      );

      setTeacherId("");
      setHalaqaId("");
      setAssignmentRole("main");

      await loadData();
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "تعذر ربط المعلم بالحلقة",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // حذف الربط
  // ==========================================

  async function deleteAssignment(
    assignment
  ) {
    const teacher =
      teachers.find(
        (item) =>
          Number(item.id) ===
          Number(
            assignment.teacher_id
          )
      );

    const halaqa =
      halaqat.find(
        (item) =>
          Number(item.id) ===
          Number(
            assignment.halaqa_id
          )
      );

    const confirmed =
      window.confirm(
        `هل تريد حذف ربط المعلم "${teacher?.full_name || ""}" بحلقة "${halaqa?.name || ""}"؟`
      );

    if (!confirmed) return;

    setDeletingId(
      assignment.id
    );

    try {
      const { error } =
        await supabase
          .from("teacher_halaqat")
          .delete()
          .eq(
            "id",
            assignment.id
          );

      if (error) {
        throw error;
      }

      showToast(
        "تم حذف الربط بنجاح",
        "success"
      );

      await loadData();
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "تعذر حذف الربط",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ==========================================
  // أسماء
  // ==========================================

  function teacherName(id) {
    return (
      teachers.find(
        (teacher) =>
          Number(teacher.id) ===
          Number(id)
      )?.full_name ||
      "معلم غير معروف"
    );
  }

  function teacherNumber(id) {
    return (
      teachers.find(
        (teacher) =>
          Number(teacher.id) ===
          Number(id)
      )?.user_number || ""
    );
  }

  function halaqaName(id) {
    return (
      halaqat.find(
        (halaqa) =>
          Number(halaqa.id) ===
          Number(id)
      )?.name ||
      "حلقة غير معروفة"
    );
  }

  // ==========================================
  // فلترة البحث
  // ==========================================

  const filteredAssignments =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLowerCase();

      if (!text) {
        return assignments;
      }

      return assignments.filter(
        (assignment) => {
          const teacher =
            teacherName(
              assignment.teacher_id
            ).toLowerCase();

          const halaqa =
            halaqaName(
              assignment.halaqa_id
            ).toLowerCase();

          const number =
            teacherNumber(
              assignment.teacher_id
            ).toLowerCase();

          return (
            teacher.includes(text) ||
            halaqa.includes(text) ||
            number.includes(text)
          );
        }
      );
    }, [
      assignments,
      teachers,
      halaqat,
      search,
    ]);

  // ==========================================
  // إحصائيات
  // ==========================================

  const totalTeachers =
    teachers.length;

  const totalHalaqat =
    halaqat.length;

  const totalAssignments =
    assignments.length;

  const mainAssignments =
    assignments.filter(
      (item) =>
        item.role === "main"
    ).length;

  // ==========================================
  // العرض
  // ==========================================

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#f7f5ef 0%,#eef5f0 50%,#f8f6f0 100%)",
        padding: "calc(28px * var(--app-density,1))",
        boxSizing: "border-box",
        color: "#26332c",
      }}
    >
      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <header
        style={{
          maxWidth: "1250px",
          margin: "0 auto 25px",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "calc(15px * var(--app-density,1))",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "calc(13px * var(--app-density,1))",
          }}
        >
          <button
            type="button"
            onClick={() =>
              navigate("/admin")
            }
            style={iconButton}
            title="العودة للوحة المشرف"
          >
            <ArrowRight
              size={20}
            />
          </button>

          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "calc(15px * var(--app-radius-scale,1))",
              background: "var(--app-color-0f5132,#0f5132)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              boxShadow:
                "0 8px 20px color-mix(in srgb,var(--app-color-0f5132,#0f5132) 15%,transparent)",
            }}
          >
            <Link2
              size={25}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                color: "var(--app-color-173d2b,#173d2b)",
                fontSize: "calc(29px * var(--app-font-scale,1))",
                fontWeight: "850",
              }}
            >
              ربط المعلمين بالحلقات
            </h1>

            <p
              style={{
                margin:
                  "5px 0 0",
                color: "#7b847e",
                fontSize: "calc(13px * var(--app-font-scale,1))",
              }}
            >
              إدارة توزيع المعلمين على الحلقات
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          style={{
            ...secondaryButton,
            opacity:
              loading ? 0.6 : 1,
          }}
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "spin"
                : ""
            }
          />

          تحديث البيانات
        </button>
      </header>

      <main
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
        }}
      >
        {/* ================================= */}
        {/* STATS */}
        {/* ================================= */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(210px,1fr))",
            gap: "calc(14px * var(--app-density,1))",
            marginBottom: "22px",
          }}
        >
          <StatCard
            icon={<Users size={22} />}
            title="المعلمون"
            value={totalTeachers}
          />

          <StatCard
            icon={
              <BookOpen size={22} />
            }
            title="الحلقات"
            value={totalHalaqat}
          />

          <StatCard
            icon={
              <Link2 size={22} />
            }
            title="إجمالي الروابط"
            value={
              totalAssignments
            }
          />

          <StatCard
            icon={
              <ShieldCheck
                size={22}
              />
            }
            title="المعلمون الأساسيون"
            value={mainAssignments}
          />
        </section>

        {/* ================================= */}
        {/* ADD */}
        {/* ================================= */}

        <section
          style={{
            ...cardStyle,
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "calc(10px * var(--app-density,1))",
              marginBottom: "18px",
            }}
          >
            <div
              style={sectionIcon}
            >
              <Plus size={19} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: "var(--app-color-173d2b,#173d2b)",
                  fontSize: "calc(19px * var(--app-font-scale,1))",
                }}
              >
                إضافة ربط جديد
              </h2>

              <p
                style={{
                  margin:
                    "4px 0 0",
                  color: "#89918b",
                  fontSize: "calc(12px * var(--app-font-scale,1))",
                }}
              >
                اختر المعلم والحلقة وحدد نوع التكليف
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(230px,1fr))",
              gap: "calc(13px * var(--app-density,1))",
            }}
          >
            {/* المعلم */}

            <SelectField
              label="المعلم"
              icon={
                <UserRound
                  size={17}
                />
              }
              value={teacherId}
              onChange={
                setTeacherId
              }
            >
              <option value="">
                اختر المعلم
              </option>

              {teachers.map(
                (teacher) => (
                  <option
                    key={
                      teacher.id
                    }
                    value={
                      teacher.id
                    }
                  >
                    {teacher.full_name}
                    {teacher.user_number
                      ? ` — ${teacher.user_number}`
                      : ""}
                  </option>
                )
              )}
            </SelectField>

            {/* الحلقة */}

            <SelectField
              label="الحلقة"
              icon={
                <BookOpen
                  size={17}
                />
              }
              value={halaqaId}
              onChange={
                setHalaqaId
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

            {/* النوع */}

            <SelectField
              label="نوع التكليف"
              icon={
                <ShieldCheck
                  size={17}
                />
              }
              value={
                assignmentRole
              }
              onChange={
                setAssignmentRole
              }
            >
              <option value="main">
                معلم أساسي
              </option>

              <option value="assistant">
                معلم مساعد
              </option>
            </SelectField>
          </div>

          <button
            type="button"
            onClick={
              assignTeacher
            }
            disabled={saving}
            style={{
              marginTop: "17px",
              width: "100%",
              minHeight: "48px",
              border: "none",
              borderRadius: "calc(11px * var(--app-radius-scale,1))",
              background:
                saving
                  ? "#6d8d7c"
                  : "var(--app-color-0f5132,#0f5132)",
              color: "#fff",
              cursor:
                saving
                  ? "wait"
                  : "pointer",
              fontSize: "calc(14px * var(--app-font-scale,1))",
              fontWeight: "800",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              gap: "calc(8px * var(--app-density,1))",
              boxShadow:
                "0 8px 20px color-mix(in srgb,var(--app-color-0f5132,#0f5132) 13%,transparent)",
            }}
          >
            <Plus size={18} />

            {saving
              ? "جارٍ إنشاء الربط..."
              : "ربط المعلم بالحَلقة"}
          </button>
        </section>

        {/* ================================= */}
        {/* SEARCH */}
        {/* ================================= */}

        <section
          style={{
            ...cardStyle,
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              position: "relative",
            }}
          >
            <Search
              size={18}
              style={{
                position:
                  "absolute",
                right: "14px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                color: "#89918b",
              }}
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="ابحث باسم المعلم أو رقمه أو الحلقة..."
              style={{
                ...inputStyle,
                paddingRight:
                  "calc(43px * var(--app-density,1))",
                paddingLeft:
                  (search) ? ("calc(45px * var(--app-density,1))") : ("calc(12px * var(--app-density,1))"),
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
                  left: "9px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  width: "30px",
                  height: "30px",
                  border: "none",
                  borderRadius:
                    "calc(8px * var(--app-radius-scale,1))",
                  background:
                    "#f1f3f1",
                  color: "#707872",
                  cursor:
                    "pointer",
                  display: "flex",
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
        </section>

        {/* ================================= */}
        {/* LIST HEADER */}
        {/* ================================= */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "14px",
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
              الروابط الحالية
            </h2>

            <p
              style={{
                margin:
                  "4px 0 0",
                color: "#8a918c",
                fontSize: "calc(11px * var(--app-font-scale,1))",
              }}
            >
              عرض{" "}
              {
                filteredAssignments.length
              }{" "}
              من{" "}
              {
                assignments.length
              }{" "}
              ربط
            </p>
          </div>
        </div>

        {/* ================================= */}
        {/* LOADING */}
        {/* ================================= */}

        {loading ? (
          <LoadingState />
        ) : filteredAssignments.length ===
          0 ? (
          <EmptyState
            search={search}
            onClear={() =>
              setSearch("")
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
                  teacherName={
                    teacherName(
                      assignment.teacher_id
                    )
                  }
                  teacherNumber={
                    teacherNumber(
                      assignment.teacher_id
                    )
                  }
                  halaqaName={
                    halaqaName(
                      assignment.halaqa_id
                    )
                  }
                  deleting={
                    deletingId ===
                    assignment.id
                  }
                  onDelete={() =>
                    deleteAssignment(
                      assignment
                    )
                  }
                />
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ==========================================
// بطاقة إحصائية
// ==========================================

function StatCard({
  icon,
  title,
  value,
}) {
  return (
    <div
      style={{
        ...cardStyle,
        marginBottom: 0,
        display: "flex",
        alignItems: "center",
        gap: "calc(13px * var(--app-density,1))",
        padding: "calc(18px * var(--app-density,1))",
      }}
    >
      <div
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "calc(13px * var(--app-radius-scale,1))",
          background: "var(--app-color-edf5ef,#edf5ef)",
          color: "var(--app-color-0f5132,#0f5132)",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            color: "#7e8781",
            fontSize: "calc(11px * var(--app-font-scale,1))",
            marginBottom: "3px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: "var(--app-color-173d2b,#173d2b)",
            fontSize: "calc(24px * var(--app-font-scale,1))",
            fontWeight: "850",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// بطاقة الربط
// ==========================================

function AssignmentCard({
  assignment,
  teacherName,
  teacherNumber,
  halaqaName,
  deleting,
  onDelete,
}) {
  const isMain =
    assignment.role === "main";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "calc(18px * var(--app-radius-scale,1))",
        border:
          "1px solid #e3e8e4",
        padding: "calc(18px * var(--app-density,1))",
        boxShadow:
          "0 5px 18px rgba(0,0,0,.045)",
      }}
    >
      {/* المعلم */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "calc(12px * var(--app-density,1))",
          marginBottom: "17px",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "calc(15px * var(--app-radius-scale,1))",
            background:
              "linear-gradient(145deg,var(--app-color-edf5ef,#edf5ef),#e2eee6)",
            color: "var(--app-color-0f5132,#0f5132)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          <UserRound
            size={25}
            strokeWidth={1.7}
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
              color: "var(--app-color-173d2b,#173d2b)",
              fontSize: "calc(16px * var(--app-font-scale,1))",
              fontWeight: "800",
              whiteSpace:
                "nowrap",
              overflow:
                "hidden",
              textOverflow:
                "ellipsis",
            }}
          >
            {teacherName}
          </h3>

          {teacherNumber && (
            <div
              style={{
                marginTop: "4px",
                color: "#8b938d",
                fontSize: "calc(11px * var(--app-font-scale,1))",
              }}
            >
              رقم المعلم:{" "}
              {teacherNumber}
            </div>
          )}
        </div>

        <span
          style={{
            flexShrink: 0,
            padding:
              "calc(5px * var(--app-density,1)) calc(9px * var(--app-density,1))",
            borderRadius:
              "calc(20px * var(--app-radius-scale,1))",
            background:
              isMain
                ? "#e8f6ed"
                : "#f2f3f3",
            color:
              isMain
                ? "var(--app-color-0f5132,#0f5132)"
                : "#666",
            fontSize: "calc(10px * var(--app-font-scale,1))",
            fontWeight: "800",
          }}
        >
          {isMain
            ? "أساسي"
            : "مساعد"}
        </span>
      </div>

      {/* الخط */}

      <div
        style={{
          height: "1px",
          background: "#eef0ee",
          marginBottom: "15px",
        }}
      />

      {/* الحلقة */}

      <div
        style={{
          background: "#fafbf9",
          border:
            "1px solid #edf0ed",
          borderRadius: "calc(13px * var(--app-radius-scale,1))",
          padding: "calc(13px * var(--app-density,1))",
          marginBottom: "15px",
          display: "flex",
          alignItems:
            "center",
          gap: "calc(10px * var(--app-density,1))",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "calc(11px * var(--app-radius-scale,1))",
            background: "#eef5f0",
            color: "var(--app-color-0f5132,#0f5132)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            flexShrink: 0,
          }}
        >
          <BookOpen
            size={19}
          />
        </div>

        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              color: "#929a94",
              fontSize: "calc(10px * var(--app-font-scale,1))",
              marginBottom:
                "3px",
            }}
          >
            الحلقة
          </div>

          <div
            style={{
              color: "#26332c",
              fontSize: "calc(14px * var(--app-font-scale,1))",
              fontWeight: "800",
            }}
          >
            {halaqaName}
          </div>
        </div>
      </div>

      {/* التاريخ */}

      {assignment.created_at && (
        <div
          style={{
            color: "#929993",
            fontSize: "calc(10px * var(--app-font-scale,1))",
            marginBottom: "14px",
          }}
        >
          تم إنشاء الربط:{" "}
          {formatDate(
            assignment.created_at
          )}
        </div>
      )}

      {/* حذف */}

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        style={{
          width: "100%",
          border:
            "1px solid #f0d6d3",
          background:
            deleting
              ? "#faf0ef"
              : "#fff8f7",
          color: "#b42318",
          borderRadius: "calc(10px * var(--app-radius-scale,1))",
          minHeight: "42px",
          cursor:
            deleting
              ? "wait"
              : "pointer",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          gap: "calc(7px * var(--app-density,1))",
          fontWeight: "800",
          fontSize: "calc(12px * var(--app-font-scale,1))",
        }}
      >
        <Trash2 size={16} />

        {deleting
          ? "جارٍ الحذف..."
          : "إزالة الربط"}
      </button>
    </div>
  );
}

// ==========================================
// Select
// ==========================================

function SelectField({
  label,
  icon,
  value,
  onChange,
  children,
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "7px",
          color: "#465149",
          fontSize: "calc(12px * var(--app-font-scale,1))",
          fontWeight: "800",
        }}
      >
        {label}
      </label>

      <div
        style={{
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform:
              "translateY(-50%)",
            color: "#718078",
            pointerEvents:
              "none",
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
            cursor:
              "pointer",
          }}
        >
          {children}
        </select>
      </div>
    </div>
  );
}

// ==========================================
// Empty
// ==========================================

function EmptyState({
  search,
  onClear,
}) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: "calc(55px * var(--app-density,1)) calc(20px * var(--app-density,1))",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "65px",
          height: "65px",
          margin:
            "0 auto 15px",
          borderRadius: "calc(18px * var(--app-radius-scale,1))",
          background: "var(--app-color-edf5ef,#edf5ef)",
          color: "var(--app-color-0f5132,#0f5132)",
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
        }}
      >
        {search ? (
          <Search size={27} />
        ) : (
          <Link2 size={27} />
        )}
      </div>

      <h3
        style={{
          margin:
            "0 0 7px",
          color: "#354139",
          fontSize: "calc(17px * var(--app-font-scale,1))",
        }}
      >
        {search
          ? "لا توجد نتائج"
          : "لا توجد روابط حتى الآن"}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#929993",
          fontSize: "calc(12px * var(--app-font-scale,1))",
        }}
      >
        {search
          ? "لم نجد رابطًا مطابقًا للبحث."
          : "ابدأ بربط أول معلم بحلقة."}
      </p>

      {search && (
        <button
          type="button"
          onClick={onClear}
          style={{
            marginTop: "15px",
            border: "none",
            background: "var(--app-color-0f5132,#0f5132)",
            color: "#fff",
            borderRadius: "calc(9px * var(--app-radius-scale,1))",
            padding:
              "calc(9px * var(--app-density,1)) calc(17px * var(--app-density,1))",
            cursor: "pointer",
            fontSize: "calc(12px * var(--app-font-scale,1))",
            fontWeight: "700",
          }}
        >
          مسح البحث
        </button>
      )}
    </div>
  );
}

// ==========================================
// Loading
// ==========================================

function LoadingState() {
  return (
    <div
      style={{
        ...cardStyle,
        padding: "calc(55px * var(--app-density,1)) calc(20px * var(--app-density,1))",
        textAlign: "center",
        color: "#7f8781",
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          margin:
            "0 auto 12px",
          border:
            "3px solid #e1e8e3",
          borderTopColor:
            "#0f5132",
          borderRadius: "50%",
          animation:
            "spin .8s linear infinite",
        }}
      />

      جاري تحميل البيانات...
    </div>
  );
}

// ==========================================
// Date
// ==========================================

function formatDate(date) {
  try {
    return displayDateFormatter(
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    ).format(new Date(date));
  } catch {
    return "";
  }
}

// ==========================================
// Styles
// ==========================================

const cardStyle = {
  background: "#fff",
  border:
    "1px solid #e4e8e4",
  borderRadius: "calc(18px * var(--app-radius-scale,1))",
  padding: "calc(20px * var(--app-density,1))",
  boxShadow:
    "0 5px 18px rgba(0,0,0,.04)",
};

const inputStyle = {
  width: "100%",
  minHeight: "48px",
  padding: "0 calc(12px * var(--app-density,1))",
  border:
    "1px solid #d8ded9",
  borderRadius: "calc(11px * var(--app-radius-scale,1))",
  outline: "none",
  background: "#fff",
  color: "#26332c",
  fontSize: "calc(13px * var(--app-font-scale,1))",
  boxSizing: "border-box",
  direction: "rtl",
};

const iconButton = {
  width: "43px",
  height: "43px",
  border:
    "1px solid #dce1dd",
  background: "#fff",
  color: "var(--app-color-173d2b,#173d2b)",
  borderRadius: "calc(11px * var(--app-radius-scale,1))",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const secondaryButton = {
  border:
    "1px solid #d9dfdb",
  background: "#fff",
  color: "var(--app-color-173d2b,#173d2b)",
  borderRadius: "calc(10px * var(--app-radius-scale,1))",
  padding:
    "calc(10px * var(--app-density,1)) calc(14px * var(--app-density,1))",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "calc(7px * var(--app-density,1))",
  fontSize: "calc(12px * var(--app-font-scale,1))",
  fontWeight: "700",
};

const sectionIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "calc(11px * var(--app-radius-scale,1))",
  background: "var(--app-color-edf5ef,#edf5ef)",
  color: "var(--app-color-0f5132,#0f5132)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
