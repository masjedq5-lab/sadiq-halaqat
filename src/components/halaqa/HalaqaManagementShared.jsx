import {displayDateFormatter} from "../../lib/calendar";
import { OrnamentScene } from '../ornaments/Ornament';
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, GraduationCap, UsersRound, RefreshCw, AlertCircle, Loader2, X, Search, CalendarDays } from "lucide-react";
import { loadHalaqaManagement } from "../../services/halaqaManagementService";
import "../../pages/HalaqaManagement.css";

export const number = (value) => new Intl.NumberFormat("ar-SA").format(Number(value) || 0);
export const isActive = (person) => person?.status === "active" && person?.is_active !== false;
export const roleLabel = (role) => role === "main" ? "معلم رئيسي" : "معلم مساعد";
export const matchSearch = (query, ...values) => values.join(" ").toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar"));
export function displayDate(value) {
  if (!value) return "غير مسجل";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "غير مسجل" : displayDateFormatter( { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function useHalaqaManagement(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  const reload = useCallback(async () => {
    const sequence = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await loadHalaqaManagement(id);
      if (sequence === request.current) setData(result);
      return result;
    } catch (cause) {
      if (sequence === request.current) setError(cause.message);
      return null;
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    setData(null);
    reload();
    return () => { request.current += 1; };
  }, [reload]);
  return { data, loading, error, reload };
}

export function HalaqaFrame({ id, data, tab, loading, reload, children }) {
  const navigate = useNavigate();
  const h = data.halaqa;
  const status = { active: "نشطة", inactive: "غير نشطة", paused: "متوقفة مؤقتًا", closed: "مغلقة", archived: "مؤرشفة" }[h.status] || "حالة غير محددة";
  return (
    <main className="hm-page" dir="rtl">
      <header className="hm-hero">
        <OrnamentScene primary="01-noor" />
        <div className="hm-hero-top">
          <button type="button" className="hm-back" onClick={() => navigate("/admin/halaqat")}><ArrowRight size={16} /> الحلقات</button>
          <span className={`hm-hero-status ${h.status === "active" ? "is-active" : ""}`}><i /> {status}</span>
        </div>
        <div className="hm-hero-content">
          <div>
            <span className="hm-eyebrow"><Building2 size={15} /> {h.mosque_name || "إدارة الحلقة"}</span>
            <h1>{h.name || "الحلقة"}</h1>
            <p>{tab === "teachers" ? "فريق تعليمي متكامل، وأدوار واضحة لكل معلم." : "كل طالب أمامك، ومتابعته تبدأ من ربطه بالمعلم المناسب."}</p>
          </div>
          <div className="hm-hero-count"><span>{tab === "teachers" ? "معلمو الحلقة" : "طلاب الحلقة"}</span><strong>{number(tab === "teachers" ? data.teachers.length : data.students.length)}</strong></div>
        </div>
      </header>
      <div className="hm-nav-row">
        <nav className="hm-tabs" aria-label="إدارة الحلقة">
          <Link to={`/admin/halaqa-teachers/${id}`} className={tab === "teachers" ? "is-active" : ""} aria-current={tab === "teachers" ? "page" : undefined}><GraduationCap size={17} /> المعلمون <span>{number(data.teachers.length)}</span></Link>
          <Link to={`/admin/halaqa-students/${id}`} className={tab === "students" ? "is-active" : ""} aria-current={tab === "students" ? "page" : undefined}><UsersRound size={17} /> الطلاب <span>{number(data.students.length)}</span></Link>
        </nav>
        <button type="button" className="hm-button hm-button-quiet" disabled={loading} onClick={reload}><RefreshCw size={16} className={loading ? "hm-spin" : ""} /> تحديث</button>
      </div>
      {children}
    </main>
  );
}

export function InitialState({ loading, error, reload }) {
  const navigate = useNavigate();
  return <main className="hm-page" dir="rtl"><button type="button" className="hm-button hm-button-quiet" onClick={() => navigate("/admin/halaqat")}><ArrowRight size={16} /> الحلقات</button><div className="hm-empty" role={error ? "alert" : "status"}>{loading ? <Loader2 className="hm-spin" size={30} /> : <AlertCircle size={30} />}<h2>{loading ? "جارٍ تحميل بيانات الحلقة…" : "تعذر فتح الحلقة"}</h2>{error && <><p>{error}</p><button type="button" className="hm-button hm-button-primary" onClick={reload}>إعادة المحاولة</button></>}</div></main>;
}
export function Notice({ children, tone = "warning" }) { return <div className={`hm-notice hm-notice-${tone}`} role={tone === "error" ? "alert" : "status"}><AlertCircle size={18} /><span>{children}</span></div>; }
export function Metric({ label, value, hint, icon: Icon, gold = false }) { return <div className={`hm-metric ${gold ? "is-gold" : ""}`}><div><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div><Icon size={22} /></div>; }
export function SearchField({ value, onChange, placeholder }) { return <label className="hm-search"><Search size={18} /><input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
export function Empty({ title, description, icon: Icon = UsersRound, children }) { return <div className="hm-empty"><Icon size={32} /><h3>{title}</h3><p>{description}</p>{children}</div>; }
export function PersonStatus({ person }) { return <span className={`hm-badge ${isActive(person) ? "hm-badge-green" : "hm-badge-muted"}`}>{isActive(person) ? "حساب نشط" : "حساب غير نشط"}</span>; }
export function JoinedDate({ date }) { return <span className="hm-subline"><CalendarDays size={14} /> انضم في {displayDate(date)}</span>; }

export function HalaqaDialog({ title, description, busy, onClose, children }) {
  const titleId = useId();
  const panel = useRef(null);
  const closeHandler = useRef(onClose);
  const isBusy = useRef(busy);

  useEffect(() => {
    closeHandler.current = onClose;
  }, [onClose]);

  useEffect(() => {
    isBusy.current = busy;
  }, [busy]);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => [...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')];
    (panel.current.querySelector('[data-autofocus]') || focusables()[0] || panel.current).focus();
    function keydown(event) {
      if (event.key === "Escape") { event.preventDefault(); if (!isBusy.current) closeHandler.current(); }
      if (event.key === "Tab") {
        const items = focusables();
        if (!items.length) { event.preventDefault(); panel.current.focus(); return; }
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(<div className="hm-modal-backdrop" dir="rtl" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section ref={panel} className="hm-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy} tabIndex={-1}><header><div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="hm-close" aria-label="إغلاق" onClick={onClose} disabled={busy}><X size={20} /></button></header>{children}</section></div>, document.body);
}
