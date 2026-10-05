import CalendarSettings from "../../components/CalendarSettings";
// src/pages/teacher/SettingsPage.jsx

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock3,
  Gauge,
  HeartHandshake,
  Info,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  MessageCircle,
  MessageSquareText,
  Monitor,
  Palette,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Type,
  UserRound,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import {
  TEACHER_PREFERENCES_DEFAULTS,
  TEACHER_PREFERENCE_SECTION_KEYS,
  normalizeTeacherPreferences,
  pickPreferenceFields,
} from "../../lib/teacherPreferences";
import {
  TEACHER_APPEARANCE_DEFAULTS,
  TEACHER_APPEARANCE_PRESETS,
  normalizeTeacherAppearance,
} from "../../lib/teacherAppearance";

import "./SettingsPage.css";

const TABS = [
  { key: "experience", label: "تجربتي", icon: Settings },
  { key: "appearance", label: "المظهر", icon: Palette },
  { key: "session", label: "وضع الحلقة", icon: PlayCircle },
  { key: "education", label: "التعليم والخطط", icon: BookOpen },
  { key: "care", label: "العناية بالطلاب", icon: HeartHandshake },
  { key: "communication", label: "التواصل وواتساب", icon: MessageCircle },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "privacy", label: "الخصوصية", icon: ShieldCheck },
  { key: "policies", label: "السياسات", icon: LockKeyhole },
  { key: "about", label: "حول الصديق", icon: Info },
];

const DEFAULT_MESSAGE_TEMPLATES = [
  {
    template_key: "absence_unexcused",
    title: "غياب بدون عذر",
    body:
      "نود إحاطتكم بأن الطالب {student_name} قد تغيب عن الحلقة اليوم دون تسجيل عذر.\n\nنأمل منكم التكرم بمتابعته والحرص على انتظامه، لما لذلك من أثر في استمراره وتقدمه في حفظ كتاب الله.",
  },
  {
    template_key: "absence_repeated",
    title: "تكرار الغياب",
    body:
      "نود إشعاركم بأن الطالب {student_name} سجل {absence_count} حالات غياب خلال الفترة الأخيرة.\n\nنأمل تعاونكم معنا في معرفة السبب ومساعدته على العودة إلى الانتظام.",
  },
  {
    template_key: "late_repeated",
    title: "تكرار التأخر",
    body:
      "لوحظ تكرر تأخر الطالب {student_name} عن الحلقة خلال الفترة الأخيرة.\n\nنأمل دعمكم في مساعدته على الحضور في الوقت المحدد للاستفادة الكاملة من البرنامج.",
  },
  {
    template_key: "plan_behind",
    title: "التأخر عن الخطة",
    body:
      "نود مشاركتكم متابعة الطالب {student_name} في خطته الشهرية.\n\nالهدف: {target_faces} وجهًا\nالمنجز: {achieved_faces} وجهًا\nنسبة الإنجاز: {progress_percent}%\n\nنأمل تشجيعه على الاستمرار حتى يستعيد مساره بإذن الله.",
  },
  {
    template_key: "no_recitation",
    title: "انقطاع عن التسميع",
    body:
      "لم يسجل للطالب {student_name} تسميع منذ {days_without_recitation} أيام.\n\nنأمل مساعدته على العودة إلى انتظامه في التسميع والمراجعة.",
  },
  {
    template_key: "achievement_positive",
    title: "تحسن مميز",
    body:
      "يسرنا أن نشارككم تحسن الطالب {student_name} خلال الفترة الأخيرة، ونسعد بهذا التقدم الجميل.\n\nنأمل استمرار تشجيعكم له، ونسأل الله أن يبارك في جهده وحفظه.",
  },
  {
    template_key: "plan_completed",
    title: "إكمال الخطة",
    body:
      "يسرنا إبلاغكم بأن الطالب {student_name} أتم هدفه في الخطة الشهرية بنجاح.\n\nنبارك له هذا الإنجاز، ونشكر لكم دعمكم ومتابعتكم المستمرة.",
  },
  {
    template_key: "general_followup",
    title: "متابعة عامة",
    body:
      "نتواصل معكم بخصوص متابعة الطالب {student_name} في الحلقة، ونقدر تعاونكم الدائم معنا في دعمه وتشجيعه.",
  },
];

const TEMPLATE_VARIABLES = [
  "{student_name}",
  "{teacher_name}",
  "{halaqa_name}",
  "{absence_count}",
  "{days_without_recitation}",
  "{target_faces}",
  "{achieved_faces}",
  "{remaining_faces}",
  "{progress_percent}",
];

const SAMPLE = {
  student_name: "أحمد محمد",
  teacher_name: "معلم الحلقة",
  halaqa_name: "حلقة الإمام عاصم",
  absence_count: "2",
  days_without_recitation: "4",
  target_faces: "20",
  achieved_faces: "12",
  remaining_faces: "8",
  progress_percent: "60",
};

function compileTemplate(text) {
  return String(text || "").replace(
    /\{([a-z_]+)\}/g,
    (_, key) => SAMPLE[key] ?? `{${key}}`
  );
}

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeTemplates(rows = []) {
  const map = new Map(rows.map((row) => [row.template_key, row]));

  return DEFAULT_MESSAGE_TEMPLATES.map((item) => ({
    ...item,
    ...(map.get(item.template_key) || {}),
    is_enabled: map.get(item.template_key)?.is_enabled ?? true,
  }));
}

export default function SettingsPage() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("experience");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingSection, setSavingSection] = useState("");
  const [savingTemplates, setSavingTemplates] = useState(false);

  const [profile, setProfile] = useState(null);
  const [halaqat, setHalaqat] = useState([]);

  const [preferences, setPreferences] = useState(
    deepCopy(TEACHER_PREFERENCES_DEFAULTS)
  );
  const [savedPreferences, setSavedPreferences] = useState(
    deepCopy(TEACHER_PREFERENCES_DEFAULTS)
  );

  const [appearance, setAppearance] = useState(
    deepCopy(TEACHER_APPEARANCE_DEFAULTS)
  );
  const [savedAppearance, setSavedAppearance] = useState(
    deepCopy(TEACHER_APPEARANCE_DEFAULTS)
  );
  const [savingAppearance, setSavingAppearance] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!loading) {
      window.dispatchEvent(
        new CustomEvent("teacher-appearance-preview", {
          detail: {
            ...appearance,
            ui_density: preferences.ui_density,
          },
        })
      );
    }
  }, [appearance, preferences.ui_density, loading]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent("teacher-appearance-preview", {
          detail: null,
        })
      );
    };
  }, []);

  useEffect(() => {
    if (!profile?.id || !preferences.remember_last_tab) return;

    try {
      localStorage.setItem(
        `sadiq_teacher_settings_tab_${profile.id}`,
        activeTab
      );
    } catch {
      // التخزين المحلي تحسين تجربة فقط.
    }
  }, [activeTab, profile?.id, preferences.remember_last_tab]);

  async function loadAll() {
    setLoading(true);
    setLoadError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData?.user;

      if (!authUser) {
        throw new Error("لم يتم العثور على جلسة المستخدم.");
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, role, full_name, display_name, user_number")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        throw new Error("لم يتم العثور على ملف الحساب.");
      }

      if (profileData.role !== "teacher") {
        throw new Error("هذه الصفحة مخصصة لحساب المعلم.");
      }

      setProfile(profileData);

      await Promise.all([
        loadPreferences(profileData.id),
        loadHalaqat(profileData.id),
        loadTemplates(profileData.id),
      ]);
    } catch (error) {
      console.error("TEACHER SETTINGS:", error);

      const message =
        error?.message || "تعذر تحميل إعدادات المعلم.";

      setLoadError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadPreferences(teacherId) {
    const { data, error } = await supabase
      .from("teacher_preferences")
      .select("*")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (error) throw error;

    let row = data;

    if (!row) {
      const { data: inserted, error: insertError } =
        await supabase
          .from("teacher_preferences")
          .insert({ teacher_id: teacherId })
          .select("*")
          .single();

      if (insertError) throw insertError;

      row = inserted;
    }

    const normalized = normalizeTeacherPreferences(row);
    const normalizedAppearance = normalizeTeacherAppearance(row);

    setPreferences(normalized);
    setSavedPreferences(deepCopy(normalized));
    setAppearance(normalizedAppearance);
    setSavedAppearance(deepCopy(normalizedAppearance));

    if (normalized.remember_last_tab) {
      try {
        const rememberedTab = localStorage.getItem(
          `sadiq_teacher_settings_tab_${teacherId}`
        );

        if (TABS.some((tab) => tab.key === rememberedTab)) {
          setActiveTab(rememberedTab);
        }
      } catch {
        // لا نوقف الصفحة بسبب التخزين المحلي.
      }
    }
  }

  async function loadHalaqat(teacherId) {
    const { data: links, error: linksError } =
      await supabase
        .from("teacher_halaqat")
        .select("halaqa_id")
        .eq("teacher_id", teacherId);

    if (linksError) throw linksError;

    const ids = [
      ...new Set((links || []).map((row) => Number(row.halaqa_id))),
    ];

    if (!ids.length) {
      setHalaqat([]);
      return;
    }

    const { data: rows, error } = await supabase
      .from("halaqat")
      .select("id, name, mosque_id")
      .in("id", ids)
      .order("name", { ascending: true });

    if (error) throw error;

    const mosqueIds = [
      ...new Set(
        (rows || [])
          .map((row) => row.mosque_id)
          .filter(Boolean)
          .map(Number)
      ),
    ];

    let mosques = [];

    if (mosqueIds.length) {
      const result = await supabase
        .from("mosques")
        .select("id, name")
        .in("id", mosqueIds);

      if (!result.error) {
        mosques = result.data || [];
      }
    }

    const mosqueMap = new Map(
      mosques.map((row) => [Number(row.id), row.name])
    );

    setHalaqat(
      (rows || []).map((row) => ({
        ...row,
        mosque_name:
          mosqueMap.get(Number(row.mosque_id)) || "مسجد غير محدد",
      }))
    );
  }

  async function loadTemplates(teacherId) {
    const { data, error } = await supabase
      .from("teacher_message_templates")
      .select("*")
      .eq("teacher_id", teacherId);

    if (error) throw error;

    const merged = mergeTemplates(data || []);

    setTemplates(merged);
    setSavedTemplates(deepCopy(merged));
  }

  function setPreference(key, value) {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function setAppearanceValue(key, value) {
    setAppearance((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function appearanceChanged() {
    return (
      JSON.stringify({
        ...appearance,
        ui_density: preferences.ui_density,
      }) !==
      JSON.stringify({
        ...savedAppearance,
        ui_density: savedPreferences.ui_density,
      })
    );
  }

  async function saveAppearance() {
    if (!profile?.id) return;

    setSavingAppearance(true);

    try {
      const payload = {
        ...appearance,
        ui_density: preferences.ui_density,
      };

      const { data, error } = await supabase
        .from("teacher_preferences")
        .update(payload)
        .eq("teacher_id", profile.id)
        .select("*")
        .single();

      if (error) throw error;

      const normalized = normalizeTeacherPreferences(data);
      const normalizedAppearance = normalizeTeacherAppearance(data);

      setPreferences(normalized);
      setSavedPreferences(deepCopy(normalized));
      setAppearance(normalizedAppearance);
      setSavedAppearance(deepCopy(normalizedAppearance));

      window.dispatchEvent(
        new CustomEvent("teacher-preferences-updated", {
          detail: data,
        })
      );

      showToast(
        "تم حفظ المظهر وتطبيقه على بوابة المعلم بالكامل.",
        "success"
      );
    } catch (error) {
      console.error("SAVE TEACHER APPEARANCE:", error);
      showToast(
        error?.message || "تعذر حفظ إعدادات المظهر.",
        "error"
      );
    } finally {
      setSavingAppearance(false);
    }
  }

  function resetAppearance() {
    setAppearance(deepCopy(TEACHER_APPEARANCE_DEFAULTS));
    setPreference("ui_density", "comfortable");

    showToast(
      "تمت إعادة مظهر الصديق الافتراضي داخل المعاينة. اضغط حفظ لاعتماده.",
      "info"
    );
  }

  function sectionChanged(sectionKey) {
    const keys = TEACHER_PREFERENCE_SECTION_KEYS[sectionKey] || [];

    return keys.some(
      (key) =>
        JSON.stringify(preferences[key] ?? null) !==
        JSON.stringify(savedPreferences[key] ?? null)
    );
  }

  function templatesChanged() {
    const strip = (rows) =>
      rows.map(({ id, created_at, updated_at, ...row }) => row);

    return JSON.stringify(strip(templates)) !==
      JSON.stringify(strip(savedTemplates));
  }

  async function saveSection(sectionKey) {
    const keys = TEACHER_PREFERENCE_SECTION_KEYS[sectionKey];

    if (!profile?.id || !keys?.length) return;

    setSavingSection(sectionKey);

    try {
      const payload = pickPreferenceFields(preferences, keys);

      if ("default_halaqa_id" in payload) {
        payload.default_halaqa_id =
          payload.default_halaqa_id === "" ||
          payload.default_halaqa_id == null
            ? null
            : Number(payload.default_halaqa_id);
      }

      ["daily_brief_time", "quiet_hours_start", "quiet_hours_end"].forEach(
        (key) => {
          if (key in payload && payload[key]) {
            payload[key] = String(payload[key]).slice(0, 5);
          }
        }
      );

      const { data, error } = await supabase
        .from("teacher_preferences")
        .update(payload)
        .eq("teacher_id", profile.id)
        .select("*")
        .single();

      if (error) throw error;

      const normalized = normalizeTeacherPreferences(data);

      setPreferences(normalized);
      setSavedPreferences(deepCopy(normalized));

      window.dispatchEvent(
        new CustomEvent("teacher-preferences-updated", {
          detail: data,
        })
      );

      showToast("تم حفظ إعدادات القسم بنجاح.", "success");
    } catch (error) {
      console.error("SAVE SETTINGS:", error);
      showToast(error?.message || "تعذر حفظ الإعدادات.", "error");
    } finally {
      setSavingSection("");
    }
  }

  function resetSection(sectionKey) {
    const keys = TEACHER_PREFERENCE_SECTION_KEYS[sectionKey] || [];

    setPreferences((current) => {
      const next = { ...current };

      keys.forEach((key) => {
        next[key] = TEACHER_PREFERENCES_DEFAULTS[key];
      });

      return next;
    });

    showToast(
      "تمت إعادة القيم الافتراضية داخل الصفحة. اضغط حفظ لاعتمادها.",
      "info"
    );
  }

  function updateTemplate(templateKey, patch) {
    setTemplates((current) =>
      current.map((item) =>
        item.template_key === templateKey
          ? { ...item, ...patch }
          : item
      )
    );
  }

  async function saveTemplates() {
    if (!profile?.id) return;

    setSavingTemplates(true);

    try {
      const rows = templates.map((item) => ({
        teacher_id: profile.id,
        template_key: item.template_key,
        title: item.title,
        body: item.body,
        is_enabled: item.is_enabled !== false,
      }));

      const { data, error } = await supabase
        .from("teacher_message_templates")
        .upsert(rows, {
          onConflict: "teacher_id,template_key",
        })
        .select("*");

      if (error) throw error;

      const merged = mergeTemplates(data || []);

      setTemplates(merged);
      setSavedTemplates(deepCopy(merged));

      showToast("تم حفظ قوالب التواصل بنجاح.", "success");
    } catch (error) {
      console.error("SAVE TEMPLATES:", error);
      showToast(error?.message || "تعذر حفظ قوالب التواصل.", "error");
    } finally {
      setSavingTemplates(false);
    }
  }

  const readiness = useMemo(() => {
    let score = 100;
    const warnings = [];

    if (halaqat.length > 1 && !preferences.default_halaqa_id) {
      score -= 15;
      warnings.push("لم تحدد الحلقة الافتراضية.");
    }

    if (
      preferences.daily_brief_enabled &&
      !preferences.daily_brief_time
    ) {
      score -= 10;
      warnings.push("الملخص اليومي مفعّل بدون وقت.");
    }

    if (!String(preferences.whatsapp_greeting || "").trim()) {
      score -= 10;
      warnings.push("بداية رسالة واتساب فارغة.");
    }

    if (
      preferences.whatsapp_include_signature &&
      !String(preferences.whatsapp_signature || "").trim()
    ) {
      score -= 10;
      warnings.push("توقيع واتساب مفعّل لكنه فارغ.");
    }

    if (templates.filter((row) => row.is_enabled).length < 4) {
      score -= 10;
      warnings.push("فعّل مزيدًا من قوالب التواصل.");
    }

    return {
      score: Math.max(0, score),
      warnings,
    };
  }, [preferences, halaqat, templates]);

  const behavior = useMemo(() => {
    const selectedHalaqa = halaqat.find(
      (row) =>
        Number(row.id) === Number(preferences.default_halaqa_id)
    );

    const startLabels = {
      dashboard: "لوحة المعلم",
      attendance: "الحضور",
      recitations: "التسميع",
      care: "العناية بالطلاب",
      monthly_plan: "الخطة الشهرية",
    };

    return [
      {
        label: "الحلقة الافتراضية",
        value:
          selectedHalaqa?.name ||
          (halaqat.length === 1 ? halaqat[0].name : "لم تحدد"),
      },
      {
        label: "بداية وضع الحلقة",
        value: preferences.session_mode_enabled
          ? startLabels[preferences.session_start_view] || "الحضور"
          : "غير مفعّل",
      },
      {
        label: "بعد التسميع",
        value: preferences.recitation_advance_next_student
          ? "الطالب التالي"
          : "البقاء على الطالب",
      },
      {
        label: "تنبيه الغياب",
        value: `${preferences.care_absence_threshold} خلال ${preferences.care_absence_window_days} أيام`,
      },
      {
        label: "واتساب",
        value:
          preferences.whatsapp_mode === "direct"
            ? "فتح مباشر"
            : "معاينة أولًا",
      },
    ];
  }, [preferences, halaqat]);

  if (loading) {
    return (
      <div className="teacher-settings-page" dir="rtl">
        <div className="settings-loading">
          <Loader2 size={30} className="settings-spin" />
          <strong>جارٍ تجهيز مركز الإعدادات...</strong>
          <span>نحمّل تفضيلاتك وقوالب التواصل.</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="teacher-settings-page" dir="rtl">
        <div className="settings-error">
          <AlertTriangle size={36} />
          <h2>تعذر تشغيل مركز الإعدادات</h2>
          <p>{loadError}</p>
          <button type="button" onClick={loadAll}>
            <RefreshCw size={16} />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const changed =
    activeTab === "appearance"
      ? appearanceChanged()
      : TEACHER_PREFERENCE_SECTION_KEYS[activeTab]
        ? sectionChanged(activeTab)
        : false;

  return (
    <div className="teacher-settings-page" dir="rtl">
      <section className="settings-hero">
        <div className="settings-hero-main">
          <div className="settings-hero-icon">
            <Settings size={23} />
          </div>

          <div>
            <div className="settings-eyebrow">
              <Sparkles size={13} />
              مركز إعداداتي
            </div>

            <h1>الإعدادات</h1>

            <p>
              اضبط طريقة عمل الصديق بما يناسب أسلوبك في إدارة الحلقة
              ومتابعة الطلاب.
            </p>
          </div>
        </div>

        <div className="settings-user-chip">
          <UserRound size={17} />

          <div>
            <strong>
              {profile?.display_name ||
                profile?.full_name ||
                "المعلم"}
            </strong>

            <span>
              رقم المستخدم: {profile?.user_number || "—"}
            </span>
          </div>
        </div>
      </section>

      <section className="settings-overview-grid">
        <OverviewCard
          icon={Gauge}
          title="جاهزية بيئة العمل"
          tone="green"
        >
          <div className="readiness-number">
            <strong>{readiness.score}%</strong>
            <span>
              {readiness.score >= 90
                ? "ممتاز"
                : readiness.score >= 75
                  ? "جيد جدًا"
                  : "يحتاج ضبط"}
            </span>
          </div>

          <div className="readiness-bar">
            <span style={{ width: `${readiness.score}%` }} />
          </div>

          <div className="readiness-list">
            {readiness.warnings.length ? (
              readiness.warnings.slice(0, 3).map((item) => (
                <span key={item}>
                  <AlertTriangle size={11} />
                  {item}
                </span>
              ))
            ) : (
              <span className="ok">
                <CheckCircle2 size={11} />
                بيئة العمل جاهزة بصورة ممتازة.
              </span>
            )}
          </div>
        </OverviewCard>

        <OverviewCard
          icon={Sparkles}
          title="كيف يعمل الصديق معي؟"
          tone="gold"
        >
          <div className="behavior-list">
            {behavior.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </OverviewCard>

        <OverviewCard
          icon={CheckCircle2}
          title="صحة الإعداد"
          tone="teal"
        >
          <div className="health-list">
            <HealthLine
              ok={halaqat.length > 0}
              label="الحلقات المرتبطة"
              value={`${halaqat.length}`}
            />

            <HealthLine
              ok={templates.filter((x) => x.is_enabled).length >= 4}
              label="قوالب التواصل"
              value={`${templates.filter((x) => x.is_enabled).length} مفعلة`}
            />

            <HealthLine
              ok={
                !preferences.daily_brief_enabled ||
                Boolean(preferences.daily_brief_time)
              }
              label="الملخص اليومي"
              value={
                !preferences.daily_brief_enabled
                  ? "متوقف"
                  : preferences.daily_brief_time
                    ? "جاهز"
                    : "حدد وقتًا"
              }
            />
          </div>
        </OverviewCard>
      </section>

      <div className="settings-workspace">
        <aside className="settings-nav">
          <div className="settings-nav-title">
            <strong>أقسام الإعدادات</strong>
            <span>اختر القسم الذي تريد تخصيصه</span>
          </div>

          <div className="settings-nav-list">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const hasChanges =
                tab.key === "appearance"
                  ? appearanceChanged()
                  : Boolean(
                      TEACHER_PREFERENCE_SECTION_KEYS[tab.key] &&
                        sectionChanged(tab.key)
                    );

              return (
                <button
                  key={tab.key}
                  type="button"
                  className={
                    activeTab === tab.key
                      ? "settings-nav-item active"
                      : "settings-nav-item"
                  }
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="settings-nav-icon">
                    <Icon size={16} />
                  </span>

                  <strong>{tab.label}</strong>

                  {hasChanges && (
                    <span
                      className="settings-unsaved-dot"
                      title="تغييرات غير محفوظة"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="settings-content">
          {activeTab === "experience" && (
            <ExperienceTab
              p={preferences}
              setP={setPreference}
              halaqat={halaqat}
            />
          )}

          {activeTab === "appearance" && (
            <AppearanceTab
              p={preferences}
              setP={setPreference}
              appearance={appearance}
              setAppearance={setAppearanceValue}
            />
          )}

          {activeTab === "session" && (
            <SessionTab p={preferences} setP={setPreference} />
          )}

          {activeTab === "education" && (
            <EducationTab p={preferences} setP={setPreference} />
          )}

          {activeTab === "care" && (
            <CareTab p={preferences} setP={setPreference} />
          )}

          {activeTab === "communication" && (
            <CommunicationTab
              p={preferences}
              setP={setPreference}
              templates={templates}
              updateTemplate={updateTemplate}
              saveTemplates={saveTemplates}
              savingTemplates={savingTemplates}
              templatesDirty={templatesChanged()}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsTab p={preferences} setP={setPreference} />
          )}

          {activeTab === "privacy" && (
            <PrivacyTab p={preferences} setP={setPreference} />
          )}

          {activeTab === "policies" && <PoliciesTab />}

          {activeTab === "about" && <AboutTab />}

          {activeTab === "appearance" && (
            <SectionActions
              changed={changed}
              saving={savingAppearance}
              onSave={saveAppearance}
              onReset={resetAppearance}
            />
          )}

          {TEACHER_PREFERENCE_SECTION_KEYS[activeTab] && (
            <SectionActions
              changed={changed}
              saving={savingSection === activeTab}
              onSave={() => saveSection(activeTab)}
              onReset={() => resetSection(activeTab)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   Tabs
========================================================= */

function ExperienceTab({ p, setP, halaqat }) {
  return (
    <SettingsSection
      icon={Settings}
      title="تجربتي"
      subtitle="إعدادات الواجهة والتقويم والحلقة الافتراضية."
      badge="شخصي"
    >
      <Group title="بداية الاستخدام">
        <Grid>
          <SelectField
            label="الحلقة الافتراضية"
            value={p.default_halaqa_id ?? ""}
            onChange={(value) =>
              setP(
                "default_halaqa_id",
                value ? Number(value) : null
              )
            }
            options={[
              { value: "", label: "بدون حلقة افتراضية" },
              ...halaqat.map((row) => ({
                value: String(row.id),
                label: `${row.name} — ${row.mosque_name}`,
              })),
            ]}
          />

          <CalendarSettings />

        </Grid>
      </Group>

      <Group title="ذاكرة الاستخدام">
        <ToggleRow
          label="تذكر آخر حلقة"
          description="يعود النظام تلقائيًا للحلقة التي كنت تعمل عليها."
          checked={p.remember_last_halaqa}
          onChange={(value) => setP("remember_last_halaqa", value)}
        />

        <ToggleRow
          label="تذكر آخر تبويب"
          description="يعيد فتح آخر قسم كنت تستخدمه."
          checked={p.remember_last_tab}
          onChange={(value) => setP("remember_last_tab", value)}
        />
      </Group>
    </SettingsSection>
  );
}

function AppearanceTab({
  p,
  setP,
  appearance,
  setAppearance,
}) {
  const selectedPreset =
    appearance.appearance_theme === "custom"
      ? null
      : TEACHER_APPEARANCE_PRESETS.find(
          (item) => item.key === appearance.appearance_theme
        );

  return (
    <SettingsSection
      icon={Palette}
      title="المظهر"
      subtitle="خصص هوية بوابة المعلم. التغييرات تظهر مباشرة وتُطبق على جميع صفحات البوابة بعد الحفظ."
      badge="تخصيص الواجهة"
    >
      <Group title="الهوية اللونية">
        <div className="appearance-presets">
          {TEACHER_APPEARANCE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={
                appearance.appearance_theme === preset.key
                  ? "appearance-preset active"
                  : "appearance-preset"
              }
              onClick={() => {
                setAppearance("appearance_theme", preset.key);
                setAppearance(
                  "appearance_primary",
                  preset.primary
                );
              }}
            >
              <span
                className="appearance-preset-swatch"
                style={{
                  "--preset-primary": preset.primary,
                  "--preset-accent": preset.accent,
                  "--preset-gold": preset.gold,
                }}
              />
              <span className="appearance-preset-copy">
                <strong>{preset.label}</strong>
                <small>{preset.description}</small>
              </span>
              <span className="appearance-preset-check">
                {appearance.appearance_theme === preset.key ? "✓" : ""}
              </span>
            </button>
          ))}
        </div>

        <div className="appearance-custom-color">
          <div>
            <Palette size={17} />
            <span>
              <strong>لون مخصص</strong>
              <small>
                اختر لونك الرئيسي وسيبني الصديق التدرجات والظلال تلقائيًا.
              </small>
            </span>
          </div>

          <label className="appearance-color-picker">
            <input
              type="color"
              value={appearance.appearance_primary}
              onChange={(event) => {
                setAppearance("appearance_theme", "custom");
                setAppearance(
                  "appearance_primary",
                  event.target.value.toUpperCase()
                );
              }}
            />
            <span>{appearance.appearance_primary}</span>
          </label>
        </div>
      </Group>

      <Group title="حجم ومقاس الواجهة">
        <Grid>
          <Segment
            label="حجم النص"
            value={appearance.appearance_font_size}
            onChange={(value) =>
              setAppearance("appearance_font_size", value)
            }
            options={[
              { value: "small", label: "صغير" },
              { value: "normal", label: "متوسط" },
              { value: "large", label: "كبير" },
              { value: "xlarge", label: "أكبر" },
            ]}
          />

          <Segment
            label="كثافة العناصر"
            value={p.ui_density}
            onChange={(value) => setP("ui_density", value)}
            options={[
              { value: "comfortable", label: "مريح" },
              { value: "compact", label: "مضغوط" },
            ]}
          />

          <Segment
            label="استدارة البطاقات"
            value={appearance.appearance_radius}
            onChange={(value) =>
              setAppearance("appearance_radius", value)
            }
            options={[
              { value: "compact", label: "هادئ" },
              { value: "soft", label: "متوازن" },
              { value: "round", label: "دائري" },
            ]}
          />

          <Segment
            label="حركة الواجهة"
            value={appearance.appearance_motion}
            onChange={(value) =>
              setAppearance("appearance_motion", value)
            }
            options={[
              { value: "full", label: "طبيعية" },
              { value: "reduced", label: "مخفضة" },
            ]}
          />
        </Grid>
      </Group>

      <Group title="الخلفية والزخرفة">
        <Segment
          label="زخرفة الخلفية"
          value={appearance.appearance_pattern}
          onChange={(value) =>
            setAppearance("appearance_pattern", value)
          }
          options={[
            { value: "none", label: "بدون" },
            { value: "subtle", label: "خفيفة" },
            { value: "rich", label: "أوضح" },
          ]}
        />
      </Group>

      <div
        className="appearance-live-preview"
        style={{
          "--preview-primary":
            selectedPreset?.primary || appearance.appearance_primary,
          "--preview-accent":
            selectedPreset?.accent || appearance.appearance_primary,
          "--preview-gold":
            selectedPreset?.gold || "#D1B34C",
        }}
      >
        <div className="appearance-preview-sidebar">
          <div className="appearance-preview-logo">ص</div>
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="appearance-preview-stage">
          <div className="appearance-preview-topbar">
            <span>
              <Type size={13} />
              معاينة مباشرة
            </span>
            <b>بوابة المعلم</b>
          </div>

          <div className="appearance-preview-cards">
            <div>
              <small>الحضور</small>
              <strong>٢٨ طالبًا</strong>
            </div>
            <div>
              <small>التسميع</small>
              <strong>ممتاز</strong>
            </div>
            <div>
              <small>الإنجاز</small>
              <strong>٨٦٪</strong>
            </div>
          </div>

          <p>
            اللون والحجم والكثافة والحواف والخلفية تُطبق على
            السايدبار والتوب بار وجميع صفحات بوابة المعلم.
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}

function SessionTab({ p, setP }) {
  return (
    <SettingsSection
      icon={PlayCircle}
      title="وضع الحلقة"
      subtitle="حوّل الصديق إلى شاشة تشغيل يومية سريعة أثناء الحلقة."
      badge="تشغيل يومي"
    >
      <Group title="بداية الجلسة">
        <ToggleRow
          label="تفعيل وضع الحلقة"
          description="يجمع الحضور والتسميع والمتابعة في تجربة عمل متتابعة."
          checked={p.session_mode_enabled}
          onChange={(value) => setP("session_mode_enabled", value)}
        />

        <Grid>
          <SelectField
            label="ابدأ من"
            value={p.session_start_view}
            onChange={(value) => setP("session_start_view", value)}
            disabled={!p.session_mode_enabled}
            options={[
              { value: "dashboard", label: "لوحة المعلم" },
              { value: "attendance", label: "الحضور" },
              { value: "recitations", label: "التسميع" },
              { value: "care", label: "العناية بالطلاب" },
              { value: "monthly_plan", label: "الخطة الشهرية" },
            ]}
          />

          <SelectField
            label="الحضور الافتراضي"
            value={p.attendance_default_action}
            onChange={(value) => setP("attendance_default_action", value)}
            options={[
              { value: "none", label: "غير مسجل" },
              { value: "present", label: "حاضر" },
            ]}
          />

          <SelectField
            label="مقدار التسميع الافتراضي"
            value={p.recitation_default_amount_type}
            onChange={(value) =>
              setP("recitation_default_amount_type", value)
            }
            options={[
              { value: "three_lines", label: "3 أسطر" },
              { value: "half_page", label: "نصف صفحة" },
              { value: "one_page", label: "صفحة" },
              { value: "two_pages", label: "صفحتان" },
            ]}
          />
        </Grid>

        <ToggleRow
          label="فتح العناية عند وجود حالة مهمة"
          description="يعرض الحالات التي تحتاج تدخلك عند بداية الحلقة."
          checked={p.session_auto_open_care}
          onChange={(value) => setP("session_auto_open_care", value)}
        />
      </Group>

      <Group title="الحضور">
        <ToggleRow
          label="تأكيد قبل تسجيل الجميع حاضر"
          description="يقلل أخطاء التسجيل الجماعي."
          checked={p.attendance_confirm_mark_all}
          onChange={(value) =>
            setP("attendance_confirm_mark_all", value)
          }
        />

        <ToggleRow
          label="إظهار الغياب المتكرر"
          description="يظهر تنبيه بجانب الطالب ذي النمط المتكرر."
          checked={p.attendance_show_repeated_absence}
          onChange={(value) =>
            setP("attendance_show_repeated_absence", value)
          }
        />
      </Group>

      <Group title="التسميع السريع">
        <ToggleRow
          label="الانتقال إلى الطالب التالي بعد الحفظ"
          checked={p.recitation_advance_next_student}
          onChange={(value) =>
            setP("recitation_advance_next_student", value)
          }
        />

        <ToggleRow
          label="إظهار آخر تسميع"
          checked={p.recitation_show_last_record}
          onChange={(value) =>
            setP("recitation_show_last_record", value)
          }
        />

        <ToggleRow
          label="إظهار الخطة الشهرية"
          checked={p.recitation_show_monthly_plan}
          onChange={(value) =>
            setP("recitation_show_monthly_plan", value)
          }
        />

        <ToggleRow
          label="إظهار نسبة الإنجاز"
          checked={p.recitation_show_progress}
          onChange={(value) =>
            setP("recitation_show_progress", value)
          }
        />

        <ToggleRow
          label="إظهار تنبيه العناية"
          checked={p.recitation_show_care_alert}
          onChange={(value) =>
            setP("recitation_show_care_alert", value)
          }
        />
      </Group>
    </SettingsSection>
  );
}

function EducationTab({ p, setP }) {
  return (
    <SettingsSection
      icon={BookOpen}
      title="التعليم والخطط"
      subtitle="اضبط الخطة الشهرية ومؤشرات المسار بصورة واقعية."
      badge="تعليمي"
    >
      <Group title="الخطة الافتراضية">
        <Grid>
          <NumberField
            label="هدف الحفظ"
            suffix="وجه"
            value={p.plan_default_mem_faces}
            min={0}
            step={0.5}
            onChange={(value) =>
              setP("plan_default_mem_faces", value)
            }
          />

          <NumberField
            label="هدف المراجعة"
            suffix="وجه"
            value={p.plan_default_revision_faces}
            min={0}
            step={0.5}
            onChange={(value) =>
              setP("plan_default_revision_faces", value)
            }
          />

          <Segment
            label="مرونة الخطة"
            value={p.plan_flexibility}
            onChange={(value) => setP("plan_flexibility", value)}
            options={[
              { value: "strict", label: "صارم" },
              { value: "balanced", label: "متوازن" },
              { value: "flexible", label: "مرن" },
            ]}
          />

          <NumberField
            label="تنبيه الهدف المرتفع"
            suffix="%"
            value={p.plan_warn_above_history_pct}
            min={0}
            max={500}
            step={5}
            onChange={(value) =>
              setP("plan_warn_above_history_pct", Math.round(value))
            }
          />
        </Grid>
      </Group>

      <Group title="مساعد الخطة">
        <ToggleRow
          label="اقتراح نسخ الشهر السابق"
          checked={p.plan_copy_previous_suggestion}
          onChange={(value) =>
            setP("plan_copy_previous_suggestion", value)
          }
        />

        <ToggleRow
          label="إظهار مؤشر «على المسار»"
          checked={p.plan_show_pace}
          onChange={(value) => setP("plan_show_pace", value)}
        />

        <ToggleRow
          label="اقتراح هدف من الأداء السابق"
          checked={p.plan_smart_target_suggestion}
          onChange={(value) =>
            setP("plan_smart_target_suggestion", value)
          }
        />
      </Group>

      <InfoBox icon={Target} title="قاعدة تعليمية">
        عدد الأوجه هو الهدف الرقمي الرسمي للمقارنة. نطاق السورة والآيات
        يحدد المحتوى، ولا نحسب صفحات المصحف من الآيات بشكل تقديري.
      </InfoBox>
    </SettingsSection>
  );
}

function CareTab({ p, setP }) {
  return (
    <SettingsSection
      icon={HeartHandshake}
      title="العناية بالطلاب"
      subtitle="حدد متى تتحول البيانات إلى حالة تحتاج تدخلك."
      badge="محرك العناية"
    >
      <Group title="قواعد المتابعة">
        <Grid>
          <NumberField
            label="الغياب المتكرر"
            suffix="غياب"
            value={p.care_absence_threshold}
            min={1}
            max={30}
            onChange={(value) =>
              setP("care_absence_threshold", Math.round(value))
            }
          />

          <NumberField
            label="نافذة الغياب"
            suffix="يوم"
            value={p.care_absence_window_days}
            min={1}
            max={90}
            onChange={(value) =>
              setP("care_absence_window_days", Math.round(value))
            }
          />

          <NumberField
            label="تكرار التأخر"
            suffix="مرات"
            value={p.care_late_threshold}
            min={1}
            max={30}
            onChange={(value) =>
              setP("care_late_threshold", Math.round(value))
            }
          />

          <NumberField
            label="انقطاع التسميع"
            suffix="يوم"
            value={p.care_no_recitation_days}
            min={1}
            max={90}
            onChange={(value) =>
              setP("care_no_recitation_days", Math.round(value))
            }
          />

          <NumberField
            label="فارق التأخر عن الخطة"
            suffix="%"
            value={p.care_plan_delay_threshold}
            min={0}
            max={100}
            onChange={(value) =>
              setP("care_plan_delay_threshold", value)
            }
          />

          <NumberField
            label="تأجيل التنبيه"
            suffix="ساعة"
            value={p.care_default_snooze_hours}
            min={1}
            max={720}
            onChange={(value) =>
              setP("care_default_snooze_hours", Math.round(value))
            }
          />
        </Grid>

        <ToggleRow
          label="إظهار الإنجازات الإيجابية"
          description="يعرض التحسن والعودة للانتظام وإكمال الخطة، وليس التعثر فقط."
          checked={p.care_positive_alerts}
          onChange={(value) =>
            setP("care_positive_alerts", value)
          }
        />
      </Group>

      <Group title="سُلّم التدخل">
        <Grid>
          <NumberField
            label="التصعيد بعد"
            suffix="غياب"
            value={p.care_escalate_absences}
            min={1}
            max={30}
            onChange={(value) =>
              setP("care_escalate_absences", Math.round(value))
            }
          />

          <NumberField
            label="التصعيد بعد محاولات تواصل"
            suffix="محاولة"
            value={p.care_escalate_after_contacts}
            min={0}
            max={20}
            onChange={(value) =>
              setP("care_escalate_after_contacts", Math.round(value))
            }
          />

          <NumberField
            label="عدم تكرار اقتراح التواصل"
            suffix="ساعة"
            value={p.care_contact_cooldown_hours}
            min={0}
            max={720}
            onChange={(value) =>
              setP("care_contact_cooldown_hours", Math.round(value))
            }
          />
        </Grid>
      </Group>

      <div className="rule-preview">
        <div>
          <HeartHandshake size={16} />
          <strong>كيف سيقرأ الصديق الحالة؟</strong>
        </div>

        <div className="rule-flow">
          <span>
            {p.care_absence_threshold} غياب خلال{" "}
            {p.care_absence_window_days} أيام
          </span>
          <b>←</b>
          <span>يحتاج متابعة</span>
          <b>←</b>
          <span className="warn">
            {p.care_escalate_absences} غيابات = تصعيد
          </span>
        </div>
      </div>
    </SettingsSection>
  );
}

function CommunicationTab({
  p,
  setP,
  templates,
  updateTemplate,
  saveTemplates,
  savingTemplates,
  templatesDirty,
}) {
  const [selectedKey, setSelectedKey] = useState(
    templates[0]?.template_key || "absence_unexcused"
  );

  const selected =
    templates.find((row) => row.template_key === selectedKey) ||
    templates[0];

  const preview = [
    p.whatsapp_greeting,
    selected?.body,
    p.whatsapp_closing,
    p.whatsapp_include_signature ? p.whatsapp_signature : "",
  ]
    .filter(Boolean)
    .map((part) => compileTemplate(part))
    .join("\n\n");

  return (
    <SettingsSection
      icon={MessageCircle}
      title="التواصل وواتساب"
      subtitle="استوديو لصياغة رسائل راقية ومناسبة لكل حالة."
      badge="استوديو الرسائل"
    >
      <Group title="طريقة التواصل">
        <Grid>
          <Segment
            label="عند الضغط على واتساب"
            value={p.whatsapp_mode}
            onChange={(value) => setP("whatsapp_mode", value)}
            options={[
              { value: "direct", label: "فتح مباشر" },
              { value: "preview", label: "معاينة أولًا" },
            ]}
          />

          <Segment
            label="أولوية الرقم"
            value={
              p.whatsapp_guardian_first ? "guardian" : "student"
            }
            onChange={(value) =>
              setP("whatsapp_guardian_first", value === "guardian")
            }
            options={[
              { value: "guardian", label: "ولي الأمر أولًا" },
              { value: "student", label: "الطالب أولًا" },
            ]}
          />
        </Grid>

        <ToggleRow
          label="إضافة توقيع الصديق"
          checked={p.whatsapp_include_signature}
          onChange={(value) =>
            setP("whatsapp_include_signature", value)
          }
        />

        <Grid>
          <TextareaField
            label="بداية الرسالة"
            value={p.whatsapp_greeting}
            onChange={(value) =>
              setP("whatsapp_greeting", value)
            }
          />

          <TextareaField
            label="الخاتمة"
            value={p.whatsapp_closing}
            onChange={(value) =>
              setP("whatsapp_closing", value)
            }
          />

          <TextareaField
            label="التوقيع"
            value={p.whatsapp_signature}
            onChange={(value) =>
              setP("whatsapp_signature", value)
            }
            disabled={!p.whatsapp_include_signature}
          />
        </Grid>
      </Group>

      <Group title="قوالب الحالات">
        <div className="template-studio">
          <div className="template-list">
            {templates.map((item) => (
              <button
                type="button"
                key={item.template_key}
                className={
                  item.template_key === selectedKey
                    ? "template-item active"
                    : "template-item"
                }
                onClick={() => setSelectedKey(item.template_key)}
              >
                <MessageSquareText size={14} />
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.is_enabled ? "مفعّل" : "متوقف"}
                  </small>
                </span>
              </button>
            ))}
          </div>

          {selected && (
            <div className="template-editor">
              <div className="template-editor-head">
                <div>
                  <strong>{selected.title}</strong>
                  <span>{selected.template_key}</span>
                </div>

                <Toggle
                  checked={selected.is_enabled !== false}
                  onChange={(value) =>
                    updateTemplate(selected.template_key, {
                      is_enabled: value,
                    })
                  }
                />
              </div>

              <textarea
                rows={8}
                value={selected.body}
                onChange={(event) =>
                  updateTemplate(selected.template_key, {
                    body: event.target.value,
                  })
                }
              />

              <div className="template-vars">
                <span>المتغيرات:</span>

                <div>
                  {TEMPLATE_VARIABLES.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() =>
                        updateTemplate(selected.template_key, {
                          body: `${selected.body || ""}${
                            selected.body ? " " : ""
                          }${variable}`,
                        })
                      }
                    >
                      {variable}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="template-preview">
            <div className="template-preview-title">
              <Smartphone size={15} />
              معاينة واتساب
            </div>

            <div className="whatsapp-bubble">{preview}</div>
          </div>
        </div>

        <div className="template-actions">
          <span>
            {templatesDirty
              ? "توجد تعديلات غير محفوظة."
              : "القوالب محفوظة."}
          </span>

          <button
            type="button"
            onClick={saveTemplates}
            disabled={!templatesDirty || savingTemplates}
          >
            {savingTemplates ? (
              <Loader2 size={14} className="settings-spin" />
            ) : (
              <Save size={14} />
            )}
            حفظ القوالب
          </button>
        </div>
      </Group>
    </SettingsSection>
  );
}

function NotificationsTab({ p, setP }) {
  return (
    <SettingsSection
      icon={Bell}
      title="الإشعارات"
      subtitle="أظهر المهم في الوقت المناسب وخفف الضوضاء."
      badge="انتباه ذكي"
    >
      <Group title="الأحداث المهمة">
        <ToggleRow
          label="الرسائل غير المقروءة"
          checked={p.notify_unread_messages}
          onChange={(value) =>
            setP("notify_unread_messages", value)
          }
        />

        <ToggleRow
          label="رسائل المشرف"
          checked={p.notify_supervisor_messages}
          onChange={(value) =>
            setP("notify_supervisor_messages", value)
          }
        />

        <ToggleRow
          label="تغييرات حالة الخطة"
          checked={p.notify_plan_status_changes}
          onChange={(value) =>
            setP("notify_plan_status_changes", value)
          }
        />
      </Group>

      <Group title="الملخصات">
        <ToggleRow
          label="الملخص اليومي"
          description="موجز بالحالات المتأخرة والغياب والرسائل."
          checked={p.daily_brief_enabled}
          onChange={(value) =>
            setP("daily_brief_enabled", value)
          }
        />

        <TimeField
          label="وقت الملخص"
          value={p.daily_brief_time || ""}
          disabled={!p.daily_brief_enabled}
          onChange={(value) =>
            setP("daily_brief_time", value || null)
          }
        />

        <ToggleRow
          label="ملخص نهاية الحلقة"
          checked={p.end_session_summary}
          onChange={(value) =>
            setP("end_session_summary", value)
          }
        />
      </Group>

      <Group title="ساعات الهدوء">
        <ToggleRow
          label="تفعيل ساعات الهدوء"
          description="تؤخر الإشعارات غير العاجلة ولا تحذفها."
          checked={p.quiet_hours_enabled}
          onChange={(value) =>
            setP("quiet_hours_enabled", value)
          }
        />

        <Grid>
          <TimeField
            label="من"
            value={p.quiet_hours_start || ""}
            disabled={!p.quiet_hours_enabled}
            onChange={(value) =>
              setP("quiet_hours_start", value || null)
            }
          />

          <TimeField
            label="إلى"
            value={p.quiet_hours_end || ""}
            disabled={!p.quiet_hours_enabled}
            onChange={(value) =>
              setP("quiet_hours_end", value || null)
            }
          />
        </Grid>
      </Group>
    </SettingsSection>
  );
}

function PrivacyTab({ p, setP }) {
  return (
    <SettingsSection
      icon={ShieldCheck}
      title="الخصوصية"
      subtitle="احمِ بيانات الطالب عند عرض النظام أمام الآخرين."
      badge="الشاشة المشتركة"
    >
      <Group title="وضع الشاشة المشتركة">
        <ToggleRow
          label="تفعيل وضع الشاشة المشتركة"
          description="مرجع موحد لباقي الصفحات عند عرض النظام على شاشة الحلقة."
          checked={p.shared_screen_mode}
          onChange={(value) =>
            setP("shared_screen_mode", value)
          }
        />

        <ToggleRow
          label="إخفاء أرقام التواصل"
          checked={p.hide_contact_data_shared}
          disabled={!p.shared_screen_mode}
          onChange={(value) =>
            setP("hide_contact_data_shared", value)
          }
        />

        <ToggleRow
          label="إخفاء الملاحظات الخاصة"
          checked={p.hide_private_notes_shared}
          disabled={!p.shared_screen_mode}
          onChange={(value) =>
            setP("hide_private_notes_shared", value)
          }
        />

        <ToggleRow
          label="إخفاء تفاصيل العناية"
          checked={p.hide_care_details_shared}
          disabled={!p.shared_screen_mode}
          onChange={(value) =>
            setP("hide_care_details_shared", value)
          }
        />
      </Group>

      <div className="privacy-preview">
        <Monitor size={17} />

        <div>
          <strong>طالب تجريبي</strong>
          <span>
            الجوال:{" "}
            {p.shared_screen_mode && p.hide_contact_data_shared
              ? "••••••••••"
              : "05XXXXXXXX"}
          </span>
          <span>
            المتابعة:{" "}
            {p.shared_screen_mode && p.hide_care_details_shared
              ? "مخفية"
              : "يحتاج متابعة"}
          </span>
        </div>
      </div>
    </SettingsSection>
  );
}

function PoliciesTab() {
  const items = [
    ["قيم النقاط والمكافآت", "الإدارة / المشرف", "استخدام فقط"],
    ["إعدادات شاشة التلفزيون", "الإدارة / المشرف", "عرض حسب الصلاحية"],
    ["الكلمات التحفيزية العامة", "الإدارة / المشرف", "قراءة"],
    ["قواعد العناية الشخصية", "المعلم", "تخصيص"],
    ["قوالب واتساب", "المعلم", "تخصيص"],
  ];

  return (
    <SettingsSection
      icon={LockKeyhole}
      title="السياسات"
      subtitle="نفصل بين تفضيلات المعلم وسياسات الجهة."
      badge="حوكمة"
    >
      <InfoBox icon={ShieldCheck} title="إدارة الصلاحيات">
        بعض الإعدادات تحددها الجهة، والباقي قابل لتخصيص المعلم.
      </InfoBox>

      <div className="policy-list">
        {items.map(([name, owner, access]) => (
          <div className="policy-row" key={name}>
            <strong>{name}</strong>
            <span>{owner}</span>
            <b>{access}</b>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

function AboutTab() {
  return (
    <SettingsSection
      icon={Info}
      title="حول الصديق"
      subtitle="إعدادات وتجربة بوابة المعلم."
      badge="2.0"
    >
      <div className="about-grid">
        <AboutCard
          icon={UserRound}
          title="شخصي"
          text="كل معلم يملك إعداداته الخاصة ولا يغيّر تجربة بقية المعلمين."
        />
        <AboutCard
          icon={HeartHandshake}
          title="يركز على الطالب"
          text="قواعد العناية صممت لاكتشاف الحاجة للتدخل مبكرًا."
        />
        <AboutCard
          icon={MessageCircle}
          title="تواصل منظم"
          text="قوالب واتساب مرتبطة بالحالات ومتغيرات الطالب."
        />
        <AboutCard
          icon={ShieldCheck}
          title="صلاحيات واضحة"
          text="تظهر الخيارات المتاحة لك حسب صلاحيتك."
        />
        <AboutCard
          icon={LayoutDashboard}
          title="تجربة موحدة"
          text="تُطبق تفضيلاتك على صفحات بوابة المعلم."
        />
        <AboutCard
          icon={Monitor}
          title="خصوصية العرض"
          text="وضع الشاشة المشتركة مهيأ لإخفاء البيانات الحساسة."
        />
      </div>
    </SettingsSection>
  );
}

/* =========================================================
   Reusable UI
========================================================= */

function OverviewCard({ icon: Icon, title, tone, children }) {
  return (
    <div className="overview-card">
      <div className="overview-head">
        <div className={`overview-icon ${tone}`}>
          <Icon size={18} />
        </div>
        <strong>{title}</strong>
      </div>
      {children}
    </div>
  );
}

function HealthLine({ ok, label, value }) {
  return (
    <div className="health-line">
      <span className={ok ? "health-icon ok" : "health-icon warn"}>
        {ok ? (
          <CheckCircle2 size={12} />
        ) : (
          <AlertTriangle size={12} />
        )}
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  subtitle,
  badge,
  children,
}) {
  return (
    <section className="settings-section">
      <div className="section-head">
        <div className="section-head-main">
          <div className="section-icon">
            <Icon size={19} />
          </div>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>

        {badge && <span className="section-badge">{badge}</span>}
      </div>

      <div className="section-body">{children}</div>
    </section>
  );
}

function Group({ title, children }) {
  return (
    <div className="settings-group">
      <div className="group-title">{title}</div>
      <div className="group-body">{children}</div>
    </div>
  );
}

function Grid({ children }) {
  return <div className="settings-grid">{children}</div>;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}) {
  return (
    <div className={disabled ? "setting-row disabled" : "setting-row"}>
      <div>
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </div>

      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      className={checked ? "toggle on" : "toggle"}
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      aria-pressed={checked}
    >
      <span />
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}) {
  return (
    <label className={disabled ? "field disabled" : "field"}>
      <span>{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Segment({
  label,
  value,
  onChange,
  options,
  disabled,
}) {
  return (
    <div className={disabled ? "field disabled" : "field"}>
      <span>{label}</span>

      <div className="segment">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "active" : ""}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberField({
  label,
  suffix,
  value,
  onChange,
  min,
  max,
  step = 1,
}) {
  return (
    <label className="field">
      <span>{label}</span>

      <div className="number-shell">
        <input
          type="number"
          value={value ?? 0}
          min={min}
          max={max}
          step={step}
          onChange={(event) =>
            onChange(
              event.target.value === ""
                ? 0
                : Number(event.target.value)
            )
          }
        />
        {suffix && <b>{suffix}</b>}
      </div>
    </label>
  );
}

function TimeField({
  label,
  value,
  onChange,
  disabled,
}) {
  return (
    <label className={disabled ? "field disabled" : "field"}>
      <span>{label}</span>

      <div className="time-shell">
        <Clock3 size={14} />
        <input
          type="time"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      </div>
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  disabled,
}) {
  return (
    <label className={disabled ? "field disabled" : "field"}>
      <span>{label}</span>

      <textarea
        rows={4}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function InfoBox({ icon: Icon, title, children }) {
  return (
    <div className="info-box">
      <div>
        <Icon size={17} />
      </div>

      <p>
        <strong>{title}</strong>
        <span>{children}</span>
      </p>
    </div>
  );
}

function SectionActions({
  changed,
  saving,
  onSave,
  onReset,
}) {
  return (
    <div className="section-actions">
      <div className={changed ? "save-state changed" : "save-state"}>
        {changed ? (
          <>
            <AlertTriangle size={12} />
            توجد تغييرات غير محفوظة
          </>
        ) : (
          <>
            <CheckCircle2 size={12} />
            جميع إعدادات هذا القسم محفوظة
          </>
        )}
      </div>

      <div>
        <button
          type="button"
          className="reset-button"
          onClick={onReset}
          disabled={saving}
        >
          <RotateCcw size={14} />
          الافتراضي
        </button>

        <button
          type="button"
          className="save-button"
          onClick={onSave}
          disabled={!changed || saving}
        >
          {saving ? (
            <Loader2 size={14} className="settings-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? "جارٍ الحفظ..." : "حفظ القسم"}
        </button>
      </div>
    </div>
  );
}

function AboutCard({ icon: Icon, title, text }) {
  return (
    <div className="about-card">
      <div>
        <Icon size={18} />
      </div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
