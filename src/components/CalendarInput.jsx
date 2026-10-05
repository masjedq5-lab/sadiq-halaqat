import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { calendarParts, dateKey, dateObject, formatDate, fromCalendar, getCalendar, GREGORIAN_MONTHS, HIJRI_MONTHS, monthRange, shiftDays } from '../lib/calendar';
import { boundedDate, calendarMonthGrid, dateAllowed, moveCalendarMonth } from '../lib/calendarPicker';
import './CalendarInput.css';

const numbers = new Intl.NumberFormat('ar-SA', { useGrouping: false });
const weekdays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const focusLater = callback => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : callback();

// The input contract stays Gregorian ISO; only the presentation uses the chosen calendar.
export default function CalendarInput({ value = '', onChange, min, max, disabled, readOnly, required, id, name, style, className = '', calendar = getCalendar(), inline = false, ...props }) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const dialogId = `${controlId}-calendar`;
  const titleId = `${controlId}-calendar-title`;
  const today = dateKey();
  const seed = boundedDate(value || today, min, max);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => dateAllowed(value, min, max) ? value : '');
  const [visible, setVisible] = useState(seed);
  const [focusDate, setFocusDate] = useState(seed);
  const [view, setView] = useState('days');
  const [yearPage, setYearPage] = useState(() => Math.floor(calendarParts(seed, calendar).year / 12) * 12);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const isOpen = (inline || open) && !disabled && !readOnly;
  const label = props['aria-label'] || props.title || (calendar === 'hijri' ? 'التاريخ الهجري' : 'التاريخ');
  const months = calendar === 'hijri' ? HIJRI_MONTHS : GREGORIAN_MONTHS;
  const current = calendarParts(visible, calendar);
  const present = calendarParts(today, calendar);
  const lowYear = min ? calendarParts(min, calendar).year : Math.min(present.year - 120, current.year);
  const highYear = max ? calendarParts(max, calendar).year : Math.max(present.year + 10, current.year);
  const grid = useMemo(() => isOpen && view === 'days' ? calendarMonthGrid(visible, calendar) : [], [isOpen, view, visible, calendar]);
  const preview = draft ? formatDate(draft, { weekday: 'long', month: 'long' }, calendar) : 'اختر يومًا من التقويم';

  function resetPicker() {
    const initial = boundedDate(value || dateKey(), min, max);
    setDraft(dateAllowed(value, min, max) ? value : '');
    setVisible(initial); setFocusDate(initial); setView('days');
    setYearPage(Math.floor(calendarParts(initial, calendar).year / 12) * 12);
    setOpen(true);
  }
  function emit(iso) {
    if (iso && !dateAllowed(iso, min, max)) return;
    const target = { value: iso, name };
    onChange?.({ target, currentTarget: target });
    setOpen(false);
  }
  function focusDay(iso) {
    const next = boundedDate(iso, min, max);
    setFocusDate(next); setVisible(next);
    focusLater(() => panelRef.current?.querySelector(`[data-date="${next}"]`)?.focus());
  }
  function dayKeys(event, iso) {
    let next;
    if (event.key === 'ArrowRight') next = shiftDays(iso, -1);
    if (event.key === 'ArrowLeft') next = shiftDays(iso, 1);
    if (event.key === 'ArrowUp') next = shiftDays(iso, -7);
    if (event.key === 'ArrowDown') next = shiftDays(iso, 7);
    if (event.key === 'Home') next = shiftDays(iso, -dateObject(iso).getUTCDay());
    if (event.key === 'End') next = shiftDays(iso, 6 - dateObject(iso).getUTCDay());
    if (event.key === 'PageUp') next = moveCalendarMonth(iso, event.shiftKey ? -12 : -1, calendar);
    if (event.key === 'PageDown') next = moveCalendarMonth(iso, event.shiftKey ? 12 : 1, calendar);
    if (next) { event.preventDefault(); focusDay(next); }
  }
  function dialogKeys(event) {
    event.stopPropagation();
    if (event.key === 'Escape' && !inline) { event.preventDefault(); setOpen(false); }
    if (event.key !== 'Tab' || inline) return;
    const controls = Array.from(panelRef.current?.querySelectorAll('button:not([disabled]):not([tabindex="-1"])') || []);
    const first = controls[0], last = controls.at(-1);
    if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last) || !controls.includes(document.activeElement)) {
      event.preventDefault(); (event.shiftKey ? last : first)?.focus();
    }
  }

  useEffect(() => {
    if (!isOpen || inline || typeof document === 'undefined') return;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, inline]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = focusLater(() => (panelRef.current?.querySelector('.sadiq-date-choices button.is-chosen:not([disabled]), .sadiq-date-day[tabindex="0"]:not([disabled])') || panelRef.current?.querySelector('.sadiq-date-choices button:not([disabled]), button:not([disabled])'))?.focus());
    return () => { if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame); };
  }, [isOpen, view]);

  useEffect(() => {
    if (!inline) return;
    const initial = boundedDate(value || dateKey(), min, max);
    setDraft(dateAllowed(value, min, max) ? value : '');
    setVisible(initial); setFocusDate(initial); setView('days');
  }, [value, min, max, calendar, inline]);

  function canNavigate(direction) {
    if (view === 'years') return direction < 0 ? yearPage > lowYear : yearPage + 11 < highYear;
    if (view === 'months') return direction < 0 ? current.year > lowYear : current.year < highYear;
    const next = moveCalendarMonth(visible, direction, calendar);
    const range = monthRange(next, calendar);
    return (!min || range.end >= min) && (!max || range.start <= max) && calendarParts(next, calendar).year >= lowYear && calendarParts(next, calendar).year <= highYear;
  }
  function navigate(direction) {
    if (view === 'years') { setYearPage(page => page + direction * 12); return; }
    const next = boundedDate(moveCalendarMonth(visible, direction * (view === 'months' ? 12 : 1), calendar), min, max);
    setVisible(next); setFocusDate(next);
  }
  function chooseMonth(month, year = current.year) {
    const next = boundedDate(fromCalendar({ year, month, day: 1 }, calendar), min, max);
    setVisible(next); setFocusDate(next); setView('days');
  }
  function monthEnabled(month) {
    const range = monthRange(fromCalendar({ year: current.year, month, day: 1 }, calendar), calendar);
    return (!min || range.end >= min) && (!max || range.start <= max);
  }

  const panel = isOpen ? <section ref={panelRef} id={dialogId} className={`sadiq-date-panel${inline ? ' is-inline' : ''}`} role={inline ? 'group' : 'dialog'} aria-modal={inline ? undefined : true} aria-labelledby={titleId} dir="rtl" onKeyDown={dialogKeys}>
    <header className="sadiq-date-header">
      <span className="sadiq-date-header-icon"><CalendarDays size={24} /></span>
      <div><span className="sadiq-date-kicker">{calendar === 'hijri' ? 'التقويم الهجري · أم القرى' : 'التقويم الميلادي'}</span><h2 id={titleId}>اختر التاريخ</h2></div>
      {!inline && <button type="button" className="sadiq-date-close" aria-label="إغلاق التقويم" onClick={() => setOpen(false)}><X size={19} /></button>}
    </header>
    <div className="sadiq-date-body">
      <div className="sadiq-date-navigation">
        <button type="button" className="sadiq-date-arrow" aria-label={view === 'days' ? 'الشهر السابق' : view === 'months' ? 'السنة السابقة' : 'السنوات السابقة'} disabled={!canNavigate(-1)} onClick={() => navigate(-1)}><ChevronRight size={19} /></button>
        <div className="sadiq-date-period">
          {view === 'years' ? <strong>{numbers.format(yearPage)} — {numbers.format(yearPage + 11)}</strong> : <>
            <button type="button" className="sadiq-date-month" aria-label="اختيار الشهر" onClick={() => setView(view === 'months' ? 'days' : 'months')}>{view === 'months' ? 'اختر الشهر' : months[current.month - 1]}<ChevronDown size={14} /></button>
            <button type="button" className="sadiq-date-year" aria-label="اختيار السنة" onClick={() => { setYearPage(Math.floor(current.year / 12) * 12); setView('years'); }}>{numbers.format(current.year)}{calendar === 'hijri' ? ' هـ' : ' م'}<ChevronDown size={13} /></button>
          </>}
        </div>
        <button type="button" className="sadiq-date-arrow" aria-label={view === 'days' ? 'الشهر التالي' : view === 'months' ? 'السنة التالية' : 'السنوات التالية'} disabled={!canNavigate(1)} onClick={() => navigate(1)}><ChevronLeft size={19} /></button>
      </div>
      {view === 'days' && <table className="sadiq-date-grid" role="grid" aria-label={`${months[current.month - 1]} ${numbers.format(current.year)}`}>
        <thead><tr>{weekdays.map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 6 }, (_, row) => <tr key={row}>{grid.slice(row * 7, row * 7 + 7).map(cell => <td key={cell.date} aria-selected={cell.date === draft}>
          <button type="button" data-date={cell.date} tabIndex={cell.date === focusDate ? 0 : -1} disabled={!dateAllowed(cell.date, min, max)} aria-label={formatDate(cell.date, { weekday: 'long', month: 'long' }, calendar)} aria-pressed={cell.date === draft} aria-current={cell.date === today ? 'date' : undefined}
            className={`sadiq-date-day${cell.outside ? ' is-outside' : ''}${cell.date === draft ? ' is-selected' : ''}${cell.date === today ? ' is-today' : ''}`}
            onFocus={() => setFocusDate(cell.date)} onKeyDown={event => dayKeys(event, cell.date)} onClick={() => { setDraft(cell.date); setVisible(cell.date); setFocusDate(cell.date); }}>{numbers.format(cell.day)}</button>
        </td>)}</tr>)}</tbody>
      </table>}
      {view === 'months' && <div className="sadiq-date-choices" aria-label="أشهر السنة">{months.map((month, index) => <button type="button" key={month} disabled={!monthEnabled(index + 1)} aria-pressed={current.month === index + 1} className={current.month === index + 1 ? 'is-chosen' : ''} onClick={() => chooseMonth(index + 1)}>{month}</button>)}</div>}
      {view === 'years' && <div className="sadiq-date-choices" aria-label="اختيار السنة">{Array.from({ length: 12 }, (_, index) => yearPage + index).map(year => <button type="button" key={year} disabled={year < lowYear || year > highYear} aria-pressed={year === current.year} className={year === current.year ? 'is-chosen' : ''} onClick={() => { chooseMonth(current.month, year); setView('months'); }}>{numbers.format(year)}{calendar === 'hijri' ? ' هـ' : ''}</button>)}</div>}
    </div>
    <footer className="sadiq-date-footer">
      <div className="sadiq-date-selection" aria-live="polite"><div><span>التاريخ المختار</span><strong>{preview}</strong></div>
        <button type="button" className="sadiq-date-today" disabled={!dateAllowed(today, min, max)} onClick={() => { setDraft(today); setVisible(today); setFocusDate(today); setView('days'); }}>اليوم</button>
      </div>
      <div className="sadiq-date-actions">
        <button type="button" className="sadiq-date-apply" disabled={!dateAllowed(draft, min, max)} onClick={() => emit(draft)}><Check size={17} />اعتماد التاريخ</button>
        {!inline && <button type="button" className="sadiq-date-cancel" onClick={() => setOpen(false)}>إلغاء</button>}
        {!required && value && <button type="button" className="sadiq-date-clear" onClick={() => emit('')}>مسح التاريخ</button>}
      </div>
    </footer>
  </section> : null;

  if (inline) return <>{isOpen ? panel : null}{name && <input type="hidden" name={name} value={value} disabled={disabled} />}</>;
  return <>
    <span className={`sadiq-calendar-input ${className}`} style={style}>
      <button {...props} ref={triggerRef} id={controlId} type="button" className="sadiq-calendar-trigger" disabled={disabled || readOnly} aria-label={label} aria-required={required || undefined} aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={isOpen ? dialogId : undefined}
        onClick={event => { props.onClick?.(event); if (!event.defaultPrevented) resetPicker(); }}
        onKeyDown={event => { props.onKeyDown?.(event); if (!event.defaultPrevented && event.key === 'ArrowDown') { event.preventDefault(); resetPicker(); } }}>
        <span className="sadiq-calendar-symbol"><CalendarDays size={19} /></span>
        <span className={`sadiq-calendar-value${value ? '' : ' is-placeholder'}`}>{value ? formatDate(value, { month: 'long' }, calendar) : props.placeholder || 'اختر التاريخ'}</span>
        <ChevronDown size={15} className="sadiq-calendar-chevron" />
      </button>
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      {required && <input type="text" className="sadiq-calendar-validation" aria-hidden="true" tabIndex={-1} value={value} required disabled={disabled || readOnly} onChange={() => {}} onInvalid={event => { event.preventDefault(); resetPicker(); }} />}
    </span>
    {isOpen && typeof document !== 'undefined' && createPortal(<div className="sadiq-date-overlay" onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) setOpen(false); }}>{panel}</div>, document.body)}
  </>;
}
