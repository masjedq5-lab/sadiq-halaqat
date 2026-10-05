import CalendarInput from './CalendarInput';
// Compatibility adapter for Date-valued callers; inline avoids nested dialogs.
export default function CalendarDatePicker({ selected, onChange, minDate, maxDate, disabled, required, id, name, inline = false }) {
  const iso = date => date && !Number.isNaN(date.getTime()) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : '';
  return <CalendarInput id={id} name={name} inline={inline} required={required} disabled={disabled} value={iso(selected)} min={iso(minDate) || undefined} max={iso(maxDate) || undefined} onChange={event => onChange(event.target.value ? new Date(`${event.target.value}T12:00:00`) : null)} />;
}
