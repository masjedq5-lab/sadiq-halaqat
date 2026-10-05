import {displayDateFormatter} from "../../../lib/calendar";
import { OrnamentScene } from '../../../components/ornaments/Ornament';
import {
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const PERIOD_LABELS = {
  after_fajr: "بعد الفجر",
  after_dhuhr: "بعد الظهر",
  after_asr: "بعد العصر",
  after_maghrib: "بعد المغرب",
  after_isha: "بعد العشاء",
};

export default function TeacherHero({
  teacher,
  assignments = [],
  activeHalaqaId,
  onHalaqaChange,
  assignment,
  stats = {},
}) {
  const todayGregorian = displayDateFormatter( {
    timeZone: "Asia/Riyadh",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());


  return (
    <section className="td-hero">
      <OrnamentScene primary="02-shams" pattern />

      <div className="td-hero-copy">
        <div className="td-hero-kicker">
          <Sparkles size={16} />
          مساحة المعلم اليومية
        </div>

        <h2>
          حيّاك الله،
          <span>{teacher?.full_name || "المعلم"}</span>
        </h2>

        <p>
          كل ما تحتاجه للحضور والتسميع ومتابعة طلاب الحلقة في مكان واحد سريع وواضح.
        </p>

        <div className="td-hero-meta">
          <span>
            <Building2 size={16} />
            {assignment?.mosque_name || "—"}
          </span>

          <span>
            <BookOpen size={16} />
            {assignment?.halaqa_name || "—"}
          </span>

          <span>
            <ShieldCheck size={16} />
            {assignment?.teacher_role === "main" ? "معلم رئيسي" : "معلم مساعد"}
          </span>
        </div>

        <div className="td-date-line">
          <CalendarDays size={16} />
          <span>{todayGregorian}</span>

        </div>
      </div>

      <div className="td-hero-control">
        <div className="td-hero-control-head">
          <span>الحلقة الحالية</span>
          <strong>
            {assignments.length} {assignments.length === 1 ? "حلقة" : "حلقات"}
          </strong>
        </div>

        <label className="td-halaqa-select">
          <BookOpen size={18} />
          <select
            value={activeHalaqaId ?? ""}
            onChange={(event) => onHalaqaChange(Number(event.target.value))}
          >
            {assignments.map((item) => (
              <option value={item.halaqa_id} key={item.halaqa_id}>
                {item.halaqa_name} — {item.mosque_name}
              </option>
            ))}
          </select>
          <ChevronDown size={18} />
        </label>

        <div className="td-hero-control-grid">
          <div>
            <strong>{stats.studentsCount ?? 0}</strong>
            <span>
              <Users size={14} />
              طالب
            </span>
          </div>

          <div>
            <strong>{stats.presentCount ?? 0}</strong>
            <span>حاضر اليوم</span>
          </div>

          <div>
            <strong>{stats.recitationsCount ?? 0}</strong>
            <span>تسميع اليوم</span>
          </div>
        </div>

        <div className="td-hero-period">
          وقت الحلقة:
          <strong>
            {PERIOD_LABELS[assignment?.halaqa_period] || "غير محدد"}
          </strong>
        </div>
      </div>
    </section>
  );
}
