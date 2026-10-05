import {formatDate,getCalendar} from "../lib/calendar";
export function formatGregorian(date) {return formatDate(date,{},'gregorian');}
export function formatHijri(date) {return formatDate(date,{},'hijri');}
export function formatDualDate(date) {return getCalendar()==='hijri'?`${formatHijri(date)} | ${formatGregorian(date)}`:`${formatGregorian(date)} | ${formatHijri(date)}`;}
