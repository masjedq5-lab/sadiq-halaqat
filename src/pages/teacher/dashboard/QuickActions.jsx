import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpenCheck,
  ClipboardCheck,
  GraduationCap,
  Target,
  Users,
} from "lucide-react";

const ACTIONS = [
  {
    title: "تسجيل الحضور",
    description: "افتح كشف الحلقة وابدأ التسجيل",
    icon: ClipboardCheck,
    path: "/teacher/attendance",
    tone: "green",
  },
  {
    title: "إضافة تسميع",
    description: "سجل حفظ أو مراجعة الطالب",
    icon: BookOpenCheck,
    path: "/teacher/recitations",
    tone: "gold",
  },
  {
    title: "طلابي",
    description: "متابعة الطلاب والملفات",
    icon: Users,
    path: "/teacher/students",
    tone: "blue",
  },
  {
    title: "الإنجاز الشهري",
    description: "تابع الحفظ والمراجعة",
    icon: Target,
    path: "/teacher/monthly-achievement",
    tone: "teal",
  },
  {
    title: "النقاط والمكافآت",
    description: "تحفيز الطلاب ومتابعة النقاط",
    icon: Award,
    path: "/teacher/points",
    tone: "rose",
  },
  {
    title: "الاختبارات",
    description: "إدارة الاختبارات والنتائج",
    icon: GraduationCap,
    path: "/teacher/exams",
    tone: "violet",
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <section className="td-actions">
      <header className="td-section-head">
        <div>
          <h3>إجراءاتك اليومية</h3>
        </div>
      </header>

      <div className="td-actions-grid">
        {ACTIONS.map((action) => {
          const Icon = action.icon;

          return (
            <button
              type="button"
              className={`td-action-card td-action-${action.tone}`}
              key={action.title}
              onClick={() => navigate(action.path)}
            >
              <div className="td-action-icon">
                <Icon size={21} />
              </div>

              <div className="td-action-copy">
                <strong>{action.title}</strong>
                <span>{action.description}</span>
              </div>

              <ArrowLeft className="td-action-arrow" size={17} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
