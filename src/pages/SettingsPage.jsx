import CalendarSettings from "../components/CalendarSettings";
import Ornament from '../components/ornaments/Ornament';
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings, SlidersHorizontal, Palette, Tv, Quote, ShieldCheck, Info,
  Check, RotateCcw, Type, LayoutGrid, MonitorCog, Save, ChevronLeft,
  MousePointer2, Accessibility, History, AlertCircle,
} from "lucide-react";
import TVSettings from "../components/settings/TVSettings";
import QuoteManager from "../components/settings/QuoteManager";
import SecuritySettings from "../components/settings/SecuritySettings";
import AboutSystem from "../components/settings/AboutSystem";
import {
  APPEARANCE_EVENT, DEFAULT_APPEARANCE, THEMES, applyAppAppearance,
  readAppAppearance, saveAppAppearance,
} from "../lib/appearance";
import "./SettingsPage.css";

const TAB_KEY = "sadiq_settings_section";
const TABS = [
  { key: "general", label: "إعدادات عامة", desc: "تفضيلات الحركة والتمرير والتنقل", icon: SlidersHorizontal },
  { key: "appearance", label: "المظهر والتجربة", desc: "ألوان الواجهة وحجم النص والمسافات", icon: Palette },
  { key: "tv", label: "شاشة العرض", desc: "الصفحات ومنصة التتويج والعبارات", icon: Tv },
  { key: "quotes", label: "العبارات التحفيزية", desc: "العبارات المستخدمة في شاشة العرض", icon: Quote },
  { key: "security", label: "الحساب والأمان", desc: "تسجيل الدخول وتغيير كلمة المرور", icon: ShieldCheck },
  { key: "about", label: "معلومات النظام", desc: "الإحصاءات وحالة الاتصال", icon: Info },
];
const THEME_LABELS = { sadiq: "أخضر الصِّديق", olive: "الزيتوني", emerald: "الزمردي", navy: "الكحلي", burgundy: "العنابي", gold: "الذهبي المعتّق" };
const FONTS = [{ id: "compact", label: "صغير", text: "14" }, { id: "normal", label: "متوسط", text: "16" }, { id: "large", label: "كبير", text: "18" }];
const DENSITIES = [{ id: "compact", label: "مضغوط", text: "مسافات أقل" }, { id: "comfortable", label: "مريح", text: "متوازن" }, { id: "spacious", label: "واسع", text: "مسافات أوسع" }];
const GENERAL_KEYS = ["reducedMotion", "smoothScroll", "rememberSettingsTab"];
const APPEARANCE_KEYS = ["theme", "customColor", "fontSize", "density", "rounded"];

function initialTab() {
  try {
    const key = readAppAppearance().rememberSettingsTab ? localStorage.getItem(TAB_KEY) : "general";
    return TABS.some(tab => tab.key === key) ? key : "general";
  } catch { return "general"; }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [appearance, setAppearance] = useState(readAppAppearance);
  const [savedAppearance, setSavedAppearance] = useState(readAppAppearance);
  const [notice, setNotice] = useState(null);
  const savedRef = useRef(savedAppearance);
  const timerRef = useRef(null);
  const activeMeta = useMemo(() => TABS.find(tab => tab.key === activeTab) || TABS[0], [activeTab]);
  const dirty = JSON.stringify(appearance) !== JSON.stringify(savedAppearance);
  const ActiveIcon = activeMeta.icon;

  useEffect(() => { applyAppAppearance(appearance); }, [appearance]);
  useEffect(() => {
    const onSaved = event => {
      savedRef.current = event.detail;
      setSavedAppearance(event.detail);
      setAppearance(event.detail);
    };
    window.addEventListener(APPEARANCE_EVENT, onSaved);
    return () => {
      window.removeEventListener(APPEARANCE_EVENT, onSaved);
      window.clearTimeout(timerRef.current);
      // Restore the LATEST saved value only on unmount, never on a save render.
      applyAppAppearance(savedRef.current);
    };
  }, []);
  useEffect(() => {
    try {
      if (savedAppearance.rememberSettingsTab) localStorage.setItem(TAB_KEY, activeTab);
      else localStorage.removeItem(TAB_KEY);
    } catch { /* Section history is optional; appearance saving reports its own error. */ }
  }, [activeTab, savedAppearance.rememberSettingsTab]);
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function update(patch) { setNotice(null); setAppearance(previous => ({ ...previous, ...patch })); }
  function save() {
    window.clearTimeout(timerRef.current);
    try {
      const next = saveAppAppearance(appearance);
      savedRef.current = next;
      setSavedAppearance(next);
      setAppearance(next);
      setNotice({ type: "success", text: "تم حفظ الإعدادات على هذا المتصفح." });
      timerRef.current = window.setTimeout(() => setNotice(null), 4000);
    } catch {
      setNotice({ type: "error", text: "تعذر حفظ الإعدادات. تحقق من السماح بتخزين بيانات الموقع ثم حاول مجددًا." });
    }
  }
  function reset(keys) { update(Object.fromEntries(keys.map(key => [key, DEFAULT_APPEARANCE[key]]))); }
  const common = { value: appearance, update };

  return <div className="settings-page-pro" dir="rtl">
    <IslamicBackdrop />
    <header className="settings-hero-pro">
      <div>
        <span className="settings-eyebrow"><Settings size={15} /> الصِّديق · مركز الإعدادات</span>
        <div className="settings-hero-title">
          <span className="settings-hero-icon"><MonitorCog size={25} /></span>
          <div><h1>الإعدادات</h1><p>اضبط تجربة الاستخدام بما يناسبك.</p></div>
        </div>
      </div>
      <div className="settings-hero-seal" aria-hidden="true"><IslamicSeal /></div>
    </header>
    <div className="settings-layout-pro">
      <aside className="settings-nav-pro">
        <div className="settings-nav-head"><span>أقسام الإعدادات</span><small>{TABS.length} أقسام</small></div>
        <nav aria-label="أقسام الإعدادات">
          {TABS.map(tab => { const Icon = tab.icon; return <button key={tab.key} type="button"
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={`settings-nav-item ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}>
            <span className="settings-nav-icon"><Icon size={19} /></span>
            <span className="settings-nav-text"><strong>{tab.label}</strong><small>{tab.desc}</small></span>
            <ChevronLeft size={16} className="settings-nav-arrow" />
          </button>; })}
        </nav>
        <div className="settings-nav-foot"><Info size={18} /><p>الإعدادات العامة والمظهر مخصّصان لهذا المتصفح.</p></div>
      </aside>
      <main className="settings-workspace" aria-label={activeMeta.label}>
        <div className="settings-workspace-head"><span className="settings-workspace-icon"><ActiveIcon size={22} /></span>
          <div><h2>{activeMeta.label}</h2><p>{activeMeta.desc}</p></div>
        </div>
        <div className="settings-component-surface">
          {activeTab === "general" && <><CalendarSettings /><GeneralPreferences {...common} /></>}
          {activeTab === "appearance" && <AppearancePreferences {...common} />}
          {activeTab === "tv" && <TVSettings />}
          {activeTab === "quotes" && <QuoteManager />}
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "about" && <AboutSystem />}
          {["general", "appearance"].includes(activeTab) && <>
            {notice && <div className={`settings-notice ${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
              {notice.type === "error" ? <AlertCircle size={18} /> : <Check size={18} />}{notice.text}
            </div>}
            <div className="settings-actions-pro">
              <span className={`settings-save-state ${dirty ? "dirty" : ""}`}>{dirty ? "معاينة · لديك تغييرات غير محفوظة" : "الإعدادات محفوظة"}</span>
              <div className="settings-action-buttons">
                <button type="button" className="btn-secondary" onClick={() => reset(activeTab === "general" ? GENERAL_KEYS : APPEARANCE_KEYS)}><RotateCcw size={16} /> الافتراضي</button>
                {dirty && <button type="button" className="btn-secondary" onClick={() => { setAppearance(savedRef.current); setNotice(null); }}>تراجع</button>}
                <button type="button" className="btn-primary" disabled={!dirty} onClick={save}><Save size={17} /> حفظ الإعدادات</button>
              </div>
            </div>
          </>}
        </div>
      </main>
    </div>
  </div>;
}

function GeneralPreferences({ value, update }) {
  return <section className="setting-pro-section">
    <div className="setting-pro-heading"><SlidersHorizontal size={20} /><div><h3>تفضيلات الاستخدام</h3><p>اختر ما يجعل التنقل والقراءة أكثر راحة لك.</p></div></div>
    <Toggle label="تقليل الحركة" description="تخفيف الحركات والانتقالات في واجهة البرنامج." icon={Accessibility} checked={value.reducedMotion} onChange={checked => update({ reducedMotion: checked })} />
    <Toggle label="التمرير السلس" description="انتقال سلس عند استخدام روابط وأزرار الانتقال داخل الصفحة." icon={MousePointer2} checked={value.smoothScroll} onChange={checked => update({ smoothScroll: checked })} />
    <Toggle label="تذكّر آخر قسم في الإعدادات" description="عند العودة إلى الإعدادات، افتح القسم الذي استخدمته آخر مرة." icon={History} checked={value.rememberSettingsTab} onChange={checked => update({ rememberSettingsTab: checked })} />
  </section>;
}

function AppearancePreferences({ value, update }) {
  return <div className="appearance-settings">
    <section className="setting-pro-section">
      <div className="setting-pro-heading"><Palette size={20} /><div><h3>لون الواجهة</h3><p>تُعرض التغييرات مباشرة؛ احفظها للاحتفاظ بها.</p></div></div>
      <div className="theme-swatches">
        {Object.entries(THEMES).map(([id, color]) => <button key={id} type="button" aria-pressed={value.theme === id}
          className={`theme-swatch ${value.theme === id ? "selected" : ""}`} onClick={() => update({ theme: id })}>
          <i style={{ background: color }} aria-hidden="true" /><strong>{THEME_LABELS[id]}</strong>{value.theme === id && <Check size={17} />}
        </button>)}
        <label className={`theme-swatch ${value.theme === "custom" ? "selected" : ""}`}>
          <input type="color" aria-label="لون مخصص" value={value.customColor} onChange={event => update({ theme: "custom", customColor: event.target.value })} />
          <strong>لون مخصص</strong>{value.theme === "custom" && <Check size={17} />}
        </label>
      </div>
    </section>
    <div className="appearance-two-col">
      <section className="setting-pro-section"><div className="setting-pro-heading"><Type size={20} /><h3>حجم النص</h3></div><Segments label="حجم النص" options={FONTS} value={value.fontSize} onChange={fontSize => update({ fontSize })} /></section>
      <section className="setting-pro-section"><div className="setting-pro-heading"><LayoutGrid size={20} /><h3>كثافة الواجهة</h3></div><Segments label="كثافة الواجهة" options={DENSITIES} value={value.density} onChange={density => update({ density })} /></section>
    </div>
    <section className="setting-pro-section"><Toggle label="حواف مستديرة" description="استخدم حواف مستديرة للبطاقات والأزرار، أو خفّف استدارتها." icon={LayoutGrid} checked={value.rounded} onChange={rounded => update({ rounded })} /></section>
    <div className="settings-appearance-preview"><span>معاينة المظهر</span><strong>مع كل طالب، خطوة بخطوة</strong><p>واجهة واضحة تساند المتابعة والعناية بالطالب.</p><span className="settings-preview-pill">الصِّديق</span></div>
  </div>;
}

function Segments({ label, options, value, onChange }) {
  return <div className="segmented-setting" role="group" aria-label={label}>{options.map(option => <button type="button" key={option.id} className={value === option.id ? "active" : ""} aria-pressed={value === option.id} onClick={() => onChange(option.id)}><span>{option.label}</span><small>{option.text}</small></button>)}</div>;
}
function Toggle({ label, description, checked, onChange, icon: Icon }) {
  return <div className="settings-switch-row"><span className="settings-toggle-icon"><Icon size={20} /></span><div><strong>{label}</strong><small>{description}</small></div><button type="button" role="switch" aria-label={label} aria-checked={checked} className={`settings-switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}><i /></button></div>;
}
function IslamicBackdrop() {
  return <Ornament name="03-falak" palette="emerald" className="settings-islamic-bg" />;
}
function IslamicSeal() {
  return <Ornament name="01-noor" />;
}
