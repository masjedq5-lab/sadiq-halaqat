import {displayDateFormatter, monthRange, dateKey} from "../lib/calendar";
import { functionErrorMessage } from "../lib/functionErrors";
import Ornament, { OrnamentScene } from '../components/ornaments/Ornament';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  Crown,
  Eye,
  Gauge,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Layers3,
  MapPin,
  Medal,
  Moon,
  MoonStar,
  Network,
  NotebookTabs,
  Orbit,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  SunMedium,
  Sunrise,
  Sunset,
  Target,
  TrendingUp,
  Trophy,
  UserRoundCheck,
  Users,
  Headphones,
  Loader2,
  MessageCircle,
  Send,
  X,
  UsersRound,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/* SADIQ_PUBLIC_RPC_SESSION_RETRY_V1 */
async function publicRpcWithSessionRetry(rpcName, params) {
  if (rpcName === "get_public_mosque_stats") {
    const period = monthRange(dateKey());
    rpcName = "get_public_mosque_stats_period";
    params = { ...params, p_period_start: period.start, p_period_end: period.nextStart, p_academic_start: monthRange(dateKey(), "hijri").start };
  }
  let result = await supabase.rpc(rpcName, params);

  if (result?.error?.code !== "PGRST303") {
    return result;
  }

  try {
    const { error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshError) {
      return result;
    }
  } catch {
    return result;
  }

  return supabase.rpc(rpcName, params);
}

import "./LandingPage.css";

const EMPTY_STATS = {
  id: "all",
  name: "جميع المساجد",
  subtitle: "نظرة شاملة على منظومة الصديق",
  halaqat: 0,
  teachers: 0,
  students: 0,
  recitations: 0,
  attendance: 0,
  achievement: 0,
  points: 0,
  health: 0,
  activeToday: 0,
  studentsToday: 0,
  weeklyRecitations: 0,
  generatedAt: null,
};

const EMPTY_INSIGHTS = {
  address: "",
  totalCapacity: 0,
  currentStudents: 0,
  occupancyRate: 0,
  activeHalaqat: 0,
  inactiveHalaqat: 0,
  archivedHalaqat: 0,
  periods: {
    after_fajr: 0,
    after_dhuhr: 0,
    after_asr: 0,
    after_maghrib: 0,
    after_isha: 0,
    unspecified: 0,
  },
};

const PERIODS = [
  { key: "after_fajr", label: "بعد الفجر", icon: Sunrise },
  { key: "after_dhuhr", label: "بعد الظهر", icon: SunMedium },
  { key: "after_asr", label: "بعد العصر", icon: SunMedium },
  { key: "after_maghrib", label: "بعد المغرب", icon: Sunset },
  { key: "after_isha", label: "بعد العشاء", icon: Moon },
];

const FEATURES = [
  {
    icon: UsersRound,
    title: "إدارة الحلقات",
    description:
      "تنظيم الحلقات والمعلمين والطلاب وربط كل طالب بمساره الصحيح.",
  },
  {
    icon: CalendarCheck2,
    title: "الحضور والانضباط",
    description:
      "متابعة الحضور والتأخر والغياب مع رؤية واضحة لحالة الطالب.",
  },
  {
    icon: BookOpen,
    title: "التسميع",
    description:
      "تسجيل ومتابعة الحفظ والمراجعة والقرآن والنورانية بصورة دقيقة.",
  },
  {
    icon: Target,
    title: "الخطط التعليمية",
    description:
      "خطط شهرية تساعد المعلم على تحويل الهدف إلى خطوات قابلة للقياس.",
  },
  {
    icon: ClipboardCheck,
    title: "الاختبارات",
    description:
      "متابعة الاختبارات والنتائج ومستوى الطالب عبر مراحل رحلته.",
  },
  {
    icon: Medal,
    title: "التحفيز والنقاط",
    description:
      "منظومة نقاط ومكافآت تساعد على تعزيز الالتزام والإنجاز.",
  },
  {
    icon: HeartHandshake,
    title: "العناية بالطلاب",
    description:
      "اكتشاف التعثر مبكرًا ومساعدة المعلم على التدخل قبل تفاقم المشكلة.",
  },
  {
    icon: BarChart3,
    title: "التقارير والمؤشرات",
    description:
      "تحويل بيانات الحلقة إلى مؤشرات تساعد الإدارة على اتخاذ قرار أفضل.",
  },
];

const JOURNEY = [
  {
    number: "01",
    title: "الانضمام",
    text: "تسجيل الطالب وربطه بالحَلقة والمعلم المناسب.",
  },
  {
    number: "02",
    title: "الخطة",
    text: "وضع هدف واضح للحفظ والمراجعة يناسب مستوى الطالب.",
  },
  {
    number: "03",
    title: "المتابعة",
    text: "حضور وتسميع ومراجعة مستمرة بدل المتابعة المتقطعة.",
  },
  {
    number: "04",
    title: "القياس",
    text: "قياس الإنجاز الشهري والاختبارات والتقدم الفعلي.",
  },
  {
    number: "05",
    title: "التحفيز",
    text: "استخدام النقاط والمكافآت لدفع الطالب نحو الاستمرار.",
  },
  {
    number: "06",
    title: "العناية",
    text: "التدخل عند انخفاض الحضور أو التسميع أو الإنجاز.",
  },
  {
    number: "07",
    title: "الإنجاز",
    text: "رحلة تعليمية أكثر وضوحًا واستقرارًا وأثرًا.",
  },
];

const WHY_SADIQ = [
  {
    icon: CircleUserRound,
    title: "الطالب أولًا",
    text: "كل رقم في النظام يعود إلى طالب ومسيرة تحتاج إلى متابعة.",
  },
  {
    icon: Orbit,
    title: "رؤية مترابطة",
    text: "الحضور والتسميع والخطط والنقاط والاختبارات في صورة واحدة.",
  },
  {
    icon: TrendingUp,
    title: "تطوير مستمر",
    text: "نحوّل البيانات اليومية إلى مؤشرات تساعد على رفع الأداء.",
  },
  {
    icon: ShieldCheck,
    title: "خصوصية وصلاحيات",
    text: "الصفحة العامة تعرض مؤشرات مجمعة فقط دون أي بيانات شخصية.",
  },
];

const HERO_WISDOM = [
  {
    type: "ayah",
    icon: BookOpen,
    badge: "آية كريمة",
    text: "﴿ وَقُلْ رَبِّ زِدْنِي عِلْمًا ﴾",
    reference: "سورة طه — الآية 114",
  },
  {
    type: "hadith",
    icon: Sparkles,
    badge: "حديث صحيح",
    text: "« خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ »",
    reference: "صحيح البخاري — حديث 5027",
  },
  {
    type: "ayah",
    icon: BookOpen,
    badge: "آية كريمة",
    text: "﴿ يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنْكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ﴾",
    reference: "سورة المجادلة — الآية 11",
  },
  {
    type: "hadith",
    icon: Sparkles,
    badge: "حديث صحيح",
    text: "« وَمَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ »",
    reference: "صحيح مسلم — حديث 2699",
  },
  {
    type: "ayah",
    icon: BookOpen,
    badge: "آية كريمة",
    text: "﴿ وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ ﴾",
    reference: "سورة العنكبوت — الآية 69",
  },
  {
    type: "hadith",
    icon: Sparkles,
    badge: "حديث صحيح",
    text: "« أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ »",
    reference: "صحيح البخاري — حديث 6465 • صحيح مسلم — حديث 783",
  },
  {
    type: "ayah",
    icon: BookOpen,
    badge: "آية كريمة",
    text: "﴿ قُلْ هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ ﴾",
    reference: "سورة الزمر — الآية 9",
  },
  {
    type: "hadith",
    icon: Sparkles,
    badge: "حديث صحيح",
    text: "« مَثَلُ الْمُؤْمِنِ الَّذِي يَقْرَأُ الْقُرْآنَ كَمَثَلِ الْأُتْرُجَّةِ رِيحُهَا طَيِّبٌ وَطَعْمُهَا طَيِّبٌ »",
    reference: "صحيح البخاري — حديث 5427 • صحيح مسلم — حديث 797",
  },
];

const ROLES = [
  {
    icon: Crown,
    title: "الإدارة",
    text: "رؤية شاملة للمنظومة واتخاذ القرار من خلال مؤشرات واضحة.",
  },
  {
    icon: Landmark,
    title: "المشرف",
    text: "متابعة المساجد والحلقات والمعلمين وجودة الأداء التشغيلي.",
  },
  {
    icon: GraduationCap,
    title: "المعلم",
    text: "أدوات تساعده على التركيز على الطالب بدل الأعمال الإدارية المتكررة.",
  },
  {
    icon: UserRoundCheck,
    title: "الطالب",
    text: "رحلة أكثر وضوحًا بين الخطة والمتابعة والتحفيز والإنجاز.",
  },
];

function clampPercent(value) {
  const number = Number(value) || 0;
  return Math.max(0, Math.min(100, number));
}

function normalizeStats(row) {
  if (!row) return EMPTY_STATS;

  return {
    id: row.mosque_id == null ? "all" : String(row.mosque_id),
    name: row.mosque_name || "جميع المساجد",
    subtitle:
      row.mosque_id == null
        ? "نظرة شاملة على منظومة الصديق"
        : "إحصائيات المسجد",
    halaqat: Number(row.halaqat_count) || 0,
    teachers: Number(row.teachers_count) || 0,
    students: Number(row.students_count) || 0,
    recitations: Number(row.recitations_month) || 0,
    attendance: clampPercent(row.attendance_rate),
    achievement: clampPercent(row.monthly_achievement_rate),
    points: Number(row.total_student_points) || 0,
    health: clampPercent(row.health_score),
    activeToday: Number(row.active_halaqat_today) || 0,
    studentsToday: Number(row.students_today) || 0,
    weeklyRecitations: Number(row.weekly_recitations) || 0,
    generatedAt: row.generated_at || null,
  };
}

function normalizeInsights(row) {
  if (!row) return EMPTY_INSIGHTS;

  return {
    address: row.mosque_address || "",
    totalCapacity: Number(row.total_capacity) || 0,
    currentStudents: Number(row.current_students) || 0,
    occupancyRate: clampPercent(row.occupancy_rate),
    activeHalaqat: Number(row.active_halaqat_count) || 0,
    inactiveHalaqat: Number(row.inactive_halaqat_count) || 0,
    archivedHalaqat: Number(row.archived_halaqat_count) || 0,
    periods: {
      after_fajr: Number(row.after_fajr_count) || 0,
      after_dhuhr: Number(row.after_dhuhr_count) || 0,
      after_asr: Number(row.after_asr_count) || 0,
      after_maghrib: Number(row.after_maghrib_count) || 0,
      after_isha: Number(row.after_isha_count) || 0,
      unspecified: Number(row.unspecified_period_count) || 0,
    },
  };
}

function formatUpdatedAt(value) {
  if (!value) return "تتحدث تلقائيًا";

  try {
    return displayDateFormatter( {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "تتحدث تلقائيًا";
  }
}

function AnimatedNumber({
  value,
  suffix = "",
  duration = 900,
  maximumFractionDigits = 0,
}) {
  const [display, setDisplay] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const nextValue = Number(value) || 0;
    const startValue = previousValue.current;
    const difference = nextValue - startValue;

    let startTime = null;
    let frame = 0;

    const animate = (time) => {
      if (!startTime) startTime = time;

      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(startValue + difference * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        previousValue.current = nextValue;
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <>
      {new Intl.NumberFormat("ar-SA", {
        maximumFractionDigits,
      }).format(display)}
      {suffix}
    </>
  );
}

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)")
        .matches
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`landing-reveal ${
        visible ? "is-visible" : ""
      } ${className}`}
      style={{ "--reveal-delay": `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function TiltCard({ children, className = "" }) {
  const ref = useRef(null);

  const onMove = (event) => {
    if (
      window.matchMedia?.("(pointer: coarse)").matches ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)")
        .matches
    ) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    element.style.setProperty(
      "--tilt-x",
      `${(0.5 - y) * 5}deg`
    );
    element.style.setProperty(
      "--tilt-y",
      `${(x - 0.5) * 5}deg`
    );
    element.style.setProperty("--glow-x", `${x * 100}%`);
    element.style.setProperty("--glow-y", `${y * 100}%`);
  };

  const reset = () => {
    const element = ref.current;
    if (!element) return;
    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div
      ref={ref}
      className={`landing-tilt ${className}`}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {children}
    </div>
  );
}

function ProgressRing({ value, label, caption, size = 150 }) {
  const gradientId = useId().replace(/:/g, "");
  const safeValue = clampPercent(value);
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (safeValue / 100) * circumference;

  return (
    <div className="landing-progress-card">
      <div
        className="landing-progress-ring"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(15,76,69,0.08)"
            strokeWidth={stroke}
          />

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="landing-ring-value"
          />

          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#0F4C45" />
            </linearGradient>
          </defs>
        </svg>

        <div className="landing-ring-center">
          <strong>
            <AnimatedNumber
              value={safeValue}
              suffix="%"
              maximumFractionDigits={1}
            />
          </strong>
        </div>
      </div>

      <div className="landing-progress-copy">
        <strong>{label}</strong>
        <span>{caption}</span>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="landing-stats-grid" aria-label="جاري التحميل">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="landing-stat-card landing-skeleton-card"
        >
          <span className="landing-skeleton icon" />
          <span className="landing-skeleton value" />
          <span className="landing-skeleton label" />
          <span className="landing-skeleton note" />
        </div>
      ))}
    </div>
  );
}


const LANDING_FAQS = [
  {
    id: "about",
    question: "ما هو الصديق؟",
    aliases: [
      "ما هو الصديق",
      "ماهو الصديق",
      "وش الصديق",
      "ايش الصديق",
      "عرفني على الصديق",
      "عن المنصة",
      "عن النظام",
      "وش يسوي الصديق",
    ],
    concepts: ["الصديق", "منصه", "نظام"],
    answer:
      "الصِّديق منظومة لإدارة حلقات تحفيظ القرآن الكريم والعناية بمسيرة الطالب. تجمع إدارة المساجد والحلقات والطلاب والمعلمين مع الحضور والتسميع والخطط والاختبارات والتحفيز والتقارير في تجربة واحدة مترابطة.",
  },
  {
    id: "login",
    question: "كيف أسجل الدخول؟",
    aliases: [
      "كيف اسجل الدخول",
      "كيف ادخل",
      "طريقة الدخول",
      "وين تسجيل الدخول",
      "ابغى ادخل حسابي",
      "كيف افتح حسابي",
      "دخول المشرف",
      "دخول المعلم",
      "دخول المدير",
    ],
    concepts: ["دخول", "حساب"],
    answer:
      "اضغط «تسجيل الدخول» من أعلى الصفحة، ثم استخدم بيانات الحساب المخصصة لك. إذا كانت البيانات صحيحة ولا يزال الدخول لا يعمل، استخدم «التواصل مع فريق الإدارة» مع وصف المشكلة من غير إرسال كلمة المرور.",
  },
  {
    id: "student-login",
    question: "كيف يدخل الطالب؟",
    aliases: [
      "كيف يدخل الطالب",
      "طريقة دخول الطالب",
      "تسجيل دخول الطالب",
      "دخول طالب",
      "رقم الطالب",
      "بطاقة الطالب",
      "من وين الطالب يجيب بيانات الدخول",
      "كيف الطالب يدخل حسابه",
    ],
    concepts: ["طالب", "دخول"],
    answer:
      "يدخل الطالب بالبيانات المخصصة له في المنظومة، ويمكن الحصول على رقم الطالب وبياناته من بطاقة الطالب أو من إدارة الحلقة. إذا لم تعمل البيانات فلا ترسل كلمة المرور؛ أرسل المشكلة لفريق الإدارة.",
  },
  {
    id: "create-teacher",
    question: "كيف أنشئ حساب معلم؟",
    aliases: [
      "كيف انشئ حساب معلم",
      "كيف اسوي حساب معلم",
      "كيف اعمل حساب معلم",
      "كيف افتح حساب معلم",
      "كيف اضيف معلم",
      "طريقة اضافة معلم",
      "تسجيل معلم جديد",
      "انشاء مدرس",
      "اضافة مدرس",
      "سوي حساب مدرس",
      "اعمل حساب مدرس",
    ],
    concepts: ["انشاء", "حساب", "معلم"],
    answer:
      "حساب المعلم لا يُنشأ من الصفحة العامة. ينشئه المشرف أو الجهة المخوّلة من صفحة المعلمين داخل المنظومة، ثم تُربط بيانات المعلم بالحلقات التي يعمل عليها وتُسلَّم له بيانات الدخول.",
  },
  {
    id: "create-student",
    question: "كيف أنشئ حساب طالب؟",
    aliases: [
      "كيف انشئ حساب طالب",
      "كيف اسوي حساب طالب",
      "كيف اعمل حساب طالب",
      "كيف اضيف طالب",
      "طريقة اضافة طالب",
      "تسجيل طالب جديد",
      "سوي حساب للطالب",
      "اضافة طالب للحلقة",
    ],
    concepts: ["انشاء", "حساب", "طالب"],
    answer:
      "يُنشأ الطالب من داخل بوابة الجهة المخوّلة، ثم يُربط بحلقته وتظهر له بياناته ورقم الطالب. إنشاء حساب الطالب ليس تسجيلًا عامًا مفتوحًا من الصفحة الرئيسية.",
  },
  {
    id: "create-supervisor",
    question: "كيف أنشئ حساب مشرف؟",
    aliases: [
      "كيف انشئ حساب مشرف",
      "كيف اسوي حساب مشرف",
      "كيف اضيف مشرف",
      "تسجيل مشرف",
      "دعوة مشرف",
      "حساب مشرف جديد",
    ],
    concepts: ["انشاء", "حساب", "مشرف"],
    answer:
      "إنشاء المشرف يتم من خلال مدير النظام وبمسار صلاحيات مخصص. بعد إنشاء أو قبول الدعوة يُربط المشرف بالمساجد المحددة له، ولا يرى إلا نطاق إشرافه.",
  },
  {
    id: "add-mosque",
    question: "كيف أضيف مسجدًا؟",
    aliases: [
      "كيف اضيف مسجد",
      "اضافة مسجد",
      "انشاء مسجد",
      "سوي مسجد جديد",
      "ابغى اضيف مسجد",
      "طلب اضافة مسجد",
      "كيف اربط مسجد بالمشرف",
    ],
    concepts: ["انشاء", "مسجد"],
    answer:
      "إذا كنت مشرفًا، ترفع «طلب إضافة مسجد» من إدارة المساجد. يراجع مدير النظام الطلب، وعند الموافقة يُنشأ المسجد ويُربط بحساب المشرف تلقائيًا.",
  },
  {
    id: "join",
    question: "كيف تنضم جهة أو مسجد للصديق؟",
    aliases: [
      "كيف انضم",
      "كيف نسجل المسجد",
      "كيف نسجل الجمعية",
      "كيف اسجل جهتي",
      "ابي اشترك للمسجد",
      "ابغى اشترك",
      "انضمام مسجد",
      "انضمام جمعية",
      "تسجيل جهة",
      "تسجيل مسجد",
    ],
    concepts: ["انضمام", "مسجد", "جهه"],
    answer:
      "من خيار «التواصل مع فريق الإدارة» أرسل اسم الجهة أو المسجد، رقم واتساب صحيحًا، وما الذي تحتاجه. تصل الرسالة مباشرة إلى مركز تنبيهات مدير النظام ليتم التواصل معك.",
  },
  {
    id: "forgot-login",
    question: "نسيت بيانات الدخول، ماذا أفعل؟",
    aliases: [
      "نسيت بيانات الدخول",
      "نسيت كلمة المرور",
      "نسيت الباسورد",
      "نسيت الرقم",
      "الحساب ما يدخل",
      "ما اقدر ادخل",
      "الدخول ما يشتغل",
      "بيانات الدخول غلط",
      "مشكلة تسجيل الدخول",
    ],
    concepts: ["نسيان", "دخول"],
    answer:
      "أرسل لفريق الإدارة اسمك أو اسم الجهة ورقم واتساب ووصف المشكلة. لا ترسل كلمة المرور أو رمز التحقق داخل الرسالة.",
  },
  {
    id: "supervisor-role",
    question: "ماذا يستطيع المشرف أن يفعل؟",
    aliases: [
      "وش يقدر يسوي المشرف",
      "مميزات المشرف",
      "صلاحيات المشرف",
      "ماذا يقدم للمشرف",
      "ايش يسوي المشرف",
      "ادارة المشرف",
      "لوحة المشرف",
    ],
    concepts: ["مشرف", "صلاحيات"],
    answer:
      "المشرف يدير نطاق المساجد المرتبطة به، ويتابع الحلقات والمعلمين والطلاب والحضور والتسميع والاختبارات والتقارير والإنجاز، إضافة إلى الإشعارات والتواصل ومؤشرات الأداء.",
  },
  {
    id: "teacher-role",
    question: "ماذا يستطيع المعلم أن يفعل؟",
    aliases: [
      "وش يقدر يسوي المعلم",
      "مميزات المعلم",
      "صلاحيات المعلم",
      "ماذا يقدم للمعلم",
      "ايش يسوي المدرس",
      "لوحة المعلم",
      "ادوات المعلم",
    ],
    concepts: ["معلم", "صلاحيات"],
    answer:
      "المعلم يتابع طلاب حلقاته، ويسجل الحضور والتسميع، ويعمل على الخطط والإنجاز الشهري والاختبارات والنقاط والمكافآت والعناية بالطالب والتقارير المرتبطة بنطاقه.",
  },
  {
    id: "student-role",
    question: "ماذا يرى الطالب في حسابه؟",
    aliases: [
      "وش يشوف الطالب",
      "مميزات الطالب",
      "حساب الطالب",
      "لوحة الطالب",
      "ايش يظهر للطالب",
      "وش يقدر يسوي الطالب",
    ],
    concepts: ["طالب", "حساب"],
    answer:
      "حساب الطالب يركز على رحلته التعليمية: تقدمه، سجل التسميع، الحضور، الإنجاز، النتائج والتنبيهات والمعلومات التي تتيحها له الجهة داخل المنظومة.",
  },
  {
    id: "attendance",
    question: "كيف يعمل الحضور؟",
    aliases: [
      "كيف اسجل الحضور",
      "تسجيل الحضور",
      "الغياب",
      "التأخر",
      "الحضور والغياب",
      "ادارة الحضور",
      "كشف الحضور",
    ],
    concepts: ["حضور", "غياب"],
    answer:
      "يسجل المعلم أو الجهة المخوّلة حالة الطالب للحصة، مثل حاضر أو غائب أو متأخر أو بعذر، وتدخل البيانات في متابعة الطالب والتقارير والمؤشرات.",
  },
  {
    id: "recitation",
    question: "كيف يعمل التسميع؟",
    aliases: [
      "كيف اسجل التسميع",
      "تسجيل تسميع",
      "التسميع",
      "الحفظ والمراجعة",
      "سجل التسميع",
      "متابعة الحفظ",
      "متابعة المراجعة",
    ],
    concepts: ["تسميع", "حفظ", "مراجعه"],
    answer:
      "يوثق التسميع الحفظ والمراجعة للطالب، ويجعل تقدمه قابلًا للمتابعة بدل الاعتماد على الملاحظات المتفرقة. ويمكن ربطه بالخطط والإنجاز والتقارير.",
  },
  {
    id: "monthly-plan",
    question: "ما هي الخطة والإنجاز الشهري؟",
    aliases: [
      "الخطة الشهرية",
      "الانجاز الشهري",
      "الإنجاز الشهري",
      "هدف الحفظ الشهري",
      "هدف المراجعة الشهري",
      "خطة الطالب",
      "كيف اسوي خطة",
    ],
    concepts: ["خطه", "شهري"],
    answer:
      "تساعد الخطة الشهرية على تحديد أهداف الحفظ والمراجعة، ثم مقارنة المنجز فعليًا بالهدف. الهدف هو معرفة التقدم أو التأخر مبكرًا واتخاذ إجراء مناسب.",
  },
  {
    id: "exams",
    question: "هل يوجد نظام اختبارات؟",
    aliases: [
      "الاختبارات",
      "نظام الاختبارات",
      "كيف اسوي اختبار",
      "كيف انشئ اختبار",
      "نتائج الاختبار",
      "درجات الطلاب",
      "اختبار طالب",
    ],
    concepts: ["اختبار", "نتائج"],
    answer:
      "نعم. المنظومة تتضمن إدارة الاختبارات وربطها بالطلاب والحلقات والمختبرين، مع متابعة المحاولات والدرجات والنتائج ضمن الصلاحيات المتاحة.",
  },
  {
    id: "rewards",
    question: "كيف تعمل النقاط والمكافآت؟",
    aliases: [
      "النقاط",
      "المكافآت",
      "الجوائز",
      "تحفيز الطلاب",
      "كيف اعطي نقاط",
      "كيف اضيف مكافأة",
      "خصم النقاط",
    ],
    concepts: ["نقاط", "مكافات"],
    answer:
      "النقاط والمكافآت أداة تحفيز داخل المنظومة. يمكن استخدامها لتعزيز الإنجاز والسلوك الإيجابي وفق صلاحيات الجهة، مع سجل واضح للحركات والمكافآت.",
  },
  {
    id: "reports",
    question: "ما التقارير الموجودة؟",
    aliases: [
      "التقارير",
      "تقارير الطلاب",
      "تقرير الطالب",
      "تقارير الحضور",
      "تقارير التسميع",
      "اطبع تقرير",
      "تصدير التقرير",
      "pdf",
      "excel",
    ],
    concepts: ["تقارير", "تقرير"],
    answer:
      "مركز التقارير يجمع بيانات مثل الطلاب والحضور والتسميع والإنجاز والاختبارات حسب الصلاحيات والفلاتر المتاحة، مع خيارات عرض وطباعة أو تصدير في المواضع المدعومة.",
  },
  {
    id: "student-care",
    question: "ما هو مركز العناية بالطالب؟",
    aliases: [
      "العناية بالطالب",
      "مركز العناية",
      "طالب متعثر",
      "الطلاب المعرضين للخطر",
      "تنبيه الغياب",
      "طالب متأخر",
      "ضعف التسميع",
      "متابعة التعثر",
    ],
    concepts: ["عنايه", "طالب", "تنبيه"],
    answer:
      "مركز العناية يساعد على لفت الانتباه للحالات التي تحتاج متابعة، مثل تكرر الغياب أو التأخر عن الخطة أو ضعف النشاط، حتى يكون التدخل مبكرًا بدل انتظار تفاقم المشكلة.",
  },
  {
    id: "notifications",
    question: "هل يوجد نظام إشعارات وتواصل؟",
    aliases: [
      "الاشعارات",
      "الإشعارات",
      "التنبيهات",
      "الرسائل",
      "التواصل",
      "ارسال رسالة",
      "رسالة للمعلم",
      "رسالة للمشرف",
      "التواصل الداخلي",
    ],
    concepts: ["اشعارات", "رسائل", "تواصل"],
    answer:
      "نعم. يوجد مركز للإشعارات والتواصل ضمن الأدوار المدعومة، ويهدف إلى جمع التنبيهات والرسائل في مكان واحد بدل تشتتها خارج المنظومة.",
  },
  {
    id: "tv",
    question: "ما هي شاشة العرض التلفزيوني؟",
    aliases: [
      "شاشة التلفزيون",
      "العرض التلفزيوني",
      "شاشة العرض",
      "tv",
      "عرض الطلاب على الشاشة",
      "لوحة التلفزيون",
    ],
    concepts: ["تلفزيون", "عرض"],
    answer:
      "شاشة العرض مخصصة لعرض معلومات مختارة للحلقة بصورة مناسبة للشاشات الكبيرة، مثل لوحات التحفيز والنتائج التي تسمح بها إعدادات الجهة.",
  },
  {
    id: "mobile",
    question: "هل الصديق يعمل على الجوال؟",
    aliases: [
      "هل يعمل على الجوال",
      "يفتح بالجوال",
      "يدعم الجوال",
      "موبايل",
      "ايفون",
      "اندرويد",
      "تابلت",
      "كمبيوتر",
      "متوافق مع الجوال",
    ],
    concepts: ["جوال", "اجهزه"],
    answer:
      "نعم. الواجهات مصممة لتتكيف مع الجوال والتابلت والكمبيوتر، مع ترتيب العناصر بحسب مساحة الشاشة.",
  },
  {
    id: "privacy",
    question: "كيف تُحفظ الخصوصية والصلاحيات؟",
    aliases: [
      "الخصوصية",
      "الأمان",
      "امان البيانات",
      "صلاحيات المستخدمين",
      "مين يشوف البيانات",
      "هل البيانات آمنة",
      "حماية البيانات",
    ],
    concepts: ["خصوصيه", "امان", "صلاحيات"],
    answer:
      "الوصول للبيانات يعتمد على الدور ونطاق الارتباط داخل المنظومة؛ فالمشرف يعمل ضمن مساجده، والمعلم ضمن حلقاته، والصفحة العامة لا تعرض تفاصيل شخصية للطلاب.",
  },
  {
    id: "public-data",
    question: "هل بيانات الطلاب ظاهرة في الصفحة العامة؟",
    aliases: [
      "هل بيانات الطلاب ظاهرة",
      "هل الناس تشوف الطلاب",
      "بيانات الطالب في الموقع",
      "اسماء الطلاب للعامة",
      "هل الصفحة العامة تعرض بيانات",
    ],
    concepts: ["بيانات", "طلاب", "عامه"],
    answer:
      "لا. الصفحة العامة تعرض معلومات وإحصائيات مجمعة، ولا يُفترض أن تعرض بيانات شخصية تفصيلية للطلاب للزوار.",
  },
  {
    id: "multiple-mosques",
    question: "هل يستطيع المشرف إدارة أكثر من مسجد؟",
    aliases: [
      "اكثر من مسجد",
      "عدة مساجد",
      "مشرف على مسجدين",
      "ربط المشرف بمساجد",
      "هل المشرف يدير اكثر من مسجد",
    ],
    concepts: ["مشرف", "مساجد"],
    answer:
      "نعم، يمكن ربط المشرف بأكثر من مسجد بحسب صلاحيات مدير النظام، وتبقى بياناته وواجهاته محصورة في المساجد المرتبطة به.",
  },
  {
    id: "teacher-halaqat",
    question: "هل يمكن ربط المعلم بأكثر من حلقة؟",
    aliases: [
      "معلم اكثر من حلقة",
      "ربط المعلم بالحلقات",
      "المعلم له حلقتين",
      "عدة حلقات للمعلم",
      "اضافة معلم لحلقة",
    ],
    concepts: ["معلم", "حلقات", "ربط"],
    answer:
      "يمكن ربط المعلم بالحلقات المصرح بها وفق إعداد الجهة، وتُبنى صفحات المعلم على الحلقات المرتبطة بحسابه.",
  },
  {
    id: "student-halaqa",
    question: "كيف أربط الطالب بحلقة؟",
    aliases: [
      "ربط الطالب بحلقة",
      "اضافة الطالب للحلقة",
      "نقل الطالب للحلقة",
      "الطالب بدون حلقة",
      "اختيار حلقة الطالب",
    ],
    concepts: ["طالب", "حلقه", "ربط"],
    answer:
      "يتم ربط الطالب بالحَلقة من داخل الإدارة المصرح لها. هذا الربط هو الذي يحدد سياق متابعة الطالب في الحضور والتسميع والخطط وغيرها.",
  },
  {
    id: "parent-contact",
    question: "هل يمكن متابعة ولي الأمر؟",
    aliases: [
      "ولي الامر",
      "ولي أمر الطالب",
      "رقم ولي الامر",
      "التواصل مع ولي الامر",
      "رسالة لولي الامر",
      "واتساب ولي الامر",
    ],
    concepts: ["ولي", "امر", "تواصل"],
    answer:
      "تدعم بيانات الطالب معلومات ولي الأمر في المواضع المخصصة، ويمكن أن تساعد أدوات العناية والتواصل في تسهيل المتابعة عندما تكون بيانات الاتصال متوفرة للجهة المخوّلة.",
  },
  {
    id: "noorania",
    question: "هل يدعم الصديق النورانية؟",
    aliases: [
      "النورانية",
      "القاعدة النورانية",
      "نورانية",
      "طلاب النورانية",
      "متابعة النورانية",
    ],
    concepts: ["نورانيه"],
    answer:
      "توجد في المنظومة وظائف مرتبطة بمتابعة النورانية ضمن نطاق الحلقات والأدوار التي تستخدمها.",
  },
  {
    id: "pricing",
    question: "كم سعر الاشتراك؟",
    aliases: [
      "كم السعر",
      "كم الاشتراك",
      "سعر الصديق",
      "الاسعار",
      "الأسعار",
      "الباقات",
      "الباقة",
      "رسوم الاشتراك",
      "كم يكلف",
    ],
    concepts: ["سعر", "اشتراك", "باقات"],
    answer:
      "الأسعار والباقات قد تتغير حسب الخطة المعتمدة وقت التسجيل، لذلك الأفضل إرسال طلب لفريق الإدارة للحصول على السعر الحالي المناسب للجهة.",
  },
  {
    id: "payment",
    question: "كيف يتم الدفع أو التجديد؟",
    aliases: [
      "طريقة الدفع",
      "كيف ادفع",
      "التجديد",
      "تجديد الاشتراك",
      "الفاتورة",
      "الفواتير",
      "الدفع",
    ],
    concepts: ["دفع", "تجديد", "فاتوره"],
    answer:
      "تفاصيل الدفع والتجديد تعتمد على الباقات ووسائل الدفع المفعلة وقت الاشتراك. للحصول على المعلومة الحالية الدقيقة استخدم التواصل مع فريق الإدارة.",
  },
  {
    id: "support",
    question: "كيف أتواصل مع فريق الإدارة؟",
    aliases: [
      "كيف اتواصل",
      "ابي الدعم",
      "ابغى الدعم",
      "محتاج مساعدة",
      "عندي مشكلة",
      "فريق الادارة",
      "الدعم الفني",
      "رقم التواصل",
      "واتساب الدعم",
    ],
    concepts: ["دعم", "تواصل", "مساعده"],
    answer:
      "ارجع للشاشة الرئيسية للمساعد واختر «التواصل مع فريق الإدارة». أدخل رقم واتساب صحيحًا ورسالتك، وستصل مباشرة إلى مركز تنبيهات مدير النظام.",
  },
];

const LANDING_FAQ_SUGGESTIONS = [
  "كيف أسوي حساب معلم؟",
  "كيف يدخل الطالب؟",
  "كيف أضيف مسجدًا؟",
  "ما هو مركز العناية بالطالب؟",
  "هل يعمل على الجوال؟",
  "كم سعر الاشتراك؟",
];

const FAQ_SYNONYM_GROUPS = [
  ["انشاء", "انشئ", "انشا", "اسوي", "سوي", "اعمل", "عمل", "افتح", "فتح", "اضيف", "اضف", "اضافه"],
  ["معلم", "مدرس", "محفظ", "محفظ"],
  ["طالب", "دارس", "متعلم"],
  ["مشرف", "مشرفين"],
  ["مسجد", "جامع", "مساجد"],
  ["حلقه", "حلقات"],
  ["حساب", "يوزر", "مستخدم"],
  ["دخول", "لوقن", "login"],
  ["نسيان", "نسيت", "فاقد", "ضاعت"],
  ["كلمه", "باسورد", "password", "مرور"],
  ["واتساب", "واتس", "whatsapp"],
  ["تواصل", "اتواصل", "اكلم", "راسل", "اراسل", "رساله"],
  ["دعم", "مساعده", "ساعدني"],
  ["خصوصيه", "خصوصية", "حمايه", "حماية"],
  ["امان", "أمان", "امن", "آمن"],
  ["تقارير", "تقرير"],
  ["اختبار", "اختبارات", "امتحان", "امتحانات"],
  ["نتائج", "نتيجه", "درجات", "درجه"],
  ["مكافات", "مكافاه", "مكافآت", "جوائز", "جائزه"],
  ["نقاط", "نقط"],
  ["اشعارات", "إشعارات", "تنبيهات", "تنبيه"],
  ["تسميع", "تسميعه"],
  ["مراجعه", "مراجعة"],
  ["خطه", "خطة", "خطط"],
  ["شهري", "شهريه", "شهرية"],
  ["انجاز", "إنجاز"],
  ["عنايه", "عناية", "اهتمام"],
  ["جوال", "موبايل", "هاتف", "ايفون", "اندرويد"],
  ["اجهزه", "أجهزة", "جهاز"],
  ["تلفزيون", "tv", "شاشه", "شاشة"],
  ["سعر", "اسعار", "أسعار", "تكلفه", "تكلفة"],
  ["اشتراك", "اشترك", "الباقه", "الباقة", "باقات"],
  ["دفع", "اسدد", "سداد"],
  ["فاتوره", "فاتورة", "فواتير"],
  ["انضمام", "انضم", "التحاق"],
  ["جهه", "جهة", "جمعيه", "جمعية", "مؤسسه", "مؤسسة"],
  ["صلاحيات", "صلاحية", "صلاحياته", "يقدر"],
  ["ربط", "اربط", "مرتبط"],
  ["نورانيه", "نورانية", "النورانيه", "النورانية"],
];

const FAQ_STOP_WORDS = new Set([
  "كيف",
  "وش",
  "ايش",
  "ما",
  "ماذا",
  "هل",
  "هو",
  "هي",
  "في",
  "من",
  "على",
  "عن",
  "الى",
  "إلى",
  "ابي",
  "ابغى",
  "اريد",
  "ممكن",
  "لو",
  "لي",
  "لـ",
]);

function normalizeArabicText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FAQ_SYNONYM_LOOKUP = (() => {
  const lookup = new Map();

  for (const group of FAQ_SYNONYM_GROUPS) {
    const canonical = normalizeArabicText(group[0]);

    for (const word of group) {
      lookup.set(normalizeArabicText(word), canonical);
    }
  }

  return lookup;
})();

function semanticFaqTokens(value) {
  return normalizeArabicText(value)
    .split(" ")
    .filter(Boolean)
    .map((token) => FAQ_SYNONYM_LOOKUP.get(token) || token)
    .filter((token) => token.length > 1 && !FAQ_STOP_WORDS.has(token));
}

function semanticFaqText(value) {
  return semanticFaqTokens(value).join(" ");
}

function faqTokenSimilarity(queryTokens, candidateTokens) {
  if (!queryTokens.length || !candidateTokens.length) return 0;

  const querySet = new Set(queryTokens);
  const candidateSet = new Set(candidateTokens);

  let intersection = 0;
  for (const token of candidateSet) {
    if (querySet.has(token)) intersection += 1;
  }

  const recall = intersection / candidateSet.size;
  const precision = intersection / querySet.size;

  return recall * 0.68 + precision * 0.32;
}

function getLandingFaqAnswer(question) {
  const normalized = normalizeArabicText(question);
  const semantic = semanticFaqText(question);
  const queryTokens = semanticFaqTokens(question);

  if (!normalized || !queryTokens.length) return null;

  let best = null;
  let bestScore = 0;

  for (const item of LANDING_FAQS) {
    const candidates = [item.question, ...(item.aliases || [])];
    let itemScore = 0;

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeArabicText(candidate);
      const semanticCandidate = semanticFaqText(candidate);
      const candidateTokens = semanticFaqTokens(candidate);

      if (
        normalized === normalizedCandidate ||
        semantic === semanticCandidate
      ) {
        itemScore = Math.max(itemScore, 20);
        continue;
      }

      if (
        normalized.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalized)
      ) {
        itemScore = Math.max(itemScore, 13);
      }

      if (
        semantic &&
        semanticCandidate &&
        (semantic.includes(semanticCandidate) ||
          semanticCandidate.includes(semantic))
      ) {
        itemScore = Math.max(itemScore, 12);
      }

      const similarity = faqTokenSimilarity(
        queryTokens,
        candidateTokens
      );

      itemScore = Math.max(
        itemScore,
        similarity * 9
      );
    }

    const conceptTokens = semanticFaqTokens(
      (item.concepts || []).join(" ")
    );

    if (conceptTokens.length) {
      const querySet = new Set(queryTokens);
      const matchedConcepts = conceptTokens.filter((token) =>
        querySet.has(token)
      ).length;

      itemScore +=
        (matchedConcepts / conceptTokens.length) * 4.5;

      if (matchedConcepts === conceptTokens.length) {
        itemScore += 2.5;
      }
    }

    if (itemScore > bestScore) {
      best = item;
      bestScore = itemScore;
    }
  }

  return bestScore >= 5.2 ? best : null;
}


function AssistantRosette({ className = "" }) {
  return <Ornament name="04-madar" className={`landing-assistant-rosette ${className}`} motion duration={180} />;
}

function LandingAssistant() {
  const panelId = useId();
  const panelRef = useRef(null);
  const launcherRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState("home");
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState([
    {
      id: "welcome",
      role: "assistant",
      text:
        "حيّاك الله 🌿 أنا مساعد الصِّديق. أقدر أجاوبك فورًا عن المنصة وطريقة الدخول والانضمام، أو أوصل رسالتك مباشرة إلى فريق الإدارة.",
    },
  ]);

  const [contact, setContact] = useState({
    name: "",
    whatsapp: "",
    message: "",
  });
  const [contactError, setContactError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const launcher = launcherRef.current;
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector('.landing-assistant-close')?.focus();
    });
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(panelRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
      ) || []).filter((node) => node.getClientRects().length);
      const first = controls[0];
      const last = controls.at(-1);
      const outside = !panelRef.current?.contains(document.activeElement);
      if (outside || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      if (launcher?.isConnected) launcher.focus({ preventScroll: true });
    };
  }, [open]);

  function askFaq(text) {
    const clean = String(text || "").trim();
    if (!clean) return;

    const matched = getLandingFaqAnswer(clean);

    setConversation((current) => [
      ...current,
      {
        id: `q-${Date.now()}`,
        role: "user",
        text: clean,
      },
      {
        id: `a-${Date.now()}-${Math.random()}`,
        role: "assistant",
        text: matched
          ? matched.answer
          : "ما لقيت إجابة مطابقة بما يكفي حتى أضمن لك معلومة صحيحة. جرّب صياغة السؤال بكلمات أخرى مثل: إنشاء حساب معلم، دخول الطالب، إضافة مسجد، الحضور، التسميع، الاختبارات، التقارير، الإشعارات أو الاشتراك. وإذا كان السؤال خاصًا بحسابك تقدر تراسل فريق الإدارة.",
        canContact: !matched,
      },
    ]);

    setQuestion("");
  }

  async function sendContact(event) {
    event.preventDefault();
    setContactError("");

    const whatsapp = contact.whatsapp.trim();
    const message = contact.message.trim();

    if (!whatsapp) {
      setContactError("رقم الواتساب مطلوب حتى يستطيع فريق الإدارة التواصل معك.");
      return;
    }

    if (!message || message.length < 10) {
      setContactError("اكتب تفاصيل الرسالة بشكل أوضح، على الأقل 10 أحرف.");
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "public-support",
        {
          body: {
            name: contact.name.trim() || null,
            whatsapp,
            message,
            page_path: window.location.pathname || "/",
          },
        }
      );

      if (error) throw new Error(await functionErrorMessage(error, "تعذر إرسال الرسالة الآن."));
      if (!data?.ok) throw new Error(data?.message || "تعذر إرسال الرسالة.");

      setSent(true);
      setContact({
        name: "",
        whatsapp: "",
        message: "",
      });
    } catch (error) {
      const messageText = String(error?.message || error || "");

      if (messageText.includes("INVALID_WHATSAPP")) {
        setContactError("تأكد من رقم الواتساب وأدخله بصيغة صحيحة.");
      } else if (messageText.includes("SUPPORT_RATE_LIMIT")) {
        setContactError("وصلتنا رسالة منك قبل قليل. انتظر دقيقة ثم حاول مرة أخرى.");
      } else if (messageText.includes("محاولات كثيرة") || messageText.includes("وصلتنا رسالتك")) {
        setContactError(messageText);
      } else if (messageText.includes("MESSAGE_TOO_SHORT")) {
        setContactError("اكتب تفاصيل أكثر حتى يستطيع الفريق خدمتك بشكل أفضل.");
      } else {
        console.error("Support request failed:", error);
        setContactError("تعذر إرسال الرسالة الآن. حاول مرة أخرى بعد قليل.");
      }
    } finally {
      setSending(false);
    }
  }

  function resetHome() {
    setScreen("home");
    setSent(false);
    setContactError("");
  }

  return createPortal(
    <div className={`landing-assistant ${open ? "is-open" : ""}`}>
      {open && (
        <button
          type="button"
          className="landing-assistant-backdrop"
          aria-label="إغلاق المساعد"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="landing-assistant-launch-wrap">
        <button
          ref={launcherRef}
          type="button"
          className="landing-assistant-launch"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "إغلاق المساعد" : "الأسئلة الشائعة والتواصل مع الإدارة"}
          title={open ? "إغلاق المساعد" : "مساعد الصِّدّيق"}
        >
          <span className="landing-assistant-launch-symbol" aria-hidden="true">
            {open ? <X size={24} /> : <MessageCircle size={28} strokeWidth={1.65} />}
          </span>
        </button>
      </div>

      <section
        ref={panelRef}
        id={panelId}
        className="landing-assistant-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${panelId}-title`}
        aria-hidden={!open}
        inert={!open}
      >
        <header className="landing-assistant-head">
          <div className="landing-assistant-head-ornament">
            <AssistantRosette />
          </div>

          <div className="landing-assistant-head-top">
            {screen !== "home" ? (
              <button
                type="button"
                className="landing-assistant-back"
                onClick={resetHome}
                aria-label="العودة"
              >
                <ArrowLeft size={17} />
              </button>
            ) : (
              <span className="landing-assistant-live">
                <BookOpen size={15} />
                مساعد الصِّدّيق
              </span>
            )}

            <button
              type="button"
              className="landing-assistant-close"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          <div className="landing-assistant-emblem">
            <img src="/icon-512.png" alt="" aria-hidden="true" />
          </div>

          <h2 id={`${panelId}-title`}>
            {screen === "home" && "حيّاك الله، كيف نخدمك؟"}
            {screen === "faq" && "اسأل مساعد الصِّديق"}
            {screen === "contact" && "تواصل مع فريق الإدارة"}
          </h2>

          <p>
            {screen === "home" &&
              "إجابة لسؤالك، أو رسالة لفريقنا. نحن أقرب إليك."}
            {screen === "faq" &&
              "إجابات واضحة عن المنصة والدخول والانضمام. اختر سؤالًا أو اكتب استفسارك."}
            {screen === "contact" &&
              "شاركنا استفسارك أو ملاحظتك، وسنوصلها إلى فريق الإدارة."}
          </p>
        </header>

        {screen === "home" && (
          <div className="landing-assistant-home">
            <button
              type="button"
              className="landing-assistant-choice is-support"
              onClick={() => setScreen("contact")}
            >
              <span className="landing-assistant-choice-icon">
                <Headphones size={21} />
              </span>

              <span className="landing-assistant-choice-copy">
                <strong>التواصل مع فريق الإدارة</strong>
                <small>
                  أرسل استفسارك أو ملاحظتك إلى فريقنا.
                </small>
              </span>

              <ArrowLeft size={18} />
            </button>

            <button
              type="button"
              className="landing-assistant-choice"
              onClick={() => setScreen("faq")}
            >
              <span className="landing-assistant-choice-icon">
                <BookOpen size={21} />
              </span>

              <span className="landing-assistant-choice-copy">
                <strong>الأسئلة الشائعة</strong>
                <small>
                  كل ما تحتاج معرفته عن الدخول واستخدام المنصة.
                </small>
              </span>

              <ArrowLeft size={18} />
            </button>

            <div className="landing-assistant-home-note">
              <ShieldCheck size={16} />
              <span>
                لن يطلب منك المساعد كلمة المرور أو أي بيانات دخول حساسة.
              </span>
            </div>
          </div>
        )}

        {screen === "faq" && (
          <div className="landing-assistant-faq">
            <div className="landing-assistant-chat">
              {conversation.slice(-6).map((message) => (
                <div
                  key={message.id}
                  className={`landing-assistant-bubble is-${message.role}`}
                >
                  {message.role === "assistant" && (
                    <span className="landing-assistant-mini-avatar">
                      <Sparkles size={13} />
                    </span>
                  )}

                  <div>
                    <p>{message.text}</p>

                    {message.canContact && (
                      <button
                        type="button"
                        onClick={() => setScreen("contact")}
                      >
                        تواصل مع فريق الإدارة
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="landing-assistant-suggestions">
              {LANDING_FAQ_SUGGESTIONS.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => askFaq(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form
              className="landing-assistant-question-form"
              onSubmit={(event) => {
                event.preventDefault();
                askFaq(question);
              }}
            >
              <input
                aria-label="سؤالك عن الصديق"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="اكتب سؤالك هنا…"
                maxLength={220}
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={!question.trim()}
                aria-label="إرسال السؤال"
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        )}

        {screen === "contact" && (
          <div className="landing-assistant-contact">
            {sent ? (
              <div className="landing-assistant-success">
                <span>
                  <CheckCircle2 size={27} />
                </span>
                <h3>وصلت رسالتك بنجاح</h3>
                <p>
                  أرسلناها إلى مركز تنبيهات مدير النظام، ويمكن لفريق
                  الإدارة التواصل معك عبر رقم الواتساب الذي أدخلته.
                </p>
                <button type="button" onClick={resetHome}>
                  العودة للمساعد
                </button>
              </div>
            ) : (
              <form onSubmit={sendContact}>
                <label className="landing-assistant-field">
                  <span>الاسم <small>اختياري</small></span>
                  <input
                    value={contact.name}
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    maxLength={120}
                    placeholder="اكتب اسمك أو اسم الجهة"
                    autoComplete="name"
                  />
                </label>

                <label className="landing-assistant-field">
                  <span>
                    رقم الواتساب <b>*</b>
                  </span>
                  <input
                    value={contact.whatsapp}
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        whatsapp: event.target.value,
                      }))
                    }
                    required
                    inputMode="tel"
                    dir="ltr"
                    maxLength={24}
                    placeholder="05xxxxxxxx أو 9665xxxxxxxx"
                    autoComplete="tel"
                  />
                </label>

                <label className="landing-assistant-field">
                  <span>
                    رسالتك <b>*</b>
                  </span>
                  <textarea
                    value={contact.message}
                    onChange={(event) =>
                      setContact((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                    required
                    maxLength={3000}
                    rows={5}
                    placeholder="اكتب استفسارك أو طلبك بالتفصيل…"
                  />
                  <small>{contact.message.length} / 3000</small>
                </label>

                {contactError && (
                  <div className="landing-assistant-error">
                    {contactError}
                  </div>
                )}

                <button
                  type="submit"
                  className="landing-assistant-submit"
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2
                      size={17}
                      className="landing-assistant-spin"
                    />
                  ) : (
                    <Send size={17} />
                  )}
                  {sending ? "جارٍ إرسال الرسالة…" : "إرسال لفريق الإدارة"}
                </button>

                <div className="landing-assistant-privacy">
                  <ShieldCheck size={14} />
                  <span>
                    رقم الواتساب مطلوب للمتابعة فقط. لا ترسل كلمات المرور
                    أو رموز التحقق.
                  </span>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </div>,
    document.body
  );
}


export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);

  const [mosqueId, setMosqueId] = useState("all");
  const [mosques, setMosques] = useState([]);
  const [allStats, setAllStats] = useState(EMPTY_STATS);
  const [selectedMosque, setSelectedMosque] =
    useState(EMPTY_STATS);
  const [insights, setInsights] = useState(EMPTY_INSIGHTS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activePeriod, setActivePeriod] = useState("all");
  const [wisdomIndex, setWisdomIndex] = useState(0);

  const activityScore = useMemo(() => {
    if (!selectedMosque.students) return 0;

    return clampPercent(
      (selectedMosque.weeklyRecitations /
        Math.max(selectedMosque.students, 1)) *
        100
    );
  }, [
    selectedMosque.weeklyRecitations,
    selectedMosque.students,
  ]);

  const healthLabel = useMemo(() => {
    if (selectedMosque.health >= 90) return "أداء ممتاز";
    if (selectedMosque.health >= 80) return "أداء جيد جدًا";
    if (selectedMosque.health >= 65) return "أداء جيد";
    if (selectedMosque.health >= 45) return "يحتاج تحسين";
    return "يحتاج متابعة";
  }, [selectedMosque.health]);

  const activeWisdom =
    HERO_WISDOM[wisdomIndex % HERO_WISDOM.length];
  const ActiveWisdomIcon = activeWisdom.icon;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWisdomIndex(
        (current) =>
          (current + 1) % HERO_WISDOM.length
      );
    }, 7000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const statCards = [
    {
      icon: Landmark,
      label: "الحلقات",
      value: selectedMosque.halaqat,
      note: "حلقة نشطة",
    },
    {
      icon: GraduationCap,
      label: "المعلمون",
      value: selectedMosque.teachers,
      note: "ضمن نطاق العرض",
    },
    {
      icon: Users,
      label: "الطلاب",
      value: selectedMosque.students,
      note: "طالب حالي",
    },
    {
      icon: BookOpen,
      label: "التسميعات",
      value: selectedMosque.recitations,
      note: "هذا الشهر",
    },
    {
      icon: Trophy,
      label: "نقاط الطلاب",
      value: selectedMosque.points,
      note: "رصيد تحفيزي",
    },
  ];

  const directoryItems = useMemo(
    () => [
      {
        id: "all",
        name: "جميع المساجد",
        address: "",
      },
      ...mosques.map((mosque) => ({
        id: String(mosque.id),
        name: mosque.name,
        address: mosque.address || "",
      })),
    ],
    [mosques]
  );

  async function loadInsights(nextMosqueId) {
    try {
      const rpcMosqueId =
        nextMosqueId === "all" ? null : Number(nextMosqueId);

      const { data, error } = await publicRpcWithSessionRetry("get_public_mosque_insights",
        {
          p_mosque_id: rpcMosqueId,
        }
      );

      if (error) {
        console.info(
          "Optional public insights are not installed yet:",
          error.message
        );
        setInsights(EMPTY_INSIGHTS);
        return;
      }

      const row = Array.isArray(data) ? data[0] : null;
      setInsights(normalizeInsights(row));
    } catch (error) {
      console.info("Optional public insights failed:", error);
      setInsights(EMPTY_INSIGHTS);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setStatsLoading(true);
      setStatsError("");

      try {
        const statsResult = await publicRpcWithSessionRetry("get_public_mosque_stats",
          { p_mosque_id: null }
        );

        if (statsResult.error) throw statsResult.error;

        let directoryRows = [];

        const directoryResult = await publicRpcWithSessionRetry("get_public_mosque_directory"
        );

        if (!directoryResult.error) {
          directoryRows = Array.isArray(directoryResult.data)
            ? directoryResult.data
            : [];
        } else {
          const legacyResult = await publicRpcWithSessionRetry("get_public_mosques"
          );

          if (legacyResult.error) throw legacyResult.error;

          directoryRows = Array.isArray(legacyResult.data)
            ? legacyResult.data
            : [];
        }

        if (cancelled) return;

        const row = Array.isArray(statsResult.data)
          ? statsResult.data[0]
          : null;
        const normalized = normalizeStats(row);

        setMosques(directoryRows);
        setAllStats(normalized);
        setSelectedMosque(normalized);
        setLastRefresh(new Date());

        await loadInsights("all");
      } catch (error) {
        console.error("Public landing load failed:", error);

        if (!cancelled) {
          setStatsError("تعذر تحميل الإحصائيات حاليًا");
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const element = heroRef.current;
    if (!element) return;

    const onMove = (event) => {
      if (
        window.matchMedia?.("(pointer: coarse)").matches ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)")
          .matches
      ) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      element.style.setProperty("--hero-x", `${x}%`);
      element.style.setProperty("--hero-y", `${y}%`);
    };

    element.addEventListener("mousemove", onMove);
    return () => element.removeEventListener("mousemove", onMove);
  }, []);

  async function changeMosque(nextMosqueId) {
    setMosqueId(nextMosqueId);
    setActivePeriod("all");
    setStatsError("");
    setStatsLoading(true);

    try {
      const rpcMosqueId =
        nextMosqueId === "all" ? null : Number(nextMosqueId);

      const { data, error } = await publicRpcWithSessionRetry("get_public_mosque_stats",
        {
          p_mosque_id: rpcMosqueId,
        }
      );

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : null;
      const normalized = normalizeStats(row);

      setSelectedMosque(normalized);

      if (nextMosqueId === "all") {
        setAllStats(normalized);
      }

      await loadInsights(nextMosqueId);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Mosque stats load failed:", error);
      setStatsError("تعذر تحديث إحصائيات المسجد");
    } finally {
      setStatsLoading(false);
    }
  }

  async function refreshSelectedMosque() {
    await changeMosque(mosqueId);
  }

  return (
    <div className="landing-page">
      <div className="landing-intro">
      <OrnamentScene variant="landing" palette="emerald" primary="03-falak" />
      {/* HERO */}
      <section
        id="home"
        className="landing-hero"
        ref={heroRef}
      >
        <div className="landing-container landing-hero-grid">
          <Reveal>
            <div className="landing-hero-copy">
              <div className="landing-hero-badge">
                <MoonStar />
                منصة لإدارة الحلقات وصناعة الأثر
              </div>

              <h1>
                الصِّديق
                <span>
                  إدارة للحلقة، وعناية بمسيرة الطالب
                </span>
              </h1>

              <p className="landing-hero-description">
                منصة متكاملة تساعد الإدارة والمشرف والمعلم
                على متابعة الطالب من الحضور والتسميع والخطط
                التعليمية إلى الإنجاز والتحفيز والعناية المبكرة.
              </p>


              <div className="landing-wisdom-panel" aria-label="آيات وأحاديث موثقة">
                <article
                  key={activeWisdom.reference}
                  className={`landing-wisdom-card landing-wisdom-rotating ${activeWisdom.type}`}
                >
                  <div className="landing-wisdom-corner" aria-hidden="true" />

                  <div className="landing-wisdom-head">
                    <div className="landing-wisdom-badge">
                      <ActiveWisdomIcon size={14} />
                      <span>{activeWisdom.badge}</span>
                    </div>

                    <span className="landing-wisdom-source-label">
                      المرجع موضح أسفل النص
                    </span>
                  </div>

                  <p className="landing-wisdom-text">
                    {activeWisdom.text}
                  </p>

                  <div className="landing-wisdom-footer">
                    <span className="landing-wisdom-reference">
                      {activeWisdom.reference}
                    </span>

                    <div className="landing-wisdom-dots" aria-label="التنقل بين النصوص">
                      {HERO_WISDOM.map((item, index) => (
                        <button
                          key={item.reference}
                          type="button"
                          className={index === wisdomIndex ? "active" : ""}
                          aria-label={`عرض النص ${index + 1}`}
                          onClick={() => setWisdomIndex(index)}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              </div>

              <div className="landing-trust-row">
                <span className="landing-trust-item">
                  <ShieldCheck />
                  مؤشرات عامة بلا بيانات شخصية
                </span>

                <span className="landing-trust-item">
                  <Activity />
                  إحصائيات متجددة
                </span>

                <span className="landing-trust-item">
                  <Eye />
                  رؤية موحدة للأثر
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={110}>
            <div className="landing-hero-visual">
              <div className="landing-orbit">
                <span className="landing-orbit-dot" />

                <TiltCard className="landing-brand-core">
                  <img
                    src="/icon-512.png"
                    alt="شعار الصديق"
                  />
                </TiltCard>

                <div className="landing-floating-card one">
                  <strong>
                    <AnimatedNumber value={allStats.students} />
                  </strong>
                  <span>طالب في المنظومة</span>
                </div>

                <div className="landing-floating-card two">
                  <strong>
                    <AnimatedNumber
                      value={allStats.attendance}
                      suffix="%"
                      maximumFractionDigits={1}
                    />
                  </strong>
                  <span>متوسط الحضور</span>
                </div>

                <div className="landing-floating-card three">
                  <strong>
                    <AnimatedNumber value={allStats.recitations} />
                  </strong>
                  <span>تسميعة هذا الشهر</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* GLOBAL STATS */}
      <div className="landing-global-stats">
        <div className="landing-container">
          <Reveal>
            <div className="landing-global-stats-grid">
              <div className="landing-global-stat">
                <strong>
                  <AnimatedNumber value={allStats.halaqat} />
                </strong>
                <span>حلقة نشطة</span>
              </div>

              <div className="landing-global-stat">
                <strong>
                  <AnimatedNumber value={allStats.teachers} />
                </strong>
                <span>معلمًا</span>
              </div>

              <div className="landing-global-stat">
                <strong>
                  <AnimatedNumber value={allStats.students} />
                </strong>
                <span>طالبًا حاليًا</span>
              </div>

              <div className="landing-global-stat">
                <strong>
                  <AnimatedNumber
                    value={allStats.attendance}
                    suffix="%"
                    maximumFractionDigits={1}
                  />
                </strong>
                <span>متوسط الحضور</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      </div>

      {/* MOSQUE EXPLORER */}
      <section id="stats" className="landing-section">
        <div className="landing-container">
          <Reveal>
            <div className="landing-section-header">
              <div className="landing-eyebrow">
                <BarChart3 />
                مستكشف الأثر
              </div>

              <h2>اختر مسجدًا… وشاهد نبض حلقاته</h2>

              <p>
                إحصائيات عامة ومجمعة تساعد الزائر على رؤية
                النشاط والإنجاز والحضور والتحفيز دون كشف أي
                بيانات شخصية.
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="landing-explorer-shell">
              <div className="landing-explorer-top">
                <div className="landing-explorer-title">
                  <strong>{selectedMosque.name}</strong>
                  <span>{selectedMosque.subtitle}</span>

                  {statsLoading && (
                    <div className="landing-status-line loading">
                      <span className="landing-status-dot" />
                      جاري تحديث الإحصائيات…
                    </div>
                  )}

                  {statsError && (
                    <div className="landing-status-line error">
                      <span className="landing-status-dot" />
                      {statsError}
                    </div>
                  )}
                </div>

                <div className="landing-explorer-actions">
                  <button
                    type="button"
                    className={`landing-refresh-button ${
                      statsLoading ? "is-loading" : ""
                    }`}
                    onClick={refreshSelectedMosque}
                    disabled={statsLoading}
                    title="تحديث الإحصائيات"
                    aria-label="تحديث الإحصائيات"
                  >
                    <RefreshCw size={18} />
                  </button>

                  <div className="landing-mosque-select">
                    <select
                      value={mosqueId}
                      onChange={(event) =>
                        changeMosque(event.target.value)
                      }
                      disabled={statsLoading}
                      aria-label="اختيار المسجد"
                    >
                      <option value="all">جميع المساجد</option>

                      {mosques.map((mosque) => (
                        <option
                          key={mosque.id}
                          value={String(mosque.id)}
                        >
                          {mosque.name}
                        </option>
                      ))}
                    </select>

                    <ChevronDown />
                  </div>
                </div>
              </div>

              <div className="landing-mosque-chips">
                {directoryItems.map((mosque) => (
                  <button
                    key={mosque.id}
                    type="button"
                    className={`landing-mosque-chip ${
                      mosqueId === mosque.id ? "is-active" : ""
                    }`}
                    onClick={() => changeMosque(mosque.id)}
                    disabled={statsLoading}
                  >
                    <Landmark />
                    {mosque.name}
                  </button>
                ))}
              </div>

              <div className="landing-location-line">
                {mosqueId === "all" ? (
                  <>
                    <Activity />
                    آخر تحديث: {" "}
                    {formatUpdatedAt(
                      selectedMosque.generatedAt || lastRefresh
                    )}
                  </>
                ) : (
                  <>
                    <MapPin />
                    {insights.address ||
                      mosques.find(
                        (mosque) =>
                          String(mosque.id) === mosqueId
                      )?.address ||
                      "إحصائيات المسجد المختار"}
                  </>
                )}
              </div>

              {statsLoading ? (
                <StatsSkeleton />
              ) : (
                <div className="landing-stats-grid">
                  {statCards.map(
                    ({ icon: Icon, label, value, note }) => (
                      <TiltCard
                        className="landing-stat-card"
                        key={label}
                      >
                        <div className="landing-stat-icon">
                          <Icon />
                        </div>

                        <strong>
                          <AnimatedNumber value={value} />
                        </strong>

                        <span className="label">{label}</span>
                        <span className="note">{note}</span>
                      </TiltCard>
                    )
                  )}
                </div>
              )}

              <div className="landing-insight-grid">
                <div className="landing-progress-panel">
                  <ProgressRing
                    value={selectedMosque.attendance}
                    label="نسبة الحضور"
                    caption="انتظام الحضور خلال الشهر الحالي."
                  />

                  <ProgressRing
                    value={selectedMosque.achievement}
                    label="الإنجاز الشهري"
                    caption="مدى تحقيق المستهدفات الشهرية المعتمدة."
                  />
                </div>

                <div className="landing-health-panel">
                  <div className="landing-health-kicker">
                    <Gauge />
                    مؤشر صحة الحلقات
                  </div>

                  <div className="landing-health-score">
                    <strong>
                      <AnimatedNumber
                        value={selectedMosque.health}
                        maximumFractionDigits={1}
                      />
                    </strong>
                    <span>/ 100</span>
                  </div>

                  <div className="landing-health-status">
                    {healthLabel}
                  </div>

                  <div className="landing-health-bar">
                    <span
                      style={{
                        width: `${selectedMosque.health}%`,
                      }}
                    />
                  </div>

                  <div className="landing-health-note">
                    مؤشر مركب يجمع الحضور والإنجاز ونشاط
                    التسميع الأسبوعي ليعطي قراءة سريعة عن
                    حيوية الحلقات.
                  </div>
                </div>
              </div>

              <div className="landing-halaqa-insights">
                <div className="landing-capacity-card">
                  <div className="landing-card-head">
                    <div className="landing-card-title">
                      <div className="landing-card-title-icon">
                        <UsersRound />
                      </div>

                      <div>
                        <strong>إشغال الحلقات</strong>
                        <span>
                          الطلاب الحاليون مقابل الطاقة الاستيعابية
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="landing-capacity-score">
                    <strong>
                      <AnimatedNumber
                        value={insights.occupancyRate}
                        suffix="%"
                        maximumFractionDigits={1}
                      />
                    </strong>
                    <span>نسبة الإشغال</span>
                  </div>

                  <div className="landing-capacity-track">
                    <span
                      style={{
                        width: `${insights.occupancyRate}%`,
                      }}
                    />
                  </div>

                  <div className="landing-capacity-meta">
                    <div className="landing-mini-metric">
                      <strong>
                        <AnimatedNumber
                          value={insights.currentStudents}
                        />
                      </strong>
                      <span>طلاب حاليون</span>
                    </div>

                    <div className="landing-mini-metric">
                      <strong>
                        <AnimatedNumber
                          value={insights.totalCapacity}
                        />
                      </strong>
                      <span>إجمالي السعة</span>
                    </div>

                    <div className="landing-mini-metric">
                      <strong>
                        <AnimatedNumber
                          value={insights.activeHalaqat}
                        />
                      </strong>
                      <span>حلقات نشطة</span>
                    </div>
                  </div>
                </div>

                <div className="landing-periods-card">
                  <div className="landing-card-head">
                    <div className="landing-card-title">
                      <div className="landing-card-title-icon">
                        <Clock3 />
                      </div>

                      <div>
                        <strong>أوقات الحلقات</strong>
                        <span>
                          توزيع الحلقات النشطة حسب الفترة
                        </span>
                      </div>
                    </div>

                    <div className="landing-card-title-icon">
                      <Layers3 />
                    </div>
                  </div>

                  {PERIODS.some(
                    (period) => insights.periods[period.key] > 0
                  ) ? (
                    <div className="landing-periods-list">
                      {PERIODS.map((period) => {
                        const count =
                          insights.periods[period.key] || 0;
                        const maxPeriod = Math.max(
                          1,
                          ...PERIODS.map(
                            (item) =>
                              insights.periods[item.key] || 0
                          )
                        );
                        const width = (count / maxPeriod) * 100;
                        const Icon = period.icon;

                        return (
                          <div
                            key={period.key}
                            className={`landing-period-row ${
                              activePeriod === period.key
                                ? "is-active"
                                : ""
                            }`}
                            onClick={() =>
                              setActivePeriod(
                                activePeriod === period.key
                                  ? "all"
                                  : period.key
                              )
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (
                                event.key === "Enter" ||
                                event.key === " "
                              ) {
                                setActivePeriod(
                                  activePeriod === period.key
                                    ? "all"
                                    : period.key
                                );
                              }
                            }}
                          >
                            <div className="landing-period-name">
                              <Icon />
                              {period.label}
                            </div>

                            <div className="landing-period-track">
                              <span
                                style={{ width: `${width}%` }}
                              />
                            </div>

                            <div className="landing-period-count">
                              {count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="landing-period-empty">
                      لا تتوفر بيانات كافية لعرض توزيع الحلقات حاليًا.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* LIVE PULSE */}
      <section className="landing-section">
        <div className="landing-container">
          <Reveal>
            <div className="landing-pulse-shell">
              <div className="landing-pulse-head">
                <div className="landing-pulse-title">
                  <span className="landing-pulse-dot" />
                  <strong>نبض الصديق</strong>
                </div>

                <span>
                  مؤشرات للفترة الحالية • {" "}
                  {formatUpdatedAt(
                    selectedMosque.generatedAt || lastRefresh
                  )}
                </span>
              </div>

              <div className="landing-pulse-grid">
                <div className="landing-pulse-card">
                  <strong>
                    <AnimatedNumber
                      value={selectedMosque.activeToday}
                    />
                  </strong>
                  <span>حلقة لديها نشاط اليوم</span>
                </div>

                <div className="landing-pulse-card">
                  <strong>
                    <AnimatedNumber
                      value={selectedMosque.studentsToday}
                    />
                  </strong>
                  <span>طالبًا تمت متابعتهم اليوم</span>
                </div>

                <div className="landing-pulse-card">
                  <strong>
                    <AnimatedNumber
                      value={selectedMosque.weeklyRecitations}
                    />
                  </strong>
                  <span>تسميعة خلال آخر 7 أيام</span>
                </div>

                <div className="landing-pulse-card">
                  <strong>
                    <AnimatedNumber
                      value={activityScore}
                      suffix="%"
                      maximumFractionDigits={1}
                    />
                  </strong>
                  <span>كثافة التسميع الأسبوعية</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* WHY SADIQ */}
      <section id="why-sadiq" className="landing-section">
        <div className="landing-container">
          <Reveal>
            <div className="landing-section-header">
              <div className="landing-eyebrow">
                <Sparkles />
                لماذا الصديق؟
              </div>

              <h2>أكثر من برنامج إدارة</h2>

              <p>
                الصديق لا يتعامل مع الحلقة كمجموعة سجلات، بل
                كمنظومة تعليمية هدفها نجاح الطالب واستمراره
                وتطوره.
              </p>
            </div>
          </Reveal>

          <div className="landing-why-grid">
            {WHY_SADIQ.map(
              ({ icon: Icon, title, text }, index) => (
                <Reveal key={title} delay={index * 70}>
                  <TiltCard className="landing-why-card">
                    <div className="landing-why-icon">
                      <Icon />
                    </div>

                    <h3>{title}</h3>
                    <p>{text}</p>
                  </TiltCard>
                </Reveal>
              )
            )}
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section id="journey" className="landing-section">
        <div className="landing-container">
          <Reveal>
            <div className="landing-section-header">
              <div className="landing-eyebrow">
                <Network />
                رحلة الطالب
              </div>

              <h2>من التسجيل إلى الإنجاز</h2>

              <p>
                نربط مراحل رحلة الطالب ببعضها، حتى تكون
                المتابعة عملية مستمرة وليست أحداثًا منفصلة.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="landing-journey-shell">
              <div className="landing-journey-line" />

              <div className="landing-journey-grid">
                {JOURNEY.map((item) => (
                  <article
                    key={item.number}
                    className="landing-journey-item"
                  >
                    <div className="landing-journey-number">
                      {item.number}
                    </div>

                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <Reveal>
            <div className="landing-section-header">
              <div className="landing-eyebrow">
                <NotebookTabs />
                المنصة
              </div>

              <h2>كل ما تحتاجه الحلقة في مكان واحد</h2>

              <p>
                أدوات عملية تم تصميمها لتساعد الإدارة والمشرف
                والمعلم على التركيز على جودة العملية التعليمية.
              </p>
            </div>
          </Reveal>

          <div className="landing-features-grid">
            {FEATURES.map(
              ({ icon: Icon, title, description }, index) => (
                <Reveal key={title} delay={(index % 4) * 60}>
                  <TiltCard className="landing-feature-card">
                    <div className="landing-feature-icon">
                      <Icon />
                    </div>

                    <h3>{title}</h3>
                    <p>{description}</p>
                  </TiltCard>
                </Reveal>
              )
            )}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="landing-section">
        <div className="landing-container">
          <Reveal>
            <div className="landing-section-header">
              <div className="landing-eyebrow">
                <UsersRound />
                لكل دور رؤيته
              </div>

              <h2>تجربة مصممة حسب المسؤولية</h2>

              <p>
                كل مستخدم يحصل على الأدوات والمعلومات التي
                يحتاجها دون ازدحام أو تشتيت.
              </p>
            </div>
          </Reveal>

          <div className="landing-roles-grid">
            {ROLES.map(
              ({ icon: Icon, title, text }, index) => (
                <Reveal key={title} delay={index * 65}>
                  <TiltCard className="landing-role-card">
                    <Icon />
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </TiltCard>
                </Reveal>
              )
            )}
          </div>
        </div>
      </section>

      {/* STUDENT CARE */}
      <section className="landing-section">
        <div className="landing-container">
          <Reveal>
            <div className="landing-care-shell">
              <div className="landing-care-copy">
                <div className="landing-eyebrow">
                  <HeartHandshake />
                  العناية بالطالب
                </div>

                <h2>
                  لا ننتظر حتى يصبح التعثر مشكلة كبيرة
                </h2>

                <p>
                  عندما تبدأ مؤشرات الحضور أو التسميع أو
                  الإنجاز في الانخفاض، يصبح من الممكن لفت
                  انتباه المعلم والمشرف مبكرًا واتخاذ خطوة
                  مناسبة.
                </p>

                <div className="landing-care-list">
                  <div className="landing-care-list-item">
                    <CheckCircle2 />
                    اكتشاف انخفاض الحضور
                  </div>

                  <div className="landing-care-list-item">
                    <CheckCircle2 />
                    متابعة انقطاع التسميع
                  </div>

                  <div className="landing-care-list-item">
                    <CheckCircle2 />
                    رصد ضعف الإنجاز الشهري
                  </div>

                  <div className="landing-care-list-item">
                    <CheckCircle2 />
                    توثيق المتابعة والتواصل
                  </div>
                </div>
              </div>

              <div className="landing-care-visual">
                {[
                  {
                    icon: CalendarCheck2,
                    title: "انتظام الحضور",
                    text: "الملاحظة المبكرة للغياب المتكرر.",
                  },
                  {
                    icon: BookOpen,
                    title: "استمرارية التسميع",
                    text: "معرفة الطالب الذي توقف نشاطه قبل تراكم التأخر.",
                  },
                  {
                    icon: Target,
                    title: "الإنجاز مقابل الهدف",
                    text: "قياس واضح لما تم تحقيقه مقارنة بالخطة.",
                  },
                  {
                    icon: HeartHandshake,
                    title: "تدخل إنساني مبكر",
                    text: "البيانات تساعد المعلم، لكنها لا تستبدل دوره التربوي.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="landing-risk-card"
                  >
                    <div className="landing-risk-icon">
                      <Icon />
                    </div>

                    <div className="landing-risk-copy">
                      <strong>{title}</strong>
                      <span>{text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-cta">
        <div className="landing-container">
          <Reveal>
            <div className="landing-cta-shell">
              <OrnamentScene primary="02-shams" />
              <div className="landing-cta-icon">
                <Star />
              </div>

              <h2>
                خلف كل رقم طالب، وخلف كل طالب رحلة تستحق
                المتابعة
              </h2>

              <p>
                الصديق — لأن إدارة الحلقة تبدأ بالبيانات،
                لكن غايتها بناء الطالب وتحسين مسيرته التعليمية.
              </p>

              <button
                type="button"
                className="landing-primary-button"
                onClick={() => navigate("/login")}
              >
                دخول الصديق
                <ArrowUpLeft size={18} />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <img src="/icon-512.png" alt="الصديق" />

            <div>
              <strong>الصِّديق</strong>
              <span>إدارة الحلقات والعناية بالطالب</span>
            </div>
          </div>

          <div className="landing-footer-copy">
            © {new Date().getFullYear()} الصديق — جميع الحقوق محفوظة
          </div>
        </div>
      </footer>

      <LandingAssistant />
    </div>
  );
}
