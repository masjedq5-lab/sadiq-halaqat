import {displayDateFormatter} from "../../lib/calendar";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { showToast } from "../../components/Toast";

const STATUS = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

function formatDate(value) {
  if (!value) return "—";

  return displayDateFormatter( {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TeacherJoinRequests() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [workingId, setWorkingId] = useState(null);
  const [notes, setNotes] = useState({});

  async function load() {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc(
        "get_teacher_student_join_requests_v2"
      );

      if (error) throw error;
      setRows(data ?? []);
    } catch (error) {
      console.error("Teacher student join requests:", error);
      showToast("تعذر تحميل طلبات الالتحاق", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        status === "all" || row.status === status;

      const matchesSearch =
        !term ||
        [
          row.applicant_name,
          row.applicant_number,
          row.mosque_name,
          row.halaqa_name,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(term)
          );

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, status]);

  const pendingCount = rows.filter(
    (row) => row.status === "pending"
  ).length;

  async function decide(row, decision) {
    if (workingId) return;

    const label = decision === "approved" ? "قبول" : "رفض";

    if (
      !window.confirm(
        `تأكيد ${label} طلب الطالب ${row.applicant_name}؟`
      )
    ) {
      return;
    }

    try {
      setWorkingId(row.request_id);

      const { error } = await supabase.rpc(
        "review_join_request_v2",
        {
          p_request_id: row.request_id,
          p_decision: decision,
          p_teacher_role: null,
          p_decision_note:
            notes[row.request_id]?.trim() || null,
        }
      );

      if (error) throw error;

      showToast(
        decision === "approved"
          ? "تم قبول الطالب وربطه بالحلقة"
          : "تم رفض الطلب",
        "success"
      );

      await load();
    } catch (error) {
      console.error("Teacher review join request:", error);

      const message = String(error?.message || "");

      if (message.includes("REQUEST_ALREADY_DECIDED")) {
        showToast(
          "تم التعامل مع الطلب من المشرف أو معلم آخر بالفعل",
          "info"
        );
        await load();
        return;
      }

      showToast(
        error?.message || "تعذر تنفيذ القرار",
        "error"
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="tjr-page" dir="rtl">
      <section className="tjr-hero">
        <div>
          <span>
            <UserRoundCheck size={16} />
            إدارة طلاب الحلقة
          </span>
          <h1>طلبات الالتحاق</h1>
          <p>
            تظهر هنا طلبات الطلاب للحلقات المرتبطة بك.
            قبولك للطلب يربط الطالب مباشرة بالحلقة.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading}>
          <RefreshCw size={17} className={loading ? "tjr-spin" : ""} />
          تحديث
        </button>
      </section>

      <div className="tjr-summary">
        <div>
          <Clock3 size={18} />
          <span>بانتظارك</span>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <CheckCircle2 size={18} />
          <span>مقبولة</span>
          <strong>
            {rows.filter((row) => row.status === "approved").length}
          </strong>
        </div>
      </div>

      <section className="tjr-panel">
        <div className="tjr-tools">
          <label>
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم الطالب أو الحلقة..."
            />
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="pending">قيد المراجعة</option>
            <option value="all">كل الحالات</option>
            <option value="approved">المقبولة</option>
            <option value="rejected">المرفوضة</option>
            <option value="cancelled">الملغاة</option>
          </select>
        </div>

        {loading ? (
          <div className="tjr-state">
            <Loader2 className="tjr-spin" />
            جارٍ تحميل الطلبات...
          </div>
        ) : filtered.length === 0 ? (
          <div className="tjr-state">
            <Users size={30} />
            <strong>لا توجد طلبات مطابقة</strong>
          </div>
        ) : (
          <div className="tjr-list">
            {filtered.map((row) => (
              <article className="tjr-card" key={row.request_id}>
                <div className="tjr-avatar">
                  <Users size={20} />
                </div>

                <div className="tjr-copy">
                  <div className="tjr-name">
                    <strong>{row.applicant_name}</strong>
                    <span className={`tjr-status ${row.status}`}>
                      {STATUS[row.status] || row.status}
                    </span>
                  </div>

                  <small>
                    {row.applicant_number
                      ? `رقم الطالب: ${row.applicant_number}`
                      : "طالب"}
                  </small>

                  <h3>
                    {row.halaqa_name} — {row.mosque_name}
                  </h3>

                  <time>{formatDate(row.created_at)}</time>

                  {row.note && <p>رسالة الطالب: {row.note}</p>}

                  {row.status !== "pending" && row.decided_by_name && (
                    <p className="tjr-decision">
                      تم التعامل بواسطة {row.decided_by_name}
                      {row.decision_note
                        ? ` — ${row.decision_note}`
                        : ""}
                    </p>
                  )}
                </div>

                {row.status === "pending" && (
                  <div className="tjr-actions">
                    <input
                      value={notes[row.request_id] || ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [row.request_id]: event.target.value,
                        }))
                      }
                      placeholder="ملاحظة — اختياري"
                      maxLength={500}
                    />

                    <button
                      className="approve"
                      type="button"
                      disabled={workingId === row.request_id}
                      onClick={() => decide(row, "approved")}
                    >
                      {workingId === row.request_id ? (
                        <Loader2 size={16} className="tjr-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      قبول
                    </button>

                    <button
                      className="reject"
                      type="button"
                      disabled={workingId === row.request_id}
                      onClick={() => decide(row, "rejected")}
                    >
                      <XCircle size={16} />
                      رفض
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .tjr-page{display:grid;gap:calc(16px * var(--app-density,1))}
        .tjr-hero{display:flex;align-items:center;justify-content:space-between;gap:calc(14px * var(--app-density,1));padding:calc(22px * var(--app-density,1));border-radius:calc(22px * var(--app-radius-scale,1));color:#fff;background:linear-gradient(135deg,var(--app-color-0f4c45,#0f4c45),#0a2f2a);box-shadow:0 16px 42px color-mix(in srgb,var(--app-color-0f4c45,#0f4c45) 12%,transparent)}
        .tjr-hero>div>span{display:flex;align-items:center;gap:calc(6px * var(--app-density,1));color:#efd98b;font-size:calc(11px * var(--app-font-scale,1));font-weight:900}.tjr-hero h1{margin:7px 0 4px;font-size:calc(25px * var(--app-font-scale,1))}.tjr-hero p{margin:0;max-width:660px;color:rgba(255,255,255,.76);font-size:calc(12px * var(--app-font-scale,1));line-height:1.8}
        .tjr-hero>button{min-height:39px;display:flex;align-items:center;gap:calc(7px * var(--app-density,1));padding:0 calc(13px * var(--app-density,1));border:1px solid rgba(255,255,255,.14);border-radius:calc(11px * var(--app-radius-scale,1));color:#fff;background:rgba(255,255,255,.08);font:inherit;font-weight:800;cursor:pointer}
        .tjr-summary{display:grid;grid-template-columns:repeat(2,minmax(0,220px));gap:calc(9px * var(--app-density,1))}.tjr-summary>div{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:calc(8px * var(--app-density,1));padding:calc(12px * var(--app-density,1)) calc(14px * var(--app-density,1));border:1px solid #e1e9e5;border-radius:calc(14px * var(--app-radius-scale,1));background:#fff;color:var(--app-color-0f766e,#0f766e)}.tjr-summary span{color:#718078;font-size:calc(11px * var(--app-font-scale,1))}.tjr-summary strong{font-size:calc(18px * var(--app-font-scale,1));color:#24433a}
        .tjr-panel{padding:calc(15px * var(--app-density,1));border:1px solid #e2eae6;border-radius:calc(20px * var(--app-radius-scale,1));background:#fff}.tjr-tools{display:grid;grid-template-columns:1fr 170px;gap:calc(8px * var(--app-density,1));margin-bottom:12px}.tjr-tools label{display:flex;align-items:center;gap:calc(7px * var(--app-density,1));min-height:40px;padding:0 calc(10px * var(--app-density,1));border:1px solid #dfe7e3;border-radius:calc(10px * var(--app-radius-scale,1));background:#f9fbfa;color:#819088}.tjr-tools input,.tjr-tools select,.tjr-actions input{min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:calc(11px * var(--app-font-scale,1))}.tjr-tools select{min-height:40px;padding:0 calc(9px * var(--app-density,1));border:1px solid #dfe7e3;border-radius:calc(10px * var(--app-radius-scale,1));background:#f9fbfa}
        .tjr-list{display:grid;gap:calc(9px * var(--app-density,1))}.tjr-card{display:grid;grid-template-columns:auto 1fr minmax(250px,32%);gap:calc(11px * var(--app-density,1));align-items:center;padding:calc(14px * var(--app-density,1));border:1px solid #e5ece8;border-radius:calc(15px * var(--app-radius-scale,1));background:#fcfdfc}.tjr-avatar{width:41px;height:41px;display:grid;place-items:center;border-radius:calc(12px * var(--app-radius-scale,1));color:var(--app-color-0f766e,#0f766e);background:#eaf6f0}
        .tjr-copy{min-width:0}.tjr-name{display:flex;align-items:center;gap:calc(7px * var(--app-density,1));flex-wrap:wrap}.tjr-name strong{font-size:calc(13px * var(--app-font-scale,1))}.tjr-copy>small,.tjr-copy>time{display:block;color:#8e9b95;font-size:calc(9px * var(--app-font-scale,1))}.tjr-copy h3{margin:5px 0 2px;color:#465a52;font-size:calc(11px * var(--app-font-scale,1))}.tjr-copy p{margin:7px 0 0;padding:calc(6px * var(--app-density,1)) calc(8px * var(--app-density,1));border-radius:calc(8px * var(--app-radius-scale,1));background:#f2f6f4;color:#60716a;font-size:calc(9px * var(--app-font-scale,1));line-height:1.7}.tjr-copy .tjr-decision{background:#faf7ec;color:#756634}
        .tjr-status{padding:calc(3px * var(--app-density,1)) calc(6px * var(--app-density,1));border-radius:999px;font-size:calc(8px * var(--app-font-scale,1));font-weight:900}.tjr-status.pending{color:#856514;background:#fff5d7}.tjr-status.approved{color:#17623d;background:#e9f7ef}.tjr-status.rejected{color:#9f3737;background:#fff0f0}.tjr-status.cancelled{color:#68736e;background:#eef2f0}
        .tjr-actions{display:grid;grid-template-columns:1fr 1fr;gap:calc(6px * var(--app-density,1))}.tjr-actions input{grid-column:1/-1;min-height:37px;padding:0 calc(9px * var(--app-density,1));border:1px solid #dfe7e3;border-radius:calc(9px * var(--app-radius-scale,1));background:#fff}.tjr-actions button{min-height:37px;display:flex;align-items:center;justify-content:center;gap:calc(5px * var(--app-density,1));border-radius:calc(9px * var(--app-radius-scale,1));font:inherit;font-size:calc(10px * var(--app-font-scale,1));font-weight:900;cursor:pointer}.tjr-actions .approve{border:0;color:#fff;background:var(--app-color-0f766e,#0f766e)}.tjr-actions .reject{border:1px solid #efcccc;color:#9e3939;background:#fff6f6}
        .tjr-state{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(6px * var(--app-density,1));color:#8b9993}.tjr-spin{animation:tjr-spin .8s linear infinite}@keyframes tjr-spin{to{transform:rotate(360deg)}}
        @media(max-width:780px){.tjr-card{grid-template-columns:auto 1fr}.tjr-actions{grid-column:1/-1}.tjr-summary{grid-template-columns:1fr 1fr}}
        @media(max-width:520px){.tjr-hero{align-items:flex-start;padding:calc(17px * var(--app-density,1))}.tjr-hero h1{font-size:calc(21px * var(--app-font-scale,1))}.tjr-tools,.tjr-summary{grid-template-columns:1fr}.tjr-card{grid-template-columns:1fr}.tjr-avatar{display:none}.tjr-actions{grid-column:auto}}
      `}</style>
    </div>
  );
}
