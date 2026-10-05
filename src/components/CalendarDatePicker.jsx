import {useState} from 'react';
import CalendarInput from './CalendarInput';
// Compatibility adapter: callers and database values remain Gregorian.
export default function CalendarDatePicker({selected,onChange,minDate,maxDate,disabled,required,id,name,inline=false}) {
 const iso=d=>d&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';
 const [draft,setDraft]=useState(()=>iso(selected));
 const emit=value=>onChange(value?new Date(`${value}T12:00:00`):null);
 return <><CalendarInput id={id} name={name} required={required} disabled={disabled} value={inline?draft:iso(selected)} min={iso(minDate)||undefined} max={iso(maxDate)||undefined} onChange={e=>inline?setDraft(e.target.value):emit(e.target.value)}/>
 {inline&&<button type="button" disabled={disabled||!draft} onClick={()=>emit(draft)}>اختيار التاريخ</button>}</>;
}
