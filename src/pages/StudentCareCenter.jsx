import CompactPageHeader from "../components/CompactPageHeader";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BookOpenCheck, CheckCircle2, ChevronLeft, CircleDot, RefreshCw, Search, ShieldCheck, Sparkles, Target, UserRoundSearch, Users, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./StudentCareCenter.css";

const CARE_ORDER = { needs_attention: 0, watch: 1, steady: 2 };

function careMeta(level) {
  if (level === "needs_attention") return { label: "يحتاج عناية", tone: "danger" };
  if (level === "watch") return { label: "متابعة", tone: "warning" };
  return { label: "مستقر", tone: "success" };
}

function severityMeta(severity) {
  if (severity === "high") return { label: "أولوية عالية", tone: "danger" };
  if (severity === "warning") return { label: "متابعة", tone: "warning" };
  if (severity === "positive") return { label: "إيجابي", tone: "success" };
  return { label: "معلومة", tone: "neutral" };
}

function formatRange(row) {
  if (!row?.from_surah || !row?.to_surah) return "موضع محفوظ";
  if (row.from_surah === row.to_surah) return `${row.from_surah} ${row.from_ayah} ← ${row.to_ayah}`;
  return `${row.from_surah} ${row.from_ayah} ← ${row.to_surah} ${row.to_ayah}`;
}

function segmentLabel(type) {
  if (type === "lesson") return "الدرس";
  if (type === "side_lesson") return "جنب الدرس";
  if (type === "revision") return "المراجعة";
  if (type === "stabilization_review") return "مراجعة التثبيت";
  return "المطلوب";
}

export default function StudentCareCenter() {
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [halaqas, setHalaqas] = useState([]);
  const [halaqaId, setHalaqaId] = useState("");
  const [rows, setRows] = useState([]);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [intervention, setIntervention] = useState(null);
  const [savingIntervention, setSavingIntervention] = useState(false);
  const [completingIntervention, setCompletingIntervention] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { boot(); }, []);
  useEffect(() => { if (halaqaId) loadCare(Number(halaqaId)); }, [halaqaId]);

  async function boot() {
    try {
      setLoading(true);
      setError("");
      const [halaqaResult, roleResult] = await Promise.all([
        supabase.rpc("get_care_center_halaqas"),
        supabase.rpc("current_profile_role"),
      ]);
      if (halaqaResult.error) throw halaqaResult.error;
      if (roleResult.error) throw roleResult.error;
      const list = halaqaResult.data || [];
      setRole(roleResult.data || "");
      setHalaqas(list);
      if (list[0]?.halaqa_id) setHalaqaId(String(list[0].halaqa_id));
    } catch (e) {
      console.error("Care center boot:", e);
      setError("تعذر تحميل نطاق مركز العناية.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCare(id) {
    try {
      setLoadingRows(true);
      setError("");
      const { data, error: rpcError } = await supabase.rpc("get_halaqa_care_analysis", {
        p_halaqa_id: id,
      });
      if (rpcError) throw rpcError;
      setRows(data || []);
      setSelected((current) => {
        if (!current) return null;
        const next = (data || []).find((row) => Number(row.student_id) === Number(current.student_id));
        return next || null;
      });
    } catch (e) {
      console.error("Care center analysis:", e);
      setRows([]);
      setError("تعذر قراءة التحليل المركزي لهذه الحلقة.");
    } finally {
      setLoadingRows(false);
    }
  }

  const stats = useMemo(() => ({
    total: rows.length,
    attention: rows.filter((row) => row.care_level === "needs_attention").length,
    watch: rows.filter((row) => row.care_level === "watch").length,
    steady: rows.filter((row) => row.care_level === "steady").length,
  }), [rows]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...rows]
      .filter((row) => filter === "all" || row.care_level === filter)
      .filter((row) => !query || String(row.student_name || "").toLowerCase().includes(query))
      .sort((a, b) => {
        const careDiff = (CARE_ORDER[a.care_level] ?? 9) - (CARE_ORDER[b.care_level] ?? 9);
        if (careDiff) return careDiff;
        const highDiff = Number(b.high_count || 0) - Number(a.high_count || 0);
        if (highDiff) return highDiff;
        return Number(b.warning_count || 0) - Number(a.warning_count || 0);
      });
  }, [rows, search, filter]);

  const selectedHalaqa = halaqas.find((item) => String(item.halaqa_id) === String(halaqaId));
  const canApproveIntervention = role === "teacher" || role === "admin";

  function openIntervention(row, signal = null) {
    if (!canApproveIntervention) return;
    setIntervention({
      row,
      type: "stabilization_partial",
      reason: "",
      trigger: signal?.staff_body || signal?.staff_title || "مؤشرات من مركز العناية",
      lessonAmount: "",
      lessonUnit: "lines",
      reviewAmount: "",
      reviewUnit: "faces",
    });
  }

  async function saveIntervention(event) {
    event.preventDefault();
    if (!intervention?.reason?.trim()) return;

    if (
      intervention.type === "stabilization_partial" &&
      Number(intervention.lessonAmount || 0) <= 0
    ) {
      setError("حدد مقدار الحفظ المخفّض في التثبيت الجزئي.");
      return;
    }

    try {
      setSavingIntervention(true);
      setError("");
      const analysis = intervention.row.analysis || {};

      const lessonAmount =
        intervention.type === "stabilization_partial"
          ? Number(intervention.lessonAmount)
          : null;

      const lessonUnit =
        intervention.type === "stabilization_partial"
          ? intervention.lessonUnit
          : null;

      const reviewAmount =
        intervention.type === "pause" ||
        !String(intervention.reviewAmount || "").trim()
          ? null
          : Number(intervention.reviewAmount);

      const reviewUnit =
        reviewAmount !== null
          ? intervention.reviewUnit
          : null;

      const { error: rpcError } = await supabase.rpc(
        "create_learning_intervention_from_analysis_v2",
        {
          p_student_id: Number(intervention.row.student_id),
          p_halaqa_id: Number(halaqaId),
          p_intervention_type: intervention.type,
          p_confirmed_reason: intervention.reason.trim(),
          p_trigger_summary: intervention.trigger || null,
          p_source_plan_id: analysis.plan?.id || null,
          p_lesson_override_amount: lessonAmount,
          p_lesson_override_unit: lessonUnit,
          p_review_daily_amount: reviewAmount,
          p_review_daily_unit: reviewUnit,
        }
      );

      if (rpcError) throw rpcError;

      setIntervention(null);
      await loadCare(Number(halaqaId));
    } catch (e) {
      console.error("Create intervention:", e);
      setError(
        e?.message?.includes("ACTIVE_INTERVENTION_EXISTS")
          ? "يوجد تدخل تربوي نشط لهذا الطالب. أنهِ التدخل الحالي أولًا."
          : "تعذر تسجيل قرار العناية. راجع الإعدادات والسبب المؤكد."
      );
    } finally {
      setSavingIntervention(false);
    }
  }

  async function completeIntervention(row) {
    const active = row?.analysis?.active_intervention;
    if (!active?.id || !canApproveIntervention) return;

    const approved = window.confirm(
      "هل تريد إنهاء التدخل الحالي؟\n\nسيتم إيقاف مطلوبات التدخل المتبقية، وتعود الجلسة التالية للخطة من آخر موضع فعلي."
    );

    if (!approved) return;

    try {
      setCompletingIntervention(true);
      setError("");

      const { error: rpcError } = await supabase.rpc(
        "complete_learning_intervention",
        {
          p_intervention_id: Number(active.id),
          p_completion_note: "أنهى المعلم التدخل من مركز العناية",
        }
      );

      if (rpcError) throw rpcError;

      await loadCare(Number(halaqaId));
    } catch (e) {
      console.error("Complete intervention:", e);
      setError("تعذر إنهاء التدخل التربوي الحالي.");
    } finally {
      setCompletingIntervention(false);
    }
  }

  if (loading) {
    return <div className="care-page"><div className="care-loading"><RefreshCw size={22}/><span>جارٍ تجهيز مركز العناية…</span></div></div>;
  }

  return (
    <div className="care-page" dir="rtl">
      <CompactPageHeader title="العناية بالطلاب" actions={<>
<button type="button" className="care-refresh" onClick={() => halaqaId && loadCare(Number(halaqaId))} disabled={loadingRows}>
          <RefreshCw size={17}/><span>{loadingRows ? "جارٍ التحديث" : "تحديث"}</span>
        </button>
</>} />

      {error && <div className="care-error"><AlertTriangle size={17}/><span>{error}</span></div>}

      <section className="care-toolbar">
        <label className="care-field">
          <span>الحلقة</span>
          <select value={halaqaId} onChange={(e) => setHalaqaId(e.target.value)}>
            {halaqas.map((item) => (
              <option key={item.halaqa_id} value={item.halaqa_id}>{item.halaqa_name} — {item.mosque_name}</option>
            ))}
          </select>
        </label>
        <label className="care-search">
          <Search size={18}/>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم الطالب" />
        </label>
        <div className="care-filters">
          {[
            ["all", "الكل"],
            ["needs_attention", "يحتاج عناية"],
            ["watch", "متابعة"],
            ["steady", "مستقر"],
          ].map(([value, label]) => (
            <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
      </section>

      <section className="care-metrics">
        <CareMetric icon={Users} label="طلاب الحلقة" value={stats.total} note={selectedHalaqa?.halaqa_name || "الحلقة الحالية"} />
        <CareMetric icon={AlertTriangle} label="يحتاج عناية" value={stats.attention} note="إشارة عالية واحدة فأكثر" tone="danger" />
        <CareMetric icon={Activity} label="تحت المتابعة" value={stats.watch} note="إشارات تحتاج مراقبة" tone="warning" />
        <CareMetric icon={ShieldCheck} label="مستقر" value={stats.steady} note="لا توجد إشارة مقلقة الآن" tone="success" />
      </section>

      <section className="care-grid">
        {loadingRows ? (
          <div className="care-empty"><RefreshCw size={25}/><strong>جارٍ تحليل طلاب الحلقة…</strong></div>
        ) : !visible.length ? (
          <div className="care-empty"><UserRoundSearch size={28}/><strong>لا توجد نتائج مطابقة</strong><span>غيّر الفلتر أو عبارة البحث.</span></div>
        ) : visible.map((row) => {
          const meta = careMeta(row.care_level);
          const signals = row.analysis?.signals || [];
          const primary = signals.find((item) => item.severity === "high") || signals.find((item) => item.severity === "warning") || signals[0];
          return (
            <article className={`care-student-card ${meta.tone}`} key={row.student_id}>
              <div className="care-student-head">
                <div className="care-avatar"><span>{String(row.student_name || "ط").trim().charAt(0) || "ط"}</span></div>
                <div className="care-student-name"><span>الطالب</span><h3>{row.student_name}</h3></div>
                <span className={`care-badge ${meta.tone}`}>{meta.label}</span>
              </div>
              <div className="care-signal-summary">
                <strong>{primary?.staff_title || "لا توجد إشارة مقلقة الآن"}</strong>
                <p>{primary?.staff_body || "المؤشرات الحالية مستقرة ضمن البيانات المتاحة."}</p>
              </div>
              <div className="care-mini-stats">
                <span><b>{row.high_count || 0}</b> عالية</span>
                <span><b>{row.warning_count || 0}</b> متابعة</span>
                <span><b>{row.positive_count || 0}</b> إيجابية</span>
              </div>
              <button type="button" className="care-open" onClick={() => setSelected(row)}>
                <span>فتح التحليل</span><ChevronLeft size={17}/>
              </button>
            </article>
          );
        })}
      </section>

      {selected && (
        <CareDetails
          row={selected}
          role={role}
          onClose={() => setSelected(null)}
          onIntervention={openIntervention}
          onCompleteIntervention={completeIntervention}
          completingIntervention={completingIntervention}
        />
      )}

      {intervention && (
        <div className="care-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setIntervention(null)}>
          <form className="care-intervention-modal" onSubmit={saveIntervention}>
            <div className="care-modal-head">
              <div><span>قرار المعلم</span><h3>تسجيل تدخل تربوي</h3></div>
              <button type="button" onClick={() => setIntervention(null)}><X size={19}/></button>
            </div>
            <div className="care-decision-note"><Sparkles size={17}/><span>هذه إشارة للمساعدة فقط. عند اعتماد التدخل سيتغير المطلوب القادم، وتبقى الخطة الأصلية محفوظة.</span></div>
            <label className="care-form-field">
              <span>نوع التدخل</span>
              <select value={intervention.type} onChange={(e) => setIntervention((v) => ({ ...v, type: e.target.value }))}>
                <option value="stabilization_partial">تثبيت جزئي</option>
                <option value="stabilization_full">تثبيت كامل</option>
                <option value="pause">إيقاف مؤقت</option>
              </select>
            </label>

            {intervention.type === "stabilization_partial" && (
              <div className="care-intervention-params">
                <label className="care-form-field">
                  <span>مقدار الحفظ المخفّض</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={intervention.lessonAmount}
                    onChange={(e) =>
                      setIntervention((v) => ({
                        ...v,
                        lessonAmount: e.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="care-form-field">
                  <span>الوحدة</span>
                  <select
                    value={intervention.lessonUnit}
                    onChange={(e) =>
                      setIntervention((v) => ({
                        ...v,
                        lessonUnit: e.target.value,
                      }))
                    }
                  >
                    <option value="lines">أسطر</option>
                    <option value="faces">أوجه</option>
                  </select>
                </label>
              </div>
            )}

            {intervention.type !== "pause" && (
              <div className="care-intervention-params">
                <label className="care-form-field">
                  <span>
                    مقدار المراجعة أثناء التدخل
                    <small>اختياري — اتركه فارغًا لاستخدام مراجعة الخطة</small>
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={intervention.reviewAmount}
                    onChange={(e) =>
                      setIntervention((v) => ({
                        ...v,
                        reviewAmount: e.target.value,
                      }))
                    }
                  />
                </label>

                <label className="care-form-field">
                  <span>الوحدة</span>
                  <select
                    value={intervention.reviewUnit}
                    onChange={(e) =>
                      setIntervention((v) => ({
                        ...v,
                        reviewUnit: e.target.value,
                      }))
                    }
                  >
                    <option value="lines">أسطر</option>
                    <option value="faces">أوجه</option>
                  </select>
                </label>
              </div>
            )}

            <label className="care-form-field">
              <span>السبب المؤكد من المعلم</span>
              <textarea
                value={intervention.reason}
                onChange={(e) => setIntervention((v) => ({ ...v, reason: e.target.value }))}
                rows={4}
                required
                placeholder="اكتب السبب الذي تأكدت منه بعد مراجعة حالة الطالب…"
              />
            </label>
            <div className="care-trigger"><span>المؤشر الذي فتح القرار</span><p>{intervention.trigger}</p></div>
            <div className="care-modal-actions">
              <button type="button" className="ghost" onClick={() => setIntervention(null)}>إلغاء</button>
              <button
                type="submit"
                className="primary"
                disabled={
                  savingIntervention ||
                  !intervention.reason.trim() ||
                  (
                    intervention.type === "stabilization_partial" &&
                    Number(intervention.lessonAmount || 0) <= 0
                  )
                }
              >
                {savingIntervention ? "جارٍ الحفظ…" : "اعتماد التدخل وربطه بالمطلوب"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CareMetric({ icon: Icon, label, value, note, tone = "neutral" }) {
  return (
    <article className={`care-metric ${tone}`}>
      <div className="care-metric-icon"><Icon size={20}/></div>
      <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    </article>
  );
}

function CareDetails({
  row,
  role,
  onClose,
  onIntervention,
  onCompleteIntervention,
  completingIntervention,
}) {
  const analysis = row.analysis || {};
  const metrics = analysis.metrics || {};
  const att = metrics.attendance_14d || {};
  const rec = metrics.recitation_recent || {};
  const plan = analysis.plan;
  const signals = analysis.signals || [];
  const next = analysis.next_assignments || [];
  const meta = careMeta(row.care_level);
  const canApprove = role === "teacher" || role === "admin";

  return (
    <div className="care-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="care-details-modal">
        <div className="care-modal-head">
          <div><span>الملف التحليلي</span><h3>{row.student_name}</h3></div>
          <button type="button" onClick={onClose}><X size={19}/></button>
        </div>

        <div className="care-detail-summary">
          <span className={`care-badge ${meta.tone}`}>{meta.label}</span>
          <p>{analysis.analysis_note}</p>
        </div>

        <div className="care-detail-metrics">
          <MiniMetric label="الحضور 14 يوم" value={att.rate == null ? "—" : `${att.rate}%`} note={`${att.absent || 0} غياب • ${att.late || 0} تأخر`} />
          <MiniMetric label="نتائج حديثة" value={rec.outcomes || 0} note={`${rec.repeat || 0} إعادة • ${rec.under || 0} أقل`} />
          <MiniMetric label="آخر تسميع" value={rec.days_since_recitation == null ? "—" : `قبل ${rec.days_since_recitation} يوم`} note={rec.last_recitation || "لا يوجد"} />
          <MiniMetric label="الخطة" value={plan?.status === "approved" ? `${plan.overall_percent ?? 0}%` : plan ? "غير معتمدة" : "لا توجد"} note={plan?.active_for_analysis ? `المتوقع تقريبًا ${plan.expected_percent}%` : "لا ينتج عنها إنذار تأخر"} />
        </div>

        <section className="care-detail-section">
          <div className="care-section-title"><AlertTriangle size={18}/><div><span>الإشارات</span><h4>لماذا ظهر الطالب هنا؟</h4></div></div>
          {!signals.length ? <div className="care-small-empty">لا توجد إشارات تحليلية حاليًا.</div> : (
            <div className="care-signal-list">
              {signals.map((signal) => {
                const s = severityMeta(signal.severity);
                return (
                  <article className={`care-signal ${s.tone}`} key={signal.code}>
                    <div className="care-signal-top"><strong>{signal.staff_title}</strong><span>{s.label}</span></div>
                    <p>{signal.staff_body}</p>
                    {signal.suggested_action && <div className="care-suggestion"><Target size={15}/><span>{signal.suggested_action}</span></div>}
                    {canApprove &&
                      signal.teacher_decision_required &&
                      !analysis.active_intervention && (
                        <button type="button" onClick={() => onIntervention(row, signal)}>
                          تسجيل قرار عناية
                        </button>
                      )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="care-detail-section">
          <div className="care-section-title"><BookOpenCheck size={18}/><div><span>القادم</span><h4>المطلوب القرآني القادم</h4></div></div>
          {!next.length ? <div className="care-small-empty">لا يوجد مطلوب قادم مولّد حاليًا.</div> : (
            <div className="care-next-list">
              {next.map((item) => (
                <article key={item.id}>
                  <span>{segmentLabel(item.segment_type)} • {item.date}</span>
                  <strong>{formatRange(item)}</strong>
                </article>
              ))}
            </div>
          )}
        </section>

        {analysis.active_intervention && (
          <section className="care-detail-section">
            <div className="care-section-title"><CircleDot size={18}/><div><span>قرار قائم</span><h4>تدخل تربوي نشط</h4></div></div>
            <div className="care-active-intervention">
              <strong>
                {analysis.active_intervention.type === "stabilization_partial"
                  ? "تثبيت جزئي"
                  : analysis.active_intervention.type === "stabilization_full"
                    ? "تثبيت كامل"
                    : "إيقاف مؤقت"}
              </strong>

              <p>
                {analysis.active_intervention.confirmed_reason ||
                  analysis.active_intervention.trigger_summary ||
                  "تدخل مسجل"}
              </p>

              {analysis.active_intervention.lesson_override_amount && (
                <small>
                  مقدار الحفظ أثناء التدخل:{" "}
                  {analysis.active_intervention.lesson_override_amount}{" "}
                  {analysis.active_intervention.lesson_override_unit === "lines"
                    ? "سطر"
                    : "وجه"}
                </small>
              )}

              {analysis.active_intervention.review_daily_amount && (
                <small>
                  مقدار المراجعة أثناء التدخل:{" "}
                  {analysis.active_intervention.review_daily_amount}{" "}
                  {analysis.active_intervention.review_daily_unit === "lines"
                    ? "سطر"
                    : "وجه"}
                </small>
              )}

              {canApprove && (
                <button
                  type="button"
                  className="care-complete-intervention"
                  onClick={() => onCompleteIntervention(row)}
                  disabled={completingIntervention}
                >
                  {completingIntervention
                    ? "جارٍ إنهاء التدخل…"
                    : "إنهاء التدخل والعودة للخطة"}
                </button>
              )}
            </div>
          </section>
        )}

        {!canApprove && (
          <div className="care-supervisor-note"><CheckCircle2 size={17}/><span>المشرف يرى المؤشرات والمتابعة، أما اعتماد التدخل التعليمي فيبقى للمعلم أو مدير النظام.</span></div>
        )}
      </div>
    </div>
  );
}

function MiniMetric({ label, value, note }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
