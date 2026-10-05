import lazyWithRetry from "../../lib/lazyWithRetry";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, UserRoundCheck } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import {
  getTeacherAssignments,
  getTeacherDashboardData,
} from "../../services/teacherDashboardService";

import DashboardSkeleton from "./dashboard/DashboardSkeleton";
import TeacherHero from "./dashboard/TeacherHero";
import TeacherStats from "./dashboard/TeacherStats";
const TeacherCharts = lazyWithRetry(() => import("./dashboard/TeacherCharts"));
import TopStudents from "./dashboard/TopStudents";
import LatestRecitations from "./dashboard/LatestRecitations";
import TeacherAlerts from "./dashboard/TeacherAlerts";
import QuickActions from "./dashboard/QuickActions";
import TeacherJoinOnboarding from "./dashboard/TeacherJoinOnboarding";

import { showToast } from "../../components/Toast";
import "./dashboard/TeacherDashboard.css";

export default function Dashboard() {
  const { teacher: layoutTeacher, assignmentsPromise } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacher, setTeacher] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [activeHalaqaId, setActiveHalaqaId] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [fatalError, setFatalError] = useState("");

  const activeAssignment = useMemo(
    () =>
      assignments.find(
        (item) => Number(item.halaqa_id) === Number(activeHalaqaId)
      ) ||
      assignments[0] ||
      null,
    [assignments, activeHalaqaId]
  );

  const loadBase = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setFatalError("");

      // The layout already verified this profile. Explicit refreshes still
      // revalidate with Supabase and fetch current assignments.
      let profile = !silent ? layoutTeacher : null;
      if (!profile) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("AUTH_REQUIRED");
        const result = await supabase.from("profiles")
          .select("id, full_name, user_number, role, status, is_active")
          .eq("auth_user_id", user.id).single();
        if (result.error) throw result.error;
        profile = result.data;
      }
      if (!profile || profile.role !== "teacher") {
        throw new Error("TEACHER_PROFILE_REQUIRED");
      }

      const teacherAssignments = await (!silent && assignmentsPromise
        ? assignmentsPromise : getTeacherAssignments());

      setTeacher(profile);
      setAssignments(teacherAssignments);

      setActiveHalaqaId((current) => {
        if (
          current &&
          teacherAssignments.some(
            (item) => Number(item.halaqa_id) === Number(current)
          )
        ) {
          return current;
        }

        return teacherAssignments[0]?.halaqa_id ?? null;
      });
    } catch (error) {
      console.error("Teacher dashboard base error:", error);
      setFatalError("تعذر تجهيز حساب المعلم. أعد تحميل الصفحة أو سجل الدخول من جديد.");
      showToast("تعذر تجهيز لوحة المعلم", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [layoutTeacher, assignmentsPromise]);

  const loadOperationalData = useCallback(
    async ({ silent = false } = {}) => {
      if (!teacher?.id || !activeHalaqaId) {
        setDashboardData(null);
        return;
      }

      try {
        if (silent) setRefreshing(true);

        const data = await getTeacherDashboardData({
          teacherId: teacher.id,
          halaqaId: activeHalaqaId,
        });

        setDashboardData(data);
      } catch (error) {
        console.error("Teacher dashboard data error:", error);
        showToast("تعذر تحديث بيانات الحلقة", "error");
      } finally {
        if (silent) setRefreshing(false);
      }
    },
    [teacher?.id, activeHalaqaId]
  );

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    loadOperationalData();
  }, [loadOperationalData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadBase({ silent: true });
    await loadOperationalData({ silent: true });
    setRefreshing(false);
    showToast("تم تحديث لوحة المعلم", "success");
  }

  async function handleMembershipChanged() {
    await loadBase({ silent: true });
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (fatalError) {
    return (
      <div className="td-state-card td-state-card--danger">
        <strong>تعذر فتح لوحة المعلم</strong>
        <p>{fatalError}</p>
        <button type="button" onClick={() => loadBase()}>
          <RefreshCw size={18} />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!assignments.length) {
    return (
      <TeacherJoinOnboarding
        teacher={teacher}
        onMembershipChanged={handleMembershipChanged}
      />
    );
  }

  const stats = dashboardData?.stats ?? {};
  const attendanceData = dashboardData?.attendanceChart ?? [];
  const recitationData = dashboardData?.recitationChart ?? [];
  const topStudents = dashboardData?.topStudents ?? [];
  const latestRecitations = dashboardData?.latestRecitations ?? [];
  const alerts = dashboardData?.alerts ?? [];

  return (
    <div className="teacher-dashboard">
      <div className="td-toolbar">
        <div>
          <span className="td-toolbar-kicker">مساحة العمل اليومية</span>
          <h1>لوحة المعلم</h1>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "calc(8px * var(--app-density,1))",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/teacher/join-requests"
            className="td-refresh"
            style={{ textDecoration: "none" }}
          >
            <UserRoundCheck size={17} />
            طلبات الالتحاق
          </Link>

          <button
            type="button"
            className="td-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "td-spin" : ""} size={17} />
            {refreshing ? "جارٍ التحديث…" : "تحديث البيانات"}
          </button>
        </div>
      </div>

      <TeacherHero
        teacher={teacher}
        assignments={assignments}
        activeHalaqaId={activeHalaqaId}
        onHalaqaChange={setActiveHalaqaId}
        assignment={activeAssignment}
        stats={stats}
      />

      <TeacherStats stats={stats} />

      <QuickActions halaqaId={activeHalaqaId} />

      <TeacherAlerts alerts={alerts} />

      <Suspense fallback={<div className="td-panel" role="status" style={{minHeight:300}}>جارٍ تحميل الرسوم البيانية…</div>}>
      <TeacherCharts
        attendanceData={attendanceData}
        recitationData={recitationData}
      />
      </Suspense>

      <div className="td-two-column">
        <TopStudents students={topStudents} />
        <LatestRecitations recitations={latestRecitations} />
      </div>
    </div>
  );
}
