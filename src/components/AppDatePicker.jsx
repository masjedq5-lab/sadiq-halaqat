import {useId} from 'react';
import CalendarInput from './CalendarInput';
export default function AppDatePicker({label,value,onChange,...props}){
 const id=useId();
 return <div>{label&&<label htmlFor={id} style={{display:'block',marginBottom:8,fontWeight:700}}>{label}</label>}
 <CalendarInput {...props} id={id} aria-label={label||'التاريخ'} value={value||''} onChange={e=>onChange(e.target.value)} style={{width:'100%',minHeight:44,...props.style}}/></div>;
}
