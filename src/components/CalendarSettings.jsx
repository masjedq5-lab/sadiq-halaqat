import {useState} from 'react';
import {getCalendar,saveCalendar} from '../lib/calendar';
import './CalendarInput.css';
export default function CalendarSettings(){
 const [calendar,setCalendar]=useState(getCalendar),[error,setError]=useState('');
 return <section className="sadiq-calendar-setting" dir="rtl"><label>التقويم الافتراضي
 <select aria-label="التقويم الافتراضي" value={calendar} onChange={e=>setCalendar(e.target.value)}><option value="hijri">هجري — أم القرى (الافتراضي)</option><option value="gregorian">ميلادي</option></select></label>
 <p>يُحفظ اختيارك في هذا المتصفح للعرض واختيار التواريخ والفلاتر العامة. دورات الخطط والإنجاز المعتمدة تبقى شهرية هجرية.</p>
 <button type="button" onClick={()=>{try{saveCalendar(calendar);setError('');}catch{setError('تعذر حفظ التقويم في المتصفح.');}}}>تطبيق التقويم</button>
 {error&&<p role="alert">{error}</p>}</section>;
}
