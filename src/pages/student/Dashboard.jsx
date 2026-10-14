import { useEffect, useMemo, useState } from "react";
import { BellRing, BookOpen, CalendarCheck, CalendarRange, CheckCircle2, ChevronLeft, CircleGauge, Flame, Route, Sparkles, Trophy, UserRoundSearch } from "lucide-react";
import { Link } from "react-router-dom";

import StudentPage from "../../components/student/StudentPage";
import { useStudentPortal } from "../../context/StudentPortalContext";
import { supabase } from "../../lib/supabase";
import { effectiveMonthlyPlans } from "../../lib/effectiveLearning";
import {
  clampPercent,
  facesToPretty,
  getHijriMonthRange,
  getHijriParts,
  getRiyadhDateKey,
} from "../../lib/studentPortalUtils";
import "./StudentPortal.css";

function accepted(value) {
  const text = String(value || "").trim().toLowerCase();
  return !["إعادة", "اعادة", "repeat"].includes(text);
}

function dayKeyInRiyadh() {
  const english = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();

  return english;
}

export default function StudentDashboard() {
  const { profile, halaqa } = useStudentPortal();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    plan: null,
    progress: null,
    recitations: [],
    attendance: [],
    unread: 0,
    memDone: 0,
    revDone: 0,
  });



  async function load() {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const hijri = getHijriParts();
      const period = getHijriMonthRange(hijri.year, hijri.month);

      const [planResult, progressResult, recitationsResult, attendanceResult, notificationResult] =
        await Promise.all([
          halaqa?.id
            ? supabase
                .from("monthly_plans")
                .select("*")
                .eq("student_id", profile.id)
                .eq("halaqa_id", halaqa.id)
                .eq("hijri_year", hijri.year)
                .eq("hijri_month", hijri.month)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

          halaqa?.id
            ? supabase
                .from("monthly_progress")
                .select("*")
                .eq("student_id", profile.id)
                .eq("halaqa_id", halaqa.id)
                .eq("hijri_year", hijri.year)
                .eq("hijri_month", hijri.month)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

          supabase
            .from("recitations")
            .select(
              "id,recitation_date,lesson_faces_manual,lesson_faces,lesson_evaluation,review_faces,review_evaluation,points"
            )
            .eq("student_id", profile.id)
            .gte("recitation_date", period.start)
            .lte("recitation_date", period.end)
            .order("recitation_date", { ascending: false }),

          supabase
            .from("attendance")
            .select("id,attendance_date,status")
            .eq("student_id", profile.id)
            .gte("attendance_date", period.start)
            .lte("attendance_date", period.end)
            .order("attendance_date", { ascending: false }),

          supabase
            .from("student_notifications")
            .select("id", { count: "exact", head: true })
            .eq("student_id", profile.id)
            .is("read_at", null),
        ]);

      if (planResult?.error) console.warn("dashboard plan", planResult.error);
      if (progressResult?.error) console.warn("dashboard progress", progressResult.error);
      if (recitationsResult?.error) console.warn("dashboard recitations", recitationsResult.error);
      if (attendanceResult?.error) console.warn("dashboard attendance", attendanceResult.error);

      const recitations = recitationsResult?.data || [];
      const progress = progressResult?.data || null;

      const autoMem = recitations.reduce((sum, row) => {
        if (!accepted(row.lesson_evaluation)) return sum;
        return sum + Number(row.lesson_faces_manual ?? row.lesson_faces ?? 0);
      }, 0);

      const autoRev = recitations.reduce((sum, row) => {
        if (!accepted(row.review_evaluation)) return sum;
        return sum + Number(row.review_faces || 0);
      }, 0);

      const [effectivePlan] = await effectiveMonthlyPlans(planResult?.data ? [planResult.data] : [], halaqa?.id, period);
      setData({
        plan: effectivePlan || null,
        progress,
        recitations,
        attendance: attendanceResult?.data || [],
        unread: notificationResult?.error ? 0 : Number(notificationResult?.count || 0),
        memDone: autoMem + Number(progress?.manual_memorization_faces || 0),
        revDone: autoRev + Number(progress?.manual_revision_faces || 0),
      });
    } catch (error) {
      console.error("Student dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
      load();
    }, [profile?.id, halaqa?.id]);

  const summary = useMemo(() => {
    const memTarget = Number(data.plan?.memorization_target_faces || 0);
    const revTarget = Number(data.plan?.revision_target_faces || 0);
    const memPercent = memTarget ? clampPercent((data.memDone / memTarget) * 100) : 0;
    const revPercent = revTarget ? clampPercent((data.revDone / revTarget) * 100) : 0;
    const parts = [memTarget ? memPercent : null, revTarget ? revPercent : null].filter(
      (value) => value !== null
    );
    const overall = parts.length
      ? Math.round(parts.reduce((sum, value) => sum + value, 0) / parts.length)
      : 0;

    const present = data.attendance.filter((row) => row.status === "present").length;
    const late = data.attendance.filter((row) => row.status === "late").length;
    const absent = data.attendance.filter(
      (row) => row.status === "absent" || row.status === "excused"
    ).length;
    const attendanceRate = data.attendance.length
      ? Math.round(((present + late) / data.attendance.length) * 100)
      : 0;

    const last7Key = new Date();
    last7Key.setDate(last7Key.getDate() - 7);
    const recentAbsence = data.attendance.filter(
      (row) =>
        row.attendance_date >= getRiyadhDateKey(last7Key) &&
        (row.status === "absent" || row.status === "excused")
    ).length;

    const repeats = data.recitations.filter(
      (row) =>
        !accepted(row.lesson_evaluation) || !accepted(row.review_evaluation)
    ).length;

    return {
      memTarget,
      revTarget,
      memPercent,
      revPercent,
      overall,
      attendanceRate,
      absent,
      recentAbsence,
      repeats,
    };
  }, [data]);

  const todayIsRecitation = Array.isArray(profile?.recitation_days)
    ? profile.recitation_days.includes(dayKeyInRiyadh())
    : false;

  const motivation = useMemo(() => {
    if (summary.recentAbsence > 0) {
      return {
        title: "العودة اليوم تصنع الفرق",
        body: "ظهر غياب حديث في سجلك. اجعل حضورك القادم بداية سلسلة جديدة من الانتظام.",
        tone: "gold",
      };
    }

    if (summary.repeats >= 3) {
      return {
        title: "الإتقان قبل الكثرة",
        body: "ظهرت بعض الإعادات هذا الشهر. مقدار أقل بإتقان قد يرفع مستواك أسرع من الاستعجال.",
        tone: "blue",
      };
    }

    if (summary.overall >= 90) {
      return {
        title: "أنت قريب جدًا من القمة",
        body: "إنجازك الشهري ممتاز. حافظ على الثبات حتى نهاية الشهر ولا تترك الجلسات الأخيرة.",
        tone: "green",
      };
    }

    if (summary.overall >= 70) {
      return {
        title: "تقدم جميل",
        body: "أنت تتحرك في الاتجاه الصحيح. الاستمرار اليومي هو أقصر طريق لإكمال الخطة.",
        tone: "green",
      };
    }

    return {
      title: "رحلتك تبدأ بجلسة واحدة",
      body: "لا تنظر للهدف كاملًا؛ ركّز على جلسة اليوم فقط، ثم كررها غدًا.",
      tone: "gold",
    };
  }, [summary]);

  return (
    <StudentPage
      eyebrow="لوحتي الذكية"
      title={`أهلًا ${profile?.full_name?.split(" ")?.[0] || "بك"}`}
      description="كل ما يهم رحلتك اليوم: خطتك، إنجازك، حضورك، نقاطك وما يحتاج انتباهك."
      icon={CircleGauge}

      className="student-dashboard"
      context={<>
        <span><BookOpen size={14} />{halaqa?.name || "لم تحدد الحلقة"}</span>
        <span>{todayIsRecitation ? "اليوم من أيام تسميعك" : "استعد للجلسة القادمة"}</span>
      </>}
      action={<Link to="/student/halaqa">تفاصيل حلقتي <ChevronLeft size={15} /></Link>}
    >
      {loading ? (
        <div className="student-loading">جارٍ تجهيز لوحتك الذكية…</div>
      ) : (
        <>
          <section className="student-grid student-grid-2">
            <article className="student-panel">
              <div className="student-panel-head">
                <div className="student-panel-title">
                  <div className="student-panel-title-icon"><Flame size={19} /></div>
                  <div><span>خطوات سريعة</span><h3>ماذا تريد أن ترى؟</h3></div>
                </div>
              </div>

              <div className="student-dashboard-actions">
                <QuickLink to="/student/recitations" icon={BookOpen} title="آخر تسميع" note="راجع تقييمك" />
                <QuickLink to="/student/monthly-plan" icon={CalendarRange} title="خطتي" note="ما المطلوب؟" />
                <QuickLink to="/student/points" icon={Trophy} title="ترتيبي" note="نافس زملاءك" />
                <QuickLink to="/student/notifications" icon={BellRing} title="الإشعارات" note={`${data.unread} جديدة`} />
              </div>
            </article>
            <article className="student-panel">
              <div className="student-panel-head">
                <div className="student-panel-title">
                  <div className="student-panel-title-icon"><Route size={19} /></div>
                  <div><span>رحلتي</span><h3>تقدم هذا الشهر</h3></div>
                </div>
                <Link className="student-inline-link" to="/student/monthly-achievement">عرض الرحلة</Link>
              </div>

              <DashboardProgress title="الحفظ" done={data.memDone} target={summary.memTarget} percent={summary.memPercent} />
              <div style={{ height: 9 }} />
              <DashboardProgress title="المراجعة" done={data.revDone} target={summary.revTarget} percent={summary.revPercent} />
            </article>
          </section>

          <section className="student-metrics">
            <Metric icon={CalendarCheck} label="الحضور" value={`${summary.attendanceRate}%`} note={`${summary.absent} غياب/عذر هذا الشهر`} />
            <Metric icon={UserRoundSearch} label="التسميع" value={data.recitations.length} note="جلسة هذا الشهر" />
            <Metric icon={Trophy} label="نقاطي" value={Number(profile?.total_points || 0)} note="واصل جمع النقاط" />
          </section>



          <section className="student-dashboard-message">
            <div className="student-dashboard-message-icon"><Sparkles size={20} /></div>
            <div>
              <span>رسالة الصديق لك</span>
              <strong>{motivation.title}</strong>
            </div>
            <CheckCircle2 size={21} />
          </section>
        </>
      )}
    </StudentPage>
  );
}

function Metric({ icon: Icon, label, value, note }) {
  return (
    <article className="student-metric">
      <div className="student-metric-icon"><Icon size={20} /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    </article>
  );
}

function DashboardProgress({ title, done, target, percent }) {
  return (
    <div className="student-progress-card">
      <div className="student-progress-head">
        <div><span>{title}</span><strong>{facesToPretty(done)} / {facesToPretty(target)}</strong></div>
        <div className="student-progress-value">{percent}%</div>
      </div>
      <div className="student-progress-track"><div style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, note }) {
  return (
    <Link to={to} className="student-dashboard-action">
      <div><Icon size={18} /></div>
      <span><strong>{title}</strong><small>{note}</small></span>
      <ChevronLeft size={16} />
    </Link>
  );
}
