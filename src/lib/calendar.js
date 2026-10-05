// Presentation uses Umm al-Qura; database values always remain Gregorian ISO dates.
export const CALENDAR_KEY = 'sadiq.calendar.v1';
export const CALENDAR_EVENT = 'sadiq:calendar-changed';
export const HIJRI_MONTHS = ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
export const GREGORIAN_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
export function getCalendar() {
  try { return localStorage.getItem(CALENDAR_KEY) === 'gregorian' ? 'gregorian' : 'hijri'; }
  catch { return 'hijri'; }
}
export function saveCalendar(value) {
  if (!['hijri','gregorian'].includes(value)) throw new Error('تقويم غير صالح');
  localStorage.setItem(CALENDAR_KEY, value);
  window.dispatchEvent(new Event(CALENDAR_EVENT));
}
export function calendarLocale(calendar = getCalendar()) {
  return calendar === 'gregorian' ? 'ar-SA-u-ca-gregory' : 'ar-SA-u-ca-islamic-umalqura';
}
const displayFormatters = new Map();
export function displayDateFormatter(options = {}, calendar = getCalendar()) {
  const locale = calendarLocale(calendar);
  const resolved = { timeZone: 'Asia/Riyadh', ...options };
  const key = JSON.stringify([locale, resolved]);
  if (!displayFormatters.has(key)) {
    const formatter = new Intl.DateTimeFormat(locale, resolved);
    if (displayFormatters.size >= 64) displayFormatters.delete(displayFormatters.keys().next().value);
    displayFormatters.set(key, formatter);
  }
  return displayFormatters.get(key);
}
export function dateKey(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    timeZone: 'Asia/Riyadh', year:'numeric', month:'2-digit', day:'2-digit',
  }).formatToParts(new Date(value));
  const p = Object.fromEntries(parts.map(x => [x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function dateObject(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T12:00:00Z`) : new Date(value);
}
export function formatDate(value, options = {}, calendar = getCalendar()) {
  if (!value) return '—';
  const date = dateObject(value);
  return Number.isNaN(date.getTime()) ? '—' : displayDateFormatter({year:'numeric',month:'short',day:'numeric',...options},calendar).format(date);
}
const hijriFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura-nu-latn', {
  timeZone:'Asia/Riyadh',year:'numeric',month:'numeric',day:'numeric',
});
export function calendarParts(value = dateKey(), calendar = getCalendar()) {
  if (calendar === 'gregorian') {
    const [year,month,day] = dateKey(value).split('-').map(Number);
    return {year,month,day};
  }
  return Object.fromEntries(hijriFormatter.formatToParts(dateObject(value))
    .filter(x => ['year','month','day'].includes(x.type)).map(x => [x.type,Number(x.value)]));
}
const conversionCache = new Map();
export function fromCalendar({year,month,day}, calendar = getCalendar()) {
  year=Number(year); month=Number(month); day=Number(day);
  if (![year,month,day].every(Number.isInteger) || month<1 || month>12 || day<1 || day>31) return '';
  if (calendar === 'gregorian') {
    const d = new Date(Date.UTC(year,month-1,day,12));
    return d.getUTCFullYear()===year && d.getUTCMonth()===month-1 && d.getUTCDate()===day ? d.toISOString().slice(0,10) : '';
  }
  const cacheKey=`${year}-${month}-${day}`;
  if (conversionCache.has(cacheKey)) return conversionCache.get(cacheKey);
  const target=year*10000+month*100+day;
  let low=Math.floor(Date.UTC(622,0,1)/86400000), high=Math.floor(Date.UTC(2500,0,1)/86400000);
  while(low<=high) {
    const mid=Math.floor((low+high)/2), d=new Date(mid*86400000+43200000);
    const p=calendarParts(d,'hijri'), key=p.year*10000+p.month*100+p.day;
    if(key===target) {const iso=d.toISOString().slice(0,10); conversionCache.set(cacheKey,iso); return iso;}
    if(key<target) low=mid+1; else high=mid-1;
  }
  return '';
}
export function shiftDays(iso, days) {
  const date=dateObject(iso); date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
export function monthRange(value = dateKey(), calendar = getCalendar()) {
  const {year,month}=calendarParts(value,calendar);
  const start=fromCalendar({year,month,day:1},calendar);
  const nextStart=fromCalendar({year:month===12?year+1:year,month:month===12?1:month+1,day:1},calendar);
  return {start,end:shiftDays(nextStart,-1),nextStart};
}
export function daysInMonth(year,month,calendar = getCalendar()) {
  const start=fromCalendar({year,month,day:1},calendar);
  if (!start) return 30;
  const range=monthRange(start,calendar);
  return Math.round((dateObject(range.nextStart)-dateObject(start))/86400000);
}
// Saudi teaching week starts on Sunday. A calendar change does not shift weekdays.
export function weekRange(value = dateKey()) {
  const today=dateKey(value), weekday=dateObject(today).getUTCDay();
  const start=shiftDays(today,-weekday);
  return {start,end:shiftDays(start,6),nextStart:shiftDays(start,7)};
}
export function inMonth(value, reference = dateKey(), calendar = getCalendar()) {
  const range=monthRange(reference,calendar), key=String(value||'').slice(0,10);
  return Boolean(key && key>=range.start && key<range.nextStart);
}
