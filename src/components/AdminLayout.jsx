import {displayDateFormatter} from "../lib/calendar";
import { removeCurrentPushSubscription } from "../lib/pwa";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { BarChart3, Bell, BookOpen, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, FileCheck, Gift, GraduationCap, LayoutDashboard, Landmark, LogOut, Menu, ReceiptText, Search, Settings, ShieldCheck, Trophy, Tv, UserCircle, Users, X } from "lucide-react";

import { supabase } from "../lib/supabase";
import ResponsiveContainer from "./ResponsiveContainer";

/* =========================================================
   Navigation
   ملاحظة:
   أبقينا المسارات /admin كما هي حتى لا تنكسر الراوتات الحالية.
   إذا نقلت بوابة المشرف لاحقًا إلى /supervisor غيّر BASE_PATH فقط.
========================================================= */

const BASE_PATH = "/admin";

const sections = [
  {
    title: "الرئيسية",
    items: [
      {
        name: "لوحة التحكم",
        path: BASE_PATH,
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },

  {
    title: "إدارة الحلقة",
    items: [
      {
        name: "المساجد",
        path: `${BASE_PATH}/mosques`,
        icon: Landmark,
      },
      {
        name: "الطلاب",
        path: `${BASE_PATH}/students`,
        icon: Users,
      },
      {
        name: "المعلمون",
        path: `${BASE_PATH}/teachers`,
        icon: GraduationCap,
      },
      {
        name: "الحلقات",
        path: `${BASE_PATH}/halaqat`,
        icon: BookOpen,
      },
    ],
  },

  {
    title: "المتابعة التعليمية",
    items: [
      {
        name: "الحضور",
        path: `${BASE_PATH}/attendance`,
        icon: ClipboardCheck,
      },
     
      {
        name: "الاختبارات",
        path: `${BASE_PATH}/exams`,
        icon: FileCheck,
      },
    ],
  },

  {
    title: "الأداء والتحفيز",
    items: [
      {
        name: "الإنجاز الشهري",
        path: `${BASE_PATH}/monthly-achievement`,
        icon: Trophy,
      },
      {
        name: "النقاط",
        path: `${BASE_PATH}/points-transactions`,
        icon: Gift,
      },
    ],
  },

  {
    title: "التواصل",
    items: [
      {
        name: "الإشعارات",
        path: `${BASE_PATH}/notifications`,
        icon: Bell,
      },
    ],
  },

  {
    title: "التقارير والعرض",
    items: [
      {
        name: "التقارير",
        path: `${BASE_PATH}/reports`,
        icon: BarChart3,
      },
      {
        name: "الفواتير",
        path: `${BASE_PATH}/invoices`,
        icon: ReceiptText,
      },
      {
        name: "العرض على التلفزيون",
        path: `${BASE_PATH}/tv-leaderboard`,
        icon: Tv,
      },
    ],
  },

  {
    title: "الحساب",
    items: [
      {
        name: "الإعدادات",
        path: `${BASE_PATH}/settings`,
        icon: Settings,
      },
      {
        name: "الملف الشخصي",
        path: `${BASE_PATH}/profile`,
        icon: UserCircle,
      },
    ],
  },
];

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


function findCurrentItem(pathname) {
  const items =
    sections.flatMap(
      (section) =>
        section.items
    );

  const exact =
    items.find(
      (item) =>
        item.path === pathname
    );

  if (exact) {
    return exact;
  }

  return (
    items
      .filter(
        (item) =>
          !item.end &&
          pathname.startsWith(
            `${item.path}/`
          )
      )
      .sort(
        (a, b) =>
          b.path.length -
          a.path.length
      )[0] ||
    items[0]
  );
}

/* =========================================================
   Layout
========================================================= */

export default function AdminLayout() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const searchRef =
    useRef(null);

  const [
    collapsed,
    setCollapsed,
  ] =
    useState(() => {
      try {
        return (
          localStorage.getItem(
            "sadiqSupervisorSidebarCollapsed"
          ) === "true"
        );
      } catch {
        return false;
      }
    });

  const [
    mobileOpen,
    setMobileOpen,
  ] =
    useState(false);

  const [
    isMobile,
    setIsMobile,
  ] =
    useState(() =>
      typeof window !==
      "undefined"
        ? window.matchMedia(
            "(max-width: 820px)"
          ).matches
        : false
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    profile,
    setProfile,
  ] =
    useState(null);

  const [
    accessChecking,
    setAccessChecking,
  ] =
    useState(true);

  const [
    now,
    setNow,
  ] =
    useState(
      () => new Date()
    );

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [
    unreadNotifications,
    setUnreadNotifications,
  ] = useState(0);

  /* =====================================================
     Persist collapse
  ===================================================== */

  useEffect(() => {
    try {
      localStorage.setItem(
        "sadiqSupervisorSidebarCollapsed",
        String(collapsed)
      );
    } catch {
      // تجاهل مشاكل التخزين المحلي
    }
  }, [collapsed]);

  /* =====================================================
     Responsive listener
  ===================================================== */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const media =
      window.matchMedia(
        "(max-width: 820px)"
      );

    const handleChange = (
      event
    ) => {
      setIsMobile(
        event.matches
      );

      if (
        !event.matches
      ) {
        setMobileOpen(
          false
        );
      }
    };

    setIsMobile(
      media.matches
    );

    media.addEventListener?.(
      "change",
      handleChange
    );

    return () => {
      media.removeEventListener?.(
        "change",
        handleChange
      );
    };
  }, []);

  /* =====================================================
     Close mobile drawer on route change
  ===================================================== */

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /* =====================================================
     Escape + Ctrl/Cmd + K
  ===================================================== */

  useEffect(() => {
    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setMobileOpen(
          false
        );
      }

      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          "k"
      ) {
        event.preventDefault();

        if (
          collapsed &&
          !isMobile
        ) {
          setCollapsed(
            false
          );

          window.setTimeout(
            () =>
              searchRef.current?.focus(),
            120
          );

          return;
        }

        searchRef.current?.focus();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [
    collapsed,
    isMobile,
  ]);

  /* =====================================================
     Clock/date refresh
  ===================================================== */

  useEffect(() => {
    const timer =
      window.setInterval(
        () =>
          setNow(
            new Date()
          ),
        60_000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  /* =====================================================
     Load current profile
  ===================================================== */

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      try {
        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const user =
          authData?.user;

        if (!user) {
          if (alive) {
            navigate("/login", { replace: true });
          }
          return;
        }

        const {
          data,
          error,
        } =
          await supabase
            .from("profiles")
            .select(
              "id, full_name, display_name, role, status, is_active"
            )
            .eq(
              "auth_user_id",
              user.id
            )
            .maybeSingle();

        if (error) {
          throw error;
        }

        const allowed =
          data &&
          ["supervisor", "admin"].includes(data.role) &&
          data.status === "active" &&
          data.is_active !== false;

        if (!allowed) {
          if (alive) {
            navigate("/login", { replace: true });
          }
          return;
        }

        if (alive) {
          setProfile(data);
        }
      } catch (error) {
        console.error(
          "LOAD SUPERVISOR PROFILE:",
          error
        );

        if (alive) {
          navigate("/login", { replace: true });
        }
      } finally {
        if (alive) {
          setAccessChecking(false);
        }
      }
    }

    loadProfile();

    return () => {
      alive = false;
    };
  }, [navigate]);

  /* =====================================================
     Notification badge
  ===================================================== */

  useEffect(() => {
    if (!profile?.id) return;

    let alive = true;

    async function loadNotificationBadge() {
      try {
        const { data, error } =
          await supabase.rpc(
            "get_supervisor_notification_badge"
          );

        if (error) {
          throw error;
        }

        if (alive) {
          setUnreadNotifications(
            Number(data || 0)
          );
        }
      } catch (error) {
        console.error(
          "LOAD NOTIFICATION BADGE:",
          error
        );
      }
    }

    loadNotificationBadge();

    const interval =
      window.setInterval(
        loadNotificationBadge,
        30_000
      );

    const channel =
      supabase
        .channel(
          `supervisor-layout-notifications-${profile.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "notification_recipients",
            filter:
              `recipient_profile_id=eq.${profile.id}`,
          },
          loadNotificationBadge
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "internal_messages",
            filter:
              `recipient_id=eq.${profile.id}`,
          },
          loadNotificationBadge
        )
        .subscribe();

    return () => {
      alive = false;
      window.clearInterval(
        interval
      );
      supabase.removeChannel(
        channel
      );
    };
  }, [profile?.id, location.pathname]);

  /* =====================================================
     Logout
     Local scope only: no global sign-out request.
  ===================================================== */

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await removeCurrentPushSubscription().catch(() => {});
      const { error } =
        await supabase.auth.signOut({
          scope: "local",
        });

      if (error) {
        throw error;
      }

      window.location.replace(
        "/login"
      );
    } catch (error) {
      console.error(
        "ADMIN LOGOUT:",
        error
      );

      setLoggingOut(false);

      window.alert(
        "تعذر تسجيل الخروج. حاول مرة أخرى."
      );
    }
  }

  /* =====================================================
     Derived
  ===================================================== */

  const filteredSections =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return sections;
      }

      return sections
        .map(
          (section) => ({
            ...section,

            items:
              section.items.filter(
                (item) =>
                  item.name
                    .toLowerCase()
                    .includes(
                      query
                    )
              ),
          })
        )
        .filter(
          (section) =>
            section.items
              .length > 0
        );
    }, [search]);

  const currentItem =
    useMemo(
      () =>
        findCurrentItem(
          location.pathname
        ),
      [location.pathname]
    );

  const currentPageTitle =
    currentItem?.name ||
    "نظام الصديق";

  const currentPageIcon =
    currentItem?.icon ||
    LayoutDashboard;

  const CurrentPageIcon =
    currentPageIcon;

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    "المشرف";

  const initials =
    displayName
      .trim()
      .slice(0, 1) ||
    "م";

  const sidebarCollapsed =
    !isMobile &&
    collapsed;

  /* =====================================================
     Sidebar renderer
  ===================================================== */

  const SidebarContent = (
    <div className="admin-layout-sidebar-inner">
      {/* BRAND */}

      <div className="admin-layout-brand">
        <div className="admin-layout-logo">
          <img
            src="/icon-512.png"
            alt="شعار الصديق"
          />
        </div>

        {!sidebarCollapsed && (
          <div className="admin-layout-brand-copy">
            <div>
              <strong>
                الصديق
              </strong>

              <span>
                PRO
              </span>
            </div>

            <small>
              بوابة المشرف
            </small>
          </div>
        )}

        {isMobile && (
          <button
            type="button"
            className="admin-layout-mobile-close"
            onClick={() =>
              setMobileOpen(
                false
              )
            }
            aria-label="إغلاق القائمة"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {/* PROFILE */}

      {!sidebarCollapsed && (
        <div className="admin-layout-profile-card">
          <div className="admin-layout-profile-avatar">
            {initials}
          </div>

          <div className="admin-layout-profile-copy">
            <span>
              المشرف الحالي
            </span>

            <strong>
              {displayName}
            </strong>

            <small>
              إدارة ومتابعة الحلقات
            </small>
          </div>
        </div>
      )}

      {/* SEARCH */}

      <div
        className={
          sidebarCollapsed
            ? "admin-layout-search collapsed"
            : "admin-layout-search"
        }
      >
        <Search
          size={16}
        />

        {!sidebarCollapsed && (
          <>
            <input
              ref={searchRef}
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="بحث سريع..."
              aria-label="بحث في القائمة"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                aria-label="مسح البحث"
              >
                <X size={12} />
              </button>
            )}

            <kbd>
              Ctrl K
            </kbd>
          </>
        )}
      </div>

      {/* NAVIGATION */}

      <nav className="admin-layout-nav">
        {filteredSections.length >
        0 ? (
          filteredSections.map(
            (section) => (
              <div
                key={
                  section.title
                }
                className="admin-layout-nav-section"
              >
                {!sidebarCollapsed && (
                  <div className="admin-layout-nav-section-title">
                    {
                      section.title
                    }
                  </div>
                )}

                <div className="admin-layout-nav-items">
                  {section.items.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      return (
                        <NavLink
                          key={
                            item.path
                          }
                          to={
                            item.path
                          }
                          end={
                            Boolean(
                              item.end
                            )
                          }
                          title={
                            sidebarCollapsed
                              ? item.name
                              : undefined
                          }
                          className={({
                            isActive,
                          }) =>
                            [
                              "admin-layout-nav-link",
                              isActive
                                ? "active"
                                : "",
                              sidebarCollapsed
                                ? "collapsed"
                                : "",
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                " "
                              )
                          }
                        >
                          <span className="admin-layout-nav-icon">
                            <Icon
                              size={17}
                            />
                          </span>

                          {!sidebarCollapsed && (
                            <>
                              <span className="admin-layout-nav-label">
                                {
                                  item.name
                                }
                              </span>

                              {item.path === `${BASE_PATH}/notifications` &&
                              unreadNotifications > 0 ? (
                                <span className="admin-layout-nav-badge">
                                  {unreadNotifications > 99
                                    ? "99+"
                                    : unreadNotifications}
                                </span>
                              ) : null}

                              <ChevronLeft
                                size={13}
                                className="admin-layout-nav-arrow"
                              />
                            </>
                          )}
                        </NavLink>
                      );
                    }
                  )}
                </div>
              </div>
            )
          )
        ) : (
          !sidebarCollapsed && (
            <div className="admin-layout-search-empty">
              <Search
                size={20}
              />

              <strong>
                لا توجد نتيجة
              </strong>

              <span>
                جرّب كلمة أخرى
              </span>
            </div>
          )
        )}
      </nav>

      {/* FOOTER */}

      <div className="admin-layout-sidebar-footer-wrap">
        <div
          className={
            sidebarCollapsed
              ? "admin-layout-sidebar-footer collapsed"
              : "admin-layout-sidebar-footer"
          }
        >
          <div className="admin-layout-sidebar-footer-icon">
            <ShieldCheck
              size={16}
            />
          </div>

          {!sidebarCollapsed && (
            <div>
              <strong>
                نظام الصديق
              </strong>

              <span>
                بيئة متابعة تعليمية
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          className={
            sidebarCollapsed
              ? "admin-layout-logout-button collapsed"
              : "admin-layout-logout-button"
          }
          onClick={handleLogout}
          disabled={loggingOut}
          title={
            sidebarCollapsed
              ? "تسجيل الخروج"
              : undefined
          }
        >
          <LogOut
            size={17}
          />

          {!sidebarCollapsed && (
            <span>
              {loggingOut
                ? "جارٍ تسجيل الخروج..."
                : "تسجيل الخروج"}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  if (accessChecking || !profile) {
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
      className="admin-layout-shell"
      dir="rtl"
    >
      {/* BACKGROUND */}

      <div className="admin-layout-background" />

      {/* =========================================
          DESKTOP SIDEBAR
      ========================================= */}

      {!isMobile && (
        <aside
          className={
            sidebarCollapsed
              ? "admin-layout-sidebar collapsed"
              : "admin-layout-sidebar"
          }
        >
          {SidebarContent}
        </aside>
      )}

      {/* =========================================
          MOBILE DRAWER
      ========================================= */}

      {isMobile && (
        <>
          <div
            className={
              mobileOpen
                ? "admin-layout-mobile-overlay open"
                : "admin-layout-mobile-overlay"
            }
            onClick={() =>
              setMobileOpen(
                false
              )
            }
          />

          <aside
            className={
              mobileOpen
                ? "admin-layout-mobile-drawer open"
                : "admin-layout-mobile-drawer"
            }
          >
            {SidebarContent}
          </aside>
        </>
      )}

      {/* =========================================
          MAIN
      ========================================= */}

      <main className="admin-layout-main">
        {/* TOPBAR */}

        <header className="admin-layout-topbar">
          <div className="admin-layout-topbar-start">
            <button
              type="button"
              className="admin-layout-menu-button"
              onClick={() => {
                if (isMobile) {
                  setMobileOpen(
                    true
                  );

                  return;
                }

                setCollapsed(
                  (value) =>
                    !value
                );
              }}
              aria-label={
                isMobile
                  ? "فتح القائمة"
                  : sidebarCollapsed
                    ? "توسيع القائمة"
                    : "طي القائمة"
              }
            >
              {isMobile ? (
                <Menu
                  size={18}
                />
              ) : sidebarCollapsed ? (
                <ChevronLeft
                  size={18}
                />
              ) : (
                <ChevronRight
                  size={18}
                />
              )}
            </button>

            <div className="admin-layout-page-icon">
              <CurrentPageIcon
                size={18}
              />
            </div>

            <div className="admin-layout-page-copy">
              <span>
                بوابة المشرف
              </span>

              <h1>
                {
                  currentPageTitle
                }
              </h1>
            </div>
          </div>

          <div className="admin-layout-topbar-end">
            <NavLink
              to={`${BASE_PATH}/notifications`}
              className="admin-layout-notification-button"
              aria-label="الإشعارات"
              title="الإشعارات"
            >
              <Bell size={17} />

              {unreadNotifications > 0 ? (
                <span>
                  {unreadNotifications > 99
                    ? "99+"
                    : unreadNotifications}
                </span>
              ) : null}
            </NavLink>

            <div className="admin-layout-date-card">
              <CalendarDays
                size={16}
              />

              <div>
                <strong>
                  {formatHijri(
                    now
                  )}
                </strong>


              </div>
            </div>

            <div className="admin-layout-topbar-profile">
              <div className="admin-layout-topbar-avatar">
                {initials}
              </div>

              <div>
                <strong>
                  {
                    displayName
                  }
                </strong>

                <span>
                  مشرف
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <div className="admin-layout-content">
          <ResponsiveContainer>
            <Outlet />
          </ResponsiveContainer>
        </div>
      </main>

      {/* =========================================
          STYLES
      ========================================= */}

      <style>
        {`
          :root {
            --sadiq-green-1000: #031E1B;
            --sadiq-green-950: #062B27;
            --sadiq-green-900: #0A3C36;
            --sadiq-green-800: #0F5148;
            --sadiq-green-700: var(--app-color-12685b,#12685B);
            --sadiq-green-600: #17806F;

            --sadiq-gold-500: #C8A84B;
            --sadiq-gold-400: #D9BE70;
            --sadiq-gold-100: #FFF8E6;

            --sadiq-text: #253A33;
            --sadiq-muted: #7D8D86;
            --sadiq-border: #DDE7E2;
            --sadiq-surface: #FFFFFF;
            --sadiq-ivory: #FBFCF9;

            --sadiq-shadow:
              0 18px 60px rgba(7, 47, 42, .08);

            --sadiq-shadow-soft:
              0 8px 28px rgba(7, 47, 42, .06);
          }

          .admin-layout-shell {
            position: relative;
            display: flex;
            min-height: 100vh;
            min-height: 100dvh;
            overflow-x: hidden;
            color: var(--sadiq-text);
            background:
              linear-gradient(
                180deg,
                var(--app-color-f8fbf9,#F8FBF9) 0%,
                #F2F7F4 100%
              );
          }

          .admin-layout-shell * {
            box-sizing: border-box;
          }

          .admin-layout-background {
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
            background:
              radial-gradient(
                circle at 8% 4%,
                rgba(200,168,75,.10),
                transparent 27%
              ),
              radial-gradient(
                circle at 88% 14%,
                color-mix(in srgb,var(--app-color-12685b,#12685b) 8%,transparent),
                transparent 30%
              ),
              linear-gradient(
                180deg,
                #FAFCFA,
                #F3F8F5
              );
          }

          .admin-layout-background::before {
            content: "";
            position: absolute;
            inset: 0;
            opacity: .16;
            background-image: url("/ornaments/sadiq/emerald/05-wasl.svg");
            background-size: 120px 120px;
            mask-image:
              linear-gradient(
                180deg,
                rgba(0,0,0,.28),
                transparent 62%
              );
          }

          .admin-layout-background::after {
            content: "";
            position: absolute;
            top: -190px;
            left: 50%;
            width: 780px;
            height: 420px;
            transform: translateX(-50%);
            border-radius: 50%;
            background:
              radial-gradient(
                circle,
                rgba(200,168,75,.10),
                transparent 70%
              );
            filter: blur(14px);
          }

          /* =========================
             SIDEBAR
          ========================= */

          .admin-layout-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            z-index: 50;
            width: 296px;
            height: 100vh;
            height: 100dvh;
            flex: 0 0 296px;
            overflow: hidden;
            border-left:
              1px solid rgba(255,255,255,.08);
            background:
              radial-gradient(
                circle at 20% 0%,
                rgba(217,190,112,.11),
                transparent 24%
              ),
              linear-gradient(
                180deg,
                #0A3C36 0%,
                #062F2A 54%,
                #041F1C 100%
              );
            box-shadow:
              -12px 0 44px rgba(5,35,31,.10);
            transition:
              width .22s ease,
              flex-basis .22s ease;
          }

          .admin-layout-sidebar::before,
          .admin-layout-mobile-drawer::before {
            content: "";
            position: absolute;
            top: 0;
            right: 0;
            left: 0;
            height: 3px;
            background:
              linear-gradient(
                90deg,
                transparent,
                var(--sadiq-gold-400),
                transparent
              );
            opacity: .9;
          }

          .admin-layout-sidebar.collapsed {
            width: 88px;
            flex-basis: 88px;
          }

          .admin-layout-sidebar-inner {
            position: relative;
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 0;
            padding: calc(16px * var(--app-density,1)) calc(13px * var(--app-density,1)) calc(13px * var(--app-density,1));
          }

          .admin-layout-sidebar-inner::after {
            content: "";
            position: absolute;
            top: 88px;
            left: -80px;
            width: 210px;
            height: 210px;
            border:
              1px solid rgba(217,190,112,.06);
            transform: rotate(45deg);
            pointer-events: none;
          }

          .admin-layout-nav::-webkit-scrollbar {
            width: 4px;
          }

          .admin-layout-nav::-webkit-scrollbar-thumb {
            border-radius: 999px;
            background:
              rgba(255,255,255,.15);
          }

          /* BRAND */

          .admin-layout-brand {
            position: relative;
            z-index: 1;
            min-height: 58px;
            display: flex;
            align-items: center;
            gap: calc(11px * var(--app-density,1));
            padding: calc(4px * var(--app-density,1)) calc(5px * var(--app-density,1)) calc(11px * var(--app-density,1));
            margin-bottom: 10px;
            border-bottom:
              1px solid rgba(255,255,255,.08);
          }

          .admin-layout-logo {
            width: 45px;
            height: 45px;
            flex: 0 0 45px;
            display: grid;
            place-items: center;
            overflow: hidden;
            padding: calc(5px * var(--app-density,1));
            border: 1px solid rgba(200,168,75,.34);
            border-radius: calc(15px * var(--app-radius-scale,1));
            background: #FFFFFF;
            box-shadow:
              inset 0 0 0 1px rgba(255,255,255,.70),
              0 10px 24px rgba(0,0,0,.12);
          }

          .admin-layout-logo img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: contain;
            filter:
              drop-shadow(
                0 4px 8px
                rgba(0,0,0,.12)
              );
          }

          .admin-layout-brand-copy {
            min-width: 0;
          }

          .admin-layout-brand-copy > div {
            display: flex;
            align-items: center;
            gap: calc(7px * var(--app-density,1));
          }

          .admin-layout-brand-copy strong {
            color: #FFFFFF;
            font-size: calc(18px * var(--app-font-scale,1));
            line-height: 1.2;
            font-weight: 950;
          }

          .admin-layout-brand-copy > div span {
            padding: calc(3px * var(--app-density,1)) calc(7px * var(--app-density,1));
            border:
              1px solid rgba(217,190,112,.28);
            border-radius: 999px;
            color: #F4D98A;
            background:
              rgba(200,168,75,.10);
            font-size: calc(9px * var(--app-font-scale,1));
            font-weight: 900;
            letter-spacing: .06em;
          }

          .admin-layout-brand-copy small {
            display: block;
            margin-top: 4px;
            color:
              rgba(255,255,255,.60);
            font-size: calc(11px * var(--app-font-scale,1));
            font-weight: 650;
          }

          /* PROFILE */

          .admin-layout-profile-card {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: calc(10px * var(--app-density,1));
            margin-bottom: 11px;
            padding: calc(11px * var(--app-density,1));
            border:
              1px solid rgba(255,255,255,.10);
            border-radius: calc(15px * var(--app-radius-scale,1));
            background:
              linear-gradient(
                135deg,
                rgba(255,255,255,.10),
                rgba(255,255,255,.045)
              );
            box-shadow:
              inset 0 1px 0
              rgba(255,255,255,.05);
          }

          .admin-layout-profile-avatar {
            width: 40px;
            height: 40px;
            flex: 0 0 40px;
            display: grid;
            place-items: center;
            border:
              1px solid rgba(217,190,112,.25);
            border-radius: calc(13px * var(--app-radius-scale,1));
            color: #FCE9A7;
            background:
              rgba(200,168,75,.12);
            font-size: calc(14px * var(--app-font-scale,1));
            font-weight: 950;
          }

          .admin-layout-profile-copy {
            min-width: 0;
          }

          .admin-layout-profile-copy span,
          .admin-layout-profile-copy strong,
          .admin-layout-profile-copy small {
            display: block;
          }

          .admin-layout-profile-copy span {
            color:
              rgba(255,255,255,.52);
            font-size: calc(10px * var(--app-font-scale,1));
            font-weight: 700;
          }

          .admin-layout-profile-copy strong {
            margin-top: 2px;
            overflow: hidden;
            color: #FFFFFF;
            font-size: calc(13px * var(--app-font-scale,1));
            line-height: 1.45;
            font-weight: 900;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .admin-layout-profile-copy small {
            margin-top: 2px;
            color:
              rgba(255,255,255,.55);
            font-size: calc(10px * var(--app-font-scale,1));
          }

          /* SEARCH */

          .admin-layout-search {
            position: relative;
            z-index: 1;
            min-height: 42px;
            display: flex;
            align-items: center;
            gap: calc(7px * var(--app-density,1));
            margin-bottom: 12px;
            padding: 0 calc(10px * var(--app-density,1));
            border:
              1px solid rgba(255,255,255,.09);
            border-radius: calc(12px * var(--app-radius-scale,1));
            color:
              rgba(255,255,255,.57);
            background:
              rgba(255,255,255,.055);
            transition:
              border-color .16s ease,
              background .16s ease;
          }

          .admin-layout-search:focus-within {
            border-color:
              rgba(217,190,112,.30);
            background:
              rgba(255,255,255,.08);
          }

          .admin-layout-search.collapsed {
            justify-content: center;
            padding: 0;
          }

          .admin-layout-search input {
            min-width: 0;
            flex: 1;
            border: 0;
            outline: 0;
            color: #FFFFFF;
            background: transparent;
            font-family: inherit;
            font-size: calc(12px * var(--app-font-scale,1));
            font-weight: 650;
          }

          .admin-layout-search input::placeholder {
            color:
              rgba(255,255,255,.42);
          }

          .admin-layout-search button {
            width: 24px;
            height: 24px;
            border: 0;
            border-radius: calc(7px * var(--app-radius-scale,1));
            display: grid;
            place-items: center;
            color:
              rgba(255,255,255,.70);
            background:
              rgba(255,255,255,.08);
            cursor: pointer;
          }

          .admin-layout-search kbd {
            padding: calc(3px * var(--app-density,1)) calc(6px * var(--app-density,1));
            border:
              1px solid rgba(255,255,255,.10);
            border-radius: calc(6px * var(--app-radius-scale,1));
            color:
              rgba(255,255,255,.48);
            background:
              rgba(0,0,0,.10);
            font-family: inherit;
            font-size: calc(9px * var(--app-font-scale,1));
          }

          /* NAV */

          .admin-layout-nav {
            position: relative;
            z-index: 1;
            min-height: 0;
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding-left: calc(2px * var(--app-density,1));
          }

          .admin-layout-nav-section {
            margin-bottom: 14px;
          }

          .admin-layout-nav-section-title {
            padding: 0 calc(10px * var(--app-density,1)) calc(6px * var(--app-density,1));
            color:
              rgba(255,255,255,.38);
            font-size: calc(10px * var(--app-font-scale,1));
            font-weight: 900;
            letter-spacing: .02em;
          }

          .admin-layout-nav-items {
            display: grid;
            gap: calc(5px * var(--app-density,1));
          }

          .admin-layout-nav-link {
            position: relative;
            min-height: 44px;
            display: flex;
            align-items: center;
            gap: calc(9px * var(--app-density,1));
            padding: 0 calc(10px * var(--app-density,1));
            border:
              1px solid transparent;
            border-radius: calc(12px * var(--app-radius-scale,1));
            color:
              rgba(255,255,255,.72);
            text-decoration: none;
            font-size: calc(12px * var(--app-font-scale,1));
            font-weight: 780;
            transition:
              color .16s ease,
              background .16s ease,
              border-color .16s ease,
              transform .16s ease,
              box-shadow .16s ease;
          }

          .admin-layout-nav-link::before {
            content: "";
            position: absolute;
            right: 0;
            top: 50%;
            width: 3px;
            height: 20px;
            border-radius: 999px;
            transform:
              translateY(-50%)
              scaleY(.45);
            opacity: 0;
            background:
              linear-gradient(
                180deg,
                var(--sadiq-gold-400),
                var(--sadiq-gold-500)
              );
            transition:
              opacity .16s ease,
              transform .16s ease;
          }

          .admin-layout-nav-link:hover {
            color: #FFFFFF;
            background:
              rgba(255,255,255,.07);
            transform:
              translateX(-2px);
          }

          .admin-layout-nav-link.active {
            color: #FFFFFF;
            border-color:
              rgba(217,190,112,.18);
            background:
              linear-gradient(
                135deg,
                rgba(217,190,112,.15),
                rgba(255,255,255,.065)
              );
            box-shadow:
              inset 0 1px 0
              rgba(255,255,255,.04);
          }

          .admin-layout-nav-link.active::before {
            opacity: 1;
            transform:
              translateY(-50%)
              scaleY(1);
          }

          .admin-layout-nav-link.collapsed {
            justify-content: center;
            padding: 0;
          }

          .admin-layout-nav-icon {
            width: 30px;
            height: 30px;
            flex: 0 0 30px;
            display: grid;
            place-items: center;
            border-radius: calc(9px * var(--app-radius-scale,1));
            color:
              rgba(255,255,255,.60);
            transition:
              color .16s ease,
              background .16s ease;
          }

          .admin-layout-nav-link:hover
          .admin-layout-nav-icon {
            color: #FFFFFF;
          }

          .admin-layout-nav-link.active
          .admin-layout-nav-icon {
            color: #F6DE93;
            background:
              rgba(200,168,75,.10);
          }

          .admin-layout-nav-label {
            min-width: 0;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .admin-layout-nav-arrow {
            opacity: 0;
            color: #E7CC78;
            transition:
              opacity .16s ease,
              transform .16s ease;
          }

          .admin-layout-nav-link.active
          .admin-layout-nav-arrow {
            opacity: 1;
          }

          .admin-layout-search-empty {
            min-height: 130px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: calc(4px * var(--app-density,1));
            color:
              rgba(255,255,255,.45);
            text-align: center;
          }

          .admin-layout-search-empty strong {
            color:
              rgba(255,255,255,.78);
            font-size: calc(12px * var(--app-font-scale,1));
          }

          .admin-layout-search-empty span {
            font-size: calc(10px * var(--app-font-scale,1));
          }

          /* SIDEBAR FOOTER */

          .admin-layout-sidebar-footer-wrap {
            position: relative;
            z-index: 1;
            display: grid;
            gap: calc(7px * var(--app-density,1));
            margin-top: 8px;
          }

          .admin-layout-sidebar-footer {
            display: flex;
            align-items: center;
            gap: calc(8px * var(--app-density,1));
            padding: calc(9px * var(--app-density,1));
            border:
              1px solid rgba(255,255,255,.08);
            border-radius: calc(12px * var(--app-radius-scale,1));
            background:
              rgba(255,255,255,.045);
          }

          .admin-layout-sidebar-footer.collapsed {
            justify-content: center;
          }

          .admin-layout-sidebar-footer-icon {
            width: 32px;
            height: 32px;
            flex: 0 0 32px;
            display: grid;
            place-items: center;
            border-radius: calc(9px * var(--app-radius-scale,1));
            color: #F1D681;
            background:
              rgba(200,168,75,.10);
          }

          .admin-layout-sidebar-footer strong,
          .admin-layout-sidebar-footer span {
            display: block;
          }

          .admin-layout-sidebar-footer strong {
            color: #FFFFFF;
            font-size: calc(11px * var(--app-font-scale,1));
            font-weight: 850;
          }

          .admin-layout-sidebar-footer span {
            margin-top: 2px;
            color:
              rgba(255,255,255,.47);
            font-size: calc(9px * var(--app-font-scale,1));
          }

          .admin-layout-logout-button {
            width: 100%;
            min-height: 41px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: calc(8px * var(--app-density,1));
            padding: 0 calc(12px * var(--app-density,1));
            border:
              1px solid rgba(255,123,123,.18);
            border-radius: calc(11px * var(--app-radius-scale,1));
            color: #FFD6D2;
            background:
              rgba(180,54,54,.10);
            font-family: inherit;
            font-size: calc(11px * var(--app-font-scale,1));
            font-weight: 850;
            cursor: pointer;
            transition:
              background .16s ease,
              border-color .16s ease,
              transform .16s ease;
          }

          .admin-layout-logout-button:hover {
            border-color:
              rgba(255,123,123,.30);
            background:
              rgba(180,54,54,.17);
            transform:
              translateY(-1px);
          }

          .admin-layout-logout-button.collapsed {
            width: 100%;
            padding: 0;
          }

          .admin-layout-logout-button:disabled {
            opacity: .55;
            cursor: wait;
            transform: none;
          }

          /* =========================
             MAIN
          ========================= */

          .admin-layout-main {
            position: relative;
            z-index: 1;
            min-width: 0;
            width: calc(100% - 296px);
            margin-right: 296px;
            min-height: 100vh;
            min-height: 100dvh;
            transition:
              width .22s ease,
              margin-right .22s ease;
          }

          .admin-layout-sidebar.collapsed ~ .admin-layout-main {
            width: calc(100% - 88px);
            margin-right: 88px;
          }

          /* TOPBAR */

          .admin-layout-topbar {
            position: relative;
            top: 0;
            right: 296px;
            left: 0;
            z-index: 40;
            min-height: 76px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: calc(15px * var(--app-density,1));
            padding: calc(10px * var(--app-density,1)) calc(22px * var(--app-density,1));
            border-bottom:
              1px solid rgba(15,81,72,.08);
            background:
              rgba(255,255,255,.91);
            backdrop-filter:
              blur(18px);
            box-shadow:
              0 8px 30px rgba(7,47,42,.035);
          }

          .admin-layout-sidebar.collapsed ~ .admin-layout-main .admin-layout-topbar {
            right: 88px;
          }

          .admin-layout-topbar::after {
            content: "";
            position: absolute;
            right: 24px;
            left: 24px;
            bottom: 0;
            height: 1px;
            background:
              linear-gradient(
                90deg,
                transparent,
                rgba(200,168,75,.22),
                transparent
              );
          }

          .admin-layout-topbar-start {
            display: flex;
            align-items: center;
            gap: calc(10px * var(--app-density,1));
            min-width: 0;
          }

          .admin-layout-menu-button {
            width: 42px;
            height: 42px;
            flex: 0 0 42px;
            border:
              1px solid #DCE8E2;
            border-radius: calc(13px * var(--app-radius-scale,1));
            display: grid;
            place-items: center;
            color:
              var(--sadiq-green-800);
            background:
              linear-gradient(
                145deg,
                #FFFFFF,
                #F1F7F4
              );
            box-shadow:
              0 6px 18px rgba(7,47,42,.055);
            cursor: pointer;
            transition:
              background .16s ease,
              transform .16s ease,
              box-shadow .16s ease;
          }

          .admin-layout-menu-button:hover {
            background: #EDF6F1;
            transform: translateY(-1px);
            box-shadow:
              0 9px 22px rgba(7,47,42,.08);
          }

          .admin-layout-page-icon {
            width: 43px;
            height: 43px;
            flex: 0 0 43px;
            display: grid;
            place-items: center;
            border:
              1px solid #D8E8E0;
            border-radius: calc(13px * var(--app-radius-scale,1));
            color:
              var(--sadiq-green-800);
            background:
              linear-gradient(
                145deg,
                #EAF6F0,
                #F8FCFA
              );
          }

          .admin-layout-page-copy {
            min-width: 0;
          }

          .admin-layout-page-copy span {
            display: block;
            color: #9A792D;
            font-size: calc(10px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .admin-layout-page-copy h1 {
            margin: 2px 0 0;
            overflow: hidden;
            color: #263F36;
            font-size: calc(19px * var(--app-font-scale,1));
            line-height: 1.25;
            font-weight: 950;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .admin-layout-nav-badge {
            min-width: 19px;
            height: 19px;
            display: inline-grid;
            place-items: center;
            margin-inline-start: auto;
            padding: 0 5px;
            border-radius: 999px;
            color: #fff;
            background: #B45A4F;
            font-size: 8px;
            font-weight: 950;
            line-height: 1;
            box-shadow: 0 0 0 3px rgba(180,90,79,.10);
          }

          .admin-layout-notification-button {
            position: relative;
            width: 39px;
            height: 39px;
            flex: 0 0 39px;
            display: grid;
            place-items: center;
            border: 1px solid var(--sadiq-border);
            border-radius: calc(11px * var(--app-radius-scale,1));
            color: #55716A;
            background: #fff;
            text-decoration: none;
            box-shadow: 0 5px 16px rgba(7,47,42,.035);
            transition:
              transform .16s ease,
              border-color .16s ease,
              background .16s ease;
          }

          .admin-layout-notification-button:hover {
            transform: translateY(-1px);
            border-color: #C9DAD2;
            background: #F8FBF9;
          }

          .admin-layout-notification-button.active {
            color: #fff;
            border-color: transparent;
            background: linear-gradient(
              135deg,
              var(--sadiq-green-800),
              var(--sadiq-green-600)
            );
          }

          .admin-layout-notification-button > span {
            position: absolute;
            top: -5px;
            left: -5px;
            min-width: 19px;
            height: 19px;
            display: grid;
            place-items: center;
            padding: 0 4px;
            border: 2px solid #fff;
            border-radius: 999px;
            color: #fff;
            background: #B44F45;
            font-size: 7px;
            font-weight: 950;
            line-height: 1;
          }

          .admin-layout-topbar-end {
            display: flex;
            align-items: center;
            gap: calc(8px * var(--app-density,1));
          }

          .admin-layout-date-card {
            display: flex;
            align-items: center;
            gap: calc(8px * var(--app-density,1));
            min-height: 45px;
            padding: calc(6px * var(--app-density,1)) calc(10px * var(--app-density,1));
            border:
              1px solid #E0E9E4;
            border-radius: calc(12px * var(--app-radius-scale,1));
            color:
              var(--sadiq-green-800);
            background:
              linear-gradient(
                145deg,
                #FFFFFF,
                #FBFCFA
              );
            box-shadow:
              0 6px 18px rgba(7,47,42,.035);
          }

          .admin-layout-date-card strong,
          .admin-layout-date-card span {
            display: block;
          }

          .admin-layout-date-card strong {
            color:
              var(--sadiq-green-800);
            font-size: calc(10px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .admin-layout-date-card span {
            margin-top: 2px;
            color: #87948E;
            font-size: calc(9px * var(--app-font-scale,1));
          }

          .admin-layout-topbar-profile {
            display: flex;
            align-items: center;
            gap: calc(8px * var(--app-density,1));
            min-height: 45px;
            padding: calc(5px * var(--app-density,1)) calc(8px * var(--app-density,1)) calc(5px * var(--app-density,1)) calc(11px * var(--app-density,1));
            border:
              1px solid #E0E9E4;
            border-radius: calc(12px * var(--app-radius-scale,1));
            background:
              #FFFFFF;
            box-shadow:
              0 6px 18px rgba(7,47,42,.035);
          }

          .admin-layout-topbar-avatar {
            width: 34px;
            height: 34px;
            display: grid;
            place-items: center;
            border-radius: calc(10px * var(--app-radius-scale,1));
            color: #FFFFFF;
            background:
              linear-gradient(
                145deg,
                var(--sadiq-green-800),
                var(--sadiq-green-600)
              );
            box-shadow:
              0 6px 14px rgba(15,81,72,.16);
            font-size: calc(11px * var(--app-font-scale,1));
            font-weight: 950;
          }

          .admin-layout-topbar-profile strong,
          .admin-layout-topbar-profile span {
            display: block;
          }

          .admin-layout-topbar-profile strong {
            max-width: 140px;
            overflow: hidden;
            color: #31463D;
            font-size: calc(11px * var(--app-font-scale,1));
            font-weight: 900;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .admin-layout-topbar-profile span {
            margin-top: 2px;
            color: #8D9993;
            font-size: calc(9px * var(--app-font-scale,1));
          }

          /* CONTENT */

          .admin-layout-content {
            position: relative;
            z-index: 1;
            padding: calc(20px * var(--app-density,1)) calc(22px * var(--app-density,1)) calc(28px * var(--app-density,1));
          }

          .admin-layout-content::before {
            content: "";
            position: absolute;
            top: 8px;
            right: 22px;
            left: 22px;
            height: 120px;
            z-index: -1;
            border-radius: calc(28px * var(--app-radius-scale,1));
            background:
              linear-gradient(
                135deg,
                rgba(255,255,255,.48),
                rgba(255,255,255,0)
              );
            pointer-events: none;
          }

          /* =========================
             MOBILE DRAWER
          ========================= */

          .admin-layout-mobile-overlay {
            position: fixed;
            inset: 0;
            z-index: 80;
            opacity: 0;
            visibility: hidden;
            background:
              rgba(3,30,27,.62);
            transition:
              opacity .2s ease,
              visibility .2s ease;
          }

          .admin-layout-mobile-overlay.open {
            opacity: 1;
            visibility: visible;
          }

          .admin-layout-mobile-drawer {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            z-index: 90;
            width: min(310px, 90vw);
            transform:
              translateX(105%);
            overflow: hidden;
            border-left:
              1px solid rgba(255,255,255,.08);
            background:
              radial-gradient(
                circle at 20% 0%,
                rgba(217,190,112,.11),
                transparent 24%
              ),
              linear-gradient(
                180deg,
                #0A3C36 0%,
                #062F2A 54%,
                #041F1C 100%
              );
            box-shadow:
              -24px 0 70px
              rgba(3,30,27,.28);
            transition:
              transform .22s ease;
          }

          .admin-layout-mobile-drawer.open {
            transform:
              translateX(0);
          }

          .admin-layout-mobile-close {
            position: absolute;
            left: 3px;
            top: 9px;
            width: 34px;
            height: 34px;
            border:
              1px solid rgba(255,255,255,.10);
            border-radius: calc(10px * var(--app-radius-scale,1));
            display: grid;
            place-items: center;
            color:
              rgba(255,255,255,.76);
            background:
              rgba(255,255,255,.06);
            cursor: pointer;
          }

          /* =========================
             RESPONSIVE
          ========================= */

          @media (max-width: 1120px) {
            .admin-layout-date-card {
              display: none;
            }
          }

          @media (max-width: 820px) {
            .admin-layout-shell {
              display: block;
            }

            .admin-layout-main,
            .admin-layout-sidebar.collapsed ~ .admin-layout-main {
              width: 100%;
              margin-right: 0;
            }

            .admin-layout-topbar,
            .admin-layout-sidebar.collapsed ~ .admin-layout-main .admin-layout-topbar {
              right: 0;
              left: 0;
              min-height: 66px;
              padding: calc(8px * var(--app-density,1)) calc(11px * var(--app-density,1));
              backdrop-filter: none;
            }

            .admin-layout-page-icon {
              display: none;
            }

            .admin-layout-topbar-profile > div:last-child {
              display: none;
            }

            .admin-layout-topbar-profile {
              padding: calc(5px * var(--app-density,1));
            }

            .admin-layout-content {
              padding:
                calc(12px * var(--app-density,1)) calc(10px * var(--app-density,1)) calc(22px * var(--app-density,1));
            }

            .admin-layout-mobile-overlay {
              backdrop-filter: none;
            }
          }

          @media (max-width: 430px) {
            .admin-layout-page-copy span {
              display: none;
            }

            .admin-layout-page-copy h1 {
              max-width: 180px;
              font-size: calc(15px * var(--app-font-scale,1));
            }

            .admin-layout-topbar {
              gap: calc(7px * var(--app-density,1));
            }

            .admin-layout-menu-button {
              width: 39px;
              height: 39px;
              flex-basis: 39px;
            }

            .admin-layout-topbar-avatar {
              width: 31px;
              height: 31px;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .admin-layout-sidebar,
            .admin-layout-mobile-drawer,
            .admin-layout-mobile-overlay,
            .admin-layout-nav-link,
            .admin-layout-menu-button,
            .admin-layout-logout-button {
              transition: none !important;
            }
          }
          /* =========================================================
             FINAL LAYOUT JOIN
             Sidebar + Topbar are one connected visual shell.
             Topbar scrolls normally (NOT fixed/sticky).
          ========================================================= */
          .admin-layout-main {
            position: relative !important;
            min-width: 0 !important;
          }

          .admin-layout-topbar {
            position: relative !important;
            inset: auto !important;
            top: auto !important;
            right: auto !important;
            left: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
          }

          .admin-layout-sidebar.collapsed ~ .admin-layout-main .admin-layout-topbar {
            right: auto !important;
            left: auto !important;
          }

          .admin-layout-content {
            padding-top: calc(18px * var(--app-density,1)) !important;
          }

          @media (max-width: 1024px) {
            .admin-layout-topbar {
              width: 100% !important;
              margin: 0 !important;
              border-radius: 0 !important;
            }

            .admin-layout-content {
              padding-top: calc(12px * var(--app-density,1)) !important;
            }
          }



        `}
      </style>
    </div>
  );
}
