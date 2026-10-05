import {displayDateFormatter} from "../lib/calendar";
import { OrnamentScene } from '../components/ornaments/Ornament';
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Activity, Archive, BellRing, BookOpen, Building2, Check, CheckCircle2, ChevronLeft, CircleOff, ClipboardList, Copy, GraduationCap, KeyRound, LayoutDashboard, Link2, Loader2, LogOut, Menu, Fingerprint, Laptop, Trash2, MessageCircle, Phone, Plus, RefreshCw, Search, Settings, ShieldCheck, Sparkles, UserCheck, UserCog, UserRoundCheck, Users, X, XCircle } from "lucide-react";
import "./SystemAdmin.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "لوحة القيادة", icon: LayoutDashboard },
  { id: "mosques", label: "المساجد", icon: Building2 },
  { id: "supervisors", label: "المشرفون والربط", icon: ShieldCheck },
  { id: "invites", label: "دعوات المشرفين", icon: KeyRound },
  { id: "users", label: "المستخدمون", icon: Users },
  { id: "alerts", label: "مركز التنبيهات", icon: BellRing },
  { id: "audit", label: "سجل العمليات", icon: ClipboardList },
  { id: "security", label: "خزنة المالك", icon: Fingerprint },
  { id: "settings", label: "إعدادات النظام", icon: Settings },
];

const ROLE_LABELS = {
  admin: "مدير نظام",
  supervisor: "مشرف",
  teacher: "معلم",
  student: "طالب",
};

const MOSQUE_STATUS = {
  active: { label: "نشط", tone: "success" },
  inactive: { label: "معطل", tone: "warning" },
  archived: { label: "مؤرشف", tone: "neutral" },
};

const INVITE_STATUS = {
  active: { label: "صالح", tone: "success" },
  used: { label: "مستخدم", tone: "info" },
  expired: { label: "منتهي", tone: "warning" },
  cancelled: { label: "ملغي", tone: "danger" },
  inactive: { label: "غير نشط", tone: "neutral" },
};

const ACTION_LABELS = {
  mosque_status_changed: "تغيير حالة مسجد",
  supervisor_linked_to_mosque: "ربط مشرف بمسجد",
  supervisor_unlinked_from_mosque: "فك ربط مشرف من مسجد",
  supervisor_invite_created: "إنشاء دعوة مشرف",
  supervisor_invite_cancelled: "إلغاء دعوة مشرف",
  user_activated: "تفعيل حساب",
  user_deactivated: "تعطيل حساب",
};

function number(value) {
  return Number(value || 0);
}

function formatDate(value, withTime = true) {
  if (!value) return "—";
  try {
    return displayDateFormatter( {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(withTime
        ? { hour: "2-digit", minute: "2-digit" }
        : {}),
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function formatGregorianToday() {
  try {
    return displayDateFormatter( {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    return "";
  }
}

function formatHijriToday() {
  try {
    return displayDateFormatter( {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    return "";
  }
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getErrorMessage(error) {
  const message = String(error?.message || error || "");

  if (message.includes("SYSTEM_ADMIN_REQUIRED")) {
    return "هذا الحساب لا يملك صلاحية مدير النظام.";
  }
  if (message.includes("MOSQUE_STATUS_REASON_REQUIRED")) {
    return "اكتب سبب التعطيل أو الأرشفة أولًا.";
  }
  if (message.includes("MOSQUE_ARCHIVED")) {
    return "لا يمكن تنفيذ هذا الإجراء على مسجد مؤرشف.";
  }
  if (message.includes("CANNOT_DEACTIVATE_SELF")) {
    return "لا يمكنك تعطيل حساب مدير النظام الذي تستخدمه الآن.";
  }
  if (message.includes("USER_DEACTIVATION_REASON_REQUIRED")) {
    return "اكتب سبب تعطيل الحساب أولًا.";
  }
  if (message.includes("INVITE_NOT_CANCELLABLE")) {
    return "هذه الدعوة مستخدمة أو ملغاة مسبقًا ولا يمكن إلغاؤها.";
  }
  if (message.includes("INVALID_INVITE_EXPIRY")) {
    return "مدة الدعوة يجب أن تكون بين يوم و90 يومًا.";
  }

  return message || "حدث خطأ غير متوقع.";
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

export default function SystemAdmin() {
  const [activeView, setActiveView] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [adminProfile, setAdminProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [invites, setInvites] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [toast, setToast] = useState(null);

  function notify(message, type = "success") {
    setToast({ message, type, id: Date.now() });
  }

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    loadEverything();
  }, []);

  async function loadEverything({ silent = false } = {}) {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setPageError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user) {
        window.location.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, user_number, role, status, is_active")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (
        !profile ||
        profile.role !== "admin" ||
        profile.status !== "active" ||
        profile.is_active === false
      ) {
        window.location.replace("/login");
        return;
      }

      setAdminProfile(profile);

      const [dashboardRes, mosquesRes, mosqueSectionsRes, supervisorsRes, invitesRes, usersRes, auditRes, supportRes] =
        await Promise.all([
          supabase.rpc("get_system_admin_dashboard"),
          supabase.rpc("get_system_admin_mosques"),
          supabase.rpc("get_system_admin_mosque_sections"),
          supabase.rpc("get_system_admin_supervisors"),
          supabase.rpc("get_system_admin_supervisor_invites"),
          supabase.rpc("get_system_admin_users"),
          supabase.rpc("get_system_admin_audit_logs", { p_limit: 120 }),
          supabase.rpc("get_system_admin_support_requests", { p_limit: 150 }),
        ]);

      const errors = [
        dashboardRes.error,
        mosquesRes.error,
        mosqueSectionsRes.error,
        supervisorsRes.error,
        invitesRes.error,
        usersRes.error,
        auditRes.error,
        supportRes.error,
      ].filter(Boolean);

      if (errors.length) throw errors[0];

      setDashboard(normalizeArray(dashboardRes.data)[0] || null);

      const mosqueSections = new Map(
        normalizeArray(mosqueSectionsRes.data).map((row) => [
          Number(row.mosque_id),
          row.section || "men",
        ])
      );

      setMosques(
        normalizeArray(mosquesRes.data).map((mosque) => ({
          ...mosque,
          mosque_section:
            mosque.mosque_section ||
            mosque.section ||
            mosqueSections.get(Number(mosque.mosque_id)) ||
            "men",
        }))
      );
      setSupervisors(normalizeArray(supervisorsRes.data));
      setInvites(normalizeArray(invitesRes.data));
      setUsers(normalizeArray(usersRes.data));
      setAuditLogs(normalizeArray(auditRes.data));
      setSupportRequests(normalizeArray(supportRes.data));
    } catch (error) {
      console.error("System Admin load error:", error);
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const openSupportRequests = useMemo(
    () => supportRequests.filter((item) => item.status === "open"),
    [supportRequests]
  );

  const alerts = useMemo(() => {
    const rows = [];

    mosques
      .filter((mosque) => mosque.mosque_status !== "archived" && number(mosque.supervisors_count) === 0)
      .forEach((mosque) => {
        rows.push({
          id: `mosque-no-supervisor-${mosque.mosque_id}`,
          severity: "danger",
          icon: ShieldCheck,
          title: `${mosque.mosque_name} بلا مشرف`,
          description: "المسجد موجود في النظام ولا يوجد أي مشرف مرتبط به.",
          actionLabel: "إدارة الربط",
          action: () => setActiveView("supervisors"),
        });
      });

    supervisors
      .filter((supervisor) => number(supervisor.mosques_count) === 0)
      .forEach((supervisor) => {
        rows.push({
          id: `supervisor-no-mosque-${supervisor.supervisor_id}`,
          severity: "warning",
          icon: UserCog,
          title: `${supervisor.full_name || supervisor.user_number} بلا مسجد`,
          description: "حساب المشرف جاهز لكنه غير مرتبط بأي مسجد حتى الآن.",
          actionLabel: "ربط مسجد",
          action: () => setActiveView("supervisors"),
        });
      });

    const now = Date.now();
    invites
      .filter((invite) => invite.invite_status === "active" && invite.expires_at)
      .forEach((invite) => {
        const diff = new Date(invite.expires_at).getTime() - now;
        const twoDays = 2 * 24 * 60 * 60 * 1000;
        if (diff > 0 && diff <= twoDays) {
          rows.push({
            id: `invite-expiring-${invite.invite_id}`,
            severity: "info",
            icon: KeyRound,
            title: `دعوة ${invite.code} قاربت على الانتهاء`,
            description: `تنتهي ${formatDate(invite.expires_at)}.` ,
            actionLabel: "عرض الدعوات",
            action: () => setActiveView("invites"),
          });
        }
      });

    mosques
      .filter((mosque) => mosque.mosque_status === "inactive" && number(mosque.halaqat_count) > 0)
      .forEach((mosque) => {
        rows.push({
          id: `inactive-halaqat-${mosque.mosque_id}`,
          severity: "info",
          icon: CircleOff,
          title: `${mosque.mosque_name} معطل`,
          description: `المسجد معطل وما زال مرتبطًا بـ ${number(mosque.halaqat_count)} حلقة.` ,
          actionLabel: "عرض المسجد",
          action: () => setActiveView("mosques"),
        });
      });

    return rows;
  }, [mosques, supervisors, invites]);

  const attentionCount =
    alerts.length + openSupportRequests.length;

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  function goTo(view) {
    setActiveView(view);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return <SystemAdminLoading />;
  }

  if (pageError) {
    return (
      <div className="sa-fatal-page" dir="rtl">
        <div className="sa-fatal-card">
          <div className="sa-fatal-icon"><ShieldCheck /></div>
          <h1>تعذر فتح مركز مدير النظام</h1>
          <p>{pageError}</p>
          <button type="button" onClick={() => loadEverything()}><RefreshCw /> إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-app" dir="rtl">
      <div
        className={`sa-mobile-overlay ${mobileOpen ? "is-visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sa-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="sa-brand">
          <div className="sa-brand-mark">
            <img src="/icon-512.png" alt="الصديق" />
          </div>
          <div>
            <strong>الصِّديق</strong>
            <span>مركز مدير النظام</span>
          </div>
          <button type="button" className="sa-mobile-close" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة">
            <X />
          </button>
        </div>

        <div className="sa-role-card">
          <span className="sa-role-icon"><ShieldCheck /></span>
          <div>
            <strong>{adminProfile?.full_name || "مدير النظام"}</strong>
            <small>{adminProfile?.user_number || "صلاحية كاملة"}</small>
          </div>
          <span className="sa-live-dot" title="الحساب نشط" />
        </div>

        <nav className="sa-nav">
          <span className="sa-nav-title">مركز القيادة</span>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button type="button"
                key={item.id}
                className={`sa-nav-item ${activeView === item.id ? "is-active" : ""}`}
                onClick={() => goTo(item.id)}
              >
                <span className="sa-nav-item-icon"><Icon /></span>
                <span>{item.label}</span>
                {item.id === "alerts" && attentionCount > 0 && (
                  <em className="sa-nav-badge">{attentionCount > 99 ? "99+" : attentionCount}</em>
                )}
                {activeView === item.id && <ChevronLeft className="sa-nav-arrow" />}
              </button>
            );
          })}
        </nav>

        <div className="sa-sidebar-footer">
          <div className="sa-security-note">
            <ShieldCheck />
            <div>
              <strong>إدارة محمية</strong>
              <span>العمليات الحساسة محمية بصلاحيات إضافية.</span>
            </div>
          </div>
          <button type="button" className="sa-signout" onClick={signOut}><LogOut /> تسجيل الخروج</button>
        </div>
      </aside>

      <main className="sa-main">
        <header className="sa-topbar">
          <div className="sa-topbar-start">
            <button type="button" className="sa-menu-btn" onClick={() => setMobileOpen(true)}><Menu /></button>
            <div>
              <span className="sa-topbar-eyebrow"><Sparkles /> إدارة عليا للنظام</span>
              <h1>{NAV_ITEMS.find((item) => item.id === activeView)?.label}</h1>
            </div>
          </div>

          <div className="sa-topbar-actions">
            <div className="sa-date-block">
              <strong>{formatGregorianToday()}</strong>
              <span>{formatHijriToday()}</span>
            </div>
            <button type="button"
              className="sa-icon-button"
              onClick={() => loadEverything({ silent: true })}
              disabled={refreshing}
              title="تحديث البيانات"
            >
              <RefreshCw className={refreshing ? "sa-spin" : ""} />
            </button>
            <button type="button" className="sa-alert-button" onClick={() => goTo("alerts")}>
              <BellRing />
              {attentionCount > 0 && <span>{attentionCount > 99 ? "99+" : attentionCount}</span>}
            </button>
          </div>
        </header>

        <div className="sa-content">
          {activeView === "dashboard" && (
            <DashboardView
              dashboard={dashboard}
              mosques={mosques}
              supervisors={supervisors}
              invites={invites}
              alerts={alerts}
              auditLogs={auditLogs}
              goTo={goTo}
            />
          )}

          {activeView === "mosques" && (
            <MosquesView
              mosques={mosques}
              notify={notify}
              reload={() => loadEverything({ silent: true })}
            />
          )}

          {activeView === "supervisors" && (
            <SupervisorsView
              supervisors={supervisors}
              mosques={mosques}
              notify={notify}
              reload={() => loadEverything({ silent: true })}
            />
          )}

          {activeView === "invites" && (
            <InvitesView
              invites={invites}
              mosques={mosques}
              notify={notify}
              reload={() => loadEverything({ silent: true })}
            />
          )}

          {activeView === "users" && (
            <UsersView
              users={users}
              notify={notify}
              reload={() => loadEverything({ silent: true })}
              currentAdminId={adminProfile?.id}
            />
          )}

          {activeView === "alerts" && (
            <AlertsView
              alerts={alerts}
              supportRequests={supportRequests}
              goTo={goTo}
              notify={notify}
              reload={() => loadEverything({ silent: true })}
            />
          )}

          {activeView === "audit" && <AuditView logs={auditLogs} />}

          {activeView === "security" && <OwnerSecurityView notify={notify} />}

          {activeView === "settings" && <SettingsView />}
        </div>
      </main>

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function SystemAdminLoading() {
  return (
    <div className="sa-loading-page" dir="rtl">
      <div className="sa-loading-logo"><img src="/icon-512.png" alt="الصديق" /></div>
      <Loader2 className="sa-spin" />
      <strong>جاري تجهيز مركز مدير النظام</strong>
      <span>نحمّل المساجد والمشرفين والدعوات وسجل العمليات…</span>
    </div>
  );
}

function DashboardView({ dashboard, mosques, supervisors, invites, alerts, auditLogs, goTo }) {
  const kpis = [
    {
      label: "المساجد",
      value: number(dashboard?.total_mosques),
      meta: `${number(dashboard?.active_mosques)} نشط • ${number(dashboard?.inactive_mosques)} معطل`,
      icon: Building2,
      accent: "emerald",
      onClick: () => goTo("mosques"),
    },
    {
      label: "المشرفون",
      value: number(dashboard?.total_supervisors),
      meta: `${number(dashboard?.supervisors_without_mosque)} بلا مسجد`,
      icon: ShieldCheck,
      accent: "gold",
      onClick: () => goTo("supervisors"),
    },
    {
      label: "الحلقات النشطة",
      value: number(dashboard?.active_halaqat),
      meta: "على مستوى جميع المساجد",
      icon: BookOpen,
      accent: "blue",
    },
    {
      label: "الطلاب",
      value: number(dashboard?.total_students),
      meta: `${number(dashboard?.total_teachers)} معلم في النظام`,
      icon: GraduationCap,
      accent: "violet",
      onClick: () => goTo("users"),
    },
  ];

  const activeInvites = invites.filter((invite) => invite.invite_status === "active").length;

  const operationalMosques = mosques.filter(
    (mosque) => mosque.mosque_status !== "archived"
  );
  const supervisedMosques = operationalMosques.filter(
    (mosque) => number(mosque.supervisors_count) > 0
  );
  const supervisionCoverage =
    operationalMosques.length > 0
      ? Math.round((supervisedMosques.length / operationalMosques.length) * 100)
      : 100;

  const systemState =
    alerts.some((alert) => alert.severity === "danger")
      ? "يحتاج متابعة"
      : alerts.length > 0
        ? "مستقر مع ملاحظات"
        : "مستقر";

  return (
    <div className="sa-view-stack">
      <section className="sa-hero">
        <OrnamentScene primary="03-falak" pattern />
        <div className="sa-hero-copy">
          <span className="sa-hero-kicker"><ShieldCheck /> مركز القيادة المركزي</span>
          <h2>مركز قيادة واحد للمساجد والمشرفين.</h2>
          <p>
            راقب حالة المنظومة، فعّل أو عطّل المساجد، اربط عدة مشرفين بعدة مساجد،
            وأدر دعوات المشرفين والعمليات الحساسة من مكان واحد واضح.
          </p>
          <div className="sa-hero-actions">
            <button type="button" className="sa-btn sa-btn-gold" onClick={() => goTo("mosques")}><Building2 /> إدارة المساجد</button>
            <button type="button" className="sa-btn sa-btn-ghost-light" onClick={() => goTo("supervisors")}><Link2 /> إدارة الربط</button>
          </div>
        </div>

        <div className="sa-hero-command">
          <div className="sa-command-top">
            <span>حالة المنظومة</span>
            <strong className="sa-system-online"><CheckCircle2 /> {systemState}</strong>
          </div>
          <div className="sa-command-score">
            <strong>{supervisionCoverage}%</strong>
            <span>تغطية الإشراف على المساجد غير المؤرشفة</span>
          </div>
          <div className="sa-command-grid">
            <div><strong>{number(dashboard?.mosques_without_supervisor)}</strong><span>مساجد بلا مشرف</span></div>
            <div><strong>{number(dashboard?.supervisors_without_mosque)}</strong><span>مشرفون بلا مسجد</span></div>
            <div><strong>{activeInvites}</strong><span>دعوات صالحة</span></div>
          </div>
        </div>
      </section>

      <section className="sa-kpi-grid">
        {kpis.map((item) => <KpiCard key={item.label} {...item} />)}
      </section>

      <section className="sa-dashboard-grid">
        <div className="sa-panel sa-panel-attention">
          <PanelHeader
            eyebrow="المتابعة الفورية"
            title="يحتاج إلى انتباهك"
            description="الحالات التي تستحق إجراءً إداريًا الآن."
            action={<button type="button" className="sa-text-button" onClick={() => goTo("alerts")}>عرض الكل <ChevronLeft /></button>}
          />

          <div className="sa-attention-list">
            {alerts.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="لا توجد حالات حرجة" description="كل العلاقات الأساسية مستقرة حاليًا." compact />
            ) : (
              alerts.slice(0, 5).map((alert) => <AlertRow key={alert.id} alert={alert} />)
            )}
          </div>
        </div>

        <div className="sa-panel">
          <PanelHeader
            eyebrow="الوصول السريع"
            title="عمليات مدير النظام"
            description="أكثر الإجراءات استخدامًا في المركز."
          />
          <div className="sa-quick-grid">
            <QuickAction icon={Building2} title="المساجد" text="تفعيل وتعطيل وأرشفة" onClick={() => goTo("mosques")} />
            <QuickAction icon={UserRoundCheck} title="ربط المشرفين" text="ربط متعدد من الطرفين" onClick={() => goTo("supervisors")} />
            <QuickAction icon={KeyRound} title="دعوة مشرف" text="رمز آمن لمرة واحدة" onClick={() => goTo("invites")} />
            <QuickAction icon={Users} title="المستخدمون" text="الحسابات والحالات" onClick={() => goTo("users")} />
          </div>
        </div>
      </section>

      <section className="sa-dashboard-grid sa-dashboard-grid-bottom">
        <div className="sa-panel">
          <PanelHeader
            eyebrow="توزيع المساجد"
            title="الحالة التشغيلية"
            description="نظرة سريعة على وضع جميع المساجد."
          />
          <div className="sa-status-bars">
            <StatusBar label="نشط" value={number(dashboard?.active_mosques)} total={number(dashboard?.total_mosques)} tone="success" />
            <StatusBar label="معطل" value={number(dashboard?.inactive_mosques)} total={number(dashboard?.total_mosques)} tone="warning" />
            <StatusBar label="مؤرشف" value={number(dashboard?.archived_mosques)} total={number(dashboard?.total_mosques)} tone="neutral" />
          </div>
          <div className="sa-mini-mosques">
            {mosques.slice(0, 4).map((mosque) => (
              <div key={mosque.mosque_id}>
                <span className="sa-mini-icon"><Building2 /></span>
                <div><strong>{mosque.mosque_name}</strong><small>{number(mosque.supervisors_count)} مشرف • {number(mosque.halaqat_count)} حلقة</small></div>
                <StatusPill type="mosque" value={mosque.mosque_status} />
              </div>
            ))}
          </div>
        </div>

        <div className="sa-panel">
          <PanelHeader
            eyebrow="الشفافية الإدارية"
            title="آخر العمليات"
            description="أحدث التغييرات الحساسة المسجلة."
            action={<button type="button" className="sa-text-button" onClick={() => goTo("audit")}>سجل العمليات <ChevronLeft /></button>}
          />
          <div className="sa-activity-list">
            {auditLogs.length === 0 ? (
              <EmptyState icon={Activity} title="لا توجد عمليات مسجلة بعد" description="ستظهر العمليات الإدارية هنا تلقائيًا." compact />
            ) : (
              auditLogs.slice(0, 6).map((log) => <AuditRow key={log.log_id} log={log} compact />)
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, meta, icon: Icon, accent, onClick }) {
  return (
    <button type="button" className={`sa-kpi-card sa-accent-${accent}`} onClick={onClick} disabled={!onClick}>
      <span className="sa-kpi-icon"><Icon /></span>
      <div className="sa-kpi-copy">
        <span>{label}</span>
        <strong>{value.toLocaleString("ar-SA")}</strong>
        <small>{meta}</small>
      </div>
      {onClick && <ChevronLeft className="sa-kpi-arrow" />}
    </button>
  );
}

function StatusBar({ label, value, total, tone }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="sa-status-bar">
      <div><strong>{label}</strong><span>{value} من {total}</span></div>
      <div className="sa-status-track"><span className={`sa-status-fill tone-${tone}`} style={{ width: `${percent}%` }} /></div>
      <em>{percent}%</em>
    </div>
  );
}

function QuickAction({ icon: Icon, title, text, onClick }) {
  return (
    <button type="button" className="sa-quick-action" onClick={onClick}>
      <span><Icon /></span>
      <div><strong>{title}</strong><small>{text}</small></div>
      <ChevronLeft />
    </button>
  );
}

function MosquesView({ mosques, notify, reload }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusModal, setStatusModal] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    section: "men",
    address: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mosques.filter((mosque) => {
      const sectionLabel = mosque.mosque_section === "women" ? "نساء" : "رجال";
      const matchSearch =
        !q ||
        `${mosque.mosque_name || ""} ${mosque.mosque_address || ""} ${sectionLabel}`
          .toLowerCase()
          .includes(q);
      const matchStatus = filter === "all" || mosque.mosque_status === filter;
      const matchSection =
        sectionFilter === "all" || mosque.mosque_section === sectionFilter;
      return matchSearch && matchStatus && matchSection;
    });
  }, [mosques, search, filter, sectionFilter]);

  function requestStatus(mosque, targetStatus) {
    setStatusModal({ mosque, targetStatus, reason: "" });
  }

  function openCreate() {
    setCreateForm({
      name: "",
      section: "men",
      address: "",
      notes: "",
    });
    setCreateOpen(true);
  }

  async function createMosque() {
    const name = createForm.name.trim();
    if (!name) {
      notify("اكتب اسم المسجد أولًا.", "error");
      return;
    }

    if (!["men", "women"].includes(createForm.section)) {
      notify("اختر قسم المسجد: رجال أو نساء.", "error");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("system_admin_create_mosque", {
        p_name: name,
        p_section: createForm.section,
        p_address: createForm.address.trim() || null,
        p_notes: createForm.notes.trim() || null,
      });

      if (error) throw error;

      notify(
        `تم إنشاء ${name} — ${createForm.section === "women" ? "نساء" : "رجال"} بنجاح.`
      );
      setCreateOpen(false);
      await reload();
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function applyStatus() {
    if (!statusModal) return;
    if (
      ["inactive", "archived"].includes(statusModal.targetStatus) &&
      !statusModal.reason.trim()
    ) {
      notify("اكتب سبب التعطيل أو الأرشفة أولًا.", "error");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("set_system_admin_mosque_status", {
        p_mosque_id: statusModal.mosque.mosque_id,
        p_status: statusModal.targetStatus,
        p_reason: statusModal.reason.trim() || null,
      });
      if (error) throw error;
      notify(
        statusModal.targetStatus === "active"
          ? "تم تفعيل المسجد بنجاح."
          : statusModal.targetStatus === "inactive"
            ? "تم تعطيل المسجد مع حفظ جميع بياناته."
            : "تمت أرشفة المسجد بنجاح."
      );
      setStatusModal(null);
      await reload();
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sa-view-stack">
      <SectionHero
        eyebrow="إدارة دورة حياة المسجد"
        title="المساجد"
        description="أنشئ أقسام الرجال والنساء كسجلات مستقلة، ثم فعّل أو عطّل أو أرشف كل قسم دون حذف تاريخه."
        icon={Building2}
        action={
          <button type="button" className="sa-btn sa-btn-primary" onClick={openCreate}>
            <Plus /> إنشاء مسجد
          </button>
        }
      />

      <div className="sa-summary-strip">
        <SummaryChip label="إجمالي" value={mosques.length} />
        <SummaryChip
          label="رجال"
          value={mosques.filter((m) => m.mosque_section === "men").length}
          tone="info"
        />
        <SummaryChip
          label="نساء"
          value={mosques.filter((m) => m.mosque_section === "women").length}
          tone="gold"
        />
        <SummaryChip
          label="نشط"
          value={mosques.filter((m) => m.mosque_status === "active").length}
          tone="success"
        />
        <SummaryChip
          label="بلا مشرف"
          value={
            mosques.filter(
              (m) =>
                m.mosque_status !== "archived" &&
                number(m.supervisors_count) === 0
            ).length
          }
          tone="danger"
        />
      </div>

      <section className="sa-panel">
        <div className="sa-toolbar">
          <div className="sa-search">
            <Search />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المسجد أو العنوان أو القسم…"
            />
          </div>

          <div className="sa-mosque-toolbar-filters">
            <select
              className="sa-compact-select"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
            >
              <option value="all">كل الأقسام</option>
              <option value="men">رجال</option>
              <option value="women">نساء</option>
            </select>

            <div className="sa-filter-tabs">
              {[
                { id: "all", label: "الكل" },
                { id: "active", label: "نشط" },
                { id: "inactive", label: "معطل" },
                { id: "archived", label: "مؤرشف" },
              ].map((item) => (
                <button type="button"
                  key={item.id}
                  className={filter === item.id ? "is-active" : ""}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>المسجد</th>
                <th>القسم</th>
                <th>الحالة</th>
                <th>المشرفون</th>
                <th>الحلقات</th>
                <th>الطلاب الحاليون</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mosque) => (
                <tr key={mosque.mosque_id}>
                  <td>
                    <EntityCell
                      icon={Building2}
                      title={mosque.mosque_name}
                      subtitle={mosque.mosque_address || "لم يحدد العنوان"}
                    />
                  </td>
                  <td>
                    <span
                      className={`sa-section-pill ${
                        mosque.mosque_section === "women"
                          ? "is-women"
                          : "is-men"
                      }`}
                    >
                      {mosque.mosque_section === "women" ? "نساء" : "رجال"}
                    </span>
                  </td>
                  <td>
                    <StatusPill type="mosque" value={mosque.mosque_status} />
                  </td>
                  <td>
                    <strong
                      className={
                        number(mosque.supervisors_count) === 0
                          ? "sa-danger-text"
                          : ""
                      }
                    >
                      {number(mosque.supervisors_count)}
                    </strong>
                  </td>
                  <td>{number(mosque.halaqat_count)}</td>
                  <td>{number(mosque.current_students_count)}</td>
                  <td>
                    <div className="sa-row-actions">
                      {mosque.mosque_status !== "active" && (
                        <button type="button"
                          className="sa-action-success"
                          title="إعادة تفعيل المسجد"
                          onClick={() => requestStatus(mosque, "active")}
                        >
                          <CheckCircle2 /> تفعيل
                        </button>
                      )}
                      {mosque.mosque_status === "active" && (
                        <button type="button"
                          className="sa-action-warning"
                          title="تعطيل المسجد مع الاحتفاظ ببياناته"
                          onClick={() => requestStatus(mosque, "inactive")}
                        >
                          <CircleOff /> تعطيل
                        </button>
                      )}
                      {mosque.mosque_status !== "archived" && (
                        <button type="button"
                          className="sa-action-neutral"
                          title="أرشفة المسجد مع حفظ السجل التاريخي"
                          onClick={() => requestStatus(mosque, "archived")}
                        >
                          <Archive /> أرشفة
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <EmptyState
              icon={Building2}
              title="لا توجد مساجد مطابقة"
              description="غيّر البحث أو الفلتر لعرض نتائج أخرى."
            />
          )}
        </div>
      </section>

      {createOpen && (
        <Modal
          title="إنشاء مسجد"
          subtitle="أنشئ قسم الرجال أو النساء كسجل مستقل داخل النظام."
          onClose={() => !saving && setCreateOpen(false)}
        >
          <Field label="اسم المسجد" required>
            <input
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="مثال: مسجد الصديق"
              autoFocus
            />
          </Field>

          <Field label="القسم" required>
            <div className="sa-section-choice">
              <button
                type="button"
                className={createForm.section === "men" ? "is-selected" : ""}
                onClick={() =>
                  setCreateForm((prev) => ({ ...prev, section: "men" }))
                }
              >
                <span className="sa-section-choice-mark">
                  {createForm.section === "men" && <Check />}
                </span>
                <div>
                  <strong>رجال</strong>
                  <small>حلقات ومعلمون وطلاب قسم الرجال</small>
                </div>
              </button>

              <button
                type="button"
                className={createForm.section === "women" ? "is-selected" : ""}
                onClick={() =>
                  setCreateForm((prev) => ({ ...prev, section: "women" }))
                }
              >
                <span className="sa-section-choice-mark">
                  {createForm.section === "women" && <Check />}
                </span>
                <div>
                  <strong>نساء</strong>
                  <small>حلقات ومعلمات وطالبات قسم النساء</small>
                </div>
              </button>
            </div>
          </Field>

          <Field label="العنوان">
            <input
              value={createForm.address}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="عنوان المسجد — اختياري"
            />
          </Field>

          <Field label="ملاحظات">
            <textarea
              rows={3}
              value={createForm.notes}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="ملاحظات إدارية — اختياري"
            />
          </Field>

          <div className="sa-callout info">
            يمكن استخدام نفس اسم المسجد مرتين، مثل «مسجد الصديق — رجال» و«مسجد
            الصديق — نساء». كل قسم سيكون له رقم مسجد مستقل وبيانات مستقلة.
          </div>

          <ModalActions
            onCancel={() => setCreateOpen(false)}
            onConfirm={createMosque}
            saving={saving}
            confirmLabel="إنشاء المسجد"
          />
        </Modal>
      )}

      {statusModal && (
        <Modal
          title={
            statusModal.targetStatus === "active"
              ? "تفعيل المسجد"
              : statusModal.targetStatus === "inactive"
                ? "تعطيل المسجد"
                : "أرشفة المسجد"
          }
          onClose={() => !saving && setStatusModal(null)}
        >
          <div className="sa-modal-entity">
            <span><Building2 /></span>
            <div>
              <strong>
                {statusModal.mosque.mosque_name} —{" "}
                {statusModal.mosque.mosque_section === "women" ? "نساء" : "رجال"}
              </strong>
              <small>{statusModal.mosque.mosque_address || "بدون عنوان"}</small>
            </div>
          </div>
          <div
            className={`sa-callout ${
              statusModal.targetStatus === "active" ? "success" : "warning"
            }`}
          >
            {statusModal.targetStatus === "active"
              ? "سيعود المسجد للظهور كمسجد نشط في النظام."
              : statusModal.targetStatus === "inactive"
                ? "لن نحذف أي بيانات. سيتم الاحتفاظ بتاريخ المسجد مع إيقاف حالته التشغيلية."
                : "الأرشفة مخصصة للمساجد التي انتهى نشاطها وتبقى بياناتها محفوظة تاريخيًا."}
          </div>
          {statusModal.targetStatus !== "active" && (
            <Field label="سبب الإجراء" required>
              <textarea
                value={statusModal.reason}
                onChange={(e) =>
                  setStatusModal((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="اكتب سببًا واضحًا لسجل العمليات…"
                rows={4}
              />
            </Field>
          )}
          <ModalActions
            onCancel={() => setStatusModal(null)}
            onConfirm={applyStatus}
            saving={saving}
            confirmLabel={
              statusModal.targetStatus === "active"
                ? "تفعيل المسجد"
                : statusModal.targetStatus === "inactive"
                  ? "تعطيل المسجد"
                  : "أرشفة المسجد"
            }
            danger={statusModal.targetStatus !== "active"}
          />
        </Modal>
      )}
    </div>
  );
}


function SupervisorsView({ supervisors, mosques, notify, reload }) {
  const [search, setSearch] = useState("");
  const [relationModal, setRelationModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return supervisors;
    return supervisors.filter((supervisor) => `${supervisor.full_name || ""} ${supervisor.user_number || ""} ${supervisor.phone || ""} ${(supervisor.mosque_names || []).join(" ")}`.toLowerCase().includes(q));
  }, [supervisors, search]);

  function openRelations(supervisor) {
    setRelationModal({
      supervisor,
      selected: new Set((supervisor.mosque_ids || []).map(Number)),
    });
  }

  function toggleMosque(mosqueId) {
    setRelationModal((prev) => {
      const selected = new Set(prev.selected);
      if (selected.has(Number(mosqueId))) selected.delete(Number(mosqueId));
      else selected.add(Number(mosqueId));
      return { ...prev, selected };
    });
  }

  async function saveRelations() {
    if (!relationModal) return;
    setSaving(true);
    try {
      const original = new Set((relationModal.supervisor.mosque_ids || []).map(Number));
      const selected = relationModal.selected;
      const toAdd = [...selected].filter((id) => !original.has(id));
      const toRemove = [...original].filter((id) => !selected.has(id));

      for (const mosqueId of toAdd) {
        const { error } = await supabase.rpc("link_system_admin_supervisor_mosque", {
          p_supervisor_id: relationModal.supervisor.supervisor_id,
          p_mosque_id: mosqueId,
        });
        if (error) throw error;
      }

      for (const mosqueId of toRemove) {
        const { error } = await supabase.rpc("unlink_system_admin_supervisor_mosque", {
          p_supervisor_id: relationModal.supervisor.supervisor_id,
          p_mosque_id: mosqueId,
        });
        if (error) throw error;
      }

      notify("تم تحديث ربط المشرف بالمساجد بنجاح.");
      setRelationModal(null);
      await reload();
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sa-view-stack">
      <SectionHero
        eyebrow="الربط المرن"
        title="المشرفون والربط"
        description="يمكن ربط المشرف بأكثر من مسجد، وربط المسجد بأكثر من مشرف."
        icon={ShieldCheck}
      />

      <div className="sa-summary-strip">
        <SummaryChip label="إجمالي المشرفين" value={supervisors.length} />
        <SummaryChip label="مرتبطون" value={supervisors.filter((s) => number(s.mosques_count) > 0).length} tone="success" />
        <SummaryChip label="بلا مسجد" value={supervisors.filter((s) => number(s.mosques_count) === 0).length} tone="warning" />
        <SummaryChip label="يديرون عدة مساجد" value={supervisors.filter((s) => number(s.mosques_count) > 1).length} tone="info" />
      </div>

      <section className="sa-panel">
        <div className="sa-toolbar">
          <div className="sa-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المشرف أو رقمه أو المسجد…" /></div>
        </div>

        <div className="sa-supervisor-grid">
          {filtered.map((supervisor) => (
            <article className="sa-supervisor-card" key={supervisor.supervisor_id}>
              <div className="sa-supervisor-card-top">
                <div className="sa-avatar"><ShieldCheck /></div>
                <div className="sa-supervisor-identity">
                  <strong>{supervisor.full_name || "مشرف بدون اسم"}</strong>
                  <span>{supervisor.user_number || `#${supervisor.supervisor_id}`}</span>
                </div>
                <StatusPill type="account" value={supervisor.is_active === false || supervisor.account_status !== "active" ? "inactive" : "active"} />
              </div>

              <div className="sa-supervisor-meta">
                <span>الجوال<strong>{supervisor.phone || "—"}</strong></span>
                <span>عدد المساجد<strong>{number(supervisor.mosques_count)}</strong></span>
              </div>

              <div className="sa-linked-mosques">
                <span className="sa-linked-label">المساجد المرتبطة</span>
                {number(supervisor.mosques_count) === 0 ? (
                  <div className="sa-no-link"><CircleOff /> لا يوجد مسجد مرتبط</div>
                ) : (
                  <div className="sa-chip-list">
                    {(supervisor.mosque_names || []).map((name, index) => <span key={`${name}-${index}`}><Building2 /> {name}</span>)}
                  </div>
                )}
              </div>

              <button type="button" className="sa-manage-link-btn" onClick={() => openRelations(supervisor)}><Link2 /> إدارة المساجد المرتبطة</button>
            </article>
          ))}
        </div>
        {filtered.length === 0 && <EmptyState icon={ShieldCheck} title="لا يوجد مشرفون مطابقون" description="جرّب كلمة بحث مختلفة." />}
      </section>

      {relationModal && (
        <Modal title="إدارة المساجد المرتبطة" subtitle="يمكن تحديد أكثر من مسجد للمشرف نفسه." onClose={() => !saving && setRelationModal(null)} wide>
          <div className="sa-modal-entity"><span><ShieldCheck /></span><div><strong>{relationModal.supervisor.full_name}</strong><small>{relationModal.supervisor.user_number} • تم اختيار {relationModal.selected.size} مسجد</small></div></div>

          <div className="sa-mosque-selector">
            {mosques.map((mosque) => {
              const disabled = mosque.mosque_status === "archived" && !relationModal.selected.has(Number(mosque.mosque_id));
              const selected = relationModal.selected.has(Number(mosque.mosque_id));
              return (
                <button
                  type="button"
                  key={mosque.mosque_id}
                  disabled={disabled}
                  className={`sa-mosque-option ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}
                  onClick={() => !disabled && toggleMosque(mosque.mosque_id)}
                >
                  <span className="sa-check-box">{selected && <Check />}</span>
                  <div><strong>{mosque.mosque_name}</strong><small>{mosque.mosque_address || "بدون عنوان"}</small></div>
                  <StatusPill type="mosque" value={mosque.mosque_status} />
                </button>
              );
            })}
          </div>

          <div className="sa-callout info">كل تغيير في الربط أو فك الربط يسجل تلقائيًا في سجل عمليات مدير النظام.</div>
          <ModalActions onCancel={() => setRelationModal(null)} onConfirm={saveRelations} saving={saving} confirmLabel="حفظ الربط" />
        </Modal>
      )}
    </div>
  );
}

function InvitesView({ invites, mosques, notify, reload }) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ mode: "existing", mosqueId: "", days: 7 });
  const [createdInvite, setCreatedInvite] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invites;
    return invites.filter((invite) => `${invite.code || ""} ${invite.mosque_name || ""} ${invite.used_by_name || ""}`.toLowerCase().includes(q));
  }, [invites, search]);

  async function createInvite() {
    if (createForm.mode === "existing" && !createForm.mosqueId) {
      notify("اختر المسجد الذي سيتم ربط المشرف به.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        p_mosque_id: createForm.mode === "existing" ? Number(createForm.mosqueId) : null,
        p_allow_create_mosque: createForm.mode === "founder",
        p_expires_in_days: Number(createForm.days),
      };
      const { data, error } = await supabase.rpc("create_system_admin_supervisor_invite", payload);
      if (error) throw error;
      const row = normalizeArray(data)[0];
      setCreatedInvite(row || null);
      notify("تم إنشاء دعوة المشرف بنجاح.");
      await reload();
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  function buildInviteMessage(code, expiresAt) {
    return `تمت دعوتك لإنشاء حساب مشرف في نظام الصِّديق.\n\nرمز التفعيل:\n${code}\n\nينتهي: ${formatDate(expiresAt, false)}\n\nرابط التسجيل: ${window.location.origin}/register`;
  }

  async function copyInvite(code, expiresAt) {
    const ok = await copyText(buildInviteMessage(code, expiresAt));
    notify(ok ? "تم نسخ رسالة الدعوة." : "تعذر النسخ من المتصفح.", ok ? "success" : "error");
  }

  function shareWhatsApp(code, expiresAt) {
    const text = encodeURIComponent(buildInviteMessage(code, expiresAt));
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  async function cancelInvite() {
    if (!cancelModal) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("cancel_system_admin_supervisor_invite", {
        p_invite_id: cancelModal.invite.invite_id,
        p_reason: cancelModal.reason.trim() || null,
      });
      if (error) throw error;
      notify("تم إلغاء الدعوة.");
      setCancelModal(null);
      await reload();
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sa-view-stack">
      <SectionHero
        eyebrow="بوابة التسجيل الآمن"
        title="دعوات المشرفين"
        description="أنشئ رمزًا لمرة واحدة، اربطه بمسجد قائم أو امنح المشرف صلاحية تأسيس مسجد جديد، ثم شاركه مباشرة."
        icon={KeyRound}
        action={<button type="button" className="sa-btn sa-btn-primary" onClick={() => { setCreateOpen(true); setCreatedInvite(null); }}><KeyRound /> إنشاء دعوة مشرف</button>}
      />

      <div className="sa-summary-strip">
        <SummaryChip label="كل الدعوات" value={invites.length} />
        <SummaryChip label="صالحة" value={invites.filter((i) => i.invite_status === "active").length} tone="success" />
        <SummaryChip label="مستخدمة" value={invites.filter((i) => i.invite_status === "used").length} tone="info" />
        <SummaryChip label="منتهية" value={invites.filter((i) => i.invite_status === "expired").length} tone="warning" />
        <SummaryChip label="ملغاة" value={invites.filter((i) => i.invite_status === "cancelled").length} tone="danger" />
      </div>

      <section className="sa-panel">
        <div className="sa-toolbar"><div className="sa-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالرمز أو المسجد أو المستخدم…" /></div></div>
        <div className="sa-invite-list">
          {filtered.map((invite) => (
            <article className="sa-invite-card" key={invite.invite_id}>
              <div className="sa-invite-code"><KeyRound /><div><strong>{invite.code}</strong><span>{invite.allow_create_mosque ? "مؤسس مسجد جديد" : invite.mosque_name ? `مرتبط بـ ${invite.mosque_name}` : "حساب مشرف بدون ربط أولي"}</span></div></div>
              <div className="sa-invite-data"><span>الحالة<StatusPill type="invite" value={invite.invite_status} /></span><span>الإنشاء<strong>{formatDate(invite.created_at)}</strong></span><span>الانتهاء<strong>{formatDate(invite.expires_at)}</strong></span>{invite.used_by_name && <span>استخدمها<strong>{invite.used_by_name}</strong></span>}</div>
              <div className="sa-invite-actions">
                <button type="button" onClick={() => copyInvite(invite.code, invite.expires_at)}><Copy /> نسخ الرسالة</button>
                <button type="button" onClick={() => shareWhatsApp(invite.code, invite.expires_at)}><MessageCircle /> واتساب</button>
                {invite.invite_status === "active" && <button type="button" className="danger" onClick={() => setCancelModal({ invite, reason: "" })}><XCircle /> إلغاء</button>}
              </div>
            </article>
          ))}
        </div>
        {filtered.length === 0 && <EmptyState icon={KeyRound} title="لا توجد دعوات" description="أنشئ أول دعوة مشرف من الزر بالأعلى." />}
      </section>

      {createOpen && (
        <Modal title="إنشاء دعوة مشرف" subtitle="حدد وظيفة الدعوة، وسيتم توليد رمز آمن لمرة واحدة." onClose={() => !saving && setCreateOpen(false)} wide>
          {!createdInvite ? (
            <>
              <div className="sa-invite-modes">
                <InviteMode active={createForm.mode === "existing"} icon={Building2} title="لمسجد قائم" text="بعد إنشاء الحساب سيتم ربط المشرف بهذا المسجد." onClick={() => setCreateForm((p) => ({ ...p, mode: "existing" }))} />
                <InviteMode active={createForm.mode === "founder"} icon={Sparkles} title="مؤسس مسجد جديد" text="يسمح للمشرف بإنشاء مسجد جديد بعد أول دخول." onClick={() => setCreateForm((p) => ({ ...p, mode: "founder", mosqueId: "" }))} />
                <InviteMode active={createForm.mode === "account"} icon={UserCheck} title="حساب فقط" text="ينشئ حساب مشرف، ثم تربطه أنت بالمساجد لاحقًا." onClick={() => setCreateForm((p) => ({ ...p, mode: "account", mosqueId: "" }))} />
              </div>

              {createForm.mode === "existing" && (
                <Field label="المسجد" required>
                  <select value={createForm.mosqueId} onChange={(e) => setCreateForm((p) => ({ ...p, mosqueId: e.target.value }))}>
                    <option value="">اختر المسجد…</option>
                    {mosques.filter((m) => m.mosque_status !== "archived").map((mosque) => <option key={mosque.mosque_id} value={mosque.mosque_id}>{mosque.mosque_name} — {MOSQUE_STATUS[mosque.mosque_status]?.label}</option>)}
                  </select>
                </Field>
              )}

              <Field label="مدة صلاحية الدعوة">
                <select value={createForm.days} onChange={(e) => setCreateForm((p) => ({ ...p, days: Number(e.target.value) }))}>
                  <option value={1}>يوم واحد</option><option value={3}>3 أيام</option><option value={7}>7 أيام</option><option value={14}>14 يومًا</option><option value={30}>30 يومًا</option>
                </select>
              </Field>

              <div className="sa-callout info">الرمز يستخدم مرة واحدة فقط. بعد إنشاء حساب المشرف لا يحتاج رمزًا جديدًا لإضافة مساجد أخرى.</div>
              <ModalActions onCancel={() => setCreateOpen(false)} onConfirm={createInvite} saving={saving} confirmLabel="إنشاء الدعوة" />
            </>
          ) : (
            <div className="sa-created-invite">
              <div className="sa-created-icon"><CheckCircle2 /></div>
              <span>تم إنشاء الدعوة</span>
              <strong>{createdInvite.invite_code}</strong>
              <small>صالحة حتى {formatDate(createdInvite.expires_at)}</small>
              <div className="sa-created-actions">
                <button type="button" className="sa-btn sa-btn-primary" onClick={() => copyInvite(createdInvite.invite_code, createdInvite.expires_at)}><Copy /> نسخ الرسالة</button>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => shareWhatsApp(createdInvite.invite_code, createdInvite.expires_at)}><MessageCircle /> مشاركة واتساب</button>
              </div>
              <button type="button" className="sa-text-button sa-center-text-button" onClick={() => setCreateOpen(false)}>إغلاق</button>
            </div>
          )}
        </Modal>
      )}

      {cancelModal && (
        <Modal title="إلغاء دعوة المشرف" onClose={() => !saving && setCancelModal(null)}>
          <div className="sa-modal-entity"><span><KeyRound /></span><div><strong>{cancelModal.invite.code}</strong><small>{cancelModal.invite.mosque_name || "دعوة بدون مسجد محدد"}</small></div></div>
          <Field label="سبب الإلغاء"><textarea rows={4} value={cancelModal.reason} onChange={(e) => setCancelModal((p) => ({ ...p, reason: e.target.value }))} placeholder="سبب اختياري يظهر في السجل…" /></Field>
          <ModalActions onCancel={() => setCancelModal(null)} onConfirm={cancelInvite} saving={saving} confirmLabel="إلغاء الدعوة" danger />
        </Modal>
      )}
    </div>
  );
}

function InviteMode({ active, icon: Icon, title, text, onClick }) {
  return (
    <button type="button" className={`sa-invite-mode ${active ? "is-active" : ""}`} onClick={onClick}>
      <span><Icon /></span><strong>{title}</strong><small>{text}</small>{active && <em><Check /></em>}
    </button>
  );
}

function UsersView({ users, notify, reload, currentAdminId }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [toggleModal, setToggleModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchRole = role === "all" || user.role === role;
      const matchSearch = !q || `${user.full_name || ""} ${user.user_number || ""} ${user.phone || ""}`.toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [users, search, role]);

  async function applyToggle() {
    if (!toggleModal) return;
    if (!toggleModal.targetActive && !toggleModal.reason.trim()) {
      notify("اكتب سبب تعطيل الحساب أولًا.", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("set_system_admin_user_active", {
        p_profile_id: toggleModal.user.profile_id,
        p_active: toggleModal.targetActive,
        p_reason: toggleModal.reason.trim() || null,
      });
      if (error) throw error;
      notify(toggleModal.targetActive ? "تم تفعيل الحساب." : "تم تعطيل الحساب.");
      setToggleModal(null);
      await reload();
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sa-view-stack">
      <SectionHero eyebrow="دليل الحسابات" title="المستخدمون" description="ابحث عن حسابات النظام وتابع أدوارها وحالتها، مع فصل واضح بين تعطيل المستخدم وتعطيل المسجد." icon={Users} />

      <div className="sa-summary-strip">
        <SummaryChip label="كل الحسابات" value={users.length} />
        <SummaryChip label="المشرفون" value={users.filter((u) => u.role === "supervisor").length} tone="info" />
        <SummaryChip label="المعلمون" value={users.filter((u) => u.role === "teacher").length} tone="success" />
        <SummaryChip label="الطلاب" value={users.filter((u) => u.role === "student").length} tone="gold" />
        <SummaryChip label="معطلون" value={users.filter((u) => u.is_active === false || u.account_status !== "active").length} tone="danger" />
      </div>

      <section className="sa-panel">
        <div className="sa-toolbar">
          <div className="sa-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو رقم الحساب أو الجوال…" /></div>
          <select className="sa-compact-select" value={role} onChange={(e) => setRole(e.target.value)}><option value="all">كل الأدوار</option><option value="admin">مديرو النظام</option><option value="supervisor">المشرفون</option><option value="teacher">المعلمون</option><option value="student">الطلاب</option></select>
        </div>

        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead><tr><th>الحساب</th><th>الدور</th><th>رقم المستخدم</th><th>الحالة</th><th>تاريخ الإنشاء</th><th>الإجراء</th></tr></thead>
            <tbody>
              {filtered.map((user) => {
                const active = user.is_active !== false && user.account_status === "active";
                const isSelf = Number(user.profile_id) === Number(currentAdminId);
                return (
                  <tr key={user.profile_id}>
                    <td><EntityCell icon={user.role === "student" ? GraduationCap : user.role === "supervisor" ? ShieldCheck : UserCog} title={user.full_name || "بدون اسم"} subtitle={user.phone || "بدون رقم جوال"} /></td>
                    <td><span className="sa-role-pill">{ROLE_LABELS[user.role] || user.role}</span></td>
                    <td><code className="sa-user-code">{user.user_number || "—"}</code></td>
                    <td><StatusPill type="account" value={active ? "active" : "inactive"} /></td>
                    <td>{formatDate(user.created_at, false)}</td>
                    <td>{isSelf ? <span className="sa-self-label"><ShieldCheck /> حسابك الحالي</span> : <button type="button" className={active ? "sa-action-warning" : "sa-action-success"} onClick={() => setToggleModal({ user, targetActive: !active, reason: "" })}>{active ? <><CircleOff /> تعطيل</> : <><CheckCircle2 /> تفعيل</>}</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState icon={Users} title="لا توجد حسابات مطابقة" description="غيّر البحث أو فلتر الدور." />}
        </div>
      </section>

      {toggleModal && (
        <Modal title={toggleModal.targetActive ? "تفعيل الحساب" : "تعطيل الحساب"} onClose={() => !saving && setToggleModal(null)}>
          <div className="sa-modal-entity"><span><UserCog /></span><div><strong>{toggleModal.user.full_name || "الحساب"}</strong><small>{ROLE_LABELS[toggleModal.user.role]} • {toggleModal.user.user_number || "بدون رقم"}</small></div></div>
          {!toggleModal.targetActive && <Field label="سبب التعطيل" required><textarea rows={4} value={toggleModal.reason} onChange={(e) => setToggleModal((p) => ({ ...p, reason: e.target.value }))} placeholder="السبب سيحفظ في سجل العمليات…" /></Field>}
          <ModalActions onCancel={() => setToggleModal(null)} onConfirm={applyToggle} saving={saving} confirmLabel={toggleModal.targetActive ? "تفعيل الحساب" : "تعطيل الحساب"} danger={!toggleModal.targetActive} />
        </Modal>
      )}
    </div>
  );
}

function AlertsView({ alerts, supportRequests, goTo, notify, reload }) {
  const [savingRequestId, setSavingRequestId] = useState(null);
  const openRequests = supportRequests.filter((item) => item.status === "open");
  const resolvedRequests = supportRequests.filter((item) => item.status === "resolved").slice(0, 12);

  async function resolveSupportRequest(requestId, resolved = true) {
    setSavingRequestId(requestId);

    try {
      const { error } = await supabase.rpc(
        "system_admin_resolve_support_request",
        {
          p_request_id: requestId,
          p_resolved: resolved,
        }
      );

      if (error) throw error;

      notify(
        resolved ? "تمت معالجة رسالة الزائر." : "تمت إعادة الرسالة إلى قائمة المتابعة."
      );
      await reload();
    } catch (error) {
      console.error("Support request update error:", error);
      notify(getErrorMessage(error), "error");
    } finally {
      setSavingRequestId(null);
    }
  }

  function openWhatsApp(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return;

    window.open(
      `https://wa.me/${digits}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="sa-view-stack">
      <SectionHero
        eyebrow="مركز القرار والتواصل"
        title="مركز التنبيهات"
        description="يجمع الحالات التشغيلية ورسائل زوار الموقع في مكان واحد حتى لا يضيع أي طلب يحتاج متابعة."
        icon={BellRing}
      />

      <section className="sa-panel sa-support-panel">
        <PanelHeader
          eyebrow="رسائل الموقع"
          title="طلبات التواصل من المساعد الذكي"
          description={`${openRequests.length} رسالة مفتوحة تحتاج متابعة`}
        />

        <div className="sa-support-list">
          {openRequests.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="لا توجد رسائل جديدة"
              description="أي رسالة تُرسل من المساعد في الصفحة الرئيسية ستظهر هنا مباشرة."
              compact
            />
          ) : (
            openRequests.map((request) => (
              <article className="sa-support-card is-open" key={request.request_id}>
                <span className="sa-support-avatar">
                  <MessageCircle />
                </span>

                <div className="sa-support-copy">
                  <div className="sa-support-title-row">
                    <div>
                      <strong>{request.visitor_name || "زائر الموقع"}</strong>
                      <span>{formatDate(request.created_at)}</span>
                    </div>
                    <em>جديد</em>
                  </div>

                  <p>{request.message}</p>

                  <div className="sa-support-meta">
                    <span>
                      <Phone />
                      {request.whatsapp}
                    </span>
                    <span>
                      <Sparkles />
                      المساعد الذكي
                    </span>
                  </div>
                </div>

                <div className="sa-support-actions">
                  <button
                    type="button"
                    className="sa-support-whatsapp"
                    onClick={() => openWhatsApp(request.whatsapp)}
                  >
                    <MessageCircle />
                    رد عبر واتساب
                  </button>

                  <button
                    type="button"
                    className="sa-support-resolve"
                    onClick={() => resolveSupportRequest(request.request_id, true)}
                    disabled={savingRequestId === request.request_id}
                  >
                    {savingRequestId === request.request_id ? (
                      <Loader2 className="sa-spin" />
                    ) : (
                      <CheckCircle2 />
                    )}
                    تمت المعالجة
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {resolvedRequests.length > 0 && (
          <details className="sa-support-resolved">
            <summary>
              آخر الرسائل المعالجة
              <span>{resolvedRequests.length}</span>
            </summary>

            <div className="sa-support-resolved-list">
              {resolvedRequests.map((request) => (
                <article className="sa-support-card is-resolved" key={request.request_id}>
                  <span className="sa-support-avatar">
                    <CheckCircle2 />
                  </span>

                  <div className="sa-support-copy">
                    <div className="sa-support-title-row">
                      <div>
                        <strong>{request.visitor_name || "زائر الموقع"}</strong>
                        <span>{formatDate(request.created_at)}</span>
                      </div>
                      <em>تمت المعالجة</em>
                    </div>

                    <p>{request.message}</p>

                    <div className="sa-support-meta">
                      <span><Phone />{request.whatsapp}</span>
                    </div>
                  </div>

                  <div className="sa-support-actions">
                    <button
                      type="button"
                      className="sa-support-whatsapp"
                      onClick={() => openWhatsApp(request.whatsapp)}
                    >
                      <MessageCircle />
                      واتساب
                    </button>

                    <button
                      type="button"
                      className="sa-action-neutral"
                      onClick={() => resolveSupportRequest(request.request_id, false)}
                      disabled={savingRequestId === request.request_id}
                    >
                      إعادة للمتابعة
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="sa-panel">
        <PanelHeader
          eyebrow="التشغيل"
          title="تنبيهات المنظومة"
          description={`${alerts.length} حالة تشغيلية تحتاج مراجعة`}
        />

        <div className="sa-attention-list">
          {alerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="النظام هادئ حاليًا"
              description="لا توجد حالات تشغيلية تتطلب تدخل مدير النظام."
              compact
            />
          ) : (
            alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)
          )}
        </div>
      </section>

      <div className="sa-alert-footer">
        <button type="button" className="sa-btn sa-btn-secondary" onClick={() => goTo("dashboard")}>
          <LayoutDashboard />
          العودة للوحة القيادة
        </button>
      </div>
    </div>
  );
}

function AuditView({ logs }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => `${ACTION_LABELS[log.action] || log.action} ${log.actor_name || ""} ${JSON.stringify(log.details || {})}`.toLowerCase().includes(q));
  }, [logs, search]);

  return (
    <div className="sa-view-stack">
      <SectionHero eyebrow="Audit Trail" title="سجل العمليات" description="كل عملية حساسة من ربط أو فك ربط أو تعطيل أو دعوة تُسجل مع منفذها ووقتها." icon={ClipboardList} />
      <section className="sa-panel">
        <div className="sa-toolbar"><div className="sa-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في العمليات أو اسم المنفذ…" /></div></div>
        <div className="sa-audit-list">
          {filtered.map((log) => <AuditRow key={log.log_id} log={log} />)}
          {filtered.length === 0 && <EmptyState icon={ClipboardList} title="لا توجد عمليات مطابقة" description="سيظهر هنا تاريخ الإجراءات الإدارية الحساسة." />}
        </div>
      </section>
    </div>
  );
}

function AuditRow({ log, compact = false }) {
  const label = ACTION_LABELS[log.action] || log.action;
  const details = log.details || {};
  const detailText = details.mosque_name
    ? details.supervisor_name
      ? `${details.supervisor_name} • ${details.mosque_name}`
      : details.mosque_name
    : details.full_name || details.code || details.supervisor_name || "عملية إدارية";

  return (
    <div className={`sa-audit-row ${compact ? "is-compact" : ""}`}>
      <span className="sa-audit-icon"><Activity /></span>
      <div className="sa-audit-copy"><strong>{label}</strong><span>{detailText}</span>{!compact && <small>بواسطة {log.actor_name || "مدير النظام"}{log.actor_user_number ? ` • ${log.actor_user_number}` : ""}</small>}</div>
      <time>{formatDate(log.created_at)}</time>
    </div>
  );
}

function OwnerSecurityView({ notify }) {
  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [passkeys, setPasskeys] = useState([]);
  const [aal, setAal] = useState({ currentLevel: "unknown", nextLevel: "unknown" });
  const [securityError, setSecurityError] = useState("");

  const webauthnSupported =
    typeof window !== "undefined" &&
    Boolean(window.PublicKeyCredential && navigator.credentials);

  useEffect(() => {
    loadOwnerSecurity();
  }, []);

  async function loadOwnerSecurity() {
    setLoadingSecurity(true);
    setSecurityError("");

    try {
      const [{ data: passkeyRows, error: passkeyError }, { data: aalData, error: aalError }] =
        await Promise.all([
          supabase.auth.passkey.list(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);

      if (passkeyError && passkeyError.code !== "passkey_disabled") throw passkeyError;
      if (aalError) throw aalError;

      setPasskeys(Array.isArray(passkeyRows) ? passkeyRows : passkeyRows?.passkeys || []);
      setAal({
        currentLevel: aalData?.currentLevel || "aal1",
        nextLevel: aalData?.nextLevel || aalData?.currentLevel || "aal1",
      });

      if (passkeyError?.code === "passkey_disabled") {
        setSecurityError(
          "دخول البصمة غير مفعّل بعد. فعّله من إعدادات الأمان ثم عد لتسجيل بصمة المالك."
        );
      }
    } catch (error) {
      console.error("Owner security load error:", error);
      setSecurityError("تعذر تحميل حالة الحماية.");
    } finally {
      setLoadingSecurity(false);
    }
  }

  async function registerOwnerPasskey() {
    if (!webauthnSupported || registering) return;
    setRegistering(true);
    setSecurityError("");

    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) {
        if (error.code === "passkey_disabled") {
          throw new Error("فعّل دخول البصمة أولًا من إعدادات الأمان.");
        }
        throw error;
      }
      notify("تم تسجيل مفتاح مرور للمالك بنجاح.", "success");
      await loadOwnerSecurity();
    } catch (error) {
      console.error("Owner passkey registration error:", error);
      setSecurityError("تعذر تسجيل بصمة المالك.");
    } finally {
      setRegistering(false);
    }
  }

  async function deleteOwnerPasskey(passkeyId) {
    if (!passkeyId) return;
    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId });
      if (error) throw error;
      notify("تم إلغاء مفتاح المرور.", "success");
      await loadOwnerSecurity();
    } catch (error) {
      console.error("Owner passkey delete error:", error);
      setSecurityError("تعذر إلغاء وسيلة الدخول.");
    }
  }

  return (
    <div className="sa-view-stack">
      <SectionHero
        eyebrow="حماية المالك"
        title="خزنة المالك"
        description="حماية قوية باستخدام بصمة الجهاز أو Face ID أو Windows Hello أو مفتاح أمني."
        icon={Fingerprint}
        action={
          <button
            type="button"
            className="sa-primary-btn"
            onClick={registerOwnerPasskey}
            disabled={!webauthnSupported || registering}
          >
            {registering ? <Loader2 className="sa-spin" /> : <Fingerprint />}
            تسجيل بصمة
          </button>
        }
      />

      {securityError && <div className="sa-callout warning">{securityError}</div>}

      <div className="sa-owner-security-grid">
        <article className="sa-owner-security-card">
          <span className="sa-owner-security-icon"><Fingerprint /></span>
          <div>
            <small>دعم الجهاز</small>
            <strong>{webauthnSupported ? "جاهز للاستخدام" : "غير مدعوم"}</strong>
            <p>{webauthnSupported ? "يمكن استخدام بصمة أو وجه أو رمز الجهاز أو مفتاح أمني." : "استخدم متصفحًا حديثًا وجهازًا يدعم تسجيل الدخول الآمن."}</p>
          </div>
        </article>
        <article className="sa-owner-security-card">
          <span className="sa-owner-security-icon"><ShieldCheck /></span>
          <div>
            <small>مستوى الجلسة</small>
            <strong>{aal.currentLevel === "aal2" ? "تحقق ثنائي" : "تحقق أساسي"}</strong>
            <p>يوضح مستوى حماية جلسة المالك الحالية.</p>
          </div>
        </article>
        <article className="sa-owner-security-card">
          <span className="sa-owner-security-icon"><KeyRound /></span>
          <div>
            <small>الحاجز النهائي</small>
            <strong>حماية متعددة الطبقات</strong>
            <p>تُراجع صلاحيات العمليات الحساسة قبل تنفيذها.</p>
          </div>
        </article>
      </div>

      <section className="sa-panel">
        <PanelHeader
          eyebrow="المفاتيح المسجلة"
          title="أجهزة المالك الموثوقة"
          description="راجع الأجهزة ووسائل الدخول الموثوقة المرتبطة بحساب المالك."
          action={
            <button type="button" className="sa-ghost-btn" onClick={loadOwnerSecurity} disabled={loadingSecurity}>
              <RefreshCw className={loadingSecurity ? "sa-spin" : ""} /> تحديث
            </button>
          }
        />
        {loadingSecurity ? (
          <div className="sa-owner-security-loading"><Loader2 className="sa-spin" /> جارٍ التحقق…</div>
        ) : passkeys.length ? (
          <div className="sa-owner-passkeys">
            {passkeys.map((item) => (
              <div className="sa-owner-passkey" key={item.id}>
                <span><Laptop /></span>
                <div>
                  <strong>{item.friendly_name || item.friendlyName || "مفتاح مرور"}</strong>
                  <small>أضيف {formatDate(item.created_at || item.createdAt, false)}{item.last_used_at ? ` • آخر استخدام ${formatDate(item.last_used_at, false)}` : ""}</small>
                </div>
                <button type="button" onClick={() => deleteOwnerPasskey(item.id)} title="إلغاء هذا المفتاح">
                  <Trash2 />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Fingerprint} title="لا توجد بصمة مسجلة بعد" description="سجّل الجهاز الأساسي، ويفضل إضافة جهاز احتياطي موثوق." compact />
        )}
      </section>

      <div className="sa-callout info">
        قبل فرض البصمة على الحساب، سجّل وسيلتي دخول موثوقتين على الأقل لتجنب فقدان الوصول.
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="sa-view-stack">
      <SectionHero eyebrow="سياسات الإدارة" title="إعدادات النظام" description="إدارة السياسات العامة للنظام." icon={Settings} />
      <div className="sa-settings-grid">
        <article className="sa-setting-card"><span><KeyRound /></span><div><strong>سياسة دعوات المشرفين</strong><p>الحالي: رمز لمرة واحدة، بمدة صلاحية من 1 إلى 90 يومًا، ويمكن ربطه بمسجد أو جعله دعوة تأسيس.</p></div><em>مفعّل</em></article>
        <article className="sa-setting-card"><span><ShieldCheck /></span><div><strong>العمليات الحساسة</strong><p>الربط والتعطيل والدعوات تخضع لصلاحيات مدير النظام.</p></div><em>محمي</em></article>
        <article className="sa-setting-card"><span><Building2 /></span><div><strong>دورة حياة المسجد</strong><p>نشط، معطل، مؤرشف. لا يتم حذف البيانات التاريخية عند التعطيل أو الأرشفة.</p></div><em>معتمد</em></article>
        <article className="sa-setting-card"><span><Link2 /></span><div><strong>علاقة المشرف بالمسجد</strong><p>يمكن ربط المشرف بعدة مساجد وربط المسجد بعدة مشرفين.</p></div><em>معتمد</em></article>
      </div>
      <div className="sa-callout info">تظهر هنا الإعدادات العامة المؤثرة على إدارة النظام.</div>
    </div>
  );
}

function SectionHero({ eyebrow, title, description, icon: Icon, action }) {
  return (
    <section className="sa-section-hero">
      <div className="sa-section-hero-icon"><Icon /></div>
      <div className="sa-section-hero-copy"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
      {action && <div className="sa-section-hero-action">{action}</div>}
    </section>
  );
}

function PanelHeader({ eyebrow, title, description, action }) {
  return (
    <div className="sa-panel-header">
      <div><span>{eyebrow}</span><h3>{title}</h3><p>{description}</p></div>
      {action && <div>{action}</div>}
    </div>
  );
}

function SummaryChip({ label, value, tone = "default" }) {
  return <div className={`sa-summary-chip tone-${tone}`}><span>{label}</span><strong>{Number(value || 0).toLocaleString("ar-SA")}</strong></div>;
}

function EntityCell({ icon: Icon, title, subtitle }) {
  return <div className="sa-entity-cell"><span><Icon /></span><div><strong>{title}</strong><small>{subtitle}</small></div></div>;
}

function StatusPill({ type, value }) {
  let config;
  if (type === "mosque") config = MOSQUE_STATUS[value] || { label: value || "—", tone: "neutral" };
  else if (type === "invite") config = INVITE_STATUS[value] || { label: value || "—", tone: "neutral" };
  else config = value === "active" ? { label: "نشط", tone: "success" } : { label: "معطل", tone: "danger" };
  return <span className={`sa-status-pill tone-${config.tone}`}><i />{config.label}</span>;
}

function AlertRow({ alert }) {
  const Icon = alert.icon;
  return (
    <div className={`sa-alert-row severity-${alert.severity}`}>
      <span className="sa-alert-icon"><Icon /></span>
      <div><strong>{alert.title}</strong><p>{alert.description}</p></div>
      {alert.action && <button type="button" onClick={alert.action}>{alert.actionLabel}<ChevronLeft /></button>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, compact = false }) {
  return <div className={`sa-empty ${compact ? "is-compact" : ""}`}><span><Icon /></span><strong>{title}</strong><p>{description}</p></div>;
}

function Field({ label, required = false, children }) {
  return <label className="sa-field"><span>{label}{required && <em>*</em>}</span>{children}</label>;
}

function Modal({ title, subtitle, children, onClose, wide = false }) {
  return (
    <div className="sa-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`sa-modal ${wide ? "is-wide" : ""}`}>
        <div className="sa-modal-head"><div><span>مدير النظام</span><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose}><X /></button></div>
        <div className="sa-modal-body">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onConfirm, saving, confirmLabel, danger = false }) {
  return (
    <div className="sa-modal-actions">
      <button type="button" className="sa-btn sa-btn-secondary" onClick={onCancel} disabled={saving}>إلغاء</button>
      <button type="button" className={`sa-btn ${danger ? "sa-btn-danger" : "sa-btn-primary"}`} onClick={onConfirm} disabled={saving}>{saving ? <><Loader2 className="sa-spin" /> جارٍ الحفظ…</> : confirmLabel}</button>
    </div>
  );
}

function Toast({ toast }) {
  return <div className={`sa-toast ${toast.type === "error" ? "is-error" : "is-success"}`}>{toast.type === "error" ? <XCircle /> : <CheckCircle2 />}<span>{toast.message}</span></div>;
}
