import {displayDateFormatter} from "../../lib/calendar";
import CalendarInput from "../../components/CalendarInput";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Archive, ArchiveRestore, BookOpenCheck, CalendarCheck, CalendarRange, CheckCircle2, Database, FileClock, Filter, GraduationCap, History, RefreshCw, Search, ShieldAlert, Sparkles, Trash2, Trophy, UserRound } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";

import "./Records.css";

const RECORD_TYPES = [
  {
    key: "attendance",
    table: "attendance",
    label: "الحضور",
    icon: CalendarCheck,
    dateField: "attendance_date",
    studentField: "student_id",
    halaqaField: "halaqa_id",
  },
  {
    key: "recitations",
    table: "recitations",
    label: "تسميع القرآن",
    icon: BookOpenCheck,
    dateField: "recitation_date",
    studentField: "student_id",
    halaqaField: "halaqa_id",
  },
  {
    key: "noorania_recitations",
    table: "noorania_recitations",
    label: "تسميع القاعدة",
    icon: Sparkles,
    dateField: "recitation_date",
    studentField: "student_id",
    halaqaField: "halaqa_id",
  },
  {
    key: "monthly_plans",
    table: "monthly_plans",
    label: "الخطط الشهرية",
    icon: CalendarRange,
    dateField: "plan_month",
    studentField: "student_id",
    halaqaField: "halaqa_id",
  },
  {
    key: "monthly_progress",
    table: "monthly_progress",
    label: "الإنجاز الشهري",
    icon: CheckCircle2,
    dateField: "progress_month",
    studentField: "student_id",
    halaqaField: "halaqa_id",
  },
  {
    key: "points_transactions",
    table: "points_transactions",
    label: "النقاط والمنح",
    icon: Trophy,
    dateField: "transaction_date",
    studentField: "student_id",
    halaqaField: "halaqa_id",
  },
  {
    key: "exam_results",
    table: "exam_results",
    label: "نتائج الاختبارات",
    icon: GraduationCap,
    dateField: "updated_at",
    studentField: "student_id",
    halaqaField: null,
    scopeByStudents: true,
    timestampDate: true,
  },
];

const TYPE_MAP = new Map(
  RECORD_TYPES.map((item) => [item.key, item])
);

const MAX_PER_TYPE = 160;

function normalizeDateValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return displayDateFormatter( {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${normalizeDateValue(value)}T12:00:00`));
  } catch {
    return normalizeDateValue(value);
  }
}

function prettyStatus(value) {
  const map = {
    present: "حاضر",
    absent: "غائب",
    late: "متأخر",
    excused: "معتذر",
    draft: "مسودة",
    submitted: "مرسلة",
    approved: "معتمدة",
    needs_revision: "تحتاج تعديل",
    grant: "منح",
    deduction: "خصم",
  };

  return map[value] || value || "—";
}

function recordSummary(record) {
  const row = record.raw;

  switch (record.typeKey) {
    case "attendance":
      return `الحالة: ${prettyStatus(row.status)}${row.notes ? ` • ${row.notes}` : ""}`;

    case "recitations": {
      const lesson =
        row.lesson_amount_value
          ? `${row.lesson_amount_value} ${
              row.lesson_amount_unit === "lines" ? "سطر" : "صفحة"
            }`
          : row.lesson_faces_manual ?? row.lesson_faces ?? "—";

      return `الدرس: ${lesson} • تقييم: ${
        row.lesson_evaluation || "—"
      } • المراجعة: ${row.review_faces ?? "—"}`;
    }

    case "noorania_recitations":
      return `الدرس: ${row.lesson || "—"} • تقييم: ${
        row.lesson_evaluation || "—"
      } • المراجعة: ${row.revision || row.revision_faces || "—"}`;

    case "monthly_plans":
      return `الحالة: ${prettyStatus(row.status)} • هدف الحفظ: ${
        row.memorization_target_faces ?? 0
      } • هدف المراجعة: ${row.revision_target_faces ?? 0}`;

    case "monthly_progress":
      return `الحفظ: ${
        row.final_memorization_faces ??
        row.auto_memorization_faces ??
        row.memorization_pages ??
        0
      } • المراجعة: ${
        row.final_revision_faces ??
        row.auto_revision_faces ??
        row.revision_pages ??
        0
      } • ${row.approved ? "معتمد" : "غير معتمد"}`;

    case "points_transactions":
      return `${prettyStatus(row.category)} • ${
        Number(row.points || 0) > 0 ? "+" : ""
      }${row.points || 0} نقطة • ${row.reason || "بدون سبب"}`;

    case "exam_results":
      return `الدرجة: ${row.score ?? "—"} • ${
        row.is_passed ? "مجتاز" : "غير مجتاز"
      }${row.notes ? ` • ${row.notes}` : ""}`;

    default:
      return "سجل";
  }
}

export default function Records() {
  const { showToast } = useToast();

  const [teacher, setTeacher] = useState(null);
  const [halaqat, setHalaqat] = useState([]);
  const [studentScopeIds, setStudentScopeIds] = useState([]);

  const [records, setRecords] = useState([]);
  const [archives, setArchives] = useState([]);

  const [selectedType, setSelectedType] = useState("all");
  const [selectedHalaqa, setSelectedHalaqa] = useState("all");
  const [recordState, setRecordState] = useState("active");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const [loadingBase, setLoadingBase] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");

  const halaqaMap = useMemo(
    () =>
      new Map(
        halaqat.map((item) => [
          Number(item.id),
          item.name || `حلقة ${item.id}`,
        ])
      ),
    [halaqat]
  );

  const archiveMap = useMemo(() => {
    return new Map(
      archives.map((item) => [
        `${item.source_table}:${item.source_record_id}`,
        item,
      ])
    );
  }, [archives]);

  const loadBase = useCallback(async () => {
    try {
      setLoadingBase(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("AUTH_REQUIRED");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, user_number, role")
        .eq("auth_user_id", user.id)
        .eq("role", "teacher")
        .single();

      if (profileError) throw profileError;

      const { data: links, error: linksError } = await supabase
        .from("teacher_halaqat")
        .select(`
          halaqa_id,
          halaqat!teacher_halaqat_halaqa_id_fkey(
            id,
            name
          )
        `)
        .eq("teacher_id", profile.id);

      if (linksError) throw linksError;

      const teacherHalaqat = (links || [])
        .map((link) => link.halaqat)
        .filter(Boolean);

      const uniqueHalaqat = Array.from(
        new Map(
          teacherHalaqat.map((item) => [
            Number(item.id),
            item,
          ])
        ).values()
      );

      const halaqaIds = uniqueHalaqat.map((item) => Number(item.id));

      let scopedStudents = [];

      if (halaqaIds.length) {
        const { data: assignments, error: assignmentError } =
          await supabase
            .from("student_halaqat")
            .select("student_id, halaqa_id, is_current")
            .in("halaqa_id", halaqaIds);

        if (assignmentError) throw assignmentError;

        scopedStudents = [
          ...new Set(
            (assignments || [])
              .map((item) => Number(item.student_id))
              .filter(Boolean)
          ),
        ];
      }

      setTeacher(profile);
      setHalaqat(uniqueHalaqat);
      setStudentScopeIds(scopedStudents);
    } catch (error) {
      console.error("RECORDS BASE:", error);
      showToast("تعذر تجهيز مركز السجلات", "error");
      setTeacher(null);
      setHalaqat([]);
      setStudentScopeIds([]);
    } finally {
      setLoadingBase(false);
    }
  }, [showToast]);

  const loadArchives = useCallback(async () => {
    if (!teacher?.id) {
      setArchives([]);
      return [];
    }

    const { data, error } = await supabase
      .from("teacher_record_archives")
      .select("*")
      .eq("teacher_id", teacher.id)
      .order("archived_at", { ascending: false });

    if (error) {
      console.error("LOAD ARCHIVES:", error);
      return [];
    }

    setArchives(data || []);
    return data || [];
  }, [teacher?.id]);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (teacher?.id) {
      loadArchives();
    }
  }, [teacher?.id, loadArchives]);

  async function loadType(type) {
    const allHalaqaIds = halaqat.map((item) => Number(item.id));
    const halaqaIds =
      selectedHalaqa === "all"
        ? allHalaqaIds
        : [Number(selectedHalaqa)];

    if (!halaqaIds.length) return [];

    let query = supabase
      .from(type.table)
      .select("*")
      .order(type.dateField, { ascending: false })
      .limit(MAX_PER_TYPE);

    if (type.scopeByStudents) {
      let allowedStudents = studentScopeIds;

      if (selectedHalaqa !== "all") {
        const { data: links, error } = await supabase
          .from("student_halaqat")
          .select("student_id")
          .eq("halaqa_id", Number(selectedHalaqa));

        if (error) throw error;

        allowedStudents = [
          ...new Set(
            (links || [])
              .map((item) => Number(item.student_id))
              .filter(Boolean)
          ),
        ];
      }

      if (!allowedStudents.length) return [];

      query = query.in(type.studentField, allowedStudents);
    } else {
      query = query.in(type.halaqaField, halaqaIds);
    }

    if (fromDate) {
      query = query.gte(
        type.dateField,
        type.timestampDate
          ? `${fromDate}T00:00:00`
          : fromDate
      );
    }

    if (toDate) {
      query = query.lte(
        type.dateField,
        type.timestampDate
          ? `${toDate}T23:59:59`
          : toDate
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("LOAD record failed:", { table: type.table, error });
      return [];
    }

    return (data || []).map((row) => ({
      key: `${type.table}:${row.id}`,
      typeKey: type.key,
      type,
      id: row.id,
      studentId: row[type.studentField] || null,
      halaqaId: type.halaqaField ? row[type.halaqaField] : null,
      date: row[type.dateField],
      raw: row,
    }));
  }

  const loadRecords = useCallback(async () => {
    if (!teacher?.id || !halaqat.length) {
      setRecords([]);
      return;
    }

    try {
      setLoading(true);

      const types =
        selectedType === "all"
          ? RECORD_TYPES
          : RECORD_TYPES.filter((item) => item.key === selectedType);

      const groups = await Promise.all(
        types.map((type) => loadType(type))
      );

      let merged = groups.flat();

      const studentIds = [
        ...new Set(
          merged
            .map((item) => Number(item.studentId))
            .filter(Boolean)
        ),
      ];

      const profileMap = new Map();

      if (studentIds.length) {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, full_name, user_number")
          .in("id", studentIds);

        if (error) throw error;

        (profiles || []).forEach((profile) => {
          profileMap.set(Number(profile.id), profile);
        });
      }

      merged = merged
        .map((item) => {
          const profile = profileMap.get(Number(item.studentId));

          const archive = archiveMap.get(
            `${item.type.table}:${item.id}`
          );

          return {
            ...item,
            studentName: profile?.full_name || "—",
            studentNumber: profile?.user_number || "",
            halaqaName:
              halaqaMap.get(Number(item.halaqaId)) ||
              (item.halaqaId ? `حلقة ${item.halaqaId}` : "—"),
            archived: Boolean(archive),
            archivedAt: archive?.archived_at || null,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.date || 0) -
            new Date(a.date || 0)
        );

      setRecords(merged);
    } catch (error) {
      console.error("LOAD RECORDS:", error);
      showToast("تعذر تحميل السجلات", "error");
    } finally {
      setLoading(false);
    }
  }, [
    teacher?.id,
    halaqat,
    selectedType,
    selectedHalaqa,
    fromDate,
    toDate,
    studentScopeIds,
    archiveMap,
    halaqaMap,
    showToast,
  ]);

  useEffect(() => {
    if (teacher?.id && halaqat.length) {
      loadRecords();
    }
  }, [
    teacher?.id,
    halaqat.length,
    selectedType,
    selectedHalaqa,
    fromDate,
    toDate,
    archives.length,
  ]);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();

    return records.filter((record) => {
      if (recordState === "active" && record.archived) {
        return false;
      }

      if (recordState === "archived" && !record.archived) {
        return false;
      }

      if (!text) return true;

      const haystack = [
        record.studentName,
        record.studentNumber,
        record.halaqaName,
        record.type.label,
        recordSummary(record),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(text);
    });
  }, [records, search, recordState]);

  const stats = useMemo(() => {
    const active = records.filter((item) => !item.archived).length;
    const archived = records.filter((item) => item.archived).length;
    const typeCount = new Set(records.map((item) => item.typeKey)).size;

    return {
      loaded: records.length,
      active,
      archived,
      typeCount,
    };
  }, [records]);

  async function setArchived(record, archived) {
    const busy = `${record.key}:archive`;
    setBusyKey(busy);

    try {
      const { error } = await supabase.rpc(
        "teacher_set_record_archived",
        {
          p_source_table: record.type.table,
          p_record_id: Number(record.id),
          p_archived: archived,
        }
      );

      if (error) throw error;

      await loadArchives();

      showToast(
        archived
          ? "تمت أرشفة السجل"
          : "تمت استعادة السجل",
        "success"
      );
    } catch (error) {
      console.error("ARCHIVE RECORD:", error);
      showToast(
        error.message || "تعذر تحديث حالة الأرشفة",
        "error"
      );
    } finally {
      setBusyKey("");
    }
  }

  async function deleteRecord(record) {
    const warning =
      `حذف نهائي للسجل:\n\n` +
      `${record.type.label}\n` +
      `${record.studentName}\n` +
      `${formatDate(record.date)}\n\n` +
      `لن يمكن التراجع عن الحذف، وقد يؤثر على التقارير والإحصائيات المرتبطة بهذا السجل.\n\nهل تريد المتابعة؟`;

    if (!window.confirm(warning)) return;

    const busy = `${record.key}:delete`;
    setBusyKey(busy);

    try {
      const { data, error } = await supabase.rpc(
        "teacher_delete_record",
        {
          p_source_table: record.type.table,
          p_record_id: Number(record.id),
        }
      );

      if (error) throw error;

      setRecords((current) =>
        current.filter((item) => item.key !== record.key)
      );

      await loadArchives();

      showToast("تم حذف السجل نهائيًا", "success");
    } catch (error) {
      console.error("DELETE RECORD:", error);
      showToast(
        error.message || "تعذر حذف السجل",
        "error"
      );
    } finally {
      setBusyKey("");
    }
  }

  async function archiveAllFiltered() {
    const rows = filtered.filter((record) => !record.archived);

    if (!rows.length) {
      showToast("لا توجد سجلات نشطة ضمن النتائج الحالية", "info");
      return;
    }

    const confirmed = window.confirm(
      `سيتم أرشفة ${rows.length} سجل من النتائج الظاهرة حاليًا.\n\n` +
      `الأرشفة تحتفظ بالسجلات ويمكن استعادتها لاحقًا.\n\n` +
      `هل تريد المتابعة؟`
    );

    if (!confirmed) return;

    setBusyKey("bulk-archive");

    try {
      const payload = rows.map((record) => ({
        source_table: record.type.table,
        record_id: Number(record.id),
      }));

      const { error } = await supabase.rpc(
        "teacher_set_records_archived",
        {
          p_records: payload,
          p_archived: true,
        }
      );

      if (error) throw error;

      await loadArchives();

      showToast(
        `تمت أرشفة ${rows.length} سجل`,
        "success"
      );
    } catch (error) {
      console.error("BULK ARCHIVE RECORDS:", error);
      showToast(
        error.message || "تعذر أرشفة السجلات",
        "error"
      );
    } finally {
      setBusyKey("");
    }
  }

  async function deleteAllFiltered() {
    if (!filtered.length) {
      showToast("لا توجد سجلات ضمن النتائج الحالية", "info");
      return;
    }

    const confirmed = window.confirm(
      `تنبيه: سيتم حذف ${filtered.length} سجل نهائيًا من النتائج الظاهرة حاليًا.\n\n` +
      `الحذف لا يمكن التراجع عنه وقد يؤثر على التقارير والإحصائيات المرتبطة بهذه السجلات.\n\n` +
      `هل أنت متأكد أنك تريد المتابعة؟`
    );

    if (!confirmed) return;

    const finalConfirm = window.confirm(
      `تأكيد أخير:\nسيتم حذف ${filtered.length} سجل نهائيًا.\n\nاضغط موافق للحذف النهائي.`
    );

    if (!finalConfirm) return;

    setBusyKey("bulk-delete");

    try {
      const payload = filtered.map((record) => ({
        source_table: record.type.table,
        record_id: Number(record.id),
      }));

      const { error } = await supabase.rpc(
        "teacher_delete_records",
        {
          p_records: payload,
        }
      );

      if (error) throw error;

      setRecords((current) => {
        const deleted = new Set(
          filtered.map((record) => record.key)
        );

        return current.filter(
          (record) => !deleted.has(record.key)
        );
      });

      await loadArchives();

      showToast(
        `تم حذف ${filtered.length} سجل نهائيًا`,
        "success"
      );
    } catch (error) {
      console.error("BULK DELETE RECORDS:", error);
      showToast(
        error.message || "تعذر حذف السجلات",
        "error"
      );
    } finally {
      setBusyKey("");
    }
  }

  function clearFilters() {
    setSelectedType("all");
    setSelectedHalaqa("all");
    setRecordState("active");
    setFromDate("");
    setToDate("");
    setSearch("");
  }

  if (loadingBase) {
    return (
      <div className="teacher-records-page">
        <div className="records-loading">
          <RefreshCw className="records-spin" size={23} />
          جارٍ تجهيز مركز السجلات…
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-records-page" dir="rtl">
      <section className="records-hero">
        <div className="records-hero-copy">
          <span className="records-kicker">
            <Database size={14} />
            إدارة بيانات الحلقة
          </span>

          <h1>السجلات</h1>

          <p>
            استعرض سجلات حلقاتك في مكان واحد، صفِّها حسب النوع والتاريخ،
            ثم أرشف السجل للاحتفاظ به أو احذفه نهائيًا عند الحاجة.
          </p>
        </div>

        <div className="records-hero-icon">
          <Archive size={31} />
        </div>
      </section>

      <section className="records-storage-note">
        <ShieldAlert size={18} />
        <div>
          <strong>مهم بخصوص المساحة</strong>
          <span>
            الأرشفة تخفي السجل من العرض النشط ويمكن استعادته لاحقًا.
            أما الحذف النهائي فلا يمكن التراجع عنه.
          </span>
        </div>
      </section>

      <section className="teacher-records-stats">
        <RecordStat
          icon={Database}
          label="السجلات المحملة"
          value={stats.loaded}
          note="حسب الفلاتر الحالية"
        />
        <RecordStat
          icon={FileClock}
          label="نشطة"
          value={stats.active}
          note="غير مؤرشفة"
        />
        <RecordStat
          icon={Archive}
          label="مؤرشفة"
          value={stats.archived}
          note="محفوظة في القاعدة"
        />
        <RecordStat
          icon={Filter}
          label="أنواع البيانات"
          value={stats.typeCount}
          note="ضمن النتائج"
        />
      </section>

      <section className="records-filter-panel">
        <div className="records-filter-head">
          <div>
            <span>الوصول السريع</span>
            <strong>فلترة السجلات</strong>
          </div>

          <button
            type="button"
            className="records-soft-btn"
            onClick={clearFilters}
          >
            مسح الفلاتر
          </button>
        </div>

        <div className="records-filter-grid">
          <label>
            <span>نوع السجل</span>
            <select
              value={selectedType}
              onChange={(event) =>
                setSelectedType(event.target.value)
              }
            >
              <option value="all">كل السجلات</option>
              {RECORD_TYPES.map((type) => (
                <option value={type.key} key={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>الحلقة</span>
            <select
              value={selectedHalaqa}
              onChange={(event) =>
                setSelectedHalaqa(event.target.value)
              }
            >
              <option value="all">كل حلقاتي</option>
              {halaqat.map((halaqa) => (
                <option value={halaqa.id} key={halaqa.id}>
                  {halaqa.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>الحالة</span>
            <select
              value={recordState}
              onChange={(event) =>
                setRecordState(event.target.value)
              }
            >
              <option value="active">النشطة فقط</option>
              <option value="archived">المؤرشفة فقط</option>
              <option value="all">الكل</option>
            </select>
          </label>

          <label>
            <span>من تاريخ</span>
            <CalendarInput

              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>

          <label>
            <span>إلى تاريخ</span>
            <CalendarInput

              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>

          <label className="records-search-field">
            <span>بحث</span>
            <div>
              <Search size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="اسم طالب، حلقة، حالة، سبب..."
              />
            </div>
          </label>
        </div>
      </section>

      <section className="records-list-panel">
        <header className="records-list-head">
          <div>
            <span>نتائج الفلترة</span>
            <strong>{filtered.length} سجل</strong>
          </div>

          <div className="records-bulk-actions">
            <button
              type="button"
              className="records-bulk-btn archive"
              onClick={archiveAllFiltered}
              disabled={
                loading ||
                busyKey === "bulk-archive" ||
                busyKey === "bulk-delete" ||
                !filtered.some((record) => !record.archived)
              }
            >
              <Archive size={15} />
              أرشفة الكل
            </button>

            <button
              type="button"
              className="records-bulk-btn delete"
              onClick={deleteAllFiltered}
              disabled={
                loading ||
                busyKey === "bulk-archive" ||
                busyKey === "bulk-delete" ||
                filtered.length === 0
              }
            >
              <Trash2 size={15} />
              حذف الكل
            </button>

            <button
              type="button"
              className="records-refresh-btn"
              onClick={async () => {
                await loadArchives();
                await loadRecords();
                showToast("تم تحديث السجلات", "success");
              }}
              disabled={
                loading ||
                busyKey === "bulk-archive" ||
                busyKey === "bulk-delete"
              }
            >
              <RefreshCw
                size={15}
                className={loading ? "records-spin" : ""}
              />
              تحديث
            </button>
          </div>
        </header>

        {loading ? (
          <div className="records-loading">
            <RefreshCw className="records-spin" size={22} />
            جارٍ تحميل السجلات…
          </div>
        ) : !filtered.length ? (
          <div className="records-empty">
            <Database size={29} />
            <strong>لا توجد سجلات مطابقة</strong>
            <span>
              غيّر نوع السجل أو التاريخ أو حالة الأرشفة.
            </span>
          </div>
        ) : (
          <div className="records-list">
            {filtered.map((record) => (
              <RecordRow
                key={record.key}
                record={record}
                busyKey={busyKey}
                onArchive={setArchived}
                onDelete={deleteRecord}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RecordStat({ icon: Icon, label, value, note }) {
  return (
    <article className="teacher-records-stat">
      <div className="teacher-records-stat-icon">
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

function RecordRow({
  record,
  busyKey,
  onArchive,
  onDelete,
}) {
  const Icon = record.type.icon;
  const archiving =
    busyKey === `${record.key}:archive`;
  const deleting =
    busyKey === `${record.key}:delete`;

  return (
    <article
      className={`records-row ${
        record.archived ? "is-archived" : ""
      }`}
    >
      <div className="records-row-icon">
        <Icon size={18} />
      </div>

      <div className="records-row-main">
        <div className="records-row-top">
          <span className="records-type-badge">
            {record.type.label}
          </span>

          {record.archived && (
            <span className="records-archive-badge">
              مؤرشف
            </span>
          )}
        </div>

        <strong className="records-student-name">
          {record.studentName}
        </strong>

        <p>{recordSummary(record)}</p>

        <div className="records-meta">
          <span>
            <UserRound size={12} />
            {record.studentNumber || "بدون رقم"}
          </span>

          <span>
            <Database size={12} />
            {record.halaqaName}
          </span>

          <span>
            <History size={12} />
            {formatDate(record.date)}
          </span>

          <span>
            ID: {record.id}
          </span>
        </div>
      </div>

      <div className="records-row-actions">
        <button
          type="button"
          className="records-action archive"
          disabled={archiving || deleting}
          onClick={() =>
            onArchive(record, !record.archived)
          }
        >
          {record.archived ? (
            <ArchiveRestore size={15} />
          ) : (
            <Archive size={15} />
          )}

          {record.archived ? "استعادة" : "أرشفة"}
        </button>

        <button
          type="button"
          className="records-action delete"
          disabled={archiving || deleting}
          onClick={() => onDelete(record)}
        >
          <Trash2 size={15} />
          حذف نهائي
        </button>
      </div>
    </article>
  );
}
