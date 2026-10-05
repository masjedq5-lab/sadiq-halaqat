import {displayDateFormatter} from "../lib/calendar";
import { OrnamentScene } from '../components/ornaments/Ornament';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Archive,
  Bell,
  BellRing,
  BookOpenCheck,
  Check,
  CheckCheck,
  ChevronLeft,
  CircleAlert,
  Clock3,
  Filter,
  GraduationCap,
  Inbox,
  Landmark,
  Loader2,
  Mail,
  MessageCircleReply,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import "./Notifications.css";

const TYPE_META = {
  general: "عام",
  administrative: "إداري",
  student_followup: "متابعة طالب",
  attendance: "حضور",
  monthly_plan: "خطة شهرية",
  recitation: "تسميع",
  achievement: "إنجاز",
  exam: "اختبار",
};

const PRIORITY_META = {
  low: { label: "منخفض", tone: "muted" },
  normal: { label: "عادي", tone: "normal" },
  high: { label: "مهم", tone: "warning" },
  urgent: { label: "عاجل", tone: "critical" },
};

const SEVERITY_META = {
  info: { label: "معلومة", tone: "info" },
  success: { label: "نجاح", tone: "success" },
  warning: { label: "تنبيه", tone: "warning" },
  critical: { label: "عاجل", tone: "critical" },
};

function apiMessage(error) {
  const message = String(error?.message || error || "");

  if (message.includes("RECIPIENT_OUTSIDE_SCOPE")) {
    return "المستلم خارج نطاق إشرافك.";
  }

  if (message.includes("RECIPIENTS_REQUIRED")) {
    return "اختر مستلمًا واحدًا على الأقل.";
  }

  if (message.includes("MESSAGE_BODY_REQUIRED")) {
    return "نص الرسالة مطلوب.";
  }

  if (message.includes("TITLE_REQUIRED")) {
    return "عنوان الإشعار مطلوب.";
  }

  if (message.includes("MESSAGE_TOO_LONG")) {
    return "نص الرسالة أطول من الحد المسموح.";
  }

  if (message.includes("SUPERVISOR_ONLY")) {
    return "مركز الإشعارات متاح لحساب المشرف فقط.";
  }

  return error?.message || "تعذر إكمال العملية.";
}

function formatDateTime(value) {
  if (!value) return "—";

  try {
    return displayDateFormatter( {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function relativeTime(value) {
  if (!value) return "";

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));

  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} د`;
  if (minutes < 1440) return `منذ ${Math.floor(minutes / 60)} س`;

  const days = Math.floor(minutes / 1440);
  if (days === 1) return "أمس";
  return `منذ ${days} أيام`;
}

function roleLabel(role) {
  if (role === "teacher") return "معلم";
  if (role === "student") return "طالب";
  if (role === "supervisor") return "مشرف";
  if (role === "admin") return "مدير النظام";
  return "النظام";
}


function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "green",
}) {
  return (
    <article className={`notifications-metric tone-${tone}`}>
      <div className="notifications-metric-icon">
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

function ItemBadge({ item }) {
  const meta =
    item.kind === "system"
      ? SEVERITY_META[item.severity] || SEVERITY_META.info
      : PRIORITY_META[item.priority] || PRIORITY_META.normal;

  return (
    <span className={`notifications-item-badge tone-${meta.tone}`}>
      {meta.label}
    </span>
  );
}

function MessageIcon({ item }) {
  if (item.kind === "system") {
    if (item.severity === "critical") {
      return <CircleAlert size={18} />;
    }

    if (item.severity === "warning") {
      return <BellRing size={18} />;
    }

    return <Bell size={18} />;
  }

  if (item.direction === "out") {
    return <Send size={18} />;
  }

  return <MessageSquareText size={18} />;
}

function ComposeModal({
  open,
  onClose,
  contacts,
  contexts,
  initialRecipientId,
  replyTo,
  onSent,
}) {
  const { showToast } = useToast();

  const [mode, setMode] = useState("direct");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [mosqueFilter, setMosqueFilter] = useState("all");
  const [halaqaFilter, setHalaqaFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [severity, setSeverity] = useState("info");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;

    setMode("direct");
    setSearch("");
    setRoleFilter("all");
    setMosqueFilter("all");
    setHalaqaFilter("all");
    setSelected(
      initialRecipientId
        ? [Number(initialRecipientId)]
        : []
    );
    setSubject(
      replyTo?.subject
        ? `رد: ${replyTo.subject.replace(/^رد:\s*/u, "")}`
        : ""
    );
    setBody("");
    setMessageType(replyTo?.message_type || "general");
    setPriority("normal");
    setSeverity("info");
  }, [open, initialRecipientId, replyTo]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      if (roleFilter !== "all" && contact.role !== roleFilter) {
        return false;
      }

      if (
        mosqueFilter !== "all" &&
        !contact.contexts.some(
          (context) => String(context.mosque_id) === String(mosqueFilter)
        )
      ) {
        return false;
      }

      if (
        halaqaFilter !== "all" &&
        !contact.contexts.some(
          (context) => String(context.halaqa_id) === String(halaqaFilter)
        )
      ) {
        return false;
      }

      if (!query) return true;

      return [
        contact.name,
        contact.user_number,
        roleLabel(contact.role),
        ...contact.contexts.flatMap((context) => [
          context.mosque_name,
          context.halaqa_name,
        ]),
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [
    contacts,
    search,
    roleFilter,
    mosqueFilter,
    halaqaFilter,
  ]);

  function toggleContact(profileId) {
    const id = Number(profileId);

    if (mode === "direct") {
      setSelected([id]);
      return;
    }

    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function selectAudience(role) {
    const ids = filteredContacts
      .filter((contact) => role === "all" || contact.role === role)
      .map((contact) => contact.profile_id);

    setSelected([...new Set(ids)]);
  }

  async function handleSend() {
    if (!body.trim()) {
      showToast("اكتب نص الرسالة أولًا", "error");
      return;
    }

    if (!selected.length) {
      showToast("اختر مستلمًا واحدًا على الأقل", "error");
      return;
    }

    if (mode === "announcement" && !subject.trim()) {
      showToast("عنوان الإشعار مطلوب", "error");
      return;
    }

    setSending(true);

    try {
      if (mode === "direct") {
        const { error } = await supabase.rpc(
          "send_internal_message",
          {
            p_recipient_id: selected[0],
            p_subject: subject.trim() || null,
            p_body: body.trim(),
            p_message_type: messageType,
            p_priority: priority,
            p_student_context_id: null,
            p_reply_to_id: replyTo?.id || null,
          }
        );

        if (error) throw error;

        showToast("تم إرسال الرسالة", "success");
      } else {
        const { error } = await supabase.rpc(
          "supervisor_send_announcement",
          {
            p_recipient_ids: selected,
            p_title: subject.trim(),
            p_message: body.trim(),
            p_severity: severity,
            p_action_url: null,
            p_action_label: null,
          }
        );

        if (error) throw error;

        showToast(
          `تم إرسال الإشعار إلى ${selected.length} مستلم`,
          "success"
        );
      }

      onSent?.();
      onClose?.();
    } catch (error) {
      console.error("SEND NOTIFICATION:", error);
      showToast(apiMessage(error), "error");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="notifications-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !sending) {
          onClose?.();
        }
      }}
    >
      <section
        className="notifications-compose-modal"
        role="dialog"
        aria-modal="true"
        aria-label="إنشاء رسالة أو إشعار"
      >
        <header className="notifications-compose-head">
          <div>
            <span>
              <Sparkles size={14} />
              مركز التواصل
            </span>
            <h2>إنشاء رسالة جديدة</h2>
            <p>
              رسالة مباشرة للمحادثة، أو إشعار جماعي يصل إلى المستلمين
              داخل نطاق إشرافك.
            </p>
          </div>

          <button
            type="button"
            className="notifications-icon-button"
            onClick={onClose}
            disabled={sending}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </header>

        <div className="notifications-compose-tabs">
          <button
            type="button"
            className={mode === "direct" ? "active" : ""}
            onClick={() => {
              setMode("direct");
              setSelected((current) =>
                current.length ? [current[0]] : []
              );
            }}
          >
            <MessageSquareText size={16} />
            رسالة مباشرة
          </button>

          <button
            type="button"
            className={mode === "announcement" ? "active" : ""}
            onClick={() => setMode("announcement")}
          >
            <BellRing size={16} />
            إشعار جماعي
          </button>
        </div>

        <div className="notifications-compose-body">
          <section className="notifications-recipients-panel">
            <div className="notifications-recipients-head">
              <div>
                <strong>المستلمون</strong>
                <span>
                  {mode === "direct"
                    ? "اختر شخصًا واحدًا"
                    : `${selected.length} محدد`}
                </span>
              </div>

              {mode === "announcement" ? (
                <div className="notifications-audience-shortcuts">
                  <button
                    type="button"
                    onClick={() => selectAudience("teacher")}
                  >
                    المعلمون
                  </button>
                  <button
                    type="button"
                    onClick={() => selectAudience("student")}
                  >
                    الطلاب
                  </button>
                  <button
                    type="button"
                    onClick={() => selectAudience("all")}
                  >
                    الكل
                  </button>
                </div>
              ) : null}
            </div>

            <label className="notifications-recipient-search">
              <Search size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="بحث باسم المستلم..."
              />
            </label>

            <div className="notifications-recipient-filters">
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="all">كل الفئات</option>
                <option value="teacher">المعلمون</option>
                <option value="student">الطلاب</option>
              </select>

              <select
                value={mosqueFilter}
                onChange={(event) => setMosqueFilter(event.target.value)}
              >
                <option value="all">كل المساجد</option>
                {contexts.mosques.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={halaqaFilter}
                onChange={(event) => setHalaqaFilter(event.target.value)}
              >
                <option value="all">كل الحلقات</option>
                {contexts.halaqat.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="notifications-contact-list">
              {filteredContacts.map((contact) => {
                const checked = selected.includes(contact.profile_id);
                const context = contact.contexts[0];

                return (
                  <button
                    type="button"
                    key={contact.profile_id}
                    className={`notifications-contact-item ${
                      checked ? "selected" : ""
                    }`}
                    onClick={() => toggleContact(contact.profile_id)}
                  >
                    <span className="notifications-contact-avatar">
                      {contact.role === "teacher" ? (
                        <GraduationCap size={17} />
                      ) : (
                        <UserRound size={17} />
                      )}
                    </span>

                    <span className="notifications-contact-copy">
                      <strong>{contact.name}</strong>
                      <small>
                        {roleLabel(contact.role)}
                        {context?.halaqa_name
                          ? ` · ${context.halaqa_name}`
                          : ""}
                      </small>
                    </span>

                    <span
                      className={`notifications-contact-check ${
                        checked ? "checked" : ""
                      }`}
                    >
                      {checked ? <Check size={13} /> : null}
                    </span>
                  </button>
                );
              })}

              {!filteredContacts.length ? (
                <div className="notifications-contacts-empty">
                  لا توجد جهات اتصال مطابقة.
                </div>
              ) : null}
            </div>
          </section>

          <section className="notifications-editor-panel">
            <label className="notifications-field">
              <span>
                {mode === "announcement" ? "عنوان الإشعار" : "الموضوع"}
              </span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={160}
                placeholder={
                  mode === "announcement"
                    ? "مثال: تنبيه مهم بخصوص جدول الحلقات"
                    : "عنوان مختصر للرسالة"
                }
              />
            </label>

            <div className="notifications-editor-grid">
              {mode === "direct" ? (
                <>
                  <label className="notifications-field">
                    <span>نوع الرسالة</span>
                    <select
                      value={messageType}
                      onChange={(event) =>
                        setMessageType(event.target.value)
                      }
                    >
                      {Object.entries(TYPE_META).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="notifications-field">
                    <span>الأولوية</span>
                    <select
                      value={priority}
                      onChange={(event) =>
                        setPriority(event.target.value)
                      }
                    >
                      <option value="low">منخفضة</option>
                      <option value="normal">عادية</option>
                      <option value="high">مهمة</option>
                      <option value="urgent">عاجلة</option>
                    </select>
                  </label>
                </>
              ) : (
                <label className="notifications-field span-2">
                  <span>درجة الإشعار</span>
                  <select
                    value={severity}
                    onChange={(event) =>
                      setSeverity(event.target.value)
                    }
                  >
                    <option value="info">معلومة</option>
                    <option value="success">إيجابي / نجاح</option>
                    <option value="warning">تنبيه</option>
                    <option value="critical">عاجل</option>
                  </select>
                </label>
              )}
            </div>

            <label className="notifications-field">
              <span>نص الرسالة</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={5000}
                placeholder="اكتب رسالة واضحة ومختصرة..."
              />
              <small>{body.length} / 5000</small>
            </label>

            <div className="notifications-editor-tip">
              <ShieldCheck size={17} />
              <div>
                <strong>نطاق إرسال محمي</strong>
                <span>
                  النظام يرفض تلقائيًا أي مستلم خارج المساجد والحلقات
                  المرتبطة بحساب المشرف.
                </span>
              </div>
            </div>
          </section>
        </div>

        <footer className="notifications-compose-footer">
          <div>
            {selected.length ? (
              <span>
                <Users size={14} />
                {selected.length} مستلم
              </span>
            ) : (
              <span>لم يتم اختيار مستلمين</span>
            )}
          </div>

          <div>
            <button
              type="button"
              className="notifications-button ghost"
              onClick={onClose}
              disabled={sending}
            >
              إلغاء
            </button>

            <button
              type="button"
              className="notifications-button primary"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="notifications-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              {mode === "announcement" ? "إرسال الإشعار" : "إرسال الرسالة"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [summary, setSummary] = useState({
    unread_total: 0,
    unread_messages: 0,
    unread_system: 0,
    urgent_unread: 0,
    sent_today: 0,
    contacts_count: 0,
  });

  const [directoryRows, setDirectoryRows] = useState([]);
  const [messages, setMessages] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [sentAnnouncements, setSentAnnouncements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("inbox");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [kindFilter, setKindFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipientId, setComposeRecipientId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);

  const refreshTimer = useRef(null);

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);

      try {
        const [
          summaryResult,
          directoryResult,
          messagesResult,
          systemResult,
          sentResult,
        ] = await Promise.all([
          supabase.rpc("get_supervisor_notification_summary"),
          supabase.rpc("get_supervisor_communication_directory"),
          supabase.rpc("get_supervisor_direct_messages", {
            p_limit: 250,
          }),
          supabase.rpc("get_supervisor_system_notifications", {
            p_limit: 250,
          }),
          supabase.rpc("get_supervisor_sent_announcements", {
            p_limit: 120,
          }),
        ]);

        for (const result of [
          summaryResult,
          directoryResult,
          messagesResult,
          systemResult,
          sentResult,
        ]) {
          if (result.error) throw result.error;
        }

        setSummary(
          summaryResult.data?.[0] || {
            unread_total: 0,
            unread_messages: 0,
            unread_system: 0,
            urgent_unread: 0,
            sent_today: 0,
            contacts_count: 0,
          }
        );

        setDirectoryRows(
          Array.isArray(directoryResult.data)
            ? directoryResult.data
            : []
        );

        setMessages(
          Array.isArray(messagesResult.data)
            ? messagesResult.data
            : []
        );

        setSystemNotifications(
          Array.isArray(systemResult.data)
            ? systemResult.data
            : []
        );

        setSentAnnouncements(
          Array.isArray(sentResult.data)
            ? sentResult.data
            : []
        );
      } catch (error) {
        console.error("LOAD SUPERVISOR NOTIFICATIONS:", error);
        showToast(apiMessage(error), "error");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    function scheduleRefresh() {
      window.clearTimeout(refreshTimer.current);

      refreshTimer.current = window.setTimeout(() => {
        loadAll({ silent: true });
      }, 280);
    }

    const channel = supabase
      .channel("supervisor-notification-center")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "internal_messages",
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_recipients",
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        scheduleRefresh
      )
      .subscribe();

    const interval = window.setInterval(() => {
      loadAll({ silent: true });
    }, 45_000);

    return () => {
      window.clearTimeout(refreshTimer.current);
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const contacts = useMemo(() => {
    const map = new Map();

    for (const row of directoryRows) {
      if (!map.has(row.profile_id)) {
        map.set(row.profile_id, {
          profile_id: Number(row.profile_id),
          name: row.display_name || row.full_name || "بدون اسم",
          role: row.role,
          user_number: row.user_number,
          contexts: [],
        });
      }

      map.get(row.profile_id).contexts.push({
        mosque_id: row.mosque_id,
        mosque_name: row.mosque_name,
        halaqa_id: row.halaqa_id,
        halaqa_name: row.halaqa_name,
      });
    }

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "ar")
    );
  }, [directoryRows]);

  const contexts = useMemo(() => {
    const mosques = new Map();
    const halaqat = new Map();

    for (const row of directoryRows) {
      if (row.mosque_id) {
        mosques.set(row.mosque_id, {
          id: row.mosque_id,
          name: row.mosque_name || `مسجد #${row.mosque_id}`,
        });
      }

      if (row.halaqa_id) {
        halaqat.set(row.halaqa_id, {
          id: row.halaqa_id,
          name: row.halaqa_name || `حلقة #${row.halaqa_id}`,
        });
      }
    }

    return {
      mosques: [...mosques.values()],
      halaqat: [...halaqat.values()],
    };
  }, [directoryRows]);

  const inboxItems = useMemo(() => {
    const direct = messages
      .filter((item) => item.direction === "in")
      .map((item) => ({
        ...item,
        key: `msg-${item.id}`,
        kind: "message",
        title: item.subject || `رسالة من ${item.sender_name}`,
        preview: item.body,
        sender: item.sender_name,
        sender_role: item.sender_role,
        unread: !item.read_at,
        timestamp: item.created_at,
      }));

    const system = systemNotifications.map((item) => ({
      ...item,
      key: `sys-${item.recipient_row_id}`,
      kind: "system",
      preview: item.message,
      sender: item.creator_name,
      sender_role: item.creator_role,
      unread: !item.is_read,
      timestamp: item.created_at,
    }));

    return [...direct, ...system].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    );
  }, [messages, systemNotifications]);

  const directItems = useMemo(
    () =>
      messages.map((item) => ({
        ...item,
        key: `msg-${item.id}`,
        kind: "message",
        title:
          item.subject ||
          (item.direction === "in"
            ? `رسالة من ${item.sender_name}`
            : `رسالة إلى ${item.recipient_name}`),
        preview: item.body,
        sender:
          item.direction === "in"
            ? item.sender_name
            : item.recipient_name,
        sender_role:
          item.direction === "in"
            ? item.sender_role
            : item.recipient_role,
        unread: item.direction === "in" && !item.read_at,
        timestamp: item.created_at,
      })),
    [messages]
  );

  const visibleItems = useMemo(() => {
    let source = activeTab === "messages" ? directItems : inboxItems;
    const query = search.trim().toLowerCase();

    return source.filter((item) => {
      if (unreadOnly && !item.unread) return false;

      if (kindFilter !== "all" && item.kind !== kindFilter) {
        return false;
      }

      if (!query) return true;

      return [
        item.title,
        item.preview,
        item.sender,
        item.mosque_name,
        item.halaqa_name,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [
    activeTab,
    directItems,
    inboxItems,
    search,
    unreadOnly,
    kindFilter,
  ]);

  const selectedItem = useMemo(() => {
    if (!selectedKey) return visibleItems[0] || null;

    return (
      [...inboxItems, ...directItems].find(
        (item) => item.key === selectedKey
      ) ||
      visibleItems[0] ||
      null
    );
  }, [
    selectedKey,
    visibleItems,
    inboxItems,
    directItems,
  ]);

  useEffect(() => {
    if (
      selectedItem &&
      selectedItem.unread
    ) {
      markRead(selectedItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.key]);

  async function markRead(item) {
    if (!item?.unread) return;

    try {
      if (item.kind === "system") {
        const { error } = await supabase.rpc(
          "supervisor_mark_notification_read",
          {
            p_recipient_row_id: item.recipient_row_id,
          }
        );

        if (error) throw error;

        setSystemNotifications((current) =>
          current.map((row) =>
            row.recipient_row_id === item.recipient_row_id
              ? {
                  ...row,
                  is_read: true,
                  read_at: row.read_at || new Date().toISOString(),
                }
              : row
          )
        );
      } else {
        const { error } = await supabase.rpc(
          "mark_internal_message_read",
          {
            p_message_id: item.id,
          }
        );

        if (error) throw error;

        setMessages((current) =>
          current.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  read_at: row.read_at || new Date().toISOString(),
                }
              : row
          )
        );
      }

      setSummary((current) => ({
        ...current,
        unread_total: Math.max(
          0,
          Number(current.unread_total || 0) - 1
        ),
        unread_messages:
          item.kind === "message"
            ? Math.max(
                0,
                Number(current.unread_messages || 0) - 1
              )
            : current.unread_messages,
        unread_system:
          item.kind === "system"
            ? Math.max(
                0,
                Number(current.unread_system || 0) - 1
              )
            : current.unread_system,
      }));
    } catch (error) {
      console.error("MARK NOTIFICATION READ:", error);
    }
  }

  async function archiveItem(item) {
    if (!item) return;

    setActionLoading(true);

    try {
      if (item.kind === "system") {
        const { error } = await supabase.rpc(
          "supervisor_archive_notification",
          {
            p_recipient_row_id: item.recipient_row_id,
          }
        );

        if (error) throw error;
      } else {
        const { error } = await supabase.rpc(
          "archive_internal_message",
          {
            p_message_id: item.id,
          }
        );

        if (error) throw error;
      }

      setSelectedKey(null);
      showToast("تمت أرشفة العنصر", "success");
      await loadAll({ silent: true });
    } catch (error) {
      console.error("ARCHIVE NOTIFICATION:", error);
      showToast(apiMessage(error), "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function markAllRead() {
    setActionLoading(true);

    try {
      const unreadDirect = messages.filter(
        (item) => item.direction === "in" && !item.read_at
      );

      const directResults = await Promise.all(
        unreadDirect.map((item) =>
          supabase.rpc("mark_internal_message_read", {
            p_message_id: item.id,
          })
        )
      );

      const directError = directResults.find((result) => result.error)?.error;
      if (directError) throw directError;

      const { error } = await supabase.rpc(
        "supervisor_mark_all_notifications_read"
      );

      if (error) throw error;

      showToast("تم تعليم جميع الوارد كمقروء", "success");
      await loadAll({ silent: true });
    } catch (error) {
      console.error("MARK ALL READ:", error);
      showToast(apiMessage(error), "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadAll({ silent: true });
    setRefreshing(false);
    showToast("تم تحديث مركز الإشعارات", "success");
  }

  function openCompose({
    recipientId = null,
    item = null,
  } = {}) {
    setComposeRecipientId(recipientId);
    setReplyTo(item);
    setComposeOpen(true);
  }

  function handleReply(item) {
    if (!item || item.kind !== "message") return;

    const recipientId =
      item.direction === "in"
        ? item.sender_id
        : item.recipient_id;

    openCompose({
      recipientId,
      item,
    });
  }

  if (loading) {
    return (
      <div className="notifications-page" dir="rtl">
        <div className="notifications-loading">
          <div className="notifications-loading-emblem">
            <BellRing size={26} />
          </div>

          <Loader2 className="notifications-spin" size={22} />

          <strong>جارٍ تجهيز مركز الإشعارات</strong>
          <span>
            نحمّل الوارد والرسائل وجهات الاتصال ضمن نطاق إشرافك.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page" dir="rtl">
      <section className="notifications-hero">
        <OrnamentScene primary="02-shams" />

        <div className="notifications-hero-copy">
          <div className="notifications-eyebrow">
            <span>
              <Sparkles size={14} />
            </span>
            مركز التواصل المؤسسي
          </div>

          <h1>الإشعارات والتواصل</h1>

          <p>
            صندوق موحّد للمشرف يجمع الإشعارات النظامية والرسائل المباشرة،
            مع إرسال آمن للمعلمين والطلاب ومتابعة القراءة والاستجابة.
          </p>

          <div className="notifications-hero-tags">
            <span>
              <ShieldCheck size={14} />
              نطاق إرسال محمي
            </span>
            <span>
              <BellRing size={14} />
              تحديث مباشر
            </span>
            <span>
              <MessageCircleReply size={14} />
              محادثات قابلة للرد
            </span>
          </div>
        </div>

        <div className="notifications-hero-actions">
          <button
            type="button"
            className="notifications-button hero-ghost"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="notifications-spin" size={17} />
            ) : (
              <RefreshCw size={17} />
            )}
            تحديث
          </button>

          <button
            type="button"
            className="notifications-button hero-primary"
            onClick={() => openCompose()}
          >
            <Send size={17} />
            إنشاء رسالة
          </button>
        </div>
      </section>

      <section className="notifications-metrics">
        <MetricCard
          icon={Inbox}
          label="غير مقروء"
          value={Number(summary.unread_total || 0)}
          helper="رسائل وإشعارات"
        />

        <MetricCard
          icon={MessageSquareText}
          label="رسائل مباشرة"
          value={Number(summary.unread_messages || 0)}
          helper="بانتظار القراءة"
          tone="blue"
        />

        <MetricCard
          icon={CircleAlert}
          label="عاجل"
          value={Number(summary.urgent_unread || 0)}
          helper="يحتاج انتباهًا"
          tone="red"
        />

        <MetricCard
          icon={Send}
          label="أُرسل اليوم"
          value={Number(summary.sent_today || 0)}
          helper="رسائل وإعلانات"
          tone="gold"
        />

        <MetricCard
          icon={Users}
          label="جهات الاتصال"
          value={Number(summary.contacts_count || 0)}
          helper="معلمون وطلاب"
          tone="emerald"
        />
      </section>

      <section className="notifications-command-center">
        <header className="notifications-toolbar">
          <div className="notifications-tabs">
            <button
              type="button"
              className={activeTab === "inbox" ? "active" : ""}
              onClick={() => {
                setActiveTab("inbox");
                setSelectedKey(null);
              }}
            >
              <Inbox size={16} />
              الوارد
              {Number(summary.unread_total || 0) > 0 ? (
                <b>{summary.unread_total}</b>
              ) : null}
            </button>

            <button
              type="button"
              className={activeTab === "messages" ? "active" : ""}
              onClick={() => {
                setActiveTab("messages");
                setSelectedKey(null);
              }}
            >
              <MessageSquareText size={16} />
              المحادثات
            </button>

            <button
              type="button"
              className={activeTab === "sent" ? "active" : ""}
              onClick={() => {
                setActiveTab("sent");
                setSelectedKey(null);
              }}
            >
              <Send size={16} />
              الإشعارات المرسلة
            </button>
          </div>

          <div className="notifications-toolbar-actions">
            {activeTab !== "sent" ? (
              <button
                type="button"
                className="notifications-tool-button"
                onClick={markAllRead}
                disabled={
                  actionLoading ||
                  Number(summary.unread_total || 0) === 0
                }
              >
                <CheckCheck size={15} />
                قراءة الكل
              </button>
            ) : null}

            <button
              type="button"
              className="notifications-tool-button primary"
              onClick={() => openCompose()}
            >
              <Send size={15} />
              رسالة جديدة
            </button>
          </div>
        </header>

        {activeTab === "sent" ? (
          <section className="notifications-sent-list">
            {sentAnnouncements.length ? (
              sentAnnouncements.map((item) => {
                const readRate = Number(item.recipient_count || 0)
                  ? Math.round(
                      (Number(item.read_count || 0) /
                        Number(item.recipient_count || 1)) *
                        100
                    )
                  : 0;

                return (
                  <article
                    className="notifications-sent-card"
                    key={item.notification_id}
                  >
                    <div className="notifications-sent-icon">
                      <BellRing size={18} />
                    </div>

                    <div className="notifications-sent-main">
                      <div className="notifications-sent-title">
                        <strong>{item.title}</strong>
                        <span
                          className={`notifications-item-badge tone-${
                            SEVERITY_META[item.severity]?.tone || "info"
                          }`}
                        >
                          {SEVERITY_META[item.severity]?.label || "معلومة"}
                        </span>
                      </div>

                      <p>{item.message}</p>

                      <div className="notifications-sent-meta">
                        <span>
                          <Users size={13} />
                          {item.recipient_count} مستلم
                        </span>
                        <span>
                          <CheckCheck size={13} />
                          {item.read_count} قرأ
                        </span>
                        <span>
                          <Clock3 size={13} />
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="notifications-read-rate">
                      <strong>{readRate}%</strong>
                      <span>نسبة القراءة</span>
                      <div>
                        <i style={{ width: `${readRate}%` }} />
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="notifications-empty">
                <div>
                  <Send size={24} />
                </div>
                <strong>لم ترسل إشعارات جماعية بعد</strong>
                <p>
                  أنشئ إشعارًا موجّهًا للمعلمين أو الطلاب وسيظهر هنا
                  مع نسبة القراءة.
                </p>
                <button
                  type="button"
                  className="notifications-button primary"
                  onClick={() => openCompose()}
                >
                  <Send size={16} />
                  إنشاء أول إشعار
                </button>
              </div>
            )}
          </section>
        ) : (
          <div className="notifications-inbox-layout">
            <aside className="notifications-list-pane">
              <div className="notifications-list-tools">
                <label className="notifications-search">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="بحث في الوارد..."
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="مسح البحث"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                </label>

                <div className="notifications-filter-row">
                  <button
                    type="button"
                    className={unreadOnly ? "active" : ""}
                    onClick={() => setUnreadOnly((value) => !value)}
                  >
                    <Filter size={14} />
                    غير المقروء
                  </button>

                  <select
                    value={kindFilter}
                    onChange={(event) => setKindFilter(event.target.value)}
                  >
                    <option value="all">كل الأنواع</option>
                    <option value="message">رسائل</option>
                    <option value="system">إشعارات النظام</option>
                  </select>
                </div>
              </div>

              <div className="notifications-list">
                {visibleItems.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={[
                      "notifications-list-item",
                      selectedItem?.key === item.key ? "selected" : "",
                      item.unread ? "unread" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedKey(item.key)}
                  >
                    <span
                      className={`notifications-list-icon ${
                        item.kind === "system" ? "system" : "message"
                      }`}
                    >
                      <MessageIcon item={item} />
                    </span>

                    <span className="notifications-list-copy">
                      <span className="notifications-list-heading">
                        <strong>{item.title}</strong>
                        <small>{relativeTime(item.timestamp)}</small>
                      </span>

                      <span className="notifications-list-source">
                        {item.direction === "out" ? "إلى " : "من "}
                        {item.sender || "نظام الصديق"}
                        {item.sender_role
                          ? ` · ${roleLabel(item.sender_role)}`
                          : ""}
                      </span>

                      <span className="notifications-list-preview">
                        {item.preview}
                      </span>

                      <span className="notifications-list-foot">
                        <ItemBadge item={item} />

                        {item.mosque_name ? (
                          <em>
                            <Landmark size={12} />
                            {item.mosque_name}
                          </em>
                        ) : null}

                        {item.halaqa_name ? (
                          <em>
                            <BookOpenCheck size={12} />
                            {item.halaqa_name}
                          </em>
                        ) : null}
                      </span>
                    </span>

                    {item.unread ? (
                      <span className="notifications-unread-dot" />
                    ) : null}
                  </button>
                ))}

                {!visibleItems.length ? (
                  <div className="notifications-list-empty">
                    <Mail size={22} />
                    <strong>لا توجد عناصر مطابقة</strong>
                    <span>غيّر البحث أو الفلاتر.</span>
                  </div>
                ) : null}
              </div>
            </aside>

            <section className="notifications-detail-pane">
              {selectedItem ? (
                <>
                  <header className="notifications-detail-head">
                    <div className="notifications-detail-title">
                      <span
                        className={`notifications-detail-icon ${
                          selectedItem.kind === "system"
                            ? "system"
                            : "message"
                        }`}
                      >
                        <MessageIcon item={selectedItem} />
                      </span>

                      <div>
                        <div>
                          <ItemBadge item={selectedItem} />
                          <span>
                            {selectedItem.kind === "system"
                              ? "إشعار نظامي"
                              : selectedItem.direction === "out"
                              ? "رسالة صادرة"
                              : "رسالة واردة"}
                          </span>
                        </div>

                        <h2>{selectedItem.title}</h2>
                      </div>
                    </div>

                    <div className="notifications-detail-actions">
                      {selectedItem.kind === "message" ? (
                        <button
                          type="button"
                          onClick={() => handleReply(selectedItem)}
                        >
                          <MessageCircleReply size={16} />
                          رد
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => archiveItem(selectedItem)}
                        disabled={actionLoading}
                      >
                        <Archive size={16} />
                        أرشفة
                      </button>
                    </div>
                  </header>

                  <div className="notifications-detail-meta">
                    <div>
                      <UserRound size={15} />
                      <span>
                        {selectedItem.direction === "out" ? "إلى" : "من"}
                      </span>
                      <strong>
                        {selectedItem.sender || "نظام الصديق"}
                      </strong>
                    </div>

                    <div>
                      <Clock3 size={15} />
                      <span>{formatDateTime(selectedItem.timestamp)}</span>
                    </div>

                    {selectedItem.mosque_name ? (
                      <div>
                        <Landmark size={15} />
                        <span>{selectedItem.mosque_name}</span>
                      </div>
                    ) : null}

                    {selectedItem.halaqa_name ? (
                      <div>
                        <BookOpenCheck size={15} />
                        <span>{selectedItem.halaqa_name}</span>
                      </div>
                    ) : null}
                  </div>

                  <article className="notifications-message-body">
                    <p>{selectedItem.preview}</p>
                  </article>

                  {selectedItem.kind === "system" &&
                  selectedItem.action_url ? (
                    <div className="notifications-action-card">
                      <div>
                        <Sparkles size={17} />
                        <section>
                          <strong>إجراء مرتبط بالإشعار</strong>
                          <span>
                            يمكنك الانتقال مباشرة إلى الصفحة المطلوبة.
                          </span>
                        </section>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(selectedItem.action_url)}
                      >
                        {selectedItem.action_label || "فتح"}
                        <ChevronLeft size={15} />
                      </button>
                    </div>
                  ) : null}

                  {selectedItem.kind === "message" ? (
                    <div className="notifications-quick-reply">
                      <div>
                        <MessageCircleReply size={17} />
                        <section>
                          <strong>رد مباشر</strong>
                          <span>
                            يفتح المحرر مع المستلم والرسالة الأصلية تلقائيًا.
                          </span>
                        </section>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReply(selectedItem)}
                      >
                        كتابة رد
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="notifications-detail-empty">
                  <div>
                    <Inbox size={27} />
                  </div>
                  <strong>اختر إشعارًا أو رسالة</strong>
                  <p>
                    ستظهر التفاصيل الكاملة هنا مع إجراءات القراءة والرد
                    والأرشفة.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </section>

      <ComposeModal
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setComposeRecipientId(null);
          setReplyTo(null);
        }}
        contacts={contacts}
        contexts={contexts}
        initialRecipientId={composeRecipientId}
        replyTo={replyTo}
        onSent={() => loadAll({ silent: true })}
      />
    </div>
  );
}
