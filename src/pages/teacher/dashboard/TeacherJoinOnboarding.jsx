import {displayDateFormatter} from "../../../lib/calendar";
import { OrnamentScene } from '../../../components/ornaments/Ornament';
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "../../../lib/supabase";
import { showToast } from "../../../components/Toast";

const PERIOD_LABELS = {
  after_fajr: "بعد الفجر",
  after_dhuhr: "بعد الظهر",
  after_asr: "بعد العصر",
  after_maghrib: "بعد المغرب",
  after_isha: "بعد العشاء",
};

export default function TeacherJoinOnboarding({
  teacher,
  onMembershipChanged,
}) {
  const [loading, setLoading] = useState(true);
  const [directory, setDirectory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const pendingRequest = requests.find((request) => request.status === "pending");

  const filteredDirectory = useMemo(() => {
    const term = search.trim().toLowerCase();

    return directory.filter((item) => {
      const matchesSearch =
        !term ||
        [item.mosque_name, item.mosque_address, item.halaqa_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesPeriod =
        period === "all" || item.halaqa_period === period;

      return matchesSearch && matchesPeriod;
    });
  }, [directory, search, period]);

  async function load() {
    try {
      setLoading(true);

      const [directoryResult, requestsResult, assignmentsResult] =
        await Promise.all([
          supabase.rpc("get_teacher_join_directory"),
          supabase.rpc("get_my_join_requests_v2"),
          supabase.rpc("get_my_teacher_assignments"),
        ]);

      if (directoryResult.error) throw directoryResult.error;
      if (requestsResult.error) throw requestsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      if ((assignmentsResult.data ?? []).length > 0) {
        await onMembershipChanged?.();
        return;
      }

      setDirectory(directoryResult.data ?? []);
      setRequests(requestsResult.data ?? []);
    } catch (error) {
      console.error("Teacher onboarding load error:", error);
      showToast("تعذر تحميل المساجد والحلقات", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitRequest() {
    if (!selected) return;

    try {
      setSending(true);

      const { error } = await supabase.rpc("submit_join_request_v2", {
        p_halaqa_id: selected.halaqa_id,
        p_note: note.trim() || null,
        p_applicant_role: "teacher",
      });

      if (error) {
        const message = String(error.message || "");

        if ((message.includes("PENDING_REQUEST_EXISTS") || message.includes("TEACHER_PENDING_REQUEST_EXISTS"))) {
          throw new Error("لديك طلب انضمام قيد المراجعة بالفعل.");
        }

        if ((message.includes("ALREADY_ASSIGNED") || message.includes("TEACHER_ALREADY_ASSIGNED"))) {
          await onMembershipChanged?.();
          return;
        }

        throw error;
      }

      setSelected(null);
      setNote("");
      showToast("تم إرسال طلب الانضمام للمشرف", "success");
      await load();
    } catch (error) {
      console.error("Submit teacher join request error:", error);
      showToast(error?.message || "تعذر إرسال طلب الانضمام", "error");
    } finally {
      setSending(false);
    }
  }

  async function cancelRequest(requestId) {
    try {
      setCancellingId(requestId);

      const { error } = await supabase.rpc("cancel_join_request_v2", {
        p_request_id: requestId,
      });

      if (error) throw error;

      showToast("تم إلغاء الطلب", "success");
      await load();
    } catch (error) {
      console.error("Cancel teacher join request error:", error);
      showToast("تعذر إلغاء الطلب", "error");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="teacher-dashboard td-onboarding">
      <section className="td-onboarding-hero">
        <OrnamentScene primary="01-noor" />

        <div className="td-onboarding-copy">
          <div className="td-hero-kicker">
            <Sparkles size={16} />
            إعداد حساب المعلم
          </div>

          <h1>
            أهلاً {teacher?.full_name || "بك"}
            <span>اختر المسجد والحلقة التي ترغب بالانضمام إليها.</span>
          </h1>

          <p>
            الطلب يصل إلى مشرف المسجد، وعند الموافقة يحدد دورك كمعلم رئيسي أو مساعد.
            بعدها تتحول الصفحة تلقائيًا إلى لوحة المعلم الكاملة.
          </p>
        </div>

        <div className="td-onboarding-steps">
          <Step number="1" title="اختر الحلقة" done={Boolean(pendingRequest)} />
          <Step number="2" title="مراجعة المشرف" active={Boolean(pendingRequest)} />
          <Step number="3" title="بدء العمل" />
        </div>
      </section>

      {pendingRequest && (
        <section className="td-pending-card">
          <div className="td-pending-icon">
            <Clock3 size={22} />
          </div>

          <div className="td-pending-copy">
            <span>طلبك قيد المراجعة</span>
            <strong>
              {pendingRequest.halaqa_name} — {pendingRequest.mosque_name}
            </strong>
            <p>
              أرسل في {formatDate(pendingRequest.created_at)}. بمجرد اعتماد المشرف
              سيظهر لك محتوى الحلقة تلقائيًا.
            </p>
          </div>

          <div className="td-pending-actions">
            <button type="button" className="td-btn-soft" onClick={load}>
              <RefreshCw size={16} />
              تحديث الحالة
            </button>

            <button
              type="button"
              className="td-btn-danger-soft"
              onClick={() => cancelRequest(pendingRequest.request_id)}
              disabled={cancellingId === pendingRequest.request_id}
            >
              {cancellingId === pendingRequest.request_id ? (
                <Loader2 className="td-spin" size={16} />
              ) : (
                <X size={16} />
              )}
              إلغاء الطلب
            </button>
          </div>
        </section>
      )}

      <section className="td-directory">
        <header className="td-directory-head">
          <div>
            <span>دليل الانضمام</span>
            <h2>المساجد والحلقات المتاحة</h2>
            <p>لا تظهر هنا إلا المساجد والحلقات النشطة.</p>
          </div>

          <div className="td-directory-count">
            <Building2 size={17} />
            {filteredDirectory.length} حلقة
          </div>
        </header>

        <div className="td-directory-tools">
          <label className="td-search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم المسجد أو الحلقة أو العنوان…"
            />
          </label>

          <select
            className="td-period-filter"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="all">كل الأوقات</option>
            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="td-directory-loading">
            <Loader2 className="td-spin" />
            جاري تحميل الحلقات…
          </div>
        ) : filteredDirectory.length === 0 ? (
          <div className="td-directory-empty">
            <BookOpen size={28} />
            <strong>لا توجد نتائج مطابقة</strong>
            <span>جرّب تغيير البحث أو وقت الحلقة.</span>
          </div>
        ) : (
          <div className="td-directory-grid">
            {filteredDirectory.map((item) => (
              <article className="td-halaqa-card" key={item.halaqa_id}>
                <div className="td-halaqa-card-top">
                  <div className="td-halaqa-icon">
                    <BookOpen size={21} />
                  </div>

                  <div className="td-live-pill">
                    <span />
                    متاحة
                  </div>
                </div>

                <div className="td-halaqa-main">
                  <span>{item.mosque_name}</span>
                  <h3>{item.halaqa_name}</h3>
                </div>

                <div className="td-halaqa-details">
                  <span>
                    <MapPin size={15} />
                    {item.mosque_address || "العنوان غير مضاف"}
                  </span>

                  <span>
                    <Clock3 size={15} />
                    {PERIOD_LABELS[item.halaqa_period] || "الوقت غير محدد"}
                  </span>

                  <span>
                    <Users size={15} />
                    {item.current_students_count} من {item.capacity || "—"} طالب
                  </span>

                  <span>
                    <ShieldCheck size={15} />
                    {item.teachers_count} معلم مرتبط
                  </span>
                </div>

                <button
                  type="button"
                  className="td-request-button"
                  disabled={Boolean(pendingRequest)}
                  onClick={() => setSelected(item)}
                >
                  {pendingRequest ? "لديك طلب قيد المراجعة" : "طلب الانضمام"}
                  <ArrowLeft size={16} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {requests.some((request) => request.status !== "pending") && (
        <section className="td-request-history">
          <header className="td-section-head">
            <div>
              <span>السجل</span>
              <h3>طلباتك السابقة</h3>
            </div>
          </header>

          <div className="td-history-list">
            {requests
              .filter((request) => request.status !== "pending")
              .slice(0, 5)
              .map((request) => (
                <article key={request.request_id}>
                  <StatusIcon status={request.status} />
                  <div>
                    <strong>
                      {request.halaqa_name} — {request.mosque_name}
                    </strong>
                    <span>
                      {statusLabel(request.status)}
                      {request.decision_note ? ` — ${request.decision_note}` : ""}
                    </span>
                  </div>
                  <time>{formatDate(request.created_at)}</time>
                </article>
              ))}
          </div>
        </section>
      )}

      {selected && (
        <div
          className="td-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !sending) {
              setSelected(null);
            }
          }}
        >
          <section className="td-request-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <span>طلب انضمام جديد</span>
                <h3>{selected.halaqa_name}</h3>
                <p>{selected.mosque_name}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                disabled={sending}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </header>

            <div className="td-request-summary">
              <span>
                <Building2 size={16} />
                {selected.mosque_name}
              </span>
              <span>
                <Clock3 size={16} />
                {PERIOD_LABELS[selected.halaqa_period] || "وقت غير محدد"}
              </span>
              <span>
                <Users size={16} />
                {selected.current_students_count} طالب
              </span>
            </div>

            <label className="td-note-field">
              <span>رسالة للمشرف — اختياري</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                placeholder="مثال: أرغب بالانضمام لهذه الحلقة والمساهمة في برنامج الحفظ والمراجعة…"
              />
              <small>{note.length}/500</small>
            </label>

            <div className="td-request-notice">
              <ShieldCheck size={18} />
              <p>
                إرسال الطلب لا يربطك بالحلقة مباشرة. يجب أن يعتمده أحد مشرفي المسجد،
                وهو من يحدد دورك: رئيسي أو مساعد.
              </p>
            </div>

            <footer>
              <button
                type="button"
                className="td-btn-soft"
                onClick={() => setSelected(null)}
                disabled={sending}
              >
                إلغاء
              </button>

              <button
                type="button"
                className="td-btn-primary"
                onClick={submitRequest}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="td-spin" size={17} />
                ) : (
                  <Send size={17} />
                )}
                {sending ? "جارٍ الإرسال…" : "إرسال الطلب"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function Step({ number, title, done = false, active = false }) {
  return (
    <div className={`td-step ${done ? "is-done" : ""} ${active ? "is-active" : ""}`}>
      <span>{done ? <CheckCircle2 size={18} /> : number}</span>
      <strong>{title}</strong>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === "approved") {
    return (
      <div className="td-history-icon td-history-approved">
        <CheckCircle2 size={17} />
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="td-history-icon td-history-rejected">
        <XCircle size={17} />
      </div>
    );
  }

  return (
    <div className="td-history-icon">
      <X size={17} />
    </div>
  );
}

function statusLabel(status) {
  if (status === "approved") return "مقبول";
  if (status === "rejected") return "مرفوض";
  if (status === "cancelled") return "ملغي";
  return status;
}

function formatDate(value) {
  if (!value) return "—";

  return displayDateFormatter( {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
