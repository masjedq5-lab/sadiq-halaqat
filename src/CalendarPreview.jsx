import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays } from 'lucide-react';
import CalendarInput from './components/CalendarInput';
import CalendarDatePicker from './components/CalendarDatePicker';
import './index.css';
import './styles/responsive.css';
import './styles/SadiqOrnamentsPro.css';
import './styles/SadiqSurfaces.css';

function Preview() {
  const [date, setDate] = useState('2026-10-05');
  const [birthday, setBirthday] = useState('2014-04-03');
  const [required, setRequired] = useState('');
  const [status, setStatus] = useState('');
  const [inline, setInline] = useState(false);
  const [gregorian, setGregorian] = useState('2024-01-31');
  return <main className="calendar-preview" dir="rtl">
    <header><img src="/icon-192.png" alt="الصديق"/><div><p>الصِّدّيق · معاينة التقويم</p><h1>تاريخ واضح، واختيار أسهل</h1><p>تجربة واجهة مستقلة ببيانات تجريبية</p></div></header>
    <section><h2>تاريخ التسميع</h2><div className="date-input-wrap"><CalendarDays size={15}/><CalendarInput aria-label="تاريخ التسميع" calendar="hijri" value={date} max="2026-10-05" onChange={e => setDate(e.target.value)} /></div><output aria-label="التاريخ المحفوظ">{date}</output><p>التاريخ الهجري ظاهر للمعلم، والقيمة المحفوظة ميلادية.</p></section>
    <section><h2>تاريخ ميلاد الطالب</h2><CalendarInput aria-label="تاريخ الميلاد" calendar="hijri" value={birthday} max="2026-10-05" onChange={e=>setBirthday(e.target.value)} /></section>
    <section><h2>التاريخ المطلوب في النموذج</h2><form onSubmit={e=>{e.preventDefault();setStatus('تم اختيار تاريخ صالح');}}><CalendarInput aria-label="تاريخ مطلوب" calendar="hijri" value={required} required name="exam_date" onChange={e=>setRequired(e.target.value)} /><button className="fixture-button" type="submit">حفظ النموذج</button><p role="status">{status}</p></form></section>
    <section><h2>خيار التقويم الميلادي</h2><CalendarInput aria-label="التاريخ الميلادي" calendar="gregorian" value={gregorian} onChange={e=>setGregorian(e.target.value)}/></section>
    <button type="button" className="fixture-button" onClick={()=>setInline(true)}>التقويم داخل نافذة</button>
    {inline && <div className="fixture-overlay" onClick={()=>setInline(false)}><div className="fixture-inline" onClick={e=>e.stopPropagation()}><button type="button" className="fixture-inline-close" onClick={()=>setInline(false)}>إغلاق النافذة</button><CalendarDatePicker inline selected={new Date(`${date}T12:00:00`)} onChange={next=>{if(next){setDate(`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`);setInline(false);}}}/></div></div>}
    <style>{`.calendar-preview{max-width:800px;margin:50px auto;padding:24px}.calendar-preview>header{display:flex;align-items:center;gap:18px;margin-bottom:35px}.calendar-preview header img{width:64px;height:64px}.calendar-preview h1{font-size:29px;color:#155e46;margin:8px 0}.calendar-preview header p{font-size:14px;color:#6e897a}.calendar-preview>section{max-width:340px;padding:22px;border-radius:18px;margin:18px 0;background:#fff;box-shadow:0 5px 24px #153b2510}.calendar-preview h2{font-size:17px;margin-bottom:15px;color:#2d5742}.calendar-preview section p{font-size:12px;color:#87968e;margin-top:14px;line-height:1.8}.calendar-preview output{display:block;margin-top:14px;font-size:12px;color:#577360;direction:ltr;text-align:right}.date-input-wrap{position:relative}.date-input-wrap>svg{position:absolute;right:10px;top:50%;transform:translateY(-50%)}.fixture-button{margin-top:16px;padding:10px 18px;border:0;border-radius:10px;background:#155e46;color:white;cursor:pointer}.fixture-overlay{position:fixed;inset:0;background:#153b2555;display:grid;place-items:center;padding:12px;z-index:9999;overflow:auto}.fixture-inline{background:white;border-radius:22px;width:min(100%,360px);padding:12px}.fixture-inline-close{padding:4px 10px;border:0;background:transparent;color:#577360;margin-bottom:8px;cursor:pointer}`}</style>
  </main>;
}
createRoot(document.getElementById('root')).render(<Preview />);
