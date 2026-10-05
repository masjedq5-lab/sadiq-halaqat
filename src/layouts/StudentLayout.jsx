import NavLink from "../components/PrefetchNavLink";
import { removeCurrentPushSubscription } from "../lib/pwa";
import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  BookOpenCheck,
  CalendarCheck,
  CalendarRange,
  CircleGauge,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  GraduationCap,
  LogOut,
  Menu,
  Route,
  Settings,
  Star,
  Trophy,
  UserRoundSearch,
  Users,
  X,
} from "lucide-react";
import {
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  StudentPortalProvider,
  useStudentPortal,
} from "../context/StudentPortalContext";
import SeasonalGreeting from "../components/student/SeasonalGreeting";
import {
  STUDENT_ACCENTS,
  fontScale,
  loadStudentPreferences,
} from "../lib/studentPortalUtils";
import { supabase } from "../lib/supabase";

import "./StudentLayout.css";

const MENU_GROUPS = [
  {
    title: "رحلتي",
    items: [
      { title: "لوحتي", path: "/student/dashboard", icon: CircleGauge },
      { title: "حلقتي", path: "/student/halaqa", icon: BookOpenCheck },
      { title: "زملائي", path: "/student/classmates", icon: Users },
      { title: "تسميعي", path: "/student/recitations", icon: UserRoundSearch },
      { title: "خطتي الشهرية", path: "/student/monthly-plan", icon: CalendarRange },
      { title: "إنجازي الشهري", path: "/student/monthly-achievement", icon: Route },
    ],
  },
  {
    title: "أدائي",
    items: [
      { title: "حضوري", path: "/student/attendance", icon: CalendarCheck },
      { title: "نقاطي", path: "/student/points", icon: Trophy },
      { title: "اختباراتي", path: "/student/exams", icon: GraduationCap },
      { title: "الإشعارات", path: "/student/notifications", icon: BellRing },
    ],
  },
  {
    title: "حسابي",
    items: [
      { title: "الإعدادات", path: "/student/settings", icon: Settings },
      { title: "الملف الشخصي", path: "/student/profile", icon: CircleUserRound },
    ],
  },
];

function currentPageTitle(pathname) {
  const item = MENU_GROUPS.flatMap((group) => group.items).find((entry) =>
    pathname === entry.path || pathname.startsWith(`${entry.path}/`)
  );
  return item?.title || "بوابة الطالب";
}

export default function StudentLayout() {
  return (
    <StudentPortalProvider>
      <StudentShell />
    </StudentPortalProvider>
  );
}

function StudentShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    loading,
    error,
    accessDenied,
    profile,
    halaqa,
    mosque,
  } = useStudentPortal();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [preferences, setPreferences] = useState(loadStudentPreferences());

  const pageTitle = useMemo(
    () => currentPageTitle(location.pathname),
    [location.pathname]
  );

  useEffect(() => {
    if (!loading && accessDenied) {
      navigate("/login", { replace: true });
    }
  }, [accessDenied, loading, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onSettings(event) {
      setPreferences(event.detail || loadStudentPreferences());
    }

    window.addEventListener("student-settings-changed", onSettings);
    return () => {
      window.removeEventListener("student-settings-changed", onSettings);
    };
  }, []);

  async function signOut() {
    await removeCurrentPushSubscription().catch(() => {});
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const accent =
    STUDENT_ACCENTS[preferences.accent] || STUDENT_ACCENTS.emerald;

  const shellStyle = {
    "--student-accent": accent,
    "--student-font-scale": fontScale(preferences.fontSize),
    "--student-motion": preferences.motion ? "1" : "0",
  };

  if (loading || accessDenied) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="student-fatal-state"
        style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}
      >
        جارٍ التحقق من صلاحية الدخول…
      </div>
    );
  }

  return (
    <div
      className={`student-shell ${
        collapsed ? "student-shell-collapsed" : ""
      }`}
      data-theme={preferences.theme}
      data-sq-motion={preferences.motion ? "on" : "off"}
      style={shellStyle}
      dir="rtl"
    >
      {mobileOpen && (
        <button
          type="button"
          className="student-shell-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="إغلاق القائمة"
        />
      )}

      <aside className={`student-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="student-brand">
          <div className="student-brand-mark">
            <img src="/icon-512.png" alt="الصديق" />
          </div>

          {!collapsed && (
            <div>
              <strong>الصِّديق</strong>
              <span>بوابة الطالب</span>
            </div>
          )}

          <button
            type="button"
            className="student-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق القائمة"
          >
            <X size={18} />
          </button>
        </div>

        {!collapsed && (
          <section className="student-mini-profile">
            <div className="student-mini-avatar">
              {(profile?.full_name || "ط").trim().charAt(0)}
            </div>

            <div className="student-mini-copy">
              <span>رحلة الطالب</span>
              <strong>
                {loading ? "جارٍ التحميل…" : profile?.full_name || "طالب"}
              </strong>
              <small>{profile?.user_number || "—"}</small>
            </div>

            <div className="student-mini-points">
              <Star size={13} />
              {Number(profile?.total_points || 0)}
            </div>
          </section>
        )}

        {!collapsed && halaqa && (
          <section className="student-current-halaqa">
            <span>حلقتك الحالية</span>
            <strong>{halaqa.name}</strong>
            <small>{mosque?.name || "—"}</small>
          </section>
        )}

        <nav className="student-nav">
          {MENU_GROUPS.map((group) => (
            <div className="student-nav-group" key={group.title}>
              {!collapsed && (
                <div className="student-nav-label">{group.title}</div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.title : undefined}
                    className={({ isActive }) =>
                      `student-nav-item ${isActive ? "is-active" : ""}`
                    }
                  >
                    <span className="student-nav-icon">
                      <Icon size={19} />
                    </span>
                    {!collapsed && (
                      <span className="student-nav-text">{item.title}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="student-sidebar-footer">
          <button
            type="button"
            className="student-signout"
            onClick={signOut}
          >
            <LogOut size={18} />
            {!collapsed && <span>تسجيل خروج</span>}
          </button>

          <button
            type="button"
            className="student-collapse"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </aside>

      <div className="student-workspace">
        <header className="student-topbar">
          <div className="student-topbar-start">
            <button
              type="button"
              className="student-menu-button"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>

            <div>
              <span>بوابة الطالب</span>
              <h2>{pageTitle}</h2>
            </div>
          </div>

          <div className="student-topbar-end">
            <button
              type="button"
              className="student-topbar-points"
              onClick={() => navigate("/student/points")}
            >
              <Trophy size={17} />
              <strong>{Number(profile?.total_points || 0)}</strong>
              <span>نقطة</span>
            </button>

            <button
              type="button"
              className="student-topbar-icon"
              onClick={() => navigate("/student/notifications")}
            >
              <BellRing size={19} />
            </button>

            <button
              type="button"
              className="student-topbar-avatar"
              onClick={() => navigate("/student/profile")}
            >
              {(profile?.full_name || "ط").trim().charAt(0)}
            </button>
          </div>
        </header>

        <main className="student-main">
          <SeasonalGreeting />

          {error ? (
            <div className="student-fatal-state">
              <strong>تعذر فتح بوابة الطالب</strong>
              <p>{error}</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
