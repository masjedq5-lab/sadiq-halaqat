import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  GraduationCap,
  Loader2,
  Medal,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";

import StudentPage from "../../components/student/StudentPage";
import ExamCertificate from "../../components/student/ExamCertificate";
import { useStudentPortal } from "../../context/StudentPortalContext";
import { supabase } from "../../lib/supabase";
import {
  examMessage,
  formatGregorianDate,
  formatHijriDate,
  formatNumber,
} from "../../lib/studentPortalUtils";

import "./StudentPortal.css";
import "./StudentExamsV2.css";

function gradeLabel(score) {
  const value = Number(score || 0);
  if (value >= 95) return "ممتاز مرتفع";
  if (value >= 90) return "ممتاز";
  if (value >= 85) return "جيد جدًا مرتفع";
  if (value >= 80) return "جيد جدًا";
  if (value >= 75) return "جيد مرتفع";
  if (value >= 70) return "جيد";
  if (value >= 60) return "مقبول";
  return "لم يجتز";
}

function scoreText(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function dateKey(value) {
  return String(value || "").slice(0, 10);
}

function getExamState(row) {
  if (row.result) {
    return {
      key: "final",
      label: "النتيجة معتمدة",
      tone: "success",
    };
  }

  if (row.teacher_result_ready) {
    return {
      key: "pending_final",
      label: "بانتظار اعتماد النتائج",
      tone: "gold",
    };
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const start = dateKey(row.start_date);
  const end = dateKey(row.end_date);

  if (start && today < start) {
    return {
      key: "upcoming",
      label: "اختبار قادم",
      tone: "blue",
    };
  }

  if (end && today > end) {
    return {
      key: "ended",
      label: "انتهت المدة",
      tone: "neutral",
    };
  }

  return {
    key: "active",
    label: "جارٍ الاختبار",
    tone: "green",
  };
}

export default function StudentExams() {
  const { profile } = useStudentPortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [details, setDetails] = useState(null);
  const [certificate, setCertificate] = useState(null);

  useEffect(() => {
    if (profile?.id) load();
  }, [profile?.id]);

  async function load() {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError("");

      const { data, error: rpcError } = await supabase.rpc(
        "student_exam_portal_v2"
      );

      if (rpcError) throw rpcError;

      setRows(Array.isArray(data?.exams) ? data.exams : []);
    } catch (loadError) {
      console.error("Student Exams V2:", loadError);
      setError(
        loadError.message || "تعذر تحميل اختباراتك. حاول مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  }

  const finalizedRows = useMemo(
    () => rows.filter((row) => row.result),
    [rows]
  );

  const stats = useMemo(() => {
    const scores = finalizedRows.map((row) => Number(row.result?.score || 0));
    const average = scores.length
      ? scores.reduce((sum, value) => sum + value, 0) / scores.length
      : 0;

    return {
      total: rows.length,
      average,
      passed: finalizedRows.filter((row) => row.result?.is_passed).length,
      certificates: rows.filter((row) => row.certificate).length,
      best: scores.length ? Math.max(...scores) : 0,
    };
  }, [rows, finalizedRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const state = getExamState(row);

      if (filter === "results" && !row.result) return false;
      if (filter === "certificates" && !row.certificate) return false;
      if (filter === "current" && !["active", "upcoming", "pending_final"].includes(state.key)) {
        return false;
      }

      if (!q) return true;

      return [row.title, row.mosque_name, ...(row.parts || [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, filter]);

  return (
    <StudentPage
      eyebrow="رحلة الإتقان"
      title="اختباراتي"
      description="اختباراتك ونتائجك وشهادات إنجازك في مكان واحد، بصورة رسمية وواضحة تليق برحلتك مع القرآن."
      icon={GraduationCap}
    >
      <section className="sex-hero-strip">
        <div className="sex-hero-seal">
          <Trophy size={26} />
        </div>
        <div>
          <span>سجل إنجازك القرآني</span>
          <strong>
            كل نتيجة معتمدة تصبح محطة موثقة في رحلتك، والشهادة تظهر لك
            تلقائيًا عند الاجتياز.
          </strong>
        </div>
      </section>

      <section className="student-metrics sex-metrics">
        <Metric
          icon={GraduationCap}
          label="الاختبارات"
          value={formatNumber(stats.total)}
          note="المسندة لك"
        />
        <Metric
          icon={Target}
          label="متوسط النتائج"
          value={`${scoreText(stats.average)}%`}
          note="للنتائج المعتمدة"
        />
        <Metric
          icon={CheckCircle2}
          label="المجتازة"
          value={formatNumber(stats.passed)}
          note="نتيجة ناجحة"
        />
        <Metric
          icon={Award}
          label="الشهادات"
          value={formatNumber(stats.certificates)}
          note="شهادة إنجاز"
        />
        <Metric
          icon={Medal}
          label="أفضل نتيجة"
          value={`${scoreText(stats.best)}%`}
          note="أعلى درجة معتمدة"
        />
      </section>

      <section className="student-panel sex-panel">
        <div className="sex-toolbar">
          <div className="sex-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم الاختبار أو المسجد..."
            />
          </div>

          <div className="sex-filter-tabs">
            {[
              ["all", "الكل"],
              ["current", "الحالية"],
              ["results", "النتائج"],
              ["certificates", "الشهادات"],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={filter === key ? "active" : ""}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="student-loading sex-loading">
            <Loader2 className="sex-spin" size={25} />
            جارٍ تجهيز سجل اختباراتك…
          </div>
        ) : error ? (
          <div className="sex-error">
            <ShieldCheck size={24} />
            <strong>تعذر تحميل الاختبارات</strong>
            <span>{error}</span>
            <button type="button" onClick={load}>إعادة المحاولة</button>
          </div>
        ) : !filtered.length ? (
          <div className="student-empty sex-empty">
            <GraduationCap size={30} />
            <strong>لا توجد اختبارات مطابقة</strong>
            <span>ستظهر الاختبارات والنتائج والشهادات هنا تلقائيًا.</span>
          </div>
        ) : (
          <div className="sex-grid">
            {filtered.map((row) => (
              <ExamCard
                row={row}
                key={row.exam_id}
                onDetails={() => setDetails(row)}
                onCertificate={() => setCertificate(row)}
              />
            ))}
          </div>
        )}
      </section>

      {details && (
        <ResultModal
          row={details}
          onClose={() => setDetails(null)}
          onCertificate={() => {
            setCertificate(details);
            setDetails(null);
          }}
        />
      )}

      {certificate && (
        <ExamCertificate
          row={certificate}
          studentName={profile?.full_name || "الطالب"}
          onClose={() => setCertificate(null)}
        />
      )}
    </StudentPage>
  );
}

function Metric({ icon: Icon, label, value, note }) {
  return (
    <article className="student-metric">
      <div className="student-metric-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function ExamCard({ row, onDetails, onCertificate }) {
  const state = getExamState(row);
  const result = row.result;
  const score = Number(result?.score || 0);
  const message = result ? examMessage(score) : null;

  return (
    <article className={`sex-card ${result ? "has-result" : ""}`}>
      <div className="sex-card-top">
        <div>
          <span className="sex-card-kicker">اختبار القرآن الكريم</span>
          <h3>{row.title || "اختبار"}</h3>
          <p>{row.mosque_name || "—"}</p>
        </div>

        {result ? (
          <div className="sex-score-orb">
            <strong>{scoreText(score)}</strong>
            <span>/100</span>
          </div>
        ) : (
          <span className={`sex-status ${state.tone}`}>{state.label}</span>
        )}
      </div>

      <div className="sex-card-dates">
        <div>
          <CalendarDays size={13} />
          <span>{formatHijriDate(row.start_date)}</span>
        </div>

      </div>

      <div className="sex-card-info">
        <InfoCell label="عدد الأسئلة" value={`${row.questions_count || 3} أسئلة`} />
        <InfoCell
          label="الأجزاء"
          value={
            row.parts?.length
              ? row.parts.map((part) => `ج${part}`).join("، ")
              : "—"
          }
        />
      </div>

      {result ? (
        <div className="sex-result-message">
          <div>
            <Sparkles size={15} />
            <strong>{gradeLabel(score)}</strong>
          </div>
          <p>{message?.body}</p>
        </div>
      ) : state.key === "pending_final" ? (
        <div className="sex-pending-box">
          <ShieldCheck size={15} />
          <div>
            <strong>تم إنهاء اختبارك</strong>
            <span>النتيجة محفوظة وتنتظر الاعتماد النهائي قبل عرضها لك.</span>
          </div>
        </div>
      ) : (
        <div className="sex-pending-box neutral">
          <Clock3 size={15} />
          <div>
            <strong>{state.label}</strong>
            <span>
              {state.key === "upcoming"
                ? "استعد بهدوء وراجع الأجزاء المحددة لك."
                : state.key === "active"
                ? "اختبارك ضمن المدة الحالية وسيجريه المعلم المختبر."
                : "ستظهر النتيجة بعد اعتمادها النهائي."}
            </span>
          </div>
        </div>
      )}

      <div className="sex-card-actions">
        {result && (
          <button type="button" className="sex-secondary" onClick={onDetails}>
            <Eye size={14} />
            عرض التفاصيل
          </button>
        )}

        {row.certificate && (
          <button type="button" className="sex-primary" onClick={onCertificate}>
            <Award size={14} />
            شهادة الإنجاز
          </button>
        )}
      </div>
    </article>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="sex-info-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultModal({ row, onClose, onCertificate }) {
  const result = row.result;
  const score = Number(result?.score || 0);

  const content = (
    <div className="sex-modal" role="dialog" aria-modal="true">
      <section className="sex-modal-card">
        <header className="sex-modal-head">
          <div className="sex-modal-title">
            <div className="sex-modal-icon">
              <FileCheck2 size={18} />
            </div>
            <div>
              <strong>{row.title}</strong>
              <span>تفاصيل النتيجة المعتمدة</span>
            </div>
          </div>

          <button type="button" className="sex-close" onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <div className="sex-modal-body">
          <div className="sex-result-hero">
            <div className="sex-result-medal">
              <Trophy size={30} />
            </div>

            <span>النتيجة النهائية</span>
            <strong>
              {scoreText(score)}
              <small>/100</small>
            </strong>
            <b>{gradeLabel(score)}</b>
          </div>

          <div className="sex-result-grid">
            <ResultCell label="الأخطاء" value={result.error_count ?? 0} />
            <ResultCell label="التنبيهات" value={result.prompt_count ?? 0} />
            <ResultCell
              label="أخطاء التجويد"
              value={result.tajweed_error_count ?? 0}
            />
            <ResultCell
              label="إجمالي الخصم"
              value={`-${scoreText(result.deduction || 0)}`}
            />
            <ResultCell
              label="الحالة"
              value={result.is_passed ? "مجتاز" : "لم يجتز"}
              highlight
            />
            <ResultCell
              label="التقدير"
              value={gradeLabel(score)}
              highlight
            />
          </div>

          {result.notes && (
            <div className="sex-notes">
              <span>ملاحظة المعلم</span>
              <p>{result.notes}</p>
            </div>
          )}

          <div className="sex-result-footer">
            <div>
              <span>التاريخ</span>
              <strong>{formatHijriDate(row.end_date || row.start_date)}</strong>
            </div>

          </div>

          {row.certificate && (
            <button type="button" className="sex-primary wide" onClick={onCertificate}>
              <Award size={15} />
              فتح شهادة الإنجاز
            </button>
          )}
        </div>
      </section>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
}

function ResultCell({ label, value, highlight = false }) {
  return (
    <div className={`sex-result-cell ${highlight ? "highlight" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
