import fs from "node:fs/promises";
import assert from "node:assert/strict";
import React from "react";
import Renderer, {act} from "react-test-renderer";
import {transformWithOxc} from "vite";
import {evaluations} from "../src/data/surahList.js";
import * as side from "../src/lib/sideLesson.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.simpleSideTests = {React, evaluations, ...side};
let cases = 0;
async function test(name, run) { await run(); cases++; console.log(`PASS: ${name}`); }
const teacherSource = await fs.readFile("src/pages/teacher/Recitations.jsx", "utf8");
function extract(source, name) {
  const match = source.match(new RegExp(`^([ ]*)(?:async )?function ${name}\\([^]*?\\n\\1\\}`, "m"));
  assert(match, `Installed function ${name} exists`);
  return match[0].trim();
}
function installed(source, name, context = {}) {
  return Function(...Object.keys(context), `return (${extract(source, name)});`)(...Object.values(context));
}
function saveFixture({program="quran", original, form={}, plan=null} = {}) {
  const saved=[], errors=[];
  const context = {
    ...side,
    getLocalDate:()=>"2026-10-01",
    legacyLessonAmount:()=>({amount:"",unit:"faces"}),
    commonForm:{student_id:"101",halaqa_id:"202",recitation_date:"2026-10-01",notes:""},
    teacher:{id:303}, editing:original?{id:original.id,type:program}:null,
    quranRecords:original?[original]:[], nooraniaRecords:original?[original]:[],
    planSuggestion:plan, quranPoints:2,nooraniaPoints:2,
    hasCompleteQuranRange:(...values)=>values.every(Boolean), hasAnyQuranRange:(...values)=>values.some(Boolean),
    textOrNull:value=>String(value??"").trim()||null,
    numberOrNull:value=>value===""||value==null?null:Number(value),
    setSaving:()=>{}, showToast:(message,tone)=>{if(tone==="error")errors.push(message);},
    resolveGeneratedCompletion:async()=>{}, syncQuranEngineAfterSave:async()=>{},
    saveToTable:async request=>saved.push(request),
  };
  context.nooraniaAmountToPages=installed(teacherSource,"nooraniaAmountToPages");
  const initial=installed(teacherSource,program==="quran"?"createQuranForm":"createNooraniaForm",context)();
  context[program==="quran"?"quranForm":"nooraniaForm"]={...initial,...form};
  return {saved,errors,run:installed(teacherSource,program==="quran"?"saveQuran":"saveNoorania",context)};
}

await test("Quran side-only record saves without a monthly plan",async()=>{
  const fixture=saveFixture({form:{side_lesson_faces:"2",side_lesson_lines:"3",next_evaluation:"جيد"}});
  await fixture.run(); assert.deepEqual(fixture.errors,[]); assert.equal(fixture.saved.length,1);
  assert.equal(fixture.saved[0].payload.side_lesson_faces,2); assert.equal(fixture.saved[0].payload.side_lesson_lines,3);
  assert.equal(fixture.saved[0].payload.from_surah,null); assert.equal(fixture.saved[0].payload.next_surah,null);
  assert.equal(fixture.saved[0].payload.next2_evaluation,null);
});
await test("Paused lessons still allow manual side-only recitations",async()=>{
  const fixture=saveFixture({plan:{lessonSuppressed:true},form:{side_lesson_lines:"7",next_evaluation:"ممتاز"}});
  await fixture.run(); assert.equal(fixture.saved.length,1);assert.deepEqual(fixture.errors,[]);
});
await test("Overflowing lines normalize before saving",async()=>{
  const fixture=saveFixture({form:{side_lesson_faces:"1",side_lesson_lines:"32",next_evaluation:"ممتاز"}});
  await fixture.run(); assert.equal(fixture.saved[0].payload.side_lesson_faces,3);assert.equal(fixture.saved[0].payload.side_lesson_lines,2);
});
for (const [name,fields] of [["missing evaluation",{side_lesson_faces:"1"}],["negative amount",{side_lesson_faces:"-1",next_evaluation:"ممتاز"}],["fractional face",{side_lesson_faces:"1.5",next_evaluation:"ممتاز"}],["evaluation without amount",{next_evaluation:"ممتاز"}]]) {
  await test(`Save blocks ${name}`,async()=>{const fixture=saveFixture({form:fields});await fixture.run();assert.equal(fixture.saved.length,0);assert.equal(fixture.errors.length,1);});
}
await test("Legacy side ranges remain untouched when editing another field",async()=>{
  const original={id:9,next_surah:"الملك",next_from_ayah:1,next_to_ayah:10,next_evaluation:"جيد",next2_surah:"القلم",next2_evaluation:"ممتاز",_side_lesson_raw_faces:0.5};
  const fixture=saveFixture({original,form:{next_evaluation:"جيد"}});await fixture.run();
  assert.equal(fixture.saved.length,1);const payload=fixture.saved[0].payload;
  assert(!Object.hasOwn(payload,"side_lesson_faces"));assert(!Object.hasOwn(payload,"next_surah"));assert(!Object.hasOwn(payload,"next2_evaluation"));
});
await test("Explicitly editing an old side amount replaces both ranges",async()=>{
  const fixture=saveFixture({original:{id:9,next_surah:"الملك",next2_surah:"القلم"},form:{side_amount_changed:true,side_lesson_faces:"2",side_lesson_lines:"5",next_evaluation:"جيد"}});
  await fixture.run();assert.equal(fixture.saved[0].payload.next2_surah,null);assert.equal(fixture.saved[0].payload.side_lesson_lines,5);
});
await test("Noorania saves a side-only record with an empty lesson",async()=>{
  const fixture=saveFixture({program:"noorania",form:{side_lesson_faces:"2",side_lesson_lines:"4",side_lesson_evaluation:"ممتاز"}});
  await fixture.run();assert.deepEqual(fixture.errors,[]);assert.equal(fixture.saved.length,1);
  assert.equal(fixture.saved[0].payload.lesson,"");assert.equal(fixture.saved[0].payload.side_lesson_lines,4);
});
await test("Repeat rating is retained in the record",async()=>{
  const fixture=saveFixture({form:{side_lesson_faces:"2",next_evaluation:"إعادة"}});
  await fixture.run();assert.equal(fixture.saved[0].payload.next_evaluation,"إعادة");
});

function database(tables) {
  const queries=[];
  return {queries,from(table){
    const calls=[]; queries.push({table,calls});
    const query={then(resolve,reject){
      const result=tables[table]??{data:[],error:null};
      const range=calls.find(([name])=>name==="range");
      const data=range&&Array.isArray(result.data)?result.data.slice(range[1],range[2]+1):result.data;
      return Promise.resolve({...result,data}).then(resolve,reject);
    }};
    for(const method of ["select","eq","in","gte","lte","order","range","maybeSingle"])query[method]=(...args)=>{calls.push([method,...args]);return query;};
    return query;
  }};
}
await test("Monthly totals include every page and retain the date and halaqa scope",async()=>{
  const db=database({recitation_side_lesson_totals:{data:Array.from({length:1003},()=>({student_id:101,program:"quran",accepted_faces:1})),error:null}});
  const totals=await side.monthlySideLessonTotals(db,202,[101],{start:"2026-10-01",end:"2026-10-31"});
  assert.equal(totals.get(101),1003);assert.equal(db.queries.length,2);
  for(const query of db.queries){assert(query.calls.some(call=>call[0]==="eq"&&call[1]==="halaqa_id"&&call[2]===202));assert(query.calls.some(call=>call[0]==="gte"&&call[2]==="2026-10-01"));assert(query.calls.some(call=>call[0]==="lte"&&call[2]==="2026-10-31"));}
});
await test("The monthly view shows exact faces and lines for each program",async()=>{
  const db=database({recitation_side_lesson_totals:{data:[{student_id:101,program:"quran",accepted_faces:2.2},{student_id:102,program:"noorania",accepted_faces:2.4}],error:null}});
  const totals=await side.monthlySideLessonTotals(db,202,[101,102],{start:"2026-10-01",end:"2026-10-31"});
  assert.equal(side.formatSideLessonTotal(totals.get(101),totals.linesPerFace.get(101)),"2 وجه و 3 سطر");
  assert.equal(side.formatSideLessonTotal(totals.get(102),totals.linesPerFace.get(102)),"2 وجه و 4 سطر");
  assert.equal(side.formatSideLessonTotal(1.5),"1.5 وجه","Historical fractional faces remain exact");
});
await test("A failed monthly read is not displayed as zero achievement",async()=>{
  const db=database({recitation_side_lesson_totals:{data:null,error:new Error("read failed")}});
  await assert.rejects(()=>side.monthlySideLessonTotals(db,202,[101],{start:"2026-10-01",end:"2026-10-31"}),/read failed/);
});
await test("Monthly summary keeps single-line precision",async()=>{
  assert.equal(side.formatMonthlySideLessons([{side_lesson_faces:2.2,side_lesson_lines_per_face:15},{side_lesson_faces:1/15,side_lesson_lines_per_face:15}]),"2 وجه و 4 سطر");
});
await test("Revision scope can still be saved for an approved plan",async()=>{
  const source=await fs.readFile("src/pages/teacher/MonthlyPlan.jsx","utf8");const calls=[];
  const context={rows:[{student_id:101,status:"approved"}],saveQuranStudentPolicy:async row=>calls.push(row.student_id),showToast:()=>{},loadMonthlyPlan:async()=>calls.push("reload")};
  await installed(source,"saveRevisionScopeRow",context)(101);assert.deepEqual(calls,[101,"reload"]);
});

const imports=/^import[\s\S]*?;\n/gm;
async function loadComponent(file,prelude){
  const source=(await fs.readFile(file,"utf8")).replace(imports,"");
  const compiled=await transformWithOxc(prelude+source,file,{jsx:{runtime:"classic"}});
  return (await import("data:text/javascript;base64,"+Buffer.from(compiled.code).toString("base64"))).default;
}
const Fields=await loadComponent("src/components/SideLessonFields.jsx","const {React,evaluations}=globalThis.simpleSideTests;\n");
await test("Side fields offer two numbers and one-click evaluation, without range selectors",async()=>{
  function Harness(){const [value,setValue]=React.useState({faces:"",lines:"",evaluation:""});return React.createElement(Fields,{...value,onFaces:faces=>setValue(v=>({...v,faces})),onLines:lines=>setValue(v=>({...v,lines})),onEvaluation:evaluation=>setValue(v=>({...v,evaluation}))});}
  let tree;await act(async()=>{tree=Renderer.create(React.createElement(Harness));});
  assert.equal(tree.root.findAllByType("input").length,2);assert.equal(tree.root.findAllByType("select").length,0);assert.equal(tree.root.findAllByType("button").length,4);
  await act(async()=>tree.root.findAllByType("input")[0].props.onChange({target:{value:"2"}}));
  await act(async()=>tree.root.findAllByType("input")[1].props.onChange({target:{value:"3"}}));
  await act(async()=>tree.root.findAllByType("button")[0].props.onClick());
  assert.equal(tree.root.findAllByType("button")[0].props["aria-pressed"],true);
  await act(async()=>tree.root.findAllByType("button")[0].props.onClick());assert.equal(tree.root.findAllByType("button")[0].props["aria-pressed"],false);
  await act(async()=>tree.unmount());
});
await test("Student monthly page displays side achievement without a plan",async()=>{
  simpleSideTests.supabase=database({monthly_plans:{data:null},monthly_progress:{data:null},recitations:{data:[{id:1,recitation_date:"2026-10-01"}]},recitation_segments:{data:[]},recitation_side_lesson_totals:{data:[{student_id:101,program:"quran",accepted_faces:2.2}]}});
  const Page=await loadComponent("src/pages/student/MonthlyAchievement.jsx",`const {React,supabase,monthlySideLessonTotals,formatSideLessonTotal}=globalThis.simpleSideTests;
const {useState,useEffect,useMemo}=React;const BookOpen='svg',Flag='svg',Layers3='svg',Route='svg',Sparkles='svg',Target='svg';
const StudentPage=({children})=>React.createElement('main',null,children);const useStudentPortal=()=>({profile:{id:101},halaqa:{id:202}});
const effectiveMonthlyPlans=async rows=>rows;const getHijriParts=()=>({year:1448,month:4});const getHijriMonthRange=()=>({start:'2026-10-01',end:'2026-10-31'});
const facesToPretty=String;const clampPercent=value=>value;const scheduledProgressInfo=()=>({expectedPercent:0});\n`);
  let tree;await act(async()=>{tree=Renderer.create(React.createElement(Page));});
  const rendered=JSON.stringify(tree.toJSON());assert(rendered.includes("2 وجه و 3 سطر"));assert(rendered.includes("إنجازك مسجل تلقائيًا"));
  await act(async()=>tree.unmount());
});
for(const file of ["src/pages/teacher/MonthlyAchievement.jsx","src/pages/MonthlyAchievement.jsx"]){
  await test(`Excel export aligns the side quantity with its column (${file})`,async()=>{
    const source=await fs.readFile(file,"utf8");let sheets=[];
    const context={rows:[{student_name:"Fixture",side_lesson_faces:2.2,side_lesson_lines_per_face:15}],period:{start:"2026-10-01",end:"2026-10-31"},teacher:{},halaqat:[],selectedHalaqa:202,hijriMonth:4,hijriYear:1448,HIJRI_MONTHS:Array(12).fill("Month"),showToast:()=>{},formatGregorianDate:String,pad2:String,getOverallCompletion:()=>null,formatFaces:value=>String(value||0),formatSideLessonTotal:side.formatSideLessonTotal,XLSX:{utils:{aoa_to_sheet:rows=>{sheets.push(rows);return {};},book_new:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}}};
    context.XLSXFixture = context.XLSX;
    const fixtureSource = source.replace('await import("xlsx")', 'await Promise.resolve(XLSXFixture)');
    await installed(fixtureSource,"exportExcel",context)();const header=sheets[0].find(row=>row.includes("هدف الحفظ"));const body=sheets[0].find(row=>row[1]==="Fixture");
    assert.equal(header.length,body.length);assert.equal(body[header.indexOf("جنب الدرس")],"2 وجه و 3 سطر");
  });
}
assert(!teacherSource.includes('rpc("quran_generate_side_lesson'),"Retired generators are not requested by the teacher form");
console.log(`PASS: ${cases} side lesson application checks; no live writes or notifications.`);
