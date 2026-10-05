// Only JavaScript modules are preloaded; no student data or authenticated requests.
export const pageLoaders = {
  AdminLayout: () => import("../components/AdminLayout"),
  Login: () => import("../pages/Login"),
  ForgotPassword: () => import("../pages/ForgotPassword"),
  ResetPassword: () => import("../pages/ResetPassword"),
  SystemAdmin: () => import("../pages/SystemAdmin"),
  AdminDashboard: () => import("../pages/AdminDashboard"),
  Profile: () => import("../pages/Profile"),
  Reports: () => import("../pages/Reports"),
  RewardsPage: () => import("../pages/RewardsPage"),
  Competitions: () => import("../pages/Competitions"),
  Badges: () => import("../pages/Badges"),
  Mosques: () => import("../pages/Mosques"),
  Halaqat: () => import("../pages/Halaqat"),
  Teachers: () => import("../pages/Teachers"),
  Students: () => import("../pages/Students"),
  HalaqaStudents: () => import("../pages/HalaqaStudents"),
  HalaqaTeachers: () => import("../pages/HalaqaTeachers"),
  Attendance: () => import("../pages/Attendance"),
  Recitations: () => import("../pages/Recitations"),
  Exams: () => import("../pages/Exams"),
  MonthlyAchievement: () => import("../pages/MonthlyAchievement"),
  TVLeaderboardPage: () => import("../pages/TVLeaderboardPage"),
  SettingsPage: () => import("../pages/SettingsPage"),
  JoinRequests: () => import("../pages/JoinRequests"),
  AdminInvoices: () => import("../pages/AdminInvoices"),
  Notifications: () => import("../pages/Notifications"),
  InvoicePage: () => import("../pages/InvoicePage"),
  TeacherLayout: () => import("../layouts/TeacherLayout"),
  TeacherDashboard: () => import("../pages/teacher/Dashboard"),
  TeacherStudents: () => import("../pages/teacher/Students"),
  TeacherAttendance: () => import("../pages/teacher/Attendance"),
  TeacherRecitations: () => import("../pages/teacher/Recitations"),
  TeacherPoints: () => import("../pages/teacher/Points"),
  TeacherMonthlyAchievement: () => import("../pages/teacher/MonthlyAchievement"),
  TeacherExams: () => import("../pages/teacher/Exams"),
  TeacherReports: () => import("../pages/teacher/Reports"),
  TeacherProfile: () => import("../pages/teacher/Profile"),
  TeacherSettings: () => import("../pages/teacher/Settings"),
  TeacherHalaqat: () => import("../pages/teacher/Halaqat"),
  TeacherMonthlyPlan: () => import("../pages/teacher/MonthlyPlan"),
  TeacherStudentCare: () => import("../pages/teacher/StudentCare"),
  TeacherRecords: () => import("../pages/teacher/Records"),
  TeacherJoinRequests: () => import("../pages/teacher/JoinRequests"),
  StudentLayout: () => import("../layouts/StudentLayout"),
  StudentDashboard: () => import("../pages/student/Dashboard"),
  MyHalaqa: () => import("../pages/student/MyHalaqa"),
  Classmates: () => import("../pages/student/Classmates"),
  StudentRecitations: () => import("../pages/student/Recitations"),
  StudentMonthlyPlan: () => import("../pages/student/MonthlyPlan"),
  StudentMonthlyAchievement: () => import("../pages/student/MonthlyAchievement"),
  StudentAttendance: () => import("../pages/student/Attendance"),
  StudentPoints: () => import("../pages/student/Points"),
  StudentExams: () => import("../pages/student/Exams"),
  StudentNotifications: () => import("../pages/student/Notifications"),
  StudentSettings: () => import("../pages/student/Settings"),
  StudentProfile: () => import("../pages/student/Profile"),
  LandingPage: () => import("../pages/LandingPage"),
  Register: () => import("../pages/Register"),
  StudentOnboarding: () => import("../pages/student/Onboarding"),
  SupervisorSetup: () => import("../pages/supervisor/SupervisorSetup"),
};
const routes = {
  "/": "LandingPage",
  "/login": "Login",
  "/register": "Register",
  "/forgot-password": "ForgotPassword",
  "/reset-password": "ResetPassword",
  "/system-admin": "SystemAdmin",
  "/student/onboarding": "StudentOnboarding",
  "/supervisor/setup": "SupervisorSetup",
  "/admin": "AdminDashboard",
  "/admin/profile": "Profile",
  "/admin/notifications": "Notifications",
  "/admin/reports": "Reports",
  "/admin/invoices": "AdminInvoices",
  "/admin/points-transactions": "RewardsPage",
  "/admin/competitions": "Competitions",
  "/admin/badges": "Badges",
  "/admin/mosques": "Mosques",
  "/admin/halaqat": "Halaqat",
  "/admin/teachers": "Teachers",
  "/admin/join-requests": "JoinRequests",
  "/admin/students": "Students",
  "/admin/exams": "Exams",
  "/admin/monthly-achievement": "MonthlyAchievement",
  "/admin/tv-leaderboard": "TVLeaderboardPage",
  "/admin/settings": "SettingsPage",
  "/admin/attendance": "Attendance",
  "/admin/recitations": "Recitations",
  "/teacher": "TeacherDashboard",
  "/teacher/students": "TeacherStudents",
  "/teacher/join-requests": "TeacherJoinRequests",
  "/teacher/attendance": "TeacherAttendance",
  "/teacher/recitations": "TeacherRecitations",
  "/teacher/points": "TeacherPoints",
  "/teacher/halaqat": "TeacherHalaqat",
  "/teacher/monthly-plan": "TeacherMonthlyPlan",
  "/teacher/monthly-achievement": "TeacherMonthlyAchievement",
  "/teacher/exams": "TeacherExams",
  "/teacher/notifications": "TeacherStudentCare",
  "/teacher/records": "TeacherRecords",
  "/teacher/reports": "TeacherReports",
  "/teacher/profile": "TeacherProfile",
  "/teacher/settings": "TeacherSettings",
  "/student/dashboard": "StudentDashboard",
  "/student/halaqa": "MyHalaqa",
  "/student/classmates": "Classmates",
  "/student/recitations": "StudentRecitations",
  "/student/monthly-plan": "StudentMonthlyPlan",
  "/student/monthly-achievement": "StudentMonthlyAchievement",
  "/student/attendance": "StudentAttendance",
  "/student/points": "StudentPoints",
  "/student/exams": "StudentExams",
  "/student/notifications": "StudentNotifications",
  "/student/settings": "StudentSettings",
  "/student/profile": "StudentProfile",
};
const pending = new Map();
function load(name) {
  if (!pending.has(name)) {
    const request = pageLoaders[name]().catch(error => { pending.delete(name); throw error; });
    pending.set(name, request);
  }
  return pending.get(name);
}
export function preloadRoute(pathname) {
  const path = String(pathname).split(/[?#]/)[0].replace(/\/$/, '') || '/';
  const page = routes[path] || (path === '/student' ? 'StudentDashboard'
    : /^\/admin\/invoices\/[^/]+$/.test(path) ? 'InvoicePage'
    : /^\/admin\/halaqa-students\/[^/]+$/.test(path) ? 'HalaqaStudents'
    : /^\/admin\/halaqa-teachers\/[^/]+$/.test(path) ? 'HalaqaTeachers' : null);
  if (!page) return Promise.resolve();
  const layout = path.startsWith('/teacher') ? 'TeacherLayout'
    : path.startsWith('/student') && path !== '/student/onboarding' ? 'StudentLayout'
    : path.startsWith('/admin') ? 'AdminLayout' : null;
  return Promise.all([load(page), ...(layout ? [load(layout)] : [])]);
}
export function preloadOnIntent(to) {
  const connection = typeof navigator !== 'undefined' ? navigator.connection : null;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return;
  const path = typeof to === 'string' ? to : to?.pathname;
  if (path?.startsWith('/')) void preloadRoute(path).catch(() => {});
}
