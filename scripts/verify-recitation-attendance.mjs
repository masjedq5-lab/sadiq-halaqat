import assert from "node:assert/strict";
import fs from "node:fs/promises";
import React from "react";
import Renderer, {act} from "react-test-renderer";
import {checkRecitationAttendance,assertRecitationAttendance} from "../src/lib/recitationAttendance.js";
import * as side from "../src/lib/sideLesson.js";

let count=0;
async function test(name,run){await run();count++;console.log(`PASS: ${name}`);}
const scope={student_id:101,halaqa_id:202,recitation_date:"2026-10-04"};
function fixture(status=null,session=false,error=false){
  const calls=[];
  const client={from(table){const filters=[];const q={
    select(...args){calls.push([table,"select",...args]);return q;},
    eq(...args){filters.push(args);calls.push([table,"eq",...args]);return q;},
    order(...args){calls.push([table,"order",...args]);return q;},
    limit(...args){calls.push([table,"limit",...args]);return q;},
    then(resolve){return Promise.resolve({data:table==="attendance"?(status?[{status}]:[]):(session?[{id:1}]:[]),error:error?new Error("offline"):null}).then(resolve);},
  };return q;}};
  return {client,calls};
}
for(const status of ["absent","excused"]){await test(`${status} blocks all recitation recording`,async()=>{
  const f=fixture(status);assert.equal((await checkRecitationAttendance(f.client,scope)).blocked,true);
  await assert.rejects(assertRecitationAttendance(f.client,scope),/غائب/);
});}
for(const status of ["present","late",null]) await test(`${status??"unmarked attendance"} remains allowed`,async()=>{
  assert.equal((await checkRecitationAttendance(fixture(status).client,scope)).blocked,false);
});
await test("Session absence blocks when attendance is unmarked",async()=>{assert.equal((await checkRecitationAttendance(fixture(null,true).client,scope)).blocked,true);});
await test("Correcting attendance to present allows a returning student",async()=>{assert.equal((await checkRecitationAttendance(fixture("present",true).client,scope)).blocked,false);});
await test("Both absence sources are scoped to student, halaqa and date",async()=>{
  const f=fixture();await checkRecitationAttendance(f.client,scope);
  for(const table of ["attendance","recitation_session_students"])assert(f.calls.some(c=>c[0]===table&&c[1]==="eq"&&c[2]==="student_id"&&c[3]===101));
  for(const [table,column,value] of [["attendance","halaqa_id",202],["attendance","attendance_date",scope.recitation_date],["recitation_session_students","recitation_sessions.halaqa_id",202],["recitation_session_students","recitation_sessions.session_date",scope.recitation_date]])assert(f.calls.some(c=>c[0]===table&&c[2]===column&&c[3]===value));
  assert(f.calls.some(c=>c[0]==="attendance"&&c[1]==="order"&&c[2]==="id"&&c[3].ascending===false));
});
await test("A failed lookup prevents recording instead of assuming present",async()=>{await assert.rejects(assertRecitationAttendance(fixture(null,false,true).client,scope),/تعذر التحقق/);});
function installed(source,name,context){const match=source.match(new RegExp(`^([ ]*)(?:async )?function ${name}\\([^]*?\\n\\1\\}$`,"m"));assert(match);return Function(...Object.keys(context),`return (${match[0]});`)(...Object.values(context));}
const teacher=await fs.readFile("src/pages/teacher/Recitations.jsx","utf8");
const admin=await fs.readFile("src/pages/Recitations.jsx","utf8");
for(const program of ["quran","noorania"]) await test(`${program} fresh save guard rejects before persistence, segments or points`,async()=>{
  const f=fixture("absent");const save=installed(teacher,"saveToTable",{supabase:f.client,assertRecitationAttendance});
  await assert.rejects(save({payload:scope,type:program,table:program==="quran"?"recitations":"noorania_recitations"}),/غائب/);
  assert(f.calls.every(c=>["attendance","recitation_session_students"].includes(c[0])));
});
await test("Administrator save also checks absence before recitations or points",async()=>{
  const f=fixture("absent"),errors=[];
  const save=installed(admin,"saveRecitation",{...side,studentId:"101",halaqaId:"202",selectedDate:scope.recitation_date,editingId:null,
    sideFaces:"1",sideLines:"0",nextEvaluation:"جيد",fromSurah:"",toSurah:"",reviewSurah:"",setLoading:()=>{},
    supabase:f.client,assertRecitationAttendance,showToast:(msg,tone)=>{if(tone==="error")errors.push(msg);}});
  await save();assert(errors.some(msg=>msg.includes("غائب")));assert(f.calls.every(c=>["attendance","recitation_session_students"].includes(c[0])));
});
await test("Both save buttons are disabled by the scoped attendance guard",async()=>{
  assert.match(teacher,/saving \|\| attendanceGuard.disabled/);assert.match(admin,/loading \|\| attendanceGuard.disabled/);
  for(const src of [teacher,admin]){assert.match(src,/role="status" className="attendance-recitation-notice"/);assert.match(src,/fieldset className="attendance-recitation-fields" disabled=\{attendanceGuard.disabled\}/);}
});
// Exercise the installed hook: delayed old responses must not unlock the newly selected absent student.
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const pending=[],listeners=new Map();globalThis.window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)};
const hookSource=(await fs.readFile("src/lib/useRecitationAttendance.js","utf8")).replace(/^import[^]*?;\n/gm,"");
const useGuard=Function("useEffect","useState","checkRecitationAttendance",hookSource.replace("export default function","return function"))(React.useEffect,React.useState,(_client,s)=>new Promise(resolve=>pending.push({scope:s,resolve})));
const observed={};
// A stable client is required just as in the application.
const stableClient={};function StableProbe({student}){const state=useGuard(stableClient,{...scope,student_id:student});React.useEffect(()=>{observed.current=state;});return null;}
await test("Selection changes stay disabled until that student's attendance resolves",async()=>{
  let mounted;await act(async()=>{mounted=Renderer.create(React.createElement(StableProbe,{student:101}));});assert.equal(observed.current.disabled,true);
  await act(async()=>{mounted.update(React.createElement(StableProbe,{student:102}));});assert.equal(observed.current.disabled,true);
  await act(async()=>{pending[0].resolve({blocked:false,message:""});});assert.equal(observed.current.disabled,true);
  await act(async()=>{pending[1].resolve({blocked:true,message:"غائب"});});assert.equal(observed.current.message,"غائب");assert.equal(observed.current.disabled,true);
  await act(async()=>{listeners.get("focus")();});assert.equal(observed.current.disabled,true);
  await act(async()=>{pending[2].resolve({blocked:false,message:""});});assert.equal(observed.current.disabled,false);
  await act(async()=>{mounted.unmount();});assert.equal(listeners.size,0);
});
console.log(`PASS: ${count} attendance application checks; no live writes.`);
