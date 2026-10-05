import {displayDateFormatter} from "../lib/calendar";
import { OrnamentScene } from '../components/ornaments/Ornament';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Building2, Search, Plus, RefreshCw, Loader2, PencilLine, Power, PowerOff, X, Save, ShieldCheck, Clock3, CheckCircle2, XCircle, CircleAlert, Users, GraduationCap, BookOpenCheck, Sparkles, Send, FileText, SlidersHorizontal, MapPin, Landmark, Ban, RotateCcw, Activity } from "lucide-react";

import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import "./Mosques.css";

const STATUS_META = {
  active: {
    label: "نشط",
    tone: "success",
    icon: CheckCircle2,
  },
  inactive: {
    label: "موقوف",
    tone: "warning",
    icon: Ban,
  },
  archived: {
    label: "مؤرشف",
    tone: "neutral",
    icon: FileText,
  },
};

const REQUEST_STATUS_META = {
  pending: {
    label: "قيد المراجعة",
    tone: "pending",
    icon: Clock3,
  },
  approved: {
    label: "تمت الموافقة",
    tone: "approved",
    icon: CheckCircle2,
  },
  rejected: {
    label: "مرفوض",
    tone: "rejected",
    icon: XCircle,
  },
  cancelled: {
    label: "ملغي",
    tone: "neutral",
    icon: Ban,
  },
};

function formatDate(value) {
  if (!value) return "—";

  try {
    return displayDateFormatter( {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function sectionLabel(section) {
  return section === "women" ? "نساء" : "رجال";
}

function getCompleteness(mosque) {
  const checks = [
    Boolean(String(mosque?.name || "").trim()),
    Boolean(String(mosque?.address || "").trim()),
    Boolean(String(mosque?.notes || "").trim()),
    Boolean(String(mosque?.section || "").trim()),
  ];

  return Math.round(
    (checks.filter(Boolean).length / checks.length) * 100
  );
}

function apiMessage(error) {
  const message = String(error?.message || error || "");

  if (message.includes("MOSQUE_NOT_LINKED_TO_SUPERVISOR")) {
    return "هذا المسجد غير مرتبط بحساب المشرف الحالي.";
  }

  if (message.includes("INVALID_MOSQUE_NAME")) {
    return "أدخل اسم مسجد صحيحًا.";
  }

  if (message.includes("STATUS_REASON_REQUIRED")) {
    return "اكتب سبب التعطيل قبل المتابعة.";
  }

  if (message.includes("PENDING_REQUEST_ALREADY_EXISTS")) {
    return "يوجد طلب إضافة مفتوح لهذا المسجد بالفعل.";
  }

  if (message.includes("PENDING_REQUEST_NOT_FOUND")) {
    return "الطلب غير موجود أو لم يعد قيد المراجعة.";
  }

  if (message.includes("SUPERVISOR_ONLY")) {
    return "هذه الصفحة متاحة لحساب المشرف فقط.";
  }

  return error?.message || "حدث خطأ غير متوقع.";
}


function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "green",
}) {
  return (
    <article className={`mosques-metric-card tone-${tone}`}>
      <div className="mosques-metric-icon">
        <Icon size={19} strokeWidth={1.8} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const meta =
    STATUS_META[status] ||
    STATUS_META.archived;

  const Icon = meta.icon;

  return (
    <span
      className={`mosques-status-badge tone-${meta.tone}`}
    >
      <Icon size={13} strokeWidth={2} />
      {meta.label}
    </span>
  );
}

function RequestBadge({ status }) {
  const meta =
    REQUEST_STATUS_META[status] ||
    REQUEST_STATUS_META.pending;

  const Icon = meta.icon;

  return (
    <span
      className={`mosques-request-badge tone-${meta.tone}`}
    >
      <Icon size={13} strokeWidth={2} />
      {meta.label}
    </span>
  );
}

function ModalShell({
  open,
  title,
  subtitle,
  icon: Icon,
  children,
  onClose,
  footer,
  size = "medium",
}) {
  if (!open) return null;

  return (
    <div
      className="mosques-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section
        className={`mosques-modal size-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="mosques-modal-head">
          <div className="mosques-modal-title-wrap">
            <div className="mosques-modal-icon">
              <Icon size={20} />
            </div>

            <div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            className="mosques-icon-button"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </header>

        <div className="mosques-modal-body">
          {children}
        </div>

        {footer ? (
          <footer className="mosques-modal-footer">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export default function Mosques() {
  const { showToast } = useToast();

  const [mosques, setMosques] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("mosques");

  const [editingMosque, setEditingMosque] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    notes: "",
    section: "men",
  });

  const [statusTarget, setStatusTarget] = useState(null);
  const [statusReason, setStatusReason] = useState("");

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: "",
    address: "",
    notes: "",
    section: "men",
    reason: "",
  });

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);

      try {
        const [
          mosqueResult,
          requestResult,
        ] = await Promise.all([
          supabase.rpc(
            "get_my_supervisor_mosques"
          ),
          supabase.rpc(
            "get_my_supervisor_mosque_requests"
          ),
        ]);

        if (mosqueResult.error) {
          throw mosqueResult.error;
        }

        if (requestResult.error) {
          throw requestResult.error;
        }

        setMosques(
          Array.isArray(mosqueResult.data)
            ? mosqueResult.data
            : []
        );

        setRequests(
          Array.isArray(requestResult.data)
            ? requestResult.data
            : []
        );
      } catch (error) {
        console.error(
          "SUPERVISOR MOSQUES LOAD:",
          error
        );

        showToast(
          apiMessage(error),
          "error"
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRefresh() {
    if (refreshing) return;

    setRefreshing(true);

    await loadData({
      silent: true,
    });

    setRefreshing(false);

    showToast(
      "تم تحديث مركز المساجد",
      "success"
    );
  }

  const filteredMosques =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return mosques.filter(
        (mosque) => {
          const matchesText =
            !query ||
            [
              mosque.name,
              mosque.address,
              mosque.notes,
              mosque.id,
            ].some((value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(query)
            );

          const matchesStatus =
            statusFilter === "all" ||
            mosque.status === statusFilter;

          const matchesSection =
            sectionFilter === "all" ||
            mosque.section === sectionFilter;

          return (
            matchesText &&
            matchesStatus &&
            matchesSection
          );
        }
      );
    }, [
      mosques,
      search,
      statusFilter,
      sectionFilter,
    ]);

  const stats =
    useMemo(() => {
      const active =
        mosques.filter(
          (item) =>
            item.status === "active"
        ).length;

      const inactive =
        mosques.filter(
          (item) =>
            item.status === "inactive"
        ).length;

      const halaqat =
        mosques.reduce(
          (sum, item) =>
            sum +
            Number(
              item.halaqat_count || 0
            ),
          0
        );

      const students =
        mosques.reduce(
          (sum, item) =>
            sum +
            Number(
              item.students_count || 0
            ),
          0
        );

      const pending =
        requests.filter(
          (item) =>
            item.status === "pending"
        ).length;

      return {
        total: mosques.length,
        active,
        inactive,
        halaqat,
        students,
        pending,
      };
    }, [mosques, requests]);

  const healthInsights =
    useMemo(() => {
      const missingAddress =
        mosques.filter(
          (item) =>
            !String(
              item.address || ""
            ).trim()
        ).length;

      const inactive =
        mosques.filter(
          (item) =>
            item.status === "inactive"
        ).length;

      const lowCompleteness =
        mosques.filter(
          (item) =>
            getCompleteness(item) < 75
        ).length;

      const items = [];

      if (stats.pending > 0) {
        items.push({
          tone: "gold",
          icon: Clock3,
          title: `${stats.pending} طلب إضافة بانتظار المراجعة`,
          text:
            "مدير النظام يراجع الطلبات قبل إنشاء وربط أي مسجد جديد.",
        });
      }

      if (inactive > 0) {
        items.push({
          tone: "warn",
          icon: PowerOff,
          title: `${inactive} مسجد غير نشط`,
          text:
            "يمكن إعادة تفعيله من بطاقة المسجد دون فقد أي بيانات سابقة.",
        });
      }

      if (
        missingAddress > 0 ||
        lowCompleteness > 0
      ) {
        items.push({
          tone: "blue",
          icon: Sparkles,
          title: "فرصة لتحسين جودة البيانات",
          text: `${Math.max(
            missingAddress,
            lowCompleteness
          )} مسجد يحتاج استكمال بعض البيانات لملف تشغيلي أوضح.`,
        });
      }

      if (!items.length) {
        items.push({
          tone: "green",
          icon: ShieldCheck,
          title: "المركز التشغيلي بحالة ممتازة",
          text:
            "المساجد المرتبطة نشطة وبياناتها الأساسية مكتملة.",
        });
      }

      return items.slice(0, 3);
    }, [mosques, stats.pending]);

  function openEdit(mosque) {
    setEditingMosque(mosque);

    setEditForm({
      name: mosque.name || "",
      address: mosque.address || "",
      notes: mosque.notes || "",
      section:
        mosque.section === "women"
          ? "women"
          : "men",
    });
  }

  async function saveEdit() {
    if (!editingMosque) return;

    const cleanName =
      editForm.name.trim();

    if (!cleanName) {
      showToast(
        "اسم المسجد مطلوب",
        "error"
      );
      return;
    }

    setActionLoading(true);

    try {
      const { error } =
        await supabase.rpc(
          "update_my_supervisor_mosque",
          {
            p_mosque_id:
              editingMosque.id,
            p_name: cleanName,
            p_address:
              editForm.address.trim() ||
              null,
            p_notes:
              editForm.notes.trim() ||
              null,
            p_section:
              editForm.section,
          }
        );

      if (error) throw error;

      showToast(
        "تم تحديث بيانات المسجد بنجاح",
        "success"
      );

      setEditingMosque(null);

      await loadData({
        silent: true,
      });
    } catch (error) {
      console.error(
        "UPDATE SUPERVISOR MOSQUE:",
        error
      );

      showToast(
        apiMessage(error),
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  function openStatus(mosque) {
    setStatusTarget(mosque);
    setStatusReason("");
  }

  async function changeStatus() {
    if (!statusTarget) return;

    const nextStatus =
      statusTarget.status === "active"
        ? "inactive"
        : "active";

    if (
      nextStatus === "inactive" &&
      !statusReason.trim()
    ) {
      showToast(
        "اكتب سبب تعطيل المسجد",
        "error"
      );
      return;
    }

    setActionLoading(true);

    try {
      const { error } =
        await supabase.rpc(
          "set_my_supervisor_mosque_status",
          {
            p_mosque_id:
              statusTarget.id,
            p_status:
              nextStatus,
            p_reason:
              nextStatus ===
              "inactive"
                ? statusReason.trim()
                : null,
          }
        );

      if (error) throw error;

      showToast(
        nextStatus === "active"
          ? "تم تفعيل المسجد"
          : "تم تعطيل المسجد مع حفظ جميع بياناته",
        "success"
      );

      setStatusTarget(null);
      setStatusReason("");

      await loadData({
        silent: true,
      });
    } catch (error) {
      console.error(
        "CHANGE MOSQUE STATUS:",
        error
      );

      showToast(
        apiMessage(error),
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  function resetRequestForm() {
    setRequestForm({
      name: "",
      address: "",
      notes: "",
      section: "men",
      reason: "",
    });
  }

  async function submitRequest() {
    const cleanName =
      requestForm.name.trim();

    if (!cleanName) {
      showToast(
        "أدخل اسم المسجد المطلوب",
        "error"
      );
      return;
    }

    setActionLoading(true);

    try {
      const { error } =
        await supabase.rpc(
          "create_supervisor_mosque_request",
          {
            p_name: cleanName,
            p_address:
              requestForm.address.trim() ||
              null,
            p_notes:
              requestForm.notes.trim() ||
              null,
            p_section:
              requestForm.section,
            p_reason:
              requestForm.reason.trim() ||
              null,
          }
        );

      if (error) throw error;

      showToast(
        "تم إرسال الطلب لمدير النظام للمراجعة",
        "success"
      );

      setRequestOpen(false);
      resetRequestForm();
      setActiveTab("requests");

      await loadData({
        silent: true,
      });
    } catch (error) {
      console.error(
        "CREATE MOSQUE REQUEST:",
        error
      );

      showToast(
        apiMessage(error),
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelRequest(id) {
    setActionLoading(true);

    try {
      const { error } =
        await supabase.rpc(
          "cancel_my_supervisor_mosque_request",
          {
            p_request_id: id,
          }
        );

      if (error) throw error;

      showToast(
        "تم إلغاء الطلب",
        "success"
      );

      await loadData({
        silent: true,
      });
    } catch (error) {
      console.error(
        "CANCEL MOSQUE REQUEST:",
        error
      );

      showToast(
        apiMessage(error),
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        className="mosques-command-page"
        dir="rtl"
      >
        <div className="mosques-loading-state">
          <div className="mosques-loading-emblem">
            <Landmark size={27} />
          </div>

          <Loader2
            className="mosques-spin"
            size={22}
          />

          <strong>
            جارٍ تجهيز مركز المساجد
          </strong>

          <span>
            نحمّل الارتباطات والحالة التشغيلية والطلبات
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mosques-command-page"
      dir="rtl"
    >
      <section className="mosques-hero">
        <OrnamentScene primary="02-shams" />

        <div className="mosques-hero-copy">
          <div className="mosques-eyebrow">
            <span className="mosques-eyebrow-mark">
              <Sparkles size={14} />
            </span>
            مركز الإدارة المؤسسية
          </div>

          <h1>
            إدارة المساجد المرتبطة
          </h1>

          <p>
            مركز موحّد للمساجد التي تشرف عليها؛
            تعديل البيانات، متابعة الحالة التشغيلية،
            إدارة التفعيل، ورفع طلبات إضافة جديدة
            إلى مدير النظام.
          </p>

          <div className="mosques-hero-tags">
            <span>
              <ShieldCheck size={14} />
              صلاحيات مرتبطة بالمشرف
            </span>

            <span>
              <Activity size={14} />
              متابعة تشغيلية مباشرة
            </span>

            <span>
              <Clock3 size={14} />
              طلبات إضافة بمسار اعتماد
            </span>
          </div>
        </div>

        <div className="mosques-hero-actions">
          <button
            type="button"
            className="mosques-button ghost"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2
                className="mosques-spin"
                size={17}
              />
            ) : (
              <RefreshCw size={17} />
            )}
            تحديث
          </button>

          <button
            type="button"
            className="mosques-button primary"
            onClick={() =>
              setRequestOpen(true)
            }
          >
            <Plus size={18} />
            طلب إضافة مسجد
          </button>
        </div>
      </section>

      <section className="mosques-metrics-grid">
        <MetricCard
          icon={Landmark}
          label="المساجد المرتبطة"
          value={stats.total}
          helper="ضمن نطاق إشرافك"
        />

        <MetricCard
          icon={CheckCircle2}
          label="المساجد النشطة"
          value={stats.active}
          helper="متاحة للتشغيل"
          tone="emerald"
        />

        <MetricCard
          icon={BookOpenCheck}
          label="إجمالي الحلقات"
          value={stats.halaqat}
          helper="في جميع المساجد"
          tone="gold"
        />

        <MetricCard
          icon={Users}
          label="الطلاب الحاليون"
          value={stats.students}
          helper="مرتبطون بالحلقات"
          tone="blue"
        />

        <MetricCard
          icon={Clock3}
          label="طلبات بانتظار الاعتماد"
          value={stats.pending}
          helper="لدى مدير النظام"
          tone="violet"
        />
      </section>

      <section className="mosques-insights">
        <div className="mosques-section-heading compact">
          <div>
            <span>
              <Sparkles size={14} />
              قراءة ذكية
            </span>
            <h2>
              ملخص يحتاج انتباهك
            </h2>
          </div>
        </div>

        <div className="mosques-insight-grid">
          {healthInsights.map(
            (item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={`${item.title}-${index}`}
                  className={`mosques-insight-card tone-${item.tone}`}
                >
                  <div>
                    <Icon size={18} />
                  </div>

                  <section>
                    <strong>
                      {item.title}
                    </strong>
                    <p>
                      {item.text}
                    </p>
                  </section>
                </article>
              );
            }
          )}
        </div>
      </section>

      <section className="mosques-workspace">
        <header className="mosques-workspace-head">
          <div className="mosques-tabs">
            <button
              type="button"
              className={
                activeTab === "mosques"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("mosques")
              }
            >
              <Building2 size={16} />
              المساجد
              <b>{stats.total}</b>
            </button>

            <button
              type="button"
              className={
                activeTab === "requests"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("requests")
              }
            >
              <Clock3 size={16} />
              طلبات الإضافة
              <b>{requests.length}</b>
            </button>
          </div>

          {activeTab === "mosques" ? (
            <div className="mosques-filter-tools">
              <label className="mosques-search">
                <Search size={17} />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="ابحث باسم المسجد أو العنوان..."
                />

                {search ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    aria-label="مسح البحث"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </label>

              <label className="mosques-compact-select">
                <SlidersHorizontal size={15} />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                >
                  <option value="all">
                    كل الحالات
                  </option>
                  <option value="active">
                    النشطة
                  </option>
                  <option value="inactive">
                    الموقوفة
                  </option>
                  <option value="archived">
                    المؤرشفة
                  </option>
                </select>
              </label>

              <label className="mosques-compact-select">
                <Landmark size={15} />

                <select
                  value={sectionFilter}
                  onChange={(event) =>
                    setSectionFilter(
                      event.target.value
                    )
                  }
                >
                  <option value="all">
                    كل الأقسام
                  </option>
                  <option value="men">
                    رجال
                  </option>
                  <option value="women">
                    نساء
                  </option>
                </select>
              </label>
            </div>
          ) : (
            <button
              type="button"
              className="mosques-button primary compact"
              onClick={() =>
                setRequestOpen(true)
              }
            >
              <Plus size={16} />
              طلب جديد
            </button>
          )}
        </header>

        {activeTab === "mosques" ? (
          filteredMosques.length ? (
            <div className="mosques-card-grid">
              {filteredMosques.map(
                (mosque) => {
                  const completeness =
                    getCompleteness(
                      mosque
                    );

                  const isActive =
                    mosque.status ===
                    "active";

                  const isArchived =
                    mosque.status ===
                    "archived";

                  return (
                    <article
                      className="mosque-command-card"
                      key={mosque.id}
                    >
                      <div className="mosque-card-top">
                        <div className="mosque-identity">
                          <div className="mosque-identity-icon">
                            <Landmark
                              size={22}
                              strokeWidth={1.7}
                            />
                          </div>

                          <div>
                            <div className="mosque-card-badges">
                              <StatusBadge
                                status={
                                  mosque.status
                                }
                              />

                              <span className="mosques-section-badge">
                                {sectionLabel(
                                  mosque.section
                                )}
                              </span>
                            </div>

                            <h3>
                              {mosque.name}
                            </h3>

                            <p>
                              <MapPin
                                size={13}
                              />
                              {mosque.address ||
                                "لم تتم إضافة العنوان بعد"}
                            </p>
                          </div>
                        </div>

                        <div
                          className="mosque-completeness"
                          title="اكتمال بيانات المسجد"
                        >
                          <strong>
                            {completeness}%
                          </strong>
                          <span>
                            اكتمال الملف
                          </span>
                        </div>
                      </div>

                      <div className="mosque-operational-strip">
                        <div>
                          <BookOpenCheck
                            size={16}
                          />
                          <span>
                            الحلقات
                          </span>
                          <strong>
                            {Number(
                              mosque.halaqat_count ||
                                0
                            )}
                          </strong>
                        </div>

                        <div>
                          <GraduationCap
                            size={16}
                          />
                          <span>
                            المعلمون
                          </span>
                          <strong>
                            {Number(
                              mosque.teachers_count ||
                                0
                            )}
                          </strong>
                        </div>

                        <div>
                          <Users size={16} />
                          <span>
                            الطلاب
                          </span>
                          <strong>
                            {Number(
                              mosque.students_count ||
                                0
                            )}
                          </strong>
                        </div>
                      </div>

                      {mosque.notes ? (
                        <div className="mosque-note">
                          <FileText size={14} />
                          <span>
                            {mosque.notes}
                          </span>
                        </div>
                      ) : (
                        <div className="mosque-note empty">
                          <Sparkles size={14} />
                          <span>
                            أضف ملاحظات تشغيلية
                            ليستفيد منها فريق
                            الإشراف.
                          </span>
                        </div>
                      )}

                      {!isActive &&
                      mosque.status_reason ? (
                        <div className="mosque-status-reason">
                          <CircleAlert
                            size={14}
                          />
                          <div>
                            <strong>
                              سبب التعطيل
                            </strong>
                            <span>
                              {
                                mosque.status_reason
                              }
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <div className="mosque-card-footer">
                        <div className="mosque-updated">
                          <Clock3 size={13} />
                          <span>
                            {mosque.status_changed_at
                              ? `آخر تغيير ${formatDate(
                                  mosque.status_changed_at
                                )}`
                              : `مرتبط منذ ${formatDate(
                                  mosque.created_at
                                )}`}
                          </span>
                        </div>

                        <div className="mosque-actions">
                          <button
                            type="button"
                            className="mosque-action edit"
                            onClick={() =>
                              openEdit(
                                mosque
                              )
                            }
                            disabled={
                              isArchived
                            }
                          >
                            <PencilLine
                              size={15}
                            />
                            تعديل
                          </button>

                          <button
                            type="button"
                            className={
                              isActive
                                ? "mosque-action disable"
                                : "mosque-action enable"
                            }
                            onClick={() =>
                              openStatus(
                                mosque
                              )
                            }
                            disabled={
                              isArchived
                            }
                          >
                            {isActive ? (
                              <PowerOff
                                size={15}
                              />
                            ) : (
                              <Power
                                size={15}
                              />
                            )}

                            {isActive
                              ? "تعطيل"
                              : "تفعيل"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div className="mosques-empty-state">
              <div>
                <Search size={25} />
              </div>

              <strong>
                لا توجد مساجد مطابقة
              </strong>

              <p>
                غيّر البحث أو الفلاتر، أو
                ارفع طلب إضافة مسجد جديد
                لمدير النظام.
              </p>

              <button
                type="button"
                className="mosques-button primary compact"
                onClick={() =>
                  setRequestOpen(true)
                }
              >
                <Plus size={16} />
                طلب إضافة مسجد
              </button>
            </div>
          )
        ) : requests.length ? (
          <div className="mosques-request-list">
            {requests.map(
              (request) => (
                <article
                  className="mosques-request-card"
                  key={request.id}
                >
                  <div className="mosques-request-main">
                    <div className="mosques-request-icon">
                      <Landmark
                        size={20}
                      />
                    </div>

                    <div>
                      <div className="mosques-request-title-line">
                        <h3>
                          {
                            request.requested_name
                          }
                        </h3>

                        <RequestBadge
                          status={
                            request.status
                          }
                        />
                      </div>

                      <div className="mosques-request-meta">
                        <span>
                          <Landmark
                            size={13}
                          />
                          {sectionLabel(
                            request.requested_section
                          )}
                        </span>

                        <span>
                          <MapPin size={13} />
                          {request.requested_address ||
                            "بدون عنوان"}
                        </span>

                        <span>
                          <Clock3
                            size={13}
                          />
                          {formatDate(
                            request.created_at
                          )}
                        </span>
                      </div>

                      {request.request_reason ? (
                        <p>
                          {
                            request.request_reason
                          }
                        </p>
                      ) : null}

                      {request.decision_note ? (
                        <div className="mosques-decision-note">
                          <strong>
                            ملاحظة مدير النظام
                          </strong>
                          <span>
                            {
                              request.decision_note
                            }
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mosques-request-side">
                    {request.status ===
                    "pending" ? (
                      <button
                        type="button"
                        className="mosques-text-button danger"
                        onClick={() =>
                          cancelRequest(
                            request.id
                          )
                        }
                        disabled={
                          actionLoading
                        }
                      >
                        <X size={14} />
                        إلغاء الطلب
                      </button>
                    ) : request.status ===
                        "approved" ? (
                      <span className="mosques-request-result">
                        <CheckCircle2
                          size={16}
                        />
                        تم ربط المسجد بعد
                        الاعتماد
                      </span>
                    ) : null}
                  </div>
                </article>
              )
            )}
          </div>
        ) : (
          <div className="mosques-empty-state">
            <div>
              <Clock3 size={25} />
            </div>

            <strong>
              لا توجد طلبات إضافة
            </strong>

            <p>
              عند الحاجة لمسجد جديد، ارفع
              طلبًا واضحًا وسيظهر هنا مسار
              المراجعة والقرار.
            </p>

            <button
              type="button"
              className="mosques-button primary compact"
              onClick={() =>
                setRequestOpen(true)
              }
            >
              <Plus size={16} />
              إنشاء أول طلب
            </button>
          </div>
        )}
      </section>

      <ModalShell
        open={Boolean(editingMosque)}
        title="تعديل بيانات المسجد"
        subtitle="التغييرات هنا تخص المسجد المرتبط بنطاق إشرافك."
        icon={PencilLine}
        onClose={() =>
          !actionLoading &&
          setEditingMosque(null)
        }
        footer={
          <>
            <button
              type="button"
              className="mosques-button ghost"
              onClick={() =>
                setEditingMosque(null)
              }
              disabled={actionLoading}
            >
              إلغاء
            </button>

            <button
              type="button"
              className="mosques-button primary"
              onClick={saveEdit}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2
                  className="mosques-spin"
                  size={16}
                />
              ) : (
                <Save size={16} />
              )}
              حفظ التعديلات
            </button>
          </>
        }
      >
        <div className="mosques-form-grid">
          <label className="mosques-field span-2">
            <span>
              اسم المسجد
            </span>
            <input
              value={editForm.name}
              onChange={(event) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    name:
                      event.target.value,
                  })
                )
              }
              placeholder="مثال: مسجد الصديق"
            />
          </label>

          <label className="mosques-field span-2">
            <span>
              العنوان
            </span>
            <input
              value={
                editForm.address
              }
              onChange={(event) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    address:
                      event.target.value,
                  })
                )
              }
              placeholder="الحي، الشارع أو الوصف المختصر"
            />
          </label>

          <label className="mosques-field">
            <span>
              القسم
            </span>
            <select
              value={
                editForm.section
              }
              onChange={(event) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    section:
                      event.target.value,
                  })
                )
              }
            >
              <option value="men">
                رجال
              </option>
              <option value="women">
                نساء
              </option>
            </select>
          </label>

          <div className="mosques-form-hint">
            <ShieldCheck
              size={16}
            />
            <span>
              لا يمكن نقل المسجد من نطاق
              الإشراف من هذه الشاشة.
            </span>
          </div>

          <label className="mosques-field span-2">
            <span>
              ملاحظات تشغيلية
            </span>
            <textarea
              value={editForm.notes}
              onChange={(event) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    notes:
                      event.target.value,
                  })
                )
              }
              placeholder="أي معلومات مفيدة عن الموقع أو التشغيل..."
            />
          </label>
        </div>
      </ModalShell>

      <ModalShell
        open={Boolean(statusTarget)}
        title={
          statusTarget?.status ===
          "active"
            ? "تعطيل المسجد"
            : "إعادة تفعيل المسجد"
        }
        subtitle={
          statusTarget?.status ===
          "active"
            ? "التعطيل لا يحذف المسجد أو الحلقات أو السجلات."
            : "سيعود المسجد إلى الحالة التشغيلية النشطة."
        }
        icon={
          statusTarget?.status ===
          "active"
            ? PowerOff
            : Power
        }
        onClose={() =>
          !actionLoading &&
          setStatusTarget(null)
        }
        size="small"
        footer={
          <>
            <button
              type="button"
              className="mosques-button ghost"
              onClick={() =>
                setStatusTarget(null)
              }
              disabled={actionLoading}
            >
              إلغاء
            </button>

            <button
              type="button"
              className={
                statusTarget?.status ===
                "active"
                  ? "mosques-button danger"
                  : "mosques-button primary"
              }
              onClick={changeStatus}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2
                  className="mosques-spin"
                  size={16}
                />
              ) : statusTarget?.status ===
                "active" ? (
                <PowerOff size={16} />
              ) : (
                <Power size={16} />
              )}

              {statusTarget?.status ===
              "active"
                ? "تأكيد التعطيل"
                : "تأكيد التفعيل"}
            </button>
          </>
        }
      >
        <div className="mosques-status-confirm-card">
          <div className="mosques-status-mosque">
            <Landmark size={18} />
            <div>
              <span>
                المسجد
              </span>
              <strong>
                {statusTarget?.name}
              </strong>
            </div>
          </div>

          {statusTarget?.status ===
          "active" ? (
            <label className="mosques-field">
              <span>
                سبب التعطيل
              </span>
              <textarea
                value={statusReason}
                onChange={(event) =>
                  setStatusReason(
                    event.target.value
                  )
                }
                placeholder="مثال: توقف مؤقت للصيانة أو إعادة التنظيم..."
              />
            </label>
          ) : (
            <div className="mosques-safe-message">
              <RotateCcw size={17} />
              <span>
                ستتم إعادة تشغيل المسجد مع
                الاحتفاظ بجميع الحلقات
                والبيانات السابقة.
              </span>
            </div>
          )}
        </div>
      </ModalShell>

      <ModalShell
        open={requestOpen}
        title="طلب إضافة مسجد جديد"
        subtitle="لا يتم إنشاء المسجد مباشرة؛ يرسل الطلب إلى مدير النظام للاعتماد."
        icon={Send}
        onClose={() =>
          !actionLoading &&
          setRequestOpen(false)
        }
        footer={
          <>
            <button
              type="button"
              className="mosques-button ghost"
              onClick={() =>
                setRequestOpen(false)
              }
              disabled={actionLoading}
            >
              إلغاء
            </button>

            <button
              type="button"
              className="mosques-button primary"
              onClick={submitRequest}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2
                  className="mosques-spin"
                  size={16}
                />
              ) : (
                <Send size={16} />
              )}
              إرسال لمدير النظام
            </button>
          </>
        }
      >
        <div className="mosques-approval-banner">
          <ShieldCheck size={20} />

          <div>
            <strong>
              مسار اعتماد آمن
            </strong>

            <span>
              يراجع مدير النظام الطلب، وعند
              الموافقة يُنشأ المسجد ويُربط
              بحسابك تلقائيًا.
            </span>
          </div>
        </div>

        <div className="mosques-form-grid">
          <label className="mosques-field span-2">
            <span>
              اسم المسجد المطلوب
            </span>
            <input
              value={requestForm.name}
              onChange={(event) =>
                setRequestForm(
                  (current) => ({
                    ...current,
                    name:
                      event.target.value,
                  })
                )
              }
              placeholder="اسم المسجد"
            />
          </label>

          <label className="mosques-field span-2">
            <span>
              العنوان
            </span>
            <input
              value={
                requestForm.address
              }
              onChange={(event) =>
                setRequestForm(
                  (current) => ({
                    ...current,
                    address:
                      event.target.value,
                  })
                )
              }
              placeholder="المدينة، الحي، الشارع"
            />
          </label>

          <label className="mosques-field">
            <span>
              القسم
            </span>
            <select
              value={
                requestForm.section
              }
              onChange={(event) =>
                setRequestForm(
                  (current) => ({
                    ...current,
                    section:
                      event.target.value,
                  })
                )
              }
            >
              <option value="men">
                رجال
              </option>
              <option value="women">
                نساء
              </option>
            </select>
          </label>

          <label className="mosques-field">
            <span>
              سبب الإضافة
            </span>
            <input
              value={
                requestForm.reason
              }
              onChange={(event) =>
                setRequestForm(
                  (current) => ({
                    ...current,
                    reason:
                      event.target.value,
                  })
                )
              }
              placeholder="مثال: توسع نطاق الإشراف"
            />
          </label>

          <label className="mosques-field span-2">
            <span>
              ملاحظات لمدير النظام
            </span>
            <textarea
              value={
                requestForm.notes
              }
              onChange={(event) =>
                setRequestForm(
                  (current) => ({
                    ...current,
                    notes:
                      event.target.value,
                  })
                )
              }
              placeholder="أي معلومات تساعد مدير النظام على مراجعة الطلب..."
            />
          </label>
        </div>
      </ModalShell>
    </div>
  );
}
