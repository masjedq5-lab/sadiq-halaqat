import NavLink from "../components/PrefetchNavLink";
import { removeCurrentPushSubscription } from "../lib/pwa";
import { getTeacherAssignments } from "../services/teacherDashboardService";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarCheck,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TrendingUp,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import {
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../lib/supabase";
import {
  TEACHER_PREFERENCES_DEFAULTS,
  normalizeTeacherPreferences,
} from "../lib/teacherPreferences";
import {
  buildTeacherAppearanceVariables,
  normalizeTeacherAppearance,
} from "../lib/teacherAppearance";
import {
  TeacherPreferencesContext,
} from "../context/TeacherPreferencesContext";
import "./TeacherLayout.css";
import "./TeacherMobileStats.css";

const MENU_GROUPS = [
  {
    title: "العمل اليومي",
    items: [
      {
        title: "الرئيسية",
        path: "/teacher",
        icon: LayoutDashboard,
        alwaysAvailable: true,
      },
      {
        title: "طلابي",
        path: "/teacher/students",
        icon: Users,
      },
      {
        title: "الحضور",
        path: "/teacher/attendance",
        icon: CalendarCheck,
      },
      {
        title: "التسميع",
        path: "/teacher/recitations",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "التقدم والتحفيز",
    items: [
      {
        title: "المنح والخصومات",
        path: "/teacher/points",
        icon: Gift,
      },
      {
        title: "الخطة الشهرية",
        path: "/teacher/monthly-plan",
        icon: CalendarRange,
      },
      {
        title: "الإنجاز الشهري",
        path: "/teacher/monthly-achievement",
        icon: TrendingUp,
      },
      {
        title: "الاختبارات",
        path: "/teacher/exams",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: "المتابعة",
    items: [
      {
        title: "الإشعارات",
        path: "/teacher/notifications",
        icon: BellRing,
      },
      {
        title: "السجلات",
        path: "/teacher/records",
        icon: Archive,
      },
      {
        title: "التقارير",
        path: "/teacher/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "الحساب",
    items: [
      {
        title: "الملف الشخصي",
        path: "/teacher/profile",
        icon: UserCircle,
        alwaysAvailable: true,
      },
      {
        title: "الإعدادات",
        path: "/teacher/settings",
        icon: Settings,
        alwaysAvailable: true,
      },
    ],
  },
];

function currentPageTitle(pathname) {
  const flat = MENU_GROUPS.flatMap((group) => group.items);
  const exact = flat.find((item) =>
    item.path === "/teacher"
      ? pathname === "/teacher"
      : pathname === item.path || pathname.startsWith(`${item.path}/`)
  );

  return exact?.title || "بوابة المعلم";
}

export default function TeacherLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [teacher, setTeacher] = useState(null);
  const [assignmentsPromise, setAssignmentsPromise] = useState(null);
  const [hasAssignment, setHasAssignment] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [teacherPreferences, setTeacherPreferences] = useState(
    normalizeTeacherPreferences(TEACHER_PREFERENCES_DEFAULTS)
  );
  const [appearancePreview, setAppearancePreview] = useState(null);

  const pageTitle = useMemo(
    () => currentPageTitle(location.pathname),
    [location.pathname]
  );

  const activeAppearance = useMemo(
    () =>
      normalizeTeacherAppearance({
        ...teacherPreferences,
        ...(appearancePreview || {}),
      }),
    [teacherPreferences, appearancePreview]
  );

  const teacherAppearanceStyle = useMemo(
    () =>
      buildTeacherAppearanceVariables(
        activeAppearance,
        appearancePreview?.ui_density ??
          teacherPreferences?.ui_density ??
          "comfortable"
      ),
    [activeAppearance, appearancePreview, teacherPreferences]
  );

  useEffect(() => {
    setMobileOpen(false);
    loadTeacherContext();
  }, [location.pathname]);

  useEffect(() => {
    function handlePreferencesUpdated(event) {
      if (event?.detail) {
        setTeacherPreferences({
          ...event.detail,
          ...normalizeTeacherPreferences(event.detail),
        });
      } else {
        refreshTeacherPreferences();
      }
    }

    function handleAppearancePreview(event) {
      setAppearancePreview(event?.detail || null);
    }

    window.addEventListener(
      "teacher-preferences-updated",
      handlePreferencesUpdated
    );
    window.addEventListener(
      "teacher-appearance-preview",
      handleAppearancePreview
    );

    return () => {
      window.removeEventListener(
        "teacher-preferences-updated",
        handlePreferencesUpdated
      );
      window.removeEventListener(
        "teacher-appearance-preview",
        handleAppearancePreview
      );
    };
  }, [teacher?.id]);

  async function refreshTeacherPreferences(teacherId = teacher?.id) {
    if (!teacherId) return;

    const { data, error } = await supabase
      .from("teacher_preferences")
      .select("*")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (error) {
      console.error("Teacher preferences:", error);
      return;
    }

    const source =
      data || {
        ...TEACHER_PREFERENCES_DEFAULTS,
        teacher_id: teacherId,
      };

    setTeacherPreferences({
      ...source,
      ...normalizeTeacherPreferences(source),
    });
  }

  async function loadTeacherContext() {
    try {
      setLoadingProfile(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, user_number, role, status, is_active")
        .eq("auth_user_id", user.id)
        .single();

      if (profileError) throw profileError;

      if (
        !profile ||
        profile.role !== "teacher" ||
        profile.status !== "active" ||
        profile.is_active === false
      ) {
        navigate("/login", { replace: true });
        return;
      }

      // Start both independent requests before mounting the dashboard.
      // The child reuses this promise rather than asking for the same scope again.
      const request = getTeacherAssignments();
      setAssignmentsPromise(request);
      setTeacher(profile);
      const [, result] = await Promise.all([
        refreshTeacherPreferences(profile.id),
        request.then(data => ({ data }), error => ({ error })),
      ]);

      if (result.error) {
        console.error("Teacher layout assignments:", result.error);
        setHasAssignment(true);
      } else {
        setHasAssignment(result.data.length > 0);
      }
    } catch (error) {
      console.error("Teacher layout context error:", error);
      setTeacher(null);
      navigate("/login", { replace: true });
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSignOut() {
    await removeCurrentPushSubscription().catch(() => {});
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  function handleUnavailable(event, item) {
    if (hasAssignment || item.alwaysAvailable) return;

    event.preventDefault();
    navigate("/teacher");
  }

  if (!teacher) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#f6f8f7",
          color: "#48635a",
          fontWeight: 800,
        }}
      >
        جارٍ التحقق من صلاحية الدخول…
      </div>
    );
  }

  return (
    <div
      className={`teacher-shell ${collapsed ? "teacher-shell--collapsed" : ""}`}
      dir="rtl"
      style={teacherAppearanceStyle}
      data-teacher-theme={activeAppearance.appearance_theme}
      data-teacher-pattern={activeAppearance.appearance_pattern}
      data-teacher-motion={activeAppearance.appearance_motion}
    >
      {mobileOpen && (
        <button
          type="button"
          className="teacher-shell-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="إغلاق القائمة"
        />
      )}

      <aside className={`teacher-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="teacher-brand">
          <div className="teacher-brand-logo">
            <img src="/icon-512.png" alt="الصديق" />
          </div>

          {!collapsed && (
            <div className="teacher-brand-copy">
              <strong>الصِّديق</strong>
              <span>بوابة المعلم</span>
            </div>
          )}

          <button
            type="button"
            className="teacher-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق القائمة"
          >
            <X size={19} />
          </button>
        </div>

        {!collapsed && (
          <div className="teacher-account-card">
            <div className="teacher-account-avatar">
              {(teacher?.full_name || "م").trim().charAt(0)}
            </div>

            <div>
              <span>المعلم</span>
              <strong>
                {loadingProfile ? "جارٍ التحميل…" : teacher?.full_name || "—"}
              </strong>
              <small>{teacher?.user_number || "—"}</small>
            </div>

            <div
              className={`teacher-membership-dot ${
                hasAssignment ? "is-active" : "is-pending"
              }`}
              title={hasAssignment ? "مرتبط بحلقة" : "بانتظار الانضمام"}
            />
          </div>
        )}

        {!collapsed && !loadingProfile && !hasAssignment && (
          <button
            type="button"
            className="teacher-join-hint"
            onClick={() => navigate("/teacher")}
          >
            <span>حسابك غير مرتبط بحلقة</span>
            <strong>اختر مسجدًا وأرسل طلب انضمام</strong>
            <ChevronLeft size={16} />
          </button>
        )}

        <nav className="teacher-nav" aria-label="قائمة بوابة المعلم">
          {MENU_GROUPS.map((group) => (
            <div className="teacher-nav-group" key={group.title}>
              {!collapsed && (
                <div className="teacher-nav-label">{group.title}</div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const locked = !hasAssignment && !item.alwaysAvailable;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/teacher"}
                    title={collapsed ? item.title : undefined}
                    onClick={(event) => handleUnavailable(event, item)}
                    className={({ isActive }) =>
                      [
                        "teacher-nav-item",
                        isActive ? "is-active" : "",
                        locked ? "is-locked" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")
                    }
                  >
                    <span className="teacher-nav-icon">
                      <Icon size={19} />
                    </span>

                    {!collapsed && (
                      <>
                        <span className="teacher-nav-text">{item.title}</span>
                        {locked && (
                          <span className="teacher-nav-lock">بعد الانضمام</span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="teacher-sidebar-footer">
          <button
            type="button"
            className="teacher-signout"
            onClick={handleSignOut}
            title={collapsed ? "تسجيل الخروج" : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>

          <button
            type="button"
            className="teacher-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
          >
            {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </aside>

      <div className="teacher-workspace">
        <header className="teacher-topbar">
          <div className="teacher-topbar-start">
            <button
              type="button"
              className="teacher-menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu size={21} />
            </button>

            <div>
              <span>بوابة المعلم</span>
              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="teacher-topbar-end">
            <button
              type="button"
              className="teacher-topbar-icon"
              onClick={() => navigate("/teacher/notifications")}
              aria-label="الإشعارات"
            >
              <BellRing size={19} />
            </button>

            <button
              type="button"
              className="teacher-topbar-profile"
              onClick={() => navigate("/teacher/profile")}
            >
              <span>
                {(teacher?.full_name || "م").trim().charAt(0)}
              </span>
              <div>
                <strong>{teacher?.full_name || "المعلم"}</strong>
                <small>{teacher?.user_number || ""}</small>
              </div>
            </button>
          </div>
        </header>

        <main className="teacher-main">
          <TeacherPreferencesContext.Provider
            value={{
              teacher,
              teacherPreferences,
              refreshTeacherPreferences,
            }}
          >
            <Outlet context={{ teacher, assignmentsPromise }} />
          </TeacherPreferencesContext.Provider>
        </main>
      </div>
    </div>
  );
}
