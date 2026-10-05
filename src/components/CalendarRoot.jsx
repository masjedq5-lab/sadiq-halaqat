import {Fragment,useSyncExternalStore} from 'react';
import {CALENDAR_EVENT,CALENDAR_KEY,getCalendar} from '../lib/calendar';
function subscribe(callback){
 const onStorage=e=>{if(e.key===CALENDAR_KEY||e.key===null)callback();};
 window.addEventListener(CALENDAR_EVENT,callback);window.addEventListener('storage',onStorage);
 return ()=>{window.removeEventListener(CALENDAR_EVENT,callback);window.removeEventListener('storage',onStorage);};
}
export default function CalendarRoot({children}){
 const calendar=useSyncExternalStore(subscribe,getCalendar,()=> 'hijri');
 return <Fragment key={calendar}>{children}</Fragment>;
}
