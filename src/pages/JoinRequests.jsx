import {displayDateFormatter} from "../lib/calendar";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react";

import AppPage from "../components/AppPage";
import { supabase } from "../lib/supabase";

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

export default function JoinRequests() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("pending");
  const [workingId, setWorkingId] = useState(null);
  const [teacherRoles, setTeacherRoles] = useState({});
  const [notes, setNotes] = useState({});

  async function load() {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc(
        "get_supervisor_join_requests_v2"
      );

      if (error) throw error;
      setRows(data ?? []);
    } catch (error) {
      console.error("Supervisor join requests:", error);
      window.alert(
        error?.message || "تعذر تحميل طلبات الالتحاق"
      );
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

      const matchesType =
        type === "all" || row.applicant_role === type;

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

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [rows, search, status, type]);

  const stats = useMemo(() => {
    const pending = rows.filter((row) => row.status === "pending");
    return {
      pending: pending.length,
      teachers: pending.filter(
        (row) => row.applicant_role === "teacher"
      ).length,
      students: pending.filter(
        (row) => row.applicant_role === "student"
      ).length,
      approved: rows.filter((row) => row.status === "approved").length,
    };
  }, [rows]);

  async function decide(row, decision) {
    if (workingId) return;

    const teacherRole =
      row.applicant_role === "teacher" && decision === "approved"
        ? teacherRoles[row.request_id] || ""
        : null;

    if (
      row.applicant_role === "teacher" &&
      decision === "approved" &&
      !teacherRole
    ) {
      window.alert("حدد دور المعلم: رئيسي أو مساعد.");
      return;
    }

    const label = decision === "approved" ? "قبول" : "رفض";

    if (
      !window.confirm(
        `تأكيد ${label} طلب ${row.applicant_name}؟`
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
          p_teacher_role: teacherRole || null,
          p_decision_note:
            notes[row.request_id]?.trim() || null,
        }
      );

      if (error) throw error;
      await load();
    } catch (error) {
      console.error("Review join request:", error);

      const message = String(error?.message || "");

      if (message.includes("REQUEST_ALREADY_DECIDED")) {
        window.alert(
          "تم التعامل مع هذا الطلب من طرف آخر بالفعل. سيتم تحديث القائمة."
        );
        await load();
        return;
      }

      if (message.includes("HALAQA_MAIN_TEACHER_EXISTS")) {
        window.alert(
          "هذه الحلقة لديها معلم رئيسي بالفعل. اختر دور معلم مساعد."
        );
        return;
      }

      window.alert(
        error?.message || "تعذر تنفيذ القرار"
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <AppPage>
      <div className="jr-page" dir="rtl">
        <section className="jr-hero">
          <div>
            <span className="jr-kicker">
              <ShieldCheck size={16} />
              بوابة المشرف
            </span>
            <h1>طلبات الالتحاق</h1>
            <p>
              اعتماد طلبات المعلمين والطلاب للمساجد والحلقات
              التابعة لك.
            </p>
          </div>

          <button
            type="button"
            className="jr-refresh"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "jr-spin" : ""} />
            تحديث
          </button>
        </section>

        <section className="jr-stats">
          <Stat icon={Clock3} label="بانتظار الموافقة" value={stats.pending} />
          <Stat icon={GraduationCap} label="طلبات معلمين" value={stats.teachers} />
          <Stat icon={Users} label="طلبات طلاب" value={stats.students} />
          <Stat icon={CheckCircle2} label="تم قبولها" value={stats.approved} />
        </section>

        <section className="jr-panel">
          <div className="jr-tools">
            <label className="jr-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث بالاسم أو المسجد أو الحلقة..."
              />
            </label>

            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">كل الأنواع</option>
              <option value="teacher">المعلمون</option>
              <option value="student">الطلاب</option>
            </select>

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
            <div className="jr-state">
              <Loader2 className="jr-spin" />
              جارٍ تحميل الطلبات...
            </div>
          ) : filtered.length === 0 ? (
            <div className="jr-state">
              <UserRoundCheck size={30} />
              <strong>لا توجد طلبات مطابقة</strong>
              <span>ستظهر الطلبات الجديدة هنا فور إرسالها.</span>
            </div>
          ) : (
            <div className="jr-list">
              {filtered.map((row) => (
                <article className="jr-card" key={row.request_id}>
                  <div className="jr-card-main">
                    <div
                      className={
                        row.applicant_role === "teacher"
                          ? "jr-avatar teacher"
                          : "jr-avatar student"
                      }
                    >
                      {row.applicant_role === "teacher" ? (
                        <GraduationCap size={21} />
                      ) : (
                        <Users size={21} />
                      )}
                    </div>

                    <div className="jr-copy">
                      <div className="jr-name-row">
                        <strong>{row.applicant_name}</strong>
                        <span className={`jr-status ${row.status}`}>
                          {STATUS[row.status] || row.status}
                        </span>
                      </div>

                      <span className="jr-kind">
                        {row.applicant_role === "teacher"
                          ? "طلب انضمام معلم"
                          : "طلب انضمام طالب"}
                        {row.applicant_number
                          ? ` • ${row.applicant_number}`
                          : ""}
                      </span>

                      <h3>
                        {row.halaqa_name} — {row.mosque_name}
                      </h3>

                      <small>{formatDate(row.created_at)}</small>

                      {row.note && (
                        <p className="jr-note">
                          رسالة مقدم الطلب: {row.note}
                        </p>
                      )}

                      {row.status !== "pending" && (
                        <p className="jr-decision">
                          {row.decided_by_name
                            ? `تم التعامل بواسطة ${row.decided_by_name}`
                            : "تم التعامل مع الطلب"}
                          {row.decision_note
                            ? ` — ${row.decision_note}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {row.status === "pending" && (
                    <div className="jr-actions">
                      {row.applicant_role === "teacher" && (
                        <select
                          value={teacherRoles[row.request_id] || ""}
                          onChange={(event) =>
                            setTeacherRoles((current) => ({
                              ...current,
                              [row.request_id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">دور المعلم...</option>
                          <option value="main">معلم رئيسي</option>
                          <option value="assistant">معلم مساعد</option>
                        </select>
                      )}

                      <input
                        value={notes[row.request_id] || ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [row.request_id]: event.target.value,
                          }))
                        }
                        placeholder="ملاحظة القرار — اختياري"
                        maxLength={500}
                      />

                      <button
                        type="button"
                        className="jr-approve"
                        disabled={workingId === row.request_id}
                        onClick={() => decide(row, "approved")}
                      >
                        {workingId === row.request_id ? (
                          <Loader2 size={16} className="jr-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        قبول
                      </button>

                      <button
                        type="button"
                        className="jr-reject"
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
      </div>

      <style>{`
        .jr-page{display:grid;gap:calc(18px * var(--app-density,1));color:#263d35}
        .jr-hero{display:flex;align-items:center;justify-content:space-between;gap:calc(16px * var(--app-density,1));padding:calc(24px * var(--app-density,1));border:1px solid #dce8e2;border-radius:calc(24px * var(--app-radius-scale,1));background:linear-gradient(135deg,var(--app-color-0f4c45,#0f4c45),#0a2f2a);box-shadow:0 18px 45px color-mix(in srgb,var(--app-color-0f4c45,#0f4c45) 13%,transparent)}
        .jr-hero h1{margin:8px 0 5px;color:#fff;font-size:calc(28px * var(--app-font-scale,1))}
        .jr-hero p{margin:0;color:rgba(255,255,255,.76);font-size:calc(14px * var(--app-font-scale,1))}
        .jr-kicker{display:inline-flex;align-items:center;gap:calc(6px * var(--app-density,1));color:#efd98b;font-size:calc(12px * var(--app-font-scale,1));font-weight:900}
        .jr-refresh{display:inline-flex;align-items:center;gap:calc(7px * var(--app-density,1));min-height:40px;padding:0 calc(14px * var(--app-density,1));border:1px solid rgba(255,255,255,.15);border-radius:calc(12px * var(--app-radius-scale,1));color:#fff;background:rgba(255,255,255,.08);font-family:inherit;font-weight:800;cursor:pointer}
        .jr-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:calc(12px * var(--app-density,1))}
        .jr-stat{display:flex;align-items:center;gap:calc(10px * var(--app-density,1));padding:calc(15px * var(--app-density,1));border:1px solid #e1e9e5;border-radius:calc(17px * var(--app-radius-scale,1));background:#fff;box-shadow:0 8px 24px color-mix(in srgb,var(--app-color-0f4c45,#0f4c45) 4.5%,transparent)}
        .jr-stat-icon{width:39px;height:39px;display:grid;place-items:center;border-radius:calc(12px * var(--app-radius-scale,1));color:var(--app-color-0f766e,#0f766e);background:#eaf6f0}
        .jr-stat span,.jr-stat strong{display:block}.jr-stat span{color:#7d8d86;font-size:calc(11px * var(--app-font-scale,1))}.jr-stat strong{margin-top:2px;font-size:calc(21px * var(--app-font-scale,1));color:#173e35}
        .jr-panel{padding:calc(16px * var(--app-density,1));border:1px solid #e1e9e5;border-radius:calc(22px * var(--app-radius-scale,1));background:#fff}
        .jr-tools{display:grid;grid-template-columns:minmax(240px,1fr) 170px 170px;gap:calc(9px * var(--app-density,1));margin-bottom:14px}
        .jr-tools select,.jr-tools input{min-height:42px;border:1px solid #dfe8e3;border-radius:calc(11px * var(--app-radius-scale,1));padding:0 calc(11px * var(--app-density,1));background:#f9fbfa;color:#334a41;font:inherit;font-size:calc(12px * var(--app-font-scale,1));outline:none}
        .jr-search{display:flex;align-items:center;gap:calc(7px * var(--app-density,1));min-height:42px;border:1px solid #dfe8e3;border-radius:calc(11px * var(--app-radius-scale,1));padding:0 calc(10px * var(--app-density,1));background:#f9fbfa;color:#809087}
        .jr-search input{flex:1;min-width:0;border:0;padding:0;background:transparent}
        .jr-list{display:grid;gap:calc(10px * var(--app-density,1))}
        .jr-card{display:flex;align-items:stretch;justify-content:space-between;gap:calc(16px * var(--app-density,1));padding:calc(15px * var(--app-density,1));border:1px solid #e5ece8;border-radius:calc(17px * var(--app-radius-scale,1));background:linear-gradient(180deg,#fff,#fbfcfb)}
        .jr-card-main{display:flex;gap:calc(11px * var(--app-density,1));min-width:0;flex:1}
        .jr-avatar{width:43px;height:43px;flex:0 0 43px;display:grid;place-items:center;border-radius:calc(13px * var(--app-radius-scale,1))}.jr-avatar.teacher{color:#8a6a20;background:#fff8e5}.jr-avatar.student{color:var(--app-color-0f766e,#0f766e);background:#e9f6f0}
        .jr-copy{min-width:0;flex:1}.jr-name-row{display:flex;align-items:center;gap:calc(8px * var(--app-density,1));flex-wrap:wrap}.jr-name-row strong{font-size:calc(14px * var(--app-font-scale,1))}.jr-kind{display:block;margin-top:3px;color:#87948e;font-size:calc(10px * var(--app-font-scale,1))}.jr-copy h3{margin:7px 0 2px;font-size:calc(12px * var(--app-font-scale,1));color:#43574f}.jr-copy small{color:#9aa59f;font-size:calc(9px * var(--app-font-scale,1))}
        .jr-note,.jr-decision{margin:8px 0 0;padding:calc(7px * var(--app-density,1)) calc(9px * var(--app-density,1));border-radius:calc(9px * var(--app-radius-scale,1));background:#f5f8f6;color:#5f7069;font-size:calc(10px * var(--app-font-scale,1));line-height:1.7}.jr-decision{background:#f9f7ef;color:#756638}
        .jr-status{padding:calc(3px * var(--app-density,1)) calc(7px * var(--app-density,1));border-radius:999px;font-size:calc(9px * var(--app-font-scale,1));font-weight:900}.jr-status.pending{color:#8a671b;background:#fff7dc}.jr-status.approved{color:#17633e;background:#eaf7ef}.jr-status.rejected{color:#9d3535;background:#fff0f0}.jr-status.cancelled{color:#65716c;background:#eef2f0}
        .jr-actions{width:min(380px,38%);display:grid;grid-template-columns:1fr 1fr;gap:calc(7px * var(--app-density,1));align-content:center}.jr-actions select,.jr-actions input{grid-column:1/-1;min-height:38px;border:1px solid #dfe8e3;border-radius:calc(10px * var(--app-radius-scale,1));padding:0 calc(10px * var(--app-density,1));background:#fff;font:inherit;font-size:calc(10px * var(--app-font-scale,1))}
        .jr-actions button{min-height:38px;display:flex;align-items:center;justify-content:center;gap:calc(6px * var(--app-density,1));border-radius:calc(10px * var(--app-radius-scale,1));font:inherit;font-size:calc(11px * var(--app-font-scale,1));font-weight:900;cursor:pointer}.jr-approve{border:0;color:#fff;background:var(--app-color-0f766e,#0f766e)}.jr-reject{border:1px solid #f0cccc;color:#a33d3d;background:#fff5f5}
        .jr-state{min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(6px * var(--app-density,1));color:#8b9992}.jr-state strong{color:#40554c}.jr-state span{font-size:calc(11px * var(--app-font-scale,1))}
        .jr-spin{animation:jr-spin .8s linear infinite}@keyframes jr-spin{to{transform:rotate(360deg)}}
        @media(max-width:900px){.jr-stats{grid-template-columns:repeat(2,1fr)}.jr-tools{grid-template-columns:1fr 1fr}.jr-search{grid-column:1/-1}.jr-card{display:grid}.jr-actions{width:100%}}
        @media(max-width:560px){.jr-hero{align-items:flex-start;padding:calc(18px * var(--app-density,1))}.jr-hero h1{font-size:calc(22px * var(--app-font-scale,1))}.jr-stats{grid-template-columns:1fr}.jr-tools{grid-template-columns:1fr}.jr-search{grid-column:auto}.jr-actions{grid-template-columns:1fr}.jr-actions select,.jr-actions input{grid-column:auto}}
      `}</style>
    </AppPage>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <article className="jr-stat">
      <div className="jr-stat-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
