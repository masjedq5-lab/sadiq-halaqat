import { useId } from 'react';
import { calendarParts, dateKey, daysInMonth, fromCalendar, getCalendar, HIJRI_MONTHS } from '../lib/calendar';
import './CalendarInput.css';

// Drop-in date input: value/min/max and event.target.value are Gregorian YYYY-MM-DD.
export default function CalendarInput({value='',onChange,min,max,disabled,readOnly,required,id,name,style,className='',calendar=getCalendar(),...props}) {
  const generatedId=useId();
  if(calendar==='gregorian') return <input {...props} id={id} name={name} type="date" value={value} onChange={onChange} min={min} max={max} disabled={disabled} readOnly={readOnly} required={required} style={style} className={className}/>;
  const parts=calendarParts(value||dateKey(),'hijri');
  const now=calendarParts(dateKey(),'hijri');
  const low=min?calendarParts(min,'hijri').year:Math.min(now.year-120,parts.year);
  const high=max?calendarParts(max,'hijri').year:Math.max(now.year+10,parts.year);
  const label=props['aria-label']||props.title||'التاريخ الهجري';
  function change(field,next) {
    if (!next) {onChange?.({target:{value:'',name},currentTarget:{value:'',name}});return;}
    const candidate={...parts,[field]:Number(next)};
    candidate.day=Math.min(candidate.day,daysInMonth(candidate.year,candidate.month,'hijri'));
    let iso=fromCalendar(candidate,'hijri');
    if (min && iso<min) iso=min;
    if (max && iso>max) iso=max;
    if(iso) onChange?.({target:{value:iso,name},currentTarget:{value:iso,name}});
  }
  const selectProps={disabled:disabled||readOnly,required,'aria-label':label};
  return <span id={id||generatedId} className={`sadiq-calendar-input ${className}`} style={style} role="group" aria-label={label}>
    <select {...selectProps} aria-label={`${label}: اليوم`} value={value?parts.day:''} onChange={e=>change('day',e.target.value)}>
      <option value="">اليوم</option>{Array.from({length:daysInMonth(parts.year,parts.month,'hijri')},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
    </select>
    <select {...selectProps} aria-label={`${label}: الشهر`} value={value?parts.month:''} onChange={e=>change('month',e.target.value)}>
      <option value="">الشهر</option>{HIJRI_MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
    </select>
    <select {...selectProps} aria-label={`${label}: السنة`} value={value?parts.year:''} onChange={e=>change('year',e.target.value)}>
      <option value="">السنة</option>{Array.from({length:Math.max(0,high-low+1)},(_,i)=>high-i).map(y=><option key={y} value={y}>{y} هـ</option>)}
    </select>
    {!required && value && !disabled && !readOnly && <button type="button" aria-label={`مسح ${label}`} onClick={()=>change('day','')}>×</button>}
    {name&&<input type="hidden" name={name} value={value}/>}
  </span>;
}
