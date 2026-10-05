import CalendarSettings from "../../components/CalendarSettings";
import { useEffect, useState } from "react";
import { Moon, Palette, Settings, Sparkles, Sun, Type, Waves } from "lucide-react";
import StudentPage from "../../components/student/StudentPage";
import PasskeyManager from "../../components/security/PasskeyManager";
import DeviceNotificationSettings from "../../components/pwa/DeviceNotificationSettings";
import {
  DEFAULT_STUDENT_PREFERENCES,
  STUDENT_ACCENTS,
  loadStudentPreferences,
  saveStudentPreferences,
} from "../../lib/studentPortalUtils";
import "./StudentPortal.css";

export default function StudentSettings() {
  const [value, setValue] = useState(loadStudentPreferences());

  useEffect(() => {
    saveStudentPreferences(value);
  }, [value]);

  function update(field, nextValue) {
    setValue((current) => ({ ...current, [field]: nextValue }));
  }

  return (
    <StudentPage
      eyebrow="بوابتك بطريقتك"
      title="الإعدادات"
      description="خصص المظهر وحجم الخط والحركة بالشكل المريح لك."
      icon={Settings}
    >
      <CalendarSettings /><section className="student-grid student-grid-2">
        <SettingCard title="مظهر النظام" description="اختر الوضع المريح لعينيك." icon={Sun}>
          <div className="student-choice-grid">
            <Choice active={value.theme === "light"} onClick={() => update("theme", "light")} icon={Sun} title="فاتح" />
            <Choice active={value.theme === "dark"} onClick={() => update("theme", "dark")} icon={Moon} title="داكن" />
          </div>
        </SettingCard>

        <SettingCard title="حجم الخط" description="كبر النص إذا كنت تفضل قراءة أكثر راحة." icon={Type}>
          <div className="student-choice-grid">
            {[
              ["normal", "عادي"],
              ["large", "كبير"],
              ["xlarge", "كبير جدًا"],
            ].map(([key, label]) => (
              <button
                type="button"
                className={`student-choice ${value.fontSize === key ? "is-active" : ""}`}
                onClick={() => update("fontSize", key)}
                key={key}
              >
                <Type size={18} />
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </SettingCard>

        <SettingCard title="لون النظام" description="غير اللون الرئيسي مع بقاء هوية الصديق الفاخرة." icon={Palette}>
          <div className="student-choice-grid">
            {Object.entries(STUDENT_ACCENTS).map(([key, color]) => (
              <button
                type="button"
                className={`student-choice ${value.accent === key ? "is-active" : ""}`}
                onClick={() => update("accent", key)}
                key={key}
              >
                <span className="student-accent-dot" style={{ background: color }} />
                <strong>{{ emerald: "زمردي", gold: "ذهبي", royal: "ملكي", blue: "أزرق" }[key]}</strong>
              </button>
            ))}
          </div>
        </SettingCard>

        <SettingCard title="الحركات التفاعلية" description="يمكنك تقليل الحركة إذا فضلت واجهة أكثر هدوءًا." icon={Waves}>
          <div className="student-choice-grid">
            <Choice active={value.motion} onClick={() => update("motion", true)} icon={Sparkles} title="مفعلة" />
            <Choice active={!value.motion} onClick={() => update("motion", false)} icon={Waves} title="هادئة" />
          </div>
        </SettingCard>
      </section>

      <section className="student-panel" style={{ padding: 0, overflow: "hidden" }}>
        <PasskeyManager
          title="دخول الطالب بالبصمة أو الوجه"
          subtitle="سجّل جهازك مرة واحدة، وبعدها تستطيع دخول حساب الطالب باستخدام البصمة أو الوجه أو رمز الجهاز بدل كتابة بيانات الدخول كل مرة."
        />
        <DeviceNotificationSettings
          title="إشعارات الطالب على الجهاز"
          description="استقبل إشعارات المتابعة والتسميع والخطة والرسائل المهمة على جهازك."
        />
      </section>

      <section className="student-panel">
        <button
          type="button"
          className="student-choice"
          style={{ minHeight: 45, width: "fit-content", paddingInline: "calc(18px * var(--app-density,1))" }}
          onClick={() => setValue(DEFAULT_STUDENT_PREFERENCES)}
        >
          استعادة الإعدادات الافتراضية
        </button>
      </section>
    </StudentPage>
  );
}

function SettingCard({ title, description, icon: Icon, children }) {
  return (
    <article className="student-setting-card">
      <div className="student-panel-title">
        <div className="student-panel-title-icon"><Icon size={19} /></div>
        <div><h3>{title}</h3><p>{description}</p></div>
      </div>
      {children}
    </article>
  );
}

function Choice({ active, onClick, icon: Icon, title }) {
  return (
    <button type="button" className={`student-choice ${active ? "is-active" : ""}`} onClick={onClick}>
      <Icon size={19} />
      <strong>{title}</strong>
    </button>
  );
}
