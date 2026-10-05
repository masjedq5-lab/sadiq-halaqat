import Ornament from '../components/ornaments/Ornament';
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";

import { UsersRound, UserRound, Search, Pencil, Trash2, ArrowRight, CheckCircle2, XCircle, Phone, BookOpen, GraduationCap, ShieldCheck, Link2, X, Save, RefreshCw, UserCheck, UserX, AlertCircle, Mail, Hash, Activity, AlertTriangle, UserPlus } from "lucide-react";

export default function Teachers() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [teachers, setTeachers] = useState([]);
  const [halaqat, setHalaqat] = useState([]);
  const [teacherHalaqat, setTeacherHalaqat] = useState([]);

  const [fullName, setFullName] = useState("");
  const [teacherNumber, setTeacherNumber] =
    useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [gender, setGender] = useState("");
  const [educationStage, setEducationStage] =
    useState("");
  const [educationGrade, setEducationGrade] =
    useState("");
  const [notes, setNotes] = useState("");

  const [selectedHalaqat, setSelectedHalaqat] =
    useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [editingId, setEditingId] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [teacherToDelete, setTeacherToDelete] =
    useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!showTeacherModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        closeTeacherModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showTeacherModal, loading]);

  // =====================================================
  // تحميل البيانات
  // =====================================================

  async function loadData(showSuccess = false) {
    try {
      setInitialLoading(true);

      const [
        teachersResult,
        halaqatResult,
        assignmentsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "teacher")
          .order("id"),

        supabase
          .from("halaqat")
          .select("*")
          .order("id"),

        supabase
          .from("teacher_halaqat")
          .select("*")
          .order("id"),
      ]);

      if (teachersResult.error) {
        throw new Error(
          teachersResult.error.message
        );
      }

      if (halaqatResult.error) {
        throw new Error(
          halaqatResult.error.message
        );
      }

      if (assignmentsResult.error) {
        throw new Error(
          assignmentsResult.error.message
        );
      }

      const teachersData =
        teachersResult.data || [];

      const halaqatData =
        halaqatResult.data || [];

      const assignmentsData =
        assignmentsResult.data || [];

      const preparedTeachers =
        teachersData.map((teacher) => {
          const assignments =
            assignmentsData.filter(
              (item) =>
                Number(item.teacher_id) ===
                Number(teacher.id)
            );

          const teacherHalaqatData =
            assignments
              .map((assignment) =>
                halaqatData.find(
                  (halaqa) =>
                    Number(halaqa.id) ===
                    Number(
                      assignment.halaqa_id
                    )
                )
              )
              .filter(Boolean);

          return {
            ...teacher,
            halaqatCount:
              teacherHalaqatData.length,
            halaqat:
              teacherHalaqatData,
            assignments,
          };
        });

      setTeachers(preparedTeachers);
      setHalaqat(halaqatData);
      setTeacherHalaqat(assignmentsData);

      if (showSuccess) {
        showToast(
          "تم تحديث بيانات المعلمين",
          "success"
        );
      }
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "تعذر تحميل بيانات المعلمين",
        "error"
      );
    } finally {
      setInitialLoading(false);
    }
  }

  // =====================================================
  // رقم المعلم التلقائي + نافذة الإنشاء
  // =====================================================

  function generateTeacherNumber() {
    const randomPart =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
            .replace(/[^a-z0-9]/gi, "")
            .slice(0, 10)
            .toUpperCase();

    return `TR-${randomPart}`;
  }

  function openCreateTeacher() {
    clearForm();

    // بيانات الدخول للمعلم الجديد يجب أن تبدأ فارغة دائمًا.
    // لا نستخدم بريد أو كلمة مرور المستخدم/المشرف الحالي.
    setEmail("");
    setPassword("");

    setTeacherNumber(generateTeacherNumber());
    setShowTeacherModal(true);
  }

  function closeTeacherModal() {
    if (loading) return;
    setShowTeacherModal(false);
    clearForm();
  }

  // =====================================================
  // حفظ المعلم
  // =====================================================

  async function saveTeacher() {
    if (!fullName.trim()) {
      showToast(
        "أدخل اسم المعلم",
        "error"
      );
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast("صيغة البريد الإلكتروني غير صحيحة", "error");
      return;
    }

    if (!editingId && !email.trim()) {
      showToast("البريد الإلكتروني مطلوب لإنشاء حساب دخول للمعلم", "error");
      return;
    }

    if (!editingId && password.length < 8) {
      showToast("كلمة المرور يجب ألا تقل عن 8 أحرف", "error");
      return;
    }

    const finalTeacherNumber =
      teacherNumber.trim() || generateTeacherNumber();

    if (!teacherNumber.trim()) {
      setTeacherNumber(finalTeacherNumber);
    }

    setLoading(true);

    try {
      let teacherId = editingId;

      // -------------------------------------------------
      // تعديل المعلم
      // -------------------------------------------------

      if (editingId) {
        const { error } =
          await supabase
            .from("profiles")
            .update({
              full_name:
                fullName.trim(),

              user_number:
                finalTeacherNumber,

              phone:
                phone.trim() || null,

              email:
                email.trim() || null,

              gender:
                gender || null,

              education_stage:
                educationStage ||
                null,

              education_grade:
                educationGrade ||
                null,

              notes:
                notes.trim() || null,
            })
            .eq("id", editingId);

        if (error) {
          throw new Error(
            error.message
          );
        }

        // حذف العلاقات الحالية
        const { error: deleteError } =
          await supabase
            .from("teacher_halaqat")
            .delete()
            .eq(
              "teacher_id",
              editingId
            );

        if (deleteError) {
          throw new Error(
            deleteError.message
          );
        }
      }

      // -------------------------------------------------
// إضافة المعلم
// -------------------------------------------------

else {
  const { data, error } =
    await supabase
      .from("profiles")
      .insert([
        {
          role: "teacher",

          user_number:
            finalTeacherNumber,

          full_name:
            fullName.trim(),

          phone:
            phone.trim() || null,

          email:
            email.trim() || null,

          education_stage:
            educationStage || null,

          education_grade:
            educationGrade || null,

          gender:
            gender || null,



          notes:
            notes.trim() || null,

          status: "active",

          login_type: "id",
        },
      ])
      .select("id")
      .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  teacherId = data.id;
}

/* -------------------------------------------------
   تم إلغاء الربط بجدول teacher_halaqat
   الربط أصبح من صفحة الحلقات فقط
------------------------------------------------- */
// ===========================
// ربط المعلم بالحلقات
// ===========================

if (selectedHalaqat?.length) {

  // حذف الربط القديم عند التعديل
  await supabase
    .from("teacher_halaqat")
    .delete()
    .eq("teacher_id", teacherId);

  const relationRows =
    selectedHalaqat.map((halaqaId) => ({
      teacher_id: teacherId,
      halaqa_id: Number(halaqaId),
      role: "main",
    }));

  const { error: relationError } =
    await supabase
      .from("teacher_halaqat")
      .insert(relationRows);

  if (relationError) {
    console.error(relationError);
    throw relationError;
  }
}
showToast(
  editingId
    ? "تم تعديل بيانات المعلم بنجاح"
    : "تمت إضافة المعلم بنجاح",
  "success"
);

setShowTeacherModal(false);
clearForm();

await loadData();
}
catch (error) {
  console.error(error);

  showToast(
    error.message ||
      "حدث خطأ أثناء حفظ بيانات المعلم",
    "error"
  );
}
finally {
  setLoading(false);
}
}

// =====================================================
// تعديل
// =====================================================

function editTeacher(teacher) {
    setEditingId(teacher.id);

    setFullName(
      teacher.full_name || ""
    );

    setTeacherNumber(
      teacher.user_number || ""
    );

    setPhone(
      teacher.phone || ""
    );

    setEmail(
      teacher.email || ""
    );

    setGender(
      teacher.gender || ""
    );

    setEducationStage(
      teacher.education_stage || ""
    );

    setEducationGrade(
      teacher.education_grade || ""
    );

    setNotes(
      teacher.notes || ""
    );

    const assignedIds =
      (teacher.assignments || []).map(
        (item) =>
          String(item.halaqa_id)
      );

    setSelectedHalaqat(
      assignedIds
    );

    setShowTeacherModal(true);
  }

  // =====================================================
  // مسح النموذج
  // =====================================================

  function clearForm() {
    setEditingId(null);

    setFullName("");
    setTeacherNumber("");
    setPhone("");
    setEmail("");
    setPassword("");
    setGender("");
    setEducationStage("");
    setEducationGrade("");
    setNotes("");

    setSelectedHalaqat([]);
  }

  // =====================================================
  // اختيار الحلقات
  // =====================================================

  function toggleHalaqa(halaqaId) {
    const id = String(halaqaId);

    setSelectedHalaqat(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) => item !== id
            )
          : [...current, id]
    );
  }

  // =====================================================
  // تفعيل / تعطيل
  // =====================================================

  async function toggleStatus(teacher) {
    const newStatus =
      teacher.status === "active"
        ? "inactive"
        : "active";

    try {
      const { error } =
        await supabase
          .from("profiles")
          .update({
            status: newStatus,
          })
          .eq("id", teacher.id);

      if (error) {
        throw new Error(
          error.message
        );
      }

      showToast(
        newStatus === "active"
          ? "تم تفعيل المعلم"
          : "تم تعطيل المعلم",
        "success"
      );

      await loadData();
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "تعذر تحديث حالة المعلم",
        "error"
      );
    }
  }

  // =====================================================
  // حذف
  // =====================================================

  function askDelete(teacher) {
    setTeacherToDelete(teacher);
    setShowDeleteModal(true);
  }

  async function deleteTeacher() {
    if (!teacherToDelete) return;

    const id =
      teacherToDelete.id;

    setLoading(true);

    try {
      // العلاقات أولًا
      const {
        error: assignmentsError,
      } = await supabase
        .from("teacher_halaqat")
        .delete()
        .eq(
          "teacher_id",
          id
        );

      if (assignmentsError) {
        throw new Error(
          assignmentsError.message
        );
      }

      const { error } =
        await supabase
          .from("profiles")
          .delete()
          .eq("id", id)
          .eq("role", "teacher");

      if (error) {
        throw new Error(
          error.message
        );
      }

      showToast(
        "تم حذف المعلم بنجاح",
        "success"
      );

      setShowDeleteModal(false);
      setTeacherToDelete(null);

      if (
        Number(editingId) ===
        Number(id)
      ) {
        clearForm();
      }

      await loadData();
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "تعذر حذف المعلم",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // البحث والفلترة
  // =====================================================

  const filteredTeachers =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLowerCase();

      return teachers.filter(
        (teacher) => {
          const matchesSearch =
            !text ||
            String(
              teacher.full_name ||
                ""
            )
              .toLowerCase()
              .includes(text) ||
            String(
              teacher.user_number ||
                ""
            )
              .toLowerCase()
              .includes(text) ||
            String(
              teacher.phone ||
                ""
            )
              .toLowerCase()
              .includes(text) ||
            String(
              teacher.email ||
                ""
            )
              .toLowerCase()
              .includes(text) ||
            (teacher.halaqat || [])
              .some((halaqa) =>
                String(
                  halaqa.name ||
                    ""
                )
                  .toLowerCase()
                  .includes(text)
              );

          const matchesStatus =
            statusFilter ===
              "all" ||
            (statusFilter ===
              "active" &&
              teacher.status ===
                "active") ||
            (statusFilter ===
              "inactive" &&
              teacher.status !==
                "active");

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      teachers,
      search,
      statusFilter,
    ]);

  // =====================================================
  // الإحصائيات
  // =====================================================

  const totalTeachers =
    teachers.length;

  const activeTeachers =
    teachers.filter(
      (teacher) =>
        teacher.status ===
        "active"
    ).length;

  const inactiveTeachers =
    totalTeachers -
    activeTeachers;

  const assignedTeachers =
    teachers.filter(
      (teacher) =>
        teacher.halaqatCount >
        0
    ).length;

  const unassignedTeachers =
    teachers.filter(
      (teacher) => teacher.halaqatCount === 0
    ).length;

  const missingContactTeachers =
    teachers.filter(
      (teacher) => !teacher.phone && !teacher.email
    ).length;

  const coverageRate =
    totalTeachers === 0
      ? 0
      : Math.round((assignedTeachers / totalTeachers) * 100);

  // =====================================================
  // الواجهة
  // =====================================================

  return (
    <div
      dir="rtl"
      className="teachers-page"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#f7f5ef 0%,#f0f5f1 50%,#f8f6f0 100%)",
        padding:
          "calc(28px * var(--app-density,1))",
        boxSizing:
          "border-box",
        color:
          "#26332c",
      }}
    >
      <div
        className="teachers-page-inner"
        style={{
          width: "100%",
          maxWidth: "none",
          margin: 0,
        }}
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <header className="teachers-main-header"
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap:
              "calc(15px * var(--app-density,1))",
            flexWrap:
              "wrap",
            marginBottom:
              "26px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "calc(13px * var(--app-density,1))",
            }}
          >
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin"
                )
              }
              style={
                iconButtonStyle
              }
              title="العودة للوحة المشرف"
            >
              <ArrowRight
                size={20}
              />
            </button>

            <div
              style={{
                width:
                  "52px",
                height:
                  "52px",
                borderRadius:
                  "calc(15px * var(--app-radius-scale,1))",
                background:
                  "var(--app-color-0f5132,#0f5132)",
                color:
                  "#fff",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                boxShadow:
                  "0 8px 20px color-mix(in srgb,var(--app-color-0f5132,#0f5132) 16%,transparent)",
              }}
            >
              <GraduationCap
                size={27}
                strokeWidth={
                  1.8
                }
              />
            </div>

            <div>
              <h1
                style={{
                  margin:
                    0,
                  color:
                    "var(--app-color-173d2b,#173d2b)",
                  fontSize:
                    "calc(29px * var(--app-font-scale,1))",
                  fontWeight:
                    "850",
                }}
              >
                إدارة المعلمين
              </h1>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  color:
                    "#7d8680",
                  fontSize:
                    "calc(13px * var(--app-font-scale,1))",
                }}
              >
                إدارة بيانات المعلمين وربطهم بالحلقات
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "calc(9px * var(--app-density,1))", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={initialLoading}
              style={secondaryButton}
            >
              <RefreshCw
                size={16}
                className={initialLoading ? "spin" : ""}
              />
              تحديث
            </button>

            <button
              type="button"
              onClick={openCreateTeacher}
              style={primaryButton}
            >
              <UserPlus size={17} />
              إضافة معلم
            </button>
          </div>
        </header>

        {/* ================================================= */}
        {/* STATISTICS */}
        {/* ================================================= */}

        <div className="teachers-stats-grid"
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(210px,1fr))",
            gap:
              "calc(14px * var(--app-density,1))",
            marginBottom:
              "22px",
          }}
        >
          <StatCard
            title="إجمالي المعلمين"
            value={
              totalTeachers
            }
            icon={
              <UsersRound
                size={22}
              />
            }
          />

          <StatCard
            title="المعلمون النشطون"
            value={
              activeTeachers
            }
            icon={
              <UserCheck
                size={22}
              />
            }
          />

          <StatCard
            title="غير النشطين"
            value={
              inactiveTeachers
            }
            icon={
              <UserX
                size={22}
              />
            }
          />

          <StatCard
            title="مرتبطون بحلقات"
            value={
              assignedTeachers
            }
            icon={
              <Link2
                size={22}
              />
            }
          />
        </div>

        {/* ================================================= */}
        {/* SMART MANAGEMENT */}
        {/* ================================================= */}

        <section className="teachers-smart-hero"
          style={{
            ...cardStyle,
            marginBottom: "20px",
            background:
              "linear-gradient(135deg,#0A3C36 0%,#0F5148 72%,var(--app-color-12685b,#12685B) 100%)",
            color: "#fff",
            border: "1px solid rgba(200,168,75,.24)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div className="teachers-smart-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px,1.2fr) minmax(300px,2fr)",
              gap: "calc(18px * var(--app-density,1))",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "calc(7px * var(--app-density,1))",
                  color: "#F1D681",
                  fontSize: "calc(11px * var(--app-font-scale,1))",
                  fontWeight: "900",
                  marginBottom: "7px",
                }}
              >
                <Activity size={15} />
                مركز الإدارة والمتابعة
              </div>

              <h2 style={{ margin: 0, fontSize: "calc(21px * var(--app-font-scale,1))", fontWeight: "900" }}>
                نظرة ذكية على هيئة التعليم
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "rgba(255,255,255,.68)",
                  fontSize: "calc(12px * var(--app-font-scale,1))",
                  lineHeight: "1.8",
                }}
              >
                اكتشف النواقص الإدارية بسرعة وتابع ربط المعلمين بالحلقات
                واكتمال وسائل التواصل من مكان واحد.
              </p>
            </div>

            <div
              className="teachers-smart-metrics"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))",
                gap: "calc(9px * var(--app-density,1))",
              }}
            >
              <SmartMetric
                label="تغطية الحلقات"
                value={`${coverageRate}%`}
                note={`${assignedTeachers} معلم مرتبط`}
                icon={<ShieldCheck size={17} />}
              />
              <SmartMetric
                label="بدون حلقة"
                value={unassignedTeachers}
                note={unassignedTeachers ? "تحتاج متابعة" : "الوضع مكتمل"}
                icon={<AlertTriangle size={17} />}
              />
              <SmartMetric
                label="بيانات تواصل ناقصة"
                value={missingContactTeachers}
                note="لا جوال ولا بريد"
                icon={<Mail size={17} />}
              />
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* SEARCH */}
        {/* ================================================= */}

        <section className="teachers-filter-card"
          style={{
            ...cardStyle,
            padding:
              "calc(15px * var(--app-density,1))",
            marginBottom:
              "20px",
          }}
        >
          <div className="teachers-filter-grid"
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "minmax(250px,1fr) 210px",
              gap:
                "calc(10px * var(--app-density,1))",
            }}
          >
            <div
              style={{
                position:
                  "relative",
              }}
            >
              <Search
                size={19}
                color="#89918b"
                style={{
                  position:
                    "absolute",
                  right:
                    "14px",
                  top:
                    "50%",
                  transform:
                    "translateY(-50%)",
                }}
              />

              <input
                value={
                  search
                }
                onChange={(e) =>
                  setSearch(
                    e.target
                      .value
                  )
                }
                placeholder="ابحث بالاسم أو الرقم أو الجوال أو البريد أو الحلقة..."
                style={{
                  ...inputStyle,
                  paddingRight:
                    "calc(43px * var(--app-density,1))",
                }}
              />
            </div>

            <select
              value={
                statusFilter
              }
              onChange={(e) =>
                setStatusFilter(
                  e.target
                    .value
                )
              }
              style={
                inputStyle
              }
            >
              <option value="all">
                جميع الحالات
              </option>

              <option value="active">
                النشطون فقط
              </option>

              <option value="inactive">
                غير النشطين فقط
              </option>
            </select>
          </div>
        </section>

        {/* ================================================= */}
        {/* LIST HEADER */}
        {/* ================================================= */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom:
              "13px",
          }}
        >
          <div>
            <h2
              style={{
                margin:
                  0,
                color:
                  "var(--app-color-173d2b,#173d2b)",
                fontSize:
                  "calc(20px * var(--app-font-scale,1))",
              }}
            >
              قائمة المعلمين
            </h2>

            <p
              style={{
                margin:
                  "4px 0 0",
                color:
                  "#89918c",
                fontSize:
                  "calc(12px * var(--app-font-scale,1))",
              }}
            >
              عرض{" "}
              {
                filteredTeachers.length
              }{" "}
              من{" "}
              {
                teachers.length
              }{" "}
              معلم
            </p>
          </div>
        </div>

        {/* ================================================= */}
        {/* CONTENT */}
        {/* ================================================= */}

        {initialLoading ? (
          <LoadingState />
        ) : filteredTeachers.length ===
          0 ? (
          <EmptyState
            hasSearch={
              Boolean(
                search.trim()
              )
            }
            onClear={() => {
              setSearch("");
              setStatusFilter(
                "all"
              );
            }}
          />
        ) : (
          <div
            className="teachers-list-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
              gap: "calc(17px * var(--app-density,1))",
            }}
          >
            {filteredTeachers.map(
              (teacher) => (
                <TeacherCard
                  key={
                    teacher.id
                  }
                  teacher={
                    teacher
                  }
                  onEdit={
                    editTeacher
                  }
                  onToggleStatus={
                    toggleStatus
                  }
                  onDelete={
                    askDelete
                  }
                />
              )
            )}
          </div>
        )}
      </div>


      {/* ================================================= */}
      {/* LEGENDARY CREATE / EDIT TEACHER MODAL */}
      {/* ================================================= */}

      {showTeacherModal && (
        <div
          className="teacher-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeTeacherModal();
          }}
        >
          <div className="teacher-modal-shell">
            <Ornament name="07-rukn" className="teacher-modal-ornament teacher-modal-ornament-a" />
            <Ornament name="08-daraj" className="teacher-modal-ornament teacher-modal-ornament-b" />

            <div className="teacher-modal-hero">
              <div className="teacher-modal-hero-top">
                <div className="teacher-modal-brand">
                  <div className="teacher-modal-brand-icon">
                    {editingId ? <Pencil size={24} /> : <GraduationCap size={27} />}
                  </div>
                  <div>
                    <div className="teacher-modal-eyebrow">
                      <ShieldCheck size={13} />
                      نظام الصديق · إدارة هيئة التعليم
                    </div>
                    <h2>
                      {editingId ? "تحديث ملف المعلم" : "إنشاء ملف معلم جديد"}
                    </h2>
                    <p>
                      {editingId
                        ? "حدّث البيانات الإدارية والتعليمية وربط الحلقات من مكان واحد."
                        : "أنشئ ملفًا إداريًا متكاملًا للمعلم، وسيُمنح رقمًا تعريفيًا تلقائيًا."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="teacher-modal-close"
                  onClick={closeTeacherModal}
                  aria-label="إغلاق"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="teacher-modal-steps">
                <span className="active"><b>01</b> البيانات الأساسية</span>
                <span><b>02</b> بيانات التواصل</span>
                <span><b>03</b> التكليف والحلقات</span>
              </div>
            </div>

            <div className="teacher-modal-body">
              <div className="teacher-number-card">
                <div className="teacher-number-icon"><Hash size={22} /></div>
                <div className="teacher-number-copy">
                  <span>الرقم التعريفي للمعلم</span>
                  <strong>{teacherNumber || "سيُنشأ تلقائيًا"}</strong>
                  <small>رقم فريد للاستخدام داخل نظام الصديق</small>
                </div>
                <div className="teacher-auto-badge">
                  <CheckCircle2 size={14} />
                  تلقائي
                </div>
              </div>

              <div className="teacher-section-head">
                <div className="teacher-section-icon"><UserRound size={18} /></div>
                <div>
                  <strong>البيانات الأساسية</strong>
                  <span>المعلومات الرئيسية في الملف الإداري للمعلم</span>
                </div>
              </div>

              <div className="teacher-form-grid">
                <FormField
                  label="اسم المعلم *"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="اكتب الاسم الرباعي"
                  icon={<UserRound size={17} />}
                />

                <SelectField
                  label="الجنس"
                  value={gender}
                  onChange={setGender}
                  options={[
                    { value: "male", label: "ذكر" },
                    { value: "female", label: "أنثى" },
                  ]}
                />

                <SelectField
                  label="المرحلة التعليمية"
                  value={educationStage}
                  onChange={setEducationStage}
                  options={[
                    { value: "primary", label: "ابتدائي" },
                    { value: "middle", label: "متوسط" },
                    { value: "secondary", label: "ثانوي" },
                    { value: "university", label: "جامعي" },
                    { value: "other", label: "أخرى" },
                  ]}
                />

                <FormField
                  label="الصف / المستوى"
                  value={educationGrade}
                  onChange={setEducationGrade}
                  placeholder="مثال: المستوى الثالث"
                  icon={<GraduationCap size={17} />}
                />
              </div>

              <div className="teacher-section-head teacher-section-gap">
                <div className="teacher-section-icon gold"><Mail size={18} /></div>
                <div>
                  <strong>بيانات التواصل</strong>
                  <span>
                    أدخل بريد المعلم الجديد وكلمة مرور جديدة خاصة به
                  </span>
                </div>
              </div>

              <div className="teacher-form-grid">
                <FormField
                  label="رقم الجوال"
                  value={phone}
                  onChange={setPhone}
                  placeholder="05xxxxxxxx"
                  icon={<Phone size={17} />}
                  dir="ltr"
                />

                <FormField
                  label="البريد الإلكتروني"
                  value={email}
                  onChange={setEmail}
                  placeholder="أدخل بريد المعلم الجديد"
                  icon={<Mail size={17} />}
                  type="email"
                  dir="ltr"
                  autoComplete="off"
                />

                {!editingId && (
                  <FormField
                    label="كلمة المرور *"
                    value={password}
                    onChange={setPassword}
                    placeholder="أنشئ كلمة مرور للمعلم"
                    icon={<ShieldCheck size={17} />}
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                  />
                )}
              </div>

              <div className="teacher-section-head teacher-section-gap">
                <div className="teacher-section-icon"><BookOpen size={18} /></div>
                <div>
                  <strong>التكليف بالحلقات</strong>
                  <span>اختر الحلقة أو الحلقات التي يتولى المعلم متابعتها</span>
                </div>
                {selectedHalaqat.length > 0 && (
                  <div className="teacher-selected-count">
                    {selectedHalaqat.length} محددة
                  </div>
                )}
              </div>

              <div className="teacher-halaqat-grid">
                {halaqat.length === 0 ? (
                  <div className="teacher-no-halaqat">
                    <BookOpen size={20} />
                    لا توجد حلقات مضافة حاليًا.
                  </div>
                ) : (
                  halaqat.map((halaqa) => {
                    const selected = selectedHalaqat.includes(String(halaqa.id));
                    return (
                      <button
                        type="button"
                        key={halaqa.id}
                        className={
                          selected
                            ? "teacher-halaqa-choice selected"
                            : "teacher-halaqa-choice"
                        }
                        onClick={() => toggleHalaqa(halaqa.id)}
                      >
                        <span className="teacher-halaqa-check">
                          {selected && <CheckCircle2 size={14} />}
                        </span>
                        <span className="teacher-halaqa-name">{halaqa.name}</span>
                        <span className="teacher-halaqa-state">
                          {selected ? "تم الاختيار" : "اختيار"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="teacher-section-head teacher-section-gap">
                <div className="teacher-section-icon muted"><Pencil size={17} /></div>
                <div>
                  <strong>ملاحظات إدارية</strong>
                  <span>أي تفاصيل تساعد في المتابعة أو التكليف</span>
                </div>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب ملاحظات المتابعة أو التكليف هنا..."
                rows={3}
                className="teacher-notes-area"
              />
            </div>

            <div className="teacher-modal-footer">
              <div className="teacher-modal-actions">
                <button
                  type="button"
                  onClick={closeTeacherModal}
                  disabled={loading}
                  className="teacher-cancel-btn"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={saveTeacher}
                  disabled={loading}
                  className="teacher-save-btn"
                >
                  {loading ? (
                    <RefreshCw size={18} className="spin" />
                  ) : editingId ? (
                    <Save size={18} />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  {loading
                    ? "جارٍ الحفظ..."
                    : editingId
                      ? "حفظ التعديلات"
                      : "إنشاء ملف المعلم"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* DELETE MODAL */}
      {/* ================================================= */}

      <style>{`
        @keyframes teacherSpin { to { transform: rotate(360deg); } }
        @keyframes teacherModalIn { from { opacity: 0; transform: translateY(18px) scale(.975); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .spin { animation: teacherSpin .8s linear infinite; }

        .teacher-modal-backdrop {
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          right: 88px;
          z-index: 2147483000;
          display: flex;
          align-items: center;
          justify-content: center;
          /* على الشاشات الكبيرة نترك مساحة السايد بار الأيمن،
             وبذلك يتمركز الـ Modal داخل مساحة المحتوى الفعلية لا داخل الشاشة كاملة */
          padding: calc(22px * var(--app-density,1)) calc(24px * var(--app-density,1)) calc(22px * var(--app-density,1)) calc(304px * var(--app-density,1));
          box-sizing: border-box;
          background:
            radial-gradient(circle at 50% 20%, rgba(17,91,77,.18), transparent 38%),
            rgba(3,25,22,.72);
          backdrop-filter: blur(12px);
        }
        .teacher-modal-shell {
          position: relative;
          isolation: isolate;
          width: min(820px, 100%);
          max-height: min(790px, calc(100dvh - 44px));
          overflow-y: auto;
          overflow-x: hidden;
          margin: 0;
          transform-origin: center center;
          border: 1px solid rgba(201,168,73,.45);
          border-radius: calc(28px * var(--app-radius-scale,1));
          background: #FBFCFA;
          animation: teacherModalIn .24s cubic-bezier(.2,.8,.2,1);
          box-shadow:
            0 35px 110px rgba(0,24,20,.38),
            0 0 0 1px rgba(255,255,255,.5) inset;
        }
        .teacher-modal-shell::-webkit-scrollbar { width: 6px; }
        .teacher-modal-shell::-webkit-scrollbar-thumb {
          background: #C9B36A;
          border-radius: 999px;
        }
        .teacher-modal-ornament {
          position: absolute;
          z-index: 2;
          width: 92px;
          height: 92px;
          border: 1px solid rgba(218,186,93,.18);
          transform: rotate(45deg);
          pointer-events: none;
        }
        .teacher-modal-ornament-a { top: -57px; left: 75px; }
        .teacher-modal-ornament-b { top: 28px; right: -72px; }
        .teacher-modal-hero {
          position: relative;
          padding: calc(25px * var(--app-density,1)) calc(27px * var(--app-density,1)) calc(19px * var(--app-density,1));
          overflow: hidden;
          color: #fff;
          background:
            radial-gradient(circle at 12% 10%, rgba(214,183,91,.18), transparent 25%),
            linear-gradient(135deg,#063C34 0%,#0A5146 56%,#0B6253 100%);
        }
        .teacher-modal-hero::after {
          content: "";
          position: absolute;
          left: -35px;
          bottom: -75px;
          width: 190px;
          height: 190px;
          border: 1px solid rgba(230,203,121,.13);
          border-radius: 50%;
          box-shadow:
            0 0 0 18px rgba(230,203,121,.025),
            0 0 0 42px rgba(230,203,121,.018);
        }
        .teacher-modal-hero-top {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: calc(18px * var(--app-density,1));
        }
        .teacher-modal-brand {
          display: flex;
          align-items: flex-start;
          gap: calc(15px * var(--app-density,1));
        }
        .teacher-modal-brand-icon {
          width: 55px;
          height: 55px;
          flex: 0 0 55px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(239,211,127,.45);
          border-radius: calc(17px * var(--app-radius-scale,1));
          color: #F2D57D;
          background: rgba(255,255,255,.08);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.04);
        }
        .teacher-modal-eyebrow {
          display: flex;
          align-items: center;
          gap: calc(6px * var(--app-density,1));
          margin-bottom: 5px;
          color: #E9CC72;
          font-size: calc(10px * var(--app-font-scale,1));
          font-weight: 900;
        }
        .teacher-modal-brand h2 {
          margin: 0;
          font-size: calc(25px * var(--app-font-scale,1));
          font-weight: 950;
          letter-spacing: -.02em;
        }
        .teacher-modal-brand p {
          max-width: 620px;
          margin: 6px 0 0;
          color: rgba(255,255,255,.66);
          font-size: calc(11px * var(--app-font-scale,1));
          line-height: 1.8;
        }
        .teacher-modal-close {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: calc(13px * var(--app-radius-scale,1));
          color: #fff;
          background: rgba(255,255,255,.08);
          cursor: pointer;
          transition: .2s ease;
        }
        .teacher-modal-close:hover {
          background: rgba(255,255,255,.15);
          transform: rotate(4deg);
        }
        .teacher-modal-steps {
          position: relative;
          z-index: 3;
          display: flex;
          gap: calc(8px * var(--app-density,1));
          flex-wrap: wrap;
          margin-top: 20px;
        }
        .teacher-modal-steps span {
          display: inline-flex;
          align-items: center;
          gap: calc(7px * var(--app-density,1));
          padding: calc(7px * var(--app-density,1)) calc(10px * var(--app-density,1));
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 999px;
          color: rgba(255,255,255,.56);
          background: rgba(255,255,255,.045);
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 800;
        }
        .teacher-modal-steps span.active {
          border-color: rgba(233,204,114,.35);
          color: #F3D982;
          background: rgba(233,204,114,.09);
        }
        .teacher-modal-steps b {
          font-size: calc(8px * var(--app-font-scale,1));
          opacity: .75;
        }
        .teacher-modal-body { padding: calc(21px * var(--app-density,1)) calc(27px * var(--app-density,1)) calc(24px * var(--app-density,1)); }
        .teacher-number-card {
          display: flex;
          align-items: center;
          gap: calc(12px * var(--app-density,1));
          margin-bottom: 23px;
          padding: calc(13px * var(--app-density,1)) calc(15px * var(--app-density,1));
          border: 1px solid #E6D8AA;
          border-radius: calc(16px * var(--app-radius-scale,1));
          background:
            linear-gradient(135deg,#FFF9E8 0%,#FFFCF4 65%,#F8FBF7 100%);
          box-shadow: 0 8px 24px rgba(104,82,24,.045);
        }
        .teacher-number-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: calc(12px * var(--app-radius-scale,1));
          color: #8D6A17;
          background: rgba(211,178,79,.14);
        }
        .teacher-number-copy { min-width: 0; flex: 1; }
        .teacher-number-copy span,
        .teacher-number-copy small { display: block; }
        .teacher-number-copy span {
          color: #947C40;
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 800;
        }
        .teacher-number-copy strong {
          display: block;
          margin: 2px 0;
          color: #173D34;
          font-size: calc(15px * var(--app-font-scale,1));
          letter-spacing: .06em;
          direction: ltr;
          text-align: right;
        }
        .teacher-number-copy small {
          color: #9A9F99;
          font-size: calc(8px * var(--app-font-scale,1));
        }
        .teacher-auto-badge {
          display: inline-flex;
          align-items: center;
          gap: calc(5px * var(--app-density,1));
          padding: calc(6px * var(--app-density,1)) calc(9px * var(--app-density,1));
          border-radius: 999px;
          color: #0A6653;
          background: #E8F6EF;
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 900;
        }
        .teacher-section-head {
          display: flex;
          align-items: center;
          gap: calc(10px * var(--app-density,1));
          margin-bottom: 12px;
        }
        .teacher-section-gap { margin-top: 23px; }
        .teacher-section-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: grid;
          place-items: center;
          border-radius: calc(11px * var(--app-radius-scale,1));
          color: #0C604F;
          background: #EAF5F0;
        }
        .teacher-section-icon.gold {
          color: #8B691D;
          background: #FBF3DA;
        }
        .teacher-section-icon.muted {
          color: #66736C;
          background: #F0F3F1;
        }
        .teacher-section-head strong,
        .teacher-section-head span { display: block; }
        .teacher-section-head strong {
          color: #1D3D34;
          font-size: calc(13px * var(--app-font-scale,1));
          font-weight: 900;
        }
        .teacher-section-head span {
          margin-top: 2px;
          color: #8C9791;
          font-size: calc(9px * var(--app-font-scale,1));
        }
        .teacher-selected-count {
          margin-right: auto;
          padding: calc(5px * var(--app-density,1)) calc(8px * var(--app-density,1));
          border-radius: 999px;
          color: #0B604F;
          background: #EAF6F0;
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 900;
        }
        .teacher-form-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: calc(13px * var(--app-density,1));
        }
        .teacher-halaqat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill,minmax(210px,1fr));
          gap: calc(9px * var(--app-density,1));
        }
        .teacher-halaqa-choice {
          min-height: 54px;
          display: grid;
          grid-template-columns: 23px minmax(0,1fr) auto;
          align-items: center;
          gap: calc(8px * var(--app-density,1));
          padding: calc(9px * var(--app-density,1)) calc(10px * var(--app-density,1));
          border: 1px solid #DFE7E2;
          border-radius: calc(13px * var(--app-radius-scale,1));
          color: #53615A;
          background: #fff;
          font-family: inherit;
          text-align: right;
          cursor: pointer;
          transition: .18s ease;
        }
        .teacher-halaqa-choice:hover {
          border-color: #B8D1C7;
          transform: translateY(-1px);
          box-shadow: 0 7px 18px rgba(10,81,70,.06);
        }
        .teacher-halaqa-choice.selected {
          border-color: #88B7A6;
          color: #0B584A;
          background: linear-gradient(135deg,#EDF8F3,#F7FBF9);
          box-shadow: inset 3px 0 0 #C6A84D;
        }
        .teacher-halaqa-check {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border: 1px solid #C9D7D0;
          border-radius: calc(7px * var(--app-radius-scale,1));
        }
        .teacher-halaqa-choice.selected .teacher-halaqa-check {
          border-color: #0D5D4D;
          color: #fff;
          background: #0D5D4D;
        }
        .teacher-halaqa-name {
          overflow: hidden;
          color: inherit;
          font-size: calc(10px * var(--app-font-scale,1));
          font-weight: 850;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .teacher-halaqa-state {
          color: #A0A8A3;
          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 800;
        }
        .teacher-halaqa-choice.selected .teacher-halaqa-state {
          color: #9A7828;
        }
        .teacher-no-halaqat {
          grid-column: 1/-1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: calc(8px * var(--app-density,1));
          padding: calc(18px * var(--app-density,1));
          border: 1px dashed #D8E2DC;
          border-radius: calc(13px * var(--app-radius-scale,1));
          color: #87928C;
          background: #FAFBFA;
          font-size: calc(11px * var(--app-font-scale,1));
        }
        .teacher-notes-area {
          width: 100%;
          min-height: 84px;
          padding: calc(11px * var(--app-density,1)) calc(12px * var(--app-density,1));
          box-sizing: border-box;
          resize: vertical;
          outline: none;
          border: 1px solid #DDE5E0;
          border-radius: calc(13px * var(--app-radius-scale,1));
          color: #263A33;
          background: #fff;
          font-family: inherit;
          font-size: calc(11px * var(--app-font-scale,1));
          line-height: 1.7;
        }
        .teacher-notes-area:focus {
          border-color: #88B7A6;
          box-shadow: 0 0 0 3px rgba(13,93,77,.06);
        }
        .teacher-modal-footer {
          position: sticky;
          bottom: 0;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: calc(14px * var(--app-density,1));
          padding: calc(14px * var(--app-density,1)) calc(27px * var(--app-density,1));
          border-top: 1px solid #E4EAE6;
          background: rgba(255,255,255,.94);
          backdrop-filter: blur(10px);
        }
        .teacher-modal-footer-note {
          display: flex;
          align-items: center;
          gap: calc(7px * var(--app-density,1));
          color: #7D8983;
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 700;
        }
        .teacher-modal-footer-note svg { color: #A88731; }
        .teacher-modal-actions {
          display: flex;
          align-items: center;
          gap: calc(8px * var(--app-density,1));
        }
        .teacher-cancel-btn,
        .teacher-save-btn {
          min-height: 42px;
          padding: 0 calc(16px * var(--app-density,1));
          border-radius: calc(12px * var(--app-radius-scale,1));
          font-family: inherit;
          font-size: calc(11px * var(--app-font-scale,1));
          font-weight: 900;
          cursor: pointer;
        }
        .teacher-cancel-btn {
          border: 1px solid #DDE5E0;
          color: #5F6D66;
          background: #fff;
        }
        .teacher-save-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: calc(7px * var(--app-density,1));
          min-width: 155px;
          border: 1px solid #0B594B;
          color: #fff;
          background: linear-gradient(135deg,#0B594B,#0B6A57);
          box-shadow: 0 10px 24px rgba(11,89,75,.17);
        }
        .teacher-save-btn:hover { transform: translateY(-1px); }
        .teacher-save-btn:disabled { opacity: .62; cursor: not-allowed; }

        /* عند اختفاء/تصغير السايد بار نعيد التمركز على كامل الشاشة */
        @media (max-width: 1180px) {
          .teacher-modal-backdrop {
            padding: calc(18px * var(--app-density,1));
          }
          .teacher-modal-shell {
            width: min(820px, 100%);
          }
        }

        @media (max-width: 700px) {
          .teacher-modal-backdrop { padding: calc(10px * var(--app-density,1)); align-items: center; justify-content: center; }
          .teacher-modal-shell {
            max-height: 94vh;
            border-radius: calc(24px * var(--app-radius-scale,1));
          }
          .teacher-modal-hero { padding: calc(20px * var(--app-density,1)) calc(17px * var(--app-density,1)) calc(16px * var(--app-density,1)); }
          .teacher-modal-brand-icon {
            width: 46px; height: 46px; flex-basis: 46px;
          }
          .teacher-modal-brand h2 { font-size: calc(20px * var(--app-font-scale,1)); }
          .teacher-modal-brand p { font-size: calc(9px * var(--app-font-scale,1)); }
          .teacher-modal-steps { gap: calc(5px * var(--app-density,1)); }
          .teacher-modal-steps span { padding: calc(6px * var(--app-density,1)) calc(8px * var(--app-density,1)); font-size: calc(8px * var(--app-font-scale,1)); }
          .teacher-modal-body { padding: calc(17px * var(--app-density,1)); }
          .teacher-form-grid { grid-template-columns: 1fr; }
          .teacher-halaqat-grid { grid-template-columns: 1fr; }
          .teacher-modal-footer {
            padding: calc(12px * var(--app-density,1)) calc(17px * var(--app-density,1));
            align-items: stretch;
            flex-direction: column;
          }
          .teacher-modal-footer-note { display: none; }
          .teacher-modal-actions { display: grid; grid-template-columns: 1fr 1.4fr; }
          .teacher-cancel-btn, .teacher-save-btn { width: 100%; }
        }

        /* ===== Modal positioning across all devices ===== */
        @media (min-width: 1101px) {
          .teacher-modal-backdrop {
            /* AdminLayout collapsed sidebar width */
            right: 88px;
          }

          body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
            /* AdminLayout expanded sidebar width */
            right: 296px;
          }
        }

        @media (max-width: 1100px) {
          .teacher-modal-backdrop {
            inset: 0;
            padding:
              max(calc(14px * var(--app-density,1)), env(safe-area-inset-top))
              max(calc(14px * var(--app-density,1)), env(safe-area-inset-right))
              max(calc(14px * var(--app-density,1)), env(safe-area-inset-bottom))
              max(calc(14px * var(--app-density,1)), env(safe-area-inset-left));
          }

          .teacher-modal-shell {
            width: min(760px, calc(100% - 8px));
            max-height: calc(100dvh - 28px);
          }
        }

        @media (max-width: 700px) {
          .teacher-modal-backdrop {
            inset: 0;
            align-items: center;
            justify-content: center;
            padding:
              max(calc(10px * var(--app-density,1)), env(safe-area-inset-top))
              max(calc(10px * var(--app-density,1)), env(safe-area-inset-right))
              max(calc(10px * var(--app-density,1)), env(safe-area-inset-bottom))
              max(calc(10px * var(--app-density,1)), env(safe-area-inset-left));
          }

          .teacher-modal-shell {
            width: 100%;
            max-width: 560px;
            max-height: calc(100dvh - 20px);
            border-radius: calc(20px * var(--app-radius-scale,1));
          }

          .teacher-modal-hero {
            padding: calc(17px * var(--app-density,1)) calc(14px * var(--app-density,1)) calc(14px * var(--app-density,1));
          }

          .teacher-modal-brand {
            gap: calc(10px * var(--app-density,1));
          }

          .teacher-modal-brand-icon {
            width: 42px;
            height: 42px;
            flex-basis: 42px;
            border-radius: calc(13px * var(--app-radius-scale,1));
          }

          .teacher-modal-brand h2 {
            font-size: calc(18px * var(--app-font-scale,1));
          }

          .teacher-modal-brand p {
            font-size: calc(9px * var(--app-font-scale,1));
            line-height: 1.6;
          }

          .teacher-modal-steps {
            margin-top: 13px;
            flex-wrap: nowrap;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .teacher-modal-steps::-webkit-scrollbar {
            display: none;
          }

          .teacher-modal-steps span {
            flex: 0 0 auto;
            padding: calc(6px * var(--app-density,1)) calc(8px * var(--app-density,1));
            font-size: calc(8px * var(--app-font-scale,1));
          }

          .teacher-modal-body {
            padding: calc(14px * var(--app-density,1));
          }

          .teacher-number-card {
            margin-bottom: 17px;
            padding: calc(11px * var(--app-density,1)) calc(12px * var(--app-density,1));
          }

          .teacher-number-copy strong {
            font-size: calc(13px * var(--app-font-scale,1));
          }

          .teacher-form-grid {
            grid-template-columns: 1fr;
            gap: calc(10px * var(--app-density,1));
          }

          .teacher-halaqat-grid {
            grid-template-columns: 1fr;
          }

          .teacher-section-gap {
            margin-top: 18px;
          }

          .teacher-modal-footer {
            padding:
              calc(10px * var(--app-density,1)) calc(14px * var(--app-density,1))
              max(calc(10px * var(--app-density,1)), env(safe-area-inset-bottom));
            flex-direction: column;
            align-items: stretch;
          }

          .teacher-modal-footer-note {
            display: none;
          }

          .teacher-modal-actions {
            display: grid;
            grid-template-columns: .75fr 1.35fr;
            width: 100%;
          }

          .teacher-cancel-btn,
          .teacher-save-btn {
            width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 390px) {
          .teacher-modal-backdrop {
            padding: calc(6px * var(--app-density,1));
          }

          .teacher-modal-shell {
            max-height: calc(100dvh - 12px);
            border-radius: calc(16px * var(--app-radius-scale,1));
          }

          .teacher-modal-hero {
            padding: calc(14px * var(--app-density,1)) calc(11px * var(--app-density,1)) calc(12px * var(--app-density,1));
          }

          .teacher-modal-brand p {
            display: none;
          }

          .teacher-modal-body {
            padding: calc(11px * var(--app-density,1));
          }

          .teacher-modal-close {
            width: 36px;
            height: 36px;
            flex-basis: 36px;
          }
        }


        /* ===== قاعدة المشروع: الـModal يتمركز في الشاشة كاملة على كل الأجهزة ===== */
        .teacher-modal-backdrop,
        body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          padding:
            max(calc(12px * var(--app-density,1)), env(safe-area-inset-top))
            max(calc(12px * var(--app-density,1)), env(safe-area-inset-right))
            max(calc(12px * var(--app-density,1)), env(safe-area-inset-bottom))
            max(calc(12px * var(--app-density,1)), env(safe-area-inset-left)) !important;
          display: grid !important;
          place-items: center !important;
        }

        .teacher-modal-shell {
          margin: 0 !important;
          width: min(680px, calc(100vw - 120px)) !important;
          max-height: calc(100dvh - 56px) !important;
          align-self: center !important;
          justify-self: center !important;
        }

        @media (max-width: 700px) {
          .teacher-modal-shell {
            width: min(620px, calc(100vw - 32px)) !important;
            max-height: calc(100dvh - 32px) !important;
          }
        }

        @media (max-width: 390px) {
          .teacher-modal-shell {
            width: calc(100vw - 20px) !important;
            max-height: calc(100dvh - 20px) !important;
          }
        }


        /* =========================================================
           قاعدة الصديق العامة:
           Overlay = كامل الشاشة على كل الأجهزة
           Dialog = صغير ومتمركز داخل الشاشة
           ========================================================= */
        .teacher-modal-backdrop,
        body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          box-sizing: border-box !important;
          display: grid !important;
          place-items: center !important;
          padding:
            max(calc(14px * var(--app-density,1)), env(safe-area-inset-top))
            max(calc(14px * var(--app-density,1)), env(safe-area-inset-right))
            max(calc(14px * var(--app-density,1)), env(safe-area-inset-bottom))
            max(calc(14px * var(--app-density,1)), env(safe-area-inset-left)) !important;
        }

        .teacher-modal-shell {
          width: min(600px, calc(100vw - 180px)) !important;
          max-width: 600px !important;
          max-height: min(760px, calc(100dvh - 72px)) !important;
          margin: 0 !important;
          align-self: center !important;
          justify-self: center !important;
          border-radius: calc(22px * var(--app-radius-scale,1)) !important;
        }

        /* Laptop / tablet */
        @media (max-width: 1100px) {
          .teacher-modal-shell {
            width: min(590px, calc(100vw - 72px)) !important;
            max-height: calc(100dvh - 48px) !important;
          }
        }

        /* Mobile */
        @media (max-width: 700px) {
          .teacher-modal-backdrop,
          body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
            inset: 0 !important;
            width: 100vw !important;
            height: 100dvh !important;
            padding:
              max(calc(10px * var(--app-density,1)), env(safe-area-inset-top))
              max(calc(10px * var(--app-density,1)), env(safe-area-inset-right))
              max(calc(10px * var(--app-density,1)), env(safe-area-inset-bottom))
              max(calc(10px * var(--app-density,1)), env(safe-area-inset-left)) !important;
          }

          .teacher-modal-shell {
            width: calc(100vw - 28px) !important;
            max-width: 540px !important;
            max-height: calc(100dvh - 28px) !important;
            border-radius: calc(18px * var(--app-radius-scale,1)) !important;
          }
        }

        @media (max-width: 390px) {
          .teacher-modal-shell {
            width: calc(100vw - 16px) !important;
            max-height: calc(100dvh - 16px) !important;
            border-radius: calc(15px * var(--app-radius-scale,1)) !important;
          }
        }


        /* =========================================================
           TEACHERS PAGE — FINAL RESPONSIVE LAYOUT
           Desktop = full available page width
           Mobile = no horizontal clipping / no sidebar collision
           ========================================================= */

        .teachers-page {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: clamp(calc(14px * var(--app-density,1)), 1.6vw, calc(28px * var(--app-density,1))) !important;
          overflow-x: clip !important;
        }

        .teachers-page-inner {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          margin: 0 !important;
        }

        .teachers-main-header,
        .teachers-stats-grid,
        .teachers-smart-hero,
        .teachers-filter-card,
        .teachers-list-grid {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }

        /* Compact desktop statistics instead of oversized cards */
        .teachers-stats-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: calc(10px * var(--app-density,1)) !important;
          margin-bottom: 14px !important;
        }

        .teachers-stat-card {
          min-width: 0 !important;
          min-height: 76px !important;
          padding: calc(12px * var(--app-density,1)) calc(14px * var(--app-density,1)) !important;
          border-radius: calc(14px * var(--app-radius-scale,1)) !important;
          gap: calc(10px * var(--app-density,1)) !important;
        }

        .teachers-stat-card > div:first-child {
          width: 38px !important;
          height: 38px !important;
          flex-basis: 38px !important;
          border-radius: calc(11px * var(--app-radius-scale,1)) !important;
        }

        .teachers-stat-card > div:last-child > div:first-child {
          font-size: calc(10px * var(--app-font-scale,1)) !important;
          margin-bottom: 1px !important;
        }

        .teachers-stat-card > div:last-child > div:last-child {
          font-size: calc(20px * var(--app-font-scale,1)) !important;
          line-height: 1.05 !important;
        }

        /* Hero must never overflow on narrow widths */
        .teachers-smart-hero {
          padding: calc(16px * var(--app-density,1)) !important;
          margin-bottom: 14px !important;
        }

        .teachers-smart-grid {
          width: 100% !important;
          min-width: 0 !important;
          grid-template-columns: minmax(230px, .95fr) minmax(0, 1.45fr) !important;
          gap: calc(12px * var(--app-density,1)) !important;
        }

        .teachers-smart-grid > * {
          min-width: 0 !important;
        }

        .teachers-smart-metrics {
          min-width: 0 !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: calc(8px * var(--app-density,1)) !important;
        }

        .teachers-smart-metric {
          min-width: 0 !important;
          min-height: 72px !important;
          padding: calc(10px * var(--app-density,1)) !important;
        }

        .teachers-smart-metric strong {
          font-size: calc(20px * var(--app-font-scale,1)) !important;
        }

        /* Filters always fit their container */
        .teachers-filter-card {
          padding: calc(10px * var(--app-density,1)) !important;
          margin-bottom: 14px !important;
        }

        .teachers-filter-grid {
          width: 100% !important;
          min-width: 0 !important;
          grid-template-columns: minmax(0, 1fr) minmax(150px, 190px) !important;
          gap: calc(8px * var(--app-density,1)) !important;
        }

        .teachers-filter-grid > * {
          width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }

        /* Modal: full-screen overlay on every device, dialog itself compact */
        .teacher-modal-backdrop,
        body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          margin: 0 !important;
          display: grid !important;
          place-items: center !important;
          box-sizing: border-box !important;
          padding:
            max(calc(12px * var(--app-density,1)), env(safe-area-inset-top))
            max(calc(12px * var(--app-density,1)), env(safe-area-inset-right))
            max(calc(12px * var(--app-density,1)), env(safe-area-inset-bottom))
            max(calc(12px * var(--app-density,1)), env(safe-area-inset-left)) !important;
          overflow: hidden !important;
        }

        .teacher-modal-shell {
          width: min(560px, calc(100vw - 160px)) !important;
          max-width: 560px !important;
          max-height: calc(100dvh - 56px) !important;
          min-width: 0 !important;
          margin: 0 !important;
          align-self: center !important;
          justify-self: center !important;
          box-sizing: border-box !important;
        }

        @media (max-width: 1100px) {
          .teachers-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .teachers-smart-grid {
            grid-template-columns: 1fr !important;
          }

          .teacher-modal-shell {
            width: min(560px, calc(100vw - 64px)) !important;
          }
        }

        @media (max-width: 700px) {
          .teachers-page {
            width: 100% !important;
            max-width: 100% !important;
            padding: calc(10px * var(--app-density,1)) !important;
            overflow-x: hidden !important;
          }

          .teachers-main-header {
            gap: calc(10px * var(--app-density,1)) !important;
            margin-bottom: 12px !important;
          }

          .teachers-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: calc(7px * var(--app-density,1)) !important;
            margin-bottom: 10px !important;
          }

          .teachers-stat-card {
            min-height: 64px !important;
            padding: calc(9px * var(--app-density,1)) !important;
            gap: calc(7px * var(--app-density,1)) !important;
            border-radius: calc(12px * var(--app-radius-scale,1)) !important;
          }

          .teachers-stat-card > div:first-child {
            width: 34px !important;
            height: 34px !important;
            flex-basis: 34px !important;
          }

          .teachers-stat-card > div:last-child {
            min-width: 0 !important;
          }

          .teachers-stat-card > div:last-child > div:first-child {
            font-size: calc(9px * var(--app-font-scale,1)) !important;
            white-space: normal !important;
          }

          .teachers-stat-card > div:last-child > div:last-child {
            font-size: calc(18px * var(--app-font-scale,1)) !important;
          }

          .teachers-smart-hero {
            padding: calc(13px * var(--app-density,1)) !important;
            border-radius: calc(16px * var(--app-radius-scale,1)) !important;
          }

          .teachers-smart-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: calc(12px * var(--app-density,1)) !important;
          }

          .teachers-smart-grid h2 {
            font-size: calc(18px * var(--app-font-scale,1)) !important;
          }

          .teachers-smart-grid p {
            font-size: calc(10px * var(--app-font-scale,1)) !important;
            line-height: 1.65 !important;
          }

          .teachers-smart-metrics {
            width: 100% !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: calc(6px * var(--app-density,1)) !important;
          }

          .teachers-smart-metric {
            min-height: 68px !important;
            padding: calc(8px * var(--app-density,1)) !important;
            border-radius: calc(11px * var(--app-radius-scale,1)) !important;
            overflow: hidden !important;
          }

          .teachers-smart-metric > div:first-child {
            gap: calc(3px * var(--app-density,1)) !important;
            font-size: calc(8px * var(--app-font-scale,1)) !important;
          }

          .teachers-smart-metric strong {
            font-size: calc(17px * var(--app-font-scale,1)) !important;
          }

          .teachers-smart-metric > span:last-child {
            font-size: calc(7px * var(--app-font-scale,1)) !important;
            line-height: 1.35 !important;
          }

          .teachers-filter-card {
            padding: calc(8px * var(--app-density,1)) !important;
          }

          .teachers-filter-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: calc(7px * var(--app-density,1)) !important;
          }

          .teachers-filter-grid input,
          .teachers-filter-grid select {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .teachers-list-grid {
            grid-template-columns: 1fr !important;
            gap: calc(10px * var(--app-density,1)) !important;
          }

          .teacher-modal-backdrop,
          body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
            inset: 0 !important;
            width: 100vw !important;
            height: 100dvh !important;
            padding:
              max(calc(8px * var(--app-density,1)), env(safe-area-inset-top))
              max(calc(8px * var(--app-density,1)), env(safe-area-inset-right))
              max(calc(8px * var(--app-density,1)), env(safe-area-inset-bottom))
              max(calc(8px * var(--app-density,1)), env(safe-area-inset-left)) !important;
          }

          .teacher-modal-shell {
            width: min(430px, calc(100vw - 24px)) !important;
            max-width: calc(100vw - 24px) !important;
            max-height: calc(100dvh - 20px) !important;
            border-radius: calc(18px * var(--app-radius-scale,1)) !important;
          }
        }

        @media (max-width: 420px) {
          .teachers-page {
            padding: calc(7px * var(--app-density,1)) !important;
          }

          .teachers-stats-grid {
            gap: calc(6px * var(--app-density,1)) !important;
          }

          .teachers-stat-card {
            min-height: 60px !important;
            padding: calc(8px * var(--app-density,1)) !important;
          }

          .teachers-smart-metrics {
            grid-template-columns: 1fr !important;
          }

          .teachers-smart-metric {
            min-height: 54px !important;
          }

          .teacher-modal-shell {
            width: calc(100vw - 16px) !important;
            max-width: calc(100vw - 16px) !important;
            max-height: calc(100dvh - 16px) !important;
            border-radius: calc(15px * var(--app-radius-scale,1)) !important;
          }
        }


        @media (max-width: 430px) {
          .teacher-modal-backdrop {
            padding-top: calc(70px * var(--app-density,1));
            padding-right: calc(8px * var(--app-density,1));
            padding-bottom: max(calc(8px * var(--app-density,1)), env(safe-area-inset-bottom));
            padding-left: calc(8px * var(--app-density,1));
          }
          .teacher-modal-shell {
            width: 100%;
            max-height: calc(100dvh - 80px);
            border-radius: calc(18px * var(--app-radius-scale,1));
          }
          .teacher-modal-hero {
            padding: calc(17px * var(--app-density,1)) calc(14px * var(--app-density,1)) calc(14px * var(--app-density,1));
          }
          .teacher-modal-brand {
            gap: calc(10px * var(--app-density,1));
          }
          .teacher-modal-brand-icon {
            width: 40px;
            height: 40px;
            flex-basis: 40px;
            border-radius: calc(13px * var(--app-radius-scale,1));
          }
          .teacher-modal-brand h2 {
            font-size: calc(18px * var(--app-font-scale,1));
          }
          .teacher-modal-steps {
            overflow-x: auto;
            scrollbar-width: none;
          }
          .teacher-modal-steps::-webkit-scrollbar {
            display: none;
          }
          .teacher-modal-steps span {
            flex: 0 0 auto;
            white-space: nowrap;
          }
          .teacher-modal-body {
            padding: calc(14px * var(--app-density,1));
          }
          .teacher-modal-footer {
            padding: calc(10px * var(--app-density,1)) calc(14px * var(--app-density,1)) max(calc(10px * var(--app-density,1)), env(safe-area-inset-bottom));
          }
        }

        @media (min-width: 701px) and (max-height: 760px) {
          .teacher-modal-backdrop {
            padding-top: calc(82px * var(--app-density,1));
            padding-bottom: calc(10px * var(--app-density,1));
          }
          .teacher-modal-shell {
            max-height: calc(100dvh - 92px);
          }
          .teacher-modal-hero {
            padding-top: calc(18px * var(--app-density,1));
            padding-bottom: calc(14px * var(--app-density,1));
          }
          .teacher-modal-body {
            padding-top: calc(15px * var(--app-density,1));
            padding-bottom: calc(15px * var(--app-density,1));
          }
        }

        /* =========================================================
           FINAL TEACHER MODAL — DEVICE ADAPTIVE
           - Overlay covers the whole device.
           - Dialog is deliberately compact.
           - Clear breathing room below the topbar.
           - Internal scrolling only.
        ========================================================= */
        .teacher-modal-backdrop,
        body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          z-index: 100000 !important;
          width: 100vw !important;
          height: 100dvh !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          padding:
            calc(104px * var(--app-density,1))
            max(calc(22px * var(--app-density,1)), env(safe-area-inset-right))
            calc(24px * var(--app-density,1))
            max(calc(22px * var(--app-density,1)), env(safe-area-inset-left)) !important;
        }

        .teacher-modal-shell {
          width: min(520px, calc(100vw - 150px)) !important;
          max-width: 520px !important;
          height: auto !important;
          max-height: calc(100dvh - 142px) !important;
          min-width: 0 !important;
          margin: 0 !important;
          border-radius: calc(22px * var(--app-radius-scale,1)) !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior: contain !important;
          scrollbar-gutter: stable;
        }

        .teacher-modal-hero {
          padding: calc(18px * var(--app-density,1)) calc(18px * var(--app-density,1)) calc(15px * var(--app-density,1)) !important;
        }

        .teacher-modal-body {
          padding: calc(16px * var(--app-density,1)) calc(18px * var(--app-density,1)) !important;
        }

        .teacher-modal-footer {
          padding: calc(10px * var(--app-density,1)) calc(18px * var(--app-density,1)) !important;
        }

        /* Laptop / small desktop */
        @media (min-width: 701px) and (max-width: 1200px) {
          .teacher-modal-backdrop,
          body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
            padding: calc(96px * var(--app-density,1)) calc(18px * var(--app-density,1)) calc(20px * var(--app-density,1)) !important;
          }

          .teacher-modal-shell {
            width: min(500px, calc(100vw - 110px)) !important;
            max-width: 500px !important;
            max-height: calc(100dvh - 126px) !important;
          }
        }

        /* Tablet */
        @media (min-width: 521px) and (max-width: 700px) {
          .teacher-modal-backdrop,
          body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
            padding:
              calc(86px * var(--app-density,1))
              max(calc(18px * var(--app-density,1)), env(safe-area-inset-right))
              max(calc(16px * var(--app-density,1)), env(safe-area-inset-bottom))
              max(calc(18px * var(--app-density,1)), env(safe-area-inset-left)) !important;
          }

          .teacher-modal-shell {
            width: min(480px, calc(100vw - 48px)) !important;
            max-width: 480px !important;
            max-height: calc(100dvh - 112px) !important;
            border-radius: calc(20px * var(--app-radius-scale,1)) !important;
          }
        }

        /* Phones */
        @media (max-width: 520px) {
          .teacher-modal-backdrop,
          body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
            align-items: center !important;
            justify-content: center !important;
            padding:
              calc(78px * var(--app-density,1))
              max(calc(14px * var(--app-density,1)), env(safe-area-inset-right))
              max(calc(12px * var(--app-density,1)), env(safe-area-inset-bottom))
              max(calc(14px * var(--app-density,1)), env(safe-area-inset-left)) !important;
          }

          .teacher-modal-shell {
            width: calc(100vw - 32px) !important;
            max-width: 430px !important;
            max-height: calc(100dvh - 100px) !important;
            border-radius: calc(18px * var(--app-radius-scale,1)) !important;
          }

          .teacher-modal-hero {
            padding: calc(15px * var(--app-density,1)) calc(14px * var(--app-density,1)) calc(13px * var(--app-density,1)) !important;
          }

          .teacher-modal-brand-icon {
            width: 38px !important;
            height: 38px !important;
            flex-basis: 38px !important;
          }

          .teacher-modal-brand h2 {
            font-size: calc(17px * var(--app-font-scale,1)) !important;
            line-height: 1.35 !important;
          }

          .teacher-modal-brand p {
            font-size: calc(8px * var(--app-font-scale,1)) !important;
          }

          .teacher-modal-steps {
            margin-top: 11px !important;
            overflow-x: auto !important;
            flex-wrap: nowrap !important;
            scrollbar-width: none !important;
          }

          .teacher-modal-steps::-webkit-scrollbar {
            display: none !important;
          }

          .teacher-modal-steps span {
            flex: 0 0 auto !important;
            white-space: nowrap !important;
            padding: calc(6px * var(--app-density,1)) calc(8px * var(--app-density,1)) !important;
            font-size: calc(8px * var(--app-font-scale,1)) !important;
          }

          .teacher-modal-body {
            padding: calc(13px * var(--app-density,1)) calc(14px * var(--app-density,1)) !important;
          }

          .teacher-number-card {
            margin-bottom: 16px !important;
            padding: calc(10px * var(--app-density,1)) calc(11px * var(--app-density,1)) !important;
          }

          .teacher-form-grid {
            grid-template-columns: 1fr !important;
            gap: calc(9px * var(--app-density,1)) !important;
          }

          .teacher-halaqat-grid {
            grid-template-columns: 1fr !important;
          }

          .teacher-section-gap {
            margin-top: 17px !important;
          }

          .teacher-modal-footer {
            padding:
              calc(9px * var(--app-density,1)) calc(14px * var(--app-density,1))
              max(calc(9px * var(--app-density,1)), env(safe-area-inset-bottom)) !important;
          }

          .teacher-modal-footer-note {
            display: none !important;
          }

          .teacher-modal-actions {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: .72fr 1.45fr !important;
            gap: calc(8px * var(--app-density,1)) !important;
          }

          .teacher-cancel-btn,
          .teacher-save-btn {
            width: 100% !important;
            min-width: 0 !important;
          }
        }

        /* Very small / short phones */
        @media (max-width: 390px) {
          .teacher-modal-backdrop,
          body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
            padding:
              calc(72px * var(--app-density,1))
              calc(9px * var(--app-density,1))
              max(calc(9px * var(--app-density,1)), env(safe-area-inset-bottom))
              calc(9px * var(--app-density,1)) !important;
          }

          .teacher-modal-shell {
            width: calc(100vw - 18px) !important;
            max-height: calc(100dvh - 90px) !important;
            border-radius: calc(16px * var(--app-radius-scale,1)) !important;
          }

          .teacher-modal-brand p {
            display: none !important;
          }
        }

        @media (max-height: 700px) and (min-width: 521px) {
          .teacher-modal-backdrop,
          body:has(.admin-layout-sidebar:not(.collapsed)) .teacher-modal-backdrop {
            padding-top: calc(84px * var(--app-density,1)) !important;
            padding-bottom: calc(12px * var(--app-density,1)) !important;
          }

          .teacher-modal-shell {
            max-height: calc(100dvh - 102px) !important;
          }
        }

      `}</style>

      {showDeleteModal && (
        <DeleteModal
          teacher={
            teacherToDelete
          }
          loading={
            loading
          }
          onCancel={() => {
            setShowDeleteModal(
              false
            );
            setTeacherToDelete(
              null
            );
          }}
          onConfirm={
            deleteTeacher
          }
        />
      )}
    </div>
  );
}

// =====================================================
// Teacher Card
// =====================================================

function TeacherCard({
  teacher,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  const active =
    teacher.status ===
    "active";

  return (
    <div
      style={{
        background:
          "#fff",
        borderRadius:
          "calc(18px * var(--app-radius-scale,1))",
        padding:
          "calc(20px * var(--app-density,1))",
        border:
          active
            ? "1px solid #e1eae4"
            : "1px solid #ebebeb",
        boxShadow:
          "0 5px 18px rgba(0,0,0,.045)",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap:
            "calc(10px * var(--app-density,1))",
          marginBottom:
            "17px",
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "calc(11px * var(--app-density,1))",
            minWidth:
              0,
          }}
        >
          <div
            style={{
              width:
                "52px",
              height:
                "52px",
              borderRadius:
                "calc(15px * var(--app-radius-scale,1))",
              background:
                "linear-gradient(145deg,var(--app-color-edf5ef,#edf5ef),#dfeae3)",
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
            <GraduationCap
              size={27}
              strokeWidth={
                1.7
              }
            />
          </div>

          <div
            style={{
              minWidth:
                0,
            }}
          >
            <h3
              style={{
                margin:
                  0,
                color:
                  "var(--app-color-173d2b,#173d2b)",
                fontSize:
                  "calc(18px * var(--app-font-scale,1))",
                fontWeight:
                  "800",
                whiteSpace:
                  "nowrap",
                overflow:
                  "hidden",
                textOverflow:
                  "ellipsis",
              }}
            >
              {
                teacher.full_name
              }
            </h3>

            <div
              style={{
                color:
                  "#89918c",
                fontSize:
                  "calc(12px * var(--app-font-scale,1))",
                marginTop:
                  "4px",
              }}
            >
              رقم المعلم:{" "}
              {
                teacher.user_number ||
                "-"
              }
            </div>
          </div>
        </div>

        <span
          style={{
            padding:
              "calc(5px * var(--app-density,1)) calc(10px * var(--app-density,1))",
            borderRadius:
              "calc(20px * var(--app-radius-scale,1))",
            background:
              active
                ? "#e7f5ec"
                : "#f1f1f1",
            color:
              active
                ? "var(--app-color-0f5132,#0f5132)"
                : "#777",
            fontSize:
              "calc(11px * var(--app-font-scale,1))",
            fontWeight:
              "750",
            flexShrink:
              0,
          }}
        >
          {active
            ? "نشط"
            : "غير نشط"}
        </span>
      </div>

      {/* INFO */}

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap:
            "calc(8px * var(--app-density,1))",
          marginBottom:
            "15px",
        }}
      >
        <InfoBox
          icon={
            <Phone
              size={15}
            />
          }
          label="الجوال"
          value={
            teacher.phone ||
            "غير مسجل"
          }
        />

        <InfoBox
          icon={
            <GraduationCap
              size={15}
            />
          }
          label="المرحلة"
          value={
            teacher.education_stage ||
            "غير محدد"
          }
        />

        <InfoBox
          icon={<Mail size={15} />}
          label="البريد الإلكتروني"
          value={teacher.email || "غير مسجل"}
        />

        <InfoBox
          icon={<Hash size={15} />}
          label="الرقم الإداري"
          value={teacher.user_number || "غير مسجل"}
        />
      </div>

      {/* HALAQAT */}

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
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap:
              "calc(8px * var(--app-density,1))",
            marginBottom:
              "9px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "calc(6px * var(--app-density,1))",
              color:
                "#6e7771",
              fontSize:
                "calc(12px * var(--app-font-scale,1))",
            }}
          >
            <BookOpen
              size={15}
            />

            الحلقات
          </div>

          <strong
            style={{
              color:
                "var(--app-color-0f5132,#0f5132)",
              fontSize:
                "calc(13px * var(--app-font-scale,1))",
            }}
          >
            {
              teacher.halaqatCount
            }
          </strong>
        </div>

        {teacher.halaqatCount ===
        0 ? (
          <div
            style={{
              color:
                "#999",
              fontSize:
                "calc(12px * var(--app-font-scale,1))",
            }}
          >
            لا توجد حلقات مرتبطة
          </div>
        ) : (
          <div
            style={{
              display:
                "flex",
              flexWrap:
                "wrap",
              gap:
                "calc(6px * var(--app-density,1))",
            }}
          >
            {teacher.halaqat.map(
              (halaqa) => (
                <span
                  key={
                    halaqa.id
                  }
                  style={{
                    padding:
                      "calc(5px * var(--app-density,1)) calc(8px * var(--app-density,1))",
                    borderRadius:
                      "calc(8px * var(--app-radius-scale,1))",
                    background:
                      "#eaf4ed",
                    color:
                      "var(--app-color-0f5132,#0f5132)",
                    fontSize:
                      "calc(11px * var(--app-font-scale,1))",
                    fontWeight:
                      "700",
                  }}
                >
                  {
                    halaqa.name
                  }
                </span>
              )
            )}
          </div>
        )}
      </div>

      {/* NOTES */}

      {teacher.notes && (
        <div
          style={{
            marginBottom:
              "15px",
            color:
              "#747c77",
            fontSize:
              "calc(12px * var(--app-font-scale,1))",
            lineHeight:
              "1.7",
          }}
        >
          <strong
            style={{
              color:
                "#4b554f",
            }}
          >
            ملاحظات:
          </strong>{" "}
          {
            teacher.notes
          }
        </div>
      )}

      {/* ACTIONS */}

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap:
            "calc(8px * var(--app-density,1))",
        }}
      >
        <button
          type="button"
          onClick={() =>
            onEdit(
              teacher
            )
          }
          style={
            actionButtonStyle
          }
        >
          <Pencil
            size={16}
          />

          تعديل
        </button>

        <button
          type="button"
          onClick={() =>
            onToggleStatus(
              teacher
            )
          }
          style={
            actionSecondaryButtonStyle
          }
        >
          {active ? (
            <>
              <XCircle
                size={16}
              />
              تعطيل
            </>
          ) : (
            <>
              <CheckCircle2
                size={16}
              />
              تفعيل
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            onDelete(
              teacher
            )
          }
          style={
            deleteButtonStyle
          }
        >
          <Trash2
            size={16}
          />

          حذف المعلم
        </button>
      </div>
    </div>
  );
}

// =====================================================
// Form Field
// =====================================================

function FormField({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  dir = "rtl",
  autoComplete,
}) {
  return (
    <div>
      <label
        style={
          labelStyle
        }
      >
        {label}
      </label>

      <div
        style={{
          position:
            "relative",
        }}
      >
        {icon && (
          <div
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
                "#8a938d",
              pointerEvents:
                "none",
            }}
          >
            {icon}
          </div>
        )}

        <input
          type={type}
          dir={dir}
          autoComplete={autoComplete}
          value={
            value
          }
          onChange={(e) =>
            onChange(
              e.target
                .value
            )
          }
          placeholder={
            placeholder
          }
          style={{
            ...inputStyle,
            paddingRight:
              (icon) ? ("calc(42px * var(--app-density,1))") : ("calc(12px * var(--app-density,1))"),
          }}
        />
      </div>
    </div>
  );
}

// =====================================================
// Select
// =====================================================

function SelectField({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div>
      <label
        style={
          labelStyle
        }
      >
        {label}
      </label>

      <select
        value={
          value
        }
        onChange={(e) =>
          onChange(
            e.target
              .value
          )
        }
        style={
          inputStyle
        }
      >
        <option value="">
          غير محدد
        </option>

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
              {
                option.label
              }
            </option>
          )
        )}
      </select>
    </div>
  );
}

// =====================================================
// Info Box
// =====================================================

function InfoBox({
  icon,
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
        minWidth:
          0,
      }}
    >
      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          gap:
            "calc(5px * var(--app-density,1))",
          color:
            "#8a928c",
          fontSize:
            "calc(10px * var(--app-font-scale,1))",
          marginBottom:
            "4px",
        }}
      >
        {icon}
        {label}
      </div>

      <div
        style={{
          color:
            "#3f4943",
          fontSize:
            "calc(12px * var(--app-font-scale,1))",
          fontWeight:
            "700",
          overflow:
            "hidden",
          textOverflow:
            "ellipsis",
          whiteSpace:
            "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// =====================================================
// Stat Card
// =====================================================

function StatCard({
  title,
  value,
  icon,
}) {
  return (
    <div className="teachers-stat-card"
      style={{
        background:
          "#fff",
        borderRadius:
          "calc(16px * var(--app-radius-scale,1))",
        padding:
          "calc(18px * var(--app-density,1))",
        display:
          "flex",
        alignItems:
          "center",
        gap:
          "calc(13px * var(--app-density,1))",
        border:
          "1px solid #e4e9e5",
        boxShadow:
          "0 4px 15px rgba(0,0,0,.035)",
      }}
    >
      <div
        style={{
          width:
            "46px",
          height:
            "46px",
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

        <div
          style={{
            color:
              "var(--app-color-173d2b,#173d2b)",
            fontSize:
              "calc(24px * var(--app-font-scale,1))",
            fontWeight:
              "850",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}


function SmartMetric({ label, value, note, icon }) {
  return (
    <div className="teachers-smart-metric"
      style={{
        minHeight: "92px",
        padding: "calc(13px * var(--app-density,1))",
        borderRadius: "calc(14px * var(--app-radius-scale,1))",
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(255,255,255,.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "rgba(255,255,255,.66)",
          fontSize: "calc(10px * var(--app-font-scale,1))",
          fontWeight: "800",
        }}
      >
        <span>{label}</span>
        <span style={{ color: "#F1D681" }}>{icon}</span>
      </div>
      <strong
        style={{
          display: "block",
          marginTop: "6px",
          color: "#fff",
          fontSize: "calc(24px * var(--app-font-scale,1))",
          lineHeight: 1,
        }}
      >
        {value}
      </strong>
      <span
        style={{
          display: "block",
          marginTop: "6px",
          color: "rgba(255,255,255,.55)",
          fontSize: "calc(9px * var(--app-font-scale,1))",
        }}
      >
        {note}
      </span>
    </div>
  );
}

// =====================================================
// Loading
// =====================================================

function LoadingState() {
  return (
    <div className="sadiq-loading-state"
      style={{
        ...cardStyle,
        padding:
          "calc(55px * var(--app-density,1)) calc(20px * var(--app-density,1))",
        textAlign:
          "center",
        color:
          "#7c857f",
      }}
    >
      <RefreshCw
        size={30}
        className="spin"
        color="#0f5132"
      />

      <div
        style={{
          marginTop:
            "12px",
          fontSize:
            "calc(13px * var(--app-font-scale,1))",
        }}
      >
        جاري تحميل المعلمين...
      </div>
    </div>
  );
}

// =====================================================
// Empty
// =====================================================

function EmptyState({
  hasSearch,
  onClear,
}) {
  return (
    <div
      style={{
        ...cardStyle,
        padding:
          "calc(55px * var(--app-density,1)) calc(20px * var(--app-density,1))",
        textAlign:
          "center",
      }}
    >
      <div
        style={{
          width:
            "62px",
          height:
            "62px",
          margin:
            "0 auto 14px",
          borderRadius:
            "calc(17px * var(--app-radius-scale,1))",
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
        {hasSearch ? (
          <Search
            size={28}
          />
        ) : (
          <GraduationCap
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
        }}
      >
        {hasSearch
          ? "لا توجد نتائج"
          : "لا يوجد معلمون حتى الآن"}
      </h3>

      <p
        style={{
          margin:
            0,
          color:
            "#929993",
          fontSize:
            "calc(12px * var(--app-font-scale,1))",
        }}
      >
        {hasSearch
          ? "لم نجد معلمًا مطابقًا للبحث."
          : "ابدأ بإضافة أول معلم إلى النظام."}
      </p>

      {hasSearch && (
        <button
          type="button"
          onClick={
            onClear
          }
          style={{
            ...primaryButton,
            marginTop:
              "15px",
          }}
        >
          مسح البحث
        </button>
      )}
    </div>
  );
}

// =====================================================
// Delete Modal
// =====================================================

function DeleteModal({
  teacher,
  loading,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      style={{
        position:
          "fixed",
        inset:
          0,
        background:
          "rgba(18,30,23,.45)",
        backdropFilter:
          "blur(4px)",
        zIndex:
          100000,
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        padding:
          "calc(20px * var(--app-density,1))",
      }}
      onMouseDown={(e) => {
        if (
          e.target ===
          e.currentTarget
        ) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          width:
            "100%",
          maxWidth:
            "430px",
          background:
            "#fff",
          borderRadius:
            "calc(20px * var(--app-radius-scale,1))",
          padding:
            "calc(25px * var(--app-density,1))",
          boxShadow:
            "0 25px 80px rgba(0,0,0,.2)",
        }}
      >
        <div
          style={{
            width:
              "48px",
            height:
              "48px",
            borderRadius:
              "calc(14px * var(--app-radius-scale,1))",
            background:
              "#fff0ef",
            color:
              "#b42318",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            marginBottom:
              "15px",
          }}
        >
          <AlertCircle
            size={25}
          />
        </div>

        <h2
          style={{
            margin:
              "0 0 8px",
            color:
              "#28332d",
            fontSize:
              "calc(19px * var(--app-font-scale,1))",
          }}
        >
          حذف المعلم
        </h2>

        <p
          style={{
            margin:
              "0",
            color:
              "#707872",
            fontSize:
              "calc(13px * var(--app-font-scale,1))",
            lineHeight:
              "1.8",
          }}
        >
          هل أنت متأكد من حذف المعلم{" "}
          <strong
            style={{
              color:
                "#26332c",
            }}
          >
            {teacher?.full_name}
          </strong>
          ؟
          <br />
          سيتم أيضًا حذف ارتباطه بالحلقات.
        </p>

        <div
          style={{
            display:
              "flex",
            gap:
              "calc(8px * var(--app-density,1))",
            marginTop:
              "22px",
          }}
        >
          <button
            type="button"
            onClick={
              onCancel
            }
            disabled={
              loading
            }
            style={{
              ...secondaryButton,
              flex: 1,
              justifyContent:
                "center",
            }}
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              loading
            }
            style={{
              ...deleteButtonStyle,
              flex: 1,
              opacity:
                loading
                  ? 0.7
                  : 1,
            }}
          >
            {loading
              ? "جارٍ الحذف..."
              : "نعم، احذف"}
          </button>
        </div>
      </div>


    </div>
  );
}

// =====================================================
// Styles
// =====================================================

const cardStyle = {
  background:
    "#fff",
  borderRadius:
    "calc(18px * var(--app-radius-scale,1))",
  padding:
    "calc(22px * var(--app-density,1))",
  border:
    "1px solid #e4e9e5",
  boxShadow:
    "0 5px 18px rgba(0,0,0,.04)",
};

const inputStyle = {
  width:
    "100%",
  height:
    "46px",
  padding:
    "0 calc(12px * var(--app-density,1))",
  border:
    "1px solid #d8ded9",
  borderRadius:
    "calc(10px * var(--app-radius-scale,1))",
  outline:
    "none",
  boxSizing:
    "border-box",
  background:
    "#fff",
  color:
    "#26332c",
  fontSize:
    "calc(13px * var(--app-font-scale,1))",
  direction:
    "rtl",
};

const labelStyle = {
  display:
    "block",
  color:
    "#465149",
  fontSize:
    "calc(12px * var(--app-font-scale,1))",
  fontWeight:
    "750",
  marginBottom:
    "7px",
};

const primaryButton = {
  border:
    "none",
  background:
    "var(--app-color-0f5132,#0f5132)",
  color:
    "#fff",
  borderRadius:
    "calc(10px * var(--app-radius-scale,1))",
  padding:
    "calc(11px * var(--app-density,1)) calc(20px * var(--app-density,1))",
  cursor:
    "pointer",
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap:
    "calc(7px * var(--app-density,1))",
  fontSize:
    "calc(13px * var(--app-font-scale,1))",
  fontWeight:
    "750",
};

const secondaryButton = {
  border:
    "1px solid #d9dfdb",
  background:
    "#fff",
  color:
    "#4e5952",
  borderRadius:
    "calc(10px * var(--app-radius-scale,1))",
  padding:
    "calc(10px * var(--app-density,1)) calc(15px * var(--app-density,1))",
  cursor:
    "pointer",
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap:
    "calc(7px * var(--app-density,1))",
  fontSize:
    "calc(12px * var(--app-font-scale,1))",
  fontWeight:
    "700",
};

const iconButtonStyle = {
  width:
    "43px",
  height:
    "43px",
  border:
    "1px solid #dce2dd",
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

const actionButtonStyle = {
  border:
    "1px solid #d9e3dc",
  background:
    "var(--app-color-f8fbf9,#f8fbf9)",
  color:
    "var(--app-color-0f5132,#0f5132)",
  borderRadius:
    "calc(9px * var(--app-radius-scale,1))",
  padding:
    "calc(10px * var(--app-density,1))",
  cursor:
    "pointer",
  fontWeight:
    "700",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap:
    "calc(6px * var(--app-density,1))",
  fontSize:
    "calc(12px * var(--app-font-scale,1))",
};

const actionSecondaryButtonStyle = {
  border:
    "1px solid #dedfdd",
  background:
    "#fff",
  color:
    "#59615c",
  borderRadius:
    "calc(9px * var(--app-radius-scale,1))",
  padding:
    "calc(10px * var(--app-density,1))",
  cursor:
    "pointer",
  fontWeight:
    "650",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap:
    "calc(6px * var(--app-density,1))",
  fontSize:
    "calc(12px * var(--app-font-scale,1))",
};

const deleteButtonStyle = {
  gridColumn:
    "1 / -1",
  border:
    "1px solid #f0d8d5",
  background:
    "#fff8f7",
  color:
    "#b42318",
  borderRadius:
    "calc(9px * var(--app-radius-scale,1))",
  padding:
    "calc(10px * var(--app-density,1))",
  cursor:
    "pointer",
  fontWeight:
    "700",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap:
    "calc(6px * var(--app-density,1))",
  fontSize:
    "calc(12px * var(--app-font-scale,1))",
};