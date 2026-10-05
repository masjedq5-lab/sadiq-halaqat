import { OrnamentScene } from '../components/ornaments/Ornament';
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

import {
  HALAQA_PERIODS,
} from "../data/halaqaPeriods";

import { BookOpen, Building2, Users, Plus, Search, Pencil, Trash2, Power, GraduationCap, ArrowRight, X, CheckCircle2, CircleOff, RefreshCw, Loader2, UsersRound, ShieldCheck, AlertTriangle, SlidersHorizontal, Activity, Target, ChevronLeft, Clock3 } from "lucide-react";

export default function Halaqat() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [halaqat, setHalaqat] = useState([]);

  const [mosques, setMosques] = useState([]);

  const [teachers, setTeachers] = useState([]);

const [halaqaPeriod, setHalaqaPeriod] =
  useState("");

  const [
    studentAssignments,
    setStudentAssignments,
  ] = useState([]);

  const [
    teacherAssignments,
    setTeacherAssignments,
  ] = useState([]);

  const [name, setName] = useState("");

  const [capacity, setCapacity] = useState("");

  const [mosqueId, setMosqueId] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [mosqueFilter, setMosqueFilter] =
    useState("all");

  const [editingId, setEditingId] =
    useState(null);

  const [showForm, setShowForm] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [mainTeacherId, setMainTeacherId] =
    useState("");

  const [
    assistantTeacherId,
    setAssistantTeacherId,
  ] = useState("");

  // ==========================================
  // تحميل البيانات عند فتح الصفحة
  // ==========================================

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================
  // تحميل البيانات
  // ==========================================

 async function loadData(options = {}) {
  const silent = options.silent === true;

  if (!silent) {
    setInitialLoading(true);
  }

  const [
    halaqatResult,
    mosquesResult,
    studentAssignmentsResult,
    teacherAssignmentsResult,
    teachersResult,
  ] = await Promise.all([
    supabase
      .from("halaqat")
      .select("*")
      .order("id", {
        ascending: true,
      }),

    supabase
      .from("mosques")
      .select("*")
      .order("id", {
        ascending: true,
      }),

    supabase
      .from("student_halaqat")
      .select("*")
      .eq("is_current", true),

    supabase
      .from("teacher_halaqat")
      .select("*"),

    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "teacher")
      .order("full_name"),
  ]);

  if (halaqatResult.error) {
    console.error("halaqat:", halaqatResult.error);
    setInitialLoading(false);
    return false;
  }

  if (mosquesResult.error) {
    console.error("mosques:", mosquesResult.error);
    setInitialLoading(false);
    return false;
  }

  if (studentAssignmentsResult.error) {
    console.error(
      "student_halaqat:",
      studentAssignmentsResult.error
    );
    setInitialLoading(false);
    return false;
  }

  if (teacherAssignmentsResult.error) {
    console.error(
      "teacher_halaqat:",
      teacherAssignmentsResult.error
    );
    setInitialLoading(false);
    return false;
  }

  if (teachersResult.error) {
    console.error(
      "teachers:",
      teachersResult.error
    );
    setInitialLoading(false);
    return false;
  }

  setHalaqat(
    halaqatResult.data || []
  );

  setMosques(
    mosquesResult.data || []
  );

  setStudentAssignments(
    studentAssignmentsResult.data || []
  );

  setTeacherAssignments(
    teacherAssignmentsResult.data || []
  );

  setTeachers(
    teachersResult.data || []
  );

  setInitialLoading(false);

  return true;
}

function onStudents(halaqaId) {
  navigate(
    `/admin/halaqa-students/${halaqaId}`
  );
}

function onTeachers(halaqaId) {
  navigate(
    `/admin/halaqa-teachers/${halaqaId}`
  );
}

  // ==========================================
  // تحديث يدوي
  // ==========================================

  async function refreshData() {
    if (refreshing) return;

    setRefreshing(true);

    const success = await loadData({
      silent: true,
    });

    if (success) {
      showToast(
        "تم تحديث بيانات الحلقات",
        "success"
      );
    }

    setRefreshing(false);
  }

  // ==========================================
  // حفظ الحلقة
  // ==========================================

  async function saveHalaqa() {
    const cleanName = name.trim();

    if (!cleanName) {
      showToast(
        "أدخل اسم الحلقة أولًا",
        "error"
      );
      return;
    }

    if (!mosqueId) {
      showToast(
        "اختر المسجد أولًا",
        "error"
      );
      return;
    }

    const numericCapacity = Number(capacity);

    if (
      capacity &&
      (!Number.isFinite(numericCapacity) ||
        numericCapacity < 1)
    ) {
      showToast(
        "أدخل سعة صحيحة للحلقة",
        "error"
      );
      return;
    }

    // منع تكرار اسم الحلقة داخل نفس المسجد
    const duplicate = halaqat.some(
      (halaqa) =>
        Number(halaqa.id) !==
          Number(editingId) &&
        Number(halaqa.mosque_id) ===
          Number(mosqueId) &&
        String(halaqa.name || "")
          .trim()
          .toLowerCase() ===
          cleanName.toLowerCase()
    );

    if (duplicate) {
      showToast(
        "توجد حلقة بنفس الاسم في هذا المسجد",
        "error"
      );
      return;
    }

    setLoading(true);

    try {
     const payload = {
  name: name.trim(),

  mosque_id: Number(mosqueId),

  capacity: capacity
    ? Number(capacity)
    : 20,

  main_teacher_id:
    mainTeacherId || null,

  assistant_teacher_id:
    assistantTeacherId || null,

halaqa_period:
  halaqaPeriod || null,

  status: "active",
};

      // ========================================
      // تعديل
      // ========================================

      if (editingId !== null) {
        const { error } = await supabase
          .from("halaqat")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          console.error(
            "update halaqa:",
            error
          );


          showToast(
            `تعذر تعديل الحلقة: ${error.message}`,
            "error"
          );

          return;
        }

        showToast(
          "تم تعديل بيانات الحلقة بنجاح",
          "success"
        );
      }

      // ========================================
      // إضافة
      // ========================================

      else {
        const { error } = await supabase
          .from("halaqat")
          .insert([
            {
              ...payload,
              status: "active",
            },
          ]);

        if (error) {
          console.error(
            "insert halaqa:",
            error
          );

          showToast(
            `تعذر إضافة الحلقة: ${error.message}`,
            "error"
          );

          return;
        }

        showToast(
          "تمت إضافة الحلقة بنجاح",
          "success"
        );
      }

      clearForm();

      await loadData({
        silent: true,
      });
    } catch (error) {
      console.error(
        "saveHalaqa:",
        error
      );

      showToast(
        "حدث خطأ غير متوقع أثناء حفظ الحلقة",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // تعديل الحلقة
  // ==========================================

  function editHalaqa(halaqa) {
    setEditingId(halaqa.id);

    setName(halaqa.name || "");

    setCapacity(
      halaqa.capacity || ""
    );

    setMosqueId(
      halaqa.mosque_id
        ? String(halaqa.mosque_id)
        : ""
    );

setHalaqaPeriod(
  halaqa.halaqa_period || ""
);

    setMainTeacherId(
      halaqa.main_teacher_id ? String(halaqa.main_teacher_id) : ""
    );

    setAssistantTeacherId(
      halaqa.assistant_teacher_id ? String(halaqa.assistant_teacher_id) : ""
    );

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    showToast(
      `جارٍ تعديل ${halaqa.name || "الحلقة"}`,
      "info"
    );
  }

  // ==========================================
  // تنظيف النموذج
  // ==========================================

  function clearForm() {
    setEditingId(null);
    setName("");
    setCapacity("");
    setMosqueId("");
setHalaqaPeriod("");
    setMainTeacherId("");
    setAssistantTeacherId("");
    setShowForm(false);
  }

  // ==========================================
  // تغيير حالة الحلقة
  // ==========================================

  async function toggleStatus(halaqa) {
    const isActive =
      halaqa.status === "active";

    const newStatus = isActive
      ? "inactive"
      : "active";

    const confirmed = window.confirm(
      isActive
        ? `هل تريد تعطيل حلقة "${halaqa.name}"؟`
        : `هل تريد تفعيل حلقة "${halaqa.name}"؟`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("halaqat")
        .update({
          status: newStatus,
        })
        .eq("id", halaqa.id);

      if (error) {
        console.error(
          "toggle status:",
          error
        );

        showToast(
          `تعذر تغيير حالة الحلقة: ${error.message}`,
          "error"
        );

        return;
      }

      showToast(
        isActive
          ? "تم تعطيل الحلقة بنجاح"
          : "تم تفعيل الحلقة بنجاح",
        "success"
      );

      await loadData({
        silent: true,
      });
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // حذف الحلقة
  // ==========================================

  async function deleteHalaqa(halaqa) {
    const studentCount =
      getStudentCount(halaqa.id);

    const teacherCount =
      getTeacherCount(halaqa);

    const relationMessage =
      studentCount > 0 ||
      teacherCount > 0
        ? `\n\nالحلقة مرتبطة حاليًا بـ ${studentCount} طالب و${teacherCount} معلم. يفضل تعطيلها بدل حذفها.`
        : "";

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف حلقة "${halaqa.name}"؟${relationMessage}`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("halaqat")
        .delete()
        .eq("id", halaqa.id);

      if (error) {
        console.error(
          "delete halaqa:",
          error
        );

        showToast(
          `تعذر حذف الحلقة: ${error.message}`,
          "error"
        );

        return;
      }

      if (
        editingId !== null &&
        Number(editingId) ===
          Number(halaqa.id)
      ) {
        clearForm();
      }

      showToast(
        `تم حذف حلقة "${halaqa.name}" بنجاح`,
        "success"
      );

      await loadData({
        silent: true,
      });
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // اسم المسجد
  // ==========================================

  function getMosqueName(mosqueId) {
    return (
      mosques.find(
        (mosque) =>
          Number(mosque.id) ===
          Number(mosqueId)
      )?.name || "غير محدد"
    );
  }

  // ==========================================
  // عدد الطلاب
  // ==========================================

  function getStudentCount(halaqaId) {
  return studentAssignments.filter(
    (item) =>
      Number(item.halaqa_id) === Number(halaqaId) &&
      item.is_current === true
  ).length;
}

  // ==========================================
  // عدد المعلمين
  // ==========================================

function getTeacherCount(halaqa) {
  let count = 0;

  if (halaqa.main_teacher_id) {
    count++;
  }

  if (halaqa.assistant_teacher_id) {
    count++;
  }

  return count;
}

  // ==========================================
  // الفلترة
  // ==========================================

  const filteredHalaqat = useMemo(() => {
    const text =
      search.trim().toLowerCase();

    return halaqat.filter((halaqa) => {
      const mosqueName =
        getMosqueName(
          halaqa.mosque_id
        );

      const halaqaName = String(
        halaqa.name || ""
      ).toLowerCase();

      const mosqueText = String(
        mosqueName || ""
      ).toLowerCase();

      const matchesSearch =
        !text ||
        halaqaName.includes(text) ||
        mosqueText.includes(text) ||
        String(halaqa.id).includes(text);

      const matchesStatus =
        statusFilter === "all" ||
        halaqa.status === statusFilter;

      const matchesMosque =
        mosqueFilter === "all" ||
        Number(halaqa.mosque_id) ===
          Number(mosqueFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMosque
      );
    });
  }, [
    halaqat,
    search,
    statusFilter,
    mosqueFilter,
    mosques,
  ]);

  // ==========================================
  // الإحصائيات
  // ==========================================

  const activeCount =
    halaqat.filter(
      (halaqa) =>
        halaqa.status === "active"
    ).length;

  const inactiveCount =
    halaqat.length - activeCount;

  const totalStudents =
    studentAssignments.length;

  const totalTeachers =
  halaqat.reduce((total, halaqa) => {
    let count = 0;

    if (halaqa.main_teacher_id) count++;
    if (halaqa.assistant_teacher_id) count++;

    return total + count;
  }, 0);

  const totalCapacity =
    halaqat.reduce(
      (total, halaqa) =>
        total +
        Number(halaqa.capacity || 0),
      0
    );

  const occupancyRate =
    totalCapacity > 0
      ? Math.round((totalStudents / totalCapacity) * 100)
      : 0;

  const halaqatWithoutTeacher = halaqat.filter(
    (halaqa) => !halaqa.main_teacher_id
  ).length;

  const nearlyFullHalaqat = halaqat.filter((halaqa) => {
    const cap = Number(halaqa.capacity || 0);
    const count = getStudentCount(halaqa.id);
    return cap > 0 && count / cap >= 0.85;
  }).length;

  const hasActiveFilters =
    Boolean(search) || statusFilter !== "all" || mosqueFilter !== "all";

  function openCreateModal() {
    setEditingId(null);
    setName("");
    setCapacity("");
    setMosqueId("");
    setHalaqaPeriod("");
    setMainTeacherId("");
    setAssistantTeacherId("");
    setShowForm(true);
  }

  return (
    <div className="hq-page" dir="rtl">
      <main className="hq-shell">
        <section className="hq-hero">
          <OrnamentScene primary="02-shams" pattern />
          <div className="hq-hero-main">
            <div>
              <div className="hq-kicker">
                <ShieldCheck size={15} />
                بوابة المشرف · مركز إدارة الحلقات
              </div>

              <div className="hq-title-line">
                <button
                  type="button"
                  className="hq-back"
                  onClick={() => navigate("/admin")}
                  aria-label="العودة"
                >
                  <ArrowRight size={20} />
                </button>

                <div className="hq-title-icon">
                  <BookOpen size={26} />
                </div>

                <div>
                  <h1>إدارة الحلقات</h1>
                  <p>
                    لوحة تشغيل موحدة لمتابعة الحلقات والسعة والطلاب والتكليف التعليمي.
                  </p>
                </div>
              </div>
            </div>

            <div className="hq-hero-actions">
              <button
                type="button"
                className="hq-refresh"
                onClick={refreshData}
                disabled={refreshing || loading}
              >
                {refreshing ? (
                  <Loader2 size={17} className="spin" />
                ) : (
                  <RefreshCw size={17} />
                )}
                تحديث
              </button>

              <button type="button" className="hq-create" onClick={openCreateModal}>
                <span className="hq-create-icon"><Plus size={19} /></span>
                <span>
                  <strong>إنشاء حلقة</strong>
                  <small>إضافة ملف حلقة جديد</small>
                </span>
              </button>
            </div>
          </div>

          <div className="hq-hero-strip">
            <div>
              <span>تغطية السعة</span>
              <strong>{occupancyRate}%</strong>
              <small>{totalStudents} طالب من {totalCapacity || 0} مقعد</small>
            </div>
            <div>
              <span>تحتاج معلمًا رئيسيًا</span>
              <strong>{halaqatWithoutTeacher}</strong>
              <small>حلقة تحتاج استكمال التكليف</small>
            </div>
            <div>
              <span>قريبة من الامتلاء</span>
              <strong>{nearlyFullHalaqat}</strong>
              <small>إشغال 85٪ فأكثر</small>
            </div>
          </div>
        </section>

        <section className="hq-stats">
          <StatCard icon={<BookOpen size={18} />} title="إجمالي الحلقات" value={halaqat.length} note={`${activeCount} نشطة`} />
          <StatCard icon={<CheckCircle2 size={18} />} title="الحلقات النشطة" value={activeCount} note={`${inactiveCount} غير نشطة`} />
          <StatCard icon={<Users size={18} />} title="إجمالي الطلاب" value={totalStudents} note="مرتبطون بالحلقات" />
          <StatCard icon={<GraduationCap size={18} />} title="تكليفات المعلمين" value={totalTeachers} note="رئيسي ومساعد" />
          <StatCard icon={<Target size={18} />} title="السعة الإجمالية" value={totalCapacity} note={`${occupancyRate}% إشغال`} />
        </section>

        <section className="hq-command">
          <div className="hq-command-head">
            <div>
              <span className="hq-command-kicker"><Activity size={14} /> مركز المتابعة الذكي</span>
              <h2>حالات تحتاج انتباه المشرف</h2>
              <p>مؤشرات تشغيلية محسوبة من البيانات الموجودة حاليًا دون استعلامات إضافية.</p>
            </div>
            <div className="hq-score">
              <span>نسبة الحلقات النشطة</span>
              <strong>
                {halaqat.length ? Math.round((activeCount / halaqat.length) * 100) : 0}%
              </strong>
            </div>
          </div>

          <div className="hq-insights">
            <Insight icon={<AlertTriangle size={16} />} label="بلا معلم رئيسي" value={halaqatWithoutTeacher} hint="تحتاج تكليفًا" />
            <Insight icon={<UsersRound size={16} />} label="قريبة من الامتلاء" value={nearlyFullHalaqat} hint="85٪ فأكثر" />
            <Insight icon={<CircleOff size={16} />} label="غير النشطة" value={inactiveCount} hint="موقوفة حاليًا" />
          </div>
        </section>

        <section className="hq-filter-box">
          <div className="hq-filter-head">
            <div><SlidersHorizontal size={17} /> البحث والتصفية</div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setMosqueFilter("all");
                }}
              >
                إعادة الضبط
              </button>
            )}
          </div>

          <div className="hq-filters">
            <div className="hq-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم الحلقة أو المسجد أو الرقم..."
              />
              {search && (
                <button type="button" onClick={() => setSearch("")}>
                  <X size={14} />
                </button>
              )}
            </div>

            <select value={mosqueFilter} onChange={(event) => setMosqueFilter(event.target.value)}>
              <option value="all">جميع المساجد</option>
              {mosques.map((mosque) => (
                <option key={mosque.id} value={mosque.id}>{mosque.name}</option>
              ))}
            </select>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">جميع الحالات</option>
              <option value="active">النشطة</option>
              <option value="inactive">غير النشطة</option>
            </select>
          </div>
        </section>

        <div className="hq-list-head">
          <div>
            <span>دليل الحلقات</span>
            <h2>الحلقات المسجلة</h2>
            <p>عرض {filteredHalaqat.length} من {halaqat.length} حلقة</p>
          </div>
          <div className="hq-count"><BookOpen size={15} /> {filteredHalaqat.length}</div>
        </div>

        {initialLoading ? (
          <LoadingState />
        ) : filteredHalaqat.length === 0 ? (
          <EmptyState
            search={search}
            onClear={() => {
              setSearch("");
              setStatusFilter("all");
              setMosqueFilter("all");
            }}
          />
        ) : (
          <div className="hq-grid">
            {filteredHalaqat.map((halaqa) => (
              <HalaqaCard
                key={halaqa.id}
                halaqa={halaqa}
                mosqueName={getMosqueName(halaqa.mosque_id)}
                studentCount={getStudentCount(halaqa.id)}
                teacherCount={getTeacherCount(halaqa)}
                onEdit={editHalaqa}
                onToggleStatus={toggleStatus}
                onDelete={deleteHalaqa}
                onStudents={onStudents}
                onTeachers={onTeachers}
                loading={loading}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div
          className="hq-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loading) clearForm();
          }}
        >
          <section className="hq-modal" role="dialog" aria-modal="true">
            <div className="hq-modal-hero">
              <button
                type="button"
                className="hq-modal-close"
                onClick={clearForm}
                disabled={loading}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>

              <div className="hq-modal-title">
                <div className="hq-modal-icon">
                  {editingId !== null ? <Pencil size={21} /> : <BookOpen size={22} />}
                </div>
                <div>
                  <span>ملف الحلقة · إدارة تشغيلية</span>
                  <h2>{editingId !== null ? "تعديل بيانات الحلقة" : "إنشاء حلقة جديدة"}</h2>
                  <p>
                    {editingId !== null
                      ? "حدّث بيانات الحلقة والتكليف التعليمي من نافذة واحدة."
                      : "أنشئ الحلقة وحدد المسجد والموعد والسعة والتكليف التعليمي."}
                  </p>
                </div>
              </div>

              <div className="hq-steps">
                <span className="active">01 البيانات الأساسية</span>
                <span>02 التشغيل والسعة</span>
                <span>03 التكليف التعليمي</span>
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveHalaqa();
              }}
            >
              <div className="hq-modal-body">
                <FormSection
                  icon={<BookOpen size={17} />}
                  title="البيانات الأساسية"
                  subtitle="هوية الحلقة والمسجد التابعة له"
                >
                  <div className="hq-form-grid">
                    <Field label="اسم الحلقة" required>
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="مثال: حلقة أبي بن كعب رضي الله عنه"
                        disabled={loading}
                      />
                    </Field>
                    <Field label="المسجد" required>
                      <select value={mosqueId} onChange={(event) => setMosqueId(event.target.value)} disabled={loading}>
                        <option value="">اختر المسجد</option>
                        {mosques.map((mosque) => (
                          <option key={mosque.id} value={mosque.id}>{mosque.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  icon={<Clock3 size={17} />}
                  title="التشغيل والسعة"
                  subtitle="موعد الحلقة والطاقة الاستيعابية"
                  gold
                >
                  <div className="hq-form-grid">
                    <Field label="موعد الحلقة">
                      <select value={halaqaPeriod} onChange={(event) => setHalaqaPeriod(event.target.value)} disabled={loading}>
                        <option value="">اختر موعد الحلقة</option>
                        {HALAQA_PERIODS.map((period) => (
                          <option key={period.value} value={period.value}>{period.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="سعة الحلقة">
                      <input
                        type="number"
                        min="1"
                        value={capacity}
                        onChange={(event) => setCapacity(event.target.value)}
                        placeholder="20"
                        disabled={loading}
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  icon={<GraduationCap size={17} />}
                  title="التكليف التعليمي"
                  subtitle="اختيار المعلم الرئيسي والمساعد"
                >
                  <div className="hq-form-grid">
                    <Field label="المعلم الرئيسي">
                      <select value={mainTeacherId} onChange={(event) => setMainTeacherId(event.target.value)} disabled={loading}>
                        <option value="">غير محدد</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="المعلم المساعد">
                      <select value={assistantTeacherId} onChange={(event) => setAssistantTeacherId(event.target.value)} disabled={loading}>
                        <option value="">غير محدد</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </FormSection>
              </div>

              <div className="hq-modal-footer">
                <div className="hq-modal-actions">
                  <button type="button" className="hq-cancel" onClick={clearForm} disabled={loading}>إلغاء</button>
                  <button type="submit" className="hq-save" disabled={loading}>
                    {loading ? <Loader2 size={16} className="spin" /> : editingId !== null ? <CheckCircle2 size={16} /> : <Plus size={17} />}
                    {loading ? "جارٍ الحفظ..." : editingId !== null ? "حفظ التعديلات" : "إنشاء الحلقة"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box}
        .hq-page{min-height:100vh;width:100%;overflow-x:hidden;background:radial-gradient(circle at 8% 5%,rgba(190,151,49,.07),transparent 25%),radial-gradient(circle at 93% 14%,rgba(10,104,78,.07),transparent 27%),#f5f7f4;color:#173b31;padding:calc(22px * var(--app-density,1)) clamp(calc(14px * var(--app-density,1)),2vw,calc(32px * var(--app-density,1))) calc(42px * var(--app-density,1));font-family:inherit}
        .hq-shell{width:100%;max-width:1680px;margin:0 auto}
        .hq-hero{position:relative;overflow:hidden;border-radius:calc(26px * var(--app-radius-scale,1));background:linear-gradient(135deg,#073d33,#0a5b49 58%,#09483c);color:#fff;border:1px solid rgba(204,168,68,.38);box-shadow:0 18px 45px rgba(7,62,52,.13);margin-bottom:14px}
        .hq-pattern{position:absolute;inset:0;opacity:.13;pointer-events:none;background-image: url("/ornaments/sadiq/emerald/05-wasl.svg");background-size:62px 62px;mask-image:linear-gradient(to left,#000,transparent 72%)}
        .hq-hero-main{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:calc(22px * var(--app-density,1));padding:calc(24px * var(--app-density,1)) calc(26px * var(--app-density,1)) calc(20px * var(--app-density,1))}
        .hq-kicker,.hq-command-kicker{display:inline-flex;align-items:center;gap:calc(6px * var(--app-density,1));color:#e6c768;font-size:calc(10px * var(--app-font-scale,1));font-weight:900;margin-bottom:10px}
        .hq-title-line{display:flex;align-items:center;gap:calc(11px * var(--app-density,1))}
        .hq-title-line h1{margin:0;font-size:clamp(calc(23px * var(--app-font-scale,1)),2vw,calc(33px * var(--app-font-scale,1)));font-weight:950;line-height:1.1}
        .hq-title-line p{margin:6px 0 0;color:rgba(255,255,255,.7);font-size:calc(11px * var(--app-font-scale,1))}
        .hq-back,.hq-title-icon{width:43px;height:43px;flex:0 0 43px;border-radius:calc(13px * var(--app-radius-scale,1));display:grid;place-items:center;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff}
        .hq-back{cursor:pointer}.hq-title-icon{color:#f0d477}
        .hq-hero-actions{display:flex;gap:calc(8px * var(--app-density,1));align-items:stretch}
        .hq-refresh,.hq-create{font-family:inherit;cursor:pointer}
        .hq-refresh{min-height:50px;padding:0 calc(14px * var(--app-density,1));border-radius:calc(14px * var(--app-radius-scale,1));border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.09);color:#fff;display:flex;align-items:center;gap:calc(7px * var(--app-density,1));font-weight:800}
        .hq-create{min-width:184px;border:0;border-radius:calc(15px * var(--app-radius-scale,1));background:#fff;color:#0a4e40;padding:calc(7px * var(--app-density,1)) calc(10px * var(--app-density,1));display:flex;align-items:center;gap:calc(9px * var(--app-density,1));box-shadow:0 10px 24px rgba(0,0,0,.12)}
        .hq-create-icon{width:37px;height:37px;border-radius:calc(11px * var(--app-radius-scale,1));display:grid;place-items:center;background:linear-gradient(145deg,#b88918,#d0aa43);color:#fff}
        .hq-create>span:last-child{display:flex;flex-direction:column;align-items:flex-start}.hq-create strong{font-size:calc(12px * var(--app-font-scale,1))}.hq-create small{font-size:calc(8px * var(--app-font-scale,1));color:#829088;margin-top:2px}
        .hq-hero-strip{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);background:rgba(0,0,0,.08);border-top:1px solid rgba(255,255,255,.1)}
        .hq-hero-strip>div{padding:calc(11px * var(--app-density,1)) calc(18px * var(--app-density,1));border-inline-start:1px solid rgba(255,255,255,.1)}.hq-hero-strip>div:first-child{border-inline-start:0}
        .hq-hero-strip span,.hq-hero-strip small{display:block;color:rgba(255,255,255,.62);font-size:calc(8px * var(--app-font-scale,1))}.hq-hero-strip strong{display:block;color:#f2d675;font-size:calc(18px * var(--app-font-scale,1));margin:2px 0}
        .hq-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:calc(9px * var(--app-density,1));margin-bottom:14px}
        .hq-stat{min-width:0;min-height:84px;background:rgba(255,255,255,.94);border:1px solid #dfe7e2;border-radius:calc(17px * var(--app-radius-scale,1));padding:calc(12px * var(--app-density,1)) calc(13px * var(--app-density,1));box-shadow:0 6px 20px rgba(18,55,44,.04);position:relative;overflow:hidden}
        .hq-stat:before{content:"";position:absolute;top:0;right:0;left:0;height:2px;background:linear-gradient(90deg,#0b765b,#c69b2d)}
        .hq-stat-top{display:flex;align-items:center;justify-content:space-between;gap:calc(7px * var(--app-density,1))}.hq-stat-icon{width:31px;height:31px;border-radius:calc(10px * var(--app-radius-scale,1));display:grid;place-items:center;color:#0b6b54;background:#edf7f2}
        .hq-stat span{color:#7d8a84;font-size:calc(9px * var(--app-font-scale,1));font-weight:800}.hq-stat strong{display:block;margin-top:5px;color:#0d513f;font-size:calc(21px * var(--app-font-scale,1));line-height:1}.hq-stat small{display:block;margin-top:4px;color:#99a39e;font-size:calc(7px * var(--app-font-scale,1))}
        .hq-command{border-radius:calc(21px * var(--app-radius-scale,1));padding:calc(17px * var(--app-density,1)) calc(19px * var(--app-density,1));margin-bottom:14px;background:linear-gradient(135deg,#0b5948,#094b3f);color:#fff;border:1px solid rgba(201,164,62,.25);box-shadow:0 11px 27px rgba(7,72,59,.09)}
        .hq-command-head{display:flex;align-items:center;justify-content:space-between;gap:calc(16px * var(--app-density,1))}.hq-command h2{margin:3px 0;font-size:calc(17px * var(--app-font-scale,1))}.hq-command p{margin:0;color:rgba(255,255,255,.6);font-size:calc(9px * var(--app-font-scale,1))}
        .hq-score{min-width:105px;text-align:center;padding:calc(8px * var(--app-density,1)) calc(12px * var(--app-density,1));border-radius:calc(13px * var(--app-radius-scale,1));background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1)}.hq-score span{display:block;font-size:calc(8px * var(--app-font-scale,1));color:rgba(255,255,255,.62)}.hq-score strong{display:block;margin-top:2px;color:#f0d16c;font-size:calc(20px * var(--app-font-scale,1))}
        .hq-insights{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(7px * var(--app-density,1));margin-top:12px}.hq-insight{display:flex;align-items:center;gap:calc(9px * var(--app-density,1));padding:calc(9px * var(--app-density,1)) calc(10px * var(--app-density,1));border-radius:calc(12px * var(--app-radius-scale,1));background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.085)}
        .hq-insight-icon{width:29px;height:29px;border-radius:calc(9px * var(--app-radius-scale,1));display:grid;place-items:center;background:rgba(255,255,255,.08);color:#e9cf77}.hq-insight-copy{flex:1;min-width:0}.hq-insight-copy span{display:block;color:rgba(255,255,255,.7);font-size:calc(8px * var(--app-font-scale,1))}.hq-insight-copy small{display:block;margin-top:2px;color:rgba(255,255,255,.45);font-size:calc(7px * var(--app-font-scale,1))}.hq-insight strong{font-size:calc(17px * var(--app-font-scale,1))}
        .hq-filter-box{background:#fff;border:1px solid #dfe7e2;border-radius:calc(18px * var(--app-radius-scale,1));padding:calc(11px * var(--app-density,1));margin-bottom:18px;box-shadow:0 6px 19px rgba(18,55,44,.035)}
        .hq-filter-head{display:flex;align-items:center;justify-content:space-between;padding:0 calc(3px * var(--app-density,1)) calc(8px * var(--app-density,1))}.hq-filter-head>div{display:flex;align-items:center;gap:calc(6px * var(--app-density,1));font-size:calc(10px * var(--app-font-scale,1));font-weight:900}.hq-filter-head button{border:0;background:transparent;color:#987319;font:800 8px inherit;cursor:pointer}
        .hq-filters{display:grid;grid-template-columns:minmax(250px,1fr) 210px 175px;gap:calc(8px * var(--app-density,1))}.hq-search{position:relative}.hq-search>svg{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#8c9892}.hq-search button{position:absolute;left:8px;top:50%;transform:translateY(-50%);width:26px;height:26px;border:0;border-radius:calc(8px * var(--app-radius-scale,1));background:#f1f5f2;color:#65736c;display:grid;place-items:center;cursor:pointer}
        .hq-filters input,.hq-filters select,.hq-modal input,.hq-modal select{width:100%;height:42px;border:1px solid #d8e2dc;border-radius:calc(11px * var(--app-radius-scale,1));background:#fff;color:#263d35;outline:none;font:700 10px inherit;padding:0 calc(11px * var(--app-density,1))}.hq-search input{padding-right:calc(39px * var(--app-density,1));padding-left:calc(38px * var(--app-density,1))}
        .hq-filters input:focus,.hq-filters select:focus,.hq-modal input:focus,.hq-modal select:focus{border-color:#4f9b83;box-shadow:0 0 0 3px rgba(15,111,85,.08)}
        .hq-list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:calc(10px * var(--app-density,1));margin:0 2px 11px}.hq-list-head span{color:#9a761b;font-size:calc(9px * var(--app-font-scale,1));font-weight:900}.hq-list-head h2{margin:2px 0 0;font-size:calc(18px * var(--app-font-scale,1))}.hq-list-head p{margin:3px 0 0;color:#8b9690;font-size:calc(9px * var(--app-font-scale,1))}.hq-count{min-width:45px;height:35px;padding:0 calc(10px * var(--app-density,1));border-radius:calc(11px * var(--app-radius-scale,1));display:flex;align-items:center;justify-content:center;gap:calc(5px * var(--app-density,1));background:#eaf5ef;color:#0d654e;font-size:calc(11px * var(--app-font-scale,1));font-weight:900}
        .hq-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:calc(12px * var(--app-density,1))}
        .hq-card{min-width:0;background:#fff;border:1px solid #dde6e0;border-radius:calc(19px * var(--app-radius-scale,1));padding:calc(14px * var(--app-density,1));box-shadow:0 7px 21px rgba(15,60,46,.04);transition:.2s ease}.hq-card:hover{transform:translateY(-3px);border-color:#c6d9cf;box-shadow:0 15px 32px rgba(15,60,46,.08)}
        .hq-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:calc(9px * var(--app-density,1))}.hq-card-id{display:flex;align-items:center;gap:calc(9px * var(--app-density,1));min-width:0}.hq-card-icon{width:40px;height:40px;flex:0 0 40px;border-radius:calc(12px * var(--app-radius-scale,1));display:grid;place-items:center;color:var(--app-color-0b654f,#0b654f);background:linear-gradient(145deg,#edf7f2,#e2f0e8)}
        .hq-card h3{margin:0;color:#123f31;font-size:calc(13px * var(--app-font-scale,1));font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hq-mosque{margin-top:3px;display:flex;align-items:center;gap:calc(4px * var(--app-density,1));color:#87938d;font-size:calc(8px * var(--app-font-scale,1))}
        .hq-status{display:inline-flex;align-items:center;gap:calc(4px * var(--app-density,1));flex:0 0 auto;padding:calc(4px * var(--app-density,1)) calc(7px * var(--app-density,1));border-radius:999px;font-size:calc(7px * var(--app-font-scale,1));font-weight:900}.hq-status.active{color:#0a684e;background:#e9f7ef}.hq-status.inactive{color:#7d8581;background:#f0f2f1}
        .hq-card-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(5px * var(--app-density,1));margin:10px 0}.hq-metric{padding:calc(7px * var(--app-density,1));border-radius:calc(10px * var(--app-radius-scale,1));background:#f8faf8;border:1px solid #edf1ee}.hq-metric span{display:block;color:#8c9892;font-size:calc(7px * var(--app-font-scale,1))}.hq-metric strong{display:block;margin-top:2px;color:#174839;font-size:calc(13px * var(--app-font-scale,1))}
        .hq-occupancy{padding:calc(9px * var(--app-density,1));border-radius:calc(11px * var(--app-radius-scale,1));background:#fbfcfa;border:1px solid #edf1ee}.hq-occ-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:calc(8px * var(--app-font-scale,1));color:#7f8b85}.hq-occ-head strong{color:#214a3d;font-size:calc(9px * var(--app-font-scale,1))}.hq-progress{height:5px;border-radius:calc(99px * var(--app-radius-scale,1));background:#e7ece9;overflow:hidden}.hq-progress>div{height:100%;border-radius:calc(99px * var(--app-radius-scale,1))}
        .hq-card-alert{display:flex;align-items:center;gap:calc(5px * var(--app-density,1));margin-top:8px;padding:calc(6px * var(--app-density,1)) calc(8px * var(--app-density,1));border-radius:calc(9px * var(--app-radius-scale,1));color:#8b6510;background:#fff9e9;border:1px solid #f2dfaa;font-size:calc(7px * var(--app-font-scale,1));font-weight:800}
        .hq-quick{display:grid;grid-template-columns:1fr 1fr;gap:calc(5px * var(--app-density,1));margin-top:9px}.hq-quick button{min-height:33px;border:1px solid #dfe8e3;border-radius:calc(10px * var(--app-radius-scale,1));background:#f7fbf8;color:#175744;font:800 8px inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:calc(4px * var(--app-density,1))}
        .hq-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(5px * var(--app-density,1));margin-top:9px;padding-top:calc(9px * var(--app-density,1));border-top:1px solid #edf1ee}.hq-actions button{min-height:31px;border-radius:calc(9px * var(--app-radius-scale,1));border:1px solid #e0e7e3;background:#fff;color:#4b5e56;font:800 7px inherit;display:flex;align-items:center;justify-content:center;gap:calc(3px * var(--app-density,1));cursor:pointer}.hq-actions .edit{color:#0a6a50;background:#eff8f3;border-color:#d9eee4}.hq-actions .danger{color:#ad392d;background:#fff2ef;border-color:#f7ded8}
        .hq-modal-backdrop{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:calc(104px * var(--app-density,1)) calc(24px * var(--app-density,1)) calc(24px * var(--app-density,1));background:rgba(4,30,25,.67);backdrop-filter:blur(9px);overflow:hidden}
        .hq-modal{width:min(660px,calc(100vw - 90px));max-height:calc(100dvh - 142px);overflow-y:auto;overflow-x:hidden;background:#fbfcfa;border:1px solid rgba(204,169,70,.55);border-radius:calc(23px * var(--app-radius-scale,1));box-shadow:0 35px 100px rgba(0,30,24,.38)}
        .hq-modal-hero{position:relative;overflow:hidden;padding:calc(18px * var(--app-density,1)) calc(19px * var(--app-density,1)) calc(15px * var(--app-density,1));background:linear-gradient(135deg,#073f34,#0a5a48);color:#fff}.hq-modal-close{position:absolute;top:12px;left:12px;width:32px;height:32px;display:grid;place-items:center;border-radius:calc(9px * var(--app-radius-scale,1));border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
        .hq-modal-title{display:flex;align-items:center;gap:calc(10px * var(--app-density,1));padding-left:calc(42px * var(--app-density,1))}.hq-modal-icon{width:41px;height:41px;flex:0 0 41px;display:grid;place-items:center;border-radius:calc(12px * var(--app-radius-scale,1));background:rgba(255,255,255,.1);border:1px solid rgba(224,192,92,.45);color:#f1d475}.hq-modal-title span{color:#e5c663;font-size:calc(8px * var(--app-font-scale,1));font-weight:900}.hq-modal-title h2{margin:2px 0;font-size:calc(18px * var(--app-font-scale,1))}.hq-modal-title p{margin:0;color:rgba(255,255,255,.64);font-size:calc(8px * var(--app-font-scale,1))}
        .hq-steps{display:flex;gap:calc(5px * var(--app-density,1));margin-top:12px;padding-right:calc(50px * var(--app-density,1))}.hq-steps span{padding:calc(4px * var(--app-density,1)) calc(8px * var(--app-density,1));border-radius:999px;border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.62);font-size:calc(7px * var(--app-font-scale,1));font-weight:800}.hq-steps .active{color:#f4d97a;border-color:rgba(225,192,84,.45);background:rgba(218,181,64,.08)}
        .hq-modal-body{padding:calc(15px * var(--app-density,1)) calc(18px * var(--app-density,1))}.hq-form-section+.hq-form-section{margin-top:15px;padding-top:calc(14px * var(--app-density,1));border-top:1px solid #e8eeea}.hq-section-title{display:flex;align-items:center;gap:calc(7px * var(--app-density,1));margin-bottom:9px}.hq-section-icon{width:30px;height:30px;border-radius:calc(9px * var(--app-radius-scale,1));display:grid;place-items:center;color:#0b6b54;background:#eaf6f0}.hq-form-section.gold .hq-section-icon{color:#997316;background:#fbf3d9}.hq-section-title h3{margin:0;color:#173f32;font-size:calc(11px * var(--app-font-scale,1))}.hq-section-title p{margin:1px 0 0;color:#94a09a;font-size:calc(7px * var(--app-font-scale,1))}.hq-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:calc(9px * var(--app-density,1))}.hq-field label{display:flex;align-items:center;gap:calc(2px * var(--app-density,1));margin-bottom:4px;color:#445a51;font-size:calc(8px * var(--app-font-scale,1));font-weight:900}.hq-field label b{color:#b38a22}
        .hq-modal-footer{position:sticky;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:calc(10px * var(--app-density,1));padding:calc(9px * var(--app-density,1)) calc(18px * var(--app-density,1));background:rgba(255,255,255,.97);border-top:1px solid #e4ebe7;backdrop-filter:blur(8px)}.hq-save-note{display:flex;align-items:center;gap:calc(4px * var(--app-density,1));color:#7c8983;font-size:calc(7px * var(--app-font-scale,1))}.hq-save-note svg{color:#ad8520}.hq-modal-actions{display:flex;gap:calc(6px * var(--app-density,1))}.hq-cancel,.hq-save{min-height:36px;padding:0 calc(14px * var(--app-density,1));border-radius:calc(10px * var(--app-radius-scale,1));font:900 9px inherit;cursor:pointer}.hq-cancel{border:1px solid #dce4df;background:#fff;color:#5e6d66}.hq-save{border:0;background:linear-gradient(135deg,#087158,#075846);color:#fff;display:flex;align-items:center;gap:calc(5px * var(--app-density,1));box-shadow:0 8px 18px rgba(8,113,88,.18)}
        .spin{animation:hqSpin .8s linear infinite}@keyframes hqSpin{to{transform:rotate(360deg)}}

        @media(max-width:1180px){.hq-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.hq-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:820px){
          .hq-page{padding:calc(14px * var(--app-density,1)) calc(11px * var(--app-density,1)) calc(30px * var(--app-density,1))}.hq-hero-main{align-items:flex-start;flex-direction:column;padding:calc(19px * var(--app-density,1))}.hq-hero-actions{width:100%}.hq-create{flex:1}.hq-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.hq-filters{grid-template-columns:1fr 1fr}.hq-search{grid-column:1/-1}.hq-grid{grid-template-columns:1fr}.hq-modal-backdrop{padding:calc(86px * var(--app-density,1)) calc(17px * var(--app-density,1)) calc(17px * var(--app-density,1))}.hq-modal{width:min(620px,calc(100vw - 34px));max-height:calc(100dvh - 110px)}
        }
        @media(max-width:520px){
          .hq-page{padding:calc(9px * var(--app-density,1)) calc(7px * var(--app-density,1)) calc(22px * var(--app-density,1))}.hq-hero{border-radius:calc(19px * var(--app-radius-scale,1))}.hq-hero-main{padding:calc(15px * var(--app-density,1)) calc(13px * var(--app-density,1)) calc(13px * var(--app-density,1));gap:calc(13px * var(--app-density,1))}.hq-kicker{font-size:calc(8px * var(--app-font-scale,1))}.hq-title-line{gap:calc(7px * var(--app-density,1))}.hq-back,.hq-title-icon{width:35px;height:35px;flex-basis:35px;border-radius:calc(10px * var(--app-radius-scale,1))}.hq-title-line h1{font-size:calc(20px * var(--app-font-scale,1))}.hq-title-line p{font-size:calc(8px * var(--app-font-scale,1));line-height:1.6}.hq-hero-actions{display:grid;grid-template-columns:78px 1fr}.hq-refresh{justify-content:center;padding:0 calc(6px * var(--app-density,1));min-height:44px;font-size:calc(9px * var(--app-font-scale,1))}.hq-create{min-width:0;min-height:44px;padding:calc(5px * var(--app-density,1)) calc(7px * var(--app-density,1))}.hq-create-icon{width:32px;height:32px}.hq-create strong{font-size:calc(10px * var(--app-font-scale,1))}.hq-create small{font-size:calc(6px * var(--app-font-scale,1))}
          .hq-hero-strip>div{padding:calc(8px * var(--app-density,1)) calc(5px * var(--app-density,1))}.hq-hero-strip span{font-size:calc(6px * var(--app-font-scale,1))}.hq-hero-strip strong{font-size:calc(14px * var(--app-font-scale,1))}.hq-hero-strip small{display:none}
          .hq-stats{gap:calc(5px * var(--app-density,1));margin-bottom:9px}.hq-stat{min-height:66px;padding:calc(8px * var(--app-density,1)) calc(9px * var(--app-density,1));border-radius:calc(12px * var(--app-radius-scale,1))}.hq-stat-icon{width:26px;height:26px;border-radius:calc(8px * var(--app-radius-scale,1))}.hq-stat span{font-size:calc(7px * var(--app-font-scale,1))}.hq-stat strong{margin-top:3px;font-size:calc(16px * var(--app-font-scale,1))}.hq-stat small{font-size:calc(6px * var(--app-font-scale,1));margin-top:2px}
          .hq-command{padding:calc(12px * var(--app-density,1));border-radius:calc(16px * var(--app-radius-scale,1))}.hq-command-head{gap:calc(7px * var(--app-density,1))}.hq-command h2{font-size:calc(13px * var(--app-font-scale,1))}.hq-command p{font-size:calc(7px * var(--app-font-scale,1));line-height:1.5}.hq-score{min-width:70px;padding:calc(6px * var(--app-density,1))}.hq-score span{font-size:calc(6px * var(--app-font-scale,1))}.hq-score strong{font-size:calc(15px * var(--app-font-scale,1))}.hq-insights{gap:calc(4px * var(--app-density,1))}.hq-insight{padding:calc(6px * var(--app-density,1));gap:calc(4px * var(--app-density,1))}.hq-insight-icon{width:23px;height:23px;border-radius:calc(7px * var(--app-radius-scale,1))}.hq-insight-copy span{font-size:calc(6px * var(--app-font-scale,1))}.hq-insight-copy small{display:none}.hq-insight strong{font-size:calc(12px * var(--app-font-scale,1))}
          .hq-filter-box{padding:calc(8px * var(--app-density,1));border-radius:calc(14px * var(--app-radius-scale,1))}.hq-filters{grid-template-columns:1fr;gap:calc(6px * var(--app-density,1))}.hq-search{grid-column:auto}.hq-filters input,.hq-filters select{height:38px;font-size:calc(9px * var(--app-font-scale,1))}
          .hq-card{padding:calc(11px * var(--app-density,1));border-radius:calc(15px * var(--app-radius-scale,1))}.hq-card-icon{width:35px;height:35px;flex-basis:35px}.hq-card h3{font-size:calc(11px * var(--app-font-scale,1))}.hq-card-metrics{gap:calc(4px * var(--app-density,1))}.hq-metric{padding:calc(6px * var(--app-density,1))}.hq-quick button{min-height:31px}.hq-actions button{min-height:30px}
          .hq-modal-backdrop{align-items:center;justify-content:center;padding:calc(78px * var(--app-density,1)) max(calc(11px * var(--app-density,1)),env(safe-area-inset-right)) max(calc(11px * var(--app-density,1)),env(safe-area-inset-bottom)) max(calc(11px * var(--app-density,1)),env(safe-area-inset-left))}
          .hq-modal{width:calc(100vw - 26px);max-width:425px;max-height:calc(100dvh - 100px);border-radius:calc(17px * var(--app-radius-scale,1))}.hq-modal-hero{padding:calc(14px * var(--app-density,1)) calc(13px * var(--app-density,1)) calc(12px * var(--app-density,1))}.hq-modal-title{padding-left:calc(35px * var(--app-density,1));gap:calc(7px * var(--app-density,1))}.hq-modal-icon{width:35px;height:35px;flex-basis:35px}.hq-modal-title h2{font-size:calc(15px * var(--app-font-scale,1))}.hq-modal-title p{font-size:calc(6px * var(--app-font-scale,1))}.hq-steps{padding-right:calc(42px * var(--app-density,1));overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}.hq-steps::-webkit-scrollbar{display:none}.hq-steps span{flex:0 0 auto;white-space:nowrap}
          .hq-modal-body{padding:calc(12px * var(--app-density,1)) calc(13px * var(--app-density,1))}.hq-form-grid{grid-template-columns:1fr;gap:calc(7px * var(--app-density,1))}.hq-modal input,.hq-modal select{height:39px}.hq-modal-footer{padding:calc(8px * var(--app-density,1)) calc(13px * var(--app-density,1)) max(calc(8px * var(--app-density,1)),env(safe-area-inset-bottom))}.hq-save-note{display:none}.hq-modal-actions{width:100%;display:grid;grid-template-columns:.7fr 1.4fr}.hq-cancel,.hq-save{width:100%;justify-content:center}
        }
        @media(max-width:370px){.hq-command .hq-insights{grid-template-columns:1fr}.hq-modal-backdrop{padding:calc(72px * var(--app-density,1)) calc(7px * var(--app-density,1)) calc(7px * var(--app-density,1))}.hq-modal{width:calc(100vw - 14px);max-height:calc(100dvh - 86px)}}
      `}</style>
    </div>
  );
}

// ==========================================
// بطاقة الحلقة
// ==========================================

function HalaqaCard({
  halaqa,
  mosqueName,
  studentCount,
  teacherCount,
  onEdit,
  onToggleStatus,
  onDelete,
  onStudents,
  onTeachers,
  loading,
}) {
  const isActive = halaqa.status === "active";
  const capacity = Number(halaqa.capacity || 0);
  const occupancy =
    capacity > 0 ? Math.min(Math.round((studentCount / capacity) * 100), 100) : 0;
  const needsTeacher = !halaqa.main_teacher_id;
  const nearlyFull = capacity > 0 && occupancy >= 85;

  return (
    <article className="hq-card">
      <div className="hq-card-head">
        <div className="hq-card-id">
          <div className="hq-card-icon"><BookOpen size={20} /></div>
          <div style={{ minWidth: 0 }}>
            <h3 title={halaqa.name}>{halaqa.name}</h3>
            <div className="hq-mosque"><Building2 size={11} />{mosqueName}</div>
          </div>
        </div>
        <span className={`hq-status ${isActive ? "active" : "inactive"}`}>
          {isActive ? <CheckCircle2 size={10} /> : <CircleOff size={10} />}
          {isActive ? "نشطة" : "غير نشطة"}
        </span>
      </div>

      <div className="hq-card-metrics">
        <div className="hq-metric"><span>الطلاب</span><strong>{studentCount}</strong></div>
        <div className="hq-metric"><span>المعلمون</span><strong>{teacherCount}</strong></div>
        <div className="hq-metric"><span>السعة</span><strong>{capacity || "—"}</strong></div>
      </div>

      <div className="hq-occupancy">
        <div className="hq-occ-head">
          <span>إشغال الحلقة</span>
          <strong>{studentCount} / {capacity || 0} · {occupancy}%</strong>
        </div>
        <div className="hq-progress">
          <div
            style={{
              width: `${occupancy}%`,
              background: occupancy >= 95 ? "#b94739" : occupancy >= 85 ? "#bd8e20" : "#168064",
            }}
          />
        </div>
      </div>

      {(needsTeacher || nearlyFull) && (
        <div className="hq-card-alert">
          <AlertTriangle size={12} />
          {needsTeacher ? "الحلقة تحتاج تعيين معلم رئيسي" : "الحلقة قريبة من بلوغ السعة"}
        </div>
      )}

      <div className="hq-quick">
        <button type="button" onClick={() => onStudents(halaqa.id)}>
          <Users size={13} /> الطلاب <ChevronLeft size={11} />
        </button>
        <button type="button" onClick={() => onTeachers(halaqa.id)}>
          <GraduationCap size={13} /> المعلمون <ChevronLeft size={11} />
        </button>
      </div>

      <div className="hq-actions">
        <button type="button" className="edit" onClick={() => onEdit(halaqa)} disabled={loading}>
          <Pencil size={12} /> تعديل
        </button>
        <button type="button" onClick={() => onToggleStatus(halaqa)} disabled={loading}>
          <Power size={12} /> {isActive ? "تعطيل" : "تفعيل"}
        </button>
        <button type="button" className="danger" onClick={() => onDelete(halaqa)} disabled={loading}>
          <Trash2 size={12} /> حذف
        </button>
      </div>
    </article>
  );
}

// ==========================================
// Stat
// ==========================================

function StatCard({ icon, title, value, note }) {
  return (
    <div className="hq-stat">
      <div className="hq-stat-top">
        <span>{title}</span>
        <div className="hq-stat-icon">{icon}</div>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function Insight({ icon, label, value, hint }) {
  return (
    <div className="hq-insight">
      <div className="hq-insight-icon">{icon}</div>
      <div className="hq-insight-copy">
        <span>{label}</span>
        <small>{hint}</small>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function FormSection({ icon, title, subtitle, gold = false, children }) {
  return (
    <section className={`hq-form-section ${gold ? "gold" : ""}`}>
      <div className="hq-section-title">
        <div className="hq-section-icon">{icon}</div>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, required = false, children }) {
  return (
    <div className="hq-field">
      <label>{label}{required && <b>*</b>}</label>
      {children}
    </div>
  );
}

// ==========================================
// Empty State
// ==========================================

function EmptyState({
  search,
  onClear,
}) {
  return (
    <div
      style={{
        background: "#fff",
        border:
          "1px solid #e5e8e4",
        borderRadius: "calc(18px * var(--app-radius-scale,1))",
        padding: "calc(55px * var(--app-density,1)) calc(20px * var(--app-density,1))",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          margin: "0 auto 14px",
          borderRadius: "calc(18px * var(--app-radius-scale,1))",
          background: "var(--app-color-edf5ef,#edf5ef)",
          color: "var(--app-color-0f5132,#0f5132)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {search ? (
          <Search size={28} />
        ) : (
          <BookOpen size={28} />
        )}
      </div>

      <h3
        style={{
          margin: "0 0 7px",
          color: "#354139",
          fontSize: "calc(17px * var(--app-font-scale,1))",
        }}
      >
        {search
          ? "لا توجد نتائج"
          : "لا توجد حلقات حتى الآن"}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#929993",
          fontSize: "calc(12px * var(--app-font-scale,1))",
        }}
      >
        {search
          ? "لم نجد حلقة مطابقة لخيارات البحث."
          : "ابدأ بإضافة أول حلقة إلى النظام."}
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
            padding: "calc(9px * var(--app-density,1)) calc(16px * var(--app-density,1))",
            borderRadius: "calc(9px * var(--app-radius-scale,1))",
            cursor: "pointer",
            fontSize: "calc(12px * var(--app-font-scale,1))",
            fontWeight: "700",
          }}
        >
          مسح الفلاتر
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
    <div className="sadiq-loading-state"
      style={{
        background: "#fff",
        border:
          "1px solid #e5e8e4",
        borderRadius: "calc(18px * var(--app-radius-scale,1))",
        padding: "calc(55px * var(--app-density,1)) calc(20px * var(--app-density,1))",
        textAlign: "center",
        color: "#7f8781",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          margin: "0 auto 13px",
          border:
            "3px solid #e1e8e3",
          borderTopColor:
            "#0f5132",
          borderRadius: "50%",
          animation:
            "spin 0.8s linear infinite",
        }}
      />

      جاري تحميل الحلقات...
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#465149",
  fontSize: "calc(12px * var(--app-font-scale,1))",
  fontWeight: "700",
};

const inputStyle = {
  width: "100%",
  height: "46px",
  padding: "0 calc(12px * var(--app-density,1))",
  border:
    "1px solid #d9ded9",
  borderRadius: "calc(10px * var(--app-radius-scale,1))",
  outline: "none",
  fontSize: "calc(13px * var(--app-font-scale,1))",
  boxSizing: "border-box",
  background: "#fff",
  color: "#26332c",
};