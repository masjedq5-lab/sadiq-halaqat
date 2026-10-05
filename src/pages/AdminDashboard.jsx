import {displayDateFormatter} from "../lib/calendar";
import {monthRange, dateKey} from "../lib/calendar";
import Ornament, { OrnamentScene } from '../components/ornaments/Ornament';
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AppPage from "../components/AppPage";

import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  ClipboardCheck,
  Mic2,
  CheckCircle2,
  XCircle,
  Clock3,
  Activity,
  FileCheck,
  Trophy,
  BarChart3,
  Gift,
  ArrowUpLeft,
  UserRoundCheck,
} from "lucide-react";

/* =========================================================
   Helpers
========================================================= */

function formatHijri(date) {
  try {
    return displayDateFormatter(
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    ).format(date);
  } catch {
    return "";
  }
}


function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function average(values = []) {
  if (!values.length) return 0;
  return Math.round(
    values.reduce((sum, item) => sum + Number(item || 0), 0) /
      values.length
  );
}

function IslamicHeroOrnament() {
  return <OrnamentScene primary="03-falak" pattern="06-naseej" />;
}

function HeroSeal() {
  return <Ornament name="01-noor" className="sq-hero-seal" />;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  note,
}) {
  return (
    <div className="dashboard-metric-card">
      <div
        className="dashboard-metric-topline"
        style={{ background: color }}
      />

      <div className="dashboard-metric-head">
        <div>
          <div className="dashboard-metric-title">
            {title}
          </div>

          <div className="dashboard-metric-subtitle">
            {subtitle}
          </div>
        </div>

        <div
          className="dashboard-metric-icon"
          style={{
            color,
            background: `${color}14`,
            border: `1px solid ${color}20`,
          }}
        >
          <Icon size={22} />
        </div>
      </div>

      <div
        className="dashboard-metric-value"
        style={{ color }}
      >
        {value}
      </div>

      <div className="dashboard-metric-note">
        {note}
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  color,
  icon: Icon,
}) {
  return (
    <div className="dashboard-status-card">
      <div
        className="dashboard-status-icon"
        style={{
          color,
          background: `${color}15`,
          border: `1px solid ${color}22`,
        }}
      >
        <Icon size={18} />
      </div>

      <div className="dashboard-status-copy">
        <span>{title}</span>
        <strong style={{ color }}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function HealthIndicator({
  title,
  value,
  color,
  description,
}) {
  return (
    <div className="dashboard-health-card">
      <div className="dashboard-health-head">
        <strong>{title}</strong>
        <span style={{ color }}>
          {value}%
        </span>
      </div>

      <div className="dashboard-health-bar">
        <div
          className="dashboard-health-bar-fill"
          style={{
            width: `${Math.max(
              0,
              Math.min(100, value)
            )}%`,
            background: color,
          }}
        />
      </div>

      <div className="dashboard-health-description">
        {description}
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="dashboard-action-card"
    >
      <div className="dashboard-action-icon">
        <Icon size={20} />
      </div>

      <div className="dashboard-action-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <div className="dashboard-action-arrow">
        <ArrowUpLeft size={18} />
      </div>
    </button>
  );
}

/* =========================================================
   Page
========================================================= */

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [overview, setOverview] =
    useState({
      students: 0,
      teachers: 0,
      halaqat: 0,
      activeHalaqat: 0,
      mosques: 0,
      recitationsToday: 0,
      scheduledExams: 0,
      pointsToday: 0,
      monthlyApproved: 0,
      monthlyTotal: 0,
    });

  const [attendance, setAttendance] =
    useState({
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
    });

  

  async function loadDashboard() {
    try {
      setLoading(true);

      const today = dateKey();
      const {start: monthStart, nextStart: nextMonthStart} = monthRange(today, "hijri");

      const [
        studentsRes,
        teachersRes,
        halaqatRes,
        activeHalaqatRes,
        mosquesRes,
        attendanceRes,
        recitationsTodayRes,
        scheduledExamsRes,
        pointsTodayRes,
        monthlyProgressRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("role", "student"),

        supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("role", "teacher"),

        supabase
          .from("halaqat")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("halaqat")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "active"),

        supabase
          .from("mosques")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("attendance")
          .select("status")
          .eq("attendance_date", today),

        supabase
          .from("recitations")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("recitation_date", today),

        supabase
          .from("exams")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "scheduled"),

        supabase
          .from("points_transactions")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("transaction_date", today),

        supabase
          .from("monthly_progress")
          .select("id,approved")
          .gte("progress_month", monthStart)
          .lt("progress_month", nextMonthStart),
      ]);

      const attendanceRows =
        attendanceRes.data || [];

      const monthlyRows =
        monthlyProgressRes.data || [];

      const present =
        attendanceRows.filter(
          (x) => x.status === "present"
        ).length;

      const absent =
        attendanceRows.filter(
          (x) => x.status === "absent"
        ).length;

      const late =
        attendanceRows.filter(
          (x) => x.status === "late"
        ).length;

      const excused =
        attendanceRows.filter(
          (x) => x.status === "excused"
        ).length;

      const monthlyApproved =
        monthlyRows.filter(
          (x) => x.approved === true
        ).length;

      setOverview({
        students:
          studentsRes.count || 0,
        teachers:
          teachersRes.count || 0,
        halaqat:
          halaqatRes.count || 0,
        activeHalaqat:
          activeHalaqatRes.count || 0,
        mosques:
          mosquesRes.count || 0,
        recitationsToday:
          recitationsTodayRes.count || 0,
        scheduledExams:
          scheduledExamsRes.count || 0,
        pointsToday:
          pointsTodayRes.count || 0,
        monthlyApproved,
        monthlyTotal:
          monthlyRows.length || 0,
      });

      setAttendance({
        present,
        absent,
        late,
        excused,
        total:
          attendanceRows.length || 0,
      });
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
      loadDashboard();
    }, []);

  const todayHijri = formatHijri(
    new Date()
  );


  const attendanceRate = percent(
    attendance.present,
    attendance.total
  );

  const recitationCoverage =
    percent(
      overview.recitationsToday,
      overview.students
    );

  const halaqatVitality = percent(
    overview.activeHalaqat,
    overview.halaqat
  );

  const monthlyCompletionRate =
    percent(
      overview.monthlyApproved,
      overview.monthlyTotal
    );

  const dashboardVitalIndex =
    average([
      attendanceRate,
      recitationCoverage,
      halaqatVitality,
      monthlyCompletionRate,
    ]);

  const quickActions = useMemo(
    () => [
      {
        title: "الطلاب",
        description:
          "إدارة بيانات الطلاب ومتابعتهم",
        icon: Users,
        path: "/admin/students",
      },
      {
        title: "المعلمون",
        description:
          "عرض المعلمين وربطهم بالحلقات",
        icon: GraduationCap,
        path: "/admin/teachers",
      },
      {
        title: "طلبات الالتحاق",
        description:
          "اعتماد طلبات المعلمين والطلاب",
        icon: UserRoundCheck,
        path: "/admin/join-requests",
      },
      {
        title: "الحلقات",
        description:
          "إدارة الحلقات ومواعيدها",
        icon: BookOpen,
        path: "/admin/halaqat",
      },
      {
        title: "الحضور",
        description:
          "متابعة الحضور والغياب اليومي",
        icon: ClipboardCheck,
        path: "/admin/attendance",
      },
      {
        title: "التسميع",
        description:
          "إدارة سجلات التسميع والمراجعة",
        icon: Mic2,
        path: "/admin/recitations",
      },
      {
        title: "الاختبارات",
        description:
          "الاختبارات والنتائج والاعتماد",
        icon: FileCheck,
        path: "/admin/exams",
      },
      {
        title: "الإنجاز الشهري",
        description:
          "متابعة الإنجاز الفعلي للطلاب",
        icon: Trophy,
        path: "/admin/monthly-achievement",
      },
      {
        title: "النقاط",
        description:
          "إدارة المنح والخصومات",
        icon: Gift,
        path: "/admin/points-transactions",
      },
      {
        title: "التقارير",
        description:
          "تقارير تشغيلية وإدارية",
        icon: BarChart3,
        path: "/admin/reports",
      },
    ],
    []
  );

  return (
    <AppPage>
      <div
        className="supervisor-dashboard"
        dir="rtl"
      >
        {/* HERO */}
        <section className="supervisor-hero">
          <IslamicHeroOrnament />

          <div className="supervisor-hero-grid">
            <div className="supervisor-hero-content">
              <div className="supervisor-hero-eyebrow">
                <HeroSeal />
                <span>مركز الإشراف والمتابعة</span>
              </div>

              <h1 className="supervisor-hero-title">
                لوحة التحكم
              </h1>

              <p className="supervisor-hero-text">
                رؤية موحّدة لأداء الحلقات والطلاب والمعلمين،
                ومتابعة المؤشرات اليومية والإنجاز من مكان واحد.
              </p>

              <Ornament name="10-ittizan" className="supervisor-hero-divider" />
            </div>

            <div className="supervisor-hero-side">
              <div className="supervisor-date-card">
                <span>تاريخ اليوم</span>
                <strong>
                  {todayHijri}
                </strong>

              </div>

              <div className="supervisor-vital-card">
                <div className="supervisor-vital-head">
                  <span>
                    المؤشر الحيوي
                  </span>
                  <strong>
                    {loading
                      ? "..."
                      : `${dashboardVitalIndex}%`}
                  </strong>
                </div>

                <div className="supervisor-vital-bar">
                  <div
                    className="supervisor-vital-fill"
                    style={{
                      width: `${dashboardVitalIndex}%`,
                    }}
                  />
                </div>

                <p>
                  يعكس مستوى النشاط العام
                  بناءً على الحضور والتسميع
                  والإنجاز الشهري وحيوية
                  الحلقات.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* OVERVIEW STATS */}
        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <div>
              <h2>
                الإحصائيات الرئيسية
              </h2>
              <p>
                نظرة سريعة على أهم مؤشرات
                النظام
              </p>
            </div>
          </div>

          <div className="dashboard-grid metrics-4">
            <MetricCard
              title="الطلاب"
              value={
                loading
                  ? "..."
                  : overview.students
              }
              icon={Users}
              color="#2563EB"
              subtitle="إجمالي الطلاب"
              note="قاعدة المستفيدين من الحلقات"
            />

            <MetricCard
              title="المعلمون"
              value={
                loading
                  ? "..."
                  : overview.teachers
              }
              icon={GraduationCap}
              color="#0F766E"
              subtitle="إجمالي المعلمين"
              note="الكادر التعليمي المرتبط بالنظام"
            />

            <MetricCard
              title="الحلقات"
              value={
                loading
                  ? "..."
                  : overview.halaqat
              }
              icon={BookOpen}
              color="#7C3AED"
              subtitle="إجمالي الحلقات"
              note={`النشط منها: ${overview.activeHalaqat}`}
            />

            <MetricCard
              title="المساجد"
              value={
                loading
                  ? "..."
                  : overview.mosques
              }
              icon={Building2}
              color="#B45309"
              subtitle="المواقع التابعة"
              note="المساجد المسجلة داخل النظام"
            />
          </div>
        </section>

        {/* ACTIVITY STATS */}
        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <div>
              <h2>
                النشاط اليومي والتشغيلي
              </h2>
              <p>
                مؤشرات مرتبطة بالصفحات التي
                تم بناؤها في النظام
              </p>
            </div>
          </div>

          <div className="dashboard-grid metrics-4">
            <MetricCard
              title="الحضور اليوم"
              value={
                loading
                  ? "..."
                  : attendance.total
              }
              icon={ClipboardCheck}
              color="#0F766E"
              subtitle="سجلات الحضور"
              note="إجمالي الطلاب الذين تم التعامل مع حضورهم اليوم"
            />

            <MetricCard
              title="التسميع اليوم"
              value={
                loading
                  ? "..."
                  : overview.recitationsToday
              }
              icon={Mic2}
              color="#0891B2"
              subtitle="سجلات التسميع"
              note="عدد سجلات التسميع المسجلة اليوم"
            />

            <MetricCard
              title="اختبارات مجدولة"
              value={
                loading
                  ? "..."
                  : overview.scheduledExams
              }
              icon={FileCheck}
              color="#DC2626"
              subtitle="الحالة: مجدول"
              note="عدد الاختبارات الجاهزة أو المعلقة"
            />

            <MetricCard
              title="عمليات النقاط"
              value={
                loading
                  ? "..."
                  : overview.pointsToday
              }
              icon={Gift}
              color="#16A34A"
              subtitle="عمليات اليوم"
              note="منح وخصومات مسجلة خلال اليوم"
            />
          </div>
        </section>

        {/* ATTENDANCE STATUS */}
        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <div>
              <h2>ملخص الحضور اليوم</h2>
              <p>
                توزيع مباشر لحالة الطلاب في
                سجلات الحضور
              </p>
            </div>
          </div>

          <div className="dashboard-grid status-4">
            <StatusCard
              title="حاضر"
              value={
                loading
                  ? "..."
                  : attendance.present
              }
              color="#16A34A"
              icon={CheckCircle2}
            />

            <StatusCard
              title="غائب"
              value={
                loading
                  ? "..."
                  : attendance.absent
              }
              color="#DC2626"
              icon={XCircle}
            />

            <StatusCard
              title="متأخر"
              value={
                loading
                  ? "..."
                  : attendance.late
              }
              color="#D97706"
              icon={Clock3}
            />

            <StatusCard
              title="معتذر"
              value={
                loading
                  ? "..."
                  : attendance.excused
              }
              color="#6366F1"
              icon={Activity}
            />
          </div>
        </section>

        {/* HEALTH INDICATORS */}
        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <div>
              <h2>
                المؤشرات الحيوية
              </h2>
              <p>
                قراءة أداء سريعة تساعد المشرف
                على اتخاذ القرار
              </p>
            </div>

            <div className="dashboard-vital-badge">
              {dashboardVitalIndex}%
            </div>
          </div>

          <div className="dashboard-grid health-4">
            <HealthIndicator
              title="نسبة الحضور"
              value={attendanceRate}
              color="#16A34A"
              description="كلما ارتفعت دلّ ذلك على انتظام أكبر لدى الطلاب."
            />

            <HealthIndicator
              title="تغطية التسميع"
              value={recitationCoverage}
              color="#0891B2"
              description="تقيس نسبة التسميعات المسجلة مقارنة بعدد الطلاب."
            />

            <HealthIndicator
              title="حيوية الحلقات"
              value={halaqatVitality}
              color="#7C3AED"
              description="تقيس نسبة الحلقات النشطة من إجمالي الحلقات."
            />

            <HealthIndicator
              title="الإنجاز الشهري"
              value={monthlyCompletionRate}
              color="#D97706"
              description="تقيس نسبة السجلات المعتمدة في الإنجاز الشهري لهذا الشهر."
            />
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <div>
              <h2>الوصول السريع</h2>
              <p>
                أهم الصفحات المستخدمة يوميًا
              </p>
            </div>
          </div>

          <div className="dashboard-grid actions-3">
            {quickActions.map((item) => (
              <QuickActionCard
                key={item.path}
                title={item.title}
                description={
                  item.description
                }
                icon={item.icon}
                onClick={() =>
                  navigate(item.path)
                }
              />
            ))}
          </div>
        </section>
      </div>

      <style>
        {`
          .supervisor-dashboard {
            display: grid;
            gap: calc(24px * var(--app-density,1));
          }

          .dashboard-section {
            display: grid;
            gap: calc(16px * var(--app-density,1));
          }

          .dashboard-section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: calc(14px * var(--app-density,1));
            flex-wrap: wrap;
          }

          .dashboard-section-head h2 {
            margin: 0;
            color: #0F172A;
            font-size: calc(24px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .dashboard-section-head p {
            margin: 6px 0 0;
            color: #64748B;
            font-size: calc(14px * var(--app-font-scale,1));
          }

          .dashboard-grid {
            display: grid;
            gap: calc(18px * var(--app-density,1));
          }

          .metrics-4,
          .status-4,
          .health-4 {
            grid-template-columns: repeat(auto-fit,minmax(240px,1fr));
          }

          .actions-3 {
            grid-template-columns: repeat(auto-fit,minmax(260px,1fr));
          }

          /* HERO */

          .supervisor-hero {
            position: relative;
            overflow: hidden;
            isolation: isolate;
            border-radius: calc(24px * var(--app-radius-scale,1));
            background:
              radial-gradient(circle at 84% 18%,rgba(196,160,78,.12),transparent 30%),
              linear-gradient(125deg,#123F39 0%,#0B302C 52%,#082823 100%);
            border: 1px solid rgba(199,166,91,.28);
            box-shadow: 0 18px 46px rgba(8,40,35,.14);
            padding: calc(34px * var(--app-density,1));
          }

          .supervisor-hero::before {
            content: "";
            position: absolute;
            inset: 7px;
            z-index: 0;
            pointer-events: none;
            border: 1px solid rgba(226,199,132,.13);
            border-radius: calc(18px * var(--app-radius-scale,1));
          }

          .supervisor-hero-ornament {
            position: absolute;
            z-index: 0;
            top: -46px;
            right: -78px;
            width: min(58%,720px);
            height: auto;
            color: #D8B968;
            opacity: .13;
            pointer-events: none;
          }

          .supervisor-hero-frame {
            position: absolute;
            z-index: 0;
            width: 260px;
            height: 260px;
            left: -138px;
            bottom: -154px;
            border: 1px solid rgba(216,185,104,.16);
            transform: rotate(45deg);
            pointer-events: none;
          }

          .supervisor-hero-frame::before,
          .supervisor-hero-frame::after {
            content: "";
            position: absolute;
            inset: 18px;
            border: 1px solid rgba(216,185,104,.11);
          }

          .supervisor-hero-frame::after {
            inset: 42px;
          }

          .supervisor-hero-grid {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: minmax(0,1.35fr) minmax(290px,.65fr);
            gap: calc(30px * var(--app-density,1));
            align-items: center;
            min-height: 210px;
          }

          .supervisor-hero-content {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: calc(13px * var(--app-density,1));
            padding-inline: calc(8px * var(--app-density,1));
          }

          .supervisor-hero-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: calc(10px * var(--app-density,1));
            color: #E6CE8C;
            font-size: calc(13px * var(--app-font-scale,1));
            font-weight: 800;
            letter-spacing: .15px;
          }

          .supervisor-hero-seal {
            width: 30px;
            height: 30px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #D8B968;
          }

          .supervisor-hero-seal svg {
            width: 100%;
            height: 100%;
          }

          .supervisor-hero-title {
            margin: 2px 0 0;
            color: #FFFFFF;
            font-size: clamp(calc(34px * var(--app-font-scale,1)),4vw,calc(48px * var(--app-font-scale,1)));
            font-weight: 900;
            line-height: 1.2;
            letter-spacing: -.7px;
          }

          .supervisor-hero-text {
            margin: 0;
            max-width: 690px;
            color: color-mix(in srgb,var(--app-color-f4f8f6,#f4f8f6) 76%,transparent);
            font-size: calc(15px * var(--app-font-scale,1));
            line-height: 2;
          }

          .supervisor-hero-divider {
            width: 190px;
            display: block;
            margin-top: 5px;
            opacity: .8;
          }

          .supervisor-hero-side {
            display: grid;
            gap: calc(12px * var(--app-density,1));
          }

          .supervisor-date-card,
          .supervisor-vital-card {
            position: relative;
            background: rgba(255,255,255,.045);
            border: 1px solid rgba(222,195,127,.18);
            border-radius: calc(15px * var(--app-radius-scale,1));
            padding: calc(17px * var(--app-density,1)) calc(18px * var(--app-density,1));
            box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
          }

          .supervisor-date-card span,
          .supervisor-vital-head span {
            display: block;
            color: #DCC37E;
            font-size: calc(12px * var(--app-font-scale,1));
            font-weight: 800;
            margin-bottom: 7px;
          }

          .supervisor-date-card strong {
            display: block;
            color: #FFFFFF;
            font-size: calc(17px * var(--app-font-scale,1));
            font-weight: 850;
            line-height: 1.8;
          }

          .supervisor-date-card small {
            display: block;
            margin-top: 5px;
            color: rgba(255,255,255,.62);
            font-size: calc(12px * var(--app-font-scale,1));
          }

          .supervisor-vital-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: calc(10px * var(--app-density,1));
          }

          .supervisor-vital-head strong {
            color: #FFFFFF;
            font-size: calc(28px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .supervisor-vital-bar {
            width: 100%;
            height: 6px;
            background: rgba(255,255,255,.09);
            border-radius: 999px;
            overflow: hidden;
            margin: 13px 0 11px;
          }

          .supervisor-vital-fill {
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg,#B99745,#E1C979);
          }

          .supervisor-vital-card p {
            margin: 0;
            color: rgba(255,255,255,.66);
            font-size: calc(12px * var(--app-font-scale,1));
            line-height: 1.85;
          }

          /* METRIC CARDS */

          .dashboard-metric-card {
            position: relative;
            overflow: hidden;
            background: #FFFFFF;
            border: 1px solid #E8EEF0;
            border-radius: calc(24px * var(--app-radius-scale,1));
            padding: calc(22px * var(--app-density,1));
            box-shadow:
              0 12px 35px rgba(15,23,42,.05);
          }

          .dashboard-metric-topline {
            position: absolute;
            top: 0;
            right: 0;
            left: 0;
            height: 4px;
          }

          .dashboard-metric-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: calc(14px * var(--app-density,1));
          }

          .dashboard-metric-title {
            color: #0F172A;
            font-size: calc(15px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .dashboard-metric-subtitle {
            margin-top: 6px;
            color: #64748B;
            font-size: calc(13px * var(--app-font-scale,1));
          }

          .dashboard-metric-icon {
            width: 54px;
            height: 54px;
            border-radius: calc(18px * var(--app-radius-scale,1));
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .dashboard-metric-value {
            margin-top: 18px;
            font-size: calc(38px * var(--app-font-scale,1));
            font-weight: 950;
            letter-spacing: -1px;
            line-height: 1;
          }

          .dashboard-metric-note {
            margin-top: 12px;
            color: #64748B;
            font-size: calc(13px * var(--app-font-scale,1));
            line-height: 1.8;
          }

          /* STATUS */

          .dashboard-status-card {
            background: #FFFFFF;
            border: 1px solid #E8EEF0;
            border-radius: calc(22px * var(--app-radius-scale,1));
            padding: calc(18px * var(--app-density,1));
            display: flex;
            align-items: center;
            gap: calc(14px * var(--app-density,1));
            box-shadow:
              0 8px 25px rgba(15,23,42,.04);
          }

          .dashboard-status-icon {
            width: 48px;
            height: 48px;
            border-radius: calc(16px * var(--app-radius-scale,1));
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .dashboard-status-copy {
            display: flex;
            flex-direction: column;
            gap: calc(4px * var(--app-density,1));
          }

          .dashboard-status-copy span {
            color: #64748B;
            font-size: calc(14px * var(--app-font-scale,1));
            font-weight: 700;
          }

          .dashboard-status-copy strong {
            font-size: calc(28px * var(--app-font-scale,1));
            font-weight: 950;
            line-height: 1;
          }

          /* HEALTH */

          .dashboard-vital-badge {
            min-width: 86px;
            height: 44px;
            border-radius: calc(14px * var(--app-radius-scale,1));
            background:
              linear-gradient(135deg,#0F766E,#115E59);
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: calc(17px * var(--app-font-scale,1));
            font-weight: 900;
            box-shadow:
              0 10px 24px rgba(15,118,110,.22);
          }

          .dashboard-health-card {
            background: #FFFFFF;
            border: 1px solid #E8EEF0;
            border-radius: calc(22px * var(--app-radius-scale,1));
            padding: calc(20px * var(--app-density,1));
            box-shadow:
              0 8px 24px rgba(15,23,42,.04);
          }

          .dashboard-health-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: calc(10px * var(--app-density,1));
            margin-bottom: 14px;
          }

          .dashboard-health-head strong {
            color: #0F172A;
            font-size: calc(15px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .dashboard-health-head span {
            font-size: calc(18px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .dashboard-health-bar {
            width: 100%;
            height: 10px;
            border-radius: 999px;
            background: #EEF2F7;
            overflow: hidden;
          }

          .dashboard-health-bar-fill {
            height: 100%;
            border-radius: 999px;
          }

          .dashboard-health-description {
            margin-top: 12px;
            color: #64748B;
            font-size: calc(13px * var(--app-font-scale,1));
            line-height: 1.8;
          }

          /* ACTIONS */

          .dashboard-action-card {
            width: 100%;
            border: 1px solid #E8EEF0;
            background: #FFFFFF;
            border-radius: calc(22px * var(--app-radius-scale,1));
            padding: calc(18px * var(--app-density,1));
            display: flex;
            align-items: center;
            gap: calc(14px * var(--app-density,1));
            text-align: right;
            cursor: pointer;
            box-shadow:
              0 10px 26px rgba(15,23,42,.04);
            transition:
              transform .18s ease,
              box-shadow .18s ease,
              border-color .18s ease;
          }

          .dashboard-action-card:hover {
            transform: translateY(-3px);
            border-color: #CFE1D6;
            box-shadow:
              0 18px 34px rgba(15,23,42,.07);
          }

          .dashboard-action-icon {
            width: 50px;
            height: 50px;
            flex: 0 0 50px;
            border-radius: calc(16px * var(--app-radius-scale,1));
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--app-color-0f766e,#0F766E);
            background: #ECFDF5;
            border: 1px solid #D1FAE5;
          }

          .dashboard-action-copy {
            min-width: 0;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: calc(5px * var(--app-density,1));
          }

          .dashboard-action-copy strong {
            color: #0F172A;
            font-size: calc(15px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .dashboard-action-copy span {
            color: #64748B;
            font-size: calc(13px * var(--app-font-scale,1));
            line-height: 1.8;
          }

          .dashboard-action-arrow {
            color: #94A3B8;
          }

          /* RESPONSIVE */

          @media (max-width: 1100px) {
            .supervisor-hero-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 768px) {
            .supervisor-hero {
              padding: calc(22px * var(--app-density,1)) calc(18px * var(--app-density,1));
              border-radius: calc(22px * var(--app-radius-scale,1));
            }

            .supervisor-hero-title {
              font-size: calc(32px * var(--app-font-scale,1));
            }

            .supervisor-hero-text {
              font-size: calc(14px * var(--app-font-scale,1));
              line-height: 1.9;
            }

            .supervisor-hero-ornament {
              width: 92%;
              right: -36%;
              opacity: .09;
            }

            .dashboard-section-head h2 {
              font-size: calc(20px * var(--app-font-scale,1));
            }

            .dashboard-metric-value {
              font-size: calc(30px * var(--app-font-scale,1));
            }

            .dashboard-status-copy strong {
              font-size: calc(24px * var(--app-font-scale,1));
            }

            .dashboard-vital-badge {
              width: 100%;
            }
          }

          @media (max-width: 520px) {
            .supervisor-hero {
              padding: calc(20px * var(--app-density,1)) calc(16px * var(--app-density,1));
            }

            .supervisor-hero-grid {
              gap: calc(20px * var(--app-density,1));
            }

            .supervisor-hero-divider {
              width: 150px;
            }

            .dashboard-action-card {
              padding: calc(16px * var(--app-density,1));
            }
          }
        `}
      </style>
    </AppPage>
  );
}
