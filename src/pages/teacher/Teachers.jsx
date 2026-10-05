import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";

import { UsersRound, UserRound, Search, Plus, Pencil, Trash2, ArrowRight, CheckCircle2, XCircle, Phone, BookOpen, GraduationCap, ShieldCheck, Link2, X, Save, RefreshCw, UserCheck, UserX, AlertCircle } from "lucide-react";

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

    if (!teacherNumber.trim()) {
      showToast(
        "أدخل رقم المعلم",
        "error"
      );
      return;
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
                teacherNumber.trim(),

              phone:
                phone.trim() || null,

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
            teacherNumber.trim(),

          full_name:
            fullName.trim(),

          phone:
            phone.trim() || null,

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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================================
  // مسح النموذج
  // =====================================================

  function clearForm() {
    setEditingId(null);

    setFullName("");
    setTeacherNumber("");
    setPhone("");
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

  // =====================================================
  // الواجهة
  // =====================================================

  return (
    <div
      dir="rtl"
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
        style={{
          maxWidth:
            "1450px",
          margin:
            "0 auto",
        }}
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <header
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

          <button
            type="button"
            onClick={() =>
              loadData(
                true
              )
            }
            disabled={
              initialLoading
            }
            style={
              secondaryButton
            }
          >
            <RefreshCw
              size={16}
              className={
                initialLoading
                  ? "spin"
                  : ""
              }
            />

            تحديث
          </button>
        </header>

        {/* ================================================= */}
        {/* STATISTICS */}
        {/* ================================================= */}

        <div
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
        {/* FORM */}
        {/* ================================================= */}

        <section
          style={{
            ...cardStyle,
            marginBottom:
              "22px",
          }}
        >
          <div
  style={{
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    marginBottom:"28px",
    paddingBottom:"calc(22px * var(--app-density,1))",
    borderBottom:"1px solid #E2E8F0"
  }}
>

  <div
    style={{
      display:"flex",
      alignItems:"center",
      gap:"calc(18px * var(--app-density,1))"
    }}
  >

    <div
      style={{
        width:"58px",
        height:"58px",
        borderRadius:"calc(18px * var(--app-radius-scale,1))",
        background:
          editingId
          ? "#EFF6FF"
          : "#ECFDF5",
        display:"flex",
        alignItems:"center",
        justifyContent:"center"
      }}
    >
      {
        editingId
        ? <Pencil size={24}/>
        : <Plus size={24}/>
      }
    </div>

    <div>

      <div
        style={{
          fontSize:"calc(24px * var(--app-font-scale,1))",
          fontWeight:"900",
          color:"#0F172A"
        }}
      >
        {
          editingId
          ? "تعديل المعلم"
          : "إضافة معلم جديد"
        }
      </div>

      <div
        style={{
          marginTop:"6px",
          color:"#64748B",
          fontSize:"calc(14px * var(--app-font-scale,1))",
          fontWeight:"500"
        }}
      >
        إدارة بيانات المعلم وربطه بالحلقات
      </div>

    </div>

  </div>

  {
    editingId && (

      <button
        type="button"
        onClick={clearForm}
        style={{
          height:"48px",
          padding:"0 calc(18px * var(--app-density,1))",
          border:"1px solid #E2E8F0",
          background:"#FFFFFF",
          borderRadius:"calc(14px * var(--app-radius-scale,1))",
          color:"#475569",
          cursor:"pointer",
          display:"flex",
          alignItems:"center",
          gap:"calc(8px * var(--app-density,1))",
          fontWeight:"700"
        }}
      >
        <X size={16}/>
        إلغاء التعديل
      </button>

    )
  }

</div>

          {/* BASIC DATA */}

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap:
                "calc(14px * var(--app-density,1))",
            }}
          >
            <FormField
              label="اسم المعلم *"
              value={
                fullName
              }
              onChange={
                setFullName
              }
              placeholder="مثال: محمد أحمد"
              icon={
                <UserRound
                  size={17}
                />
              }
            />

            <FormField
              label="رقم المعلم *"
              value={
                teacherNumber
              }
              onChange={
                setTeacherNumber
              }
              placeholder="مثال: T001"
              icon={
                <ShieldCheck
                  size={17}
                />
              }
            />

            <FormField
              label="رقم الجوال"
              value={
                phone
              }
              onChange={
                setPhone
              }
              placeholder="05xxxxxxxx"
              icon={
                <Phone
                  size={17}
                />
              }
            />

            <SelectField
              label="الجنس"
              value={
                gender
              }
              onChange={
                setGender
              }
              options={[
                {
                  value:
                    "male",
                  label:
                    "ذكر",
                },
                {
                  value:
                    "female",
                  label:
                    "أنثى",
                },
              ]}
            />

            <SelectField
              label="المرحلة التعليمية"
              value={
                educationStage
              }
              onChange={
                setEducationStage
              }
     options={[
  {
    value: "primary",
    label: "ابتدائي",
  },
  {
    value: "middle",
    label: "متوسط",
  },
  {
    value: "secondary",
    label: "ثانوي",
  },
  {
    value: "university",
    label: "جامعي",
  },
  {
    value: "other",
    label: "أخرى",
  },
]}
            />

            <FormField
              label="الصف / المستوى"
              value={
                educationGrade
              }
              onChange={
                setEducationGrade
              }
              placeholder="مثال: المستوى الثالث"
              icon={
                <GraduationCap
                  size={17}
                />
              }
            />
          </div>

          {/* Halaqat */}

          <div
            style={{
              marginTop:
                "20px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  "calc(7px * var(--app-density,1))",
                marginBottom:
                  "9px",
              }}
            >
              <BookOpen
                size={17}
                color="#0f5132"
              />

              <label
                style={
                  labelStyle
                }
              >
                الحلقات المرتبط بها
              </label>
            </div>

            {halaqat.length ===
            0 ? (
              <div
                style={{
                  padding:
                    "calc(15px * var(--app-density,1))",
                  borderRadius:
                    "calc(11px * var(--app-radius-scale,1))",
                  background:
                    "#fafafa",
                  border:
                    "1px dashed #d8ddd9",
                  color:
                    "#888",
                  fontSize:
                    "calc(13px * var(--app-font-scale,1))",
                }}
              >
                لا توجد حلقات مضافة حاليًا.
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill,minmax(220px,1fr))",
                  gap:
                    "calc(9px * var(--app-density,1))",
                }}
              >
                {halaqat.map(
                  (halaqa) => {
                    const selected =
                      selectedHalaqat.includes(
                        String(
                          halaqa.id
                        )
                      );

                    return (
                      <button
                        type="button"
                        key={
                          halaqa.id
                        }
                        onClick={() =>
                          toggleHalaqa(
                            halaqa.id
                          )
                        }
                        style={{
                          textAlign:
                            "right",
                          padding:
                            "calc(12px * var(--app-density,1))",
                          borderRadius:
                            "calc(11px * var(--app-radius-scale,1))",
                          border:
                            selected
                              ? "1px solid var(--app-color-0f5132,#0f5132)"
                              : "1px solid #e0e5e1",
                          background:
                            selected
                              ? "#edf6f0"
                              : "#fff",
                          color:
                            selected
                              ? "var(--app-color-0f5132,#0f5132)"
                              : "#4f5953",
                          cursor:
                            "pointer",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap:
                            "calc(9px * var(--app-density,1))",
                        }}
                      >
                        <div
                          style={{
                            width:
                              "22px",
                            height:
                              "22px",
                            borderRadius:
                              "calc(7px * var(--app-radius-scale,1))",
                            border:
                              selected
                                ? "1px solid var(--app-color-0f5132,#0f5132)"
                                : "1px solid #cfd6d1",
                            background:
                              selected
                                ? "var(--app-color-0f5132,#0f5132)"
                                : "#fff",
                            color:
                              "#fff",
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
                          {selected && (
                            <CheckCircle2
                              size={
                                15
                              }
                            />
                          )}
                        </div>

                        <span
                          style={{
                            fontSize:
                              "calc(13px * var(--app-font-scale,1))",
                            fontWeight:
                              selected
                                ? "750"
                                : "600",
                          }}
                        >
                          {
                            halaqa.name
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            )}

            {selectedHalaqat.length >
              0 && (
              <div
                style={{
                  marginTop:
                    "9px",
                  color:
                    "var(--app-color-0f5132,#0f5132)",
                  fontSize:
                    "calc(12px * var(--app-font-scale,1))",
                  fontWeight:
                    "700",
                }}
              >
                تم اختيار{" "}
                {
                  selectedHalaqat.length
                }{" "}
                حلقة
              </div>
            )}
          </div>

          {/* NOTES */}

          <div
            style={{
              marginTop:
                "18px",
            }}
          >
            <label
              style={
                labelStyle
              }
            >
              ملاحظات
            </label>

            <textarea
              value={
                notes
              }
              onChange={(e) =>
                setNotes(
                  e.target.value
                )
              }
              placeholder="أي ملاحظات إضافية عن المعلم..."
              rows={4}
              style={{
                ...inputStyle,
                resize:
                  "vertical",
                minHeight:
                  "95px",
              }}
            />
          </div>

          <div
            style={{
              display:
                "flex",
              gap:
                "calc(9px * var(--app-density,1))",
              flexWrap:
                "wrap",
              marginTop:
                "18px",
            }}
          >
            <button
              type="button"
              onClick={
                saveTeacher
              }
              disabled={
                loading
              }
              style={{
                ...primaryButton,
                opacity:
                  loading
                    ? 0.7
                    : 1,
              }}
            >
              {loading ? (
                <RefreshCw
                  size={17}
                  className="spin"
                />
              ) : editingId ? (
                <Save
                  size={17}
                />
              ) : (
                <Plus
                  size={18}
                />
              )}

              {loading
                ? "جارٍ الحفظ..."
                : editingId
                ? "حفظ التعديلات"
                : "إضافة المعلم"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={
                  clearForm
                }
                style={
                  secondaryButton
                }
              >
                <X
                  size={16}
                />

                إلغاء
              </button>
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* SEARCH */}
        {/* ================================================= */}

        <section
          style={{
            ...cardStyle,
            padding:
              "calc(15px * var(--app-density,1))",
            marginBottom:
              "20px",
          }}
        >
          <div
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
                placeholder="ابحث باسم المعلم أو رقمه أو جواله أو الحلقة..."
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
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(320px,1fr))",
              gap:
                "calc(17px * var(--app-density,1))",
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
      {/* DELETE MODAL */}
      {/* ================================================= */}

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
    <div
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