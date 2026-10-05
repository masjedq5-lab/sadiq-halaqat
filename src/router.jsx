import lazyWithRetry from "./lib/lazyWithRetry";
import { pageLoaders, preloadRoute } from "./lib/routeModules";
import { Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
} from "react-router-dom";

const AdminLayout = lazyWithRetry(pageLoaders.AdminLayout);

const Login = lazyWithRetry(pageLoaders.Login);
const ForgotPassword = lazyWithRetry(pageLoaders.ForgotPassword);
const ResetPassword = lazyWithRetry(pageLoaders.ResetPassword);
const SystemAdmin = lazyWithRetry(pageLoaders.SystemAdmin);
const AdminDashboard = lazyWithRetry(pageLoaders.AdminDashboard);
const Profile = lazyWithRetry(pageLoaders.Profile);
const Reports = lazyWithRetry(pageLoaders.Reports);
const RewardsPage = lazyWithRetry(pageLoaders.RewardsPage);
const Competitions = lazyWithRetry(pageLoaders.Competitions);
const Badges = lazyWithRetry(pageLoaders.Badges);
const Mosques = lazyWithRetry(pageLoaders.Mosques);
const Halaqat = lazyWithRetry(pageLoaders.Halaqat);
const Teachers = lazyWithRetry(pageLoaders.Teachers);
const Students = lazyWithRetry(pageLoaders.Students);
const HalaqaStudents = lazyWithRetry(pageLoaders.HalaqaStudents);
const HalaqaTeachers = lazyWithRetry(pageLoaders.HalaqaTeachers);
const Attendance = lazyWithRetry(pageLoaders.Attendance);
const Recitations = lazyWithRetry(pageLoaders.Recitations);
const Exams = lazyWithRetry(pageLoaders.Exams);
const MonthlyAchievement = lazyWithRetry(pageLoaders.MonthlyAchievement);
const TVLeaderboardPage = lazyWithRetry(pageLoaders.TVLeaderboardPage);
const SettingsPage = lazyWithRetry(pageLoaders.SettingsPage);
const JoinRequests = lazyWithRetry(pageLoaders.JoinRequests);
const AdminInvoices = lazyWithRetry(pageLoaders.AdminInvoices);
const Notifications = lazyWithRetry(pageLoaders.Notifications);
const InvoicePage = lazyWithRetry(pageLoaders.InvoicePage);
/* =========================================================
   Teacher Portal
========================================================= */
const TeacherLayout = lazyWithRetry(pageLoaders.TeacherLayout);

const TeacherDashboard = lazyWithRetry(pageLoaders.TeacherDashboard);
const TeacherStudents = lazyWithRetry(pageLoaders.TeacherStudents);
const TeacherAttendance = lazyWithRetry(pageLoaders.TeacherAttendance);
const TeacherRecitations = lazyWithRetry(pageLoaders.TeacherRecitations);
const TeacherPoints = lazyWithRetry(pageLoaders.TeacherPoints);
const TeacherMonthlyAchievement = lazyWithRetry(pageLoaders.TeacherMonthlyAchievement);
const TeacherExams = lazyWithRetry(pageLoaders.TeacherExams);
const TeacherReports = lazyWithRetry(pageLoaders.TeacherReports);
const TeacherProfile = lazyWithRetry(pageLoaders.TeacherProfile);
const TeacherSettings = lazyWithRetry(pageLoaders.TeacherSettings);
const TeacherHalaqat = lazyWithRetry(pageLoaders.TeacherHalaqat);
const TeacherMonthlyPlan = lazyWithRetry(pageLoaders.TeacherMonthlyPlan);
const TeacherStudentCare = lazyWithRetry(pageLoaders.TeacherStudentCare);
const TeacherRecords = lazyWithRetry(pageLoaders.TeacherRecords);
const TeacherJoinRequests = lazyWithRetry(pageLoaders.TeacherJoinRequests);
/* =========================================================
   Student Portal
========================================================= */
const StudentLayout = lazyWithRetry(pageLoaders.StudentLayout);

const StudentDashboard = lazyWithRetry(pageLoaders.StudentDashboard);
const MyHalaqa = lazyWithRetry(pageLoaders.MyHalaqa);
const Classmates = lazyWithRetry(pageLoaders.Classmates);
const StudentRecitations = lazyWithRetry(pageLoaders.StudentRecitations);
const StudentMonthlyPlan = lazyWithRetry(pageLoaders.StudentMonthlyPlan);
const StudentMonthlyAchievement = lazyWithRetry(pageLoaders.StudentMonthlyAchievement);
const StudentAttendance = lazyWithRetry(pageLoaders.StudentAttendance);
const StudentPoints = lazyWithRetry(pageLoaders.StudentPoints);
const StudentExams = lazyWithRetry(pageLoaders.StudentExams);
const StudentNotifications = lazyWithRetry(pageLoaders.StudentNotifications);
const StudentSettings = lazyWithRetry(pageLoaders.StudentSettings);
const StudentProfile = lazyWithRetry(pageLoaders.StudentProfile);
/* =========================================================
   Public / Setup
========================================================= */
import PublicLayout from "./layouts/PublicLayout";
const LandingPage = lazyWithRetry(pageLoaders.LandingPage);
const Register = lazyWithRetry(pageLoaders.Register);
const StudentOnboarding = lazyWithRetry(pageLoaders.StudentOnboarding);
const SupervisorSetup = lazyWithRetry(pageLoaders.SupervisorSetup);

function renderLazy(Component) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          style={{
            minHeight: "160px",
            display: "grid",
            placeItems: "center",
            color: "#60736b",
            fontWeight: 800,
          }}
        >
          جارٍ تحميل الصفحة…
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

if (typeof window !== "undefined") {
  void preloadRoute(window.location.pathname).catch(() => {});
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: renderLazy(LandingPage),
      },
    ],
  },

  {
    path: "/login",
    element: renderLazy(Login),
  },

  {
    path: "/forgot-password",
    element: renderLazy(ForgotPassword),
  },

  {
    path: "/reset-password",
    element: renderLazy(ResetPassword),
  },

  {
    path: "/register",
    element: renderLazy(Register),
  },

  {
    path: "/student/onboarding",
    element: renderLazy(StudentOnboarding),
  },

  {
    path: "/system-admin",
    element: renderLazy(SystemAdmin),
  },

  {
    path: "/supervisor/setup",
    element: renderLazy(SupervisorSetup),
  },

  {
    path: "/admin",
    element: renderLazy(AdminLayout),

    children: [
      {
        index: true,
        element: renderLazy(AdminDashboard),
      },

      {
        path: "profile",
        element: renderLazy(Profile),
      },

      {
        path: "notifications",
        element: renderLazy(Notifications),
      },

      {
        path: "reports",
        element: renderLazy(Reports),
      },

      {
        path: "invoices",
        element: renderLazy(AdminInvoices),
      },

      {
        path: "invoices/:invoiceId",
        element: renderLazy(InvoicePage),
      },

      {
        path: "points-transactions",
        element: renderLazy(RewardsPage),
      },

      {
        path: "competitions",
        element: renderLazy(Competitions),
      },

      {
        path: "badges",
        element: renderLazy(Badges),
      },

      {
        path: "mosques",
        element: renderLazy(Mosques),
      },

      {
        path: "halaqat",
        element: renderLazy(Halaqat),
      },

      {
        path: "teachers",
        element: renderLazy(Teachers),
      },

      {
        path: "join-requests",
        element: renderLazy(JoinRequests),
      },

      {
        path: "students",
        element: renderLazy(Students),
      },

      {
        path: "exams",
        element: renderLazy(Exams),
      },

      {
        path: "monthly-achievement",
        element: renderLazy(MonthlyAchievement),
      },

      {
        path: "tv-leaderboard",
        element: renderLazy(TVLeaderboardPage),
      },

      {
        path: "settings",
        element: renderLazy(SettingsPage),
      },

      {
        path: "halaqa-students/:id",
        element: renderLazy(HalaqaStudents),
      },

      {
        path: "halaqa-teachers/:id",
        element: renderLazy(HalaqaTeachers),
      },

      {
        path: "attendance",
        element: renderLazy(Attendance),
      },

      {
        path: "recitations",
        element: renderLazy(Recitations),
      },
    ],
  },

  {
    path: "/teacher",
    element: renderLazy(TeacherLayout),

    children: [
      {
        index: true,
        element: renderLazy(TeacherDashboard),
      },

      {
        path: "students",
        element: renderLazy(TeacherStudents),
      },

      {
        path: "join-requests",
        element: renderLazy(TeacherJoinRequests),
      },

      {
        path: "attendance",
        element: renderLazy(TeacherAttendance),
      },

      {
        path: "recitations",
        element: renderLazy(TeacherRecitations),
      },

      {
        path: "points",
        element: renderLazy(TeacherPoints),
      },

      {
        path: "halaqat",
        element: renderLazy(TeacherHalaqat),
      },

      {
        path: "monthly-plan",
        element: renderLazy(TeacherMonthlyPlan),
      },

      {
        path: "monthly-achievement",
        element: renderLazy(TeacherMonthlyAchievement),
      },

      {
        path: "exams",
        element: renderLazy(TeacherExams),
      },

      {
        path: "notifications",
        element: renderLazy(TeacherStudentCare),
      },

{
  path: "records",
  element: renderLazy(TeacherRecords),
},

      {
        path: "reports",
        element: renderLazy(TeacherReports),
      },

      {
        path: "profile",
        element: renderLazy(TeacherProfile),
      },

      {
        path: "settings",
        element: renderLazy(TeacherSettings),
      },
    ],
  },

  {
    path: "/student",
    element: renderLazy(StudentLayout),

    children: [
      {
        index: true,
        element: <Navigate to="/student/dashboard" replace />,
      },

      {
        path: "dashboard",
        element: renderLazy(StudentDashboard),
      },

      {
        path: "halaqa",
        element: renderLazy(MyHalaqa),
      },

      {
        path: "classmates",
        element: renderLazy(Classmates),
      },

      {
        path: "recitations",
        element: renderLazy(StudentRecitations),
      },

      {
        path: "monthly-plan",
        element: renderLazy(StudentMonthlyPlan),
      },

      {
        path: "monthly-achievement",
        element: renderLazy(StudentMonthlyAchievement),
      },

      {
        path: "attendance",
        element: renderLazy(StudentAttendance),
      },

      {
        path: "points",
        element: renderLazy(StudentPoints),
      },

      {
        path: "exams",
        element: renderLazy(StudentExams),
      },

      {
        path: "notifications",
        element: renderLazy(StudentNotifications),
      },

      {
        path: "settings",
        element: renderLazy(StudentSettings),
      },

      {
        path: "profile",
        element: renderLazy(StudentProfile),
      },
    ],
  },

  {
    path: "*",
    element: renderLazy(Login),
  },
]);

export default router;
